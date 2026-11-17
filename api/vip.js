// ═════════════════════════════════════════════════════════════════
// api/vip.js · Rangos CLIENTE / VIP de CiberStore. TODO se valida en el servidor (funciones SQL de vip.sql).
//
// PÚBLICO / CLIENTE (cada llamada con sesión lleva {username, hash}, igual que api/comprar.js; solo toca SU cuenta):
//   precios                          → precios de los 6 paquetes de diamantes para MI rango (sin sesión: precios Cliente)
//   estado                           → mi rango, fechas, días restantes, compras acumuladas, meta y renovación gratis
//   comprar {idem}                   → paga la suscripción VIP con saldo (atómico, idempotente; no se activa sin saldo)
//   cobrar_diamante {package_id, idem, desc}
//                                    → cobra una recarga de diamantes con el precio de MI rango (el navegador no manda el monto)
// ADMINISTRADOR (llevan {token} de la sesión del panel):
//   admin_resumen · admin_usuarios {q, rango, limit} · admin_detalle {user_id}
//   admin_accion {user_id, accion:'activar'|'extender'|'desactivar', dias}
//   admin_config {clave, valor} · admin_precio {package_id, cliente, vip}
// Variables: SUPABASE_URL · SUPABASE_SERVICE_ROLE_KEY · ADMIN_* (las mismas del resto de la tienda)
// ═════════════════════════════════════════════════════════════════
'use strict';
const crypto = require('crypto');
const S = require('./_sesion.js');

function enviar(res, body, status){ res.statusCode = status || 200; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('Cache-Control', 'no-store'); res.end(JSON.stringify(body)); }
function ipDe(req){ return String((req.headers['x-forwarded-for'] || (req.socket && req.socket.remoteAddress) || 'x')).split(',')[0].trim(); }
const cfg = () => ({ url: String((process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL) || '').replace(/\/+$/, ''), key: (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SECRET_KEY || process.env.SERVICE_ROLE_KEY) });
const sha = s => crypto.createHash('sha256').update(String(s)).digest();
const iguales = (a, b) => crypto.timingSafeEqual(sha(a), sha(b));
const J = o => JSON.stringify(o);
const cubos = new Map();
function limite(clave, max, ms){
  const t = Date.now(), l = (cubos.get(clave) || []).filter(x => t - x < ms);
  if(l.length >= max){ cubos.set(clave, l); return true; }
  l.push(t); cubos.set(clave, l); if(cubos.size > 5000) cubos.clear(); return false;
}
async function db(path, opts){
  const c = cfg(), ctrl = new AbortController(), t = setTimeout(() => ctrl.abort(), 15000);
  try{
    const r = await fetch(c.url + path, Object.assign({ signal: ctrl.signal }, opts, { headers: Object.assign({ apikey: c.key, Authorization: 'Bearer ' + c.key, 'Content-Type': 'application/json' }, (opts && opts.headers) || {}) }));
    let j = null; try{ j = await r.json(); }catch(e){}
    return { status: r.status, json: j };
  } finally { clearTimeout(t); }
}
const rest = (path, opts) => db('/rest/v1/' + path, opts);
const rpc = (fn, args) => db('/rest/v1/rpc/' + fn, { method: 'POST', body: J(args) });
const dinero = n => '$' + Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' MXN';
const msgErr = r => String((r && r.json && (r.json.message || r.json.error || r.json.hint)) || '');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ¿Falta ejecutar vip.sql? (la tienda sigue funcionando con los precios de siempre)
const sinVip = r => r && r.status >= 400 && /vip_|does not exist|relation|schema cache|Could not find the function/i.test(msgErr(r)) && !/saldo_insuficiente|vip_ya_cubierto/.test(msgErr(r));
function errorSql(msg){
  let m;
  if((m = /saldo_insuficiente:([0-9.]+):([0-9.]+)/.exec(msg))) return { code: 'saldo_insuficiente', saldo: Number(m[1]), total: Number(m[2]), message: 'Saldo insuficiente. Necesitas ' + dinero(m[2]) + ' y tienes ' + dinero(m[1]) + '.' };
  if(/vip_ya_cubierto/.test(msg)) return { code: 'vip_cubierto', message: 'Tu VIP sigue vigente. Podrás renovarlo cuando falten 7 días o menos.' };
  if(/cuenta_suspendida/.test(msg)) return { code: 'suspendida', message: 'Tu cuenta está suspendida. Contacta a soporte.' };
  if(/producto_no_disponible|producto_no_existe/.test(msg)) return { code: 'producto', message: 'Ese paquete ya no está disponible.' };
  if(/idem_ajena|idem_invalida/.test(msg)) return { code: 'solicitud', message: 'Solicitud inválida. Recarga la página e inténtalo de nuevo.' };
  if(/dias_invalidos/.test(msg)) return { code: 'valor', message: 'Los días deben ser un número entre 1 y 3650.' };
  if(/valor_invalido/.test(msg)) return { code: 'valor', message: 'Valor inválido (debe ser mayor a 0; los días, un número entero).' };
  if(/usuario_no_existe/.test(msg)) return { code: 'no_existe', message: 'No existe ese usuario.' };
  return null;
}

module.exports = async function handler(req, res){
  try{
    if(req.method !== 'POST') return enviar(res, { ok: false, code: 'metodo' }, 405);
    const b = (req.body && typeof req.body === 'object') ? req.body : {}, ip = ipDe(req), a = String(b.action || '');
    const c = cfg();
    if(!c.url || !c.key) return enviar(res, { ok: false, code: 'sin_configurar', message: 'Faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en Vercel.' });
    if(limite('g|' + ip, 500, 60000)) return enviar(res, { ok: false, code: 'limite', message: 'Demasiadas solicitudes, espera un momento' }, 429);

    // ═════════════ ADMINISTRADOR ═════════════
    if(a.slice(0, 6) === 'admin_'){
      const d = S.verificar(b.token);
      if(!d) return enviar(res, { ok: false, code: 'sesion_invalida', message: 'Tu sesión del panel venció. Entra de nuevo.' }, 401);
      const adm = String(d.u || 'admin').slice(0, 80);
      const falla = r => { const e = errorSql(msgErr(r)); return enviar(res, e ? Object.assign({ ok: false }, e) : (sinVip(r) ? { ok: false, code: 'sin_vip', message: 'Falta ejecutar vip.sql en Supabase.' } : { ok: false, code: 'db', message: 'No se pudo completar: ' + msgErr(r).slice(0, 200) })); };
      if(a === 'admin_resumen'){
        const [st, pr, cf] = await Promise.all([rpc('vip_admin_stats', {}), rest('vip_precios?select=*&order=orden.asc'), rest('vip_config?select=clave,valor,nota&order=clave.asc')]);
        if(st.status >= 400 || !st.json) return falla(st);
        return enviar(res, { ok: true, stats: st.json, precios: Array.isArray(pr.json) ? pr.json : [], config: Array.isArray(cf.json) ? cf.json : [] });
      }
      if(a === 'admin_usuarios'){
        const r = await rpc('vip_admin_usuarios', { p_q: String(b.q || '').slice(0, 80), p_rango: ['VIP', 'CLIENTE'].indexOf(String(b.rango || '').toUpperCase()) >= 0 ? String(b.rango).toUpperCase() : '', p_limit: Math.max(1, Math.min(200, Number(b.limit) || 50)) });
        if(r.status >= 400) return falla(r);
        return enviar(res, { ok: true, usuarios: r.json || [] });
      }
      if(a === 'admin_detalle'){
        if(!UUID.test(String(b.user_id || ''))) return enviar(res, { ok: false, code: 'solicitud', message: 'Usuario inválido' });
        const r = await rpc('vip_admin_detalle', { p_user: String(b.user_id) });
        if(r.status >= 400) return falla(r);
        return enviar(res, r.json);
      }
      if(a === 'admin_accion'){
        if(!UUID.test(String(b.user_id || ''))) return enviar(res, { ok: false, code: 'solicitud', message: 'Usuario inválido' });
        const uid = String(b.user_id), dias = Math.floor(Number(b.dias) || 0);
        let r;
        if(b.accion === 'activar') r = await rpc('vip_admin_activar', { p_user: uid, p_dias: dias, p_actor: adm, p_nota: String(b.nota || '').slice(0, 200) });
        else if(b.accion === 'extender') r = await rpc('vip_admin_extender', { p_user: uid, p_dias: dias, p_actor: adm });
        else if(b.accion === 'desactivar') r = await rpc('vip_admin_desactivar', { p_user: uid, p_actor: adm });
        else return enviar(res, { ok: false, code: 'accion', message: 'Acción desconocida' });
        if(r.status >= 400) return falla(r);
        return enviar(res, { ok: true, estado: r.json });
      }
      if(a === 'admin_config'){
        const r = await rpc('vip_admin_config', { p_clave: String(b.clave || '').slice(0, 40), p_valor: Number(b.valor), p_actor: adm });
        if(r.status >= 400) return falla(r);
        return enviar(res, { ok: true });
      }
      if(a === 'admin_precio'){
        const r = await rpc('vip_admin_precio', { p_package: Math.floor(Number(b.package_id)), p_cliente: Number(b.cliente), p_vip: Number(b.vip), p_actor: adm });
        if(r.status >= 400) return falla(r);
        return enviar(res, { ok: true });
      }
      return enviar(res, { ok: false, code: 'accion', message: 'Acción desconocida' });
    }

    // ═════════════ CLIENTE ═════════════
    const u = String(b.username || '').trim().slice(0, 60), h = String(b.hash || '').slice(0, 200);
    let p = null;
    if(u && h){
      if(limite('a|' + ip, 120, 60000)) return enviar(res, { ok: false, code: 'limite', message: 'Demasiados intentos, espera un momento' }, 429);
      const r0 = await rest('profiles?username=eq.' + encodeURIComponent(u) + '&select=id,username,password_hash,banned,saldo&limit=1');
      p = Array.isArray(r0.json) ? r0.json[0] : null;
      if(!p || !p.password_hash || !iguales(h, p.password_hash)) p = null;
    }
    // Los precios se pueden ver sin sesión (precios Cliente). Con sesión inválida también: nunca se muestra un precio VIP.
    if(a === 'precios'){
      const r = await rpc('vip_precios_para', { p_user: p ? String(p.id) : null });
      if(r.status >= 400) return enviar(res, sinVip(r) ? { ok: false, code: 'sin_vip', message: 'Falta ejecutar vip.sql' } : { ok: false, code: 'db', message: 'No se pudieron leer los precios' });
      return enviar(res, r.json);
    }
    if(!p) return enviar(res, { ok: false, code: 'credenciales', message: 'Vuelve a iniciar sesión' }, 401);
    const uid = String(p.id);

    if(a === 'estado'){
      const r = await rpc('vip_estado', { p_user: uid });
      if(r.status >= 400) return enviar(res, sinVip(r) ? { ok: false, code: 'sin_vip', message: 'Falta ejecutar vip.sql' } : { ok: false, code: 'db', message: 'No se pudo leer tu estado' });
      return enviar(res, Object.assign({}, r.json, { saldo: Number(p.saldo) || 0 }));
    }
    if(a === 'comprar'){
      if(p.banned) return enviar(res, { ok: false, code: 'suspendida', message: 'Tu cuenta está suspendida. Contacta a soporte.' });
      const idem = String(b.idem || '');
      if(!/^[A-Za-z0-9_-]{8,100}$/.test(idem)) return enviar(res, { ok: false, code: 'solicitud', message: 'Solicitud inválida. Recarga la página.' });
      if(limite('v|' + uid, 10, 3600000)) return enviar(res, { ok: false, code: 'limite', message: 'Demasiados intentos. Espera un poco.' }, 429);
      const r = await rpc('vip_comprar', { p_user: uid, p_idem: idem });
      if(r.status >= 400 || !r.json || !r.json.ok){
        const e = errorSql(msgErr(r)); if(e) return enviar(res, Object.assign({ ok: false }, e));
        return enviar(res, sinVip(r) ? { ok: false, code: 'sin_vip', message: 'El VIP aún no está activado en la tienda (falta ejecutar vip.sql).' } : { ok: false, code: 'db', message: 'No se pudo procesar el pago. No se te cobró. Intenta de nuevo.' });
      }
      return enviar(res, r.json);
    }
    if(a === 'cobrar_diamante'){
      if(p.banned) return enviar(res, { ok: false, code: 'suspendida', message: 'Tu cuenta está suspendida. Contacta a soporte.' });
      const idem = String(b.idem || ''), pk = Math.floor(Number(b.package_id));
      if(!/^[A-Za-z0-9_-]{8,100}$/.test(idem) || !(pk > 0)) return enviar(res, { ok: false, code: 'solicitud', message: 'Solicitud inválida. Recarga la página.' });
      if(limite('d|' + uid, 60, 3600000)) return enviar(res, { ok: false, code: 'limite', message: 'Demasiadas recargas seguidas. Espera un poco.' }, 429);
      // El navegador manda el precio que VIO; si ya no coincide (cambió tu rango o el administrador cambió el precio) NO se cobra: se le avisa el precio real.
      if(b.precio_esperado != null){
        const pp = await rpc('vip_precios_para', { p_user: uid }), it = pp.json && Array.isArray(pp.json.precios) ? pp.json.precios.find(x => Number(x.package_id) === pk) : null;
        if(it && Math.abs(Number(it.precio) - Number(b.precio_esperado)) > 0.004) return enviar(res, { ok: false, code: 'precio_cambio', precio: Number(it.precio), rango: pp.json.rango, message: 'El precio cambió a ' + dinero(it.precio) + ' (' + (pp.json.rango === 'VIP' ? 'precio VIP' : 'precio Cliente') + '). Revísalo y vuelve a intentar.' });
      }
      const r = await rpc('vip_cobrar_diamante', { p_user: uid, p_package: pk, p_idem: idem, p_desc: String(b.desc || '').slice(0, 300) });
      if(r.status >= 400 || !r.json || !r.json.ok){
        const e = errorSql(msgErr(r)); if(e) return enviar(res, Object.assign({ ok: false }, e));
        return enviar(res, sinVip(r) ? { ok: false, code: 'sin_vip', message: 'Cobro por rango no disponible (falta vip.sql).' } : { ok: false, code: 'db', message: 'No se pudo cobrar. No se te descontó. Intenta de nuevo.' });
      }
      return enviar(res, r.json);
    }
    return enviar(res, { ok: false, code: 'accion', message: 'Acción desconocida' });
  }catch(e){
    return enviar(res, { ok: false, code: 'error', message: 'Error del servidor. Intenta de nuevo.' }, 500);
  }
};

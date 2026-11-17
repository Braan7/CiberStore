// ═════════════════════════════════════════════════════════════════
// api/prime.js · Niveles PRIME (1–8) estimados por recargas en Ciber Store. Todo se valida en el servidor (prime.sql).
// Es un nivel de la tienda, NO una verificación oficial de Garena.
//   CLIENTE (lleva {username, hash}; solo ve SU progreso):  mi_progreso
//   ADMIN (lleva {token} del panel): admin_resumen · admin_usuarios {q} · admin_detalle {user_id}
//                                    admin_ajustar {user_id, puntos, motivo} · admin_config {clave, valor} · admin_equiv {diamantes, puntos}
// El nivel público de cada usuario (insignia del ranking) se lee con la función prime_de_usuarios (solo devuelve el nivel).
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


const sinPrime = r => r && r.status >= 400 && /prime_|does not exist|relation|schema cache|Could not find the function/i.test(msgErr(r)) && !/usuario_no_existe|motivo_requerido|puntos_invalidos|total_negativo|umbrales_|valor_invalido|clave_invalida/.test(msgErr(r));
function errorSql(msg){
  if(/motivo_requerido/.test(msg)) return { code: 'motivo', message: 'Escribe el motivo del ajuste (mínimo 3 letras).' };
  if(/puntos_invalidos/.test(msg)) return { code: 'valor', message: 'Los puntos deben ser un número entero distinto de 0.' };
  if(/total_negativo/.test(msg)) return { code: 'valor', message: 'El ajuste dejaría al usuario con puntos negativos.' };
  if(/usuario_no_existe/.test(msg)) return { code: 'no_existe', message: 'No existe ese usuario.' };
  if(/umbrales_desordenados/.test(msg)) return { code: 'valor', message: 'Cada nivel debe pedir más puntos que el anterior.' };
  if(/valor_invalido|clave_invalida/.test(msg)) return { code: 'valor', message: 'Valor inválido (debe ser un entero mayor a 0).' };
  return null;
}

module.exports = async function handler(req, res){
  try{
    if(req.method !== 'POST') return enviar(res, { ok: false, code: 'metodo' }, 405);
    const b = (req.body && typeof req.body === 'object') ? req.body : {}, ip = ipDe(req), a = String(b.action || '');
    const c = cfg();
    if(!c.url || !c.key) return enviar(res, { ok: false, code: 'sin_configurar', message: 'Faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en Vercel.' });
    if(limite('g|' + ip, 500, 60000)) return enviar(res, { ok: false, code: 'limite', message: 'Demasiadas solicitudes, espera un momento' }, 429);

    if(a.slice(0, 6) === 'admin_'){
      const d = S.verificar(b.token);
      if(!d) return enviar(res, { ok: false, code: 'sesion_invalida', message: 'Tu sesión del panel venció. Entra de nuevo.' }, 401);
      const adm = String(d.u || 'admin').slice(0, 80);
      const falla = r => { const e = errorSql(msgErr(r)); return enviar(res, e ? Object.assign({ ok: false }, e) : (sinPrime(r) ? { ok: false, code: 'sin_prime', message: 'Falta ejecutar prime.sql en Supabase.' } : { ok: false, code: 'db', message: 'No se pudo completar la operación' })); };
      if(a === 'admin_resumen'){
        const r = await rpc('prime_admin_resumen', {});
        if(r.status >= 400 || !r.json) return falla(r);
        return enviar(res, r.json);
      }
      if(a === 'admin_usuarios'){
        const r = await rpc('prime_admin_usuarios', { p_q: String(b.q || '').replace(/[%,()*]/g, '').slice(0, 60), p_limit: Math.max(1, Math.min(300, Number(b.limit) || 100)) });
        if(r.status >= 400) return falla(r);
        return enviar(res, { ok: true, usuarios: r.json || [] });
      }
      if(a === 'admin_detalle'){
        if(!UUID.test(String(b.user_id || ''))) return enviar(res, { ok: false, code: 'solicitud', message: 'Usuario inválido' });
        const r = await rpc('prime_admin_detalle', { p_user: String(b.user_id) });
        if(r.status >= 400) return falla(r);
        const det = r.json || {}, ids = {};
        // IDs de Free Fire usados por la cuenta (pedidos antiguos y pedidos con saldo); si una tabla no existe se omite
        try{
          const p1 = await rest('pedidos?username=eq.' + encodeURIComponent(det.username || '') + '&select=ff_id&limit=500');
          if(Array.isArray(p1.json)) p1.json.forEach(x => { if(x && x.ff_id) ids[String(x.ff_id)] = 1; });
          const o = await rest('ordenes_saldo?user_id=eq.' + encodeURIComponent(String(b.user_id)) + '&select=id&limit=500');
          if(Array.isArray(o.json) && o.json.length){
            const lista = o.json.map(x => x.id).join(',');
            const p2 = await rest('ordenes_saldo_items?orden_id=in.(' + lista + ')&select=ff_id&limit=1000');
            if(Array.isArray(p2.json)) p2.json.forEach(x => { if(x && x.ff_id) ids[String(x.ff_id)] = 1; });
          }
        }catch(e){}
        det.ff_ids = Object.keys(ids).slice(0, 50);
        return enviar(res, det);
      }
      if(a === 'admin_ajustar'){
        if(!UUID.test(String(b.user_id || ''))) return enviar(res, { ok: false, code: 'solicitud', message: 'Usuario inválido' });
        const r = await rpc('prime_admin_ajustar', { p_user: String(b.user_id), p_puntos: Math.trunc(Number(b.puntos) || 0), p_motivo: String(b.motivo || '').slice(0, 200), p_actor: adm });
        if(r.status >= 400) return falla(r);
        return enviar(res, { ok: true, info: r.json });
      }
      if(a === 'admin_config'){
        const r = await rpc('prime_admin_config', { p_clave: String(b.clave || '').slice(0, 20), p_valor: Number(b.valor), p_actor: adm });
        if(r.status >= 400) return falla(r);
        return enviar(res, Object.assign({ ok: true }, r.json || {}));
      }
      if(a === 'admin_equiv'){
        const r = await rpc('prime_admin_equiv', { p_diamantes: Math.trunc(Number(b.diamantes)), p_puntos: Math.trunc(Number(b.puntos)), p_actor: adm });
        if(r.status >= 400) return falla(r);
        return enviar(res, { ok: true });
      }
      return enviar(res, { ok: false, code: 'accion', message: 'Acción desconocida' });
    }

    // CLIENTE: solo puede leer su propio progreso; nunca escribe puntos
    const u = String(b.username || '').trim().slice(0, 60), h = String(b.hash || '').slice(0, 200);
    let p = null;
    if(u && h){
      if(limite('a|' + ip, 120, 60000)) return enviar(res, { ok: false, code: 'limite', message: 'Demasiados intentos, espera un momento' }, 429);
      const r0 = await rest('profiles?username=eq.' + encodeURIComponent(u) + '&select=id,username,password_hash&limit=1');
      p = Array.isArray(r0.json) ? r0.json[0] : null;
      if(!p || !p.password_hash || !iguales(h, p.password_hash)) p = null;
    }
    if(!p) return enviar(res, { ok: false, code: 'credenciales', message: 'Vuelve a iniciar sesión' }, 401);
    if(a === 'mi_progreso'){
      const r = await rpc('prime_info', { p_user: String(p.id) });
      if(r.status >= 400) return enviar(res, sinPrime(r) ? { ok: false, code: 'sin_prime', message: 'Falta ejecutar prime.sql' } : { ok: false, code: 'db', message: 'No se pudo leer tu progreso' });
      return enviar(res, r.json);
    }
    return enviar(res, { ok: false, code: 'accion', message: 'Acción desconocida' });
  }catch(e){
    return enviar(res, { ok: false, code: 'error', message: 'Error del servidor' }, 500);
  }
};

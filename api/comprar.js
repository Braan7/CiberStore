// ═════════════════════════════════════════════════════════════════
// api/comprar.js · Compras con SALDO de CiberStore (Pase Booyah, Cajas y Fragmentos). TODO se valida en el servidor.
//
// CLIENTE (cada llamada lleva {username, hash}, igual que api/perfil.js y api/recargas.js; solo toca SU cuenta):
//   catalogo                      → productos activos con su precio REAL (de la tabla catalogo_checkout) + mi saldo actual
//   pagar {items:[{clave,ff_id}], idem}
//                                 → cobra el total calculado aquí (nunca el que mande el navegador), en una transacción SQL
//   entregar {orden_id}           → entrega AUTOMÁTICA (Central One) de UNA unidad pendiente; el navegador la repite hasta terminar
//   refrescar {orden_id}          → vuelve a preguntar al proveedor por las unidades "en proceso"
//   mis_ordenes {offset, limit}   → mis compras con el estado real de cada unidad (+ cuáles faltan por entregar)
// ADMINISTRADOR (llevan {token} de la sesión del panel):
//   admin_ordenes {estado, limit} → compras con saldo (usuario, producto, cantidad, IDs, total, método, ID de transacción, estado)
//   admin_item {item_id, accion:'reembolsar'|'entregada'}  → resolver una unidad que quedó "en verificación"
//
// El saldo SOLO lo mueven las funciones SQL de checkout_saldo.sql (bloqueo de fila + idempotencia): no hay doble cobro,
// no hay saldo negativo y un reembolso se hace una sola vez por unidad.
// Variables: SUPABASE_URL · SUPABASE_SERVICE_ROLE_KEY · CO_API_KEY (entrega automática) · ADMIN_* · (opcional) TG_BOT_TOKEN + TG_CHAT_ID
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
const esc = s => String(s == null ? '' : s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const msgErr = r => String((r && r.json && (r.json.message || r.json.error || r.json.hint)) || '');

async function telegram(texto){
  const t = (process.env.TG_BOT_TOKEN || process.env.TG_TOKEN || process.env.BOT_TOKEN), ch = (process.env.TG_CHAT_ID || process.env.TG_CHAT || process.env.TG_ID); if(!t || !ch) return;
  try{ const ctrl = new AbortController(), x = setTimeout(() => ctrl.abort(), 5000);
    await fetch('https://api.telegram.org/bot' + t + '/sendMessage', { method: 'POST', signal: ctrl.signal, headers: { 'Content-Type': 'application/json' }, body: J({ chat_id: ch, text: texto, parse_mode: 'HTML' }) });
    clearTimeout(x); }catch(e){}
}
async function aviso(uid, titulo, cuerpo){ try{ await rest('notificaciones_cuenta', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: J({ user_id: String(uid), tipo: 'compra', titulo, cuerpo }) }); }catch(e){} }

// Errores de la función SQL → mensajes para el cliente
function errorSql(msg){
  let m;
  if((m = /saldo_insuficiente:([0-9.]+):([0-9.]+)/.exec(msg))) return { code: 'saldo_insuficiente', saldo: Number(m[1]), total: Number(m[2]), message: 'Saldo insuficiente. Necesitas ' + dinero(m[2]) + ' y tienes ' + dinero(m[1]) + '.' };
  if(/producto_no_disponible/.test(msg)) return { code: 'producto', message: 'Uno de los productos ya no está disponible.' };
  if(/id_invalido/.test(msg)) return { code: 'id', message: 'Revisa los IDs de Free Fire (solo números, de 5 a 15 dígitos).' };
  if(/maximo_automaticas/.test(msg)) return { code: 'maximo', message: 'Máximo 5 paquetes de entrega automática por pedido. Haz otro pedido para el resto.' };
  if(/cantidad_maxima/.test(msg)) return { code: 'maximo', message: 'Superaste la cantidad máxima por pedido de ese producto.' };
  if(/cuenta_suspendida/.test(msg)) return { code: 'suspendida', message: 'Tu cuenta está suspendida. Contacta a soporte.' };
  if(/idem_ajena|idem_invalida|items_invalidos/.test(msg)) return { code: 'solicitud', message: 'Solicitud inválida. Recarga la página e inténtalo de nuevo.' };
  return null;
}

// Estado que ve el cliente de cada unidad (las manuales dependen del estado del pedido que mueve el administrador)
const PED = { pendiente: 'recibido', procesando: 'preparando', enviado: 'en_proceso', completado: 'entregado', rechazado: 'error' };
function faseItem(i, ped){
  if(i.estado === 'reembolsada') return 'reembolsado';
  if(i.entrega === 'manual') return (ped && PED[ped.estado]) || 'recibido';
  return ({ pendiente: 'recibido', procesando: 'preparando', enviada: 'en_proceso', completada: 'entregado', verificar: 'verificar' })[i.estado] || 'recibido';
}
function armar(o, items, peds){
  const its = items.filter(i => i.orden_id === o.id).map(i => {
    const p = i.pedido_id ? peds[String(i.pedido_id)] : null;
    return { id: i.id, clave: i.clave, nombre: i.nombre, grupo: i.grupo, img: i.img, entrega: i.entrega, precio: Number(i.precio), ff_id: i.ff_id, estado: i.estado, fase: faseItem(i, p), error: i.error || null, actualizada: i.actualizada };
  });
  const act = its.filter(i => i.fase !== 'reembolsado'), ent = act.filter(i => i.fase === 'entregado').length;
  let fase = 'recibido';
  if(!act.length) fase = 'reembolsado';
  else if(act.some(i => i.fase === 'verificar' || i.fase === 'error')) fase = 'error';
  else if(ent === act.length) fase = 'completado';
  else if(ent > 0) fase = 'parcial';
  else if(act.some(i => i.fase === 'en_proceso' || i.fase === 'preparando')) fase = 'en_proceso';
  return { id: o.id, codigo: 'OS' + o.id, total: Number(o.total), metodo: o.metodo, estado: o.estado, fase, creada: o.creada, actualizada: o.actualizada, saldo_despues: o.saldo_despues == null ? null : Number(o.saldo_despues),
    unidades: its.length, entregadas: ent, pendientes: act.length - ent, reembolsadas: its.length - act.length, por_entregar: its.filter(i => i.entrega === 'auto' && (i.estado === 'pendiente' || i.estado === 'procesando')).length, items: its };
}
async function cargarOrdenes(filtro, extra){
  const r = await rest('ordenes_saldo?' + filtro + '&order=id.desc' + (extra || ''));
  if(r.status >= 400) return { error: true, status: r.status };
  const os = Array.isArray(r.json) ? r.json : [];
  if(!os.length) return { os: [], items: [], peds: {} };
  const ids = os.map(o => o.id).join(',');
  const ri = await rest('ordenes_saldo_items?orden_id=in.(' + ids + ')&order=id.asc&limit=2000'); const items = Array.isArray(ri.json) ? ri.json : [];
  const pids = Array.from(new Set(items.filter(i => i.pedido_id).map(i => String(i.pedido_id)))).filter(x => /^[0-9a-zA-Z-]{1,64}$/.test(x)), peds = {};
  if(pids.length){ const rp = await rest('pedidos?id=in.(' + pids.join(',') + ')&select=id,estado&limit=2000'); (Array.isArray(rp.json) ? rp.json : []).forEach(p => { peds[String(p.id)] = p; }); }
  return { os, items, peds };
}
const snapshot = async id => { const x = await cargarOrdenes('id=eq.' + Number(id)); return x.error || !x.os.length ? null : armar(x.os[0], x.items, x.peds); };

// Llama a la entrega automática (api/recarga.js) EN el servidor: la llave de Central One nunca sale de ahí
function llamarProveedor(body, req){
  return new Promise(resolve => {
    let h; try{ h = require('./recarga.js'); }catch(e){ return resolve({ success: false, code: 'ENDPOINT_DISABLED', error: 'Recargas automáticas no disponibles' }); }
    const r2 = { statusCode: 200, setHeader(){}, end(t){ try{ resolve(JSON.parse(t)); }catch(e){ resolve({ success: false, code: 'PROVIDER_ERROR', error: 'Respuesta inválida' }); } } };
    Promise.resolve(h({ method: 'POST', body, headers: { 'x-cs-build': '0000000000', 'x-forwarded-for': ipDe(req) }, socket: req.socket }, r2)).catch(() => resolve({ success: false, code: 'PROVIDER_ERROR', error: 'Error al contactar al proveedor' }));
  });
}
const PEDIDO_EST = { completada: 'completado', enviada: 'procesando', verificar: 'procesando', rechazada: 'rechazado' };
async function pedidoEstado(pedidoId, estado, nota){
  if(!pedidoId) return;
  const cambios = { estado }; if(nota) cambios.nota = nota;
  try{ await rest('pedidos?id=eq.' + encodeURIComponent(pedidoId), { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: J(cambios) }); }catch(e){}
}

// Catálogo integrado (mismos productos y precios que la semilla de checkout_saldo.sql). Se usa SOLO para MOSTRAR los productos
// cuando la tabla catalogo_checkout aún no existe; el cobro siempre exige y usa la tabla real (checkout_pagar).
const CATALOGO_BASE = [
  { clave: 'pase_oferta', nombre: 'Pase Booyah', grupo: 'pase', precio: 22, mayoreo_min: null, mayoreo_precio: null, max_cant: 30, img: 'img/pase-booyah.png', detalle: 'Oferta exclusiva · entrega por regalo (hasta 1 día)', entrega: 'manual', srv: null, orden: 1 },
  { clave: 'pase', nombre: 'Pase Booyah', grupo: 'pase', precio: 23, mayoreo_min: 10, mayoreo_precio: 20, max_cant: 99, img: 'img/pase-booyah.png', detalle: 'Mayoreo: desde 10 pases a $20 c/u · entrega por regalo', entrega: 'manual', srv: null, orden: 2 },
  { clave: 'c1', nombre: 'Caja de Fragmentos Evo', grupo: 'caja', precio: 2.95, mayoreo_min: null, mayoreo_precio: null, max_cant: 5, img: 'img/caja-fragmentos.png', detalle: 'LATAM · entrega automática', entrega: 'auto', srv: 'cj1', orden: 10 },
  { clave: 'c5', nombre: '5 Cajas de Fragmentos Evo', grupo: 'caja', precio: 14.50, mayoreo_min: null, mayoreo_precio: null, max_cant: 5, img: 'img/caja-fragmentos.png', detalle: 'LATAM · entrega automática', entrega: 'auto', srv: 'cj5', orden: 11 },
  { clave: 'c10', nombre: '10 Cajas de Fragmentos Evo', grupo: 'caja', precio: 29.30, mayoreo_min: null, mayoreo_precio: null, max_cant: 5, img: 'img/caja-fragmentos.png', detalle: 'LATAM · entrega automática', entrega: 'auto', srv: 'cj10', orden: 12 },
  { clave: 'c50', nombre: '50 Cajas de Fragmentos Evo', grupo: 'caja', precio: 145.70, mayoreo_min: null, mayoreo_precio: null, max_cant: 5, img: 'img/caja-fragmentos.png', detalle: 'LATAM · entrega automática', entrega: 'auto', srv: 'cj50', orden: 13 },
  { clave: 'f10', nombre: '10 Fragmentos de arma Evo', grupo: 'fragmento', precio: 6.40, mayoreo_min: null, mayoreo_precio: null, max_cant: 5, img: 'img/fragmento-universal.png', detalle: 'LATAM · entrega automática', entrega: 'auto', srv: 'fa10', orden: 20 },
  { clave: 'f50', nombre: '50 Fragmentos de arma Evo', grupo: 'fragmento', precio: 31.70, mayoreo_min: null, mayoreo_precio: null, max_cant: 5, img: 'img/fragmento-universal.png', detalle: 'LATAM · entrega automática', entrega: 'auto', srv: 'fa50', orden: 21 },
  { clave: 'f100', nombre: '100 Fragmentos de arma Evo', grupo: 'fragmento', precio: 62.80, mayoreo_min: null, mayoreo_precio: null, max_cant: 5, img: 'img/fragmento-universal.png', detalle: 'LATAM · entrega automática', entrega: 'auto', srv: 'fa100', orden: 22 },
  { clave: 'f500', nombre: '500 Fragmentos de arma Evo', grupo: 'fragmento', precio: 297.40, mayoreo_min: null, mayoreo_precio: null, max_cant: 5, img: 'img/fragmento-universal.png', detalle: 'LATAM · entrega automática', entrega: 'auto', srv: 'fa500', orden: 23 }
];

function rolLlave(){ const k = String(cfg().key || ''); try{ return JSON.parse(Buffer.from(k.split('.')[1], 'base64').toString()).role || '?'; }catch(e){ return k.indexOf('sb_secret') === 0 ? 'secret' : (k.indexOf('sb_publishable') === 0 ? 'publishable(anon)' : '?'); } }
const hostBd = () => { try{ return new URL(cfg().url).host; }catch(e){ return '?'; } };
const COLS_CAT = 'clave,nombre,grupo,precio,mayoreo_min,mayoreo_precio,max_cant,img,detalle,entrega';
// Lee el catálogo real. Si la tabla existe pero está vacía, la llena con los productos integrados (una sola vez, sin pisar nada).
async function leerCatalogo(){
  let r = await rest('catalogo_checkout?activo=eq.true&order=orden.asc&select=' + COLS_CAT);
  if(r.status < 400 && Array.isArray(r.json) && !r.json.length){
    await rest('catalogo_checkout', { method: 'POST', headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' }, body: J(CATALOGO_BASE) });
    r = await rest('catalogo_checkout?activo=eq.true&order=orden.asc&select=' + COLS_CAT);
  }
  if(r.status >= 400 || !Array.isArray(r.json) || !r.json.length){
    let rol = '?'; try{ rol = JSON.parse(Buffer.from(String(cfg().key).split('.')[1], 'base64').toString()).role || '?'; }catch(e){ rol = String(cfg().key).slice(0, 10).indexOf('sb_secret') === 0 ? 'secret' : (String(cfg().key).slice(0, 15).indexOf('sb_publishable') === 0 ? 'publishable(anon)' : '?'); }
    return { sin_bd: true, diag: 'Supabase respondió ' + r.status + (msgErr(r) ? ': ' + msgErr(r).slice(0, 160) : (Array.isArray(r.json) ? ': la tabla está vacía' : '')) + ' · llave: ' + rol + ' · proyecto: ' + hostBd(), productos: CATALOGO_BASE.map(x => { const y = Object.assign({}, x); delete y.srv; delete y.orden; return y; }) };
  }
  return { sin_bd: false, productos: r.json.map(x => Object.assign({}, x, { precio: Number(x.precio), mayoreo_precio: x.mayoreo_precio == null ? null : Number(x.mayoreo_precio) })) };
}

module.exports = async function handler(req, res){
  try{
    if(req.method !== 'POST') return enviar(res, { ok: false, code: 'metodo' }, 405);
    const b = (req.body && typeof req.body === 'object') ? req.body : {}, ip = ipDe(req), a = String(b.action || '');
    const c = cfg();
    if(!c.url || !c.key){
      const vistas = Object.keys(process.env).filter(k => /SUPABASE|SERVICE_ROLE/i.test(k)).join(', ') || 'ninguna';
      return enviar(res, { ok: false, code: 'sin_configurar', message: 'Este despliegue no ve ' + [!c.url ? 'SUPABASE_URL' : '', !c.key ? 'SUPABASE_SERVICE_ROLE_KEY' : ''].filter(Boolean).join(' ni ') + '. Variables SUPABASE que sí ve: ' + vistas + '. Revisa que estén en Production y haz Redeploy.' });
    }
    if(limite('g|' + ip, 400, 60000)) return enviar(res, { ok: false, code: 'limite', message: 'Demasiadas solicitudes, espera un momento' }, 429);

    // ═════════════ ADMINISTRADOR ═════════════
    if(a.slice(0, 6) === 'admin_'){
      const d = S.verificar(b.token);
      if(!d) return enviar(res, { ok: false, code: 'sesion_invalida', message: 'Tu sesión del panel venció. Entra de nuevo.' }, 401);
      const adm = String(d.u || 'admin').slice(0, 80);
      if(a === 'admin_ordenes'){
        const est = ['pagada', 'entregando', 'verificar', 'parcial', 'reembolsada'].indexOf(b.estado) >= 0 ? '&estado=eq.' + b.estado : '';
        const lim = Math.max(1, Math.min(200, Number(b.limit) || 60));
        const x = await cargarOrdenes('id=gt.0' + est, '&limit=' + lim);
        if(x.error) return enviar(res, { ok: false, code: 'db', message: 'Falta ejecutar checkout_saldo.sql en Supabase' });
        return enviar(res, { ok: true, ordenes: x.os.map(o => Object.assign(armar(o, x.items, x.peds), { usuario: o.username, user_id: o.user_id, idem: o.idem })) });
      }
      if(a === 'admin_item'){
        const id = Number(b.item_id); if(!(id > 0)) return enviar(res, { ok: false, code: 'solicitud', message: 'Unidad inválida' });
        const ri = await rest('ordenes_saldo_items?id=eq.' + id + '&select=id,orden_id,estado,pedido_id,nombre,precio,ff_id'); const it = Array.isArray(ri.json) && ri.json[0];
        if(!it) return enviar(res, { ok: false, code: 'no_existe', message: 'No existe esa unidad' });
        if(b.accion === 'reembolsar'){
          if(it.estado === 'reembolsada') return enviar(res, { ok: false, code: 'ya', message: 'Esa unidad ya fue reembolsada' });
          const r = await rpc('checkout_item_resultado', { p_item: id, p_estado: 'rechazada', p_ref: null, p_error: 'Reembolsada por ' + adm });
          if(r.status >= 400) return enviar(res, { ok: false, code: 'db', message: 'No se pudo reembolsar: ' + msgErr(r) });
          await pedidoEstado(it.pedido_id, 'rechazado', 'Reembolsado a tu saldo');
          return enviar(res, { ok: true });
        }
        if(b.accion === 'entregada'){
          if(it.estado === 'reembolsada') return enviar(res, { ok: false, code: 'ya', message: 'Esa unidad ya fue reembolsada' });
          const r = await rpc('checkout_item_resultado', { p_item: id, p_estado: 'completada', p_ref: null, p_error: 'Confirmada por ' + adm });
          if(r.status >= 400) return enviar(res, { ok: false, code: 'db', message: 'No se pudo actualizar: ' + msgErr(r) });
          await pedidoEstado(it.pedido_id, 'completado');
          return enviar(res, { ok: true });
        }
        return enviar(res, { ok: false, code: 'accion', message: 'Acción desconocida' });
      }
      return enviar(res, { ok: false, code: 'accion', message: 'Acción desconocida' });
    }

    // ═════════════ CLIENTE: identidad ═════════════
    const u = String(b.username || '').trim().slice(0, 60), h = String(b.hash || '').slice(0, 200);
    // El catálogo (precios) es público: se puede ver antes de iniciar sesión. El saldo solo si la sesión es válida.
    if(a === 'catalogo' && (!u || !h)){
      const k = await leerCatalogo();
      return enviar(res, { ok: true, sin_bd: k.sin_bd, diag: k.diag || null, productos: k.productos, saldo: null });
    }
    if(!u || !h) return enviar(res, { ok: false, code: 'credenciales', message: 'Inicia sesión para comprar' }, 401);
    if(limite('a|' + ip, 80, 60000)) return enviar(res, { ok: false, code: 'limite', message: 'Demasiados intentos, espera un momento' }, 429);
    const r0 = await rest('profiles?username=eq.' + encodeURIComponent(u) + '&select=id,username,password_hash,banned,saldo&limit=1');
    const p = Array.isArray(r0.json) ? r0.json[0] : null;
    if(!p || !p.password_hash || !iguales(h, p.password_hash)) return enviar(res, { ok: false, code: 'credenciales', message: 'Vuelve a iniciar sesión' }, 401);
    const uid = String(p.id);

    if(a === 'catalogo'){
      const k = await leerCatalogo();
      return enviar(res, { ok: true, sin_bd: k.sin_bd, diag: k.diag || null, productos: k.productos, saldo: Number(p.saldo) || 0 });
    }

    // ───────── pagar ─────────
    if(a === 'pagar'){
      if(p.banned) return enviar(res, { ok: false, code: 'suspendida', message: 'Tu cuenta está suspendida. Contacta a soporte.' });
      const items = Array.isArray(b.items) ? b.items : [];
      if(!items.length || items.length > 100) return enviar(res, { ok: false, code: 'solicitud', message: 'Tu pedido está vacío.' });
      const lim = items.map(x => ({ clave: String((x && x.clave) || '').slice(0, 40), ff_id: String((x && x.ff_id) || '').replace(/\s+/g, '') }));
      const idem = String(b.idem || '');
      if(!/^[A-Za-z0-9_-]{8,100}$/.test(idem)) return enviar(res, { ok: false, code: 'solicitud', message: 'Solicitud inválida. Recarga la página.' });
      if(limite('p|' + uid, 25, 3600000)) return enviar(res, { ok: false, code: 'limite', message: 'Hiciste muchas compras seguidas. Espera un poco.' }, 429);
      const r = await rpc('checkout_pagar', { p_user: uid, p_idem: idem, p_items: lim });
      if(r.status >= 400 || !r.json || !r.json.ok){
        const e = errorSql(msgErr(r));
        if(e) return enviar(res, Object.assign({ ok: false }, e));
        const det = ' [Supabase ' + r.status + ': ' + msgErr(r).slice(0, 180) + ' · llave: ' + rolLlave() + ' · proyecto: ' + hostBd() + ']';
        if(/checkout_pagar|does not exist|relation|schema cache|permission denied/.test(msgErr(r))) return enviar(res, { ok: false, code: 'db', message: 'No se pudo usar el pago con saldo.' + det });
        return enviar(res, { ok: false, code: 'db', message: 'No se pudo procesar el pago. No se te cobró. Intenta de nuevo.' + det });
      }
      const oid = r.json.orden_id;
      if(!r.json.repetida){
        // Pedidos del panel (uno por producto+ID para lo manual, uno por unidad para lo automático)
        try{
          const ri = await rest('ordenes_saldo_items?orden_id=eq.' + oid + '&order=id.asc'); const its = Array.isArray(ri.json) ? ri.json : [];
          const grupos = new Map();
          its.forEach(i => { const k = i.entrega === 'manual' ? 'm|' + i.clave + '|' + i.ff_id : 'a|' + i.id; if(!grupos.has(k)) grupos.set(k, []); grupos.get(k).push(i); });
          for(const g of grupos.values()){
            const f = g[0], q = g.length, suma = g.reduce((s, x) => s + Number(x.precio), 0);
            const nombre = f.nombre + (q > 1 ? ' x' + q : '') + (f.entrega === 'auto' ? ' (AUTO · SALDO · OS' + oid + ')' : ' (SALDO · OS' + oid + ')');
            const rp = await rest('pedidos', { method: 'POST', headers: { Prefer: 'return=representation' }, body: J({ username: p.username, producto: nombre, cantidad: String(q), tipo: 'otro', ff_id: f.ff_id, precio: Math.round(suma * 100) / 100, progreso_total: 0, estado: 'pendiente' }) });
            const ped = Array.isArray(rp.json) ? rp.json[0] : null;
            if(ped && ped.id != null) await rest('ordenes_saldo_items?id=in.(' + g.map(x => x.id).join(',') + ')', { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: J({ pedido_id: String(ped.id) }) });
          }
        }catch(e){ /* el cobro y la orden ya están guardados; el panel también las muestra en Órdenes con saldo */ }
        const resumen = new Map(); (await (async () => { const ri = await rest('ordenes_saldo_items?orden_id=eq.' + oid); return Array.isArray(ri.json) ? ri.json : []; })()).forEach(i => { const k = i.nombre; const x = resumen.get(k) || { n: 0, ids: new Set(), auto: i.entrega === 'auto' }; x.n++; x.ids.add(i.ff_id); resumen.set(k, x); });
        const lineas = Array.from(resumen.entries()).map(([n, x]) => '🎁 ' + esc(n) + ' x' + x.n + ' → ID ' + esc(Array.from(x.ids).join(', ')) + (x.auto ? ' (automática)' : ' (regalo manual)'));
        telegram('🛒 <b>COMPRA CON SALDO · OS' + oid + '</b>\n👤 ' + esc(p.username) + '\n' + lineas.join('\n') + '\n💳 Método: saldo CiberStore\n💰 Total: ' + dinero(r.json.total) + '\n🏦 Saldo restante: ' + dinero(r.json.saldo));
        aviso(uid, 'Compra realizada', 'Pedido OS' + oid + ' por ' + dinero(r.json.total) + ' pagado con tu saldo.');
      }
      const snap = await snapshot(oid);
      return enviar(res, { ok: true, repetida: !!r.json.repetida, saldo: Number(r.json.saldo), orden: snap });
    }

    // ───────── entregar (una unidad automática por llamada) ─────────
    if(a === 'entregar'){
      const oid = Number(b.orden_id); if(!(oid > 0)) return enviar(res, { ok: false, code: 'solicitud', message: 'Pedido inválido' });
      const ro = await rest('ordenes_saldo?id=eq.' + oid + '&user_id=eq.' + encodeURIComponent(uid) + '&select=id'); if(!(Array.isArray(ro.json) && ro.json.length)) return enviar(res, { ok: false, code: 'no_existe', message: 'No encontramos ese pedido' }, 404);
      if(limite('e|' + uid, 60, 60000)) return enviar(res, { ok: false, code: 'limite', message: 'Espera un momento' }, 429);
      const rc = await rpc('checkout_item_reclamar', { p_orden: oid });
      if(rc.status >= 400 || !rc.json) return enviar(res, { ok: false, code: 'db', message: 'No se pudo continuar la entrega' });
      const item = rc.json.item;
      if(item){
        const ped = await (async () => { const ri = await rest('ordenes_saldo_items?id=eq.' + item.id + '&select=pedido_id'); return Array.isArray(ri.json) && ri.json[0] ? ri.json[0].pedido_id : null; })();
        const llave = 'cs-os' + oid + '-' + item.id;
        const pr = await llamarProveedor({ action: 'comprar', producto: item.srv, player_id: item.ff_id, client_name: p.username, idempotency_key: llave }, req);
        let est, err = null, ref = null;
        if(pr && pr.success && pr.status === 'COMPLETED'){ est = 'completada'; ref = { order_id: pr.order_id || null, reference: pr.reference || null, via: pr.via || null }; }
        else if(pr && pr.success && pr.status === 'PENDING'){ est = 'enviada'; ref = { order_id: pr.order_id || null, reference: pr.reference || null, via: pr.via || null }; }
        else {
          err = String((pr && (pr.error || pr.status)) || 'sin confirmar'); const code = String((pr && pr.code) || '');
          est = (code === 'PURCHASE_FAILED' || code === 'PRODUCT_INACTIVE' || code === 'ENDPOINT_DISABLED') ? 'rechazada' : 'verificar';
        }
        const rr = await rpc('checkout_item_resultado', { p_item: item.id, p_estado: est, p_ref: ref, p_error: err });
        if(rr.status >= 400){
          // no se pudo guardar el resultado: queda "procesando" y se reintentará con la MISMA llave (el proveedor no entrega dos veces)
          telegram('🔥 <b>OS' + oid + ' · no se pudo guardar el resultado</b>\n' + esc(item.nombre) + ' → ID ' + esc(item.ff_id) + '\nResultado: ' + est + ' · ' + esc(err || '') + '\nLlave: ' + llave);
        } else {
          await pedidoEstado(ped, PEDIDO_EST[est] || 'procesando', est === 'rechazada' ? 'Reembolsado a tu saldo: ' + (err || '') : (est === 'verificar' ? 'En verificación por el equipo' : null));
          if(est === 'rechazada') telegram('↩️ <b>OS' + oid + ' · unidad rechazada y reembolsada</b>\n👤 ' + esc(p.username) + '\n🎁 ' + esc(item.nombre) + ' → ID ' + esc(item.ff_id) + '\n❗ ' + esc(err));
          if(est === 'verificar') telegram('🚨 <b>OS' + oid + ' · VERIFICAR a mano</b>\n👤 ' + esc(p.username) + '\n🎁 ' + esc(item.nombre) + ' → ID ' + esc(item.ff_id) + '\n❗ ' + esc(err) + '\n🔑 ' + llave + '\nNo se reembolsó: revisa con el proveedor y resuélvelo en el panel (Órdenes con saldo).');
          if(est === 'enviada' || est === 'completada') telegram('⚡ <b>OS' + oid + ' · entrega automática ' + (est === 'completada' ? '✅ completada' : '⏳ en proceso') + '</b>\n👤 ' + esc(p.username) + '\n🎁 ' + esc(item.nombre) + ' → ID ' + esc(item.ff_id) + (ref && ref.via ? '\n📡 ' + esc(ref.via) : ''));
        }
      }
      const snap = await snapshot(oid);
      return enviar(res, { ok: true, orden: snap, siguiente: !!(snap && snap.por_entregar > 0 && item) });
    }

    // ───────── refrescar unidades "en proceso" con el proveedor ─────────
    if(a === 'refrescar'){
      const oid = Number(b.orden_id); if(!(oid > 0)) return enviar(res, { ok: false, code: 'solicitud', message: 'Pedido inválido' });
      const ro = await rest('ordenes_saldo?id=eq.' + oid + '&user_id=eq.' + encodeURIComponent(uid) + '&select=id'); if(!(Array.isArray(ro.json) && ro.json.length)) return enviar(res, { ok: false, code: 'no_existe', message: 'No encontramos ese pedido' }, 404);
      if(limite('r|' + uid, 30, 60000)) return enviar(res, { ok: false, code: 'limite', message: 'Espera un momento' }, 429);
      const ri = await rest('ordenes_saldo_items?orden_id=eq.' + oid + '&estado=eq.enviada&select=id,proveedor,pedido_id,nombre,ff_id'); const its = Array.isArray(ri.json) ? ri.json : [];
      let consultadas = 0, cambios = 0;
      for(const i of its){
        const oidp = i.proveedor && i.proveedor.order_id; if(!oidp) continue; consultadas++;
        const pr = await llamarProveedor({ action: 'estado', order_id: oidp }, req);
        if(pr && pr.success && pr.status === 'COMPLETED'){ await rpc('checkout_item_resultado', { p_item: i.id, p_estado: 'completada', p_ref: null, p_error: null }); await pedidoEstado(i.pedido_id, 'completado'); cambios++; }
        else if(pr && pr.success && (pr.status === 'FAILED' || pr.status === 'REFUNDED')){
          await rpc('checkout_item_resultado', { p_item: i.id, p_estado: 'rechazada', p_ref: null, p_error: String(pr.error || 'El proveedor canceló la entrega') }); await pedidoEstado(i.pedido_id, 'rechazado', 'Reembolsado a tu saldo'); cambios++;
          telegram('↩️ <b>OS' + oid + ' · el proveedor canceló una unidad (reembolsada)</b>\n👤 ' + esc(p.username) + '\n🎁 ' + esc(i.nombre) + ' → ID ' + esc(i.ff_id));
        }
      }
      return enviar(res, { ok: true, consultadas, cambios, orden: await snapshot(oid) });
    }

    // ───────── mis compras ─────────
    if(a === 'mis_ordenes'){
      const off = Math.max(0, Math.min(5000, Number(b.offset) || 0)), lim = Math.max(1, Math.min(50, Number(b.limit) || 20));
      const x = await cargarOrdenes('user_id=eq.' + encodeURIComponent(uid), '&limit=' + lim + '&offset=' + off);
      if(x.error) return enviar(res, { ok: true, ordenes: [], sin_tabla: true });
      const ordenes = x.os.map(o => armar(o, x.items, x.peds));
      return enviar(res, { ok: true, ordenes, hay_mas: x.os.length === lim, saldo: Number(p.saldo) || 0 });
    }

    return enviar(res, { ok: false, code: 'accion', message: 'Acción desconocida' });
  }catch(e){
    return enviar(res, { ok: false, code: 'error', message: 'Error del servidor. Si se descontó saldo, revisa Mis Compras: nunca se cobra sin dejar tu pedido registrado.' });
  }
};

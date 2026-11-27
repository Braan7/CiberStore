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
const AL = require('./_alerta.js');
const E = require('./_estado.js');
const LK = require('./_likes.js');   // Likes automáticos (llave: LIKES_API_KEY)
const LJ = require('./_lojaff.js');   // Lojaff: envío automático del Pase Booyah
const AV1 = require('./_api_v1.js');   // API de revendedores (/api/v1/*)
const CRAFT = require('./_craft.js');   // Craftland · Nick color (llave: CRAFT_API_KEY)

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

// Ganancia de una unidad: venta en MXN vs costo del proveedor en USD (tipo de cambio CO_TC, el mismo de la protección de margen)
const TC_GAN = Number(process.env.CO_TC || 19.5);
function gananciaTxt(ventaMxn, costoUsd){
  const v = Number(ventaMxn), c = parseFloat(costoUsd);
  if(!(v > 0) || !(c > 0)) return '';
  const g = v - c * TC_GAN, pct = (c * TC_GAN) > 0 ? g / (c * TC_GAN) * 100 : 0;
  return '\n──────────\n💰 Venta: ' + dinero(v) + '\n🏭 Proveedor: US$ ' + c.toFixed(4) + ' (≈ ' + dinero(c * TC_GAN) + ')\n'
    + (g < 0 ? '🔻 <b>PÉRDIDA: ' : g === 0 ? '⚠️ <b>Sin ganancia: ' : '✅ Ganancia: ') + dinero(g) + (g <= 0 ? '</b>' : '') + ' (' + pct.toFixed(1) + ' %)';
}
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
  if(/ordenes_saldo_items_d50_uni/.test(msg)) return { code: 'd50_ya', message: 'Ya hay un pedido de ese paquete al 50% para ese ID. Cada paquete se usa una sola vez por cuenta.' };
  if(/cantidad_invalida/.test(msg)) return { code: 'cantidad', message: 'La cantidad debe ser de 1 a 2,000 likes.' };
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
    return { id: i.id, clave: i.clave, nombre: i.nombre, grupo: i.grupo, img: i.img, entrega: i.entrega, precio: Number(i.precio), ff_id: i.ff_id, estado: i.estado, fase: faseItem(i, p), error: i.error || null, actualizada: i.actualizada, ref: i.ref_rbx || null, codigos: (i.grupo === 'robux' && i.proveedor && Array.isArray(i.proveedor.codigos) && i.proveedor.codigos.length) ? i.proveedor.codigos : null };
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
  if(items.some(i => i.grupo === 'robux')){   // referencia por venta de Robux: CS-RBX-001, 002… (por orden de compra)
    const rk = await rest('ordenes_saldo_items?grupo=eq.robux&select=id&order=id.asc&limit=20000'), pos = {};
    (Array.isArray(rk.json) ? rk.json : []).forEach((x, n) => { pos[x.id] = n + 1; });
    items.forEach(i => { if(i.grupo === 'robux' && pos[i.id]) i.ref_rbx = 'CS-RBX-' + String(pos[i.id]).padStart(3, '0'); });
  }
  return { os, items, peds };
}
async function refRbx(itemId){
  try{ const rk = await rest('ordenes_saldo_items?grupo=eq.robux&id=lte.' + Number(itemId) + '&select=id&limit=20000'); const n = Array.isArray(rk.json) ? rk.json.length : 0; return n ? 'CS-RBX-' + String(n).padStart(3, '0') : ''; }catch(e){ return ''; }
}
const snapshot = async id => { const x = await cargarOrdenes('id=eq.' + Number(id)); return x.error || !x.os.length ? null : armar(x.os[0], x.items, x.peds); };

// Llama a la entrega automática (api/recarga.js) EN el servidor: la llave de Central One nunca sale de ahí
function llamarProveedor(body, req){
  // Lojaff (Pase Booyah): su producto es lj_pase; el proveedor no tiene idempotencia ni consulta de estado
  if(body && /^lj_/.test(String(body.producto || ''))) return LJ.proxy(body).catch(() => ({ success: false, code: 'PROVIDER_ERROR', error: 'Error al contactar a Lojaff' }));
  // Craftland (Lunexis) usa otro proveedor: sus productos empiezan con cl_ y sus pedidos se guardan como CL-<código>
  if(body && (body.craftland === true || /^cl_/.test(String(body.producto || '')) || (body.action === 'estado' && /^CL-/.test(String(body.order_id || ''))))) return CRAFT.proxy(body).catch(() => ({ success: false, code: 'PROVIDER_ERROR', error: 'Error al contactar al proveedor' })).then(r => { if(r && r.alerta) AL.avisarFalla('craft', '🔴 CRAFTLAND: ' + r.alerta, 'El proveedor de Nick color (Craftland) ' + r.alerta + '. Revisa CRAFT_API_KEY en Vercel o el saldo en el panel del proveedor. Mientras tanto nadie puede comprar Nick color.', 30 * 60000).catch(() => {}); return r; });
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
  { clave: 'c1', nombre: 'Caja de Fragmentos Evo', grupo: 'caja', precio: 3.00, mayoreo_min: null, mayoreo_precio: null, max_cant: 5, img: 'img/caja-fragmentos.png', detalle: 'LATAM · entrega automática', entrega: 'auto', srv: 'cj1', orden: 10 },
  { clave: 'c5', nombre: '5 Cajas de Fragmentos Evo', grupo: 'caja', precio: 14.98, mayoreo_min: null, mayoreo_precio: null, max_cant: 5, img: 'img/caja-fragmentos.png', detalle: 'LATAM · entrega automática', entrega: 'auto', srv: 'cj5', orden: 11 },
  { clave: 'c10', nombre: '10 Cajas de Fragmentos Evo', grupo: 'caja', precio: 29.96, mayoreo_min: null, mayoreo_precio: null, max_cant: 5, img: 'img/caja-fragmentos.png', detalle: 'LATAM · entrega automática', entrega: 'auto', srv: 'cj10', orden: 12 },
  { clave: 'c50', nombre: '50 Cajas de Fragmentos Evo', grupo: 'caja', precio: 149.76, mayoreo_min: null, mayoreo_precio: null, max_cant: 5, img: 'img/caja-fragmentos.png', detalle: 'LATAM · entrega automática', entrega: 'auto', srv: 'cj50', orden: 13 },
  { clave: 'f10', nombre: '10 Fragmentos de arma Evo', grupo: 'fragmento', precio: 7.10, mayoreo_min: null, mayoreo_precio: null, max_cant: 5, img: 'img/fragmento-universal.png', detalle: 'LATAM · entrega automática', entrega: 'auto', srv: 'fa10', orden: 20 },
  { clave: 'f50', nombre: '50 Fragmentos de arma Evo', grupo: 'fragmento', precio: 35.50, mayoreo_min: null, mayoreo_precio: null, max_cant: 5, img: 'img/fragmento-universal.png', detalle: 'LATAM · entrega automática', entrega: 'auto', srv: 'fa50', orden: 21 },
  { clave: 'f100', nombre: '100 Fragmentos de arma Evo', grupo: 'fragmento', precio: 71.00, mayoreo_min: null, mayoreo_precio: null, max_cant: 5, img: 'img/fragmento-universal.png', detalle: 'LATAM · entrega automática', entrega: 'auto', srv: 'fa100', orden: 22 },
  { clave: 'f500', nombre: '500 Fragmentos de arma Evo', grupo: 'fragmento', precio: 355.00, mayoreo_min: null, mayoreo_precio: null, max_cant: 5, img: 'img/fragmento-universal.png', detalle: 'LATAM · entrega automática', entrega: 'auto', srv: 'fa500', orden: 23 }
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


// ═══════════ DIAMANTES AL 50 % (Volsever · Pagostore): cada paquete se puede usar UNA sola vez por ID de Free Fire ═══════════
// La llave vive SOLO en Vercel: VOLSEVER_API_KEY. Los precios están en la tabla catalogo_checkout (claves d50_110 … d50_6160).
const D50_PACKS = [110, 341, 572, 1166, 2398, 6160];
const D50_BASE = { 100: 110, 310: 341, 520: 572, 1060: 1166, 2180: 2398, 5600: 6160 };   // diamantes sin bono → paquete
const _d50Cache = new Map();
async function checkD50(uid, fresh){
  if(!process.env.VOLSEVER_API_KEY) return { ok: false, code: 'CONFIG', message: 'El servicio de diamantes al 50% no está configurado todavía.' };
  const run = async () => {
    const ctrl = new AbortController(), t = setTimeout(() => ctrl.abort(), 9000);
    try{
      const r = await fetch('https://gate.volsever.com/garena/api/v1/pagostore/free-fire/check-discounts-paypal-dom?id=' + encodeURIComponent(uid),
        { headers: { 'X-API-KEY': process.env.VOLSEVER_API_KEY, Accept: 'application/json' }, signal: ctrl.signal });
      const d = await r.json().catch(() => null);
      if(r.status === 404) return { ok: false, code: 'NOT_FOUND', message: 'No se encontró esa cuenta de Free Fire. Revisa el ID.' };
      if(r.status === 400) return { ok: false, code: 'BAD_ID', message: 'El ID no es válido.' };
      if(r.status === 401 || r.status === 403){ AL.avisarFalla('volsever', '🔴 VOLSEVER RECHAZÓ LA LLAVE (diamantes al 50%)', 'Volsever respondió ' + r.status + '. Revisa VOLSEVER_API_KEY en Vercel o si te cambiaron permisos. Mientras tanto nadie puede comprar diamantes al 50%.', 30 * 60000).catch(() => {}); }
      else if(r.status >= 500){ AL.avisarFalla('volsever', '🟠 VOLSEVER NO RESPONDE BIEN (diamantes al 50%)', 'Volsever respondió ' + r.status + ' al consultar el descuento de un ID.', 30 * 60000).catch(() => {}); }
      else if(r.ok && d && d.status === true){ AL.avisarVolvio('volsever', '✅ VOLSEVER VOLVIÓ A RESPONDER', 'La consulta del descuento al 50% funciona otra vez.').catch(() => {}); }
      if(!r.ok || !d || d.status !== true || !d.data) return { ok: false, code: 'UNAVAILABLE', message: 'No se pudo consultar el descuento en este momento. Intenta en unos minutos.' };
      const elig = {}, seen = {};
      for(const it of d.data.discount_items || []){
        const dia = Number(it.diamonds) || 0, bono = Number(it.bonus_diamonds) || 0;
        const pack = D50_PACKS.includes(dia) ? dia : D50_PACKS.includes(dia + bono) ? dia + bono : D50_BASE[dia] || null;
        if(!pack) continue;
        seen[pack] = true; if(it.is_discount === true) elig[pack] = true;
      }
      return { ok: true, nick: d.data.username || null, region: d.data.region || null, eligible: elig, seen };
    }catch(e){
      AL.avisarFalla('volsever', '🟠 VOLSEVER NO RESPONDE (diamantes al 50%)', e && e.name === 'AbortError' ? 'La consulta tardó más de 9 segundos.' : 'No se pudo conectar con Volsever.', 30 * 60000).catch(() => {});
      return { ok: false, code: 'UNAVAILABLE', message: e && e.name === 'AbortError' ? 'La consulta del descuento tardó demasiado. Intenta de nuevo.' : 'No se pudo consultar el descuento en este momento.' };
    }finally{ clearTimeout(t); }
  };
  if(fresh) return run();
  const key = 'd50:' + uid, hit = _d50Cache.get(key);
  if(hit && Date.now() - hit.at < 60000) return hit.v;
  const v = await run(); if(v.ok){ _d50Cache.set(key, { at: Date.now(), v }); if(_d50Cache.size > 500) _d50Cache.clear(); }
  return v;
}
// Paquetes al 50% que ese ID ya tiene pedidos y siguen vigentes (los reembolsados no cuentan)
async function d50Pedidos(ffId){
  const r = await rest('ordenes_saldo_items?clave=like.d50_*&estado=neq.reembolsada&ff_id=eq.' + encodeURIComponent(ffId) + '&select=clave,estado');
  const out = {}; (Array.isArray(r.json) ? r.json : []).forEach(x => { out[Number(String(x.clave).slice(4))] = x.estado; }); return out;
}


// ═════════════ GANANCIAS (panel admin) ═════════════
// Se calcula con los pedidos completados. El costo de los diamantes es el precio de referencia del proveedor (US$) × CO_TC.
// Productos sin costo conocido (cajas, fragmentos, diamantes al 50%, otros) se cuentan como venta, sin ganancia calculada.
const COSTO_DIAM_USD = { 110: 0.6550, 341: 1.9649, 572: 3.3222, 1166: 6.1709, 2398: 12.2471, 6160: 31.1701 };
function diamantesDe(prod){
  const t = String(prod || ''); if(/50\s*%/.test(t)) return 0;
  const m = t.match(/^\s*([0-9][0-9.,]*)\s*Diamantes/i); if(!m) return 0;
  const base = Number(m[1].replace(/[.,]/g, '')) || 0, b = t.match(/\+\s*([0-9][0-9.,]*)\s*Bono/i);
  return base + (b ? (Number(b[1].replace(/[.,]/g, '')) || 0) : 0);
}
const diaMX = iso => { try{ return new Date(iso).toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' }); }catch(e){ return String(iso).slice(0, 10); } };
async function calcularGanancias(dias){
  const d = [1, 7, 30, 90].includes(dias) ? dias : 7;
  const hoyMX = diaMX(new Date().toISOString()), desde = new Date(Date.now() - (d - 1) * 86400000 - 86400000).toISOString();
  const r = await rest('pedidos?estado=eq.completado&created_at=gte.' + encodeURIComponent(desde) + '&select=id,username,producto,precio,created_at&order=created_at.desc&limit=5000');
  if(r.status >= 400 || !Array.isArray(r.json)) return { ok: false, code: 'db', message: 'No se pudieron leer los pedidos' };
  const lim = new Date(Date.now() - d * 86400000), minDia = diaMX(new Date(Date.now() - (d - 1) * 86400000).toISOString());
  const dias_ = {}, prods = {}, perdidas = [];
  const R = { pedidos: 0, ventas: 0, ventas_costo: 0, costo: 0, sin_costo_n: 0, sin_costo_venta: 0 };
  for(const p of r.json){
    const dia = diaMX(p.created_at); if(dia < minDia || dia > hoyMX) continue;
    const venta = Number(p.precio) || 0; if(!(venta > 0)) continue;
    const dm = diamantesDe(p.producto), usd = COSTO_DIAM_USD[dm], costo = usd ? usd * TC_GAN : null;
    const nombre = String(p.producto || 'Otro').replace(/\s*\(.*$/, '').replace(/\s+\+\s*[0-9.,]+\s*Bono.*$/i, '').trim().slice(0, 60) || 'Otro';
    R.pedidos++; R.ventas += venta;
    const dd = dias_[dia] || (dias_[dia] = { d: dia, n: 0, venta: 0, ganancia: 0 }); dd.n++; dd.venta += venta;
    const pp = prods[nombre] || (prods[nombre] = { nombre, n: 0, venta: 0, ganancia: 0, con_costo: 0 }); pp.n++; pp.venta += venta;
    if(costo !== null){
      const g = venta - costo; R.ventas_costo += venta; R.costo += costo; dd.ganancia += g; pp.ganancia += g; pp.con_costo++;
      if(g < 0 && perdidas.length < 15) perdidas.push({ id: p.id, producto: nombre, usuario: p.username, venta, ganancia: Math.round(g * 100) / 100, fecha: p.created_at });
    } else { R.sin_costo_n++; R.sin_costo_venta += venta; }
  }
  const f2 = n => Math.round(n * 100) / 100, ganancia = R.ventas_costo - R.costo;
  const por_dia = []; for(let i = d - 1; i >= 0; i--){ const k = diaMX(new Date(Date.now() - i * 86400000).toISOString()); const x = dias_[k] || { d: k, n: 0, venta: 0, ganancia: 0 }; por_dia.push({ d: k, n: x.n, venta: f2(x.venta), ganancia: f2(x.ganancia) }); }
  const por_producto = Object.values(prods).sort((a, b) => b.venta - a.venta).slice(0, 12).map(x => ({ nombre: x.nombre, n: x.n, venta: f2(x.venta), ganancia: x.con_costo ? f2(x.ganancia) : null, con_costo: x.con_costo }));
  return { ok: true, dias: d, tc: TC_GAN, truncado: r.json.length >= 5000,
    resumen: { pedidos: R.pedidos, ventas: f2(R.ventas), ganancia: f2(ganancia), costo: f2(R.costo), margen: R.ventas_costo > 0 ? f2(ganancia / R.ventas_costo * 100) : null, ventas_con_costo: f2(R.ventas_costo), sin_costo_n: R.sin_costo_n, sin_costo_venta: f2(R.sin_costo_venta) },
    por_dia, por_producto, perdidas };
}


// ═════════════ VENTA DE CUENTAS ═════════════
// Clientes y administrador publican cuentas de Free Fire. Las del cliente pasan por revisión del administrador.
// Las fotos llegan comprimidas desde el navegador (data URL) y se guardan en el bucket público "cuentas" de Supabase Storage.
const CV_VINC = ['Facebook', 'Google', 'Apple', 'VK', 'X (Twitter)', 'Huawei', 'Sin vincular', 'Otra'];
const CV_ESTADOS = ['revision', 'publicada', 'rechazada', 'vendida', 'oculta'];
const limpio = (t, max) => String(t == null ? '' : t).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').replace(/\r\n/g, '\n').trim().slice(0, max);
function cvTel(t){ let d = String(t == null ? '' : t).replace(/\D/g, ''); if(d.length === 10) d = '52' + d; return (d.length >= 10 && d.length <= 15) ? d : null; }
function cvDatos(b, exigirContacto){
  const titulo = limpio(b.titulo, 80), descripcion = limpio(b.descripcion, 1500), precio = Math.round(Number(b.precio) * 100) / 100;
  const vinculacion = CV_VINC.includes(b.vinculacion) ? b.vinculacion : null;
  if(titulo.length < 4) return { error: 'Escribe un título de al menos 4 letras' };
  if(!(precio > 0) || precio > 500000) return { error: 'Escribe un precio válido en MXN' };
  if(!vinculacion) return { error: 'Elige con qué está vinculada la cuenta' };
  const contacto = cvTel(b.contacto);
  if(exigirContacto && !contacto) return { error: 'Escribe tu número de WhatsApp (10 dígitos, o con lada de tu país)' };
  return { titulo, descripcion, precio, vinculacion, contacto };
}
const cvPublico = x => ({ id: x.id, codigo: 'CV' + x.id, titulo: x.titulo, precio: Number(x.precio), vinculacion: x.vinculacion, foto: (x.fotos || [])[0] || null, n_fotos: (x.fotos || []).length, creada: x.creada });
async function cvSubirFoto(idc, i, dataUrl){
  const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || '')); if(!m) return { error: 'Una de las fotos no tiene un formato válido (usa JPG, PNG o WEBP)' };
  const buf = Buffer.from(m[2], 'base64'); if(buf.length < 500 || buf.length > 520000) return { error: 'Una foto es demasiado grande o está vacía' };
  const jpg = buf[0] === 0xFF && buf[1] === 0xD8, png = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47, web = buf.slice(0, 4).toString() === 'RIFF' && buf.slice(8, 12).toString() === 'WEBP';
  if(!(jpg || png || web)) return { error: 'Una de las fotos no es una imagen válida' };
  const ext = jpg ? 'jpg' : png ? 'png' : 'webp', mime = jpg ? 'image/jpeg' : png ? 'image/png' : 'image/webp', path = idc + '/' + Date.now().toString(36) + '-' + i + crypto.randomBytes(3).toString('hex') + '.' + ext, c = cfg();
  try{
    const r = await fetch(c.url + '/storage/v1/object/cuentas/' + path, { method: 'POST', headers: { apikey: c.key, Authorization: 'Bearer ' + c.key, 'Content-Type': mime, 'x-upsert': 'false', 'Cache-Control': 'max-age=31536000' }, body: buf });
    if(!r.ok) return { error: 'No se pudo guardar una foto (falta ejecutar cuentas.sql en Supabase)' };
  }catch(e){ return { error: 'No se pudo guardar una foto. Intenta de nuevo' }; }
  return { url: c.url + '/storage/v1/object/public/cuentas/' + path };
}
async function cvBorrarFotos(urls){
  const c = cfg(), pre = c.url + '/storage/v1/object/public/cuentas/', paths = (urls || []).filter(u => String(u).startsWith(pre)).map(u => String(u).slice(pre.length));
  if(!paths.length) return;
  try{ await fetch(c.url + '/storage/v1/object/cuentas', { method: 'DELETE', headers: { apikey: c.key, Authorization: 'Bearer ' + c.key, 'Content-Type': 'application/json' }, body: J({ prefixes: paths }) }); }catch(e){}
}
async function cvCrear(owner, b, admin){
  const d = cvDatos(b, !admin); if(d.error) return { ok: false, code: 'datos', message: d.error };
  const fotos = Array.isArray(b.fotos) ? b.fotos.slice(0, 5) : []; if(fotos.length < (admin ? 1 : 3)) return { ok: false, code: 'fotos', message: admin ? 'Sube al menos 1 foto de la cuenta' : 'Sube las 3 capturas de la cuenta (perfil, personajes y armas/colección)' };
  const r = await rest('cuentas_venta', { method: 'POST', headers: { Prefer: 'return=representation' }, body: J({ user_id: admin ? null : String(owner.id), username: admin ? 'CiberStore' : owner.username, propia: !!admin, titulo: d.titulo, descripcion: d.descripcion || null, precio: d.precio, vinculacion: d.vinculacion, contacto: d.contacto || null, estado: admin ? 'publicada' : 'revision' }) });
  const fila = Array.isArray(r.json) ? r.json[0] : null;
  if(r.status >= 400 || !fila) return { ok: false, code: 'db', message: 'Falta ejecutar cuentas.sql en Supabase' };
  const urls = [];
  for(let i = 0; i < fotos.length; i++){
    const f = await cvSubirFoto(fila.id, i, fotos[i]);
    if(f.error){ await cvBorrarFotos(urls); await rest('cuentas_venta?id=eq.' + fila.id, { method: 'DELETE' }); return { ok: false, code: 'foto', message: f.error }; }
    urls.push(f.url);
  }
  await rest('cuentas_venta?id=eq.' + fila.id, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: J({ fotos: urls }) });
  if(!admin) telegram('🆕 <b>Cuenta en revisión · CV' + fila.id + '</b>\n👤 ' + esc(owner.username) + '\n🎮 ' + esc(d.titulo) + '\n💵 ' + dinero(d.precio) + ' · ' + esc(d.vinculacion) + '\n📷 ' + urls.length + ' foto(s)\n📱 Vendedor: +' + d.contacto + '\nApruébala o recházala en el panel → Cuentas.');
  return { ok: true, id: fila.id, estado: fila.estado };
}

module.exports = async function handler(req, res){
  try{
    // API de revendedores: /api/v1/balance · /products · /orders (vercel.json reescribe /api/v1/* a este archivo con ?v1=ruta)
    {
      let pv = null; try{ const uu = new URL(String(req.url || ''), 'http://x'); pv = uu.searchParams.get('v1'); if(pv === null && /^\/api\/v1(\/|$)/.test(uu.pathname)) pv = uu.pathname.replace(/^\/api\/v1\/?/, ''); }catch(e){}
      if(pv !== null){
        const ctx = { rest, rpc, enviar, limite, telegram, esc, llamarProveedor, leerCatalogo, msgErr, errorSql, ip: ipDe(req) };
        if(!cfg().url || !cfg().key) return enviar(res, { ok: false, code: 'db', message: 'Servicio no disponible por ahora.' }, 503);
        return AV1.manejar(ctx, req, res, String(pv).split('?')[0].split('/').filter(Boolean));
      }
    }
    // Pulso externo opcional (UptimeRobot / cron-job.org) para que el historial del Estado del Sistema se llene aunque nadie abra el panel.
    // Solo funciona si pones ESTADO_CRON_KEY en Vercel y la llamas con ?estado_cron=ESA_LLAVE. Respeta la frecuencia configurada.
    if(req.method === 'GET'){
      let k = ''; try{ k = new URL(String(req.url || ''), 'http://x').searchParams.get('estado_cron') || ''; }catch(e){}
      const llave = process.env.ESTADO_CRON_KEY, c0 = cfg();
      if(!llave || !k || !c0.url || !c0.key || !iguales(k, llave) || limite('p|' + ipDe(req), 30, 60000)) return enviar(res, { ok: false, code: 'metodo' }, 405);
      return enviar(res, await E.pulso({ rest, db }));
    }
    if(req.method !== 'POST') return enviar(res, { ok: false, code: 'metodo' }, 405);
    const b = (req.body && typeof req.body === 'object') ? req.body : {}, ip = ipDe(req), a = String(b.action || '');
    const c = cfg();
    if(!c.url || !c.key){
      const vistas = Object.keys(process.env).filter(k => /SUPABASE|SERVICE_ROLE/i.test(k)).join(', ') || 'ninguna';
      return enviar(res, { ok: false, code: 'sin_configurar', message: 'Este despliegue no ve ' + [!c.url ? 'SUPABASE_URL' : '', !c.key ? 'SUPABASE_SERVICE_ROLE_KEY' : ''].filter(Boolean).join(' ni ') + '. Variables SUPABASE que sí ve: ' + vistas + '. Revisa que estén en Production y haz Redeploy.' });
    }
    if(limite('g|' + ip, 400, 60000)) return enviar(res, { ok: false, code: 'limite', message: 'Demasiadas solicitudes, espera un momento' }, 429);

    const lkPrecioPub = async () => { try{ const k = await leerCatalogo(); const x = (k.productos || []).find(y => y.clave === 'likes_auto'); return x ? Number(x.precio) : null; }catch(e){ return null; } };
    const clPrecioPub = async () => { try{ const k = await leerCatalogo(); const x = (k.productos || []).find(y => y.clave === 'cl_nick'); return x ? Number(x.precio) : null; }catch(e){ return null; } };
    // ── Stock visible (público): likes y Craftland. Con sesión de admin devuelve además el detalle del proveedor ──
    if(a === 'stock_servicios' || a === 'admin_stock'){
      const adm = a === 'admin_stock';
      if(adm && !S.verificar(b.token)) return enviar(res, { ok: false, code: 'sesion_invalida', message: 'Tu sesión del panel venció. Entra de nuevo.' }, 401);
      if(!adm && limite('stk|' + ip, 40, 60000)) return enviar(res, { ok: false, code: 'limite', message: 'Espera un momento.' }, 429);
      if(!global.__stk || Date.now() - global.__stk.t > (adm ? 8000 : 45000) || global.__stk.adm !== adm){
        const [lk, cf, pj] = await Promise.all([LK.creditos().catch(() => ({ ok: false })), CRAFT.stockInfo().catch(() => ({ ok: false })), LJ.saldo().catch(() => ({ ok: false }))]);
        global.__stk = { t: Date.now(), adm, v: { ok: true,
          likes: { ok: !!lk.ok, restantes: lk.ok ? lk.restantes : null, disponible: lk.ok ? (lk.restantes == null ? true : lk.restantes > 0) : null },
          craftland: { ok: !!cf.ok, disponible: cf.ok ? cf.disponible : null, unidades: cf.ok ? cf.unidades : null },
          pase: { ok: !!pj.ok, unidades: pj.ok ? pj.unidades : null, disponible: pj.ok && pj.unidades != null ? pj.unidades > 0 : null },
          precio_likes_2000: await lkPrecioPub(), precio_craftland: await clPrecioPub(),
          detalle: adm ? { likes: lk, craftland: cf, pase: pj } : undefined, ts: Date.now() } };
      }
      return enviar(res, global.__stk.v);
    }
    // ═════════════ ADMINISTRADOR ═════════════
    if(a.slice(0, 6) === 'admin_'){
      const d = S.verificar(b.token);
      if(!d) return enviar(res, { ok: false, code: 'sesion_invalida', message: 'Tu sesión del panel venció. Entra de nuevo.' }, 401);
      const adm = String(d.u || 'admin').slice(0, 80);
      if(/^admin_api_(lista|crear|renovar|revocar)$/.test(a)) return AV1.admin({ rest, enviar, res, telegram, esc }, a, b, adm);
      if(a === 'admin_cuentas'){
        const e = CV_ESTADOS.includes(b.estado) ? '&estado=eq.' + b.estado : '';
        const r = await rest('cuentas_venta?id=gt.0' + e + '&select=id,username,propia,titulo,descripcion,precio,vinculacion,contacto,fotos,estado,motivo,creada&order=creada.desc&limit=200');
        const rq = await rest('cuentas_venta?estado=eq.revision&select=id'), rn = await rest('cuentas_interes?estado=eq.nuevo&select=id'), ri = await rest('cuentas_interes?estado=in.(nuevo,en_trato)&select=cuenta_id'), cnt = {};
        (Array.isArray(ri.json) ? ri.json : []).forEach(i => { cnt[i.cuenta_id] = (cnt[i.cuenta_id] || 0) + 1; });
        return enviar(res, { ok: true, en_revision: Array.isArray(rq.json) ? rq.json.length : 0, intereses_nuevos: Array.isArray(rn.json) ? rn.json.length : 0, cuentas: (Array.isArray(r.json) ? r.json : []).map(x => Object.assign(cvPublico(x), { descripcion: x.descripcion || '', fotos: x.fotos || [], estado: x.estado, motivo: x.motivo || null, usuario: x.username, propia: !!x.propia, contacto: x.contacto || '', interesados: cnt[x.id] || 0 })) });
      }
      if(a === 'admin_intereses'){
        const e = ['nuevo', 'en_trato', 'cerrado', 'descartado'].includes(b.estado) ? '&estado=eq.' + b.estado : '';
        const r = await rest('cuentas_interes?id=gt.0' + e + '&select=id,cuenta_id,username,contacto,mensaje,estado,creada&order=creada.desc&limit=200'), l = Array.isArray(r.json) ? r.json : [];
        const ids = Array.from(new Set(l.map(x => x.cuenta_id))), cu = {};
        if(ids.length){ const rc = await rest('cuentas_venta?id=in.(' + ids.join(',') + ')&select=id,titulo,precio,username,contacto,propia,estado'); (Array.isArray(rc.json) ? rc.json : []).forEach(c => { cu[c.id] = c; }); }
        return enviar(res, { ok: true, intereses: l.map(x => { const c = cu[x.cuenta_id] || {}; return { id: x.id, cuenta_id: x.cuenta_id, codigo: 'CV' + x.cuenta_id, titulo: c.titulo || '(cuenta borrada)', precio: Number(c.precio) || 0, cuenta_estado: c.estado || null, vendedor: c.propia ? 'CiberStore' : (c.username || ''), vendedor_contacto: c.contacto || '', propia: !!c.propia, comprador: x.username, comprador_contacto: x.contacto, mensaje: x.mensaje || '', estado: x.estado, creada: x.creada }; }) });
      }
      if(a === 'admin_interes_estado'){
        const id = Number(b.id), est = String(b.estado || ''); if(!(id > 0) || !['nuevo', 'en_trato', 'cerrado', 'descartado'].includes(est)) return enviar(res, { ok: false, code: 'solicitud', message: 'Datos inválidos' });
        const r = await rest('cuentas_interes?id=eq.' + id, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: J({ estado: est }) });
        return enviar(res, r.status >= 400 ? { ok: false, code: 'db', message: 'No se pudo guardar' } : { ok: true });
      }
      if(a === 'admin_cuenta_estado'){
        const id = Number(b.id), est = String(b.estado || ''); if(!(id > 0) || !CV_ESTADOS.includes(est)) return enviar(res, { ok: false, code: 'solicitud', message: 'Datos inválidos' });
        const r = await rest('cuentas_venta?id=eq.' + id, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: J({ estado: est, motivo: est === 'rechazada' ? (limpio(b.motivo, 200) || null) : null, actualizada: new Date().toISOString() }) });
        return enviar(res, r.status >= 400 ? { ok: false, code: 'db', message: 'No se pudo guardar' } : { ok: true });
      }
      if(a === 'admin_cuenta_borrar'){
        const id = Number(b.id); if(!(id > 0)) return enviar(res, { ok: false, code: 'solicitud', message: 'Cuenta inválida' });
        const rc = await rest('cuentas_venta?id=eq.' + id + '&select=fotos&limit=1'), c0 = Array.isArray(rc.json) ? rc.json[0] : null;
        await rest('cuentas_venta?id=eq.' + id, { method: 'DELETE' }); if(c0) await cvBorrarFotos(c0.fotos);
        return enviar(res, { ok: true });
      }
      if(a === 'admin_cuenta_crear') return enviar(res, await cvCrear({ id: 'admin', username: adm }, b, true));
      if(a === 'admin_ganancias') return enviar(res, await calcularGanancias(Number(b.dias) || 7));
      if(a === 'admin_estado'){
        if(limite('es|' + adm, 60, 60000)) return enviar(res, { ok: false, code: 'limite', message: 'Demasiadas consultas, espera un momento' }, 429);
        return enviar(res, await E.estado({ rest, db }, { forzar: b.forzar === true }));
      }
      // ───────── Likes 2K con créditos: admin ─────────
      if(a === 'admin_lc_buscar'){
        if(limite('lcb|' + adm, 60, 60000)) return enviar(res, { ok: false, code: 'limite', message: 'Espera un momento' }, 429);
        const q = String(b.q || '').replace(/[^\w.\-@ ñÑáéíóúÁÉÍÓÚ]/g, '').trim().slice(0, 40);
        let us = [];
        if(q){
          const r = await rest('profiles?or=(username.ilike.*' + encodeURIComponent(q) + '*,nombre.ilike.*' + encodeURIComponent(q) + '*)&select=id,username,nombre,whatsapp&limit=30');
          us = Array.isArray(r.json) ? r.json : [];
        } else {
          const r = await rest('likes_cred?creditos=gt.0&order=creditos.desc&limit=30');
          if(r.status >= 400) return enviar(res, { ok: false, code: 'db', message: 'Falta ejecutar likes_creditos.sql en Supabase.' });
          const ids = (Array.isArray(r.json) ? r.json : []).map(x => x.user_id);
          if(ids.length){ const r2 = await rest('profiles?id=in.(' + ids.map(encodeURIComponent).join(',') + ')&select=id,username,nombre,whatsapp'); us = Array.isArray(r2.json) ? r2.json : []; }
        }
        const cred = {};
        if(us.length){ const rc = await rest('likes_cred?user_id=in.(' + us.map(x => encodeURIComponent(x.id)).join(',') + ')'); if(rc.status >= 400) return enviar(res, { ok: false, code: 'db', message: 'Falta ejecutar likes_creditos.sql en Supabase.' }); (Array.isArray(rc.json) ? rc.json : []).forEach(x => { cred[x.user_id] = x.creditos; }); }
        return enviar(res, { ok: true, usuarios: us.map(x => ({ id: x.id, username: x.username, nombre: x.nombre || '', whatsapp: x.whatsapp || '', creditos: cred[x.id] || 0 })).sort((m, n) => n.creditos - m.creditos) });
      }
      if(a === 'admin_lc_ajustar'){
        if(limite('lca|' + adm, 60, 60000)) return enviar(res, { ok: false, code: 'limite', message: 'Espera un momento' }, 429);
        const delta = Math.trunc(Number(b.delta));
        if(!Number.isInteger(delta) || delta === 0 || Math.abs(delta) > 1000000) return enviar(res, { ok: false, code: 'solicitud', message: 'Escribe una cantidad de créditos distinta de 0 (puedes usar negativo para quitar).' });
        const r = await rpc('lc_admin_ajustar', { p_user: String(b.user_id || ''), p_delta: delta, p_nota: String(b.nota || '').replace(/[<>]/g, '').slice(0, 200), p_actor: adm });
        if(r.status >= 400 || !r.json || !r.json.ok){
          const m = msgErr(r);
          if(/usuario_no_existe/.test(m)) return enviar(res, { ok: false, code: 'usuario', message: 'Ese usuario no existe.' });
          if(/creditos_insuficientes/.test(m)) return enviar(res, { ok: false, code: 'creditos', message: 'No se puede: el cliente solo tiene ' + ((m.match(/creditos_insuficientes:(\d+)/) || [])[1] || 0) + ' créditos.' });
          if(/lc_admin_ajustar|does not exist|relation|schema cache/.test(m)) return enviar(res, { ok: false, code: 'db', message: 'Falta ejecutar likes_creditos.sql en Supabase.' });
          return enviar(res, { ok: false, code: 'db', message: 'No se pudo guardar: ' + (m || 'error') });
        }
        return enviar(res, { ok: true, username: r.json.username, antes: r.json.antes, creditos: r.json.creditos });
      }
      if(a === 'admin_lc_historial'){
        const uidh = encodeURIComponent(String(b.user_id || ''));
        const [m, e] = await Promise.all([rest('likes_cred_mov?user_id=eq.' + uidh + '&order=id.desc&limit=30'), rest('likes_cred_envio?user_id=eq.' + uidh + '&order=id.desc&limit=15')]);
        return enviar(res, { ok: true, movimientos: Array.isArray(m.json) ? m.json : [], envios: Array.isArray(e.json) ? e.json : [] });
      }
      if(a === 'admin_catalogo'){
        const r = await rest('catalogo_checkout?order=orden.asc&select=clave,nombre,grupo,precio,mayoreo_min,mayoreo_precio,max_cant,detalle,entrega,srv,activo,orden');
        if(r.status >= 400 || !Array.isArray(r.json)) return enviar(res, { ok: false, code: 'db', message: 'No se pudo leer el catálogo (¿corriste checkout_saldo.sql?)' });
        return enviar(res, { ok: true, productos: r.json.map(x => Object.assign({}, x, { precio: Number(x.precio), mayoreo_precio: x.mayoreo_precio == null ? null : Number(x.mayoreo_precio) })) });
      }
      if(a === 'admin_catalogo_guardar'){
        if(limite('cg|' + adm, 60, 60000)) return enviar(res, { ok: false, code: 'limite', message: 'Espera un momento' }, 429);
        const clave = String(b.clave || '');
        if(!/^[a-z0-9_]{1,40}$/i.test(clave)) return enviar(res, { ok: false, code: 'solicitud', message: 'Producto inválido' });
        const num = (v, min, max, ent) => { const n = Number(v); return (isFinite(n) && n >= min && n <= max && (!ent || Number.isInteger(n))) ? (ent ? n : Math.round(n * 100) / 100) : null; };
        const p = {};
        if(b.precio !== undefined){ const n = num(b.precio, 0.01, 100000); if(n == null) return enviar(res, { ok: false, code: 'solicitud', message: 'Precio inválido (debe ser mayor a 0)' }); p.precio = n; }
        if(b.mayoreo_min !== undefined || b.mayoreo_precio !== undefined){
          const mm = (b.mayoreo_min === null || b.mayoreo_min === '') ? null : num(b.mayoreo_min, 2, 1000, true), mp = (b.mayoreo_precio === null || b.mayoreo_precio === '') ? null : num(b.mayoreo_precio, 0.01, 100000);
          if((mm == null) !== (mp == null)) return enviar(res, { ok: false, code: 'solicitud', message: 'Mayoreo: llena cantidad mínima y precio, o deja ambos vacíos' });
          if(mm != null && p.precio != null && mp >= p.precio) return enviar(res, { ok: false, code: 'solicitud', message: 'El precio de mayoreo debe ser menor al normal' });
          p.mayoreo_min = mm; p.mayoreo_precio = mp;
        }
        if(b.max_cant !== undefined){ const n = num(b.max_cant, 1, 99, true); if(n == null) return enviar(res, { ok: false, code: 'solicitud', message: 'Máximo por compra: 1 a 99' }); p.max_cant = n; }
        if(b.nombre !== undefined){ const t = String(b.nombre).replace(/<[^>]*>/g, '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 80); if(!t) return enviar(res, { ok: false, code: 'solicitud', message: 'Nombre vacío' }); p.nombre = t; }
        if(b.detalle !== undefined) p.detalle = String(b.detalle).replace(/<[^>]*>/g, '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 200) || null;
        if(b.activo !== undefined) p.activo = b.activo === true || b.activo === 'true';
        if(b.orden !== undefined){ const n = num(b.orden, 0, 9999, true); if(n == null) return enviar(res, { ok: false, code: 'solicitud', message: 'Orden inválido' }); p.orden = n; }
        if(!Object.keys(p).length) return enviar(res, { ok: false, code: 'solicitud', message: 'Nada que guardar' });
        const r = await rest('catalogo_checkout?clave=eq.' + encodeURIComponent(clave), { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: J(p) });
        if(r.status >= 400) return enviar(res, { ok: false, code: 'db', message: 'No se pudo guardar' + (msgErr(r) ? ': ' + msgErr(r).slice(0, 140) : '') });
        if(!Array.isArray(r.json) || !r.json.length) return enviar(res, { ok: false, code: 'no_existe', message: 'No existe ese producto' });
        try{ delete global.__stk; }catch(e){}
        return enviar(res, { ok: true, producto: r.json[0] });
      }
      if(a === 'admin_estado_config') return enviar(res, await E.configurar({ rest, db }, b));
      if(a === 'admin_ordenes'){
        const est = ['pagada', 'entregando', 'verificar', 'parcial', 'reembolsada'].indexOf(b.estado) >= 0 ? '&estado=eq.' + b.estado : '';
        const lim = Math.max(1, Math.min(200, Number(b.limit) || 60));
        const x = await cargarOrdenes('id=gt.0' + est, '&limit=' + lim);
        if(x.error) return enviar(res, { ok: false, code: 'db', message: 'Falta ejecutar checkout_saldo.sql en Supabase' });
        return enviar(res, { ok: true, ordenes: x.os.map(o => Object.assign(armar(o, x.items, x.peds), { usuario: o.username, user_id: o.user_id, idem: o.idem })) });
      }
      // Auditoría: compara las unidades "completadas" con lo que dice el proveedor ahora (por si devolvió el saldo después)
      if(a === 'admin_auditar'){
        if(limite('au|' + adm, 10, 60000)) return enviar(res, { ok: false, code: 'limite', message: 'Espera un momento' }, 429);
        const dias = [1, 3, 7, 30].includes(Number(b.dias)) ? Number(b.dias) : 3, desde = new Date(Date.now() - dias * 86400000).toISOString(), off = Math.max(0, Math.min(2000, Number(b.offset) || 0));
        const ri = await rest('ordenes_saldo_items?entrega=eq.auto&estado=eq.completada&actualizada=gte.' + encodeURIComponent(desde) + '&select=id,orden_id,nombre,ff_id,precio,proveedor&order=id.desc&limit=30&offset=' + off);
        if(ri.status >= 400 || !Array.isArray(ri.json)) return enviar(res, { ok: false, code: 'db', message: 'No se pudieron leer las órdenes' });
        const its = ri.json, sosp = []; let revisadas = 0, sin = 0, nocons = 0;
        const un = async i => {
          const opv = i.proveedor && i.proveedor.order_id; if(!opv){ sin++; return; }
          const pr = await llamarProveedor({ action: 'estado', order_id: opv }, req);
          if(!(pr && pr.success)){ nocons++; return; }
          revisadas++; if(pr.status === 'REFUNDED' || pr.status === 'FAILED') sosp.push({ item_id: i.id, orden_id: i.orden_id, codigo: 'OS' + i.orden_id, nombre: i.nombre, ff_id: i.ff_id, precio: Number(i.precio) || 0, proveedor: pr.status, referencia: pr.reference || (i.proveedor && i.proveedor.reference) || '' });
        };
        for(let k = 0; k < its.length; k += 5) await Promise.all(its.slice(k, k + 5).map(un));
        if(sosp.length){ const ro = await rest('ordenes_saldo?id=in.(' + Array.from(new Set(sosp.map(x => x.orden_id))).join(',') + ')&select=id,username'), m = {}; (Array.isArray(ro.json) ? ro.json : []).forEach(o => { m[o.id] = o.username; }); sosp.forEach(x => { x.usuario = m[x.orden_id] || ''; }); }
        return enviar(res, { ok: true, dias, revisadas, sin_referencia: sin, no_consultadas: nocons, sospechosas: sosp, hay_mas: its.length === 30, siguiente: off + 30 });
      }
      if(a === 'admin_item'){
        const id = Number(b.item_id); if(!(id > 0)) return enviar(res, { ok: false, code: 'solicitud', message: 'Unidad inválida' });
        const ri = await rest('ordenes_saldo_items?id=eq.' + id + '&select=id,orden_id,estado,pedido_id,nombre,precio,ff_id'); const it = Array.isArray(ri.json) && ri.json[0];
        if(!it) return enviar(res, { ok: false, code: 'no_existe', message: 'No existe esa unidad' });
        if(b.accion === 'reembolsar'){
          if(it.estado === 'reembolsada') return enviar(res, { ok: false, code: 'ya', message: 'Esa unidad ya fue reembolsada' });
          if(it.estado === 'completada'){
            // Unidad que quedó "completada" pero el proveedor luego devolvió el saldo: solo se reembolsa si el proveedor lo confirma (o el admin fuerza)
            const ref = await rest('ordenes_saldo_items?id=eq.' + id + '&select=proveedor'), pv = Array.isArray(ref.json) && ref.json[0] && ref.json[0].proveedor, opv = pv && pv.order_id;
            if(b.forzar !== true){
              if(!opv) return enviar(res, { ok: false, code: 'sin_ref', message: 'Esa unidad no tiene referencia del proveedor: no se puede comprobar. Verifícala en Central One.' });
              const pr = await llamarProveedor({ action: 'estado', order_id: opv }, req);
              if(!(pr && pr.success && (pr.status === 'REFUNDED' || pr.status === 'FAILED'))) return enviar(res, { ok: false, code: 'entregada', message: 'El proveedor NO reporta esa unidad como devuelta o fallida: no se reembolsó.' });
            }
            const rr = await rpc('checkout_reembolsar_item', { p_item: id, p_motivo: 'El proveedor devolvió el saldo (reembolsada por ' + adm + ')' });
            if(rr.status >= 400) return enviar(res, { ok: false, code: 'db', message: 'No se pudo reembolsar: ' + msgErr(rr) });
            await pedidoEstado(it.pedido_id, 'rechazado', 'Reembolsado a tu saldo');
            telegram('↩️ <b>OS' + it.orden_id + ' · unidad reembolsada después de marcarse completada</b>\n🎁 ' + esc(it.nombre) + ' → ID ' + esc(it.ff_id) + '\nEl proveedor devolvió el saldo. Por: ' + esc(adm));
            return enviar(res, { ok: true });
          }
          {   // Robux PIN: si el proveedor SÍ lo entregó, no se reembolsa (se pone el código con "Poner código PIN")
            const rg = await rest('ordenes_saldo_items?id=eq.' + id + '&select=grupo,proveedor'), g0 = Array.isArray(rg.json) && rg.json[0], opv = g0 && g0.proveedor && g0.proveedor.order_id;
            if(g0 && g0.grupo === 'robux' && opv && b.forzar !== true){
              const pr = await llamarProveedor({ action: 'estado', order_id: opv }, req);
              if(pr && pr.success && pr.status === 'COMPLETED') return enviar(res, { ok: false, code: 'entregada', message: 'Central One SÍ entregó ese Robux (cobró el costo). No lo reembolses: usa "Poner código PIN" con el código que ves en Central One.' });
            }
          }
          const r = await rpc('checkout_item_resultado', { p_item: id, p_estado: 'rechazada', p_ref: null, p_error: 'Reembolsada por ' + adm });
          if(r.status >= 400) return enviar(res, { ok: false, code: 'db', message: 'No se pudo reembolsar: ' + msgErr(r) });
          await pedidoEstado(it.pedido_id, 'rechazado', 'Reembolsado a tu saldo');
          return enviar(res, { ok: true });
        }
        if(b.accion === 'codigo'){
          // Robux PIN que el proveedor entregó pero cuyo código no se pudo leer: el admin lo escribe y el cliente lo ve en Mis Compras
          if(it.estado === 'reembolsada') return enviar(res, { ok: false, code: 'ya', message: 'Esa unidad ya fue reembolsada: el cliente ya tiene su dinero de vuelta.' });
          const cod = String(b.codigo || '').trim();
          if(cod.length < 6 || cod.length > 200 || /\s{2,}/.test(cod)) return enviar(res, { ok: false, code: 'codigo', message: 'Escribe el código completo (6 a 200 caracteres).' });
          const rg = await rest('ordenes_saldo_items?id=eq.' + id + '&select=grupo,proveedor'), g0 = Array.isArray(rg.json) && rg.json[0];
          if(!g0 || g0.grupo !== 'robux') return enviar(res, { ok: false, code: 'grupo', message: 'Solo se puede poner código en unidades de Robux PIN.' });
          const ref2 = Object.assign({}, g0.proveedor || {}, { codigos: [cod], manual: adm });
          const r = await rpc('checkout_item_resultado', { p_item: id, p_estado: 'completada', p_ref: ref2, p_error: null });
          if(r.status >= 400) return enviar(res, { ok: false, code: 'db', message: 'No se pudo guardar: ' + msgErr(r) });
          await pedidoEstado(it.pedido_id, 'completado');
          telegram('✅ <b>OS' + it.orden_id + ' · código entregado a mano</b>\n🎁 ' + esc(it.nombre) + '\nPor: ' + esc(adm));
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
      return enviar(res, { ok: true, sin_bd: k.sin_bd, diag: k.diag || null, productos: k.productos.filter(x => x.grupo !== 'd50' && x.grupo !== 'craftland' && x.grupo !== 'likes'), saldo: null });
    }
    // ── Venta de cuentas: lo público se ve sin iniciar sesión ──
    if(a === 'cuentas_lista'){
      if(limite('cl|' + ip, 90, 60000)) return enviar(res, { ok: false, code: 'limite', message: 'Espera un momento' }, 429);
      const r = await rest('cuentas_venta?estado=eq.publicada&select=id,titulo,precio,vinculacion,fotos,creada&order=creada.desc&limit=200');
      if(r.status >= 400 || !Array.isArray(r.json)) return enviar(res, { ok: true, cuentas: [], sin_bd: true });
      return enviar(res, { ok: true, cuentas: r.json.map(cvPublico) });
    }
    if(a === 'cuentas_detalle'){
      const id = Number(b.id); if(!(id > 0)) return enviar(res, { ok: false, code: 'solicitud', message: 'Cuenta inválida' });
      if(limite('cd|' + ip, 120, 60000)) return enviar(res, { ok: false, code: 'limite', message: 'Espera un momento' }, 429);
      const r = await rest('cuentas_venta?id=eq.' + id + '&estado=eq.publicada&select=id,titulo,descripcion,precio,vinculacion,fotos,propia,creada&limit=1'), x = Array.isArray(r.json) ? r.json[0] : null;
      if(!x) return enviar(res, { ok: false, code: 'no_existe', message: 'Esta cuenta ya no está disponible' }, 404);
      return enviar(res, { ok: true, cuenta: Object.assign(cvPublico(x), { descripcion: x.descripcion || '', fotos: x.fotos || [], vendedor: x.propia ? 'CiberStore' : 'Cliente' }) });
    }
    if(!u || !h) return enviar(res, { ok: false, code: 'credenciales', message: 'Inicia sesión para comprar' }, 401);
    if(limite('a|' + ip, 80, 60000)) return enviar(res, { ok: false, code: 'limite', message: 'Demasiados intentos, espera un momento' }, 429);
    const r0 = await rest('profiles?username=eq.' + encodeURIComponent(u) + '&select=id,username,password_hash,banned,saldo&limit=1');
    const p = Array.isArray(r0.json) ? r0.json[0] : null;
    if(!p || !p.password_hash || !iguales(h, p.password_hash)) return enviar(res, { ok: false, code: 'credenciales', message: 'Vuelve a iniciar sesión' }, 401);
    const uid = String(p.id);

    // ── Venta de cuentas: acciones del cliente (sus propias cuentas) ──
    if(a.slice(0, 8) === 'cuentas_'){
      if(p.banned) return enviar(res, { ok: false, code: 'suspendida', message: 'Tu cuenta está suspendida. Contacta a soporte.' });
      if(a === 'cuentas_mias'){
        const r = await rest('cuentas_venta?user_id=eq.' + encodeURIComponent(uid) + '&select=id,titulo,descripcion,precio,vinculacion,contacto,fotos,estado,motivo,creada&order=creada.desc&limit=100');
        return enviar(res, { ok: true, cuentas: (Array.isArray(r.json) ? r.json : []).map(x => Object.assign(cvPublico(x), { descripcion: x.descripcion || '', contacto: x.contacto || '', fotos: x.fotos || [], estado: x.estado, motivo: x.motivo || null })) });
      }
      if(a === 'cuentas_interes'){
        const idc = Number(b.id), tel = cvTel(b.contacto); if(!(idc > 0)) return enviar(res, { ok: false, code: 'solicitud', message: 'Cuenta inválida' });
        if(!tel) return enviar(res, { ok: false, code: 'contacto', message: 'Escribe tu número de WhatsApp (10 dígitos, o con lada de tu país)' });
        if(limite('ci|' + uid, 8, 3600000)) return enviar(res, { ok: false, code: 'limite', message: 'Enviaste muchas solicitudes seguidas. Intenta más tarde.' }, 429);
        const rc = await rest('cuentas_venta?id=eq.' + idc + '&estado=eq.publicada&select=id,titulo,precio,username,user_id,contacto,propia&limit=1'), cu = Array.isArray(rc.json) ? rc.json[0] : null;
        if(!cu) return enviar(res, { ok: false, code: 'no_existe', message: 'Esta cuenta ya no está disponible' }, 404);
        if(!cu.propia && String(cu.user_id) === uid) return enviar(res, { ok: false, code: 'propia', message: 'Esta cuenta es tuya' });
        const msg = limpio(b.mensaje, 300) || null;
        const ex = await rest('cuentas_interes?cuenta_id=eq.' + idc + '&user_id=eq.' + encodeURIComponent(uid) + '&select=id,estado&limit=1'), e0 = Array.isArray(ex.json) ? ex.json[0] : null;
        if(e0) await rest('cuentas_interes?id=eq.' + e0.id, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: J({ contacto: tel, mensaje: msg, estado: (e0.estado === 'cerrado' || e0.estado === 'descartado') ? 'nuevo' : e0.estado }) });
        else { const ri = await rest('cuentas_interes', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: J({ cuenta_id: idc, user_id: uid, username: p.username, contacto: tel, mensaje: msg }) }); if(ri.status >= 400) return enviar(res, { ok: false, code: 'db', message: 'Falta ejecutar cuentas_contacto.sql en Supabase' }); }
        telegram('🤝 <b>Nuevo interesado · CV' + idc + '</b>\n🎮 ' + esc(cu.titulo) + ' · ' + dinero(cu.precio) + '\n🛒 Comprador: ' + esc(p.username) + ' → +' + tel + (msg ? '\n💬 «' + esc(msg) + '»' : '') + '\n📱 Vendedor: ' + (cu.propia ? 'CiberStore' : esc(cu.username) + (cu.contacto ? ' → +' + cu.contacto : '')) + '\nOrganiza el trato en el panel → Cuentas → Interesados.');
        return enviar(res, { ok: true });
      }
      if(a === 'cuentas_crear'){
        { const dv = cvDatos(b, true); if(dv.error) return enviar(res, { ok: false, code: 'datos', message: dv.error }); }   // un dato mal escrito no gasta el límite por hora
        if(limite('cc|' + uid, 5, 3600000)) return enviar(res, { ok: false, code: 'limite', message: 'Publicaste muchas cuentas seguidas. Intenta más tarde.' }, 429);
        const ra = await rest('cuentas_venta?user_id=eq.' + encodeURIComponent(uid) + '&estado=in.(revision,publicada)&select=id');
        if(Array.isArray(ra.json) && ra.json.length >= 5) return enviar(res, { ok: false, code: 'tope', message: 'Ya tienes 5 cuentas activas. Borra o marca como vendida alguna para subir otra.' });
        return enviar(res, await cvCrear(p, b, false));
      }
      const id = Number(b.id); if(!(id > 0)) return enviar(res, { ok: false, code: 'solicitud', message: 'Cuenta inválida' });
      const rc = await rest('cuentas_venta?id=eq.' + id + '&user_id=eq.' + encodeURIComponent(uid) + '&select=id,estado,fotos,titulo&limit=1'), c0 = Array.isArray(rc.json) ? rc.json[0] : null;
      if(!c0) return enviar(res, { ok: false, code: 'no_existe', message: 'No encontramos esa cuenta' }, 404);
      if(a === 'cuentas_borrar'){
        await rest('cuentas_venta?id=eq.' + id, { method: 'DELETE' }); await cvBorrarFotos(c0.fotos);
        return enviar(res, { ok: true });
      }
      if(a === 'cuentas_vendida'){
        if(c0.estado !== 'publicada') return enviar(res, { ok: false, code: 'estado', message: 'Solo una cuenta publicada se puede marcar como vendida' });
        await rest('cuentas_venta?id=eq.' + id, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: J({ estado: 'vendida', actualizada: new Date().toISOString() }) });
        return enviar(res, { ok: true });
      }
      if(a === 'cuentas_editar'){
        if(c0.estado === 'vendida') return enviar(res, { ok: false, code: 'estado', message: 'Una cuenta vendida ya no se puede editar' });
        const d = cvDatos(b, true); if(d.error) return enviar(res, { ok: false, code: 'datos', message: d.error });
        await rest('cuentas_venta?id=eq.' + id, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: J({ titulo: d.titulo, descripcion: d.descripcion || null, precio: d.precio, vinculacion: d.vinculacion, contacto: d.contacto, estado: 'revision', motivo: null, actualizada: new Date().toISOString() }) });
        telegram('✏️ <b>Cuenta editada · CV' + id + '</b> (vuelve a revisión)\n👤 ' + esc(p.username) + '\n🎮 ' + esc(d.titulo) + ' · ' + dinero(d.precio));
        return enviar(res, { ok: true, estado: 'revision' });
      }
      return enviar(res, { ok: false, code: 'accion', message: 'Acción desconocida' });
    }


    // ═════════ LIKES AUTOMÁTICOS (1 crédito = 1 like; si el proveedor envía menos, se devuelve lo que faltó) ═════════
    if(a === 'likes_check' || a === 'likes_enviar' || a === 'likes_estado' || a === 'likes_mis'){
      const lkPub = l => l ? { id: l.id, codigo: 'LK' + l.id, ff_id: l.ff_id, cantidad: l.cantidad, enviados: l.enviados, devuelto: Number(l.devuelto), total: Number(l.total), estado: l.estado, nick: l.nick || '', antes: l.antes, despues: l.despues, recibo: l.recibo || null, fecha: l.cerrada || l.creada, detalle: l.estado === 'verificar' ? 'En verificación con el equipo. Si no se envió, se te devuelve el saldo.' : (l.estado === 'rechazada' ? (l.detalle || '') : '') } : null;
      const lkAl = (r, cuando) => { if(r && (r.alerta || r.sinCreditos)) AL.avisarFalla('likes', '🔴 LIKES: ' + (r.alerta || 'proveedor sin créditos'), 'El proveedor de likes ' + (r.alerta || 'no tiene créditos para enviar') + (cuando ? ' (' + cuando + ')' : '') + '. Revisa LIKES_API_KEY en Vercel o recarga créditos con el proveedor. Mientras tanto nadie puede enviar likes automáticos.', 30 * 60000).catch(() => {}); };
      const lkPrecio = async () => { const k = await leerCatalogo(); const x = (k.productos || []).find(y => y.clave === 'likes_auto'); return x ? Number(x.precio) / 2000 : null; };   // el catálogo guarda el precio de cada 2,000 likes
      const lkCerrar = (l, enviados, estado, o) => rpc('likes_auto_cerrar', { p_id: l, p_enviados: enviados, p_estado: estado || null, p_nick: (o && o.nick) || null, p_antes: (o && o.antes != null) ? o.antes : null, p_despues: (o && o.despues != null) ? o.despues : null, p_log: (o && o.log_id != null) ? o.log_id : null, p_recibo: (o && o.recibo) || null, p_detalle: (o && o.detalle) || null });
      const lkLeer = async id => { const r = await rest('likes_auto?id=eq.' + Number(id) + '&user_id=eq.' + encodeURIComponent(uid) + '&limit=1'); return Array.isArray(r.json) && r.json[0] ? r.json[0] : null; };
      // Cierra un pedido a partir de lo que el proveedor registró en su historial (o lo manda a verificar si no se puede saber)
      const lkResolver = async (l, forzarReembolso) => {
        const bl = await LK.buscarEnLog(l.ff_id, Date.parse(l.creada));
        if(bl.error) return lkCerrar(l.id, 0, 'verificar', { detalle: 'No se pudo confirmar con el proveedor' });
        if(bl.encontrado) return lkCerrar(l.id, bl.enviados, null, { nick: bl.nick, log_id: bl.log_id });
        if(forzarReembolso) return lkCerrar(l.id, 0, 'rechazada', { detalle: 'El proveedor no registró el envío' });
        return lkCerrar(l.id, 0, 'verificar', { detalle: 'El proveedor no confirmó el envío' });
      };

      if(a === 'likes_mis'){
        const r = await rest('likes_auto?user_id=eq.' + encodeURIComponent(uid) + '&order=id.desc&limit=10');
        return enviar(res, { ok: true, items: (Array.isArray(r.json) ? r.json : []).map(lkPub), sin_tabla: r.status >= 400 });
      }
      if(a === 'likes_estado'){
        if(limite('lke|' + uid, 30, 60000)) return enviar(res, { ok: false, code: 'limite', message: 'Espera un momento.' }, 429);
        let l = await lkLeer(b.id); if(!l) return enviar(res, { ok: false, code: 'no_existe', message: 'No encontramos ese envío.' }, 404);
        if(l.estado === 'verificar' || (l.estado === 'procesando' && Date.now() - Date.parse(l.creada) > 180000)){
          await lkResolver(l, l.estado === 'procesando' && Date.now() - Date.parse(l.creada) > 180000); l = await lkLeer(b.id);
        }
        return enviar(res, { ok: true, resultado: lkPub(l), saldo: null });
      }
      const precio = await lkPrecio();
      if(!(precio > 0)) return enviar(res, { ok: false, code: 'sin_catalogo', message: 'Este servicio aún no está activado. Falta ejecutar likes_auto.sql en Supabase.' });
      const idF = String(b.ff_id || '').replace(/\D/g, '');

      if(a === 'likes_check'){
        if(limite('lkc|' + uid, 20, 60000)) return enviar(res, { ok: false, code: 'limite', message: 'Demasiadas consultas, espera un momento.' }, 429);
        const [j, cr] = await Promise.all([LK.jugador(idF), LK.creditos()]);
        lkAl(j, 'consulta'); lkAl(cr, 'consulta');
        if(!j.ok) return enviar(res, { ok: false, code: j.code, message: j.message }, j.code === 'NOT_FOUND' ? 404 : j.code === 'id' ? 400 : 503);
        const max = cr.ok && cr.restantes != null ? Math.max(0, Math.min(2000, cr.restantes)) : 2000;
        return enviar(res, { ok: true, ff_id: idF, nick: j.nick, likes: j.likes, region: j.region, precio_unit: precio, precio_2000: Math.round(precio * 2000 * 100) / 100, max_cant: max, disponible: cr.ok ? max > 0 : false, motivo: cr.ok ? (max > 0 ? null : 'Sin créditos por ahora. Intenta más tarde.') : cr.message, saldo: Number(p.saldo) || 0 });
      }

      // ───────── likes_enviar ─────────
      if(p.banned) return enviar(res, { ok: false, code: 'suspendida', message: 'Tu cuenta está suspendida. Contacta a soporte.' });
      const cant = Number(b.cantidad), idem = String(b.idem || '');
      if(!LK.idOk(idF)) return enviar(res, { ok: false, code: 'id', message: 'Revisa tu ID de Free Fire (solo números, de 5 a 15 dígitos).' });
      if(!LK.intOk(cant)) return enviar(res, { ok: false, code: 'cantidad', message: 'La cantidad debe ser de 1 a 2,000 likes.' });
      if(!/^[A-Za-z0-9_-]{8,100}$/.test(idem)) return enviar(res, { ok: false, code: 'solicitud', message: 'Solicitud inválida. Recarga la página.' });
      const prev = await rest('likes_auto?idem=eq.' + encodeURIComponent(idem) + '&user_id=eq.' + encodeURIComponent(uid) + '&limit=1');
      if(Array.isArray(prev.json) && prev.json[0]){   // reintento del mismo pedido: nunca se vuelve a enviar ni a cobrar
        return enviar(res, { ok: true, repetida: true, resultado: lkPub(prev.json[0]), saldo: Number(p.saldo) || 0 });
      }
      if(limite('lk|' + uid, 20, 60000)) return enviar(res, { ok: false, code: 'limite', message: 'Espera un momento antes de otro envío.' }, 429);
      // antes de cobrar: que el ID exista y que el proveedor tenga créditos (así no se cobra algo que no se puede enviar)
      const [j, cr] = await Promise.all([LK.jugador(idF), LK.creditos()]);
      lkAl(j, 'envío'); lkAl(cr, 'envío');
      if(!j.ok) return enviar(res, { ok: false, code: j.code, message: j.message }, j.code === 'NOT_FOUND' ? 404 : 503);
      if(!cr.ok) return enviar(res, { ok: false, code: cr.code, message: cr.message }, 503);
      if(cr.restantes != null && cr.restantes < cant){ if(cr.restantes <= 0) lkAl({ sinCreditos: true }, 'envío'); return enviar(res, { ok: false, code: 'sin_creditos', message: cr.restantes <= 0 ? 'Servicio sin créditos por ahora. Intenta más tarde: no se te cobró.' : 'Por ahora solo se pueden enviar hasta ' + cr.restantes + ' likes. Baja la cantidad. No se te cobró.' }); }
      const pg = await rpc('likes_auto_pagar', { p_user: uid, p_idem: idem, p_ff: idF, p_cant: cant, p_unit: precio });
      if(pg.status >= 400 || !pg.json || !pg.json.ok){
        const e = errorSql(msgErr(pg)); if(e) return enviar(res, Object.assign({ ok: false }, e));
        if(/likes_auto_pagar|does not exist|relation|schema cache|permission denied/.test(msgErr(pg))) return enviar(res, { ok: false, code: 'db', message: 'Falta ejecutar likes_auto.sql en Supabase.' });
        return enviar(res, { ok: false, code: 'db', message: 'No se pudo procesar el pago. No se te cobró. Intenta de nuevo.' });
      }
      const lid = pg.json.id; const ini = Date.now();
      if(pg.json.repetida){ const l0 = await lkLeer(lid); return enviar(res, { ok: true, repetida: true, resultado: lkPub(l0), saldo: Number(pg.json.saldo) }); }
      let rr = await LK.enviar(idF, cant), cierre;
      if(rr.ok) cierre = await lkCerrar(lid, rr.enviados, null, rr);
      else if(rr.definitivo){ lkAl(rr, 'envío'); cierre = await lkCerrar(lid, 0, 'rechazada', { detalle: rr.detalle }); }
      else { await new Promise(r2 => setTimeout(r2, 3000)); const l1 = await lkLeer(lid); cierre = await lkResolver(Object.assign({}, l1, { creada: new Date(ini).toISOString() }), false); }
      const lf = await lkLeer(lid), pub = lkPub(lf);
      const sal = cierre && cierre.json && cierre.json.saldo != null ? Number(cierre.json.saldo) : null;
      if(lf && lf.estado === 'verificar') telegram('🚨 <b>LIKES LK' + lid + ' · VERIFICAR a mano</b>\n👤 ' + esc(p.username) + ' → ID ' + esc(idF) + ' · pidió ' + cant + '\n❗ ' + esc((rr && rr.detalle) || 'sin confirmar') + '\nNo se reembolsó: revisa el historial del proveedor. El cliente puede reabrirlo y se reintenta confirmar solo.');
      else if(lf && (lf.estado === 'completada' || lf.estado === 'parcial')) telegram('🔥 <b>LIKES AUTOMÁTICOS · LK' + lid + '</b>\n👤 ' + esc(p.username) + ' → ID ' + esc(idF) + ' (' + esc(lf.nick || '') + ')\n📤 Enviados: ' + lf.enviados + ' de ' + lf.cantidad + (lf.estado === 'parcial' ? ' (devueltos ' + dinero(lf.devuelto) + ')' : '') + '\n💰 Cobrado: ' + dinero(Number(lf.total) - Number(lf.devuelto)));
      else if(lf && lf.estado === 'rechazada') telegram('↩️ <b>LIKES LK' + lid + ' · rechazado y reembolsado</b>\n👤 ' + esc(p.username) + ' → ID ' + esc(idF) + '\n❗ ' + esc(lf.detalle || ''));
      const se = sal != null ? sal : (await (async () => { const rp = await rest('profiles?id=eq.' + encodeURIComponent(uid) + '&select=saldo'); return Array.isArray(rp.json) && rp.json[0] ? Number(rp.json[0].saldo) : null; })());
      return enviar(res, { ok: true, resultado: pub, saldo: se });
    }

    // ═════════ LIKES 2K con CRÉDITOS (aparte del saldo; los agrega el admin tras el pago por WhatsApp) ═════════
    if(a === 'lc_mi' || a === 'lc_check' || a === 'lc_enviar' || a === 'lc_estado'){
      const PROV = ['lunexis', 'likesystem'], NOMP = { lunexis: 'Servidor 1', likesystem: 'Servidor 2' };
      const lcPub = e => e ? { id: e.id, codigo: 'LC' + e.id, ff_id: e.ff_id, cantidad: e.cantidad, enviados: e.enviados, devueltos: e.devueltos, estado: e.estado, prov: e.prov, servidor: NOMP[e.prov] || '', nick: e.nick || '', antes: e.antes, despues: e.despues, fecha: e.cerrada || e.creada, detalle: e.estado === 'verificar' ? 'En verificación con el equipo. Si no se envió, se te devuelven los créditos.' : (e.estado === 'rechazada' ? (e.detalle || '') : '') } : null;
      const lcAl = (r, prov, cuando) => { if(r && (r.alerta || r.sinCreditos)) AL.avisarFalla('lc_' + prov, '🔴 LIKES 2K (' + NOMP[prov] + '): ' + (r.alerta || 'proveedor sin créditos'), 'El proveedor ' + NOMP[prov] + ' ' + (r.alerta || 'no tiene créditos para enviar') + (cuando ? ' (' + cuando + ')' : '') + '. Revisa su llave en Vercel o recarga con el proveedor.', 30 * 60000).catch(() => {}); };
      const lcLeer = async id => { const r = await rest('likes_cred_envio?id=eq.' + Number(id) + '&user_id=eq.' + encodeURIComponent(uid) + '&limit=1'); return Array.isArray(r.json) && r.json[0] ? r.json[0] : null; };
      const lcCerrar = (id, enviados, estado, o) => rpc('lc_cerrar', { p_id: id, p_enviados: enviados, p_estado: estado || null, p_nick: (o && o.nick) || null, p_antes: (o && o.antes != null) ? o.antes : null, p_despues: (o && o.despues != null) ? o.despues : null, p_log: (o && o.log_id != null) ? o.log_id : null, p_recibo: (o && o.recibo) || null, p_detalle: (o && o.detalle) || null });
      const lcCreditos = async () => { const r = await rest('likes_cred?user_id=eq.' + encodeURIComponent(uid) + '&limit=1'); return { sin_tabla: r.status >= 400, n: Array.isArray(r.json) && r.json[0] ? Number(r.json[0].creditos) : 0 }; };
      const lcResolver = async (e, forzar) => {
        const P = LK.por(e.prov), bl = await P.buscarEnLog(e.ff_id, Date.parse(e.creada));
        if(bl.error) return lcCerrar(e.id, 0, 'verificar', { detalle: 'No se pudo confirmar con el proveedor' });
        if(bl.encontrado) return lcCerrar(e.id, bl.enviados, null, { nick: bl.nick, log_id: bl.log_id });
        if(forzar) return lcCerrar(e.id, 0, 'rechazada', { detalle: 'El proveedor no registró el envío' });
        return lcCerrar(e.id, 0, 'verificar', { detalle: 'El proveedor no confirmó el envío' });
      };
      if(a === 'lc_mi'){
        const [c, r] = await Promise.all([lcCreditos(), rest('likes_cred_envio?user_id=eq.' + encodeURIComponent(uid) + '&order=id.desc&limit=10')]);
        return enviar(res, { ok: true, creditos: c.n, sin_tabla: c.sin_tabla || r.status >= 400, items: (Array.isArray(r.json) ? r.json : []).map(lcPub), servidores: PROV.map(k => ({ k, nombre: NOMP[k], activo: LK.por(k).configurado() })) });
      }
      if(a === 'lc_estado'){
        if(limite('lce|' + uid, 30, 60000)) return enviar(res, { ok: false, code: 'limite', message: 'Espera un momento.' }, 429);
        let e = await lcLeer(b.id); if(!e) return enviar(res, { ok: false, code: 'no_existe', message: 'No encontramos ese envío.' }, 404);
        if(e.estado === 'verificar' || (e.estado === 'procesando' && Date.now() - Date.parse(e.creada) > 180000)){ await lcResolver(e, e.estado === 'procesando' && Date.now() - Date.parse(e.creada) > 180000); e = await lcLeer(b.id); }
        const c = await lcCreditos();
        return enviar(res, { ok: true, resultado: lcPub(e), creditos: c.n });
      }
      const prov = PROV.indexOf(String(b.prov)) >= 0 ? String(b.prov) : 'lunexis', P = LK.por(prov);
      const idF = String(b.ff_id || '').replace(/\D/g, '');
      if(!P.configurado()) return enviar(res, { ok: false, code: 'sin_configurar', message: NOMP[prov] + ' aún no está activado. Elige el otro servidor.' });
      if(a === 'lc_check'){
        if(limite('lcc|' + uid, 20, 60000)) return enviar(res, { ok: false, code: 'limite', message: 'Demasiadas consultas, espera un momento.' }, 429);
        const [j, cr, c] = await Promise.all([P.jugador(idF), P.creditos(), lcCreditos()]);
        lcAl(j, prov, 'consulta'); lcAl(cr, prov, 'consulta');
        if(!j.ok) return enviar(res, { ok: false, code: j.code, message: j.message }, j.code === 'NOT_FOUND' ? 404 : j.code === 'id' ? 400 : 503);
        const tope = cr.ok && cr.restantes != null ? Math.max(0, Math.min(2000, cr.restantes)) : 2000;
        return enviar(res, { ok: true, ff_id: idF, nick: j.nick, likes: j.likes, region: j.region, prov, servidor: NOMP[prov], max_prov: tope, disponible: cr.ok ? tope > 0 : false, motivo: cr.ok ? (tope > 0 ? null : 'Este servidor está sin cupo por ahora. Prueba con el otro.') : cr.message, creditos: c.n });
      }
      // ───────── lc_enviar ─────────
      if(p.banned) return enviar(res, { ok: false, code: 'suspendida', message: 'Tu cuenta está suspendida. Contacta a soporte.' });
      const cant = Number(b.cantidad), idem = String(b.idem || '');
      if(!P.idOk(idF)) return enviar(res, { ok: false, code: 'id', message: 'Revisa tu ID de Free Fire (solo números, de 5 a 15 dígitos).' });
      if(!P.intOk(cant)) return enviar(res, { ok: false, code: 'cantidad', message: 'La cantidad debe ser de 1 a 2,000 likes.' });
      if(!/^[A-Za-z0-9_-]{8,100}$/.test(idem)) return enviar(res, { ok: false, code: 'solicitud', message: 'Solicitud inválida. Recarga la página.' });
      const prev = await rest('likes_cred_envio?idem=eq.' + encodeURIComponent(idem) + '&user_id=eq.' + encodeURIComponent(uid) + '&limit=1');
      if(Array.isArray(prev.json) && prev.json[0]){ const c0 = await lcCreditos(); return enviar(res, { ok: true, repetida: true, resultado: lcPub(prev.json[0]), creditos: c0.n }); }
      if(limite('lc|' + uid, 20, 60000)) return enviar(res, { ok: false, code: 'limite', message: 'Espera un momento antes de otro envío.' }, 429);
      const c1 = await lcCreditos();
      if(c1.sin_tabla) return enviar(res, { ok: false, code: 'db', message: 'Falta ejecutar likes_creditos.sql en Supabase.' });
      if(c1.n < cant) return enviar(res, { ok: false, code: 'creditos', message: 'Te faltan créditos: tienes ' + c1.n + ' y pediste ' + cant + '.', creditos: c1.n });
      const [j, cr] = await Promise.all([P.jugador(idF), P.creditos()]);
      lcAl(j, prov, 'envío'); lcAl(cr, prov, 'envío');
      if(!j.ok) return enviar(res, { ok: false, code: j.code, message: j.message }, j.code === 'NOT_FOUND' ? 404 : 503);
      if(!cr.ok) return enviar(res, { ok: false, code: cr.code, message: cr.message }, 503);
      if(cr.restantes != null && cr.restantes < cant){ if(cr.restantes <= 0) lcAl({ sinCreditos: true }, prov, 'envío'); return enviar(res, { ok: false, code: 'sin_creditos', message: cr.restantes <= 0 ? NOMP[prov] + ' está sin cupo por ahora. Prueba con el otro servidor: no se descontó nada.' : NOMP[prov] + ' solo puede enviar hasta ' + cr.restantes + ' ahora. Baja la cantidad o usa el otro servidor. No se descontó nada.' }); }
      const pg = await rpc('lc_pagar', { p_user: uid, p_idem: idem, p_ff: idF, p_cant: cant, p_prov: prov });
      if(pg.status >= 400 || !pg.json || !pg.json.ok){
        const m = msgErr(pg);
        if(/creditos_insuficientes/.test(m)) return enviar(res, { ok: false, code: 'creditos', message: 'Te faltan créditos.', creditos: Number((m.match(/creditos_insuficientes:(\d+)/) || [])[1] || 0) });
        if(/cuenta_suspendida/.test(m)) return enviar(res, { ok: false, code: 'suspendida', message: 'Tu cuenta está suspendida. Contacta a soporte.' });
        if(/lc_pagar|does not exist|relation|schema cache|permission denied/.test(m)) return enviar(res, { ok: false, code: 'db', message: 'Falta ejecutar likes_creditos.sql en Supabase.' });
        return enviar(res, { ok: false, code: 'db', message: 'No se pudo procesar. No se descontaron créditos. Intenta de nuevo.' });
      }
      const eid = pg.json.id, ini = Date.now();
      if(pg.json.repetida){ const e0 = await lcLeer(eid); return enviar(res, { ok: true, repetida: true, resultado: lcPub(e0), creditos: Number(pg.json.creditos) }); }
      const rr = await P.enviar(idF, cant); let cierre;
      if(rr.ok) cierre = await lcCerrar(eid, rr.enviados, null, rr);
      else if(rr.definitivo){ lcAl(rr, prov, 'envío'); cierre = await lcCerrar(eid, 0, 'rechazada', { detalle: rr.detalle }); }
      else { await new Promise(r2 => setTimeout(r2, 3000)); const e1 = await lcLeer(eid); cierre = await lcResolver(Object.assign({}, e1, { creada: new Date(ini).toISOString() }), false); }
      const ef = await lcLeer(eid), cn = cierre && cierre.json && cierre.json.creditos != null ? Number(cierre.json.creditos) : (await lcCreditos()).n;
      if(ef && ef.estado === 'verificar') telegram('🚨 <b>LIKES 2K LC' + eid + ' · VERIFICAR a mano</b>\n👤 ' + esc(p.username) + ' → ID ' + esc(idF) + ' · ' + NOMP[prov] + ' · pidió ' + cant + '\n❗ ' + esc((rr && rr.detalle) || 'sin confirmar') + '\nNo se reembolsó: revisa el historial del proveedor. El cliente puede reabrirlo y se reintenta confirmar solo.');
      else if(ef && (ef.estado === 'completada' || ef.estado === 'parcial')) telegram('🔥 <b>LIKES 2K · LC' + eid + '</b> (' + NOMP[prov] + ')\n👤 ' + esc(p.username) + ' → ID ' + esc(idF) + ' (' + esc(ef.nick || '') + ')\n📤 Enviados: ' + ef.enviados + ' de ' + ef.cantidad + (ef.estado === 'parcial' ? ' (devueltos ' + ef.devueltos + ' créditos)' : '') + '\n🎟️ Créditos restantes del cliente: ' + cn);
      else if(ef && ef.estado === 'rechazada') telegram('↩️ <b>LIKES 2K LC' + eid + ' · rechazado y devuelto</b> (' + NOMP[prov] + ')\n👤 ' + esc(p.username) + ' → ID ' + esc(idF) + '\n❗ ' + esc(ef.detalle || ''));
      return enviar(res, { ok: true, resultado: lcPub(ef), creditos: cn });
    }

    if(a === 'catalogo'){
      const k = await leerCatalogo();
      return enviar(res, { ok: true, sin_bd: k.sin_bd, diag: k.diag || null, productos: k.productos.filter(x => x.grupo !== 'd50' && x.grupo !== 'craftland' && x.grupo !== 'likes'), saldo: Number(p.saldo) || 0 });
    }

    // ───────── API de revendedores: llaves del cliente ─────────
    if(a === 'api_llaves' || a === 'api_llave_crear' || a === 'api_llave_revocar'){
      if(p.banned) return enviar(res, { ok: false, code: 'suspendida', message: 'Tu cuenta está suspendida. Contacta a soporte.' });
      return AV1.llaves({ rest, enviar, limite, res }, a, b, uid);
    }

    // ───────── Craftland · Nick color: consulta el ID antes de comprar ─────────
    if(a === 'cl_check'){
      if(limite('cl|' + uid, 20, 60000)) return enviar(res, { ok: false, code: 'limite', message: 'Demasiadas consultas, espera un momento.' }, 429);
      const id = String(b.ff_id || '').replace(/\D/g, '');
      const k = await leerCatalogo(); const prod = (k.productos || []).find(x => x.clave === 'cl_nick');
      if(!prod) return enviar(res, { ok: false, code: 'sin_catalogo', message: 'Este servicio aún no está activado. Falta ejecutar craftland.sql en Supabase.' });
      const [j, dsp] = await Promise.all([CRAFT.jugador(id), CRAFT.disponible()]);
      if(j.alerta) AL.avisarFalla('craft', '🔴 CRAFTLAND: ' + j.alerta, 'Revisa CRAFT_API_KEY en Vercel.', 30 * 60000).catch(() => {});
      if(!j.ok) return enviar(res, { ok: false, code: j.code, message: j.message }, j.code === 'NOT_FOUND' ? 404 : j.code === 'id' ? 400 : 503);
      return enviar(res, { ok: true, ff_id: id, nick: j.nick, seguidores: j.seguidores, disponible: !!dsp.ok, motivo: dsp.ok ? null : dsp.message, precio: Number(prod.precio), nombre: prod.nombre, saldo: Number(p.saldo) || 0 });
    }

    // ───────── diamantes al 50%: qué paquetes le quedan a un ID ─────────
    if(a === 'd50_check'){
      if(limite('d5|' + uid, 15, 60000)) return enviar(res, { ok: false, code: 'limite', message: 'Demasiadas consultas, espera un momento.' }, 429);
      const id = String(b.ff_id || '').replace(/\D/g, '');
      if(!/^\d{5,15}$/.test(id)) return enviar(res, { ok: false, code: 'id', message: 'Escribe un ID de Free Fire válido.' }, 400);
      const k = await leerCatalogo();
      const prods = {}; (k.productos || []).forEach(x => { if(x.grupo === 'd50') prods[x.clave] = x; });
      if(!Object.keys(prods).length) return enviar(res, { ok: false, code: 'sin_catalogo', message: 'Este servicio aún no está activado. Falta ejecutar d50.sql en Supabase.' });
      const r = await checkD50(id);
      if(!r.ok) return enviar(res, { ok: false, code: r.code, message: r.message }, r.code === 'NOT_FOUND' ? 404 : r.code === 'BAD_ID' ? 400 : 503);
      const pedidos = await d50Pedidos(id);
      const packs = D50_PACKS.map(n => { const it = prods['d50_' + n];
        return { clave: 'd50_' + n, diamantes: n, precio: it ? Number(it.precio) : null, activo: !!it, disponible: !!it && !!r.eligible[n] && !pedidos[n], ya_pedido: pedidos[n] || null, usado: !r.eligible[n] }; });
      return enviar(res, { ok: true, ff_id: id, nick: r.nick, region: r.region, packs, saldo: Number(p.saldo) || 0 });
    }

    // ───────── pagar ─────────
    if(a === 'pagar'){
      if(p.banned) return enviar(res, { ok: false, code: 'suspendida', message: 'Tu cuenta está suspendida. Contacta a soporte.' });
      const items = Array.isArray(b.items) ? b.items : [];
      if(!items.length || items.length > 100) return enviar(res, { ok: false, code: 'solicitud', message: 'Tu pedido está vacío.' });
      const lim = items.map(x => ({ clave: String((x && x.clave) || '').slice(0, 40), ff_id: String((x && x.ff_id) || '').replace(/\s+/g, '') }));
      const idem = String(b.idem || '');
      if(!/^[A-Za-z0-9_-]{8,100}$/.test(idem)) return enviar(res, { ok: false, code: 'solicitud', message: 'Solicitud inválida. Recarga la página.' });
      // Diamantes al 50%: se compran solos, de a un paquete, y solo si la cuenta aún tiene ese descuento (consulta nueva a Volsever)
      const d50 = lim.filter(x => /^d50_\d+$/.test(x.clave));
      if(d50.length){
        if(d50.length !== lim.length || d50.length !== 1) return enviar(res, { ok: false, code: 'solicitud', message: 'Los diamantes al 50% se piden de uno en uno, sin otros productos.' });
        const x = d50[0], n = Number(x.clave.slice(4));
        if(!/^\d{5,15}$/.test(x.ff_id)) return enviar(res, { ok: false, code: 'id', message: 'Revisa tu ID de Free Fire (solo números, de 5 a 15 dígitos).' });
        const rep = await rest('ordenes_saldo?idem=eq.' + encodeURIComponent(idem) + '&select=id&limit=1');
        if(!(Array.isArray(rep.json) && rep.json.length)){   // si es el reintento de un pedido ya hecho, no se vuelve a validar
          if(limite('d5b|' + uid, 3, 60000)) return enviar(res, { ok: false, code: 'limite', message: 'Espera un momento antes de otro pedido al 50%.' }, 429);
          const ya = await d50Pedidos(x.ff_id);
          if(ya[n]) return enviar(res, { ok: false, code: 'd50_ya', message: 'Ya hay un pedido de ' + n.toLocaleString('en-US') + ' diamantes al 50% para ese ID. Cada paquete se usa una sola vez por cuenta.' }, 409);
          const chk = await checkD50(x.ff_id, true);
          if(!chk.ok) return enviar(res, { ok: false, code: chk.code, message: chk.message }, chk.code === 'NOT_FOUND' ? 404 : 503);
          if(!chk.eligible[n]) return enviar(res, { ok: false, code: 'd50_usado', message: 'Esa cuenta ya usó el descuento del paquete de ' + n.toLocaleString('en-US') + ' diamantes. Elige otro paquete.' }, 409);
        }
      }
      // Nick color (Craftland): se compra solo, de a uno, y solo si el proveedor tiene stock (así no se cobra algo que no se puede entregar)
      const cl = lim.filter(x => /^cl_/.test(x.clave));
      if(cl.length){
        if(cl.length !== lim.length || cl.length !== 1) return enviar(res, { ok: false, code: 'solicitud', message: 'El Nick color se pide de uno en uno, sin otros productos.' });
        if(!CRAFT.idOk(cl[0].ff_id)) return enviar(res, { ok: false, code: 'id', message: 'Revisa tu ID de Craftland (solo números, de 5 a 15 dígitos).' });
        const rep = await rest('ordenes_saldo?idem=eq.' + encodeURIComponent(idem) + '&select=id&limit=1');
        if(!(Array.isArray(rep.json) && rep.json.length)){   // un reintento de un pedido ya hecho no se vuelve a validar
          if(limite('clp|' + uid, 20, 60000)) return enviar(res, { ok: false, code: 'limite', message: 'Espera un momento antes de otro pedido.' }, 429);
          const dsp = await CRAFT.disponible();
          if(dsp.alerta) AL.avisarFalla('craft', '🔴 CRAFTLAND: ' + dsp.alerta, 'Revisa CRAFT_API_KEY en Vercel.', 30 * 60000).catch(() => {});
          if(!dsp.ok) return enviar(res, { ok: false, code: dsp.code, message: dsp.message }, 503);
        }
      }
      // Pase Booyah automático (Lojaff): mensaje personalizado + stock según la billetera del proveedor (así no se cobra algo que no se puede enviar)
      {
        const kc = await leerCatalogo().catch(() => ({ productos: [] })), esPase = x => { const c = (kc.productos || []).find(y => y.clave === x.clave); return !!c && c.grupo === 'pase' && c.entrega === 'auto'; };
        const ps = lim.filter(esPase);
        if(ps.length){
          const msj = LJ.limpiarMensaje(b.mensaje);
          lim.forEach(x => { if(esPase(x)) x.mensaje = msj; });
          const rep = await rest('ordenes_saldo?idem=eq.' + encodeURIComponent(idem) + '&select=id&limit=1');
          if(!(Array.isArray(rep.json) && rep.json.length)){   // un reintento de un pedido ya hecho no se vuelve a validar
            const sd = await LJ.saldo();
            if(!sd.ok) return enviar(res, { ok: false, code: 'proveedor', message: sd.code === 'sin_configurar' ? 'El envío automático del pase aún no está activado.' : 'No pudimos comprobar el stock de pases. Intenta en unos minutos: no se te cobró.' }, 503);
            if(sd.unidades != null && sd.unidades < ps.length) return enviar(res, { ok: false, code: 'sin_stock', message: sd.unidades < 1 ? 'Los pases están agotados por ahora. Intenta más tarde: no se te cobró.' : 'Solo hay ' + sd.unidades + ' pases disponibles ahora. Baja la cantidad: no se te cobró.' }, 409);
          }
        }
      }
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
        const rfx = /^rbx/.test(String(item.srv || '')) ? await refRbx(item.id) : '';
        const ped = await (async () => { const ri = await rest('ordenes_saldo_items?id=eq.' + item.id + '&select=pedido_id'); return Array.isArray(ri.json) && ri.json[0] ? ri.json[0].pedido_id : null; })();
        const llave = 'cs-os' + oid + '-' + item.id;
        // Craftland no tiene llave de idempotencia: si un intento anterior se cortó, NO se vuelve a pedir (podría duplicarse): se manda a verificar a mano
        let intentosCl = 1; if(/^(cl|lj)_/.test(String(item.srv || ''))){ const ri2 = await rest('ordenes_saldo_items?id=eq.' + item.id + '&select=intentos'); intentosCl = Number(Array.isArray(ri2.json) && ri2.json[0] ? ri2.json[0].intentos : 1) || 1; }
        const pr = intentosCl > 1 ? { success: false, code: 'PROVIDER_ERROR', error: 'Un intento anterior se cortó: revisa en el panel del proveedor (' + (/^lj_/.test(String(item.srv || '')) ? 'Lojaff' : 'Craftland') + ') si el pedido del ID ' + item.ff_id + ' ya existe antes de repetirlo (reembolsa si no existe)' }
          : await llamarProveedor({ action: 'comprar', producto: item.srv, player_id: item.ff_id, client_name: p.username, idempotency_key: llave, mensaje: /^lj_/.test(String(item.srv || '')) ? await (async () => { try{ const rm = await rest('ordenes_saldo_items?id=eq.' + item.id + '&select=mensaje'); return Array.isArray(rm.json) && rm.json[0] ? rm.json[0].mensaje || '' : ''; }catch(e){ return ''; } })() : undefined }, req);
        if(/^lj_/.test(String(item.srv || ''))){   // avisos del proveedor del Pase: llave mala, billetera vacía o saldo bajo
          if(pr && (pr.http === 401 || pr.http === 402)){ global.__ljAv = global.__ljAv || {}; if(!global.__ljAv[pr.http] || Date.now() - global.__ljAv[pr.http] > 600000){ global.__ljAv[pr.http] = Date.now(); telegram('🚨 <b>LOJAFF · ' + (pr.http === 401 ? 'llave API inválida' : 'SIN SALDO en la billetera') + '</b>\nLos pases se están reembolsando a los clientes. ' + (pr.http === 402 ? 'Recarga tu billetera en lojaff.com.' : 'Revisa LOJAFF_API_KEY en Vercel.') + '\n❗ ' + esc(pr.error || '')); } }
          else if(pr && pr.success && pr.saldo_restante != null && pr.saldo_restante < Math.max(20, (Number(pr.debitado) || 0) * 6) && (!global.__ljBajo || Date.now() - global.__ljBajo > 6 * 3600000)){ global.__ljBajo = Date.now(); telegram('⚠️ <b>LOJAFF · saldo bajo</b>\nTe quedan ' + pr.saldo_restante + ' en tu billetera de lojaff.com. Recarga antes de que se acabe.'); }
        }
        let est, err = null, ref = null;
        if(pr && pr.success && pr.status === 'COMPLETED'){ est = 'completada'; ref = { order_id: pr.order_id || null, reference: pr.reference || null, via: pr.via || null };
          if(/^rbx/.test(String(item.srv || ''))){
            if(Array.isArray(pr.codigos) && pr.codigos.length) ref.codigos = pr.codigos;
            else { est = 'verificar'; err = 'El proveedor entregó el Robux pero no se pudo leer el código: revísalo en Central One (' + (pr.reference || '') + ') y envíaselo al cliente'; ref.forma = pr.forma || null; }
          }
        }
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
          if(est === 'verificar' && ref && ref.forma) telegram('🔎 <b>OS' + oid + ' · formato que mandó Central One (sin códigos)</b>\n<code>' + esc(String(ref.forma).slice(0, 2600)) + '</code>\nPásaselo a tu desarrollador para que el código se lea solo.');
          if(est === 'verificar') telegram('🚨 <b>OS' + oid + ' · VERIFICAR a mano</b>\n👤 ' + esc(p.username) + '\n🎁 ' + esc(item.nombre) + (rfx ? ' · <b>' + rfx + '</b>' : ' → ID ' + esc(item.ff_id)) + '\n❗ ' + esc(err) + '\n🔑 ' + llave + '\nNo se reembolsó: revisa con el proveedor y resuélvelo en el panel (Órdenes con saldo).');
          if(est === 'enviada' || est === 'completada') telegram('⚡ <b>OS' + oid + ' · entrega automática ' + (est === 'completada' ? '✅ completada' : '⏳ en proceso') + '</b>\n👤 ' + esc(p.username) + '\n🎁 ' + esc(item.nombre) + ' → ID ' + esc(item.ff_id) + (ref && ref.via ? '\n📡 ' + esc(ref.via) : '') + gananciaTxt(item.precio, pr && pr.costo_usd));
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
      const ri = await rest('ordenes_saldo_items?orden_id=eq.' + oid + '&estado=in.(enviada,verificar)&select=id,estado,grupo,proveedor,pedido_id,nombre,ff_id'); const its = Array.isArray(ri.json) ? ri.json : [];
      let consultadas = 0, cambios = 0;
      for(const i of its){
        let oidp = i.proveedor && i.proveedor.order_id;
        if(!oidp && i.estado === 'verificar' && i.grupo !== 'craftland'){
          // Unidad "en verificación" (se cortó la espera): se busca el pedido en el proveedor por su clave
          const bu = await llamarProveedor({ action: 'buscar', client_name: p.username, idempotency_key: 'cs-os' + oid + '-' + i.id, regalo: true, robux: i.grupo === 'robux' }, req); consultadas++;
          if(bu && bu.success && bu.status === 'COMPLETED' && i.grupo === 'robux' && !(Array.isArray(bu.codigos) && bu.codigos.length)){ continue; }
          if(bu && bu.success && bu.status === 'COMPLETED'){ await rpc('checkout_item_resultado', { p_item: i.id, p_estado: 'completada', p_ref: { order_id: bu.order_id || null, reference: bu.reference || null, via: bu.via || null, codigos: (bu.codigos && bu.codigos.length) ? bu.codigos : undefined }, p_error: null }); await pedidoEstado(i.pedido_id, 'completado'); cambios++; }
          else if(bu && bu.success && bu.status === 'PENDING'){ await rpc('checkout_item_resultado', { p_item: i.id, p_estado: 'enviada', p_ref: { order_id: bu.order_id || null, reference: bu.reference || null, via: bu.via || null }, p_error: null }); cambios++; }
          continue;   // si no se encuentra o figura fallido, se queda en verificación para revisarlo a mano (no se reembolsa solo)
        }
        if(!oidp) continue; consultadas++;
        const pr = await llamarProveedor({ action: 'estado', order_id: oidp, robux: i.grupo === 'robux', craftland: i.grupo === 'craftland' }, req);
        if(pr && pr.success && pr.status === 'COMPLETED'){
          if(i.grupo === 'robux' && !(Array.isArray(pr.codigos) && pr.codigos.length)) continue;   // sin código leído no se marca entregada: se queda para revisar
          await rpc('checkout_item_resultado', { p_item: i.id, p_estado: 'completada', p_ref: (i.grupo === 'robux' ? Object.assign({}, i.proveedor || {}, { codigos: pr.codigos }) : null), p_error: null }); await pedidoEstado(i.pedido_id, 'completado'); cambios++; }
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

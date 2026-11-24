// ═══════════════════════════════════════════════════════════════════════════
// api/recarga.js · Recargas AUTOMÁTICAS con Central One (para tus clientes): diamantes, tarjetas y paquetes de nivel
//
// Habla el mismo "idioma" que tu antiguo rapid-handler (acciones validar y comprar), así tu tienda
// sigue funcionando igual. La llave del proveedor vive SOLO aquí (variable CO_API_KEY de Vercel).
//
// ⚠ Este endpoint lo puede llamar cualquiera que conozca la dirección (igual que rapid-handler), así
// que lleva FUSIBLES que limitan lo máximo que se puede perder si alguien lo abusa:
//   · tope de gasto por día en US$ (CO_LIMITE_DIA_USD, por defecto 40), leído del propio proveedor. Pon 0 = sin tope
//   · tope de recargas por usuario por hora (CO_LIMITE_USUARIO_HORA, por defecto 8). Pon 0 = sin tope
//   · solo los 6 paquetes de diamantes, y solo si el precio del proveedor es el esperado
//   · interruptor de emergencia: CO_AUTO_ACTIVO=0 apaga todo al instante
//   · versión: solo compran las páginas actuales (mandan su huella X-CS-Build); una página vieja es rechazada y se le devuelve el saldo.
//     CO_EXIGIR_VERSION=0 desactiva esta revisión.
//
// Variables de entorno en Vercel:
//   CO_API_KEY             (la misma de api/co.js)
//   CO_LIMITE_DIA_USD      tope diario de gasto en US$ (por defecto 40)
//   CO_LIMITE_USUARIO_HORA recargas por usuario por hora (por defecto 8)
//   CO_AUTO_ACTIVO         pon 0 para apagar las recargas automáticas
//   CO_SALDO_MINIMO_USD    protección de saldo: si el proveedor baja a este saldo (por defecto US$ 5) se pausan las compras y te avisa por Telegram (ver api/_alerta.js)
//   SUPABASE_URL y SUPABASE_ANON_KEY   (recomendado) comprueba que el usuario exista y no esté baneado
//   (opcionales) CO_MAP, CO_TOLERANCIA, CO_REGION_REGEX, CO_BASE → igual que en api/co.js
// ═══════════════════════════════════════════════════════════════════════════
'use strict';

const A = require('./_alerta.js');
const BASE = (process.env.CO_BASE || 'https://portal.centraloneglobal.com/api/v1').replace(/\/+$/, '');
const TOL = Number(process.env.CO_TOLERANCIA || 0.35);
const LIM_DIA = Number(process.env.CO_LIMITE_DIA_USD || 40);
const LIM_USER_H = Number(process.env.CO_LIMITE_USUARIO_HORA || 8);
const ESPERA_MS = Number(process.env.CO_ESPERA_MS || 7000);   // cuánto esperar a que el pedido termine antes de decir "en proceso"
const POLL_MS = Number(process.env.CO_POLL_MS || 1500);

const PAQUETES = {
  110:  { base: 100,  ref: 0.6550 },
  341:  { base: 310,  ref: 1.9649 },
  572:  { base: 520,  ref: 3.3222 },
  1166: { base: 1060, ref: 6.1709 },
  2398: { base: 2180, ref: 12.2471 },
  6160: { base: 5600, ref: 31.1701 }
};
// package_id de tu tienda (RECARGAS_AUTO) → total de diamantes
const PKG = { 351: 110, 348: 341, 350: 572, 347: 1166, 346: 2398, 349: 6160 };
const EXCLUIR = /pase|pass|tarjeta|card|semanal|mensual|weekly|monthly|membres|member|nivel|level|upgrade|subida/i;

function enviar(res, body){
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}
const dormir = ms => new Promise(r => setTimeout(r, ms));

// ── Límites por IP (en memoria; frenan abuso ligero) ──
const hits = new Map();
function ipDe(req){ return String((req.headers['x-forwarded-for'] || (req.socket && req.socket.remoteAddress) || 'x')).split(',')[0].trim(); }
function limite(ip, clave, max){ const k = clave + ip, t = Date.now(), l = (hits.get(k) || []).filter(x => t - x < 60000); l.push(t); hits.set(k, l); return l.length > max; }

async function co(path, opts){
  opts = opts || {};
  const ctrl = new AbortController(), t = setTimeout(() => ctrl.abort(), 9000);
  try{
    const r = await fetch(BASE + path, {
      method: opts.method || 'GET',
      headers: Object.assign({ Authorization: 'Bearer ' + process.env.CO_API_KEY, Accept: 'application/json' }, opts.body ? { 'Content-Type': 'application/json' } : {}, opts.headers || {}),
      body: opts.body ? JSON.stringify(opts.body) : undefined, signal: ctrl.signal
    });
    let j = null; try{ j = await r.json(); }catch(e){}
    return { status: r.status, json: j, retry: r.headers.get('retry-after') };
  } finally { clearTimeout(t); }
}

// ── Catálogo y reconocimiento de producto (igual que api/co.js) ──
let cache = { t: 0, items: null };

// ── Avisos a Telegram: proveedor caído/lento y stock agotado (con memoria, no repiten en cada visita) ──
const NOMBRE_REGALO = { cj1: 'Caja x1', cj5: 'Caja x5', cj10: 'Caja x10', cj50: 'Caja x50', fa10: 'Fragmentos arma x10', fa50: 'Fragmentos arma x50', fa100: 'Fragmentos arma x100', fa500: 'Fragmentos arma x500' };
async function vigilarProveedor(c, ms){
  try{
    if(!c.ok){ await A.avisarFalla('proveedor', '🔴 EL PROVEEDOR NO RESPONDE (Central One)', 'La tienda no pudo leer el catálogo (' + (c.code || 'error') + '). Las recargas automáticas y los regalos no se pueden entregar hasta que vuelva.', 30 * 60000); return; }
    if(ms > 4000){ await A.avisarFalla('proveedor', '🟠 EL PROVEEDOR ESTÁ LENTO (Central One)', 'Tardó ' + (ms / 1000).toFixed(1) + ' s en responder el catálogo. Puede haber demoras o fallas en las entregas.', 60 * 60000); return; }
    await A.avisarVolvio('proveedor', '✅ EL PROVEEDOR VOLVIÓ A RESPONDER', 'El catálogo de Central One responde normal (' + ms + ' ms).');
    const st = stockRegalos(c.items), mal = Object.keys(st).filter(k => st[k] !== 'ok');
    if(mal.length) await A.avisarFalla('stock', '📦 STOCK BAJO O AGOTADO EN EL PROVEEDOR', mal.map(k => '• ' + (NOMBRE_REGALO[k] || k) + ': ' + (st[k] === 'sin_stock' ? 'SIN STOCK' : 'no aparece en el catálogo')).join('\n') + '\n\nEstos productos no se pueden vender por ahora. Reponlos en Central One.', 6 * 3600000);
    else await A.avisarVolvio('stock', '✅ STOCK REPUESTO', 'Todos los regalos (cajas y fragmentos) tienen stock otra vez.');
  }catch(e){}
}

async function catalogo(){
  if(cache.items && Date.now() - cache.t < 60000) return { ok: true, items: cache.items };
  const r = await co('/catalog');
  if(r.status !== 200 || !r.json || !Array.isArray(r.json.items)) return { ok: false, http: r.status, code: (r.json && r.json.error && r.json.error.code) || ('http_' + r.status) };
  cache = { t: Date.now(), items: r.json.items }; return { ok: true, items: cache.items };
}
function norm(txt){ return String(txt || '').replace(/(\d)[.,](?=\d{3}(?!\d))/g, '$1'); }
function tieneNum(txt, n){ return new RegExp('(?<![0-9])' + n + '(?![0-9])').test(norm(txt)); }
function esFFLatam(it){
  if(!/free\s*fire/i.test((it.product_family_name || '') + ' ' + (it.name || ''))) return false;
  const rx = process.env.CO_REGION_REGEX ? new RegExp(process.env.CO_REGION_REGEX, 'i') : /lat|latam|latin/i;
  return rx.test((it.region || '') + ' ' + (it.market || '') + ' ' + (it.name || ''));
}
function detectar(items, d){
  let fijo = {}; try{ fijo = JSON.parse(process.env.CO_MAP || '{}'); }catch(e){}
  const p = PAQUETES[d]; let item = null;
  if(fijo[d]) item = items.find(x => x.product_id === fijo[d]) || null;
  else {
    const cand = items.filter(it => esFFLatam(it) && !EXCLUIR.test((it.name || '') + ' ' + (it.sku || '')) && it.requires_target !== false);
    const ac = cand.filter(it => { const t = (it.name || '') + ' ' + (it.sku || ''); return tieneNum(t, d) || (tieneNum(t, p.base) && /bono|bonus|%/i.test(t)); });
    ac.sort((a, b) => Math.abs(parseFloat(a.reseller_price) - p.ref) - Math.abs(parseFloat(b.reseller_price) - p.ref));
    item = ac[0] || null;
  }
  if(!item) return { error: 'No se encontró el paquete en el catálogo del proveedor' };
  const precio = parseFloat(item.reseller_price);
  if(!(precio > 0) || Math.abs(precio - p.ref) / p.ref > TOL) return { error: 'El precio del proveedor está fuera de lo esperado' };
  if(item.in_stock === false) return { error: 'Paquete sin stock en el proveedor' };
  return { item, precio };
}
function armarTarget(it, playerId){
  const campos = Array.isArray(it.target_fields) ? it.target_fields : [], esq = Array.isArray(it.target_schema) ? it.target_schema : [];
  const payload = {}; let faltan = false;
  campos.forEach(key => {
    const s = esq.find(x => x.key === key) || {};
    if(/^(player_?id|uid|id)$/i.test(key)) payload[key] = String(playerId);
    else if(s.type === 'select' && Array.isArray(s.options) && s.options.length === 1) payload[key] = s.options[0].value;
    else { faltan = true; (armarTarget.falta = armarTarget.falta || []).push(key); }
  });
  return faltan ? null : payload;
}

// ── "Otras cosas": tarjetas y paquetes de nivel de Free Fire (se piden con "producto": clave) ──
// "usd" es el precio de VENTA en dólares (el de tu lista); solo sirve para proteger el margen: si el proveedor cobra más que eso, ese producto se bloquea.
const EXTRA = {
  tsb: { titulo: 'Tarjeta Semanal Básica', usd: 0.3605, tipo: 'semanal_basica' },
  ts:  { titulo: 'Tarjeta Semanal',        usd: 1.5450, tipo: 'semanal' },
  pb:  { titulo: 'Pase Booyah',            usd: 1.1865, tipo: 'booyah' },
  tm:  { titulo: 'Tarjeta Mensual',        usd: 7.2100, tipo: 'mensual' },
  n6:  { titulo: 'Paquete de mejora de nivel - Nivel 6',  usd: 0.2719, nivel: 6 },
  n10: { titulo: 'Paquete de subida de nivel - Nivel 10', usd: 0.4317, nivel: 10 },
  n15: { titulo: 'Paquete de subida de nivel - Nivel 15', usd: 0.4317, nivel: 15 },
  n20: { titulo: 'Paquete de subida de nivel - Nivel 20', usd: 0.4317, nivel: 20 },
  n25: { titulo: 'Paquete de subida de nivel - Nivel 25', usd: 0.4317, nivel: 25 },
  n30: { titulo: 'Paquete de subida de nivel - Nivel 30', usd: 0.5864, nivel: 30 }
};
const TC = Number(process.env.CO_TC || 19.5);
const PROTEGER_MARGEN = !/^(0|false|off|no)$/i.test(String(process.env.CO_PROTEGER_MARGEN || '1'));
const sinAcentos = t => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const BOOYAH = /b(?:oo|o)y(?:aa|a)h/;   // booyah, boyaah, boyah, booyaah
function coincideExtra(p, it){
  const t = sinAcentos((it.name || '') + ' ' + (it.sku || '')), booyah = BOOYAH.test(t);
  if(p.tipo){
    const basica = /(basic|lite|light)/.test(t);
    if(p.tipo === 'booyah') return booyah && /(pase|pass)/.test(t);
    if(p.tipo === 'semanal_basica') return /(semanal|weekly)/.test(t) && basica && !booyah;
    if(p.tipo === 'semanal') return /(semanal|weekly)/.test(t) && !basica && !booyah;
    if(p.tipo === 'mensual') return /(mensual|monthly)/.test(t) && !booyah;
  }
  return new RegExp('(nivel|level|lvl|lv)\\.?\\s*' + p.nivel + '(?![0-9])').test(t) && !/(semanal|weekly|mensual|monthly|diamante|diamond)/.test(t) && !booyah;
}
// Igual que detectar(): devuelve { item, precio } o { error }. Si hay más de un candidato NO elige (salvo que lo fijes con CO_MAP).
function elegirExtra(items, clave){
  const p = EXTRA[clave]; let fijo = {}; try{ fijo = JSON.parse(process.env.CO_MAP || '{}'); }catch(e){}
  let item = null;
  if(fijo[clave]) item = items.find(x => x.product_id === fijo[clave]) || null;
  else {
    const cand = items.filter(it => esFFLatam(it) && coincideExtra(p, it));
    if(cand.length > 1) return { error: 'Hay varios productos que coinciden: fija el correcto con CO_MAP' };
    item = cand[0] || null;
  }
  if(!item) return { error: 'No se encontró el producto en el catálogo del proveedor' };
  const precio = parseFloat(item.reseller_price);
  if(!(precio > 0)) return { error: 'Precio del proveedor inválido' };
  if(PROTEGER_MARGEN && p.usd < precio) return { error: 'Producto no disponible por ahora' };   // el proveedor cobra más de lo que vendes
  if(item.in_stock === false) return { error: 'Producto sin stock en el proveedor' };
  return { item, precio };
}


// ── Regalos vía correo: solo CONSULTA de stock (la tienda lo usa para mostrar "Sin stock" y no cobrar lo que no se puede entregar) ──
const REGALOS = { cj1:['caja',1,2.95], cj5:['caja',5,14.50], cj10:['caja',10,29.30], cj50:['caja',50,145.70], fa10:['arma',10,6.40], fa50:['arma',50,31.70], fa100:['arma',100,62.80], fa500:['arma',500,297.40] };   // [tipo, cantidad, precio de venta MXN]
function buscarRegalo(items, k){
  let fijo = {}; try{ fijo = JSON.parse(process.env.CO_MAP || '{}'); }catch(e){}
  const tipo = REGALOS[k][0], n = REGALOS[k][1];
  if(fijo[k]) return items.find(x => x.product_id === fijo[k]) || null;
  const ac = items.filter(x => { const t = sinAcentos((x.name || '') + ' ' + (x.sku || '')).replace(/(\d)[.,](?=\d{3}(?!\d))/g, '$1');
    const lat = /lat|latam|latin/i.test((x.region || '') + ' ' + (x.name || ''));
    const ty = tipo === 'caja' ? /(caja|box|crate)/.test(t) && /fragment/.test(t) && !/arma|weapon/.test(t) : /fragment/.test(t) && /(arma|weapon)/.test(t);
    const tn = sinAcentos(x.name || '').replace(/(\d)[.,](?=\d{3}(?!\d))/g, '$1'); return lat && ty && tieneNum(tn, n) && !tieneNum(tn, n * 10); });
  return ac.length === 1 ? ac[0] : null;
}
function stockRegalos(items){
  const out = {};
  Object.keys(REGALOS).forEach(k => { const it = buscarRegalo(items, k); out[k] = !it ? 'no_disponible' : (it.in_stock === false ? 'sin_stock' : 'ok'); });
  return out;
}
// ── Robux PIN (solo GLOBAL): código que se entrega al cliente al pagar con saldo. [robux, precio de venta MXN] ──
const ROBUX = { rbx800:[800, 185], rbx1000:[1000, 215], rbx2000:[2000, 440], rbx2500:[2500, 495], rbx4500:[4500, 945], rbx10000:[10000, 2009] };
function buscarRobux(items, k){
  let fijo = {}; try{ fijo = JSON.parse(process.env.CO_MAP || '{}'); }catch(e){}
  if(fijo[k]) return items.find(x => x.product_id === fijo[k]) || null;
  const n = ROBUX[k][0];
  const ac = items.filter(x => { const t = sinAcentos((x.name || '') + ' ' + (x.sku || '') + ' ' + (x.product_family_name || '')).replace(/(\d)[.,](?=\d{3}(?!\d))/g, '$1');
    const reg = String(x.region || '');
    if(!/robux|roblox/.test(t) || !/global/i.test(reg)) return false;        // SOLO región GLOBAL (nunca RU ni US)
    if(/\(ru\)|\bru\b|russia|rusia/i.test(t + ' ' + reg)) return false;
    return tieneNum(t, n) && !tieneNum(t, n * 10) && x.requires_target !== true; });
  return ac.length === 1 ? ac[0] : null;
}
function stockRobux(items){ const out = {}; Object.keys(ROBUX).forEach(k => { const it = buscarRobux(items, k); out[k] = !it ? 'no_disponible' : (it.in_stock === false ? 'sin_stock' : 'ok'); }); return out; }
function elegirRobux(items, k){
  const it = buscarRobux(items, k); if(!it) return { error: 'No se encontró el producto en el catálogo del proveedor' };
  const precio = parseFloat(it.reseller_price); if(!(precio > 0)) return { error: 'Precio del proveedor inválido' };
  if(PROTEGER_MARGEN && precio * TC > ROBUX[k][1]) return { error: 'Producto no disponible por ahora' };
  if(it.in_stock === false) return { error: 'Producto sin stock en el proveedor' };
  return { item: it, precio };
}
// Lee el/los código(s) PIN de la orden del proveedor. Busca en los campos habituales (code, pin, serial, redeem…) de cada línea; nunca toma IDs ni referencias.
const RX_CODIGO = /^(code|codes|pin|pins|serial|serials|redeem_?code|redemption_?code|voucher|vouchers|gift_?card_?code|card_?code|claim_?code|activation_?code|license|license_?key|key|keys|secret|value|values|delivered_?codes|delivery_?codes)$/i;
const RX_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function extraerCodigos(o){
  const out = [], ya = new Set();
  const ok = v => { if(typeof v !== 'string') return false; const t = v.trim(); return t.length >= 6 && t.length <= 200 && !/\s{2,}/.test(t) && !RX_UUID.test(t) && !/^https?:/i.test(t) && !/^CO-ORD-/i.test(t) && t !== (o && o.reference_code); };
  const add = v => { const t = String(v).trim(); if(ok(t) && !ya.has(t)){ ya.add(t); out.push(t); } };
  const rec = (v, dentro, d) => {
    if(d > 6 || v == null) return;
    if(typeof v === 'string'){ if(dentro) add(v); return; }
    if(Array.isArray(v)){ v.forEach(x => rec(x, dentro, d + 1)); return; }
    if(typeof v === 'object') Object.keys(v).forEach(k => {
      if(/^(id|order_id|reference_code|product_id|catalog_item_id|status|name|sku|currency|created_at|updated_at|note|message|reason)$/i.test(k)) return;
      rec(v[k], dentro || RX_CODIGO.test(k), d + 1); });
  };
  (o && o.items || []).forEach(i => rec(i, false, 0));
  return out;
}
// Resumen corto de lo que manda el proveedor en las líneas (SIN los códigos) para que el admin vea los nombres de campo si algo no se pudo leer
function formaEntrega(o){
  const m = (v, d) => (v == null || d > 3) ? v : Array.isArray(v) ? v.slice(0, 3).map(x => m(x, d + 1)) : typeof v === 'object' ? Object.fromEntries(Object.keys(v).slice(0, 25).map(k => [k, m(v[k], d + 1)])) : (typeof v === 'string' ? (v.length > 6 && RX_UUID.test(v) ? 'uuid' : (v.length > 24 ? v.slice(0, 4) + '…(' + v.length + ')' : (/^[A-Za-z0-9_-]{8,}$/.test(v) && !/^(completed|delivered|pending|failed|refunded|cancelled)$/i.test(v) ? v.slice(0, 2) + '…(' + v.length + ')' : v))) : v);
  try{ return JSON.stringify(m(o.items || [], 0)).slice(0, 1200); }catch(e){ return ''; }
}
// Si la orden es de Robux y ya se entregó: agrega el código leído (o, si no se pudo leer, la forma de lo que mandó el proveedor para el admin)
function conCodigos(r, o, esRobux){
  if(!esRobux || !r || !r.success || r.status !== 'COMPLETED') return r;
  const c = extraerCodigos(o); r.codigos = c; if(!c.length) r.forma = formaEntrega(o); return r;
}
// Central One no manda el PIN dentro de la orden: se prueban las rutas habituales para leerlo (se recuerda la que funcione).
let rutaCodigos = null;
const RUTAS_COD = ['/orders/{o}/codes', '/orders/{o}/items/{i}/codes', '/orders/{o}/deliveries', '/orders/{o}/delivery', '/orders/{o}/pins', '/orders/{o}/vouchers', '/orders/{o}/cards', '/orders/{o}/credentials', '/orders/{o}/items', '/orders/{o}/items/{i}', '/orders/{o}/fulfillment', '/orders/{o}/redemption', '/orders/{o}?include=codes', '/orders/{o}?expand=items.codes'];
const conTope = (p, ms) => Promise.race([p, new Promise(r => setTimeout(() => r({ status: 0, json: null }), ms))]);
async function leerCodigosProveedor(o){
  const oid = o && o.id, iid = o && o.items && o.items[0] && o.items[0].id; if(!oid) return { codigos: [], sondeo: '' };
  const rutas = (rutaCodigos ? [rutaCodigos] : RUTAS_COD).filter(x => iid || x.indexOf('{i}') < 0).map(x => x.replace('{o}', oid).replace('{i}', iid || ''));
  const rs = await Promise.all(rutas.map(r => conTope(co(r).catch(() => ({ status: 0, json: null })), 3500).then(x => ({ r, x }))));
  const out = [], resumen = [];
  for(const { r, x } of rs){
    const cl = x.json && typeof x.json === 'object' ? Object.keys(x.json).slice(0, 6).join(',') : '';
    resumen.push(r.replace(oid, '{o}').replace(iid || '@@', '{i}') + ' → ' + x.status + (cl ? ' [' + cl + ']' : ''));
    if(x.status === 200 && x.json){ const c = extraerCodigos({ reference_code: o.reference_code, items: [x.json] }); if(c.length){ c.forEach(k => { if(out.indexOf(k) < 0) out.push(k); }); rutaCodigos = r.replace(oid, '{o}').replace(iid || '@@', '{i}'); } }
  }
  return { codigos: out, sondeo: resumen.join('\n') };
}
async function conCodigosAsync(r, o, esRobux){
  r = conCodigos(r, o, esRobux);
  if(esRobux && r && r.success && r.status === 'COMPLETED' && (!r.codigos || !r.codigos.length)){
    try{ const x = await leerCodigosProveedor(o); if(x.codigos.length){ r.codigos = x.codigos; delete r.forma; } else r.forma = (r.forma || '') + '\nSONDEO:\n' + x.sondeo; }catch(e){}
  }
  return r;
}
async function codigosDe(o, m, forzar){ const esR = !!forzar || /robux|roblox/i.test(JSON.stringify(o.items || [])); if(!esR || !m || m.status !== 'COMPLETED') return {}; let c = extraerCodigos(o); if(!c.length){ try{ c = (await leerCodigosProveedor(o)).codigos; }catch(e){} } return c.length ? { codigos: c } : { forma: formaEntrega(o) }; }
// Igual que elegirExtra(): { item, precio } o { error }. Protege el margen: si el proveedor cobra (en MXN) más de lo que vendes, se bloquea.
function elegirRegalo(items, k){
  const it = buscarRegalo(items, k); if(!it) return { error: 'No se encontró el producto en el catálogo del proveedor' };
  const precio = parseFloat(it.reseller_price); if(!(precio > 0)) return { error: 'Precio del proveedor inválido' };
  if(PROTEGER_MARGEN && precio * TC > REGALOS[k][2]) return { error: 'Producto no disponible por ahora' };
  if(it.in_stock === false) return { error: 'Producto sin stock en el proveedor' };
  return { item: it, precio };
}

// ── Respuestas en el formato de tu rapid-handler ──
// PURCHASE_FAILED / ENDPOINT_DISABLED: no se hizo nada → tu tienda devuelve el saldo.
// PROVIDER_ERROR / DUPLICATE_REQUEST: pudo haberse hecho → tu tienda NO devuelve y lo deja en revisión.
const NO_HECHO = (error, code) => ({ success: false, code: code || 'PURCHASE_FAILED', error });
const DUDOSO = (error, code) => ({ success: false, code: code || 'PROVIDER_ERROR', error });

function mapearOrden(o, esRegalo){
  const ref = o.reference_code || '';
  // El proveedor puede devolver el saldo de una línea (refunded) aunque el pedido figure "completed": eso NO es una entrega.
  // Antes se daba por completado y se cobraba al cliente sin entregar ni reembolsar.
  const ls0 = (o.items || []).map(i => String(i.status || '').toLowerCase()).filter(Boolean), stO = String(o.status || '').toLowerCase();
  const devuelto = ls0.some(x => /^(refunded|reversed|voided)$/.test(x)) || /^(refunded|reversed|voided)$/.test(stO) || (stO === 'completed' && ls0.some(x => /^(failed|cancelled|canceled|rejected)$/.test(x)));
  if(devuelto){
    if(ls0.some(x => /^(completed|delivered|fulfilled|succeeded|success)$/.test(x))) return Object.assign(DUDOSO('El pedido tiene líneas entregadas y líneas devueltas: verifícalo en Central One (' + ref + ')'), { reference: ref, order_id: o.id });
    return Object.assign(NO_HECHO('El proveedor no completó la entrega y devolvió el saldo' + (ref ? ' ' + ref : '')), { reference: ref, order_id: o.id, devuelto: true });
  }
  if(o.status === 'completed') return { success: true, status: 'COMPLETED', via: 'Central One ' + ref, reference: ref, order_id: o.id };
  if(o.status === 'failed' || o.status === 'cancelled'){
    // Cajas y fragmentos: el proveedor suele marcar "failed" un momento y luego la entrega sí se completa. En los primeros 15 min NO se da por fallida: queda pendiente y se vuelve a consultar.
    const edad = Date.now() - Date.parse(o.created_at || '');
    if((esRegalo || /fragment|caja|crate|box/i.test(JSON.stringify(o.items || []))) && edad >= 0 && edad < 15 * 60000)
      return { success: true, status: 'PENDING', via: 'Central One ' + ref + ' (verificando)', reference: ref, order_id: o.id };
    const f = o.failure || {}, ls = (o.items || []).map(i => String(i.status || '')).filter(Boolean);
    // Si el pedido dice "failed" pero alguna línea figura como entregada, NO se da por fallido (evita reembolsar algo que sí llegó): se manda a verificar a mano
    if(ls.some(s => /^(completed|delivered|fulfilled|succeeded|success)$/i.test(s))) return Object.assign(DUDOSO('El pedido figura fallido pero una línea aparece entregada: verifícalo en Central One (' + ref + ')'), { reference: ref, order_id: o.id });
    return Object.assign(NO_HECHO((f.message_es || 'El proveedor no pudo completar la recarga') + (ls.length ? ' [líneas: ' + ls.join(',') + ']' : '') + (ref ? ' ' + ref : '')), { reference: ref, order_id: o.id });
  }
  return { success: true, status: 'PENDING', via: 'Central One ' + ref + ' (pendiente)', reference: ref, order_id: o.id };
}

// ── Fusibles: gasto de las últimas 24 h y recargas del usuario en la última hora, leídos del proveedor ──
async function revisarPedidos(cliente, key){
  const desde = Date.now() - 86400000, hora = Date.now() - 3600000;
  let total = 0, delUsuario = 0, existente = null, cursor = null;
  for(let pag = 0; pag < 3; pag++){
    const r = await co('/orders?limit=50' + (cursor ? '&cursor=' + encodeURIComponent(cursor) : ''));
    if(r.status !== 200 || !r.json || !Array.isArray(r.json.orders)) return { ok: false };
    let viejo = false;
    for(const o of r.json.orders){
      const t = Date.parse(o.created_at);
      if(!(t >= desde)){ viejo = true; continue; }
      const nota = String(o.reseller_note || '');
      if(key && nota.endsWith('|' + key)) existente = o;
      if(o.status === 'failed' || o.status === 'cancelled') continue;
      total += parseFloat(o.total_sale_amount) || 0;
      if(t >= hora && nota.startsWith('CS|' + cliente + '|')) delUsuario++;
    }
    cursor = r.json.pagination && r.json.pagination.next_cursor;
    if(viejo || !cursor) break;
  }
  return { ok: true, total, delUsuario, existente };
}

async function usuarioValido(nombre){
  const u = process.env.SUPABASE_URL, k = process.env.SUPABASE_ANON_KEY;
  if(!u || !k) return { ok: true };
  try{
    const r = await fetch(u.replace(/\/+$/, '') + '/rest/v1/profiles?username=eq.' + encodeURIComponent(nombre) + '&select=id,banned&limit=1', { headers: { apikey: k, Authorization: 'Bearer ' + k } });
    const j = await r.json(); if(!Array.isArray(j)) return { ok: false, motivo: 'No se pudo verificar al usuario' };
    if(!j.length) return { ok: false, motivo: 'Usuario no encontrado' };
    if(j[0].banned) return { ok: false, motivo: 'Cuenta suspendida' };
    return { ok: true };
  }catch(e){ return { ok: false, motivo: 'No se pudo verificar al usuario' }; }
}

module.exports = async function handler(req, res){
  let _cc = null;   // para poder recuperar el pedido si se corta la conexión
  try{
    if(req.method !== 'POST') return enviar(res, NO_HECHO('Método no permitido', 'ENDPOINT_DISABLED'));
    if(!process.env.CO_API_KEY) return enviar(res, NO_HECHO('Recargas automáticas no configuradas', 'ENDPOINT_DISABLED'));
    const b = (req.body && typeof req.body === 'object') ? req.body : {};
    const ip = ipDe(req);
    const apagado = /^(0|false|off|no)$/i.test(String(process.env.CO_AUTO_ACTIVO || '1'));

    // ── ¿se puede comprar ahora? (la tienda lo consulta para mostrar la protección; NO devuelve el saldo, solo sí/no) ──
    if(b.action === 'disponibilidad'){
      if(apagado) return enviar(res, { ok: true, disponible: false, motivo: 'apagado' });
      if(limite(ip, 'd', 60)) return enviar(res, { ok: true, disponible: true, verificado: false });
      const e = await A.estado(0);
      if(e.verificado && e.pausa) await A.avisarSaldoBajo(e.saldo, e.motivo); else if(e.verificado) await A.avisarRecuperado(e.saldo);
      // Por paquete: cada recarga de diamantes solo se ofrece si el saldo del proveedor alcanza para su costo (no se devuelve el saldo ni los costos, solo sí/no)
      let paquetes = null;
      if(e.verificado && !e.pausa && e.saldo !== null){
        paquetes = {}; let items = null; try{ const c = await catalogo(); if(c.ok) items = c.items; }catch(_){}
        Object.keys(PAQUETES).forEach(d => {
          let costo = PAQUETES[d].ref, sinStock = false;
          if(items){ const r = detectar(items, Number(d)); if(r.precio > 0) costo = r.precio; else if(/sin stock/i.test(r.error || '')) sinStock = true; }
          paquetes[d] = !sinStock && e.saldo >= costo;
        });
      }
      return enviar(res, { ok: true, disponible: !e.pausa, motivo: e.pausa ? 'saldo' : null, verificado: e.verificado, paquetes });
    }
    // ── estado del servicio para la página pública "Estado" (solo sí/no y milisegundos; no devuelve saldos ni costos) ──
    if(b.action === 'salud'){
      if(limite(ip, 'h', 40)) return enviar(res, { ok: false });
      if(apagado) return enviar(res, { ok: true, proveedor: 'apagado', diamantes: 'pausa', cajas: 'pausa', fragmentos: 'pausa', ms: 0 });
      const t0 = Date.now(), c = await catalogo(), ms = Date.now() - t0;
      await vigilarProveedor(c, ms);
      if(!c.ok) return enviar(res, { ok: true, proveedor: 'caido', diamantes: 'pausa', cajas: 'pausa', fragmentos: 'pausa', ms });
      let pausa = false; try{ const e = await A.estado(0); pausa = !!(e.verificado && e.pausa); }catch(e){}
      const st = stockRegalos(c.items), grupo = pre => { const v = Object.keys(st).filter(k => k.indexOf(pre) === 0).map(k => st[k]); return v.length && v.every(x => x === 'ok') ? 'ok' : v.some(x => x === 'ok') ? 'parcial' : 'sin_stock'; };
      return enviar(res, { ok: true, proveedor: ms > 4000 ? 'lento' : 'ok', diamantes: pausa ? 'pausa' : 'ok', cajas: pausa ? 'pausa' : grupo('cj'), fragmentos: pausa ? 'pausa' : grupo('fa'), ms });
    }
    if(b.action === 'stock_regalos'){
      if(limite(ip, 's', 30)) return enviar(res, { ok: false });
      const t1 = Date.now(), c = await catalogo(); await vigilarProveedor(c, Date.now() - t1); if(!c.ok) return enviar(res, { ok: false });
      // Cantidad disponible por producto (solo si el proveedor la informa; si no, null) y total por grupo
      const cant = {}, tot = { caja: 0, fragmento: 0 }, comp = { caja: true, fragmento: true };
      Object.keys(REGALOS).forEach(k => { const it = buscarRegalo(c.items, k), g = k.indexOf('cj') === 0 ? 'caja' : 'fragmento', n = it ? cantidadDe(it) : null; cant[k] = n; if(n === null){ comp[g] = false; } else tot[g] += n * REGALOS[k][1]; });
      const sr = stockRobux(c.items), cr = {}; Object.keys(ROBUX).forEach(k => { const it = buscarRobux(c.items, k); cr[k] = it ? cantidadDe(it) : null; });
      return enviar(res, { ok: true, robux: sr, robux_cantidad: cr, stock: stockRegalos(c.items), cantidad: cant, total: { caja: comp.caja ? tot.caja : null, fragmento: comp.fragmento ? tot.fragmento : null } });
    }
    if(apagado) return enviar(res, NO_HECHO('Las recargas automáticas están desactivadas por ahora', 'ENDPOINT_DISABLED'));

    // ── estado de un pedido (por si hace falta consultarlo después) ──
    if(b.action === 'estado'){
      const id = String(b.order_id || ''); if(!/^[0-9a-fA-F-]{36}$/.test(id)) return enviar(res, { success: false, error: 'order_id inválido' });
      const r = await co('/orders/' + id); if(r.status !== 200 || !r.json || !r.json.order) return enviar(res, { success: false, error: 'No encontrado' });
      const o = r.json.order, m = mapearOrden(o);
      if((o.items || []).some(i => i.status === 'refunded')) return enviar(res, { success: true, status: 'REFUNDED', reference: o.reference_code });
      return enviar(res, m.success ? Object.assign({ success: true, status: m.status, reference: m.reference }, await codigosDe(o, m, b.robux)) : (m.code === 'PROVIDER_ERROR' ? { success: true, status: 'PENDING', reference: m.reference, error: m.error } : { success: true, status: 'FAILED', reference: m.reference, error: m.error }));
    }

    // ── buscar un pedido por su clave (para resolver unidades "en verificación") ──
    if(b.action === 'buscar'){
      const cl = String(b.client_name || '').trim(), k = String(b.idempotency_key || '');
      if(!/^[A-Za-z0-9_.-]{2,40}$/.test(cl) || !/^[A-Za-z0-9_-]{8,128}$/.test(k)) return enviar(res, { success: false, error: 'Datos inválidos' });
      const rv = await revisarPedidos(cl, k); if(!rv.ok) return enviar(res, { success: false, error: 'No se pudo consultar al proveedor' });
      if(!rv.existente) return enviar(res, { success: true, status: 'NOT_FOUND' });
      const o = rv.existente, m = mapearOrden(o, !!b.regalo);
      if((o.items || []).some(i => i.status === 'refunded')) return enviar(res, { success: true, status: 'REFUNDED', reference: o.reference_code, order_id: o.id });
      return enviar(res, m.success ? Object.assign({ success: true, status: m.status, reference: m.reference, order_id: o.id, via: m.via }, await codigosDe(o, m, b.robux)) : (m.code === 'PROVIDER_ERROR' ? { success: true, status: 'PENDING', reference: m.reference, order_id: o.id, via: 'Central One ' + (o.reference_code || '') } : { success: true, status: 'FAILED', reference: m.reference, order_id: o.id, error: m.error }));
    }

    const extra = EXTRA[String(b.producto || '')] ? String(b.producto) : null;
    const reg = (!extra && REGALOS[String(b.producto || '')]) ? String(b.producto) : null;
    const rbx = (!extra && !reg && ROBUX[String(b.producto || '')]) ? String(b.producto) : null;
    const diam = (extra || reg || rbx) ? null : PKG[Number(b.package_id != null ? b.package_id : b.product_id)];
    const elegir = items => extra ? elegirExtra(items, extra) : (reg ? elegirRegalo(items, reg) : (rbx ? elegirRobux(items, rbx) : detectar(items, diam)));
    if(!extra && !reg && !rbx && !diam) return enviar(res, NO_HECHO('Paquete no disponible para recarga automática', 'ENDPOINT_DISABLED'));
    const pid = String(b.player_id != null ? b.player_id : b.service_user_id || '').trim();

    // ── validar ID ──
    if(b.action === 'validar'){
      if(limite(ip, 'v', 30)) return enviar(res, { success: false, error: 'Demasiadas consultas, espera un momento' });
      if(!/^\d{5,15}$/.test(pid)) return enviar(res, { success: true, valido: false });
      const c = await catalogo(); if(!c.ok) return enviar(res, { success: false, error: 'No se pudo verificar' });
      const d = elegir(c.items); if(d.error) return enviar(res, { success: false, error: 'No se pudo verificar' });
      const tg = armarTarget(d.item, pid); if(!tg) return enviar(res, { success: false, error: 'No se pudo verificar' });
      const r = await co('/player/validate', { method: 'POST', body: { product_id: d.item.product_id, target_payload: tg } });
      if(r.status !== 200 || !r.json) return enviar(res, { success: false, error: 'No se pudo verificar' });
      if(r.json.status === 'valid') return enviar(res, { success: true, valido: true, nombre: (r.json.player && r.json.player.name) || '' });
      if(r.json.status === 'invalid') return enviar(res, { success: true, valido: false });
      return enviar(res, { success: false, error: 'No se pudo verificar' });
    }

    if(b.action !== 'comprar') return enviar(res, NO_HECHO('Acción desconocida', 'ENDPOINT_DISABLED'));

    // ── comprar ──
    // Versión de la tienda: las páginas actuales mandan su huella (X-CS-Build). Una página vieja no la manda y no puede comprar.
    if(!/^(0|false|off|no)$/i.test(String(process.env.CO_EXIGIR_VERSION || '1')) && !/^[a-f0-9]{10}$/.test(String(req.headers['x-cs-build'] || '')))
      return enviar(res, NO_HECHO('Tu versión de la tienda está desactualizada. Actualiza la página (recárgala) y vuelve a intentar. No se te cobró.', 'ENDPOINT_DISABLED'));
    const cliente = String(b.client_name || '').trim(), key = String(b.idempotency_key || '');
    _cc = { cliente, key, reg: !!(reg || rbx), rbx: !!rbx, precio: null };
    if(!/^[A-Za-z0-9_.-]{2,40}$/.test(cliente)) return enviar(res, NO_HECHO('Usuario inválido', 'ENDPOINT_DISABLED'));
    if(!/^[A-Za-z0-9_-]{8,128}$/.test(key)) return enviar(res, NO_HECHO('Clave de pedido inválida', 'ENDPOINT_DISABLED'));
    if(!rbx && !/^\d{5,15}$/.test(pid)) return enviar(res, NO_HECHO('ID de Free Fire inválido'));
    if(limite(ip, 'c', 20)) return enviar(res, NO_HECHO('Demasiadas compras seguidas, espera un momento', 'ENDPOINT_DISABLED'));

    const u = await usuarioValido(cliente); if(!u.ok) return enviar(res, NO_HECHO(u.motivo, 'ENDPOINT_DISABLED'));
    const c = await catalogo(); if(!c.ok){ await vigilarProveedor(c, 0); return enviar(res, NO_HECHO('Proveedor no disponible', 'ENDPOINT_DISABLED')); }
    const d = elegir(c.items); if(d.error) return enviar(res, NO_HECHO(d.error));
    armarTarget.falta = []; const tg = rbx ? undefined : armarTarget(d.item, pid); if(!rbx && !tg) return enviar(res, NO_HECHO('El proveedor pide datos que no se pueden completar (' + armarTarget.falta.join(', ') + ')'));

    // ¿Ya existe este mismo pedido? (reintento tras un corte): se devuelve su estado sin gastar de nuevo ni aplicar fusibles
    const rev = await revisarPedidos(cliente, key);
    if(!rev.ok) return enviar(res, NO_HECHO('No se pudo verificar el límite de gasto', 'ENDPOINT_DISABLED'));
    if(rev.existente) return enviar(res, await conCodigosAsync(Object.assign(mapearOrden(rev.existente, !!(reg || rbx)), { costo_usd: d.precio }), rev.existente, !!rbx));
    // Protección de saldo con el proveedor: si queda poco (o no alcanza para este pedido) se pausa y se te avisa por Telegram
    const sp = await A.estado(d.precio);
    if(sp.pausa){ await A.avisarSaldoBajo(sp.saldo, sp.motivo); return enviar(res, NO_HECHO(sp.motivo === 'no_alcanza' ? 'Esta recarga no está disponible por ahora. Escríbenos por WhatsApp para activarla o pedirla manual.' : 'Recargas en pausa por unos minutos: estamos reponiendo saldo del sistema. Intenta de nuevo en un rato.', 'ENDPOINT_DISABLED')); }
    if(LIM_DIA > 0 && rev.total + d.precio > LIM_DIA) return enviar(res, NO_HECHO('Recargas automáticas en pausa por hoy. Intenta más tarde o contacta al administrador', 'ENDPOINT_DISABLED'));
    if(LIM_USER_H > 0 && rev.delUsuario >= LIM_USER_H) return enviar(res, NO_HECHO('Alcanzaste el límite de recargas por hora. Intenta más tarde', 'ENDPOINT_DISABLED'));

    const r = await co('/orders', { method: 'POST', headers: { 'Idempotency-Key': key },
      body: { items: [rbx ? { catalog_item_id: d.item.product_id, quantity: 1 } : { catalog_item_id: d.item.product_id, quantity: 1, target_payload: tg }], note: ('CS|' + cliente + '|' + key).slice(0, 400) } });
    if(r.status !== 201 && r.status !== 200){
      const code = (r.json && r.json.error && r.json.error.code) || '';
      if(r.status === 422 || code === 'idempotency_key_reused') return enviar(res, DUDOSO('Pedido repetido, se está verificando', 'DUPLICATE_REQUEST'));
      if(r.status === 409 || r.status === 400 || r.status === 429 || r.status === 404) return enviar(res, NO_HECHO('El proveedor no pudo tomar la recarga (' + (code || r.status) + (r.json && r.json.error && r.json.error.message ? ': ' + String(r.json.error.message).slice(0, 160) : '') + ')'));
      if(r.status === 401 || r.status === 403) return enviar(res, NO_HECHO('Proveedor no disponible', 'ENDPOINT_DISABLED'));
      return enviar(res, DUDOSO('Sin respuesta clara del proveedor (' + (code || r.status) + ')'));
    }
    if(!r.json || !r.json.order) return enviar(res, DUDOSO('Respuesta inválida del proveedor'));
    let o = r.json.order;

    // Esperar un poco a que termine (las recargas directas suelen tardar segundos)
    const fin = Date.now() + ESPERA_MS;
    while(Date.now() < fin){
      await dormir(POLL_MS);
      let s; try{ s = await co('/orders/' + o.id); }catch(e){ break; }
      if(s.status === 200 && s.json && s.json.order){ o = Object.assign({}, o, s.json.order); if(['completed', 'failed', 'cancelled'].indexOf(o.status) >= 0) break; }
    }
    try{ await A.despuesDeCompra(); }catch(e){}
    // costo_usd: lo que cobró el proveedor (para el aviso de Telegram con la ganancia)
    const final = mapearOrden(o, !!(reg || rbx)); if(final.success) final.costo_usd = d.precio;
    return enviar(res, await conCodigosAsync(final, o, !!rbx));
  }catch(e){
    const timeout = e && e.name === 'AbortError';
    // Se cortó la espera, pero el pedido pudo haberse creado: se busca por su clave y se devuelve su estado real (así no queda en "verificar" algo que el proveedor sí entregó)
    if(_cc && _cc.key){ try{ const rv = await revisarPedidos(_cc.cliente, _cc.key); if(rv.ok && rv.existente) return enviar(res, mapearOrden(rv.existente, _cc.reg)); }catch(e2){} }
    return enviar(res, DUDOSO(timeout ? 'El proveedor tardó demasiado: se está verificando' : 'Error al contactar al proveedor'));
  }
};

// ── Inventario para el panel "Estado del Sistema" (solo consulta; lo usa api/_estado.js desde el panel admin) ──
// La cantidad SOLO se muestra si el proveedor la manda en el catálogo (campos de stock). Si no, queda en null: nunca se inventa.
const RX_CANT = /^(stock|stock_quantity|stock_count|stock_level|stock_available|available_stock|available|available_quantity|quantity_available|available_units|units_available|inventory|inventory_quantity|inventory_count|remaining|remaining_stock|existencias?|disponible|disponibles|qty_available)$/i;
const RX_ANIDADA = /^(quantity|available|count|total|stock|units|amount)$/i;
function numOk(v){ return v !== undefined && v !== null && v !== '' && typeof v !== 'boolean' && isFinite(Number(v)) && Number(v) >= 0; }
function cantidadDe(it){
  if(!it || typeof it !== 'object') return null;
  for(const k of Object.keys(it)){
    if(!RX_CANT.test(k)) continue;
    const v = it[k];
    if(numOk(v)) return Number(v);
    if(v && typeof v === 'object'){ for(const k2 of Object.keys(v)){ if(RX_ANIDADA.test(k2) && numOk(v[k2])) return Number(v[k2]); } }
  }
  return null;
}
// Campos sencillos que manda el proveedor para un producto (solo para que el admin vea si trae cantidades; sin textos largos)
function muestraDe(it){
  if(!it) return null; const o = {};
  Object.keys(it).forEach(k => { const v = it[k]; if(v === null || ['string', 'number', 'boolean'].indexOf(typeof v) >= 0){ if(typeof v !== 'string' || v.length <= 60) o[k] = v; } else if(typeof v === 'object' && !Array.isArray(v)){ o[k] = '{' + Object.keys(v).slice(0, 6).join(', ') + '}'; } else if(Array.isArray(v)) o[k] = '[' + v.length + ']'; });
  return o;
}
function estadoItem(it){
  if(!it) return 'no_disponible';
  if(it.in_stock === false) return 'sin_stock';
  if(it.in_stock === true) return 'ok';
  const c = cantidadDe(it); if(c !== null) return c > 0 ? 'ok' : 'sin_stock';
  return 'no_informado';
}
function buscarDiamante(items, d){
  const p = PAQUETES[d]; let fijo = {}; try{ fijo = JSON.parse(process.env.CO_MAP || '{}'); }catch(e){}
  if(fijo[d]) return items.find(x => x.product_id === fijo[d]) || null;
  const cand = items.filter(it => esFFLatam(it) && !EXCLUIR.test((it.name || '') + ' ' + (it.sku || '')) && it.requires_target !== false);
  const ac = cand.filter(it => { const t = (it.name || '') + ' ' + (it.sku || ''); return tieneNum(t, d) || (tieneNum(t, p.base) && /bono|bonus|%/i.test(t)); });
  ac.sort((a, b) => Math.abs(parseFloat(a.reseller_price) - p.ref) - Math.abs(parseFloat(b.reseller_price) - p.ref));
  return ac[0] || null;
}
function inventario(items){
  const f = it => ({ estado: estadoItem(it), cantidad: it ? cantidadDe(it) : null });
  const diamantes = Object.keys(PAQUETES).map(d => Object.assign({ clave: 'd' + d, nombre: Number(d).toLocaleString('es-MX') + ' 💎' }, f(buscarDiamante(items, Number(d)))));
  const cajas = [], fragmentos = []; let muestra = null;
  Object.keys(REGALOS).forEach(k => { const it = buscarRegalo(items, k); if(it && !muestra) muestra = muestraDe(it); const o = Object.assign({ clave: k, nombre: k.indexOf('cj') === 0 ? (REGALOS[k][1] === 1 ? '1 caja' : REGALOS[k][1] + ' cajas') : 'Fragmentos de arma ×' + REGALOS[k][1], unidades: REGALOS[k][1] }, f(it)); (k.indexOf('cj') === 0 ? cajas : fragmentos).push(o); });
  return { diamantes, cajas, fragmentos, muestra };
}
module.exports.inventario = inventario;

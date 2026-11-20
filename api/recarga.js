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
      return enviar(res, { ok: true, disponible: !e.pausa, motivo: e.pausa ? 'saldo' : null, verificado: e.verificado });
    }
    // ── estado del servicio para la página pública "Estado" (solo sí/no y milisegundos; no devuelve saldos ni costos) ──
    if(b.action === 'salud'){
      if(limite(ip, 'h', 40)) return enviar(res, { ok: false });
      if(apagado) return enviar(res, { ok: true, proveedor: 'apagado', diamantes: 'pausa', cajas: 'pausa', fragmentos: 'pausa', ms: 0 });
      const t0 = Date.now(), c = await catalogo(), ms = Date.now() - t0;
      if(!c.ok) return enviar(res, { ok: true, proveedor: 'caido', diamantes: 'pausa', cajas: 'pausa', fragmentos: 'pausa', ms });
      let pausa = false; try{ const e = await A.estado(0); pausa = !!(e.verificado && e.pausa); }catch(e){}
      const st = stockRegalos(c.items), grupo = pre => { const v = Object.keys(st).filter(k => k.indexOf(pre) === 0).map(k => st[k]); return v.length && v.every(x => x === 'ok') ? 'ok' : v.some(x => x === 'ok') ? 'parcial' : 'sin_stock'; };
      return enviar(res, { ok: true, proveedor: ms > 4000 ? 'lento' : 'ok', diamantes: pausa ? 'pausa' : 'ok', cajas: pausa ? 'pausa' : grupo('cj'), fragmentos: pausa ? 'pausa' : grupo('fa'), ms });
    }
    if(b.action === 'stock_regalos'){
      if(limite(ip, 's', 30)) return enviar(res, { ok: false });
      const c = await catalogo(); if(!c.ok) return enviar(res, { ok: false });
      return enviar(res, { ok: true, stock: stockRegalos(c.items) });
    }
    if(apagado) return enviar(res, NO_HECHO('Las recargas automáticas están desactivadas por ahora', 'ENDPOINT_DISABLED'));

    // ── estado de un pedido (por si hace falta consultarlo después) ──
    if(b.action === 'estado'){
      const id = String(b.order_id || ''); if(!/^[0-9a-fA-F-]{36}$/.test(id)) return enviar(res, { success: false, error: 'order_id inválido' });
      const r = await co('/orders/' + id); if(r.status !== 200 || !r.json || !r.json.order) return enviar(res, { success: false, error: 'No encontrado' });
      const o = r.json.order, m = mapearOrden(o);
      if((o.items || []).some(i => i.status === 'refunded')) return enviar(res, { success: true, status: 'REFUNDED', reference: o.reference_code });
      return enviar(res, m.success ? { success: true, status: m.status, reference: m.reference } : (m.code === 'PROVIDER_ERROR' ? { success: true, status: 'PENDING', reference: m.reference, error: m.error } : { success: true, status: 'FAILED', reference: m.reference, error: m.error }));
    }

    // ── buscar un pedido por su clave (para resolver unidades "en verificación") ──
    if(b.action === 'buscar'){
      const cl = String(b.client_name || '').trim(), k = String(b.idempotency_key || '');
      if(!/^[A-Za-z0-9_.-]{2,40}$/.test(cl) || !/^[A-Za-z0-9_-]{8,128}$/.test(k)) return enviar(res, { success: false, error: 'Datos inválidos' });
      const rv = await revisarPedidos(cl, k); if(!rv.ok) return enviar(res, { success: false, error: 'No se pudo consultar al proveedor' });
      if(!rv.existente) return enviar(res, { success: true, status: 'NOT_FOUND' });
      const o = rv.existente, m = mapearOrden(o, !!b.regalo);
      if((o.items || []).some(i => i.status === 'refunded')) return enviar(res, { success: true, status: 'REFUNDED', reference: o.reference_code, order_id: o.id });
      return enviar(res, m.success ? { success: true, status: m.status, reference: m.reference, order_id: o.id, via: m.via } : (m.code === 'PROVIDER_ERROR' ? { success: true, status: 'PENDING', reference: m.reference, order_id: o.id, via: 'Central One ' + (o.reference_code || '') } : { success: true, status: 'FAILED', reference: m.reference, order_id: o.id, error: m.error }));
    }

    const extra = EXTRA[String(b.producto || '')] ? String(b.producto) : null;
    const reg = (!extra && REGALOS[String(b.producto || '')]) ? String(b.producto) : null;
    const diam = (extra || reg) ? null : PKG[Number(b.package_id != null ? b.package_id : b.product_id)];
    const elegir = items => extra ? elegirExtra(items, extra) : (reg ? elegirRegalo(items, reg) : detectar(items, diam));
    if(!extra && !reg && !diam) return enviar(res, NO_HECHO('Paquete no disponible para recarga automática', 'ENDPOINT_DISABLED'));
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
    _cc = { cliente, key, reg: !!reg, precio: null };
    if(!/^[A-Za-z0-9_.-]{2,40}$/.test(cliente)) return enviar(res, NO_HECHO('Usuario inválido', 'ENDPOINT_DISABLED'));
    if(!/^[A-Za-z0-9_-]{8,128}$/.test(key)) return enviar(res, NO_HECHO('Clave de pedido inválida', 'ENDPOINT_DISABLED'));
    if(!/^\d{5,15}$/.test(pid)) return enviar(res, NO_HECHO('ID de Free Fire inválido'));
    if(limite(ip, 'c', 20)) return enviar(res, NO_HECHO('Demasiadas compras seguidas, espera un momento', 'ENDPOINT_DISABLED'));

    const u = await usuarioValido(cliente); if(!u.ok) return enviar(res, NO_HECHO(u.motivo, 'ENDPOINT_DISABLED'));
    const c = await catalogo(); if(!c.ok) return enviar(res, NO_HECHO('Proveedor no disponible', 'ENDPOINT_DISABLED'));
    const d = elegir(c.items); if(d.error) return enviar(res, NO_HECHO(d.error));
    armarTarget.falta = []; const tg = armarTarget(d.item, pid); if(!tg) return enviar(res, NO_HECHO('El proveedor pide datos que no se pueden completar (' + armarTarget.falta.join(', ') + ')'));

    // ¿Ya existe este mismo pedido? (reintento tras un corte): se devuelve su estado sin gastar de nuevo ni aplicar fusibles
    const rev = await revisarPedidos(cliente, key);
    if(!rev.ok) return enviar(res, NO_HECHO('No se pudo verificar el límite de gasto', 'ENDPOINT_DISABLED'));
    if(rev.existente) return enviar(res, Object.assign(mapearOrden(rev.existente, !!reg), { costo_usd: d.precio }));
    // Protección de saldo con el proveedor: si queda poco (o no alcanza para este pedido) se pausa y se te avisa por Telegram
    const sp = await A.estado(d.precio);
    if(sp.pausa){ await A.avisarSaldoBajo(sp.saldo, sp.motivo); return enviar(res, NO_HECHO('Recargas en pausa por unos minutos: estamos reponiendo saldo del sistema. Intenta de nuevo en un rato.', 'ENDPOINT_DISABLED')); }
    if(LIM_DIA > 0 && rev.total + d.precio > LIM_DIA) return enviar(res, NO_HECHO('Recargas automáticas en pausa por hoy. Intenta más tarde o contacta al administrador', 'ENDPOINT_DISABLED'));
    if(LIM_USER_H > 0 && rev.delUsuario >= LIM_USER_H) return enviar(res, NO_HECHO('Alcanzaste el límite de recargas por hora. Intenta más tarde', 'ENDPOINT_DISABLED'));

    const r = await co('/orders', { method: 'POST', headers: { 'Idempotency-Key': key },
      body: { items: [{ catalog_item_id: d.item.product_id, quantity: 1, target_payload: tg }], note: ('CS|' + cliente + '|' + key).slice(0, 400) } });
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
    const final = mapearOrden(o, !!reg); if(final.success) final.costo_usd = d.precio;
    return enviar(res, final);
  }catch(e){
    const timeout = e && e.name === 'AbortError';
    // Se cortó la espera, pero el pedido pudo haberse creado: se busca por su clave y se devuelve su estado real (así no queda en "verificar" algo que el proveedor sí entregó)
    if(_cc && _cc.key){ try{ const rv = await revisarPedidos(_cc.cliente, _cc.key); if(rv.ok && rv.existente) return enviar(res, mapearOrden(rv.existente, _cc.reg)); }catch(e2){} }
    return enviar(res, DUDOSO(timeout ? 'El proveedor tardó demasiado: se está verificando' : 'Error al contactar al proveedor'));
  }
};

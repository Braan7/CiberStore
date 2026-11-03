// ═══════════════════════════════════════════════════════════════════════════
// api/co.js · Servidor intermedio hacia Central One (solo para tu panel admin)
//
// POR QUÉ EXISTE: la API de Central One no acepta llamadas desde el navegador y su llave
// autoriza a gastar tu saldo. La llave vive SOLO aquí (variable de entorno de Vercel).
// Nunca la pongas en index.html ni en script.js.
//
// Variables de entorno en Vercel (Settings → Environment Variables):
//   CO_API_KEY      la llave co_live_... (permisos: catalog:read, balance:read, orders:read, orders:write)
//   CO_ADMIN_TOKEN  un texto largo y secreto que TÚ inventas (32+ caracteres). El panel te lo pide una vez por sesión.
//   (opcional) CO_MAP          JSON {"110":"<product_id>", ...} para fijar los productos a mano si la detección automática falla
//   (opcional) CO_TOLERANCIA   0.35  → cuánto puede alejarse el precio del de referencia antes de bloquear la compra
//   (opcional) CO_REGION_REGEX     lat|latam|latin  → cómo se reconoce la región LATAM en el catálogo
//   (opcional) CO_BASE         https://portal.centraloneglobal.com/api/v1
// ═══════════════════════════════════════════════════════════════════════════
'use strict';
const crypto = require('crypto');

const BASE = (process.env.CO_BASE || 'https://portal.centraloneglobal.com/api/v1').replace(/\/+$/, '');
const TOL = Number(process.env.CO_TOLERANCIA || 0.35);

// Los 6 paquetes de diamantes de Free Fire LATAM: total de diamantes → base sin bono y precio de referencia (US$)
const PAQUETES = {
  110:  { base: 100,  ref: 0.6550 },
  341:  { base: 310,  ref: 1.9649 },
  572:  { base: 520,  ref: 3.3222 },
  1166: { base: 1060, ref: 6.1709 },
  2398: { base: 2180, ref: 12.2471 },
  6160: { base: 5600, ref: 31.1701 }
};
const EXCLUIR = /pase|pass|tarjeta|card|semanal|mensual|weekly|monthly|membres|member|nivel|level|upgrade|subida/i;

function enviar(res, status, body){
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}
function iguales(a, b){ const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); }

// Freno a quien adivina el token: 8 fallos por minuto y por IP
const fallos = new Map();
function ipDe(req){ return String((req.headers['x-forwarded-for'] || (req.socket && req.socket.remoteAddress) || 'x')).split(',')[0].trim(); }
function bloqueada(ip){ const t = Date.now(), l = (fallos.get(ip) || []).filter(x => t - x < 60000); fallos.set(ip, l); return l.length >= 8; }
function anotarFallo(ip){ const l = fallos.get(ip) || []; l.push(Date.now()); fallos.set(ip, l); }

async function co(path, opts){
  opts = opts || {};
  const ctrl = new AbortController(), t = setTimeout(() => ctrl.abort(), 9000);
  try{
    const r = await fetch(BASE + path, {
      method: opts.method || 'GET',
      headers: Object.assign({ Authorization: 'Bearer ' + process.env.CO_API_KEY, Accept: 'application/json' }, opts.body ? { 'Content-Type': 'application/json' } : {}, opts.headers || {}),
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      signal: ctrl.signal
    });
    let j = null; try{ j = await r.json(); }catch(e){}
    return { status: r.status, json: j, rid: r.headers.get('x-request-id'), retry: r.headers.get('retry-after') };
  } finally { clearTimeout(t); }
}
function errProv(r){
  const e = (r.json && r.json.error) || {};
  return { ok: false, http: r.status, code: e.code || ('http_' + r.status), message: e.message || '', request_id: e.request_id || r.rid || null, fields: e.fields, retry_after: r.retry ? Number(r.retry) : undefined };
}

// Catálogo con caché de 60 s (la API limita a 60 lecturas/min)
let cache = { t: 0, items: null };
async function catalogo(){
  if(cache.items && Date.now() - cache.t < 60000) return { ok: true, items: cache.items };
  const r = await co('/catalog');
  if(r.status !== 200 || !r.json || !Array.isArray(r.json.items)) return errProv(r);
  cache = { t: Date.now(), items: r.json.items };
  return { ok: true, items: cache.items };
}

function norm(txt){ return String(txt || '').replace(/(\d)[.,](?=\d{3}(?!\d))/g, '$1'); }
function tieneNum(txt, n){ return new RegExp('(?<![0-9])' + n + '(?![0-9])').test(norm(txt)); }
function esFFLatam(it){
  if(!/free\s*fire/i.test((it.product_family_name || '') + ' ' + (it.name || ''))) return false;
  const rx = process.env.CO_REGION_REGEX ? new RegExp(process.env.CO_REGION_REGEX, 'i') : /lat|latam|latin/i;
  return rx.test((it.region || '') + ' ' + (it.market || '') + ' ' + (it.name || ''));
}
// Reconoce cada paquete en el catálogo. La compra se bloquea si el precio se aleja demasiado del de referencia.
function detectar(items){
  let fijo = {}; try{ fijo = JSON.parse(process.env.CO_MAP || '{}'); }catch(e){}
  const cand = items.filter(it => esFFLatam(it) && !EXCLUIR.test((it.name || '') + ' ' + (it.sku || '')) && it.requires_target !== false);
  const out = {};
  Object.keys(PAQUETES).forEach(k => {
    const d = Number(k), p = PAQUETES[d]; let item = null, via = 'auto';
    if(fijo[k]){ item = items.find(x => x.product_id === fijo[k]) || null; via = 'CO_MAP'; }
    else {
      const aciertos = cand.filter(it => { const t = (it.name || '') + ' ' + (it.sku || ''); return tieneNum(t, d) || (tieneNum(t, p.base) && /bono|bonus|%/i.test(t)); });
      aciertos.sort((a, b) => Math.abs(parseFloat(a.reseller_price) - p.ref) - Math.abs(parseFloat(b.reseller_price) - p.ref));
      item = aciertos[0] || null;
    }
    const precio = item ? parseFloat(item.reseller_price) : NaN;
    let estado = 'ok';
    if(!item) estado = 'no_detectado';
    else if(!(precio > 0) || Math.abs(precio - p.ref) / p.ref > TOL) estado = 'precio_fuera_de_rango';
    else if(item.in_stock === false) estado = 'sin_stock';
    out[d] = { diamantes: d, estado, via, ref: p.ref, product_id: item ? item.product_id : null, nombre: item ? item.name : null, sku: item ? item.sku : null, precio: item ? item.reseller_price : null, in_stock: item ? item.in_stock : null, _item: item };
  });
  return out;
}
function armarTarget(it, playerId){
  const campos = Array.isArray(it.target_fields) ? it.target_fields : [], esq = Array.isArray(it.target_schema) ? it.target_schema : [];
  const payload = {}, faltan = [];
  campos.forEach(key => {
    const s = esq.find(x => x.key === key) || {};
    if(/^(player_?id|uid|id)$/i.test(key)) payload[key] = String(playerId);
    else if(s.type === 'select' && Array.isArray(s.options) && s.options.length === 1) payload[key] = s.options[0].value;
    else faltan.push(key);
  });
  return faltan.length ? { faltan } : { payload };
}
async function resolver(diam){
  if(!PAQUETES[diam]) return { ok: false, http: 400, code: 'paquete_no_permitido', message: 'Solo se permiten los 6 paquetes de diamantes configurados' };
  const c = await catalogo(); if(!c.ok) return c;
  const m = detectar(c.items)[diam];
  if(m.estado === 'no_detectado') return { ok: false, http: 409, code: 'no_detectado', message: 'No encontré ese paquete en el catálogo (usa "Ver paquetes detectados")' };
  if(m.estado === 'precio_fuera_de_rango') return { ok: false, http: 409, code: 'precio_fuera_de_rango', message: 'El precio del proveedor (' + m.precio + ' US$) está muy lejos del esperado (' + m.ref + '). No se compra por seguridad' };
  if(m.estado === 'sin_stock') return { ok: false, http: 409, code: 'insufficient_stock', message: 'Sin stock en el proveedor' };
  return { ok: true, item: m._item, meta: m };
}

module.exports = async function handler(req, res){
  try{
    if(req.method !== 'POST') return enviar(res, 405, { ok: false, code: 'metodo', message: 'Usa POST' });
    if(!process.env.CO_API_KEY || !process.env.CO_ADMIN_TOKEN) return enviar(res, 500, { ok: false, code: 'config', message: 'Falta configurar CO_API_KEY y CO_ADMIN_TOKEN en Vercel' });
    const ip = ipDe(req);
    if(bloqueada(ip)) return enviar(res, 429, { ok: false, code: 'demasiados_intentos', message: 'Demasiados intentos. Espera un minuto.' });
    if(!iguales(req.headers['x-admin-token'] || '', process.env.CO_ADMIN_TOKEN)){ anotarFallo(ip); return enviar(res, 401, { ok: false, code: 'no_autorizado', message: 'Token incorrecto' }); }
    const b = (req.body && typeof req.body === 'object') ? req.body : {};

    switch(b.action){
      case 'ping': {
        const r = await co('/ping'); return enviar(res, 200, r.status === 200 ? { ok: true } : errProv(r));
      }
      case 'balance': {
        const r = await co('/balance');
        if(r.status !== 200 || !r.json) return enviar(res, 200, errProv(r));
        return enviar(res, 200, { ok: true, available: r.json.available_balance, held: r.json.held_balance, total: r.json.total_balance, currency: r.json.currency });
      }
      case 'paquetes': {
        const c = await catalogo(); if(!c.ok) return enviar(res, 200, c);
        const m = detectar(c.items);
        const lim = x => ({ product_id: x.product_id, nombre: x.name, sku: x.sku, region: x.region, precio: x.reseller_price, in_stock: x.in_stock });
        return enviar(res, 200, { ok: true, tolerancia: TOL, paquetes: Object.keys(m).map(k => { const { _item, ...limpio } = m[k]; return limpio; }),
          candidatos: c.items.filter(it => /free\s*fire/i.test((it.product_family_name || '') + ' ' + (it.name || ''))).slice(0, 60).map(lim) });
      }
      case 'catalogo': {
        // Solo lectura: todos los productos de tu catálogo con su product_id (para consultarlos y fijar CO_MAP)
        const c = await catalogo(); if(!c.ok) return enviar(res, 200, c);
        return enviar(res, 200, { ok: true, total: c.items.length, items: c.items.slice(0, 1000).map(x => ({
          product_id: x.product_id, nombre: x.name, sku: x.sku, familia: x.product_family_name, categoria: x.category, tipo: x.product_type,
          region: x.region, precio: x.reseller_price, moneda: x.currency, in_stock: x.in_stock, campos: x.target_fields })) });
      }
      case 'validate':
      case 'order': {
        const diam = Number(b.diamantes), pid = String(b.player_id || '').trim();
        if(!/^\d{5,15}$/.test(pid)) return enviar(res, 200, { ok: false, http: 400, code: 'id_invalido', message: 'El ID de Free Fire debe ser numérico (5 a 15 dígitos)' });
        const rs = await resolver(diam); if(!rs.ok) return enviar(res, 200, rs);
        const tg = armarTarget(rs.item, pid);
        if(tg.faltan) return enviar(res, 200, { ok: false, http: 400, code: 'campo_requerido', message: 'El producto pide datos extra que no sé llenar: ' + tg.faltan.join(', ') });
        if(b.action === 'validate'){
          const r = await co('/player/validate', { method: 'POST', body: { product_id: rs.item.product_id, target_payload: tg.payload } });
          if(r.status !== 200 || !r.json) return enviar(res, 200, errProv(r));
          return enviar(res, 200, { ok: true, status: r.json.status, reason: r.json.reason || null, name: (r.json.player && r.json.player.name) || null });
        }
        const key = String(b.idempotency_key || '');
        if(!/^[A-Za-z0-9_-]{8,255}$/.test(key)) return enviar(res, 200, { ok: false, http: 400, code: 'clave_invalida', message: 'idempotency_key inválida (8 a 255 caracteres A-Z a-z 0-9 _ -)' });
        const r = await co('/orders', { method: 'POST', headers: { 'Idempotency-Key': key },
          body: { items: [{ catalog_item_id: rs.item.product_id, quantity: 1, target_payload: tg.payload }], note: String(b.note || '').slice(0, 200) } });
        if((r.status !== 201 && r.status !== 200) || !r.json || !r.json.order) return enviar(res, 200, errProv(r));
        const o = r.json.order;
        return enviar(res, 200, { ok: true, order: { id: o.id, reference_code: o.reference_code, status: o.status, total_sale_amount: o.total_sale_amount, currency: o.currency }, producto: { nombre: rs.meta.nombre, sku: rs.meta.sku, precio: rs.meta.precio } });
      }
      case 'status': {
        const id = String(b.order_id || '');
        if(!/^[0-9a-fA-F-]{36}$/.test(id)) return enviar(res, 200, { ok: false, http: 400, code: 'id_pedido_invalido', message: 'order_id inválido' });
        const r = await co('/orders/' + id);
        if(r.status !== 200 || !r.json || !r.json.order) return enviar(res, 200, errProv(r));
        const o = r.json.order;
        return enviar(res, 200, { ok: true, order: { status: o.status, reference_code: o.reference_code, refund: o.refund || null, failure: o.failure || null,
          items: (o.items || []).map(i => ({ status: i.status, delivered_count: i.delivered_count, refund: i.refund || null, failure: i.failure || null })) } });
      }
      default:
        return enviar(res, 400, { ok: false, code: 'accion', message: 'Acción desconocida' });
    }
  }catch(e){
    const timeout = e && e.name === 'AbortError';
    return enviar(res, 200, { ok: false, http: 0, code: timeout ? 'timeout' : 'proxy_error', message: timeout ? 'La API tardó demasiado: revisa en el proveedor antes de repetir' : 'Error al contactar al proveedor' });
  }
};

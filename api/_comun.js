// ═══════════════════════════════════════════════════════════════════════════
// api/_comun.js (CiberStore) · Lógica compartida (catálogo de productos, precios, detección en Central One y cliente de la API).
// El guion bajo evita que Vercel lo publique como ruta. Aquí es donde cambias los PRECIOS.
// ═══════════════════════════════════════════════════════════════════════════
'use strict';

const BASE = (process.env.CO_BASE || 'https://portal.centraloneglobal.com/api/v1').replace(/\/+$/, '');
const TOL  = Number(process.env.CO_TOLERANCIA || 0.35);      // cuánto se puede alejar un diamante de su costo de referencia
const TC   = Number(process.env.CO_TC || 19.5);              // pesos por dólar para la protección contra venta bajo costo
const PROTEGER_MARGEN = !/^(0|false|off|no)$/i.test(String(process.env.CO_PROTEGER_MARGEN || '1'));

// ── PRECIOS DE REFERENCIA (MXN) ── Solo para calcular el margen en el panel. Los diamantes de CiberStore se calculan en USD con el tipo de cambio del día.
// refUsd = costo de referencia del proveedor (solo diamantes), sirve para no comprar un producto equivocado.
const PRODUCTOS = [
  { clave:'d110',  grupo:'diamantes', titulo:'110 Diamantes',   precio:13.26, num:110,  base:100,  refUsd:0.6650 },
  { clave:'d341',  grupo:'diamantes', titulo:'341 Diamantes',   precio:46.86, num:341,  base:310,  refUsd:1.9999 },
  { clave:'d572',  grupo:'diamantes', titulo:'572 Diamantes',   precio:69.27, num:572,  base:520,  refUsd:3.3955 },
  { clave:'d1166', grupo:'diamantes', titulo:'1,166 Diamantes', precio:130.15, num:1166, base:1060, refUsd:6.3089 },
  { clave:'d2398', grupo:'diamantes', titulo:'2,398 Diamantes', precio:246.97, num:2398, base:2180, refUsd:12.5203 },
  { clave:'d6160', grupo:'diamantes', titulo:'6,160 Diamantes', precio:630.37, num:6160, base:5600, refUsd:31.8640 },

  { clave:'tsb', grupo:'tarjetas', titulo:'Tarjeta Semanal Básica', precio:8,   tipo:'semanal_basica' },
  { clave:'ts',  grupo:'tarjetas', titulo:'Tarjeta Semanal',        precio:35,  tipo:'semanal' },
  { clave:'tm',  grupo:'tarjetas', titulo:'Tarjeta Mensual',        precio:165, tipo:'mensual' },

  { clave:'n6',  grupo:'niveles', titulo:'Paquete Nivel 6',  precio:4.5, nivel:6 },
  { clave:'n10', grupo:'niveles', titulo:'Paquete Nivel 10', precio:10,  nivel:10 },
  { clave:'n15', grupo:'niveles', titulo:'Paquete Nivel 15', precio:10,  nivel:15 },
  { clave:'n20', grupo:'niveles', titulo:'Paquete Nivel 20', precio:10,  nivel:20 },
  { clave:'n25', grupo:'niveles', titulo:'Paquete Nivel 25', precio:10,  nivel:25 },
  { clave:'n30', grupo:'niveles', titulo:'Paquete Nivel 30', precio:12,  nivel:30 }
];
const POR_CLAVE = {}; PRODUCTOS.forEach(p => { POR_CLAVE[p.clave] = p; });

function enviar(res, body){
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}
const dormir = ms => new Promise(r => setTimeout(r, ms));
const hits = new Map();
function ipDe(req){ return String((req.headers['x-forwarded-for'] || (req.socket && req.socket.remoteAddress) || 'x')).split(',')[0].trim(); }
function limite(ip, clave, max){ const k = clave + ip, t = Date.now(), l = (hits.get(k) || []).filter(x => t - x < 60000); l.push(t); hits.set(k, l); return l.length > max; }

// ── Cliente de Central One (la llave NUNCA sale de aquí) ──
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
    return { status: r.status, json: j, rid: r.headers.get('x-request-id'), retry: r.headers.get('retry-after') };
  } finally { clearTimeout(t); }
}
function errProv(r){
  const e = (r.json && r.json.error) || {};
  return { ok: false, http: r.status, code: e.code || ('http_' + r.status), message: e.message || '', request_id: e.request_id || r.rid || null, retry_after: r.retry ? Number(r.retry) : undefined };
}
let cache = { t: 0, items: null };
async function catalogo(){
  if(cache.items && Date.now() - cache.t < 60000) return { ok: true, items: cache.items };
  const r = await co('/catalog');
  if(r.status !== 200 || !r.json || !Array.isArray(r.json.items)) return errProv(r);
  cache = { t: Date.now(), items: r.json.items }; return { ok: true, items: cache.items };
}

// ── Detección de cada producto dentro del catálogo ──
const norm = t => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/(\d)[.,](?=\d{3}(?!\d))/g, '$1');
function tieneNum(txt, n){ return new RegExp('(?<![0-9])' + n + '(?![0-9])').test(txt); }
function esFFLatam(it){
  if(!/free\s*fire/i.test((it.product_family_name || '') + ' ' + (it.name || ''))) return false;
  const rx = process.env.CO_REGION_REGEX ? new RegExp(process.env.CO_REGION_REGEX, 'i') : /lat|latam|latin/i;
  return rx.test((it.region || '') + ' ' + (it.market || '') + ' ' + (it.name || ''));
}
const EXCLUIR_DIAM = /pase|pass|tarjeta|card|semanal|mensual|weekly|monthly|membres|member|nivel|level|lvl|upgrade|subida/i;
function coincide(p, it){
  const t = norm((it.name || '') + ' ' + (it.sku || ''));
  if(p.grupo === 'diamantes') return !EXCLUIR_DIAM.test(t) && (tieneNum(t, p.num) || (tieneNum(t, p.base) && /bono|bonus|%/.test(t)));
  if(p.grupo === 'tarjetas'){
    const basica = /(basic|lite|light)/.test(t);
    if(p.tipo === 'semanal_basica') return /(semanal|weekly)/.test(t) && basica;
    if(p.tipo === 'semanal') return /(semanal|weekly)/.test(t) && !basica;
    if(p.tipo === 'mensual') return /(mensual|monthly)/.test(t);
  }
  if(p.grupo === 'niveles') return new RegExp('(nivel|level|lvl|lv)\\.?\\s*' + p.nivel + '(?![0-9])').test(t) && !/(semanal|weekly|mensual|monthly|diamante|diamond)/.test(t);
  return false;
}
// Devuelve { estado, item, ... } por producto. Si hay más de un candidato (y no es diamante) NO se elige: se marca "ambiguo".
function detectar(items, opts){
  const margen = !(opts && opts.margen === false);
  let fijo = {}; try{ fijo = JSON.parse(process.env.CO_MAP || '{}'); }catch(e){}
  const cand = items.filter(esFFLatam), out = {};
  PRODUCTOS.forEach(p => {
    let item = null, via = 'auto', n = 0, estado = 'ok';
    const fj = fijo[p.clave] || (p.num ? fijo[String(p.num)] : null);
    if(fj){ item = items.find(x => x.product_id === fj) || null; via = 'CO_MAP'; n = item ? 1 : 0; }
    else {
      const ac = cand.filter(it => coincide(p, it)); n = ac.length;
      if(p.grupo === 'diamantes') ac.sort((a, b) => Math.abs(parseFloat(a.reseller_price) - p.refUsd) - Math.abs(parseFloat(b.reseller_price) - p.refUsd));
      if(n === 1 || (n > 1 && p.grupo === 'diamantes')) item = ac[0];
      else if(n > 1) estado = 'ambiguo';
    }
    const precioUsd = item ? parseFloat(item.reseller_price) : NaN;
    if(estado === 'ok'){
      if(!item) estado = 'no_detectado';
      else if(!(precioUsd > 0)) estado = 'precio_invalido';
      else if(p.refUsd && Math.abs(precioUsd - p.refUsd) / p.refUsd > TOL) estado = 'precio_fuera_de_rango';
      else if(margen && PROTEGER_MARGEN && p.precio < precioUsd * TC) estado = 'bajo_costo';
      else if(item.in_stock === false) estado = 'sin_stock';
    }
    out[p.clave] = { clave: p.clave, estado, via, candidatos: n, producto: p, item, precioUsd: item ? item.reseller_price : null,
      costoMxn: precioUsd > 0 ? Math.round(precioUsd * TC * 100) / 100 : null };
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
async function resolver(clave, opts){
  const p = POR_CLAVE[clave]; if(!p) return { ok: false, http: 400, code: 'producto_desconocido', message: 'Producto no disponible' };
  const c = await catalogo(); if(!c.ok) return c;
  const d = detectar(c.items, opts)[clave];
  const MSG = { no_detectado: 'No encontré este producto en el catálogo del proveedor', ambiguo: 'Hay varios productos que coinciden: fíjalo con CO_MAP', precio_invalido: 'Precio del proveedor inválido',
    precio_fuera_de_rango: 'El precio del proveedor está fuera de lo esperado', bajo_costo: 'Tu precio de venta quedó por debajo del costo del proveedor', sin_stock: 'Sin stock en el proveedor' };
  if(d.estado !== 'ok') return { ok: false, http: 409, code: d.estado === 'sin_stock' ? 'insufficient_stock' : d.estado, message: MSG[d.estado] || d.estado, estado: d.estado };
  return { ok: true, item: d.item, meta: d, producto: p };
}
module.exports = { BASE, TOL, TC, PRODUCTOS, POR_CLAVE, enviar, dormir, ipDe, limite, co, errProv, catalogo, detectar, armarTarget, resolver, norm };

// ═══════════════════════════════════════════════════════════════════════════
// api/co.js · Servidor intermedio hacia Central One (solo para tu panel admin, con tu token CO_ADMIN_TOKEN).
// Acciones: ping · balance · paquetes · catalogo · validate · order · status
//   validate/order aceptan  {producto:'d110'|'tsb'|'n6'…}  o, como antes,  {diamantes:110}
// Variables de entorno en Vercel: CO_API_KEY, CO_ADMIN_TOKEN  (opcionales: CO_MAP, CO_TOLERANCIA, CO_REGION_REGEX, CO_TC)
// Requiere api/_comun.js (productos y detección). La llave del proveedor vive SOLO aquí.
// ═══════════════════════════════════════════════════════════════════════════
'use strict';
const crypto = require('crypto');
const C = require('./_comun.js');

function enviar(res, status, body){ res.statusCode = status; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('Cache-Control', 'no-store'); res.end(JSON.stringify(body)); }
const iguales = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };
const fallos = new Map();
function bloqueada(ip){ const t = Date.now(), l = (fallos.get(ip) || []).filter(x => t - x < 60000); fallos.set(ip, l); return l.length >= 8; }
function anotarFallo(ip){ const l = fallos.get(ip) || []; l.push(Date.now()); fallos.set(ip, l); }
const claveDe = b => String(b.producto || (b.diamantes ? 'd' + Number(b.diamantes) : ''));

module.exports = async function handler(req, res){
  try{
    if(req.method !== 'POST') return enviar(res, 405, { ok: false, code: 'metodo', message: 'Usa POST' });
    if(!process.env.CO_API_KEY || !process.env.CO_ADMIN_TOKEN) return enviar(res, 500, { ok: false, code: 'config', message: 'Falta configurar CO_API_KEY y CO_ADMIN_TOKEN en Vercel' });
    const ip = C.ipDe(req);
    if(bloqueada(ip)) return enviar(res, 429, { ok: false, code: 'demasiados_intentos', message: 'Demasiados intentos. Espera un minuto.' });
    if(!iguales(req.headers['x-admin-token'] || '', process.env.CO_ADMIN_TOKEN)){ anotarFallo(ip); return enviar(res, 401, { ok: false, code: 'no_autorizado', message: 'Token incorrecto' }); }
    const b = (req.body && typeof req.body === 'object') ? req.body : {};

    switch(b.action){
      case 'ping': { const r = await C.co('/ping'); return enviar(res, 200, r.status === 200 ? { ok: true } : C.errProv(r)); }
      case 'balance': {
        const r = await C.co('/balance'); if(r.status !== 200 || !r.json) return enviar(res, 200, C.errProv(r));
        return enviar(res, 200, { ok: true, available: r.json.available_balance, held: r.json.held_balance, total: r.json.total_balance, currency: r.json.currency });
      }
      case 'paquetes': {
        const c = await C.catalogo(); if(!c.ok) return enviar(res, 200, c);
        const det = C.detectar(c.items), lim = x => ({ product_id: x.product_id, nombre: x.name, sku: x.sku, region: x.region, precio: x.reseller_price, in_stock: x.in_stock });
        const todos = C.PRODUCTOS.map(p => { const d = det[p.clave], costo = d.costoMxn, cu = parseFloat(d.precioUsd), margen = cu > 0 ? Math.round((p.usd - cu) / cu * 1000) / 10 : null;
          return { clave: p.clave, grupo: p.grupo, titulo: p.titulo, precio_mxn: p.precio, precio_usd_venta: p.usd, estado: d.estado, via: d.via, candidatos: d.candidatos, product_id: d.item ? d.item.product_id : null,
            nombre: d.item ? d.item.name : null, sku: d.item ? d.item.sku : null, precio_usd: d.precioUsd, costo_mxn_aprox: costo, margen_pct: margen }; });
        // formato anterior (solo diamantes) para lo que ya usa tu panel y catalogo-co.html
        const paquetes = C.PRODUCTOS.filter(p => p.grupo === 'diamantes').map(p => { const d = det[p.clave]; return { diamantes: p.num, estado: d.estado, via: d.via, ref: p.refUsd, product_id: d.item ? d.item.product_id : null, nombre: d.item ? d.item.name : null, sku: d.item ? d.item.sku : null, precio: d.precioUsd, in_stock: d.item ? d.item.in_stock : null }; });
        return enviar(res, 200, { ok: true, tolerancia: C.TOL, tc: C.TC, paquetes, productos: todos,
          candidatos: c.items.filter(it => /free\s*fire/i.test((it.product_family_name || '') + ' ' + (it.name || ''))).slice(0, 120).map(lim) });
      }
      case 'catalogo': {
        const c = await C.catalogo(); if(!c.ok) return enviar(res, 200, c);
        const todos = c.items.slice().sort((x, y) => String(x.product_id).localeCompare(String(y.product_id)));
        const off = Math.max(0, parseInt(b.offset, 10) || 0), lim = Math.min(3000, Math.max(1, parseInt(b.limit, 10) || 2000));
        return enviar(res, 200, { ok: true, total: todos.length, offset: off, siguiente: (off + lim < todos.length) ? off + lim : null, items: todos.slice(off, off + lim).map(x => ({
          product_id: x.product_id, nombre: x.name, sku: x.sku, familia: x.product_family_name, categoria: x.category, tipo: x.product_type, region: x.region, precio: x.reseller_price, moneda: x.currency, in_stock: x.in_stock, campos: x.target_fields })) });
      }
      case 'validate':
      case 'order': {
        const pid = String(b.player_id || '').trim(), clave = claveDe(b);
        if(!/^\d{5,15}$/.test(pid)) return enviar(res, 200, { ok: false, http: 400, code: 'id_invalido', message: 'El ID de Free Fire debe ser numérico (5 a 15 dígitos)' });
        if(!C.POR_CLAVE[clave]) return enviar(res, 200, { ok: false, http: 400, code: 'paquete_no_permitido', message: 'Producto no permitido' });
        const rs = await C.resolver(clave, { margen: false });   // el pago ya se recibió: aquí no se bloquea por margen
        if(!rs.ok) return enviar(res, 200, rs);
        const tg0 = C.armarTarget(rs.item, pid);
        if(tg0.faltan) return enviar(res, 200, { ok: false, http: 400, code: 'campo_requerido', message: 'El producto pide datos extra que no sé llenar: ' + tg0.faltan.join(', ') });
        const tg = tg0.payload;
        if(b.action === 'validate'){
          const r = await C.co('/player/validate', { method: 'POST', body: { product_id: rs.item.product_id, target_payload: tg } });
          if(r.status !== 200 || !r.json) return enviar(res, 200, C.errProv(r));
          return enviar(res, 200, { ok: true, status: r.json.status, reason: r.json.reason || null, name: (r.json.player && r.json.player.name) || null });
        }
        const key = String(b.idempotency_key || '');
        if(!/^[A-Za-z0-9_-]{8,255}$/.test(key)) return enviar(res, 200, { ok: false, http: 400, code: 'clave_invalida', message: 'idempotency_key inválida (8 a 255 caracteres A-Z a-z 0-9 _ -)' });
        const r = await C.co('/orders', { method: 'POST', headers: { 'Idempotency-Key': key }, body: { items: [{ catalog_item_id: rs.item.product_id, quantity: 1, target_payload: tg }], note: String(b.note || '').slice(0, 200) } });
        if((r.status !== 201 && r.status !== 200) || !r.json || !r.json.order) return enviar(res, 200, C.errProv(r));
        const o = r.json.order;
        return enviar(res, 200, { ok: true, order: { id: o.id, reference_code: o.reference_code, status: o.status, total_sale_amount: o.total_sale_amount, currency: o.currency }, producto: { nombre: rs.item.name, sku: rs.item.sku, precio: rs.item.reseller_price } });
      }
      case 'status': {
        const id = String(b.order_id || ''); if(!/^[0-9a-fA-F-]{36}$/.test(id)) return enviar(res, 200, { ok: false, http: 400, code: 'id_pedido_invalido', message: 'order_id inválido' });
        const r = await C.co('/orders/' + id); if(r.status !== 200 || !r.json || !r.json.order) return enviar(res, 200, C.errProv(r));
        const o = r.json.order;
        return enviar(res, 200, { ok: true, order: { status: o.status, reference_code: o.reference_code, refund: o.refund || null, failure: o.failure || null, items: (o.items || []).map(i => ({ status: i.status, delivered_count: i.delivered_count, refund: i.refund || null, failure: i.failure || null })) } });
      }
      default: return enviar(res, 400, { ok: false, code: 'accion', message: 'Acción desconocida' });
    }
  }catch(e){
    const timeout = e && e.name === 'AbortError';
    return enviar(res, 200, { ok: false, http: 0, code: timeout ? 'timeout' : 'proxy_error', message: timeout ? 'La API tardó demasiado: revisa en el proveedor antes de repetir' : 'Error al contactar al proveedor' });
  }
};

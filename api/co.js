// ═══════════════════════════════════════════════════════════════════════════
// api/co.js · Servidor intermedio hacia Central One (solo para tu panel admin, con tu token CO_ADMIN_TOKEN).
// Acciones: ping · balance · paquetes · catalogo · validate · order · status
//   validate/order aceptan  {producto:'d110'|'tsb'|'n6'…}  o, como antes,  {diamantes:110}
// Variables de entorno en Vercel: CO_API_KEY, CO_ADMIN_TOKEN  (opcionales: CO_MAP, CO_TOLERANCIA, CO_REGION_REGEX, CO_TC)
// Acepta tu sesión del panel (api/admin.js) en lugar del CO_ADMIN_TOKEN: así solo inicias sesión una vez.
// Requiere api/_comun.js (productos y detección). La llave del proveedor vive SOLO aquí.
// ═══════════════════════════════════════════════════════════════════════════
'use strict';
const crypto = require('crypto');
const C = require('./_comun.js');
const A = require('./_alerta.js');
const S = require('./_sesion.js');

function enviar(res, status, body){ res.statusCode = status; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('Cache-Control', 'no-store'); res.end(JSON.stringify(body)); }
const iguales = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };
const fallos = new Map();
function bloqueada(ip){ const t = Date.now(), l = (fallos.get(ip) || []).filter(x => t - x < 60000); fallos.set(ip, l); return l.length >= 8; }
function anotarFallo(ip){ const l = fallos.get(ip) || []; l.push(Date.now()); fallos.set(ip, l); }
// ── Auditoría del catálogo nuevo: busca cada producto de la tienda en el catálogo REAL de Central One ──
// No compra nada. Solo compara nombres dentro de la familia del juego y reporta lo que encuentra (o no).
const FAMILIAS = { 'blood strike': /blood\s*strike/i, 'call of duty': /call\s*of\s*duty|cod\s*mobile|codm/i, 'pubg': /pubg/i, 'fortnite': /fortnite|v-?bucks/i,
  'discord': /discord|nitro/i, 'minecraft': /minecraft|minecoin/i, 'roblox': /roblox|robux/i };
const nTok = s => C.norm(s).replace(/[^a-z0-9.\s]/g, ' ').split(/\s+/).filter(Boolean);
const nNums = s => (C.norm(s).match(/\d+(?:\.\d+)?/g) || []);
const PALABRAS_VACIAS = new Set(['de', 'del', 'la', 'el', 'and', 'the', 'for', 'pc', 'global', 'usd', 'pin', 'code', 'codigo', 'card', 'gift', 'subscription', 'suscripcion', 'edition']);
// Devuelve { s, extra }: s = 0.5 si los números coinciden + 0.5 × (palabras del producto que aparecen); extra = palabras de más en el nombre del proveedor.
// Para aceptar, deben aparecer al menos el 75 % de las palabras que distinguen al producto (s ≥ 0.875).
function puntaje(p, it){
  const txt = (it.name || '') + ' ' + (it.sku || ''), cn = nNums(txt), pn = nNums(p.n);
  if(pn.some(x => cn.indexOf(x) < 0)) return { s: 0, extra: 99 };       // todos los números del producto deben aparecer (60 UC ≠ 660 UC)
  const util = t => !/^\d/.test(t) && t.length > 1 && !PALABRAS_VACIAS.has(t);
  const pw = nTok(p.n).filter(util), ct = nTok(it.name || '').filter(util), fam = new Set(nTok(it.product_family_name || '')), pset = new Set(pw);
  const tw = pw.length ? pw.filter(t => ct.indexOf(t) >= 0 || nTok(txt).indexOf(t) >= 0).length / pw.length : 1;
  const extra = ct.filter(t => !pset.has(t) && !fam.has(t)).length;
  return { s: Math.round((0.5 + 0.5 * tw) * 1000) / 1000, extra };
}
function imagenDe(it){
  for(const k of Object.keys(it || {})) if(/image|img|logo|icon|thumb|picture|banner|cover/i.test(k)){ const v = it[k];
    if(typeof v === 'string' && /^https?:\/\//.test(v)) return v;
    if(v && typeof v === 'object'){ for(const k2 of Object.keys(v)) if(typeof v[k2] === 'string' && /^https?:\/\//.test(v[k2])) return v[k2]; } }
  return null;
}
const resumenItem = it => ({ product_id: it.product_id, nombre: it.name, sku: it.sku, familia: it.product_family_name, categoria: it.category, tipo: it.product_type, region: it.region,
  precio: it.reseller_price, moneda: it.currency, in_stock: it.in_stock, requiere_id: it.requires_target === true || (Array.isArray(it.target_fields) && it.target_fields.length > 0),
  campos: it.target_fields || [], imagen: imagenDe(it) });
const claveDe = b => String(b.producto || (b.diamantes ? 'd' + Number(b.diamantes) : ''));

module.exports = async function handler(req, res){
  try{
    if(req.method !== 'POST') return enviar(res, 405, { ok: false, code: 'metodo', message: 'Usa POST' });
    if(!process.env.CO_API_KEY || !process.env.CO_ADMIN_TOKEN) return enviar(res, 500, { ok: false, code: 'config', message: 'Falta configurar CO_API_KEY y CO_ADMIN_TOKEN en Vercel' });
    const ip = C.ipDe(req);
    if(bloqueada(ip)) return enviar(res, 429, { ok: false, code: 'demasiados_intentos', message: 'Demasiados intentos. Espera un minuto.' });
    // Sirve tu sesión del panel (iniciada con ADMIN_EMAIL / ADMIN_PASSWORD) o, como antes, el CO_ADMIN_TOKEN
    const tk = String(req.headers['x-admin-token'] || '');
    if(!(S.verificar(tk) || iguales(tk, process.env.CO_ADMIN_TOKEN))){ anotarFallo(ip); return enviar(res, 401, { ok: false, code: 'no_autorizado', message: 'Sesión vencida o token incorrecto' }); }
    const b = (req.body && typeof req.body === 'object') ? req.body : {};

    switch(b.action){
      case 'ping': { const r = await C.co('/ping'); return enviar(res, 200, r.status === 200 ? { ok: true } : C.errProv(r)); }
      case 'balance': {
        const r = await C.co('/balance'); if(r.status !== 200 || !r.json) return enviar(res, 200, C.errProv(r));
        return enviar(res, 200, { ok: true, available: r.json.available_balance, held: r.json.held_balance, total: r.json.total_balance, currency: r.json.currency });
      }
      case 'proteccion': {
        A.invalidar(); const e = await A.estado(0);
        return enviar(res, 200, { ok: true, umbral: A.umbral(), saldo: e.saldo, pausa: !!e.pausa, verificado: e.verificado, repite_cada_min: A.cadaMin(), via: (process.env.TG_BOT_TOKEN && process.env.TG_CHAT_ID) ? 'telegram' : 'supabase' });
      }
      case 'probar_alerta': { const r = await A.enviarPrueba(); return enviar(res, 200, { ok: !!r.enviado, via: r.via, http: r.http || null }); }
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
      case 'auditar': {
        const lista = Array.isArray(b.productos) ? b.productos.slice(0, 300) : [];
        const c = await C.catalogo(); if(!c.ok) return enviar(res, 200, c);
        const porFam = {}, camposVistos = new Set();
        Object.keys(FAMILIAS).forEach(f => { porFam[f] = c.items.filter(it => FAMILIAS[f].test((it.product_family_name || '') + ' ' + (it.name || '') + ' ' + (it.category || ''))); porFam[f].slice(0, 50).forEach(it => Object.keys(it).forEach(x => camposVistos.add(x))); });
        const resultados = lista.map(p => {
          const fam = String(p.fam || ''), cand = porFam[fam] || [];
          const orden = cand.map(it => Object.assign({ it }, puntaje(p, it))).filter(x => x.s >= 0.875).sort((a, b) => (b.s - a.s) || (a.extra - b.extra));
          const top = orden[0], empate = orden[1] && top && orden[1].s === top.s && orden[1].extra === top.extra;
          return { id: p.id, estado: !cand.length ? 'familia_no_encontrada' : (!top ? 'no_encontrado' : (empate ? 'ambiguo' : 'ok')), puntaje: top ? top.s : 0,
            match: top ? resumenItem(top.it) : null, alternativas: orden.slice(1, 3).map(x => resumenItem(x.it)) };
        });
        return enviar(res, 200, { ok: true, total_catalogo: c.items.length, familias: Object.fromEntries(Object.keys(porFam).map(f => [f, porFam[f].length])),
          campos_catalogo: Array.from(camposVistos).sort(), con_imagen: resultados.filter(r => r.match && r.match.imagen).length, resultados });
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

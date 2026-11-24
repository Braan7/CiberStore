// API pública para REVENDEDORES de CiberStore (diamantes, cajas y fragmentos).
//  · Se llama desde api/comprar.js (ctx = utilidades de ese archivo) → no suma funciones nuevas en Vercel.
//  · Auth: llave API en el encabezado  X-Api-Key: csk_…  (o  Authorization: Bearer csk_…). Solo se guarda su huella sha256.
//  · Los pedidos se descuentan del saldo de la cuenta dueña de la llave y se entregan solos (Central One).
const crypto = require('crypto');
const huella = k => crypto.createHash('sha256').update(String(k)).digest('hex');
const PKG = { 110: 351, 341: 348, 572: 350, 1166: 347, 2398: 346, 6160: 349 };   // diamantes → package_id de la tienda
const ESTADO = { procesando: 'PENDING', enviada: 'PENDING', completada: 'COMPLETED', rechazada: 'REFUNDED', verificar: 'REVIEW' };
const MENSAJE = { PENDING: 'En proceso: consulta el estado en unos segundos.', COMPLETED: 'Entregado.', REFUNDED: 'No se pudo entregar: el importe se devolvió a tu saldo.', REVIEW: 'En revisión por CiberStore (no se reembolsó todavía).' };

function pub(o){
  const st = ESTADO[o.estado] || 'PENDING';
  return { id: Number(o.id), client_order_id: o.ref_cliente, product: o.producto, name: o.nombre, player_id: o.ff_id, price: Number(o.precio), currency: 'MXN', status: st, message: o.detalle && st !== 'COMPLETED' ? o.detalle : MENSAJE[st], created_at: o.creada, closed_at: o.cerrada || null };
}
const err = (res, ctx, status, code, message, extra) => ctx.enviar(res, Object.assign({ ok: false, code, message }, extra || {}), status);

// ───── llaves (las administra el cliente desde su perfil, con su sesión normal) ─────
async function llaves(ctx, a, b, uid){
  const { rest, enviar, limite } = ctx;
  if(a === 'api_llaves'){
    const r = await rest('api_llaves?user_id=eq.' + encodeURIComponent(uid) + '&select=id,nombre,prefijo,activa,creada,ultimo_uso,vence&order=id.desc&limit=20');
    if(r.status >= 400 || !Array.isArray(r.json)) return enviar(ctx.res, { ok: false, code: 'db', message: 'Falta ejecutar api_revendedores.sql en Supabase.' });
    return enviar(ctx.res, { ok: true, llaves: r.json.map(x => ({ id: x.id, nombre: x.nombre, prefijo: x.prefijo, activa: x.activa, creada: x.creada, ultimo_uso: x.ultimo_uso, vence: x.vence || null })) });
  }
  if(a === 'api_llave_crear') return enviar(ctx.res, { ok: false, code: 'solo_admin', message: 'Las llaves las entrega CiberStore. Escríbenos por WhatsApp para activar tu acceso a la API.' });
  if(a === 'api_llave_revocar'){
    const id = Number(b.id); if(!(id > 0)) return enviar(ctx.res, { ok: false, code: 'solicitud', message: 'Llave inválida' });
    await rest('api_llaves?id=eq.' + id + '&user_id=eq.' + encodeURIComponent(uid), { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ activa: false }) });
    return enviar(ctx.res, { ok: true });
  }
  return enviar(ctx.res, { ok: false, code: 'accion', message: 'Acción desconocida' });
}

// ───── catálogo para revendedores ─────
async function catalogo(ctx){
  const { rest, leerCatalogo, llamarProveedor } = ctx;
  const [vp, k, dsp] = await Promise.all([rest('vip_precios?activo=eq.true&select=package_id,diamantes,nombre,precio_cliente&order=orden.asc'), leerCatalogo(), llamarProveedor({ action: 'disponibilidad' }, ctx.req).catch(() => null)]);
  const pk = dsp && dsp.paquetes ? dsp.paquetes : null, pausa = !!(dsp && dsp.disponible === false);
  const out = [];
  (Array.isArray(vp.json) ? vp.json : []).forEach(x => { if(!PKG[x.diamantes]) return; out.push({ product: 'dm_' + x.diamantes, type: 'diamantes', name: x.nombre, units: x.diamantes, price: Number(x.precio_cliente), currency: 'MXN', available: !pausa && (pk ? pk[x.diamantes] !== false : true) }); });
  (k.productos || []).filter(x => (x.grupo === 'caja' || x.grupo === 'fragmento') && x.entrega === 'auto' && x.srv).forEach(x => out.push({ product: x.clave, type: x.grupo, name: x.nombre, price: Number(x.precio), currency: 'MXN', available: true }));
  return out;
}

// ───── consulta y actualización de un pedido ─────
async function refrescar(ctx, o){
  if(!o || (o.estado !== 'enviada' && o.estado !== 'verificar')) return o;
  const { rpc, rest, llamarProveedor } = ctx; let pr = null;
  const oid = o.proveedor && o.proveedor.order_id;
  if(oid) pr = await llamarProveedor({ action: 'estado', order_id: oid }, ctx.req);
  else if(o.estado === 'verificar') pr = await llamarProveedor({ action: 'buscar', client_name: o.username, idempotency_key: 'cs-api' + o.id, regalo: o.tipo !== 'diamantes' }, ctx.req);
  if(!(pr && pr.success)) return o;
  let est = null, ref = Object.assign({}, o.proveedor || {}, { order_id: pr.order_id || oid || null, reference: pr.reference || null });
  if(pr.status === 'COMPLETED') est = 'completada';
  else if(pr.status === 'REFUNDED' || pr.status === 'FAILED') est = o.estado === 'verificar' ? null : 'rechazada';   // lo que está en revisión lo decide una persona
  else if(pr.status === 'PENDING' && o.estado === 'verificar') est = 'enviada';
  if(!est) return o;
  await rpc('api_cerrar', { p_id: o.id, p_estado: est, p_ref: ref, p_detalle: est === 'rechazada' ? 'El proveedor devolvió el pedido' : null });
  const r = await rest('api_pedidos?id=eq.' + o.id + '&limit=1'); return Array.isArray(r.json) && r.json[0] ? r.json[0] : o;
}

async function manejar(ctx, req, res, partes){
  const { rest, rpc, enviar, limite, telegram, esc, llamarProveedor, ip, msgErr, errorSql } = ctx;
  ctx.req = req; ctx.res = res;
  res.setHeader('Access-Control-Allow-Origin', '*'); res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Api-Key, Authorization'); res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if(req.method === 'OPTIONS'){ res.statusCode = 204; return res.end(); }
  if(limite('v1ip|' + ip, 240, 60000)) return err(res, ctx, 429, 'rate_limit', 'Demasiadas solicitudes. Espera un momento.');
  const h = req.headers || {}, bruto = String(h['x-api-key'] || String(h.authorization || '').replace(/^Bearer\s+/i, '') || '').trim();
  if(!/^csk_[0-9a-f]{48}$/.test(bruto)) return err(res, ctx, 401, 'unauthorized', 'Falta la llave API (encabezado X-Api-Key) o no es válida.');
  const kr = await rest('api_llaves?huella=eq.' + huella(bruto) + '&activa=eq.true&select=id,user_id,vence&limit=1');
  if(kr.status >= 400 && !Array.isArray(kr.json)) return err(res, ctx, 503, 'db', 'Servicio no disponible por ahora.');
  const k = Array.isArray(kr.json) ? kr.json[0] : null;
  if(!k) return err(res, ctx, 401, 'unauthorized', 'Llave API inválida o revocada.');
  if(k.vence && new Date(k.vence).getTime() < Date.now()) return err(res, ctx, 402, 'expired', 'Tu suscripción de la API venció el ' + new Date(k.vence).toISOString().slice(0, 10) + '. Escribe a CiberStore para renovarla.');
  if(limite('v1k|' + k.id, 120, 60000)) return err(res, ctx, 429, 'rate_limit', 'Límite de 120 solicitudes por minuto por llave.');
  const rp = await rest('profiles?id=eq.' + encodeURIComponent(k.user_id) + '&select=id,username,saldo,banned&limit=1'), p = Array.isArray(rp.json) ? rp.json[0] : null;
  if(!p) return err(res, ctx, 401, 'unauthorized', 'La cuenta de esta llave ya no existe.');
  if(p.banned) return err(res, ctx, 403, 'suspended', 'Tu cuenta está suspendida. Contacta a soporte.');
  rest('api_llaves?id=eq.' + k.id, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ ultimo_uso: new Date().toISOString() }) }).catch(() => {});
  const uid = String(p.id), r0 = partes[0] || '', r1 = partes[1] || '';

  if(r0 === 'balance' && req.method === 'GET') return enviar(res, { ok: true, account: p.username, balance: Number(p.saldo) || 0, currency: 'MXN' });
  if(r0 === 'products' && req.method === 'GET') return enviar(res, { ok: true, currency: 'MXN', products: await catalogo(ctx) });

  if(r0 === 'orders' && req.method === 'GET'){
    let o = null;
    if(r1 || new URL(req.url, 'http://x').searchParams.get('client_order_id')){
      const q = r1 ? (/^[0-9]+$/.test(r1) ? 'id=eq.' + r1 : null) : 'ref_cliente=eq.' + encodeURIComponent(new URL(req.url, 'http://x').searchParams.get('client_order_id'));
      if(!q) return err(res, ctx, 400, 'bad_request', 'Pedido inválido.');
      const r = await rest('api_pedidos?' + q + '&user_id=eq.' + encodeURIComponent(uid) + '&limit=1'); o = Array.isArray(r.json) ? r.json[0] : null;
      if(!o) return err(res, ctx, 404, 'not_found', 'No encontramos ese pedido.');
      o = await refrescar(ctx, o); return enviar(res, { ok: true, order: pub(o) });
    }
    const r = await rest('api_pedidos?user_id=eq.' + encodeURIComponent(uid) + '&select=*&order=id.desc&limit=50');
    return enviar(res, { ok: true, orders: (Array.isArray(r.json) ? r.json : []).map(pub) });
  }

  if(r0 === 'orders' && req.method === 'POST'){
    if(limite('v1o|' + k.id, 30, 60000)) return err(res, ctx, 429, 'rate_limit', 'Máximo 30 pedidos por minuto.');
    const b = (req.body && typeof req.body === 'object') ? req.body : {};
    const prod = String(b.product || ''), ff = String(b.player_id || ''), ref = String(b.client_order_id || '');
    if(!/^[A-Za-z0-9_.-]{4,64}$/.test(ref)) return err(res, ctx, 400, 'bad_request', 'client_order_id es obligatorio: de 4 a 64 caracteres (letras, números, _ . -). Sirve para no duplicar pedidos.');
    if(!/^[0-9]{5,15}$/.test(ff)) return err(res, ctx, 400, 'invalid_player', 'player_id inválido (solo números, de 5 a 15 dígitos).');
    const prev = await rest('api_pedidos?user_id=eq.' + encodeURIComponent(uid) + '&ref_cliente=eq.' + encodeURIComponent(ref) + '&limit=1');
    if(Array.isArray(prev.json) && prev.json[0]){ const o2 = await refrescar(ctx, prev.json[0]); return enviar(res, { ok: true, duplicate: true, order: pub(o2), balance: Number((await rest('profiles?id=eq.' + encodeURIComponent(uid) + '&select=saldo')).json[0].saldo) || 0 }); }
    const lista = await catalogo(ctx), it = lista.find(x => x.product === prod);
    if(!it) return err(res, ctx, 404, 'product_not_found', 'Producto no encontrado. Consulta GET /api/v1/products.');
    if(!it.available) return err(res, ctx, 503, 'unavailable', 'Esa recarga no está disponible por ahora. No se te cobró.');
    const pg = await rpc('api_pagar', { p_user: uid, p_llave: k.id, p_ref: ref, p_producto: prod, p_tipo: it.type, p_nombre: it.name, p_ff: ff, p_precio: it.price });
    if(pg.status >= 400 || !pg.json || !pg.json.ok){
      const m = msgErr(pg), e = errorSql(m);
      if(/saldo_insuficiente/.test(m) && e) return err(res, ctx, 402, 'insufficient_balance', e.message, { balance: e.saldo, required: e.total });
      if(/cuenta_suspendida/.test(m)) return err(res, ctx, 403, 'suspended', 'Tu cuenta está suspendida.');
      if(/api_pagar|does not exist|relation|schema cache|permission denied/.test(m)) return err(res, ctx, 503, 'db', 'Servicio no disponible por ahora (falta configuración).');
      return err(res, ctx, 500, 'payment_failed', 'No se pudo procesar el pago. No se te cobró. Intenta de nuevo.');
    }
    const id = pg.json.id;
    if(pg.json.repetida){ const r = await rest('api_pedidos?id=eq.' + id + '&limit=1'); return enviar(res, { ok: true, duplicate: true, order: pub(r.json[0]), balance: Number(pg.json.saldo) }); }
    const cuerpo = { action: 'comprar', player_id: ff, client_name: p.username, idempotency_key: 'cs-api' + id };
    if(it.type === 'diamantes') cuerpo.package_id = PKG[it.units]; else { const k2 = await ctx.leerCatalogo(), c = (k2.productos || []).find(x => x.clave === prod); cuerpo.producto = c && c.srv; }
    const pr = await llamarProveedor(cuerpo, req);
    let est, ref2 = null, det = null;
    if(pr && pr.success && pr.status === 'COMPLETED'){ est = 'completada'; ref2 = { order_id: pr.order_id || null, reference: pr.reference || null, via: pr.via || null }; }
    else if(pr && pr.success && pr.status === 'PENDING'){ est = 'enviada'; ref2 = { order_id: pr.order_id || null, reference: pr.reference || null, via: pr.via || null }; }
    else { det = String((pr && (pr.error || pr.status)) || 'sin confirmar'); const code = String((pr && pr.code) || ''); est = (code === 'PURCHASE_FAILED' || code === 'PRODUCT_INACTIVE' || code === 'ENDPOINT_DISABLED') ? 'rechazada' : 'verificar'; }
    const cr = await rpc('api_cerrar', { p_id: id, p_estado: est, p_ref: ref2, p_detalle: det });
    if(cr.status >= 400) telegram('🔥 <b>API #' + id + ' · no se pudo guardar el resultado</b>\n👤 ' + esc(p.username) + ' · ' + esc(it.name) + ' → ID ' + esc(ff) + '\nResultado: ' + est + ' · ' + esc(det || ''));
    else if(est === 'verificar') telegram('🚨 <b>API #' + id + ' · VERIFICAR a mano</b>\n👤 ' + esc(p.username) + ' · ' + esc(it.name) + ' → ID ' + esc(ff) + '\n❗ ' + esc(det) + '\n🔑 cs-api' + id + '\nNo se reembolsó: revisa en Central One.');
    else if(est === 'rechazada') telegram('↩️ <b>API #' + id + ' · rechazado y reembolsado</b>\n👤 ' + esc(p.username) + ' · ' + esc(it.name) + ' → ID ' + esc(ff) + '\n❗ ' + esc(det));
    else telegram('🔌 <b>API REVENDEDOR · #' + id + (est === 'completada' ? ' ✅' : ' ⏳') + '</b>\n👤 ' + esc(p.username) + '\n🎁 ' + esc(it.name) + ' → ID ' + esc(ff) + '\n💵 $' + it.price.toFixed(2) + ' MXN');
    const fin = await rest('api_pedidos?id=eq.' + id + '&limit=1'), sa = cr.json && cr.json.saldo != null ? Number(cr.json.saldo) : null;
    const o3 = Array.isArray(fin.json) && fin.json[0] ? fin.json[0] : { id, ref_cliente: ref, producto: prod, nombre: it.name, ff_id: ff, precio: it.price, estado: est, detalle: det };
    return enviar(res, { ok: est !== 'rechazada', order: pub(o3), balance: sa }, est === 'rechazada' ? 422 : 200);
  }
  return err(res, ctx, 404, 'not_found', 'Ruta no encontrada. Usa /api/v1/balance, /products u /orders.');
}
// ───── ADMIN: entrega y administra llaves de revendedores (suscripción mensual) ─────
async function admin(ctx, a, b, adm){
  const { rest, enviar, res, telegram, esc } = ctx;
  const faltaSql = r => r.status >= 400 || !Array.isArray(r.json);
  if(a === 'admin_api_lista'){
    const r = await rest('api_llaves?select=id,user_id,nombre,prefijo,activa,creada,ultimo_uso,vence&order=id.desc&limit=300');
    if(faltaSql(r)) return enviar(res, { ok: false, code: 'db', message: 'Falta ejecutar api_revendedores.sql en Supabase.' });
    const ids = Array.from(new Set(r.json.map(x => x.user_id))), us = {};
    if(ids.length){ const rp = await rest('profiles?id=in.(' + ids.map(encodeURIComponent).join(',') + ')&select=id,username,saldo'); (Array.isArray(rp.json) ? rp.json : []).forEach(u => { us[String(u.id)] = u; }); }
    const rpd = await rest('api_pedidos?select=llave_id,precio,estado&order=id.desc&limit=5000'), st = {};
    (Array.isArray(rpd.json) ? rpd.json : []).forEach(o => { const s0 = st[o.llave_id] || (st[o.llave_id] = { pedidos: 0, total: 0 }); s0.pedidos++; if(o.estado !== 'rechazada') s0.total += Number(o.precio) || 0; });
    const ahora = Date.now();
    return enviar(res, { ok: true, llaves: r.json.map(x => ({ id: x.id, usuario: (us[x.user_id] || {}).username || '?', saldo: (us[x.user_id] || {}).saldo != null ? Number(us[x.user_id].saldo) : null, nombre: x.nombre, prefijo: x.prefijo, activa: x.activa, creada: x.creada, ultimo_uso: x.ultimo_uso, vence: x.vence || null,
      vencida: !!(x.vence && new Date(x.vence).getTime() < ahora), pedidos: (st[x.id] || {}).pedidos || 0, gastado: Math.round(((st[x.id] || {}).total || 0) * 100) / 100 })) });
  }
  if(a === 'admin_api_crear'){
    const u = String(b.username || '').trim().slice(0, 60), dias = Math.round(b.dias == null || b.dias === '' ? 30 : Number(b.dias));
    if(!u) return enviar(res, { ok: false, code: 'solicitud', message: 'Escribe el usuario de CiberStore del revendedor.' });
    if(!(dias >= 1 && dias <= 366)) return enviar(res, { ok: false, code: 'solicitud', message: 'Los días deben ser de 1 a 366.' });
    const rp = await rest('profiles?username=eq.' + encodeURIComponent(u) + '&select=id,username&limit=1'), p = Array.isArray(rp.json) ? rp.json[0] : null;
    if(!p) return enviar(res, { ok: false, code: 'no_existe', message: 'No existe el usuario "' + u + '". Debe tener cuenta en CiberStore.' });
    const ya = await rest('api_llaves?user_id=eq.' + encodeURIComponent(String(p.id)) + '&activa=eq.true&select=id');
    if(faltaSql(ya)) return enviar(res, { ok: false, code: 'db', message: 'Falta ejecutar api_revendedores.sql en Supabase.' });
    if(ya.json.length >= 5) return enviar(res, { ok: false, code: 'maximo', message: 'Ese usuario ya tiene 5 llaves activas.' });
    const llave = 'csk_' + crypto.randomBytes(24).toString('hex'), vence = new Date(Date.now() + dias * 86400000).toISOString(), nombre = String(b.nombre || '').replace(/[<>]/g, '').trim().slice(0, 40) || 'Revendedor';
    const w = await rest('api_llaves', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ user_id: String(p.id), activa: true, nombre, prefijo: llave.slice(0, 8), huella: huella(llave), vence }) });
    if(w.status >= 400) return enviar(res, { ok: false, code: 'db', message: 'No se pudo crear la llave.' });
    telegram('🔌 <b>Llave API entregada</b>\n👤 ' + esc(p.username) + ' · ' + dias + ' días\nPor: ' + esc(adm));
    return enviar(res, { ok: true, llave, usuario: p.username, vence, aviso: 'Cópiala y envíasela: no se vuelve a mostrar.' });
  }
  if(a === 'admin_api_renovar' || a === 'admin_api_revocar'){
    const id = Number(b.id); if(!(id > 0)) return enviar(res, { ok: false, code: 'solicitud', message: 'Llave inválida' });
    const r = await rest('api_llaves?id=eq.' + id + '&select=id,vence,user_id&limit=1'), k = Array.isArray(r.json) ? r.json[0] : null;
    if(!k) return enviar(res, { ok: false, code: 'no_existe', message: 'No existe esa llave.' });
    if(a === 'admin_api_revocar'){ await rest('api_llaves?id=eq.' + id, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ activa: false }) }); return enviar(res, { ok: true }); }
    const dias = Math.round(b.dias == null || b.dias === '' ? 30 : Number(b.dias)); if(!(dias >= 1 && dias <= 366)) return enviar(res, { ok: false, code: 'solicitud', message: 'Los días deben ser de 1 a 366.' });
    const base = Math.max(Date.now(), k.vence ? new Date(k.vence).getTime() : 0), vence = new Date(base + dias * 86400000).toISOString();
    await rest('api_llaves?id=eq.' + id, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ activa: true, vence }) });
    return enviar(res, { ok: true, vence });
  }
  return enviar(res, { ok: false, code: 'accion', message: 'Acción desconocida' });
}
module.exports = { manejar, llaves, admin };

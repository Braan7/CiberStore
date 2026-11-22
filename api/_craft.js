// ═════════════════════════════════════════════════════════════════
// Proveedor CRAFTLAND (Lunexis) · "Nick color" (pacote nível 6)
//   POST /api/v1/orders {player_id}  → pedido del paquete NIVEL 6 (60,150 seguidores); se debita del saldo del proveedor
//   GET  /api/v1/orders/{code}       → status: queued · processing · completed · failed (failed = el proveedor ya reembolsó)
//   GET  /api/v1/player/{id}         → nick, región, seguidores y si el ID es elegible (eligible)
//   GET  /api/v1/stock               → available (stock del Servidor 1: true/false/null) y can_order (¿se puede pedir ahora?)
//   GET  /api/v1/balance             → balance_cents y precio_centavos (saldo del proveedor)
// Errores: 402 INSUFFICIENT_BALANCE · 409 NO_STOCK / ID_BUSY / ID que ya recibió el paquete · 403 BANNED · 429 límite
// La llave vive SOLO en Vercel: CRAFT_API_KEY (opcional CRAFT_BASE). Aquí no hay ninguna llave.
// Este archivo empieza con "_": NO cuenta como función de Vercel (límite del plan Hobby).
// Las respuestas del proveedor se leen de forma tolerante (varios nombres de campo posibles).
// ═════════════════════════════════════════════════════════════════
'use strict';
const BASE = () => String(process.env.CRAFT_BASE || 'https://lunexiscraft.squareweb.app').replace(/\/+$/, '');
const dormir = ms => new Promise(r => setTimeout(r, ms));

async function http(path, opts, ms){
  opts = opts || {}; const ctrl = new AbortController(), t = setTimeout(() => ctrl.abort(), ms || 12000);
  try{
    const r = await fetch(BASE() + path, { method: opts.method || 'GET', signal: ctrl.signal,
      headers: Object.assign({ 'X-Api-Key': process.env.CRAFT_API_KEY || '', Accept: 'application/json' }, opts.body ? { 'Content-Type': 'application/json' } : {}, opts.headers || {}),
      body: opts.body ? JSON.stringify(opts.body) : undefined });
    let j = null; const txt = await r.text(); try{ j = JSON.parse(txt); }catch(e){}
    return { status: r.status, json: j, text: txt.slice(0, 300) };
  }finally{ clearTimeout(t); }
}
const pick = (o, ks) => { if(!o || typeof o !== 'object') return undefined; for(const k of ks){ if(o[k] !== undefined && o[k] !== null && o[k] !== '') return o[k]; } return undefined; };
// el proveedor puede envolver los datos en data / order / pedido / player
const cuerpo = j => { if(!j || typeof j !== 'object') return {}; const w = pick(j, ['data', 'order', 'pedido', 'result', 'player', 'jogador', 'basicInfo', 'basic_info']); return (w && typeof w === 'object' && !Array.isArray(w)) ? Object.assign({}, j, w) : j; };
const msg = (j, t) => String(pick(cuerpo(j), ['message', 'mensagem', 'error', 'erro', 'detail', 'detalhe']) || (j && j.error && j.error.message) || t || '').slice(0, 200);

function mapEstado(s){
  s = String(s || '').toLowerCase();
  if(/conclu|complet|deliver|entreg|done|finaliz|success|sucesso/.test(s)) return 'COMPLETED';
  if(/fail|falh|erro|error|cancel|refund|reembols|estorn|recus|rejeit/.test(s)) return 'FAILED';
  return 'PENDING';   // fila · enviando · processando · desconocido → se sigue consultando
}
function leerPedido(j){
  const o = cuerpo(j), code = pick(o, ['code', 'codigo', 'order_code', 'order_id', 'id', 'reference']);
  const st = pick(o, ['status', 'estado', 'situacao', 'state']);
  return { code: code != null ? String(code) : null, estado: mapEstado(st), crudo: st != null ? String(st).slice(0, 40) : null };
}

const idOk = id => /^\d{5,15}$/.test(String(id || ''));

// Estado del proveedor antes de cobrar al cliente: can_order (stock) y saldo del proveedor suficiente para un pedido
async function disponible(){
  if(!process.env.CRAFT_API_KEY) return { ok: false, code: 'sin_configurar', message: 'Este servicio aún no está activado.' };
  let r, bl; try{ [r, bl] = await Promise.all([http('/api/v1/stock', null, 8000), http('/api/v1/balance', null, 8000)]); }catch(e){ return { ok: false, code: 'proveedor', message: 'El proveedor no responde. Intenta en unos minutos.' }; }
  for(const x of [r, bl]){
    if(x.status === 401 || x.status === 403) return { ok: false, code: 'llave', alerta: 'rechazó la llave o la cuenta (' + x.status + ')', message: 'Servicio en mantenimiento. Intenta más tarde.' };
    if(x.status >= 500 || x.status === 503) return { ok: false, code: 'proveedor', message: 'El proveedor no responde. Intenta en unos minutos.' };
  }
  if(bl.status === 200 && bl.json){ const b = bl.json, saldo = Number(b.balance_cents), precio = Number(b.precio_centavos);
    if(isFinite(saldo) && isFinite(precio) && precio > 0 && saldo < precio) return { ok: false, code: 'sin_saldo_prov', alerta: 'sin saldo para entregar (tiene ' + (b.saldo || saldo) + ', el paquete cuesta ' + (b.Precio || b.precio || precio) + ')', message: 'Servicio temporalmente no disponible. Intenta más tarde: no se te cobró.' }; }
  if(r.status === 200 && r.json){ const o = cuerpo(r.json);
    if(o.can_order === false || o.canOrder === false) return { ok: false, code: 'sin_stock', message: 'Sin stock por ahora. Vuelve a intentar más tarde: no se te cobró.' };
    if(o.can_order === undefined && o.available === false && o.package_available === false) return { ok: false, code: 'sin_stock', message: 'Sin stock por ahora. Vuelve a intentar más tarde: no se te cobró.' }; }
  return { ok: true };
}

async function jugador(id){
  if(!idOk(id)) return { ok: false, code: 'id', message: 'Escribe un ID de Craftland válido (solo números).' };
  if(!process.env.CRAFT_API_KEY) return { ok: false, code: 'sin_configurar', message: 'Este servicio aún no está activado.' };
  let r; try{ r = await http('/api/v1/player/' + encodeURIComponent(id), null, 10000); }catch(e){ return { ok: false, code: 'proveedor', message: 'No se pudo consultar el jugador. Intenta de nuevo.' }; }
  if(r.status === 401 || r.status === 403) return { ok: false, code: 'llave', alerta: 'rechazó la llave (' + r.status + ')', message: 'Servicio en mantenimiento. Intenta más tarde.' };
  if(r.status === 404 || r.status === 400 || r.status === 422) return { ok: false, code: 'NOT_FOUND', message: 'No encontramos ese ID de Craftland. Revísalo.' };
  if(r.status !== 200 || !r.json) return { ok: false, code: 'proveedor', message: 'No se pudo consultar el jugador. Intenta de nuevo.' };
  const o = cuerpo(r.json);
  if(o.valid === false || o.found === false || o.encontrado === false || o.success === false) return { ok: false, code: 'NOT_FOUND', message: 'No encontramos ese ID de Craftland. Revísalo.' };
  if(o.eligible === false) return { ok: false, code: 'no_elegible', message: 'Este ID no puede recibir el paquete (ya lo recibió o no cumple los requisitos). Revisa tu ID.' };
  const nick = pick(o, ['nick', 'nickname', 'name', 'nome', 'username', 'player_name']), seg = pick(o, ['followers', 'seguidores', 'followers_count']);
  return { ok: true, nick: nick != null ? String(nick).slice(0, 40) : '', seguidores: seg != null && isFinite(Number(seg)) ? Number(seg) : null };
}

// Compra: devuelve la misma forma que api/recarga.js (success · status · order_id · reference · via · code · error)
async function comprar(b){
  const pid = String(b.player_id || '').trim(), key = String(b.idempotency_key || '');
  if(!process.env.CRAFT_API_KEY) return { success: false, code: 'ENDPOINT_DISABLED', error: 'Servicio no configurado' };
  if(!idOk(pid)) return { success: false, code: 'PURCHASE_FAILED', error: 'ID de Craftland inválido' };
  let r;
  try{ r = await http('/api/v1/orders', { method: 'POST', body: { player_id: pid }, headers: key ? { 'Idempotency-Key': key } : {} }, 14000); }
  catch(e){ return { success: false, code: 'PROVIDER_ERROR', error: 'El proveedor tardó en responder: se está verificando (no se reembolsa solo)' }; }
  if(r.status === 401 || r.status === 403) return { success: false, code: 'ENDPOINT_DISABLED', error: 'Proveedor no disponible', alerta: 'rechazó la llave o la cuenta (' + r.status + ')' };
  if(r.status === 429) return { success: false, code: 'ENDPOINT_DISABLED', error: 'El proveedor está saturado. Se te devolvió el saldo: intenta de nuevo en un momento.' };
  if(r.status === 402 || /INSUFFICIENT_BALANCE|insufficient/i.test(r.text)) return { success: false, code: 'ENDPOINT_DISABLED', error: 'Proveedor sin saldo', alerta: 'sin saldo para entregar (' + r.status + ')' };
  if(r.status === 404 || r.status === 400 || r.status === 422 || r.status === 409) return { success: false, code: 'PURCHASE_FAILED', error: msg(r.json, 'El proveedor no pudo tomar el pedido (' + r.status + ')') };
  if(r.status !== 200 && r.status !== 201 && r.status !== 202) return { success: false, code: 'PROVIDER_ERROR', error: 'Sin respuesta clara del proveedor (' + r.status + ')' };
  const p = leerPedido(r.json);
  if(!p.code) return { success: false, code: 'PROVIDER_ERROR', error: 'El proveedor aceptó el pedido pero no dio su código: verifícalo en su panel' };
  // espera corta a que avance (la entrega real puede tardar: queda "en proceso" y se sigue desde Mis compras)
  let est = p.estado;
  const fin = Date.now() + 6000;
  while(est === 'PENDING' && Date.now() < fin){
    await dormir(2000);
    try{ const s = await http('/api/v1/orders/' + encodeURIComponent(p.code), null, 6000); if(s.status === 200 && s.json) est = leerPedido(s.json).estado; }catch(e){ break; }
  }
  const base = { order_id: 'CL-' + p.code, reference: p.code, via: 'Craftland ' + p.code };
  if(est === 'COMPLETED') return Object.assign({ success: true, status: 'COMPLETED' }, base);
  if(est === 'FAILED') return Object.assign({ success: false, code: 'PURCHASE_FAILED', error: 'El proveedor no pudo completar el pedido (ya reembolsó su costo)' }, base);   // status failed = no completado y reembolsado por el proveedor
  return Object.assign({ success: true, status: 'PENDING' }, base);
}

async function estado(code){
  let r; try{ r = await http('/api/v1/orders/' + encodeURIComponent(code), null, 10000); }catch(e){ return { success: false, error: 'No se pudo consultar' }; }
  if(r.status === 404) return { success: false, error: 'No encontrado' };
  if(r.status !== 200 || !r.json) return { success: false, error: 'No se pudo consultar' };
  const p = leerPedido(r.json);
  return { success: true, status: p.estado, reference: code, estado_proveedor: p.crudo };
}

// Para api/comprar.js (llamarProveedor): misma interfaz que api/recarga.js
async function proxy(b){
  if(b.action === 'estado') return estado(String(b.order_id || '').replace(/^CL-/, ''));
  if(b.action === 'comprar') return comprar(b);
  return { success: false, code: 'ENDPOINT_DISABLED', error: 'Acción desconocida' };
}

// Stock para mostrar (público y admin): unidades = cuántos paquetes alcanza a entregar el saldo del proveedor
async function stockInfo(){
  if(!process.env.CRAFT_API_KEY) return { ok: false, code: 'sin_configurar' };
  let r, bl; try{ [r, bl] = await Promise.all([http('/api/v1/stock', null, 7000), http('/api/v1/balance', null, 7000)]); }catch(e){ return { ok: false, code: 'proveedor' }; }
  if(r.status !== 200 && bl.status !== 200) return { ok: false, code: 'proveedor' };
  const o = r.status === 200 ? cuerpo(r.json) : {}, b = bl.status === 200 && bl.json ? bl.json : {};
  const saldo = Number(b.balance_cents), precio = Number(b.precio_centavos);
  const unidades = isFinite(saldo) && isFinite(precio) && precio > 0 ? Math.max(0, Math.floor(saldo / precio)) : null;
  let can = o.can_order; if(can === undefined) can = o.canOrder; if(can === undefined && o.available === false) can = false;
  const disponible = can === false ? false : (unidades === 0 ? false : true);
  return { ok: true, disponible, unidades: disponible ? unidades : 0, servidor: o.available === undefined ? null : o.available, saldo_cents: isFinite(saldo) ? saldo : null, precio_cents: isFinite(precio) ? precio : null };
}
module.exports = { stockInfo, jugador, disponible, comprar, estado, proxy, idOk };

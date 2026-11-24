// ═════════════════════════════════════════════════════════════════
// Proveedor LOJAFF · envío automático del PASE BOOYAH por regalo
//   GET  https://lojaff.com/api/v1/saldo           → { cliente, saldo, preco_por_envio }
//   POST https://lojaff.com/api/v1/passe/enviar    → { uid, mensagem } · encabezado KEY
//        200 { status:"ok", uid, nickname, level, debitado, saldo_restante }
//        401 llave · 402 sin saldo · 422 ID inválido/región no admitida · 502 error de entrega → NO se cobra nada
// La llave vive SOLO en Vercel: LOJAFF_API_KEY (opcional LOJAFF_BASE y LOJAFF_MENSAJE). Aquí no hay ninguna llave.
// Este archivo empieza con "_": NO cuenta como función de Vercel (límite del plan Hobby).
// El proveedor NO tiene llave de idempotencia ni consulta de estado: ante una respuesta dudosa NUNCA se repite
// (podría mandar dos pases): la unidad se manda a "verificar" para revisarla a mano.
// ═════════════════════════════════════════════════════════════════
'use strict';
const BASE = () => String(process.env.LOJAFF_BASE || 'https://lojaff.com').replace(/\/+$/, '');
const MENSAJE = () => Array.from(String(process.env.LOJAFF_MENSAJE || 'Gracias por comprar en ciberstore.lat, vuelve pronto.')).slice(0, 130).join('');
// Mensaje que escribe el cliente: sin saltos de línea ni caracteres de control, máximo 130 caracteres; vacío → el predeterminado
const limpiarMensaje = t => Array.from(String(t == null ? '' : t).replace(/[\u0000-\u001f\u007f\u2028\u2029]+/g, ' ').replace(/\s+/g, ' ').trim()).slice(0, 130).join('');
const idOk = id => /^\d{7,22}$/.test(String(id || ''));

async function http(path, opts, ms){
  opts = opts || {}; const ctrl = new AbortController(), t = setTimeout(() => ctrl.abort(), ms || 25000);
  try{
    const r = await fetch(BASE() + path, { method: opts.method || 'GET', signal: ctrl.signal,
      headers: Object.assign({ KEY: process.env.LOJAFF_API_KEY || '', Accept: 'application/json' }, opts.body ? { 'Content-Type': 'application/json' } : {}),
      body: opts.body ? JSON.stringify(opts.body) : undefined });
    let j = null; const txt = await r.text(); try{ j = JSON.parse(txt); }catch(e){}
    return { status: r.status, json: j, text: txt.slice(0, 300) };
  }finally{ clearTimeout(t); }
}
const msgDe = (j, t) => String((j && (j.error || j.message || j.mensagem)) || t || '').slice(0, 200);

// Saldo de la billetera del proveedor y precio por envío (para el panel y para avisar antes de quedarte sin fondos)
async function saldo(){
  if(!process.env.LOJAFF_API_KEY) return { ok: false, code: 'sin_configurar' };
  if(global.__ljSaldo && Date.now() - global.__ljSaldo.t < 15000) return global.__ljSaldo.v;
  const v = await saldoDirecto(); if(v.ok) global.__ljSaldo = { t: Date.now(), v }; return v;
}
async function saldoDirecto(){
  try{
    const r = await http('/api/v1/saldo', null, 9000);
    if(r.status === 200 && r.json && r.json.saldo !== undefined){ const sd = Number(r.json.saldo), pr = Number(r.json.preco_por_envio); return { ok: true, saldo: sd, precio: pr, unidades: pr > 0 && isFinite(sd) ? Math.max(0, Math.floor(sd / pr + 1e-9)) : null, cliente: r.json.cliente || null }; }
    return { ok: false, code: r.status === 401 ? 'llave' : 'proveedor', status: r.status };
  }catch(e){ return { ok: false, code: 'proveedor' }; }
}

// Misma forma de respuesta que usa api/comprar.js con Central One: { success, status, code, error, order_id, reference, via, nickname }
async function proxy(body){
  if(!body || body.action !== 'comprar') return { success: false, code: 'PROVIDER_ERROR', error: 'Acción no disponible para este proveedor' };
  if(!process.env.LOJAFF_API_KEY) return { success: false, code: 'ENDPOINT_DISABLED', error: 'El envío automático del pase aún no está activado' };
  const uid = String(body.player_id || '');
  if(!idOk(uid)) return { success: false, code: 'PURCHASE_FAILED', error: 'ID de Free Fire inválido' };
  let r;
  const propio = limpiarMensaje(body.mensaje), texto = propio || MENSAJE();
  try{ r = await http('/api/v1/passe/enviar', { method: 'POST', body: { uid, mensagem: texto } }, 25000); }
  catch(e){ return { success: false, code: 'PROVIDER_ERROR', error: 'Sin respuesta de Lojaff (puede haberse enviado): revisa antes de repetir' }; }   // dudoso → verificar
  let j = r.json || {};
  // si el proveedor rechaza el TEXTO (422 hablando del mensaje) no se envió nada: se reintenta una vez con el mensaje predeterminado
  if(r.status === 422 && propio && /mensag|message|texto|text/i.test(msgDe(j, r.text)) && !/uid|\bid\b/i.test(msgDe(j, r.text))){
    try{ r = await http('/api/v1/passe/enviar', { method: 'POST', body: { uid, mensagem: MENSAJE() } }, 25000); j = r.json || {}; }catch(e){ return { success: false, code: 'PROVIDER_ERROR', error: 'Sin respuesta de Lojaff (puede haberse enviado): revisa antes de repetir' }; }
  }
  if(r.status === 200 && (j.status === 'ok' || j.ok === true)) return { success: true, status: 'COMPLETED', order_id: null, reference: j.uid ? String(j.uid) : uid, via: 'Lojaff · ' + (j.nickname || '') + (j.level ? ' · Nv ' + j.level : ''), nickname: j.nickname || null, debitado: j.debitado != null ? Number(j.debitado) : null, saldo_restante: j.saldo_restante != null ? Number(j.saldo_restante) : null };
  // errores DEFINITIVOS documentados (el proveedor asegura que no cobró): 401 llave · 402 sin saldo · 422 ID/región · 502 entrega fallida
  if([401, 402, 422, 502].indexOf(r.status) >= 0 && j && (j.ok === false || j.error)){
    return { success: false, code: 'PURCHASE_FAILED', error: msgDe(j, 'HTTP ' + r.status), http: r.status };
  }
  return { success: false, code: 'PROVIDER_ERROR', error: 'Respuesta inesperada de Lojaff (HTTP ' + r.status + '): ' + msgDe(j, r.text) };
}
module.exports = { proxy, saldo, idOk, MENSAJE, limpiarMensaje };

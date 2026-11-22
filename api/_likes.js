// ═════════════════════════════════════════════════════════════════
// Proveedor de LIKES (lunexislikes) — llave SOLO en Vercel: LIKES_API_KEY (opcional LIKES_BASE)
//   POST /api/likes/send {target_id, amount 1–2000}  → likes_sent, remaining, player_nickname, log_id, liked_before/after, receipt_url
//   GET  /api/balance → remaining (créditos del proveedor) · GET /api/player/<uid> → basicInfo.nickname/liked · GET /api/logs
//   Errores: 400 créditos insuficientes o UID con agendamiento en curso · 401/403 llave/cuenta · 429 límite · 500 falla · 503 mantenimiento
// Empieza con "_": no cuenta como función de Vercel (límite Hobby).
// ═════════════════════════════════════════════════════════════════
'use strict';
const BASE = () => String(process.env.LIKES_BASE || 'https://lunexislikes.squareweb.app').replace(/\/+$/, '');
async function http(path, opts, ms){
  opts = opts || {}; const ctrl = new AbortController(), t = setTimeout(() => ctrl.abort(), ms || 12000);
  try{
    const r = await fetch(BASE() + path, { method: opts.method || 'GET', signal: ctrl.signal,
      headers: Object.assign({ 'X-Api-Key': process.env.LIKES_API_KEY || '', Accept: 'application/json' }, opts.body ? { 'Content-Type': 'application/json' } : {}),
      body: opts.body ? JSON.stringify(opts.body) : undefined });
    let j = null; const txt = await r.text(); try{ j = JSON.parse(txt); }catch(e){}
    return { status: r.status, json: j, text: txt.slice(0, 300) };
  }finally{ clearTimeout(t); }
}
const errMsg = r => String((r.json && (r.json.error || r.json.message)) || r.text || '').slice(0, 200);
const idOk = id => /^\d{5,15}$/.test(String(id || ''));
const intOk = n => Number.isInteger(n) && n >= 10 && n <= 2000;

// Jugador (nick, likes actuales) + créditos del proveedor
async function jugador(id){
  if(!process.env.LIKES_API_KEY) return { ok: false, code: 'sin_configurar', message: 'Este servicio aún no está activado.' };
  if(!idOk(id)) return { ok: false, code: 'id', message: 'Escribe un ID de Free Fire válido (solo números).' };
  let r; try{ r = await http('/api/player/' + encodeURIComponent(id), null, 10000); }catch(e){ return { ok: false, code: 'proveedor', message: 'No se pudo consultar el ID. Intenta de nuevo.' }; }
  if(r.status === 401 || r.status === 403) return { ok: false, code: 'llave', alerta: 'rechazó la llave o la cuenta (' + r.status + ')', message: 'Servicio en mantenimiento. Intenta más tarde.' };
  if(r.status === 404) return { ok: false, code: 'NOT_FOUND', message: 'No encontramos ese ID de Free Fire. Revísalo.' };
  if(r.status === 503) return { ok: false, code: 'proveedor', message: 'Servicio en mantenimiento. Intenta más tarde.' };
  if(r.status !== 200 || !r.json) return { ok: false, code: 'proveedor', message: 'No se pudo consultar el ID. Intenta de nuevo.' };
  const b = r.json.basicInfo || r.json;
  return { ok: true, nick: String(b.nickname || b.nick || '').slice(0, 40), region: b.region || null, likes: Number.isFinite(Number(b.liked)) ? Number(b.liked) : null };
}
async function creditos(){
  if(!process.env.LIKES_API_KEY) return { ok: false, code: 'sin_configurar', message: 'Este servicio aún no está activado.' };
  let r; try{ r = await http('/api/balance', null, 8000); }catch(e){ return { ok: false, code: 'proveedor', message: 'El proveedor no responde. Intenta en unos minutos.' }; }
  if(r.status === 401 || r.status === 403) return { ok: false, code: 'llave', alerta: 'rechazó la llave o la cuenta (' + r.status + ')', message: 'Servicio en mantenimiento. Intenta más tarde.' };
  if(r.status === 503) return { ok: false, code: 'proveedor', message: 'Servicio en mantenimiento. Intenta más tarde.' };
  if(r.status !== 200 || !r.json) return { ok: false, code: 'proveedor', message: 'El proveedor no responde. Intenta en unos minutos.' };
  const n = Number(r.json.remaining); return { ok: true, restantes: Number.isFinite(n) ? n : null };
}
// Envío. definitivo=true → se sabe que NO se envió nada (se devuelve todo). ambiguo=true → no se sabe (se consulta /api/logs)
async function enviar(id, cantidad){
  let r; try{ r = await http('/api/likes/send', { method: 'POST', body: { target_id: String(id), amount: cantidad } }, 50000); }
  catch(e){ return { ambiguo: true, detalle: 'Sin respuesta del proveedor a tiempo' }; }
  if(r.status === 200 && r.json){
    const j = r.json, n = Number(j.likes_sent);
    if(!Number.isFinite(n)) return { ambiguo: true, detalle: 'Respuesta sin cantidad enviada' };
    return { ok: true, enviados: Math.max(0, Math.min(cantidad, Math.floor(n))), nick: j.player_nickname || '', log_id: Number.isFinite(Number(j.log_id)) ? Number(j.log_id) : null, antes: Number.isFinite(Number(j.liked_before)) ? Number(j.liked_before) : null, despues: Number.isFinite(Number(j.liked_after)) ? Number(j.liked_after) : null, recibo: j.receipt_url || null, restantes: Number.isFinite(Number(j.remaining)) ? Number(j.remaining) : null };
  }
  if(r.status === 401 || r.status === 403) return { definitivo: true, alerta: 'rechazó la llave o la cuenta (' + r.status + ')', detalle: 'Proveedor no disponible' };
  if(r.status === 400) return { definitivo: true, sinCreditos: /cr[eé]dito/i.test(errMsg(r)), detalle: errMsg(r) || 'El proveedor rechazó el envío' };
  if(r.status === 429 || r.status === 503) return { definitivo: true, detalle: r.status === 503 ? 'Servicio en mantenimiento' : 'El proveedor está saturado' };
  return { ambiguo: true, detalle: 'Respuesta dudosa del proveedor (' + r.status + ')' };
}
// ¿El proveedor registró este envío? Busca en /api/logs el envío por API a ese ID, hecho después de "desde" (ms)
async function buscarEnLog(id, desde){
  let r; try{ r = await http('/api/logs?limit=30&days=1', null, 9000); }catch(e){ return { error: true }; }
  if(r.status !== 200 || !Array.isArray(r.json)) return { error: true };
  const hit = r.json.filter(x => String(x.target_id) === String(id) && String(x.action || 'api_send') === 'api_send' && Date.parse(x.timestamp) >= desde - 15000).sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))[0];
  if(!hit) return { error: false, encontrado: false };
  return { error: false, encontrado: true, enviados: hit.status === 'success' ? Math.max(0, Number(hit.likes_sent) || 0) : 0, nick: hit.nickname || '', log_id: Number.isFinite(Number(hit.log_id)) ? Number(hit.log_id) : null };
}
module.exports = { jugador, creditos, enviar, buscarEnLog, idOk, intOk };

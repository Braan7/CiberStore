// ═══════════════════════════════════════════════════════════════════════════
// api/chat.js · Chat global de CiberStore (validado en el servidor).
//
// El navegador solo LEE los mensajes (Supabase Realtime). Todo lo que escribe o modifica pasa por aquí:
//   token {username, hash}                  → entrega una llave de chat de pocas horas (verifica usuario + contraseña en la tabla profiles)
//   enviar {token, texto[, admin_token]}    → mensaje (anti-spam, silencios y suspensiones se validan en la base: chat_global.sql)
//   anuncio {token, admin_token, texto}     → comunicado oficial (solo administrador)
//   ping {token[, admin_token]}             → conectados + estado de sanción del usuario
//   admin_borrar / admin_borrar_usuario / admin_sancionar / admin_levantar / admin_sanciones / admin_auditoria
//                                           → moderación: exigen la sesión firmada del panel admin (api/admin.js), nunca el rol que diga el navegador
//
// Variables de entorno (las mismas que ya usas para el ranking):  SUPABASE_URL · SUPABASE_SERVICE_ROLE_KEY
// (opcional) CHAT_SECRET  texto largo para firmar las llaves de chat; si no lo pones se deriva de la llave de servicio.
// ═══════════════════════════════════════════════════════════════════════════
'use strict';
const crypto = require('crypto');
const S = require('./_sesion.js');

const TTL_MS = 6 * 3600 * 1000;
function enviar(res, body, status){ res.statusCode = status || 200; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('Cache-Control', 'no-store'); res.end(JSON.stringify(body)); }
function ipDe(req){ return String((req.headers['x-forwarded-for'] || (req.socket && req.socket.remoteAddress) || 'x')).split(',')[0].trim(); }
const cfg = () => ({ url: String((process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL) || '').replace(/\/+$/, ''), key: (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SECRET_KEY || process.env.SERVICE_ROLE_KEY) });
const sha = s => crypto.createHash('sha256').update(String(s)).digest();
const iguales = (a, b) => crypto.timingSafeEqual(sha(a), sha(b));

function secreto(){ const k = cfg().key; return k ? crypto.createHash('sha256').update('chat|' + (process.env.CHAT_SECRET || '') + '|' + k).digest('hex') : null; }
function firmar(d){
  const sec = secreto(); if(!sec) return null;
  const exp = Date.now() + TTL_MS, p = Buffer.from(JSON.stringify({ u: d.u, r: d.r, exp })).toString('base64url');
  return { token: 'c1.' + p + '.' + crypto.createHmac('sha256', sec).update(p).digest('base64url'), exp };
}
function verificar(tok){
  try{
    const sec = secreto(); if(!sec || typeof tok !== 'string' || tok.slice(0, 3) !== 'c1.') return null;
    const p = tok.split('.'); if(p.length !== 3) return null;
    const esp = crypto.createHmac('sha256', sec).update(p[1]).digest('base64url');
    const a = Buffer.from(p[2]), b = Buffer.from(esp); if(a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const d = JSON.parse(Buffer.from(p[1], 'base64url').toString('utf8'));
    return (d && d.exp > Date.now() && d.u) ? d : null;
  }catch(e){ return null; }
}

// Límites sencillos por IP (se reinician si Vercel reinicia la función; el límite fuerte por usuario está en la base)
const cubos = new Map();
function limite(ip, clave, max, ms){
  const t = Date.now(), k = clave + '|' + ip, l = (cubos.get(k) || []).filter(x => t - x < ms);
  if(l.length >= max){ cubos.set(k, l); return true; }
  l.push(t); cubos.set(k, l); if(cubos.size > 5000) cubos.clear(); return false;
}

async function db(path, opts){
  const c = cfg(), ctrl = new AbortController(), t = setTimeout(() => ctrl.abort(), 8000);
  try{
    const r = await fetch(c.url + '/rest/v1/' + path, Object.assign({ signal: ctrl.signal }, opts, { headers: Object.assign({ apikey: c.key, Authorization: 'Bearer ' + c.key, 'Content-Type': 'application/json' }, (opts && opts.headers) || {}) }));
    let j = null; try{ j = await r.json(); }catch(e){}
    return { status: r.status, json: j };
  } finally { clearTimeout(t); }
}
async function rpc(fn, args){
  const r = await db('rpc/' + fn, { method: 'POST', body: JSON.stringify(args || {}) });
  if(r.status >= 400) return { ok: false, code: 'db', message: (r.json && r.json.message) ? String(r.json.message).slice(0, 160) : 'Error de la base de datos (' + r.status + ')' };
  return r.json;
}

module.exports = async function handler(req, res){
  try{
    if(req.method !== 'POST') return enviar(res, { ok: false, code: 'metodo' }, 405);
    const b = (req.body && typeof req.body === 'object') ? req.body : {}, ip = ipDe(req), a = String(b.action || '');
    const c = cfg();
    if(!c.url || !c.key) return enviar(res, { ok: false, code: 'sin_configurar', message: 'El chat necesita SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en Vercel' });
    if(limite(ip, 'g', 240, 60000)) return enviar(res, { ok: false, code: 'limite', message: 'Demasiadas solicitudes, espera un momento' }, 429);

    // ── llave de chat ──
    if(a === 'token'){
      if(limite(ip, 't', 40, 600000)) return enviar(res, { ok: false, code: 'limite', message: 'Demasiados intentos, espera unos minutos' }, 429);
      const u = String(b.username || '').trim().slice(0, 60), h = String(b.hash || '').slice(0, 200);
      if(!u || !h) return enviar(res, { ok: false, code: 'credenciales', message: 'Inicia sesión para usar el chat' }, 401);
      const r = await db('profiles?username=eq.' + encodeURIComponent(u) + '&select=username,password_hash,role,banned&limit=1');
      const p = Array.isArray(r.json) ? r.json[0] : null;
      if(!p || !p.password_hash || !iguales(h, p.password_hash)) return enviar(res, { ok: false, code: 'credenciales', message: 'Vuelve a iniciar sesión para usar el chat' }, 401);
      if(p.banned) return enviar(res, { ok: false, code: 'cuenta_suspendida', message: 'Tu cuenta está suspendida' }, 403);
      const s = firmar({ u: p.username, r: p.role === 'admin' ? 'admin' : 'user' });
      return enviar(res, { ok: true, token: s.token, exp: s.exp, username: p.username, role: p.role === 'admin' ? 'admin' : 'user' });
    }

    // ── moderación: solo con la sesión firmada del panel admin ──
    if(/^admin_/.test(a)){
      const d = S.verificar(b.admin_token);
      if(!d) return enviar(res, { ok: false, code: 'sesion_invalida', message: 'Tu sesión de administrador venció. Entra de nuevo al panel.' }, 401);
      if(a === 'admin_borrar'){
        const id = Number(b.id); if(!Number.isInteger(id) || id < 1) return enviar(res, { ok: false, code: 'id', message: 'Mensaje no válido' });
        return enviar(res, await rpc('chat_borrar', { p_id: id, p_admin: d.u, p_motivo: String(b.motivo || '').slice(0, 200) || null }));
      }
      if(a === 'admin_borrar_usuario') return enviar(res, await rpc('chat_borrar_de_usuario', { p_username: String(b.username || '').slice(0, 60), p_admin: d.u, p_horas: Math.max(1, Math.min(720, Number(b.horas) || 24)) }));
      if(a === 'admin_sancionar'){
        const tipo = b.tipo === 'suspension' ? 'suspension' : 'silencio', min = Number(b.minutos);
        return enviar(res, await rpc('chat_sancionar', { p_username: String(b.username || '').slice(0, 60), p_tipo: tipo, p_minutos: (isFinite(min) && min > 0) ? Math.floor(min) : null, p_motivo: String(b.motivo || '').slice(0, 200) || null, p_admin: d.u }));
      }
      if(a === 'admin_vaciar'){
        if(limite(ip, 'v', 5, 60000)) return enviar(res, { ok: false, code: 'limite', message: 'Espera un momento' }, 429);
        const j = await rpc('chat_vaciar', { p_admin: d.u });
        if(j && j.ok === false && /chat_vaciar|does not exist|schema cache/.test(String(j.message || ''))) return enviar(res, { ok: false, code: 'db', message: 'No se pudo vaciar: ' + String(j.message).slice(0, 140) + ' · Ejecuta chat_vaciar.sql y luego: notify pgrst, \'reload schema\';' });
        return enviar(res, j);
      }
      if(a === 'admin_levantar') return enviar(res, await rpc('chat_levantar', { p_username: String(b.username || '').slice(0, 60), p_admin: d.u }));
      if(a === 'admin_sanciones'){ const j = await rpc('chat_sanciones_lista', {}); return enviar(res, Array.isArray(j) ? { ok: true, data: j } : j); }
      if(a === 'admin_auditoria'){ const j = await rpc('chat_auditoria_lista', { p_limite: Math.max(1, Math.min(500, Number(b.limite) || 100)) }); return enviar(res, Array.isArray(j) ? { ok: true, data: j } : j); }
      return enviar(res, { ok: false, code: 'accion', message: 'Acción no permitida' }, 400);
    }

    // ── el resto exige llave de chat ──
    const t = verificar(b.token);
    if(!t) return enviar(res, { ok: false, code: 'token', message: 'Tu sesión de chat venció' }, 401);
    const adm = !!(t.r === 'admin' && b.admin_token && S.verificar(b.admin_token));   // insignia y anuncios: rol + sesión firmada del panel

    if(a === 'ping') return enviar(res, await rpc('chat_ping', { p_username: t.u, p_es_admin: adm }));
    if(a === 'enviar' || a === 'anuncio'){
      if(a === 'anuncio' && !adm) return enviar(res, { ok: false, code: 'permiso', message: 'Solo un administrador puede enviar anuncios' }, 403);
      if(limite(ip, 'e', 60, 60000)) return enviar(res, { ok: false, code: 'limite', message: 'Demasiados mensajes seguidos. Espera un minuto' }, 429);
      return enviar(res, await rpc('chat_enviar', { p_username: t.u, p_texto: String(b.texto == null ? '' : b.texto).slice(0, 1200), p_es_admin: adm, p_tipo: a === 'anuncio' ? 'anuncio' : 'msg' }));
    }
    return enviar(res, { ok: false, code: 'accion', message: 'Acción no permitida' }, 400);
  }catch(e){ return enviar(res, { ok: false, code: 'error', message: 'Error del servidor' }); }
};

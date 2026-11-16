// ════════════════════════════════════════════════════════════════════════
// api/perfil.js · Mi Perfil de CiberStore (validado en el servidor).
//
// Todo lo que cambia la cuenta pasa por aquí. Cada llamada se identifica con {username, hash} (el mismo usuario y huella de
// contraseña que usa el login) y se verifica contra la tabla profiles: un usuario SOLO puede tocar su propia cuenta.
//
//   foto_subir {imagen}              → guarda la foto en Supabase Storage (bucket "avatares") y la asocia a la cuenta
//   foto_borrar                      → elimina la foto y vuelve al avatar con iniciales
//   perfil_editar {nombre, whatsapp} → actualiza solo los campos que el sistema permite editar
//   pass_cambiar {actual, nuevo}     → cambia la contraseña (verifica la actual), cierra las demás sesiones y deja un aviso
//   sesion_ping {sid}                → registra/actualiza esta sesión, marca la última actividad y avisa si fue cerrada desde otro lado
//   sesiones {sid}                   → lista de sesiones activas de la cuenta
//   sesion_cerrar {sid, objetivo}    → cierra UNA sesión de la cuenta
//   sesion_cerrar_otras {sid}        → cierra todas menos la actual
//   sesion_salir {sid}               → cierra la sesión actual (al pulsar "Cerrar sesión")
//   notif_lista / notif_leer         → avisos de la cuenta (cambios de contraseña, sesiones, foto…)
//
// Variables de entorno (las mismas del chat y el ranking):  SUPABASE_URL · SUPABASE_SERVICE_ROLE_KEY
// Base de datos: ejecutar perfil_cuenta.sql una vez (columna avatar_url, bucket, tablas de sesiones y avisos).
// ════════════════════════════════════════════════════════════════════════
'use strict';
const crypto = require('crypto');

const BUCKET = 'avatares';
const MAX_BYTES = 600 * 1024;                      // tope real de la foto (el navegador ya la reduce a ~50-150 KB)
const FORMATOS = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

function enviar(res, body, status){ res.statusCode = status || 200; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('Cache-Control', 'no-store'); res.end(JSON.stringify(body)); }
function ipDe(req){ return String((req.headers['x-forwarded-for'] || (req.socket && req.socket.remoteAddress) || 'x')).split(',')[0].trim(); }
const cfg = () => ({ url: String(process.env.SUPABASE_URL || '').replace(/\/+$/, ''), key: process.env.SUPABASE_SERVICE_ROLE_KEY });
const sha = s => crypto.createHash('sha256').update(String(s)).digest();
const iguales = (a, b) => crypto.timingSafeEqual(sha(a), sha(b));

const cubos = new Map();
function limite(clave, max, ms){
  const t = Date.now(), l = (cubos.get(clave) || []).filter(x => t - x < ms);
  if(l.length >= max){ cubos.set(clave, l); return true; }
  l.push(t); cubos.set(clave, l); if(cubos.size > 5000) cubos.clear(); return false;
}

async function db(path, opts){
  const c = cfg(), ctrl = new AbortController(), t = setTimeout(() => ctrl.abort(), 10000);
  try{
    const r = await fetch(c.url + path, Object.assign({ signal: ctrl.signal }, opts, { headers: Object.assign({ apikey: c.key, Authorization: 'Bearer ' + c.key }, (opts && opts.headers) || {}) }));
    let j = null; try{ j = await r.json(); }catch(e){}
    return { status: r.status, json: j };
  } finally { clearTimeout(t); }
}
const rest = (path, opts) => db('/rest/v1/' + path, Object.assign({}, opts, { headers: Object.assign({ 'Content-Type': 'application/json' }, (opts && opts.headers) || {}) }));
const J = o => JSON.stringify(o);

function dispositivo(ua){
  ua = String(ua || '');
  const so = /Android/i.test(ua) ? 'Android' : /iPhone|iPad|iOS/i.test(ua) ? 'iPhone/iPad' : /Windows/i.test(ua) ? 'Windows' : /Mac OS/i.test(ua) ? 'Mac' : /Linux/i.test(ua) ? 'Linux' : 'Dispositivo';
  const nav = /Edg\//i.test(ua) ? 'Edge' : /OPR\/|Opera/i.test(ua) ? 'Opera' : /Chrome\//i.test(ua) ? 'Chrome' : /Firefox\//i.test(ua) ? 'Firefox' : /Safari\//i.test(ua) ? 'Safari' : 'Navegador';
  return (nav + ' en ' + so).slice(0, 60);
}
function ipMasc(ip){ ip = String(ip || ''); if(ip.includes('.')) return ip.split('.').slice(0, 2).join('.') + '.*.*'; if(ip.includes(':')) return ip.split(':').slice(0, 2).join(':') + ':*'; return '—'; }
const SID = /^[a-f0-9]{24,48}$/;

// Detecta el formato REAL de la imagen por sus primeros bytes (no se confía en lo que diga el navegador)
function formatoReal(buf){
  if(buf.length > 3 && buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) return 'image/jpeg';
  if(buf.length > 8 && buf[0] === 0x89 && buf.slice(1, 4).toString() === 'PNG') return 'image/png';
  if(buf.length > 12 && buf.slice(0, 4).toString() === 'RIFF' && buf.slice(8, 12).toString() === 'WEBP') return 'image/webp';
  return null;
}

async function aviso(userId, tipo, titulo, cuerpo){
  try{ await rest('notificaciones_cuenta', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: J({ user_id: userId, tipo, titulo, cuerpo }) }); }catch(e){}
}
async function borrarFotos(userId){
  const c = cfg();
  try{ await db('/storage/v1/object/' + BUCKET, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: J({ prefixes: ['jpg', 'png', 'webp'].map(x => userId + '.' + x) }) }); }catch(e){}
  return c;
}

module.exports = async function handler(req, res){
  try{
    if(req.method !== 'POST') return enviar(res, { ok: false, code: 'metodo' }, 405);
    const b = (req.body && typeof req.body === 'object') ? req.body : {}, ip = ipDe(req), a = String(b.action || '');
    const c = cfg();
    if(!c.url || !c.key) return enviar(res, { ok: false, code: 'sin_configurar', message: 'Falta SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en Vercel' });
    if(limite('g|' + ip, 300, 60000)) return enviar(res, { ok: false, code: 'limite', message: 'Demasiadas solicitudes, espera un momento' }, 429);

    // ── identidad: usuario + huella de contraseña (se compara en tiempo constante) ──
    const u = String(b.username || '').trim().slice(0, 60), h = String(b.hash || '').slice(0, 200);
    if(!u || !h) return enviar(res, { ok: false, code: 'credenciales', message: 'Inicia sesión de nuevo' }, 401);
    if(limite('a|' + ip, 80, 600000)) return enviar(res, { ok: false, code: 'limite', message: 'Demasiados intentos, espera unos minutos' }, 429);
    const r0 = await rest('profiles?username=eq.' + encodeURIComponent(u) + '&select=id,username,password_hash,nombre,whatsapp,banned,avatar_url&limit=1');
    if(r0.status >= 400) return enviar(res, { ok: false, code: 'db', message: 'Falta ejecutar perfil_cuenta.sql en Supabase (columna avatar_url)' });
    const p = Array.isArray(r0.json) ? r0.json[0] : null;
    if(!p || !p.password_hash || !iguales(h, p.password_hash)) return enviar(res, { ok: false, code: 'credenciales', message: 'Vuelve a iniciar sesión' }, 401);
    if(p.banned) return enviar(res, { ok: false, code: 'cuenta_suspendida', message: 'Tu cuenta está suspendida' }, 403);
    const uid = p.id, ua = dispositivo(req.headers['user-agent']);

    // ═════ FOTO ═════
    if(a === 'foto_subir'){
      if(limite('f|' + uid, 10, 3600000)) return enviar(res, { ok: false, code: 'limite', message: 'Cambiaste tu foto muchas veces. Intenta en una hora.' }, 429);
      const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(b.imagen || ''));
      if(!m) return enviar(res, { ok: false, code: 'formato', message: 'Solo se aceptan imágenes JPG, PNG o WEBP' });
      const buf = Buffer.from(m[2], 'base64');
      if(!buf.length || buf.length > MAX_BYTES) return enviar(res, { ok: false, code: 'tamano', message: 'La imagen es demasiado grande (máximo ' + Math.round(MAX_BYTES / 1024) + ' KB)' });
      const tipo = formatoReal(buf);
      if(!tipo) return enviar(res, { ok: false, code: 'formato', message: 'El archivo no es una imagen válida (JPG, PNG o WEBP)' });
      await borrarFotos(uid);                                   // una sola foto por cuenta: se retira la anterior (cualquier formato)
      const ruta = uid + '.' + FORMATOS[tipo];
      const up = await db('/storage/v1/object/' + BUCKET + '/' + ruta, { method: 'POST', headers: { 'Content-Type': tipo, 'x-upsert': 'true', 'Cache-Control': 'max-age=3600' }, body: buf });
      if(up.status >= 400) return enviar(res, { ok: false, code: 'storage', message: 'No se pudo guardar la foto. ¿Ejecutaste perfil_cuenta.sql (crea el almacenamiento "avatares")?' });
      const url = c.url + '/storage/v1/object/public/' + BUCKET + '/' + ruta + '?v=' + Date.now().toString(36);
      const pr = await rest('profiles?id=eq.' + encodeURIComponent(uid), { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: J({ avatar_url: url }) });
      if(pr.status >= 400) return enviar(res, { ok: false, code: 'db', message: 'No se pudo asociar la foto a tu cuenta' });
      return enviar(res, { ok: true, avatar_url: url });
    }
    if(a === 'foto_borrar'){
      await borrarFotos(uid);
      const pr = await rest('profiles?id=eq.' + encodeURIComponent(uid), { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: J({ avatar_url: null }) });
      if(pr.status >= 400) return enviar(res, { ok: false, code: 'db', message: 'No se pudo quitar la foto' });
      return enviar(res, { ok: true, avatar_url: null });
    }

    // ═════ EDITAR PERFIL (solo nombre y WhatsApp) ═════
    if(a === 'perfil_editar'){
      const cambios = {};
      if(b.nombre != null){
        const n = String(b.nombre).replace(/\s+/g, ' ').trim();
        if(n.length < 2 || n.length > 60) return enviar(res, { ok: false, code: 'nombre', message: 'El nombre debe tener entre 2 y 60 caracteres' });
        cambios.nombre = n;
      }
      if(b.whatsapp != null){
        const w = String(b.whatsapp).replace(/\D/g, '');
        if(w.length < 10 || w.length > 15) return enviar(res, { ok: false, code: 'whatsapp', message: 'El WhatsApp debe tener entre 10 y 15 dígitos (con lada)' });
        if(w !== String(p.whatsapp || '')){
          const dup = await rest('profiles?whatsapp=eq.' + encodeURIComponent(w) + '&id=neq.' + encodeURIComponent(uid) + '&select=id&limit=1');
          if(Array.isArray(dup.json) && dup.json.length) return enviar(res, { ok: false, code: 'whatsapp_repetido', message: 'Ese número de WhatsApp ya está registrado en otra cuenta' });
        }
        cambios.whatsapp = w;
      }
      if(!Object.keys(cambios).length) return enviar(res, { ok: false, code: 'vacio', message: 'No hay nada que guardar' });
      const pr = await rest('profiles?id=eq.' + encodeURIComponent(uid), { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: J(cambios) });
      if(pr.status >= 400) return enviar(res, { ok: false, code: 'db', message: 'No se pudo guardar' });
      return enviar(res, { ok: true, nombre: cambios.nombre != null ? cambios.nombre : p.nombre, whatsapp: cambios.whatsapp != null ? cambios.whatsapp : p.whatsapp });
    }

    // ═════ CONTRASEÑA ═════
    if(a === 'pass_cambiar'){
      if(limite('p|' + uid, 8, 3600000)) return enviar(res, { ok: false, code: 'limite', message: 'Demasiados intentos. Intenta en una hora.' }, 429);
      const act = String(b.actual || '').slice(0, 200), nue = String(b.nuevo || '').slice(0, 200);
      if(!act || !iguales(act, p.password_hash)) return enviar(res, { ok: false, code: 'actual_incorrecta', message: 'La contraseña actual es incorrecta' });
      if(iguales(nue, p.password_hash)) return enviar(res, { ok: false, code: 'igual', message: 'La nueva contraseña debe ser distinta a la actual' });
      if(!/^[0-9a-z]{2,60}$/.test(nue)) return enviar(res, { ok: false, code: 'nueva_invalida', message: 'Contraseña nueva no válida' });
      const pr = await rest('profiles?id=eq.' + encodeURIComponent(uid), { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: J({ password_hash: nue }) });
      if(pr.status >= 400) return enviar(res, { ok: false, code: 'db', message: 'No se pudo cambiar la contraseña' });
      const sid = SID.test(String(b.sid || '')) ? String(b.sid) : null;
      // por seguridad se cierran las demás sesiones abiertas
      await rest('sesiones_cuenta?user_id=eq.' + encodeURIComponent(uid) + '&revocada=eq.false' + (sid ? '&sid=neq.' + sid : ''), { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: J({ revocada: true }) });
      await aviso(uid, 'seguridad', 'Contraseña cambiada', 'Cambiaste la contraseña desde ' + ua + '. Las demás sesiones se cerraron. Si no fuiste tú, contacta a soporte.');
      return enviar(res, { ok: true });
    }

    // ═════ SESIONES ═════
    if(a === 'sesion_ping'){
      let sid = SID.test(String(b.sid || '')) ? String(b.sid) : '', ses = null;
      if(sid){
        const r = await rest('sesiones_cuenta?sid=eq.' + sid + '&user_id=eq.' + encodeURIComponent(uid) + '&select=sid,revocada&limit=1');
        if(r.status >= 400) return enviar(res, { ok: false, code: 'db', message: 'Falta ejecutar perfil_cuenta.sql (tabla sesiones_cuenta)' });
        ses = Array.isArray(r.json) ? r.json[0] : null;
      }
      if(ses && ses.revocada) return enviar(res, { ok: true, revocada: true });
      const ahora = new Date().toISOString();
      if(!ses){
        sid = crypto.randomBytes(16).toString('hex');
        const ins = await rest('sesiones_cuenta', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: J({ sid, user_id: uid, dispositivo: ua, ip, ultima: ahora }) });
        if(ins.status >= 400) return enviar(res, { ok: false, code: 'db', message: 'Falta ejecutar perfil_cuenta.sql (tabla sesiones_cuenta)' });
      } else {
        await rest('sesiones_cuenta?sid=eq.' + sid, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: J({ ultima: ahora, dispositivo: ua, ip }) });
      }
      await rest('profiles?id=eq.' + encodeURIComponent(uid), { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: J({ last_seen: ahora }) });
      return enviar(res, { ok: true, revocada: false, sid, ultima: ahora, avatar_url: p.avatar_url || null, nombre: p.nombre || '', whatsapp: p.whatsapp || '' });
    }
    if(a === 'sesiones'){
      const r = await rest('sesiones_cuenta?user_id=eq.' + encodeURIComponent(uid) + '&revocada=eq.false&ultima=gt.' + encodeURIComponent(new Date(Date.now() - 60 * 864e5).toISOString()) + '&select=sid,dispositivo,ip,creada,ultima&order=ultima.desc&limit=15');
      if(r.status >= 400) return enviar(res, { ok: false, code: 'db', message: 'Falta ejecutar perfil_cuenta.sql' });
      const actual = String(b.sid || '');
      return enviar(res, { ok: true, sesiones: (r.json || []).map(s => ({ id: s.sid.slice(0, 8), actual: s.sid === actual, dispositivo: s.dispositivo, ip: ipMasc(s.ip), creada: s.creada, ultima: s.ultima, _sid: s.sid })).map(s => ({ id: s.id, actual: s.actual, dispositivo: s.dispositivo, ip: s.ip, creada: s.creada, ultima: s.ultima })) });
    }
    if(a === 'sesion_cerrar'){
      const sid = String(b.sid || ''), obj = String(b.objetivo || '').replace(/[^a-f0-9]/g, '').slice(0, 8);
      if(obj.length !== 8) return enviar(res, { ok: false, code: 'objetivo', message: 'Sesión no válida' });
      const r = await rest('sesiones_cuenta?user_id=eq.' + encodeURIComponent(uid) + '&revocada=eq.false&sid=like.' + obj + '*&select=sid');
      const lista = (r.json || []).filter(s => s.sid !== sid);
      if(!lista.length) return enviar(res, { ok: false, code: 'objetivo', message: 'No se encontró esa sesión' });
      await rest('sesiones_cuenta?user_id=eq.' + encodeURIComponent(uid) + '&sid=eq.' + lista[0].sid, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: J({ revocada: true }) });
      return enviar(res, { ok: true });
    }
    if(a === 'sesion_salir'){
      const sid = SID.test(String(b.sid || '')) ? String(b.sid) : null;
      if(sid) await rest('sesiones_cuenta?user_id=eq.' + encodeURIComponent(uid) + '&sid=eq.' + sid, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: J({ revocada: true }) });
      return enviar(res, { ok: true });
    }
    if(a === 'sesion_cerrar_otras'){
      const sid = SID.test(String(b.sid || '')) ? String(b.sid) : null;
      if(!sid) return enviar(res, { ok: false, code: 'sid', message: 'Sesión actual no válida' });
      const r = await rest('sesiones_cuenta?user_id=eq.' + encodeURIComponent(uid) + '&revocada=eq.false&sid=neq.' + sid, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: J({ revocada: true }) });
      const n = Array.isArray(r.json) ? r.json.length : 0;
      if(n) await aviso(uid, 'seguridad', 'Sesiones cerradas', 'Cerraste ' + n + ' sesión(es) desde ' + ua + '.');
      return enviar(res, { ok: true, cerradas: n });
    }

    // ═════ AVISOS DE LA CUENTA ═════
    if(a === 'notif_lista'){
      const r = await rest('notificaciones_cuenta?user_id=eq.' + encodeURIComponent(uid) + '&select=id,tipo,titulo,cuerpo,leida,created_at&order=created_at.desc&limit=40');
      if(r.status >= 400) return enviar(res, { ok: false, code: 'db', message: 'Falta ejecutar perfil_cuenta.sql' });
      return enviar(res, { ok: true, items: r.json || [] });
    }
    if(a === 'notif_leer'){
      const ids = Array.isArray(b.ids) ? b.ids.map(Number).filter(Number.isInteger).slice(0, 100) : null;
      await rest('notificaciones_cuenta?user_id=eq.' + encodeURIComponent(uid) + '&leida=eq.false' + (ids && ids.length ? '&id=in.(' + ids.join(',') + ')' : ''), { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: J({ leida: true }) });
      return enviar(res, { ok: true });
    }
    return enviar(res, { ok: false, code: 'accion', message: 'Acción no permitida' }, 400);
  }catch(e){ return enviar(res, { ok: false, code: 'error', message: 'Error del servidor' }); }
};

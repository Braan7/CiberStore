// ═══════════════════════════════════════════════════════════════════════════
// api/admin.js · Inicio de sesión del panel de administrador (verificado en el servidor).
// Acciones (POST JSON): login {email, password} → {ok, token, exp} · verificar {token} → {ok, exp}
// Variables de entorno en Vercel (OBLIGATORIAS para entrar al panel):
//   ADMIN_EMAIL       el correo con el que entras al panel
//   ADMIN_PASSWORD    tu contraseña NUEVA (mínimo 10 caracteres). Cambiarla cierra todas las sesiones abiertas.
//   (opcional) ADMIN_SESION_DIAS   cuántos días dura la sesión en tu dispositivo (por defecto 30)
// ═══════════════════════════════════════════════════════════════════════════
'use strict';
const crypto = require('crypto');
const S = require('./_sesion.js');

function enviar(res, status, body){ res.statusCode = status; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('Cache-Control', 'no-store'); res.end(JSON.stringify(body)); }
const h = s => crypto.createHash('sha256').update(String(s)).digest();
const iguales = (a, b) => crypto.timingSafeEqual(h(a), h(b));
function ipDe(req){ return String((req.headers['x-forwarded-for'] || (req.socket && req.socket.remoteAddress) || 'x')).split(',')[0].trim(); }
const fallos = new Map();
function bloqueada(ip){ const t = Date.now(), l = (fallos.get(ip) || []).filter(x => t - x < 600000); fallos.set(ip, l); return l.length >= 6; }   // 6 intentos fallidos cada 10 minutos
function anotarFallo(ip){ const l = fallos.get(ip) || []; l.push(Date.now()); fallos.set(ip, l); }

module.exports = async function handler(req, res){
  try{
    if(req.method !== 'POST') return enviar(res, 405, { ok: false, code: 'metodo' });
    const b = (req.body && typeof req.body === 'object') ? req.body : {}, ip = ipDe(req);
    const E = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase(), P = String(process.env.ADMIN_PASSWORD || '');
    if(!E || !P) return enviar(res, 200, { ok: false, code: 'sin_configurar', message: 'Falta configurar ADMIN_EMAIL y ADMIN_PASSWORD en Vercel' });
    if(P.length < 10) return enviar(res, 200, { ok: false, code: 'contrasena_corta', message: 'ADMIN_PASSWORD debe tener al menos 10 caracteres' });

    if(b.action === 'verificar'){
      const d = S.verificar(b.token);
      return enviar(res, 200, d ? { ok: true, exp: d.exp } : { ok: false, code: 'sesion_invalida' });
    }
    if(b.action === 'login'){
      if(bloqueada(ip)) return enviar(res, 429, { ok: false, code: 'demasiados_intentos', message: 'Demasiados intentos. Espera 10 minutos.' });
      const email = String(b.email || '').trim().toLowerCase(), pass = String(b.password || '');
      const ok = iguales(email, E) & iguales(pass, P);   // se comparan las dos siempre (mismo tiempo de respuesta)
      if(!ok){ anotarFallo(ip); return enviar(res, 401, { ok: false, code: 'credenciales', message: 'Correo o contraseña incorrectos' }); }
      const s = S.firmar(E);
      if(!s) return enviar(res, 200, { ok: false, code: 'sin_configurar', message: 'Falta configurar ADMIN_PASSWORD en Vercel' });
      return enviar(res, 200, { ok: true, token: s.token, exp: s.exp });
    }
    return enviar(res, 400, { ok: false, code: 'accion' });
  }catch(e){ return enviar(res, 200, { ok: false, code: 'error', message: 'Error del servidor' }); }
};

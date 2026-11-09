// ═══════════════════════════════════════════════════════════════════════════
// api/_sesion.js · Sesión de administrador firmada (la usan api/admin.js y api/co.js).
// El token se firma con un secreto que SOLO vive en Vercel. Si cambias ADMIN_PASSWORD, todas las sesiones abiertas se cierran solas.
// ═══════════════════════════════════════════════════════════════════════════
'use strict';
const crypto = require('crypto');

function secreto(){
  const base = process.env.ADMIN_SECRET || ((process.env.CO_ADMIN_TOKEN || '') + '|' + (process.env.ADMIN_PASSWORD || ''));
  return (process.env.ADMIN_PASSWORD && base.length >= 16) ? base : null;
}
function dias(){ const n = Number(process.env.ADMIN_SESION_DIAS || 30); return (isFinite(n) && n > 0 && n <= 365) ? n : 30; }
function firmar(email){
  const sec = secreto(); if(!sec) return null;
  const exp = Date.now() + dias() * 86400000;
  const p = Buffer.from(JSON.stringify({ u: email, exp, v: 1 })).toString('base64url');
  const sig = crypto.createHmac('sha256', sec).update(p).digest('base64url');
  return { token: 's1.' + p + '.' + sig, exp };
}
function verificar(tok){
  try{
    const sec = secreto();
    if(!sec || typeof tok !== 'string' || tok.slice(0, 3) !== 's1.') return null;
    const partes = tok.split('.'); if(partes.length !== 3) return null;
    const esp = crypto.createHmac('sha256', sec).update(partes[1]).digest('base64url');
    const a = Buffer.from(partes[2]), b = Buffer.from(esp);
    if(a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const d = JSON.parse(Buffer.from(partes[1], 'base64url').toString('utf8'));
    return (d && d.exp > Date.now()) ? d : null;
  }catch(e){ return null; }
}
module.exports = { firmar, verificar, secreto, dias };

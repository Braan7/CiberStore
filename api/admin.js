// ═══════════════════════════════════════════════════════════════════════════
// api/admin.js · Inicio de sesión del panel de administrador (verificado en el servidor).
// Acciones (POST JSON): login {email, password} → {ok, token, exp} · verificar {token} → {ok, exp}
// Variables de entorno en Vercel (OBLIGATORIAS para entrar al panel):
//   ADMIN_EMAIL       el correo con el que entras al panel
//   ADMIN_PASSWORD    tu contraseña NUEVA (mínimo 10 caracteres). Cambiarla cierra todas las sesiones abiertas.
//   (opcional) ADMIN_SESION_DIAS   cuántos días dura la sesión en tu dispositivo (por defecto 30)
//   SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY   para premios, entregas y correcciones de ventas (Supabase → Settings → API → service_role)
// ═══════════════════════════════════════════════════════════════════════════
'use strict';
const crypto = require('crypto');
const S = require('./_sesion.js');

function enviar(res, status, body){ res.statusCode = status; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('Cache-Control', 'no-store'); res.end(JSON.stringify(body)); }
const h = s => crypto.createHash('sha256').update(String(s)).digest();
const iguales = (a, b) => crypto.timingSafeEqual(h(a), h(b));
function ipDe(req){ return String((req.headers['x-forwarded-for'] || (req.socket && req.socket.remoteAddress) || 'x')).split(',')[0].trim(); }
// Funciones de la base que el panel puede usar (definidas en ranking_premios_gastos.sql) y los datos que acepta cada una
const FUNCIONES = {
  admin_premio_guardar:  ['p_posicion', 'p_premio', 'p_producto', 'p_equivalente', 'p_admin'],
  admin_premio_estado:   ['p_mes', 'p_posicion', 'p_estado', 'p_nota', 'p_equivalente', 'p_admin'],
  admin_venta_anular:    ['p_id', 'p_motivo', 'p_admin'],
  admin_venta_restaurar: ['p_id', 'p_motivo', 'p_admin'],
  admin_venta_manual:    ['p_username', 'p_diamantes', 'p_monto', 'p_nota', 'p_admin'],
  admin_auditoria:       ['p_limite'],
  admin_tickets_borrar:  ['p_ids', 'p_admin']      // tickets_admin.sql
};
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
    // ── Acciones de administrador sobre la base de datos (premios, entregas y correcciones de ventas) ──
    // Solo con tu sesión del panel. Usa la llave de servicio de Supabase, que vive SOLO en Vercel.
    if(b.action === 'db'){
      const d = S.verificar(b.token);
      if(!d) return enviar(res, 401, { ok: false, code: 'sesion_invalida', message: 'Tu sesión venció. Entra de nuevo.' });
      const fn = String(b.fn || ''), F = FUNCIONES[fn];
      if(!F) return enviar(res, 400, { ok: false, code: 'funcion', message: 'Acción no permitida' });
      const url = String((process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL) || '').replace(/\/+$/, ''), key = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SECRET_KEY || process.env.SERVICE_ROLE_KEY);
      if(!url || !key) return enviar(res, 200, { ok: false, code: 'sin_service_key', message: 'Falta configurar SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en Vercel' });
      const a = (b.args && typeof b.args === 'object') ? b.args : {}, args = {};
      F.forEach(k => { if(a[k] !== undefined) args[k] = a[k]; });
      if(F.indexOf('p_admin') >= 0) args.p_admin = d.u;            // quién lo hizo: lo pone el servidor, no el navegador
      const ctrl = new AbortController(), t = setTimeout(() => ctrl.abort(), 9000);
      try{
        const r = await fetch(url + '/rest/v1/rpc/' + fn, { method: 'POST', signal: ctrl.signal,
          headers: { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' }, body: JSON.stringify(args) });
        let j = null; try{ j = await r.json(); }catch(e){}
        if(r.status >= 400) return enviar(res, 200, { ok: false, code: 'db', message: (j && j.message) ? String(j.message).slice(0, 200) : 'Error de la base de datos (' + r.status + ')' });
        return enviar(res, 200, { ok: true, data: j });
      } finally { clearTimeout(t); }
    }
    return enviar(res, 400, { ok: false, code: 'accion' });
  }catch(e){ return enviar(res, 200, { ok: false, code: 'error', message: 'Error del servidor' }); }
};

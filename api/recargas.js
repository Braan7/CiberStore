// ═════════════════════════════════════════════════════════════════
// api/recargas.js · Billetera / Recarga de saldo de CiberStore (todo se valida en el servidor).
//
// CLIENTE (cada llamada lleva {username, hash}, igual que api/perfil.js; solo toca SU cuenta):
//   cuentas                     → cuentas bancarias activas (Klar, Hey Banco… las que configure el panel)
//   solicitar {cuenta_id, monto, titular, referencia, fecha, comprobante(data URL), idem}
//   mis                         → mis solicitudes (estado, banco, monto, fechas, motivo de rechazo)
//   comprobante_url {id}        → enlace temporal (5 min) a MI comprobante
// ADMINISTRADOR (llevan {token} de la sesión del panel; nunca el saldo viene del navegador):
//   admin_lista {estado}        → solicitudes con datos del usuario        admin_pendientes → contador
//   admin_comprobante {id}      → enlace temporal al comprobante           admin_resolver {id, accion:'aprobar'|'rechazar', motivo}
//   admin_cuentas / admin_cuenta_guardar / admin_cuenta_borrar             admin_auditoria
//
// El saldo SOLO lo mueve la función SQL recarga_resolver (transacción + bloqueo de fila): imposible acreditar dos veces.
// Variables de entorno: SUPABASE_URL · SUPABASE_SERVICE_ROLE_KEY (las mismas del chat/perfil) · ADMIN_* (las del panel)
//   Opcionales: RECARGA_MIN_MXN (por defecto 200) · RECARGA_MAX_MXN (por defecto 50000) · TG_BOT_TOKEN + TG_CHAT_ID (aviso a tu Telegram)
// Base de datos: ejecutar recargas_saldo.sql una vez.
// ═════════════════════════════════════════════════════════════════
'use strict';
const crypto = require('crypto');
const S = require('./_sesion.js');

const BUCKET = 'comprobantes';
const MAX_BYTES = 3200 * 1024;     // Vercel admite ~4.5 MB por petición: las fotos se reducen en el navegador y el PDF puede pesar hasta ~3 MB
const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'application/pdf': 'pdf' };
const MIN_USD = () => { const n = Number(process.env.RECARGA_MIN_USD); return isFinite(n) && n > 0 ? n : 5; };
// Tipo de cambio USD → moneda. Fuente principal: cotización de mercado casi en vivo (Yahoo Finance, sin llave; caché 5 min).
// Respaldo 1: open.er-api.com · Respaldo 2: currency-api (jsDelivr). Ambos se actualizan cada día. Si todo falla se usa la última tasa buena (máx. 12 h).
const _tc = new Map();            // MONEDA → { v, t, fuente }
let _tabla = { t: 0, r: null, fuente: '' };
async function getJSON(url, ms){ const ctrl = new AbortController(), x = setTimeout(() => ctrl.abort(), ms || 4000); try{ const r = await fetch(url, { signal: ctrl.signal, headers: { 'User-Agent': 'Mozilla/5.0 CiberStore' } }); if(r.status >= 400) return null; return await r.json(); }catch(e){ return null; } finally { clearTimeout(x); } }
async function tablaDiaria(){
  if(_tabla.r && Date.now() - _tabla.t < 30 * 60000) return _tabla;
  let j = await getJSON('https://open.er-api.com/v6/latest/USD');
  if(j && j.rates && j.rates.MXN > 0){ _tabla = { t: Date.now(), r: j.rates, fuente: 'open.er-api.com' }; return _tabla; }
  j = await getJSON('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json');
  if(j && j.usd && j.usd.mxn > 0){ const r = {}; Object.keys(j.usd).forEach(k => { r[k.toUpperCase()] = j.usd[k]; }); _tabla = { t: Date.now(), r, fuente: 'currency-api' }; return _tabla; }
  return _tabla;
}
async function tasaUSD(cur){
  cur = String(cur || '').toUpperCase(); if(cur === 'USD') return { v: 1, t: Date.now(), fuente: '-' };
  const c = _tc.get(cur); if(c && Date.now() - c.t < 5 * 60000) return c;
  const y = await getJSON('https://query1.finance.yahoo.com/v8/finance/chart/USD' + cur + '=X?interval=1m&range=1d');
  const m = y && y.chart && y.chart.result && y.chart.result[0] && y.chart.result[0].meta;
  if(m && m.regularMarketPrice > 0){ const o = { v: Number(m.regularMarketPrice), t: Date.now(), hora: m.regularMarketTime ? m.regularMarketTime * 1000 : Date.now(), fuente: 'mercado' }; _tc.set(cur, o); return o; }
  const d = await tablaDiaria();
  if(d.r && d.r[cur] > 0){ const o = { v: Number(d.r[cur]), t: Date.now() - 24 * 60000, hora: d.t, fuente: d.fuente }; _tc.set(cur, o); return o; }
  if(c && Date.now() - c.t < 12 * 3600000) return c;   // última buena
  return null;
}
// rates = { MXN, [moneda…], _info:{ hora, fuente } } para las monedas pedidas
async function tasasUSD(monedas){
  const out = {}, lista = Array.from(new Set(['MXN'].concat((monedas || []).filter(m => m && m !== 'MXN').map(m => String(m).toUpperCase())))); let hora = 0, fuente = 'mercado';
  for(const m of lista){ const o = await tasaUSD(m); if(o){ out[m] = o.v; if(!hora || (o.hora || o.t) < hora) hora = o.hora || o.t; if(o.fuente !== 'mercado') fuente = o.fuente; } }
  if(!(out.MXN > 0)) out.MXN = Number(process.env.USD_MXN_RESPALDO) || 18.5;   // último recurso
  Object.defineProperty(out, '_info', { value: { hora: hora || Date.now(), fuente }, enumerable: false });
  return out;
}
const r2 = n => Math.round(Number(n) * 100) / 100;
// Cálculo único (cliente y servidor muestran lo mismo): USD → lo que paga en su moneda (con comisión) y lo que se acredita en MXN
function cotizar(cu, usd, rates){
  const mxn = rates.MXN, esMX = !cu.moneda || cu.moneda === 'MXN';
  const tasa = esMX ? null : (Number(cu.tasa) > 0 ? Number(cu.tasa) : rates[cu.moneda]);
  if(!(mxn > 0) || (!esMX && !(tasa > 0))) return null;
  const credito = r2(usd * mxn);
  if(esMX) return { usd, credito, moneda: 'MXN', base: credito, comision: 0, comision_pct: 0, pagar: credito, tasa: null, usd_mxn: mxn };
  const base = r2(usd * tasa), pct = Number(cu.comision_pct) || 0, fija = Number(cu.comision) || 0, comision = r2(base * pct / 100 + fija);
  return { usd, credito, moneda: cu.moneda, base, comision, comision_pct: pct, comision_fija: fija, pagar: r2(base + comision), tasa, usd_mxn: mxn };
}
const MIN = () => { const n = Number(process.env.RECARGA_MIN_MXN); return isFinite(n) && n > 0 ? n : Math.ceil(MIN_USD() * ((_tc.get('MXN') || {}).v || 18.5)); };
const MAX = () => { const n = Number(process.env.RECARGA_MAX_MXN); return isFinite(n) && n > 0 ? n : 50000; };

function enviar(res, body, status){ res.statusCode = status || 200; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('Cache-Control', 'no-store'); res.end(JSON.stringify(body)); }
function ipDe(req){ return String((req.headers['x-forwarded-for'] || (req.socket && req.socket.remoteAddress) || 'x')).split(',')[0].trim(); }
const cfg = () => ({ url: String((process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL) || '').replace(/\/+$/, ''), key: (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SECRET_KEY || process.env.SERVICE_ROLE_KEY) });
const sha = s => crypto.createHash('sha256').update(String(s)).digest();
const iguales = (a, b) => crypto.timingSafeEqual(sha(a), sha(b));
const J = o => JSON.stringify(o);

const cubos = new Map();
function limite(clave, max, ms){
  const t = Date.now(), l = (cubos.get(clave) || []).filter(x => t - x < ms);
  if(l.length >= max){ cubos.set(clave, l); return true; }
  l.push(t); cubos.set(clave, l); if(cubos.size > 5000) cubos.clear(); return false;
}
async function db(path, opts){
  const c = cfg(), ctrl = new AbortController(), t = setTimeout(() => ctrl.abort(), 15000);
  try{
    const r = await fetch(c.url + path, Object.assign({ signal: ctrl.signal }, opts, { headers: Object.assign({ apikey: c.key, Authorization: 'Bearer ' + c.key }, (opts && opts.headers) || {}) }));
    let j = null; try{ j = await r.json(); }catch(e){}
    return { status: r.status, json: j };
  } finally { clearTimeout(t); }
}
const rest = (path, opts) => db('/rest/v1/' + path, Object.assign({}, opts, { headers: Object.assign({ 'Content-Type': 'application/json' }, (opts && opts.headers) || {}) }));
const dinero = n => '$' + Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' MXN';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Formato REAL del archivo por sus primeros bytes (no se confía en lo que diga el navegador)
function formatoReal(buf){
  if(buf.length > 3 && buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) return 'image/jpeg';
  if(buf.length > 8 && buf[0] === 0x89 && buf.slice(1, 4).toString() === 'PNG') return 'image/png';
  if(buf.length > 12 && buf.slice(0, 4).toString() === 'RIFF' && buf.slice(8, 12).toString() === 'WEBP') return 'image/webp';
  if(buf.length > 5 && buf.slice(0, 5).toString() === '%PDF-') return 'application/pdf';
  return null;
}
async function aviso(userId, titulo, cuerpo){
  try{ await rest('notificaciones_cuenta', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: J({ user_id: String(userId), tipo: 'recarga', titulo, cuerpo }) }); }catch(e){}
}
async function auditar(id, accion, actor, detalle){
  try{ await rest('recargas_auditoria', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: J({ recarga_id: id || null, accion, actor, detalle: detalle || {} }) }); }catch(e){}
}
async function telegram(texto){
  const t = (process.env.TG_BOT_TOKEN || process.env.TG_TOKEN || process.env.BOT_TOKEN), ch = (process.env.TG_CHAT_ID || process.env.TG_CHAT || process.env.TG_ID); if(!t || !ch) return;
  try{ const ctrl = new AbortController(), x = setTimeout(() => ctrl.abort(), 5000);
    await fetch('https://api.telegram.org/bot' + t + '/sendMessage', { method: 'POST', signal: ctrl.signal, headers: { 'Content-Type': 'application/json' }, body: J({ chat_id: ch, text: texto, parse_mode: 'HTML' }) }); clearTimeout(x); }catch(e){}
}
// Aviso de solicitud + COMPROBANTE a tu Telegram.
//  · Si pones TG_BOT_TOKEN + TG_CHAT_ID en Vercel: va directo por tu bot (foto o PDF con el texto).
//  · Si no: usa la misma función de Supabase que ya te mandaba los comprobantes (bright-task), con la foto adjunta.
let webhookListo = false;
async function asegurarWebhook(t, host){
  if(webhookListo || !host) return;
  try{
    const sec = require('./telegram.js').secreto(), url = 'https://' + host + '/api/telegram';
    const w = await (await fetch('https://api.telegram.org/bot' + t + '/getWebhookInfo')).json();
    if(!w.result || w.result.url !== url){ await fetch('https://api.telegram.org/bot' + t + '/setWebhook', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: J({ url, secret_token: sec, allowed_updates: ['callback_query'] }) }); }
    webhookListo = true;
  }catch(e){}
}
async function avisoSolicitud(texto, id, buf, tipo, usuario, metodo, monto, extra, host){
  const t = (process.env.TG_BOT_TOKEN || process.env.TG_TOKEN || process.env.BOT_TOKEN), ch = (process.env.TG_CHAT_ID || process.env.TG_CHAT || process.env.TG_ID), esImg = /^image\//.test(tipo);
  const ctrl = new AbortController(), x = setTimeout(() => ctrl.abort(), 8000);
  try{
    if(t && ch){
      await asegurarWebhook(t, host);
      const fd = new FormData(); fd.append('chat_id', ch); if(id) fd.append('reply_markup', J({ inline_keyboard: [[{ text: '✅ Aceptar', callback_data: 'ap:' + id }, { text: '❌ Rechazar', callback_data: 'rj:' + id }]] })); fd.append('caption', texto.slice(0, 1000)); fd.append('parse_mode', 'HTML');
      fd.append(esImg ? 'photo' : 'document', new Blob([buf], { type: tipo }), 'comprobante.' + (EXT[tipo] || 'bin'));
      const r = await fetch('https://api.telegram.org/bot' + t + (esImg ? '/sendPhoto' : '/sendDocument'), { method: 'POST', signal: ctrl.signal, body: fd });
      if(r.status >= 200 && r.status < 300) return;
    }
    const url = process.env.RECARGA_AVISO_URL || process.env.CO_ALERTA_URL || 'https://pnotsqsudqpwqzssevig.supabase.co/functions/v1/bright-task';
    await fetch(url, { method: 'POST', signal: ctrl.signal, headers: { 'Content-Type': 'application/json' },
      body: J({ usuario: usuario, metodo: metodo, monto: 0, extra: 'MONTO SOLICITADO: ' + monto + ' · ' + extra + ' · ⚠️ NO uses ACEPTAR/RECHAZAR de este aviso (es el sistema anterior y no abona bien): resuélvela en el panel → Depósitos, o configura TG_BOT_TOKEN y TG_CHAT_ID en Vercel para tener los botones nuevos.', foto_base64: esImg ? ('data:' + tipo + ';base64,' + buf.toString('base64')) : '' }) });
  }catch(e){} finally { clearTimeout(x); }
}
async function enlace(path){
  const r = await db('/storage/v1/object/sign/' + BUCKET + '/' + path.split('/').map(encodeURIComponent).join('/'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: J({ expiresIn: 300 }) });
  if(r.status >= 400 || !r.json || !r.json.signedURL) return null;
  return cfg().url + '/storage/v1' + r.json.signedURL;
}
const esc = s => String(s == null ? '' : s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const limpiaTxt = (s, n) => String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);

// Lo que el cliente ve de una solicitud (nunca la ruta del archivo ni el hash)
const publica = r => ({ id: r.id, banco: r.banco, monto: Number(r.monto), titular: r.titular, referencia: r.referencia, fecha_transferencia: r.fecha_transferencia,
  estado: r.estado, motivo_rechazo: r.motivo_rechazo || null, creada: r.creada, resuelta: r.resuelta || null, comprobante_tipo: r.comprobante_tipo,
  monto_usd: r.monto_usd != null ? Number(r.monto_usd) : null, monto_local: r.monto_local != null ? Number(r.monto_local) : null, moneda: r.moneda || null });

module.exports = async function handler(req, res){
  try{
    if(req.method !== 'POST') return enviar(res, { ok: false, code: 'metodo' }, 405);
    const b = (req.body && typeof req.body === 'object') ? req.body : {}, ip = ipDe(req), a = String(b.action || '');
    const c = cfg();
    if(!c.url || !c.key) return enviar(res, { ok: false, code: 'sin_configurar', message: 'Falta SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en Vercel' });
    if(limite('g|' + ip, 300, 60000)) return enviar(res, { ok: false, code: 'limite', message: 'Demasiadas solicitudes, espera un momento' }, 429);

    // ═════════════ ADMINISTRADOR ═════════════
    if(a.slice(0, 6) === 'admin_'){
      const d = S.verificar(b.token);
      if(!d) return enviar(res, { ok: false, code: 'sesion_invalida', message: 'Tu sesión del panel venció. Entra de nuevo.' }, 401);
      const adm = String(d.u || 'admin').slice(0, 80);

      if(a === 'admin_pendientes'){
        const r = await rest('recargas_saldo?estado=eq.pendiente&select=id');
        if(r.status >= 400) return enviar(res, { ok: false, code: 'db', message: 'Falta ejecutar recargas_saldo.sql en Supabase' });
        return enviar(res, { ok: true, pendientes: Array.isArray(r.json) ? r.json.length : 0 });
      }
      if(a === 'admin_lista'){
        const est = ['pendiente', 'aprobada', 'rechazada'].indexOf(b.estado) >= 0 ? '&estado=eq.' + b.estado : '';
        const r = await rest('recargas_saldo?select=*' + est + '&order=creada.desc&limit=200');
        if(r.status >= 400) return enviar(res, { ok: false, code: 'db', message: 'Falta ejecutar recargas_saldo.sql en Supabase' });
        const lista = r.json || [], ids = Array.from(new Set(lista.map(x => x.user_id))).filter(x => /^[0-9a-zA-Z-]{1,64}$/.test(x));
        let us = {};
        if(ids.length){
          const p = await rest('profiles?id=in.(' + ids.join(',') + ')&select=id,username,nombre,whatsapp,saldo,created_at');
          (Array.isArray(p.json) ? p.json : []).forEach(x => { us[String(x.id)] = { username: x.username, nombre: x.nombre, whatsapp: x.whatsapp, saldo: x.saldo, desde: x.created_at }; });
        }
        return enviar(res, { ok: true, items: lista.map(x => Object.assign(publica(x), { user_id: x.user_id, username: x.username, resuelta_por: x.resuelta_por, usuario: us[x.user_id] || null })) });
      }
      if(a === 'admin_comprobante'){
        if(!UUID.test(String(b.id || ''))) return enviar(res, { ok: false, code: 'id', message: 'Solicitud no válida' });
        const r = await rest('recargas_saldo?id=eq.' + b.id + '&select=comprobante_path,comprobante_tipo&limit=1');
        const x = Array.isArray(r.json) ? r.json[0] : null;
        if(!x) return enviar(res, { ok: false, code: 'no_existe', message: 'No se encontró la solicitud' });
        const url = await enlace(x.comprobante_path);
        if(!url) return enviar(res, { ok: false, code: 'storage', message: 'No se pudo abrir el comprobante' });
        await auditar(b.id, 'ver_comprobante', adm, {});
        return enviar(res, { ok: true, url, tipo: x.comprobante_tipo });
      }
      if(a === 'admin_resolver'){
        if(limite('ar|' + adm, 60, 60000)) return enviar(res, { ok: false, code: 'limite', message: 'Demasiadas acciones seguidas' }, 429);
        const id = String(b.id || ''), acc = b.accion === 'aprobar' ? 'aprobar' : b.accion === 'rechazar' ? 'rechazar' : '';
        if(!UUID.test(id) || !acc) return enviar(res, { ok: false, code: 'datos', message: 'Datos no válidos' });
        const motivo = limpiaTxt(b.motivo, 300);
        if(acc === 'rechazar' && motivo.length < 3) return enviar(res, { ok: false, code: 'motivo', message: 'Escribe el motivo del rechazo' });
        const r = await db('/rest/v1/rpc/recarga_resolver', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: J({ p_id: id, p_accion: acc, p_motivo: motivo || null, p_admin: adm }) });
        if(r.status >= 400){
          const m = String((r.json && (r.json.message || r.json.hint)) || '');
          if(/ya_resuelta:(\w+)/.test(m)) return enviar(res, { ok: false, code: 'ya_resuelta', message: 'Esta solicitud ya fue ' + /ya_resuelta:(\w+)/.exec(m)[1] + '. No se acreditó de nuevo.' });
          if(/no_existe/.test(m)) return enviar(res, { ok: false, code: 'no_existe', message: 'No se encontró la solicitud' });
          if(/usuario_no_existe/.test(m)) return enviar(res, { ok: false, code: 'usuario', message: 'El usuario de esta solicitud ya no existe' });
          if(/motivo_requerido/.test(m)) return enviar(res, { ok: false, code: 'motivo', message: 'Escribe el motivo del rechazo' });
          if(r.status === 404) return enviar(res, { ok: false, code: 'db', message: 'Falta ejecutar recargas_saldo.sql en Supabase (función recarga_resolver)' });
          return enviar(res, { ok: false, code: 'db', message: 'No se pudo completar la operación' });
        }
        return enviar(res, { ok: true, resultado: r.json });
      }
      if(a === 'admin_cuentas'){
        const r = await rest('cuentas_deposito?select=*&order=orden.asc,created_at.asc');
        if(r.status >= 400) return enviar(res, { ok: false, code: 'db', message: 'Falta ejecutar recargas_saldo.sql en Supabase' });
        return enviar(res, { ok: true, items: r.json || [] });
      }
      if(a === 'admin_cuenta_guardar'){
        const nombre = limpiaTxt(b.nombre, 40), titular = limpiaTxt(b.titular, 80);
        const moneda = /^[A-Z]{3}$/.test(String(b.moneda || 'MXN').toUpperCase()) ? String(b.moneda || 'MXN').toUpperCase() : 'MXN', esMX = moneda === 'MXN';
        const construccion = b.construccion === true;
        let clabe = String(b.clabe || '').replace(/\s/g, ''), detalle = null;
        if(Array.isArray(b.detalle)) detalle = b.detalle.slice(0, 12).map(d => ({ et: limpiaTxt(d && d.et, 40), val: limpiaTxt(d && d.val, 80), copiar: !!(d && d.copiar) })).filter(d => d.et && d.val);
        if(nombre.length < 2) return enviar(res, { ok: false, code: 'nombre', message: 'Escribe el nombre del método' });
        if(!construccion){
          if(titular.length < 3) return enviar(res, { ok: false, code: 'titular', message: 'Escribe el titular de la cuenta' });
          if(esMX && !/^[0-9]{18}$/.test(clabe)) return enviar(res, { ok: false, code: 'clabe', message: 'La CLABE debe tener 18 dígitos' });
          if(!esMX && !(detalle && detalle.length)) return enviar(res, { ok: false, code: 'detalle', message: 'Agrega al menos un dato de pago (Yape, cuenta, alias…)' });
        }
        if(!esMX && !clabe) clabe = (detalle && detalle[0] && detalle[0].val) || '-';
        if(!clabe) clabe = '-';
        const cuerpo = { nombre, titular: titular || '-', clabe, activa: b.activa !== false, orden: Math.max(0, Math.min(999, parseInt(b.orden, 10) || 0)) };
        if(b.pais !== undefined || b.moneda !== undefined || b.construccion !== undefined || b.detalle !== undefined){
          Object.assign(cuerpo, { pais: limpiaTxt(b.pais || (esMX ? 'MX' : ''), 4).toUpperCase() || 'MX', moneda, bandera: limpiaTxt(b.bandera, 8) || null,
            tasa: Number(b.tasa) > 0 ? Number(b.tasa) : null, comision: Math.max(0, Number(b.comision) || 0), comision_pct: Math.max(0, Math.min(50, Number(b.comision_pct) || 0)), detalle: detalle, nota: limpiaTxt(b.nota, 300) || null, construccion });
        }
        let r;
        if(b.id){
          if(!UUID.test(String(b.id))) return enviar(res, { ok: false, code: 'id', message: 'Cuenta no válida' });
          r = await rest('cuentas_deposito?id=eq.' + b.id, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: J(cuerpo) });
        } else r = await rest('cuentas_deposito', { method: 'POST', headers: { Prefer: 'return=representation' }, body: J(cuerpo) });
        if(r.status >= 400) return enviar(res, { ok: false, code: 'db', message: /column|schema/i.test(String((r.json && r.json.message) || '')) ? 'Falta ejecutar metodos_pago.sql en Supabase' : 'No se pudo guardar la cuenta' });
        await auditar(null, b.id ? 'cuenta_editar' : 'cuenta_crear', adm, { nombre, titular, activa: cuerpo.activa });
        return enviar(res, { ok: true, item: Array.isArray(r.json) ? r.json[0] : null });
      }
      if(a === 'admin_cuenta_borrar'){
        if(!UUID.test(String(b.id || ''))) return enviar(res, { ok: false, code: 'id', message: 'Cuenta no válida' });
        const r = await rest('cuentas_deposito?id=eq.' + b.id, { method: 'DELETE', headers: { Prefer: 'return=representation' } });
        if(r.status >= 400) return enviar(res, { ok: false, code: 'db', message: 'No se pudo eliminar la cuenta' });
        await auditar(null, 'cuenta_borrar', adm, { id: b.id, nombre: Array.isArray(r.json) && r.json[0] ? r.json[0].nombre : null });
        return enviar(res, { ok: true });
      }
      if(a === 'admin_auditoria'){
        const r = await rest('recargas_auditoria?select=id,recarga_id,accion,actor,detalle,created_at&order=created_at.desc&limit=100');
        if(r.status >= 400) return enviar(res, { ok: false, code: 'db', message: 'Falta ejecutar recargas_saldo.sql en Supabase' });
        return enviar(res, { ok: true, items: r.json || [] });
      }
      return enviar(res, { ok: false, code: 'accion', message: 'Acción no permitida' }, 400);
    }

    // ═════════════ CLIENTE ═════════════
    const u = String(b.username || '').trim().slice(0, 60), h = String(b.hash || '').slice(0, 200);
    if(!u || !h) return enviar(res, { ok: false, code: 'credenciales', message: 'Inicia sesión de nuevo' }, 401);
    if(limite('a|' + ip, 120, 600000)) return enviar(res, { ok: false, code: 'limite', message: 'Demasiados intentos, espera unos minutos' }, 429);
    const r0 = await rest('profiles?username=eq.' + encodeURIComponent(u) + '&select=id,username,password_hash,nombre,whatsapp,banned&limit=1');
    if(r0.status >= 400) return enviar(res, { ok: false, code: 'db', message: 'Error de la base de datos' });
    const p = Array.isArray(r0.json) ? r0.json[0] : null;
    if(!p || !p.password_hash || !iguales(h, p.password_hash)) return enviar(res, { ok: false, code: 'credenciales', message: 'Vuelve a iniciar sesión' }, 401);
    if(p.banned) return enviar(res, { ok: false, code: 'cuenta_suspendida', message: 'Tu cuenta está suspendida' }, 403);
    const uid = String(p.id);

    if(a === 'cuentas'){
      let r = await rest('cuentas_deposito?activa=eq.true&select=id,nombre,titular,clabe,pais,moneda,bandera,tasa,comision,comision_pct,detalle,nota,construccion&order=orden.asc,created_at.asc');
      if(r.status >= 400) r = await rest('cuentas_deposito?activa=eq.true&select=id,nombre,titular,clabe&order=orden.asc,created_at.asc');   // aún sin metodos_pago.sql
      if(r.status >= 400) return enviar(res, { ok: false, code: 'db', message: 'Falta ejecutar recargas_saldo.sql en Supabase' });
      const rates = await tasasUSD((r.json || []).map(c => c.moneda)), minUsd = MIN_USD();
      const cuentas = (r.json || []).map(c => { const q = c.construccion ? null : cotizar(c, 1, rates); return Object.assign({}, c, { moneda: c.moneda || 'MXN', pais: c.pais || 'MX', construccion: !!c.construccion, tasa_efectiva: q ? q.tasa : null }); });
      return enviar(res, { ok: true, cuentas, min: MIN(), max: MAX(), min_usd: minUsd, usd_mxn: rates.MXN, tasas_hora: rates._info.hora, tasas_fuente: rates._info.fuente });
    }
    if(a === 'mis'){
      const r = await rest('recargas_saldo?user_id=eq.' + encodeURIComponent(uid) + '&select=*&order=creada.desc&limit=50');
      if(r.status >= 400) return enviar(res, { ok: false, code: 'db', message: 'Falta ejecutar recargas_saldo.sql en Supabase' });
      return enviar(res, { ok: true, items: (r.json || []).map(publica) });
    }
    if(a === 'comprobante_url'){
      if(!UUID.test(String(b.id || ''))) return enviar(res, { ok: false, code: 'id', message: 'Solicitud no válida' });
      const r = await rest('recargas_saldo?id=eq.' + b.id + '&user_id=eq.' + encodeURIComponent(uid) + '&select=comprobante_path,comprobante_tipo&limit=1');
      const x = Array.isArray(r.json) ? r.json[0] : null;
      if(!x) return enviar(res, { ok: false, code: 'no_existe', message: 'No se encontró la solicitud' });
      const url = await enlace(x.comprobante_path);
      return url ? enviar(res, { ok: true, url, tipo: x.comprobante_tipo }) : enviar(res, { ok: false, code: 'storage', message: 'No se pudo abrir el comprobante' });
    }
    if(a === 'solicitar'){
      // — validaciones de datos —
      const idem = String(b.idem || '');
      if(!/^[a-zA-Z0-9-]{16,64}$/.test(idem)) return enviar(res, { ok: false, code: 'idem', message: 'Recarga la página e intenta de nuevo' });
      const ya = await rest('recargas_saldo?idem=eq.' + encodeURIComponent(idem) + '&user_id=eq.' + encodeURIComponent(uid) + '&select=*&limit=1');
      if(Array.isArray(ya.json) && ya.json[0]) return enviar(res, { ok: true, repetida: true, item: publica(ya.json[0]) });   // mismo envío repetido: no se duplica
      if(!UUID.test(String(b.cuenta_id || ''))) return enviar(res, { ok: false, code: 'cuenta', message: 'Elige un método de depósito' });
      let cu = await rest('cuentas_deposito?id=eq.' + b.cuenta_id + '&activa=eq.true&select=id,nombre,moneda,tasa,comision,comision_pct,construccion&limit=1');
      if(cu.status >= 400) cu = await rest('cuentas_deposito?id=eq.' + b.cuenta_id + '&activa=eq.true&select=id,nombre&limit=1');
      const cuenta = Array.isArray(cu.json) ? cu.json[0] : null;
      if(!cuenta || cuenta.construccion) return enviar(res, { ok: false, code: 'cuenta', message: cuenta ? 'Ese método está en construcción' : 'Ese método de depósito ya no está disponible' });
      // La cantidad la elige el cliente en USD (mín. 5 USD en TODOS los métodos); el servidor calcula lo que se acredita y lo que debe pagar
      const rates = await tasasUSD([cuenta.moneda]), usd = r2(b.monto_usd != null ? Number(b.monto_usd) : NaN);
      const nuevo = b.monto_usd != null || (cuenta.moneda && cuenta.moneda !== 'MXN');
      let monto, local = null;
      if(nuevo){
        if(!isFinite(usd) || usd <= 0) return enviar(res, { ok: false, code: 'monto', message: 'Escribe una cantidad válida en USD' });
        if(usd < MIN_USD()) return enviar(res, { ok: false, code: 'monto', message: 'El mínimo es de ' + MIN_USD() + ' USD' });
        const q = cotizar(cuenta, usd, rates);
        if(!q) return enviar(res, { ok: false, code: 'tasa', message: 'No se pudo calcular el tipo de cambio. Intenta en un momento.' });
        monto = q.credito; local = q;
      } else {
        monto = Math.round(Number(b.monto) * 100) / 100;
        if(!isFinite(monto) || monto <= 0) return enviar(res, { ok: false, code: 'monto', message: 'Escribe un monto válido' });
        if(monto < MIN()) return enviar(res, { ok: false, code: 'monto', message: 'El monto mínimo es ' + dinero(MIN()) });
      }
      if(monto > MAX()) return enviar(res, { ok: false, code: 'monto', message: 'El monto máximo por solicitud es ' + dinero(MAX()) });
      const titular = limpiaTxt(b.titular, 80); if(titular.length < 3) return enviar(res, { ok: false, code: 'titular', message: 'Escribe el nombre del titular que hizo la transferencia' });
      const referencia = limpiaTxt(b.referencia, 40).replace(/[^\w\-./ ]/g, ''); if(referencia.length < 4) return enviar(res, { ok: false, code: 'referencia', message: 'Escribe la referencia o clave de rastreo (mín. 4 caracteres)' });
      const refNorm = referencia.toLowerCase().replace(/[^a-z0-9]/g, '');
      if(refNorm.length < 4) return enviar(res, { ok: false, code: 'referencia', message: 'La referencia no es válida' });
      const fecha = new Date(String(b.fecha || '')); if(isNaN(fecha.getTime())) return enviar(res, { ok: false, code: 'fecha', message: 'Indica la fecha y hora de la transferencia' });
      if(fecha.getTime() > Date.now() + 10 * 60000) return enviar(res, { ok: false, code: 'fecha', message: 'La fecha de la transferencia no puede ser futura' });
      if(fecha.getTime() < Date.now() - 30 * 86400000) return enviar(res, { ok: false, code: 'fecha', message: 'La transferencia es demasiado antigua (máximo 30 días)' });
      const m = /^data:([a-z\/+-]+);base64,([A-Za-z0-9+/=]+)$/.exec(String(b.comprobante || ''));
      if(!m) return enviar(res, { ok: false, code: 'comprobante', message: 'Sube tu comprobante (JPG, PNG, WEBP o PDF)' });
      const buf = Buffer.from(m[2], 'base64');
      if(!buf.length || buf.length > MAX_BYTES) return enviar(res, { ok: false, code: 'comprobante', message: 'El comprobante pesa demasiado (máximo ' + Math.round(MAX_BYTES / 1024 / 1024 * 10) / 10 + ' MB)' });
      const tipo = formatoReal(buf);
      if(!tipo || !EXT[tipo]) return enviar(res, { ok: false, code: 'comprobante', message: 'El archivo no es una imagen o PDF válido' });
      // — límites (solo cuentan los envíos que pasaron las validaciones; un error de captura no te bloquea) —
      if(limite('s|' + uid, 6, 3600000)) return enviar(res, { ok: false, code: 'limite', message: 'Hiciste muchas solicitudes. Intenta de nuevo en una hora.' }, 429);
      const pen = await rest('recargas_saldo?user_id=eq.' + encodeURIComponent(uid) + '&estado=eq.pendiente&select=id');
      if(Array.isArray(pen.json) && pen.json.length >= 3) return enviar(res, { ok: false, code: 'pendientes', message: 'Ya tienes 3 solicitudes en revisión. Espera a que se resuelvan.' });
      // — guardar comprobante en almacenamiento PRIVADO —
      const hash = crypto.createHash('sha256').update(buf).digest('hex');
      const dup = await rest('recargas_saldo?comprobante_hash=eq.' + hash + '&estado=neq.rechazada&select=id&limit=1');
      if(Array.isArray(dup.json) && dup.json.length) return enviar(res, { ok: false, code: 'duplicada', message: 'Ese comprobante ya fue enviado en otra solicitud' });
      const dupR = await rest('recargas_saldo?referencia_norm=eq.' + refNorm + '&estado=neq.rechazada&select=id&limit=1');
      if(Array.isArray(dupR.json) && dupR.json.length) return enviar(res, { ok: false, code: 'duplicada', message: 'Esa referencia ya fue registrada en otra solicitud' });
      const ruta = uid + '/' + crypto.randomUUID() + '.' + EXT[tipo];
      const up = await db('/storage/v1/object/' + BUCKET + '/' + ruta, { method: 'POST', headers: { 'Content-Type': tipo, 'x-upsert': 'false' }, body: buf });
      if(up.status >= 400) return enviar(res, { ok: false, code: 'storage', message: 'No se pudo guardar el comprobante. ¿Ejecutaste recargas_saldo.sql (crea el almacenamiento "comprobantes")?' });
      const ins = await rest('recargas_saldo', { method: 'POST', headers: { Prefer: 'return=representation' }, body: J(Object.assign({
        user_id: uid, username: p.username, cuenta_id: cuenta.id, banco: cuenta.nombre, monto, titular, referencia, referencia_norm: refNorm,
        fecha_transferencia: fecha.toISOString(), comprobante_path: ruta, comprobante_tipo: tipo, comprobante_hash: hash, idem }, local && local.moneda !== 'MXN' ? { monto_usd: local.usd, monto_local: local.pagar, moneda: local.moneda } : (local ? { monto_usd: local.usd } : {}))) });
      if(ins.status >= 400){
        await db('/storage/v1/object/' + BUCKET, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: J({ prefixes: [ruta] }) });
        const msg = String((ins.json && ins.json.message) || '');
        if(/recargas_saldo_idem_uq/.test(msg)){ const y = await rest('recargas_saldo?idem=eq.' + encodeURIComponent(idem) + '&select=*&limit=1'); if(Array.isArray(y.json) && y.json[0]) return enviar(res, { ok: true, repetida: true, item: publica(y.json[0]) }); }
        if(/recargas_saldo_(ref|hash)_uq/.test(msg)) return enviar(res, { ok: false, code: 'duplicada', message: 'Esa referencia o comprobante ya fue registrado en otra solicitud' });
        if(/monto_usd|monto_local|moneda/.test(msg)) return enviar(res, { ok: false, code: 'db', message: 'Falta ejecutar metodos_pago.sql en Supabase' });
        if(ins.status === 404) return enviar(res, { ok: false, code: 'db', message: 'Falta ejecutar recargas_saldo.sql en Supabase' });
        return enviar(res, { ok: false, code: 'db', message: 'No se pudo registrar la solicitud' });
      }
      const row = Array.isArray(ins.json) ? ins.json[0] : null;
      await auditar(row && row.id, 'solicitar', p.username, { monto, banco: cuenta.nombre, referencia });
      await aviso(uid, 'Solicitud de recarga recibida', 'Recibimos tu solicitud de ' + dinero(monto) + ' (' + cuenta.nombre + '). Está en revisión; te avisaremos cuando se resuelva.');
      await avisoSolicitud('💳 <b>Nueva solicitud de recarga</b>\n👤 ' + esc(p.username) + '\n💰 ' + esc(dinero(monto)) + (local && local.moneda !== 'MXN' ? ' (' + local.usd + ' USD · pagó ' + local.pagar + ' ' + local.moneda + ')' : '') + ' · ' + esc(cuenta.nombre) + '\n🔑 Ref: ' + esc(referencia) + '\n👥 Titular: ' + esc(titular) + '\n🆔 ' + (row ? row.id : ''), row ? row.id : '', buf, tipo, p.username, cuenta.nombre, dinero(monto), 'Recarga de saldo | ' + cuenta.nombre + ' | Ref: ' + referencia + ' | Titular: ' + titular + ' | Revísala en el panel → Depósitos', req.headers.host);
      return enviar(res, { ok: true, item: row ? publica(row) : null });
    }
    return enviar(res, { ok: false, code: 'accion', message: 'Acción no permitida' }, 400);
  }catch(e){ return enviar(res, { ok: false, code: 'error', message: 'Error del servidor' }); }
};

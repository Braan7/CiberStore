// ═══════════════════════════════════════════════════════════════════════════
// api/_alerta.js · Protección de saldo con el proveedor + aviso por Telegram.
// Lo usan api/recarga.js (clientes) y api/co.js (tu panel). El guion bajo evita que Vercel lo publique como ruta.
//
// Cuando el saldo DISPONIBLE en Central One baja a CO_SALDO_MINIMO_USD (por defecto US$ 5) o menos, o no alcanza para el pedido:
//   · las recargas automáticas se pausan (la tienda lo muestra y no deja comprar),
//   · te llega un aviso por Telegram para que metas saldo, y otro cuando lo repones.
//
// Variables de entorno en Vercel (todas opcionales):
//   CO_SALDO_MINIMO_USD   saldo mínimo de seguridad en US$ (por defecto 5). Pon 0 para apagar la protección.
//   CO_ALERTA_CADA_MIN    cada cuántos minutos se repite el aviso mientras siga bajo (por defecto 60)
//   TG_BOT_TOKEN + TG_CHAT_ID   si las pones, el aviso va directo por tu bot de Telegram.
//   CO_ALERTA_URL         si no pones lo anterior, el aviso se manda por la función bright-task de tu Supabase (la de los comprobantes).
// ═══════════════════════════════════════════════════════════════════════════
'use strict';

const BASE = (process.env.CO_BASE || 'https://portal.centraloneglobal.com/api/v1').replace(/\/+$/, '');
const ALERTA_URL_DEFECTO = 'https://pnotsqsudqpwqzssevig.supabase.co/functions/v1/bright-task';

function umbral(){ const v = process.env.CO_SALDO_MINIMO_USD; if(v === undefined || String(v).trim() === '') return 5; const n = Number(v); return (isFinite(n) && n >= 0) ? n : 5; }
function cadaMin(){ const v = process.env.CO_ALERTA_CADA_MIN; if(v === undefined || String(v).trim() === '') return 60; const n = Number(v); return (isFinite(n) && n >= 0) ? n : 60; }
const usd = n => 'US$ ' + Number(n).toFixed(2);

async function conTiempo(url, opts, ms){
  const ctrl = new AbortController(), t = setTimeout(() => ctrl.abort(), ms || 6000);
  try{ return await fetch(url, Object.assign({}, opts, { signal: ctrl.signal })); } finally { clearTimeout(t); }
}

// ── Saldo disponible del proveedor (se recuerda 15 segundos para no consultarlo en cada visita) ──
let cache = { t: 0, saldo: null };
function invalidar(){ cache = { t: 0, saldo: null }; }
async function leerSaldo(){
  if(cache.saldo !== null && Date.now() - cache.t < 15000) return cache.saldo;
  try{
    const r = await conTiempo(BASE + '/balance', { headers: { Authorization: 'Bearer ' + process.env.CO_API_KEY, Accept: 'application/json' } }, 6000);
    if(r.status !== 200) return null;
    const j = await r.json(), n = parseFloat(j && j.available_balance);
    if(!isFinite(n)) return null;
    cache = { t: Date.now(), saldo: n }; return n;
  }catch(e){ return null; }
}

// costo = lo que cuesta el pedido en el proveedor (0 si solo se quiere saber si hay saldo).
// Si no se puede leer el saldo, NO se bloquea (el proveedor igual rechazaría si no alcanza).
async function estado(costo){
  const um = umbral();
  if(um <= 0) return { pausa: false, saldo: null, umbral: um, verificado: false };
  const saldo = await leerSaldo();
  if(saldo === null) return { pausa: false, saldo: null, umbral: um, verificado: false };
  const bajo = saldo <= um, noAlcanza = costo > 0 && saldo < costo;
  return { pausa: bajo || noAlcanza, saldo, umbral: um, verificado: true, motivo: bajo ? 'saldo_bajo' : (noAlcanza ? 'no_alcanza' : null) };
}

// ── Avisos por Telegram ──
async function enviarAviso(titulo, saldoTxt, detalle){
  try{
    const tok = process.env.TG_BOT_TOKEN, chat = process.env.TG_CHAT_ID;
    if(tok && chat){
      const r = await conTiempo('https://api.telegram.org/bot' + tok + '/sendMessage', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chat, text: titulo + '\n' + saldoTxt + '\n\n' + detalle }) }, 5000);
      return { enviado: r.status >= 200 && r.status < 300, via: 'telegram', http: r.status };
    }
    const r = await conTiempo(process.env.CO_ALERTA_URL || ALERTA_URL_DEFECTO, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario: 'SISTEMA CIBERSTORE', metodo: titulo, monto: saldoTxt, extra: detalle, foto_base64: '' }) }, 5000);
    return { enviado: r.status >= 200 && r.status < 300, via: 'supabase', http: r.status };
  }catch(e){ return { enviado: false, via: 'error' }; }
}
let ultimaAlerta = 0, estabaEnPausa = false;
async function avisarSaldoBajo(saldo, motivo){
  estabaEnPausa = true;
  if(Date.now() - ultimaAlerta < cadaMin() * 60000) return { enviado: false, motivo: 'espera' };
  ultimaAlerta = Date.now();
  const r = await enviarAviso('⚠️ SALDO BAJO CON EL PROVEEDOR', 'Saldo disponible: ' + usd(saldo) + ' · mínimo: ' + usd(umbral()),
    'Mete saldo en Central One. Las recargas automáticas quedaron EN PAUSA y la tienda no deja comprar hasta que lo repongas.' + (motivo === 'no_alcanza' ? ' (Un cliente intentó un pedido que el saldo no cubre.)' : ''));
  if(!r.enviado) ultimaAlerta = 0;   // si no salió, que se reintente en la próxima ocasión
  return r;
}
async function avisarRecuperado(saldo){
  if(!estabaEnPausa) return { enviado: false };
  estabaEnPausa = false;
  return enviarAviso('✅ SALDO REPUESTO CON EL PROVEEDOR', 'Saldo disponible: ' + usd(saldo), 'Las recargas automáticas se reanudaron.');
}
// Después de una compra: el saldo acaba de bajar, ¿quedó en pausa?
async function despuesDeCompra(){
  invalidar(); const e = await estado(0);
  if(e.verificado && e.pausa) await avisarSaldoBajo(e.saldo, e.motivo);
  return e;
}
async function enviarPrueba(){
  return enviarAviso('🔔 PRUEBA DE AVISO · CIBERSTORE', 'Esto es una prueba', 'Si lo ves, los avisos de saldo bajo te van a llegar por aquí.');
}
module.exports = { umbral, cadaMin, estado, leerSaldo, invalidar, avisarSaldoBajo, avisarRecuperado, despuesDeCompra, enviarPrueba };

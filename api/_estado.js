// ═══════════════════════════════════════════════════════════════════════════
// api/_estado.js · "Estado del Sistema" (SOLO administrador). Lo usa api/comprar.js en las acciones admin_estado y admin_estado_config.
// El guion bajo evita que Vercel lo publique como ruta: no suma funciones.
//
// Qué hace:
//   · Sondea de verdad (con tiempo de espera) la base de datos, las APIs de likes, Central One (diamantes/cajas/fragmentos),
//     Volsever (diamantes al 50%), Cuentas y Transferencias. Si algo no responde se marca como falla: nunca se pone "operativo" a ciegas.
//   · Guarda cada comprobación en la tabla estado_chequeos (ver estado_sistema.sql) para la gráfica de 24 h y los porcentajes.
//   · Respeta la frecuencia configurada: si el último sondeo es más reciente que el intervalo, devuelve lo guardado SIN molestar a los proveedores.
//   · Las cantidades de inventario salen del catálogo del proveedor SOLO si él las manda; si no, se dice que no las informa.
// Variables opcionales: EST_URL_LIKES, EST_URL_LIKES2K (dirección a comprobar; vacía = no comprobar), EST_VOLSEVER_ID (ID de prueba), EST_LENTO_MS.
// ═══════════════════════════════════════════════════════════════════════════
'use strict';
const A = require('./_alerta.js');
let RECARGA = null; try{ RECARGA = require('./recarga.js'); }catch(e){ RECARGA = null; }

const BASE_CO = (process.env.CO_BASE || 'https://portal.centraloneglobal.com/api/v1').replace(/\/+$/, '');
const INTERVALOS = [120, 300, 600, 900, 1800, 3600];
const INTERVALO_DEF = 300;
const LENTO_MS = Number(process.env.EST_LENTO_MS || 4000);
const VENTANA_MS = 24 * 3600000;
const J = o => JSON.stringify(o);

const SERVICIOS = [
  { k: 'bd',             nombre: 'Base de datos (Supabase)', grupo: 'sistema' },
  { k: 'likes220',       nombre: 'API Likes (220)',          grupo: 'api' },
  { k: 'likes2k',        nombre: 'API Likes Premium (2K)',   grupo: 'api' },
  { k: 'diamantes',      nombre: 'API Diamantes',            grupo: 'api' },
  { k: 'd50',            nombre: 'API Diamantes al 50%',     grupo: 'api' },
  { k: 'cuentas',        nombre: 'API Cuentas / Servicios',  grupo: 'api' },
  { k: 'transferencias', nombre: 'API Transferencias',       grupo: 'api' }
];
const NOMBRE = {}; SERVICIOS.forEach(s => { NOMBRE[s.k] = s.nombre; });
const SIN_AVISO_TG = { diamantes: 1, d50: 1 };   // esos dos ya los vigilan recarga.js y comprar.js

// ── Memoria de la instancia ──
let _vuelo = null;
const H = { rows: [], lastId: 0, mem: false, memSeq: 0, cargado: false };
let _ord = { t: 0, v: null };

// ── Utilidades ──
async function ping(url, opts, ms){
  const t0 = Date.now(), ctrl = new AbortController(), t = setTimeout(() => ctrl.abort(), ms || 7000);
  try{
    const r = await fetch(url, Object.assign({ signal: ctrl.signal }, opts));
    let j = null; try{ j = await r.json(); }catch(e){}
    return { status: r.status, json: j, ms: Date.now() - t0 };
  }catch(e){ return { error: (e && e.name === 'AbortError') ? 'timeout' : 'red', ms: Date.now() - t0 }; }
  finally{ clearTimeout(t); }
}
const falla = (k, tipo, ms, http, detalle) => ({ k, n: 'error', t: tipo, ms, h: http || null, d: detalle });
const aviso = (k, tipo, ms, http, detalle) => ({ k, n: 'aviso', t: tipo, ms, h: http || null, d: detalle });
const bien = (k, ms, http, detalle) => ({ k, n: 'ok', t: null, ms, h: http || null, d: detalle || null });
const desconocido = (k, detalle) => ({ k, n: 'desconocido', d: detalle });
function faltaTabla(r){ const c = r && r.json && r.json.code; return !!r && (r.status === 404 || c === 'PGRST205' || c === '42P01'); }
function errDe(r){ return String((r && r.json && (r.json.message || r.json.error || r.json.hint)) || '').slice(0, 120); }

// Mide una consulta a Supabase (la función rest viene de api/comprar.js)
async function medir(rest, path){
  const t0 = Date.now();
  try{ const r = await rest(path); return Object.assign({}, r, { ms: Date.now() - t0 }); }
  catch(e){ return { error: (e && e.name === 'AbortError') ? 'timeout' : 'red', ms: Date.now() - t0 }; }
}

// ── Sondeos ──
async function sondearBD(rest){
  const r = await medir(rest, 'catalogo_checkout?select=clave&limit=1');
  if(r.error) return falla('bd', 'conexion', r.ms, null, r.error === 'timeout' ? 'La base de datos no respondió a tiempo' : 'No se pudo conectar con la base de datos');
  if(r.status >= 400) return falla('bd', 'api', r.ms, r.status, 'Supabase respondió ' + r.status + (errDe(r) ? ': ' + errDe(r) : ''));
  return r.ms > 2500 ? aviso('bd', 'lento', r.ms, r.status, 'Responde lento (' + r.ms + ' ms)') : bien('bd', r.ms, r.status);
}
async function sondearUrl(k, url, etiqueta){
  if(!url) return desconocido(k, 'Sin dirección configurada (' + etiqueta + ')');
  const r = await ping(url, { method: 'GET', headers: { Accept: '*/*' } }, 7000);
  if(r.error) return falla(k, 'conexion', r.ms, null, r.error === 'timeout' ? 'El servidor no respondió en 7 s' : 'No se pudo conectar con el servidor');
  if(r.status >= 500) return falla(k, 'api', r.ms, r.status, 'El servidor respondió con error ' + r.status);
  if(r.ms > LENTO_MS) return aviso(k, 'lento', r.ms, r.status, 'Responde lento (' + (r.ms / 1000).toFixed(1) + ' s)');
  return bien(k, r.ms, r.status, 'Servidor responde (solo se comprueba que esté en línea)');
}
async function sondearCO(){
  if(!process.env.CO_API_KEY) return { res: desconocido('diamantes', 'Falta CO_API_KEY en Vercel'), inv: null, saldo: null };
  const h = { Authorization: 'Bearer ' + process.env.CO_API_KEY, Accept: 'application/json' };
  const r = await ping(BASE_CO + '/catalog', { headers: h }, 9000);
  if(r.error) return { res: falla('diamantes', 'conexion', r.ms, null, r.error === 'timeout' ? 'Central One no respondió en 9 s' : 'No se pudo conectar con Central One'), inv: null, saldo: null };
  if(r.status === 401 || r.status === 403) return { res: falla('diamantes', 'api', r.ms, r.status, 'Central One rechazó la llave (CO_API_KEY): ' + r.status), inv: null, saldo: null };
  if(r.status !== 200 || !r.json || !Array.isArray(r.json.items)) return { res: falla('diamantes', 'api', r.ms, r.status, 'Catálogo no disponible (HTTP ' + r.status + ')'), inv: null, saldo: null };
  const inv = RECARGA && RECARGA.inventario ? RECARGA.inventario(r.json.items) : null;
  let saldo = null; try{ A.invalidar(); const e = await A.estado(0); if(e.verificado) saldo = { disponible: e.saldo, umbral: e.umbral, pausa: !!e.pausa }; }catch(e){}
  const avisos = [];
  if(r.ms > LENTO_MS) avisos.push('lento');
  if(saldo && saldo.pausa) avisos.push('saldo');
  let sinStock = [];
  if(inv) ['diamantes', 'cajas', 'fragmentos'].forEach(g => inv[g].forEach(x => { if(x.estado === 'sin_stock') sinStock.push(x.nombre); }));
  if(sinStock.length) avisos.push('stock');
  let res;
  if(avisos.indexOf('saldo') >= 0) res = aviso('diamantes', 'saldo', r.ms, 200, 'Saldo del proveedor bajo: las compras automáticas están en pausa');
  else if(avisos.indexOf('stock') >= 0) res = aviso('diamantes', 'stock', r.ms, 200, 'Sin stock en el proveedor: ' + sinStock.slice(0, 6).join(', ') + (sinStock.length > 6 ? '…' : ''));
  else if(avisos.indexOf('lento') >= 0) res = aviso('diamantes', 'lento', r.ms, 200, 'El proveedor responde lento (' + (r.ms / 1000).toFixed(1) + ' s)');
  else res = bien('diamantes', r.ms, 200, 'Catálogo del proveedor consultado');
  return { res, inv, saldo };
}
async function sondearVolsever(){
  if(!process.env.VOLSEVER_API_KEY) return desconocido('d50', 'Falta VOLSEVER_API_KEY en Vercel');
  const id = String(process.env.EST_VOLSEVER_ID || '1').replace(/[^0-9A-Za-z_-]/g, '').slice(0, 20) || '1';
  const r = await ping('https://gate.volsever.com/garena/api/v1/pagostore/free-fire/check-discounts-paypal-dom?id=' + encodeURIComponent(id), { headers: { 'X-API-KEY': process.env.VOLSEVER_API_KEY, Accept: 'application/json' } }, 9000);
  if(r.error) return falla('d50', 'conexion', r.ms, null, r.error === 'timeout' ? 'Volsever no respondió en 9 s' : 'No se pudo conectar con Volsever');
  if(r.status === 401 || r.status === 403) return falla('d50', 'api', r.ms, r.status, 'Volsever rechazó la llave (VOLSEVER_API_KEY): ' + r.status);
  if(r.status >= 500) return falla('d50', 'api', r.ms, r.status, 'Volsever respondió con error ' + r.status);
  if(r.status === 429) return aviso('d50', 'api', r.ms, r.status, 'Volsever pidió bajar la frecuencia (429)');
  if(r.ms > LENTO_MS) return aviso('d50', 'lento', r.ms, r.status, 'Responde lento (' + (r.ms / 1000).toFixed(1) + ' s)');
  return bien('d50', r.ms, r.status, 'Responde (consulta de prueba)');
}
async function sondearCuentas(rest, db){
  const r = await medir(rest, 'cuentas_venta?select=id&limit=1');
  if(r.error) return falla('cuentas', 'conexion', r.ms, null, 'No se pudo consultar la base de datos');
  if(faltaTabla(r)) return desconocido('cuentas', 'Módulo no instalado (falta ejecutar cuentas.sql)');
  if(r.status >= 400) return falla('cuentas', 'api', r.ms, r.status, 'Supabase respondió ' + r.status + (errDe(r) ? ': ' + errDe(r) : ''));
  let ms = r.ms, fotos = 'fotos OK';
  try{ const t0 = Date.now(); const b = await db('/storage/v1/bucket/cuentas'); ms += Date.now() - t0; if(b.status >= 400){ return aviso('cuentas', 'api', ms, b.status, 'Las cuentas responden, pero la carpeta de fotos no (HTTP ' + b.status + ')'); } }
  catch(e){ return aviso('cuentas', 'conexion', ms, null, 'Las cuentas responden, pero no se pudo consultar la carpeta de fotos'); }
  return ms > 4000 ? aviso('cuentas', 'lento', ms, 200, 'Responde lento (' + ms + ' ms)') : bien('cuentas', ms, 200, 'Cuentas y ' + fotos);
}
async function sondearTransferencias(rest){
  const r = await medir(rest, 'recargas_saldo?estado=eq.pendiente&select=id&limit=200');
  if(r.error) return falla('transferencias', 'conexion', r.ms, null, 'No se pudo consultar la base de datos');
  if(faltaTabla(r)) return desconocido('transferencias', 'Módulo no instalado (falta ejecutar recargas_saldo.sql)');
  if(r.status >= 400 || !Array.isArray(r.json)) return falla('transferencias', 'api', r.ms, r.status, 'Supabase respondió ' + r.status + (errDe(r) ? ': ' + errDe(r) : ''));
  const n = r.json.length, det = n ? n + ' comprobante' + (n === 1 ? '' : 's') + ' por revisar' : 'Sin comprobantes pendientes';
  return r.ms > 2500 ? aviso('transferencias', 'lento', r.ms, r.status, 'Responde lento (' + r.ms + ' ms) · ' + det) : bien('transferencias', r.ms, r.status, det);
}

// ── Guardado ──
async function leerConfig(rest){
  const r = await medir(rest, 'estado_config?select=clave,valor');
  if(r.error || r.status >= 400 || !Array.isArray(r.json)) return { tablas: false, motivo: r.error ? 'sin_conexion' : (faltaTabla(r) ? 'sin_tablas' : 'error'), v: {} };
  const v = {}; r.json.forEach(x => { v[x.clave] = x.valor; });
  return { tablas: true, v };
}
async function guardarConfig(rest, clave, valor){
  return rest('estado_config?on_conflict=clave', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: J([{ clave, valor: String(valor), actualizada: new Date().toISOString() }]) });
}
const intervaloDe = v => { const n = Number(v && v.intervalo); return INTERVALOS.indexOf(n) >= 0 ? n : INTERVALO_DEF; };

async function sondear(ctx, cfg){
  const { rest, db } = ctx;
  const [bd, l1, l2, co, vs, cu, tr] = await Promise.all([
    sondearBD(rest),
    sondearUrl('likes220', process.env.EST_URL_LIKES !== undefined ? process.env.EST_URL_LIKES : 'https://autolikesystem.com.br', 'EST_URL_LIKES'),
    sondearUrl('likes2k', process.env.EST_URL_LIKES2K !== undefined ? process.env.EST_URL_LIKES2K : 'https://lunexislikes.squareweb.app', 'EST_URL_LIKES2K'),
    sondearCO(), sondearVolsever(), sondearCuentas(rest, db), sondearTransferencias(rest)
  ]);
  const todos = [bd, l1, l2, co.res, vs, cu, tr];
  const desc = {}; todos.filter(x => x.n === 'desconocido').forEach(x => { desc[x.k] = x.d; });
  const filas = todos.filter(x => x.n !== 'desconocido');
  const ahora = Date.now();

  // Avisos por Telegram (con memoria: no repiten en cada sondeo)
  for(const x of filas){
    if(SIN_AVISO_TG[x.k]) continue;
    try{
      if(x.n === 'error') await A.avisarFalla('est_' + x.k, '🔴 ' + NOMBRE[x.k] + ' CON FALLA', x.d || '', 30 * 60000);
      else await A.avisarVolvio('est_' + x.k, '✅ ' + NOMBRE[x.k] + ' VOLVIÓ A FUNCIONAR', x.d || '');
    }catch(e){}
  }

  let guardado = false;
  if(cfg.tablas){
    const body = filas.map(x => ({ servicio: x.k, nivel: x.n, tipo: x.t || null, ms: Math.round(x.ms || 0), http: x.h || null, detalle: x.d ? String(x.d).slice(0, 200) : null }));
    const ri = await rest('estado_chequeos', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: J(body) }).catch(() => ({ status: 599 }));
    guardado = ri.status < 400;
    if(guardado){
      await guardarConfig(rest, 'ultimo', J({ t: ahora, inv: co.inv, saldo: co.saldo, desc })).catch(() => {});
      rest('estado_chequeos?ts=lt.' + encodeURIComponent(new Date(ahora - 8 * 86400000).toISOString()), { method: 'DELETE', headers: { Prefer: 'return=minimal' } }).catch(() => {});
    }
  }
  if(!guardado){   // sin tablas: se guarda solo en la memoria de esta instancia (la gráfica dura mientras no se reinicie)
    H.mem = true;
    filas.forEach(x => { H.rows.push({ id: --H.memSeq, ts: ahora, k: x.k, n: x.n, t: x.t || null, ms: Math.round(x.ms || 0), h: x.h || null, d: x.d || null }); });
    H.memUlt = { t: ahora, inv: co.inv, saldo: co.saldo, desc };
  }
  return { t: ahora, inv: co.inv, saldo: co.saldo, desc };
}

async function cargarHistorial(rest){
  if(H.mem) return;
  const desde = new Date(Date.now() - VENTANA_MS).toISOString();
  const q = H.cargado ? 'id=gt.' + H.lastId : 'ts=gte.' + encodeURIComponent(desde);
  const r = await medir(rest, 'estado_chequeos?' + q + '&select=id,ts,servicio,nivel,tipo,ms,http,detalle&order=id.asc&limit=10000');
  if(r.error || r.status >= 400 || !Array.isArray(r.json)) return;
  r.json.forEach(x => { H.rows.push({ id: x.id, ts: new Date(x.ts).getTime(), k: x.servicio, n: x.nivel, t: x.tipo, ms: x.ms || 0, h: x.http, d: x.detalle }); if(x.id > H.lastId) H.lastId = x.id; });
  H.cargado = true;
}
function podar(){ const lim = Date.now() - VENTANA_MS; if(H.rows.length && H.rows[0].ts < lim) H.rows = H.rows.filter(x => x.ts >= lim); }

// Pedidos con saldo que fallaron (verificar / reembolsada) en las últimas 24 h: es la señal REAL de "solicitudes fallidas"
async function pedidosFallidos(rest){
  if(_ord.v && Date.now() - _ord.t < 60000) return _ord.v;
  const desde = new Date(Date.now() - VENTANA_MS).toISOString();
  const r = await medir(rest, 'ordenes_saldo_items?actualizada=gte.' + encodeURIComponent(desde) + '&select=estado,actualizada&limit=5000');
  const v = (r.error || r.status >= 400 || !Array.isArray(r.json)) ? null : r.json.map(x => ({ n: x.estado, ts: new Date(x.actualizada).getTime() }));
  _ord = { t: Date.now(), v }; return v;
}

// ── Cálculos ──
function mxHora(ts){ try{ return Number(new Date(ts).toLocaleString('en-GB', { hour: '2-digit', hour12: false, timeZone: 'America/Mexico_City' })) % 24; }catch(e){ return new Date(ts).getUTCHours(); } }
// Minutos con al menos un servicio en falla (unión de intervalos; cada falla cuenta hasta el siguiente sondeo, máximo 15 min)
function inactividad(rows, ahora){
  const por = {}; rows.forEach(x => { (por[x.k] || (por[x.k] = [])).push(x); });
  const seg = [];
  Object.keys(por).forEach(k => {
    const l = por[k].sort((a, b) => a.ts - b.ts);
    l.forEach((x, i) => { if(x.n !== 'error') return; const sig = l[i + 1] ? l[i + 1].ts : ahora; seg.push([x.ts, Math.min(sig, x.ts + 15 * 60000)]); });
  });
  seg.sort((a, b) => a[0] - b[0]);
  const un = []; seg.forEach(s => { const u = un[un.length - 1]; if(u && s[0] <= u[1]) u[1] = Math.max(u[1], s[1]); else un.push([s[0], s[1]]); });
  return un;
}
function grupoInv(lista){
  if(!lista || !lista.length) return null;
  const c = { ok: 0, sin_stock: 0, no_disponible: 0, no_informado: 0 }; lista.forEach(x => { c[x.estado] = (c[x.estado] || 0) + 1; });
  let estado;
  if(c.ok === lista.length) estado = 'ok';
  else if(c.ok > 0) estado = 'parcial';
  else if(c.no_disponible === lista.length) estado = 'no_disponible';
  else if(c.no_informado > 0 && c.sin_stock === 0) estado = 'no_informado';
  else estado = 'sin_stock';
  const todasCant = lista.every(x => x.cantidad !== null && x.cantidad !== undefined);
  return { estado, items: lista, disponibles: c.ok, total: lista.length, cantidad: todasCant ? lista.reduce((a, x) => a + x.cantidad, 0) : null };
}

function construir(cfgv, ult, fallidos, nSond){
  const ahora = Date.now(), intervalo = intervaloDe(cfgv), lim = ahora - VENTANA_MS;
  const rows = H.rows.filter(x => x.ts >= lim);
  const por = {}; rows.forEach(x => { (por[x.k] || (por[x.k] = [])).push(x); });
  const desc = (ult && ult.desc) || {};
  const un = inactividad(rows, ahora);
  const servicios = SERVICIOS.map(s => {
    const l = por[s.k] || [], u = l[l.length - 1] || null;
    const errs = l.filter(x => x.n === 'error').length, avs = l.filter(x => x.n === 'aviso').length;
    const msl = l.filter(x => x.ms > 0); const prom = msl.length ? Math.round(msl.reduce((a, x) => a + x.ms, 0) / msl.length) : null;
    const inact = inactividad(l, ahora).reduce((a, x) => a + (x[1] - x[0]), 0);
    let estado = u ? u.n : 'desconocido';
    if(desc[s.k]) estado = 'no_configurado';   // lo que dice la configuración de HOY manda sobre comprobaciones viejas
    return { k: s.k, nombre: s.nombre, grupo: s.grupo, estado, ms: u ? u.ms : null, ms_prom: prom, ultima: u ? u.ts : null,
      viejo: !!(u && ahora - u.ts > intervalo * 3000 + 60000), detalle: desc[s.k] || (u ? (u.d || null) : 'Sin comprobaciones todavía'), tipo: u ? u.t : null, http: u ? u.h : null,
      comprobaciones: l.length, errores: errs, advertencias: avs, disponibilidad: l.length ? Math.round((l.length - errs) / l.length * 1000) / 10 : null, inactivo_min: Math.round(inact / 60000) };
  });
  const tot = rows.length, nOk = rows.filter(x => x.n === 'ok').length, nAv = rows.filter(x => x.n === 'aviso').length, nEr = rows.filter(x => x.n === 'error').length;
  const pct = n => tot ? Math.round(n / tot * 10000) / 100 : null;
  const primera = rows.length ? rows.reduce((a, x) => Math.min(a, x.ts), ahora) : ahora;
  const cobertura_h = Math.min(24, Math.round((ahora - primera) / 360000) / 10);
  const inactMs = un.reduce((a, x) => a + (x[1] - x[0]), 0), spanMs = Math.max(ahora - Math.max(primera, lim), 1);
  // Gráfica por hora (24 barras, hora de México)
  const h0 = Math.floor(ahora / 3600000) * 3600000, horas = [];
  for(let i = 23; i >= 0; i--){
    const ini = h0 - i * 3600000, fin = ini + 3600000, l = rows.filter(x => x.ts >= ini && x.ts < fin);
    const ord = (fallidos || []).filter(x => x.ts >= ini && x.ts < fin && (x.n === 'verificar' || x.n === 'reembolsada')).length;
    const mins = un.reduce((a, s) => a + Math.max(0, Math.min(s[1], fin) - Math.max(s[0], ini)), 0);
    horas.push({ h: mxHora(ini), n: l.length, conexion: l.filter(x => x.n === 'error' && x.t === 'conexion').length, api: l.filter(x => x.n === 'error' && x.t !== 'conexion').length,
      avisos: l.filter(x => x.n === 'aviso').length, fallidas: ord, inactivo_min: Math.round(mins / 60000),
      err_pct: l.length ? Math.round(l.filter(x => x.n === 'error').length / l.length * 10000) / 100 : null, aviso_pct: l.length ? Math.round(l.filter(x => x.n === 'aviso').length / l.length * 10000) / 100 : null });
  }
  const conexion = rows.filter(x => x.n === 'error' && x.t === 'conexion').length, api = rows.filter(x => x.n === 'error' && x.t !== 'conexion').length;
  const fall = fallidos ? fallidos.filter(x => x.n === 'verificar' || x.n === 'reembolsada').length : null;
  // Estado general (tarjetas de arriba)
  const sv = k => servicios.find(x => x.k === k), apis = servicios.filter(x => x.grupo === 'api' && x.estado !== 'no_configurado' && x.estado !== 'desconocido');
  const inv = ult && ult.inv ? { diamantes: grupoInv(ult.inv.diamantes), cajas: grupoInv(ult.inv.cajas), fragmentos: grupoInv(ult.inv.fragmentos) } : null;
  const bd = sv('bd'), tr = sv('transferencias');
  const estados = { ok: 0, aviso: 0, error: 0 }; apis.forEach(x => { estados[x.estado] = (estados[x.estado] || 0) + 1; });
  const generales = {
    sistema: !bd || bd.estado === 'desconocido' ? { e: 'sin_datos', t: 'SIN DATOS' } : bd.estado === 'error' ? { e: 'error', t: 'CAÍDO' } : bd.estado === 'aviso' ? { e: 'aviso', t: 'LENTO' } : { e: 'ok', t: 'EN LÍNEA' },
    apis: !apis.length ? { e: 'sin_datos', t: 'SIN DATOS' } : estados.error ? { e: 'error', t: estados.error + ' CON FALLA' } : estados.aviso ? { e: 'aviso', t: 'CON ADVERTENCIAS' } : { e: 'ok', t: 'OPERATIVAS' },
    transferencias: !tr || tr.estado === 'desconocido' || tr.estado === 'no_configurado' ? { e: 'sin_datos', t: 'SIN DATOS' } : tr.estado === 'error' ? { e: 'error', t: 'CON FALLA' } : tr.estado === 'aviso' ? { e: 'aviso', t: 'LENTAS' } : { e: 'ok', t: 'ACTIVAS' },
    servicios: !inv ? { e: 'sin_datos', t: 'SIN DATOS' } : (() => { const g = [inv.diamantes, inv.cajas, inv.fragmentos].filter(Boolean).map(x => x.estado);
      return g.every(x => x === 'ok') ? { e: 'ok', t: 'DISPONIBLES' } : g.every(x => x === 'sin_stock' || x === 'no_disponible') ? { e: 'error', t: 'NO DISPONIBLES' } : g.every(x => x === 'no_informado') ? { e: 'sin_datos', t: 'NO INFORMADO' } : { e: 'aviso', t: 'PARCIALES' }; })()
  };
  const registros = rows.filter(x => x.n !== 'ok').sort((a, b) => b.ts - a.ts).slice(0, 40).map(x => ({ ts: x.ts, servicio: NOMBRE[x.k] || x.k, nivel: x.n, tipo: x.t, ms: x.ms, http: x.h, detalle: x.d }));
  return { ok: true, ahora, ultima_actualizacion: ult ? ult.t : null, config: { intervalo, opciones: INTERVALOS }, historial: !H.mem, sondeo: nSond,
    generales, servicios, inventario: inv, saldo: ult ? ult.saldo || null : null,
    resumen: { total: tot, ok_pct: pct(nOk), aviso_pct: pct(nAv), error_pct: pct(nEr), disponibilidad: tot ? Math.round((tot - nEr) / tot * 10000) / 100 : null, cobertura_h,
      inactivo_min: Math.round(inactMs / 60000), inactivo_pct: Math.round(inactMs / spanMs * 10000) / 100 },
    categorias: { conexion, api, advertencias: nAv, fallidas: fall, items_total: fallidos ? fallidos.length : null, inactivo_min: Math.round(inactMs / 60000) },
    horas, registros };
}

// ── Punto de entrada ──
// opts: { forzar }  ·  ctx: { rest, db }
async function estado(ctx, opts){
  opts = opts || {};
  const cfg = await leerConfig(ctx.rest);
  const intervalo = intervaloDe(cfg.v), ahora = Date.now();
  let ultSrv = null; try{ ultSrv = cfg.v.ultimo ? JSON.parse(cfg.v.ultimo) : null; }catch(e){ ultSrv = null; }
  H.mem = !cfg.tablas;
  const ultimoT = cfg.tablas ? (ultSrv ? ultSrv.t : 0) : (H.memUlt ? H.memUlt.t : 0);
  const edad = ahora - ultimoT;
  const toca = opts.forzar ? edad > 20000 : edad >= intervalo * 1000 - 2000;
  let nSond = false, ult = cfg.tablas ? ultSrv : (H.memUlt || null);
  if(toca){
    if(!_vuelo) _vuelo = (async () => {
      try{
        if(cfg.tablas) await guardarConfig(ctx.rest, 'ultimo', J({ t: Date.now(), inv: ultSrv ? ultSrv.inv : null, saldo: ultSrv ? ultSrv.saldo : null, desc: ultSrv ? ultSrv.desc : {} })).catch(() => {});   // reserva el turno: otra pestaña/instancia no repite el sondeo
        return await sondear(ctx, cfg);
      } finally { _vuelo = null; }
    })();
    ult = await _vuelo; nSond = true;
  }
  await cargarHistorial(ctx.rest); podar();
  const fall = await pedidosFallidos(ctx.rest);
  const out = construir(cfg.v, ult, fall, nSond);
  if(!cfg.tablas) out.aviso_tablas = cfg.motivo === 'sin_tablas' ? 'Falta ejecutar estado_sistema.sql en Supabase: por ahora el historial solo vive en la memoria del servidor y se pierde al reiniciarse.' : 'No se pudo leer la configuración guardada (Supabase no respondió bien).';
  return out;
}
async function configurar(ctx, b){
  const n = Number(b && b.intervalo);
  if(INTERVALOS.indexOf(n) < 0) return { ok: false, code: 'valor', message: 'Frecuencia no permitida' };
  const r = await guardarConfig(ctx.rest, 'intervalo', n).catch(() => ({ status: 599 }));
  if(r.status >= 400) return { ok: false, code: 'sin_tablas', message: 'No se pudo guardar. ¿Ya ejecutaste estado_sistema.sql en Supabase?' };
  return { ok: true, intervalo: n };
}
// Para un pinger externo (UptimeRobot, cron-job.org): sondea respetando el intervalo, sin necesitar sesión (lleva su propia llave)
async function pulso(ctx){ const o = await estado(ctx, {}); return { ok: true, sondeo: o.sondeo, t: o.ultima_actualizacion }; }

module.exports = { estado, configurar, pulso, INTERVALOS, _H: H, _reset(){ H.rows = []; H.lastId = 0; H.mem = false; H.cargado = false; H.memUlt = null; _ord = { t: 0, v: null }; } };

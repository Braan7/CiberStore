// ═══════════════════════════════════════════════════════════
// api/telegram.js · Webhook de tu bot: los botones ✅ Aceptar / ❌ Rechazar de las solicitudes de recarga.
// Se activa solo: api/recargas.js registra este webhook en Telegram la primera vez que manda un aviso con botones.
// Variables en Vercel: TG_BOT_TOKEN y TG_CHAT_ID (tu chat). Opcional: TG_ADMIN_IDS = ids de Telegram que pueden pulsar los botones (separados por coma);
// si no la pones, solo puede pulsarlos el chat TG_CHAT_ID.
// Seguridad: Telegram firma cada llamada con un secreto derivado de tu token; se comprueba además que quien pulsa sea tú.
// El abono lo hace la misma función atómica de la base (recarga_resolver): nunca se acredita dos veces.
// ═══════════════════════════════════════════════════════════
'use strict';
const crypto = require('crypto');

const TOKEN = () => process.env.TG_BOT_TOKEN || process.env.TG_TOKEN || process.env.BOT_TOKEN || '';
const secreto = () => crypto.createHash('sha256').update('cs-tg|' + TOKEN()).digest('hex').slice(0, 32);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const esc = s => String(s == null ? '' : s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
function cfg(){
  return { url: String(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, ''),
    key: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SECRET_KEY || process.env.SERVICE_ROLE_KEY || '' };
}
async function tg(metodo, cuerpo){
  const r = await fetch('https://api.telegram.org/bot' + TOKEN() + '/' + metodo, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) });
  return r.json().catch(() => ({}));
}
function permitido(cb){
  const ch = String(process.env.TG_CHAT_ID || process.env.TG_CHAT || process.env.TG_ID || ''), ids = String(process.env.TG_ADMIN_IDS || '').split(',').map(s => s.trim()).filter(Boolean);
  const quien = String(cb.from && cb.from.id), chat = String(cb.message && cb.message.chat && cb.message.chat.id);
  if(ids.length) return ids.indexOf(quien) >= 0;
  return !!ch && (chat === ch || quien === ch);
}
async function resolver(id, accion, adm, motivo){
  const c = cfg();
  const r = await fetch(c.url + '/rest/v1/rpc/recarga_resolver', { method: 'POST', headers: { apikey: c.key, Authorization: 'Bearer ' + c.key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_id: id, p_accion: accion, p_motivo: motivo || null, p_admin: adm }) });
  let j = null; try{ j = await r.json(); }catch(e){}
  return { status: r.status, json: j };
}
async function reemplazar(m, texto, botones){
  const base = { chat_id: m.chat.id, message_id: m.message_id, parse_mode: 'HTML', reply_markup: { inline_keyboard: botones || [] } };
  if(m.photo || m.document || m.caption !== undefined) return tg('editMessageCaption', Object.assign(base, { caption: texto.slice(0, 1000) }));
  return tg('editMessageText', Object.assign(base, { text: texto }));
}
function original(m){ return String(m.caption !== undefined ? m.caption : m.text || '').split('\n\n')[0]; }

module.exports = async function handler(req, res){
  res.setHeader('Content-Type', 'application/json');
  try{
    if(req.method !== 'POST'){
      res.statusCode = 200; res.setHeader('Content-Type', 'application/json');
      const d = { ok: true, token: !!TOKEN(), chat_id: !!(process.env.TG_CHAT_ID || process.env.TG_CHAT || process.env.TG_ID), supabase_url: !!cfg().url, service_key: !!cfg().key };
      if(TOKEN()){ try{ const me = await tg('getMe', {}); d.bot = me && me.ok ? ('@' + me.result.username) : 'TOKEN INVALIDO'; const wh = await tg('getWebhookInfo', {}); const urlOk = 'https://' + (req.headers['x-forwarded-host'] || req.headers.host) + '/api/telegram';
        if(!(wh && wh.result && wh.result.url === urlOk)){ const sw = await tg('setWebhook', { url: urlOk, secret_token: secreto(), allowed_updates: ['callback_query'], drop_pending_updates: true }); d.webhook = sw && sw.ok ? 'REGISTRADO AHORA' : ('no se pudo: ' + (sw && sw.description)); d.webhook_antes = (wh && wh.result && wh.result.url) || 'ninguno'; }
        else { d.webhook = 'puesto'; d.webhook_url = urlOk; if(wh.result.last_error_message){ await tg('setWebhook', { url: urlOk, secret_token: secreto(), allowed_updates: ['callback_query'], drop_pending_updates: true }); d.webhook = 'REINICIADO'; } }
        d.webhook_ya = true; if(wh && wh.result && wh.result.last_error_message) d.webhook_error_anterior = wh.result.last_error_message; }catch(e){ d.bot = 'sin respuesta'; } }
      return res.end(JSON.stringify(d));
    }
    if(!TOKEN()){ res.statusCode = 200; return res.end('{"ok":false}'); }
    if(String(req.headers['x-telegram-bot-api-secret-token'] || '') !== secreto()){ res.statusCode = 401; return res.end('{"ok":false}'); }
    const u = (req.body && typeof req.body === 'object') ? req.body : {}, cb = u.callback_query;
    res.statusCode = 200;
    if(!cb || !cb.data || !cb.message){ return res.end('{"ok":true}'); }
    if(!permitido(cb)){ await tg('answerCallbackQuery', { callback_query_id: cb.id, text: 'No autorizado', show_alert: true }); return res.end('{"ok":true}'); }
    const m = cb.message, [op, id] = String(cb.data).split(':'), quien = '@' + ((cb.from && cb.from.username) || (cb.from && cb.from.id));
    if(!UUID.test(id || '')){ await tg('answerCallbackQuery', { callback_query_id: cb.id, text: 'Datos no válidos' }); return res.end('{"ok":true}'); }
    const txt = original(m);

    // 1er toque: pide confirmación (evita un toque accidental que abone dinero)
    if(op === 'ap' || op === 'rj'){
      await tg('answerCallbackQuery', { callback_query_id: cb.id });
      await reemplazar(m, txt + '\n\n⚠️ <b>¿Confirmas ' + (op === 'ap' ? 'APROBAR (se abona el saldo)' : 'RECHAZAR') + '?</b>',
        [[{ text: op === 'ap' ? '✅ Sí, aprobar' : '❌ Sí, rechazar', callback_data: (op === 'ap' ? 'oa:' : 'or:') + id }, { text: '↩️ Cancelar', callback_data: 'no:' + id }]]);
      return res.end('{"ok":true}');
    }
    if(op === 'no'){
      await tg('answerCallbackQuery', { callback_query_id: cb.id, text: 'Cancelado' });
      await reemplazar(m, txt, [[{ text: '✅ Aceptar', callback_data: 'ap:' + id }, { text: '❌ Rechazar', callback_data: 'rj:' + id }]]);
      return res.end('{"ok":true}');
    }
    if(op === 'oa' || op === 'or'){
      const acc = op === 'oa' ? 'aprobar' : 'rechazar';
      const r = await resolver(id, acc, 'telegram ' + quien, acc === 'rechazar' ? 'No se pudo confirmar el pago (rechazada desde Telegram)' : null);
      let msg = String((r.json && (r.json.message || r.json.hint)) || '');
      if(r.status < 400){
        await tg('answerCallbackQuery', { callback_query_id: cb.id, text: acc === 'aprobar' ? 'Aprobada y abonada' : 'Rechazada' });
        await reemplazar(m, txt + '\n\n' + (acc === 'aprobar' ? '✅ <b>APROBADA</b>' : '❌ <b>RECHAZADA</b>') + ' por ' + esc(quien));
      } else if(/ya_resuelta:(\w+)/.test(msg)){
        await tg('answerCallbackQuery', { callback_query_id: cb.id, text: 'Ya estaba ' + /ya_resuelta:(\w+)/.exec(msg)[1] + '. No se abonó de nuevo.', show_alert: true });
        await reemplazar(m, txt + '\n\nℹ️ Ya estaba ' + esc(/ya_resuelta:(\w+)/.exec(msg)[1]));
      } else {
        await tg('answerCallbackQuery', { callback_query_id: cb.id, text: 'No se pudo: ' + (/no_existe/.test(msg) ? 'la solicitud no existe' : 'revisa el panel'), show_alert: true });
        await reemplazar(m, txt + '\n\n⚠️ No se pudo completar. Hazlo desde el panel.', [[{ text: '✅ Aceptar', callback_data: 'ap:' + id }, { text: '❌ Rechazar', callback_data: 'rj:' + id }]]);
      }
      return res.end('{"ok":true}');
    }
    await tg('answerCallbackQuery', { callback_query_id: cb.id });
    return res.end('{"ok":true}');
  }catch(e){ res.statusCode = 200; return res.end('{"ok":true}'); }
};
module.exports.secreto = secreto;

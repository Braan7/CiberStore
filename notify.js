/* ================================================================
   Vercel Serverless Function — Telegram Proxy + ACEPTAR/RECHAZAR
   /api/notify  AND  /api/webhook
================================================================ */
const TOKEN   = '8324650981:AAGFM2gHPUH1OiCXZgu2efxL9s8FDaGCFEE';
const CHAT_ID = '-1003917741824';
const SB_URL  = 'https://pnotsqsudqpwqzssevig.supabase.co';
const SB_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBub3RzcXN1ZHFwd3F6c3NldmlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NjU0NTEsImV4cCI6MjA5NTA0MTQ1MX0.Zs6wmPMoWh2S482fwn_C_N6om5I6TJzEijE5mRDpRMc';

async function sbGet(table, qs){
  const r = await fetch(`${SB_URL}/rest/v1/${table}?${qs}`, {
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` }
  });
  return r.json();
}
async function sbPatch(table, data, qs){
  const r = await fetch(`${SB_URL}/rest/v1/${table}?${qs}`, {
    method: 'PATCH',
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`,
               'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify(data)
  });
  return r.json();
}
async function sbPost(table, data){
  const r = await fetch(`${SB_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`,
               'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify(data)
  });
  return r.json();
}
async function tgEditMsg(chat_id, message_id, text){
  await fetch(`https://api.telegram.org/bot${TOKEN}/editMessageText`, {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ chat_id, message_id, text, parse_mode: 'HTML' })
  });
}
async function tgAnswer(callback_query_id, text){
  await fetch(`https://api.telegram.org/bot${TOKEN}/answerCallbackQuery`, {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ callback_query_id, text, show_alert: true })
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if(req.method === 'OPTIONS') return res.status(200).end();

  const body = req.body || {};

  /* Telegram webhook: button press */
  if(body.callback_query){
    const cb     = body.callback_query;
    const data   = cb.data || '';
    const msgId  = cb.message && cb.message.message_id;
    const chatId = cb.message && cb.message.chat && cb.message.chat.id;

    await tgAnswer(cb.id, 'Procesando...');

    const parts    = data.split(':');
    const action   = parts[0];
    const username = parts[1];
    const monto    = parseFloat(parts[2] || '0');

    if(action === 'accept' && username && monto > 0){
      try {
        const users = await sbGet('profiles', `username=eq.${encodeURIComponent(username)}&limit=1`);
        const user  = Array.isArray(users) ? users[0] : null;
        if(!user){
          await tgEditMsg(chatId, msgId, `\u274C Usuario <b>${username}</b> no encontrado.`);
          return res.status(200).end();
        }
        const newSaldo = (user.saldo || 0) + monto;
        await sbPatch('profiles', { saldo: newSaldo }, `id=eq.${user.id}`);
        await sbPost('movimientos_saldo', {
          user_id:     user.id,
          tipo:        'credito',
          monto:       monto,
          descripcion: 'Recarga aprobada por admin $' + monto + ' MX'
        });
        await tgEditMsg(chatId, msgId,
          '\u2705 <b>Recarga APROBADA</b>\n\n\uD83D\uDC64 Usuario: <b>' + username + '</b>\n\uD83D\uDCB0 Monto: <b>$' + monto + ' MX</b>\n\uD83D\uDCB3 Nuevo saldo: <b>$' + newSaldo + ' MX</b>\n\n\u2705 Saldo agregado.'
        );
      } catch(e) {
        await tgEditMsg(chatId, msgId, '\u274C Error: ' + e.message);
      }
    } else if(action === 'reject'){
      await tgEditMsg(chatId, msgId,
        '\u274C <b>Recarga RECHAZADA</b>\n\n\uD83D\uDC64 Usuario: <b>' + username + '</b>\n\uD83D\uDCB0 Monto: $' + monto + ' MX\n\n\u274C Solicitud rechazada.'
      );
    }
    return res.status(200).json({ ok: true });
  }

  /* Normal notification from browser */
  if(req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { message, buttons } = body;
    if(!message) return res.status(400).json({ error: 'No message' });

    const payload = { chat_id: CHAT_ID, text: message, parse_mode: 'HTML' };
    if(buttons && buttons.length){
      payload.reply_markup = {
        inline_keyboard: [ buttons.map(function(b){ return { text: b.text, callback_data: b.data }; }) ]
      };
    }

    const tgRes = await fetch('https://api.telegram.org/bot' + TOKEN + '/sendMessage', {
      method:  'POST',
      headers: {'Content-Type': 'application/json'},
      body:    JSON.stringify(payload)
    });
    const result = await tgRes.json();
    return res.status(200).json(result);
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}

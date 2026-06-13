/* ================================================================
   Vercel Serverless — CiberStore Telegram Bot + Likes API
================================================================ */
const TOKEN         = process.env.TG_TOKEN      || '8324650981:AAGFM2gHPUH1OiCXZgu2efxL9s8FDaGCFEE';
const CHAT_ID       = process.env.TG_CHAT_ID    || '-1003917741824';
const SB_URL        = 'https://pnotsqsudqpwqzssevig.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBub3RzcXN1ZHFwd3F6c3NldmlnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTQ2NTQ1MSwiZXhwIjoyMDk1MDQxNDUxfQ._EihGVFyFoqtfIenqfDpctyHnZXe84ZPTmvjyUO0nf8'; // service_role

const SB_HEADERS = {
  'apikey': SB_KEY,
  'Authorization': 'Bearer ' + SB_KEY,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

async function sbInsert(table, data) {
  const url = SB_URL + '/rest/v1/' + table;
  const r = await fetch(url, {
    method: 'POST',
    headers: SB_HEADERS,
    body: JSON.stringify(data)
  });
  const text = await r.text();
  console.log('sbInsert', table, r.status, text.substring(0,200));
  if(!r.ok) throw new Error('Supabase insert error: ' + r.status + ' ' + text);
  return JSON.parse(text);
}

async function sbGet(table, qs) {
  const url = SB_URL + '/rest/v1/' + table + '?' + qs;
  const r = await fetch(url, { headers: SB_HEADERS });
  return r.json();
}

async function sbPatch(table, data, qs) {
  const url = SB_URL + '/rest/v1/' + table + '?' + qs;
  const r = await fetch(url, { method: 'PATCH', headers: SB_HEADERS, body: JSON.stringify(data) });
  return r.json();
}

async function tgSendTo(chat_id, text, extra) {
  const payload = Object.assign({ chat_id, text, parse_mode: 'HTML' }, extra || {});
  const r = await fetch('https://api.telegram.org/bot' + TOKEN + '/sendMessage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return r.json();
}
async function tgSend(text, extra) { return tgSendTo(CHAT_ID, text, extra); }
async function tgEdit(chat_id, message_id, text) {
  await fetch('https://api.telegram.org/bot' + TOKEN + '/editMessageText', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id, message_id, text, parse_mode: 'HTML' })
  });
}
async function tgAnswer(id, text) {
  await fetch('https://api.telegram.org/bot' + TOKEN + '/answerCallbackQuery', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: id, text, show_alert: true })
  });
}

function genPIN() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'CS-';
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  code += '-';
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

async function crearPIN(label, dias, fromChatId, enviosDia) {
  const code = genPIN();
  try {
    await sbInsert('likes_pines', {
      codigo: code,
      dias: parseInt(dias),
      activo: true,
      usado: false,
      creado_por: 'telegram',
      envios_dia: enviosDia || 1
    });
    await tgSendTo(fromChatId || CHAT_ID,
      '\uD83D\uDD11 <b>PIN generado</b>\n\n'
      + '\uD83D\uDCCB Codigo: <code>' + code + '</code>\n'
      + '\uD83C\uDFAE Plan: <b>' + label + '</b>\n'
      + '\uD83D\uDDD3 Duracion: <b>' + dias + ' dias</b>\n\n'
      + '<i>Envialo al cliente para canjear en ciberstore.lat</i>'
    );
  } catch(e) {
    await tgSendTo(fromChatId || CHAT_ID, '\u274C Error al generar PIN: ' + e.message);
  }
}

const PLANES = {
  basico:   { label: 'Basico (1 ID/dia)',    dias: 30, envios_dia: 1  },
  estandar: { label: 'Estandar (4 IDs/dia)', dias: 30, envios_dia: 4  },
  pro:      { label: 'PRO (7 IDs/dia)',       dias: 30, envios_dia: 7  },
  elite:    { label: 'ELITE (10 IDs/dia)',    dias: 30, envios_dia: 10 },
  master:   { label: 'MASTER (20 IDs/dia)',   dias: 30, envios_dia: 20 }
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const body = req.body || {};

  /* ── Telegram webhook ─────────────────────────────────────── */
  if (body.message || body.callback_query) {

    if (body.message) {
      const msg    = body.message;
      const text   = (msg.text || '').trim().toLowerCase();
      const chatId = msg.chat && msg.chat.id;

      /* /basico /estandar /pro /elite /master */
      const planKey = text.replace('/', '');
      if (PLANES[planKey]) {
        const p = PLANES[planKey];
        await crearPIN(p.label, p.dias, chatId, p.envios_dia);
        return res.status(200).json({ ok: true });
      }

      /* /pin7 /pin14 legacy */
      const pinMatch = text.match(/^\/pin(\d+)/);
      if (pinMatch) {
        await crearPIN(pinMatch[1] + ' dias', parseInt(pinMatch[1]), chatId);
        return res.status(200).json({ ok: true });
      }

      /* /menu /start */
      if (text === '/menu' || text === '/start') {
        await tgSendTo(chatId, '\uD83C\uDFAE <b>CiberStore Admin</b>\n\nGenera un PIN:', {
          reply_markup: { inline_keyboard: [
            [{ text: '\uD83D\uDC9A Basico - 1 ID/dia',    callback_data: 'mkplan:basico'   }],
            [{ text: '\uD83D\uDC99 Estandar - 4 IDs/dia', callback_data: 'mkplan:estandar' }],
            [{ text: '\uD83D\uDC9B PRO - 7 IDs/dia',      callback_data: 'mkplan:pro'      }],
            [{ text: '\uD83D\uDC97 ELITE - 10 IDs/dia',   callback_data: 'mkplan:elite'    }],
            [{ text: '\uD83D\uDC51 MASTER - 20 IDs/dia',  callback_data: 'mkplan:master'   }],
            [{ text: '\uD83D\uDCCA Planes activos', callback_data: 'planes:list' },
             { text: '\uD83D\uDCB0 Stats',          callback_data: 'stats:quick' }]
          ]}
        });
        return res.status(200).json({ ok: true });
      }
    }

    if (body.callback_query) {
      const cb     = body.callback_query;
      const data   = cb.data || '';
      const msgId  = cb.message && cb.message.message_id;
      const chatId = cb.message && cb.message.chat && cb.message.chat.id;
      await tgAnswer(cb.id, 'Procesando...');
      const parts  = data.split(':');
      const action = parts[0];

      if (action === 'mkplan') {
        const p = PLANES[parts[1]];
        if (p) await crearPIN(p.label, p.dias, chatId, p.envios_dia);
        return res.status(200).json({ ok: true });
      }

      if (action === 'planes') {
        const planes = await sbGet('likes_planes', 'activo=eq.true&order=created_at.desc&limit=10');
        if (!planes || !planes.length) {
          await tgSendTo(chatId, '\uD83D\uDCCB Sin planes activos.');
        } else {
          let txt = '\uD83D\uDCCB <b>Planes activos (' + planes.length + ')</b>\n\n';
          planes.forEach(p => {
            txt += '\uD83D\uDC64 <b>' + p.username + '</b> \u2014 ' + p.dias_restantes + ' dias restantes \u2022 ' + (p.likes_enviados || 0) + ' likes\n';
          });
          await tgSendTo(chatId, txt);
        }
        return res.status(200).json({ ok: true });
      }

      if (action === 'stats') {
        const [users, movs] = await Promise.all([
          sbGet('profiles', 'select=id'),
          sbGet('movimientos_saldo', 'tipo=eq.compra&created_at=gte.' + new Date(Date.now() - 86400000).toISOString() + '&select=monto')
        ]);
        const ventas = movs ? movs.reduce((s, m) => s + (m.monto || 0), 0) : 0;
        await tgSendTo(chatId, '\uD83D\uDCCA <b>Stats</b>\n\n\uD83D\uDC65 Usuarios: ' + (users ? users.length : 0) + '\n\uD83D\uDCB0 Ventas hoy: $' + ventas.toLocaleString('es-MX') + ' MX');
        return res.status(200).json({ ok: true });
      }

      if (action === 'accept') {
        const username = parts[1]; const monto = parseFloat(parts[2] || '0');
        try {
          const users = await sbGet('profiles', 'username=eq.' + encodeURIComponent(username) + '&limit=1');
          const user  = Array.isArray(users) ? users[0] : null;
          if (!user) { await tgEdit(chatId, msgId, '\u274C Usuario no encontrado.'); return res.status(200).end(); }
          const newSaldo = (user.saldo || 0) + monto;
          await sbPatch('profiles', { saldo: newSaldo }, 'id=eq.' + user.id);
          await sbInsert('movimientos_saldo', { user_id: user.id, tipo: 'credito', monto, descripcion: 'Recarga aprobada $' + monto + ' MX' });
          await tgEdit(chatId, msgId, '\u2705 <b>Recarga APROBADA</b>\n\n\uD83D\uDC64 <b>' + username + '</b>\n\uD83D\uDCB0 $' + monto + ' MX\n\uD83D\uDCB3 Nuevo saldo: $' + newSaldo + ' MX');
        } catch(e) { await tgEdit(chatId, msgId, '\u274C Error: ' + e.message); }
        return res.status(200).json({ ok: true });
      }

      if (action === 'reject') {
        await tgEdit(chatId, msgId, '\u274C <b>Recarga RECHAZADA</b>\n\n\uD83D\uDC64 <b>' + parts[1] + '</b>\n\uD83D\uDCB0 $' + parts[2] + ' MX');
        return res.status(200).json({ ok: true });
      }
    }
    return res.status(200).json({ ok: true });
  }

  /* ── Browser calls ────────────────────────────────────────── */
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { message, buttons, action, playerId, username } = body;


    if (!message) return res.status(400).json({ error: 'No message' });
    const payload = { chat_id: CHAT_ID, text: message, parse_mode: 'HTML' };
    if (buttons && buttons.length) {
      payload.reply_markup = { inline_keyboard: [buttons.map(b => ({ text: b.text, callback_data: b.data }))] };
    }
    const tgRes = await fetch('https://api.telegram.org/bot' + TOKEN + '/sendMessage', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
    });
    return res.status(200).json(await tgRes.json());
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}

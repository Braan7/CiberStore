/* ================================================================
   Vercel Serverless Function — Telegram Proxy
   Sube la carpeta /api/ a tu repo de GitHub
================================================================ */
const TOKEN   = '8324650981:AAGFM2gHPUH1OiCXZgu2efxL9s8FDaGCFEE';
const CHAT_ID = '-1003914636059';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if(req.method === 'OPTIONS') return res.status(200).end();
  if(req.method !== 'POST')   return res.status(405).json({error:'Method not allowed'});
  try {
    const { message } = req.body;
    if(!message) return res.status(400).json({error:'No message'});
    const tgRes = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method:  'POST',
      headers: {'Content-Type':'application/json'},
      body:    JSON.stringify({chat_id:CHAT_ID, text:message, parse_mode:'HTML'})
    });
    const data = await tgRes.json();
    return res.status(200).json(data);
  } catch(e) {
    return res.status(500).json({error: e.message});
  }
}

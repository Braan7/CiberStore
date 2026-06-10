/* ================================================================
   Vercel Serverless Function — uses Environment Variables
   Set in Vercel: TG_TOKEN, TG_CHAT_ID, SB_KEY, LIKES_API_KEY
================================================================ */
const TOKEN         = process.env.TG_TOKEN         || '8324650981:AAGFM2gHPUH1OiCXZgu2efxL9s8FDaGCFEE';
const CHAT_ID       = process.env.TG_CHAT_ID       || '-1003917741824';
const SB_URL        = 'https://pnotsqsudqpwqzssevig.supabase.co';
const SB_KEY        = process.env.SB_KEY           || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBub3RzcXN1ZHFwd3F6c3NldmlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NjU0NTEsImV4cCI6MjA5NTA0MTQ1MX0.Zs6wmPMoWh2S482fwn_C_N6om5I6TJzEijE5mRDpRMc';
const LIKES_API_KEY = process.env.LIKES_API_KEY    || 'c642fba2-fcff-407f-8cba-3e14380689d7';
const LIKES_API_URL = 'https://hubsdev.com/api/frifas/sendlikes';

/* ── Supabase ─────────────────────────────────────────────────── */
async function sbGet(t,q){ const r=await fetch(`${SB_URL}/rest/v1/${t}?${q}`,{headers:{apikey:SB_KEY,Authorization:`Bearer ${SB_KEY}`}});return r.json(); }
async function sbPatch(t,d,q){ const r=await fetch(`${SB_URL}/rest/v1/${t}?${q}`,{method:'PATCH',headers:{apikey:SB_KEY,Authorization:`Bearer ${SB_KEY}`,'Content-Type':'application/json',Prefer:'return=representation'},body:JSON.stringify(d)});return r.json(); }
async function sbPost(t,d){ const r=await fetch(`${SB_URL}/rest/v1/${t}`,{method:'POST',headers:{apikey:SB_KEY,Authorization:`Bearer ${SB_KEY}`,'Content-Type':'application/json',Prefer:'return=representation'},body:JSON.stringify(d)});return r.json(); }

/* ── Telegram ─────────────────────────────────────────────────── */
async function tgSendTo(chat_id,text,extra){
  const payload=Object.assign({chat_id,text,parse_mode:'HTML'},extra||{});
  const r=await fetch('https://api.telegram.org/bot'+TOKEN+'/sendMessage',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
  return r.json();
}
async function tgSend(text,extra){ return tgSendTo(CHAT_ID,text,extra); }
async function tgEdit(chat_id,message_id,text){
  await fetch('https://api.telegram.org/bot'+TOKEN+'/editMessageText',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id,message_id,text,parse_mode:'HTML'})});
}
async function tgAnswer(id,text){
  await fetch('https://api.telegram.org/bot'+TOKEN+'/answerCallbackQuery',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({callback_query_id:id,text,show_alert:true})});
}

/* ── PIN generator ────────────────────────────────────────────── */
function genPIN(){
  const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code='CS-';
  for(let i=0;i<4;i++) code+=chars[Math.floor(Math.random()*chars.length)];
  code+='-';
  for(let i=0;i<4;i++) code+=chars[Math.floor(Math.random()*chars.length)];
  return code;
}
async function crearPIN(dias,fromChatId){
  const code=genPIN();
  await sbPost('likes_pines',{codigo:code,dias:parseInt(dias),activo:true,usado:false,creado_por:'telegram'});
  await tgSendTo(fromChatId||CHAT_ID,
    '\uD83D\uDD11 <b>PIN generado</b>\n\n'
    +'\uD83D\uDCCB Codigo: <code>'+code+'</code>\n'
    +'\uD83D\uDDD3 Plan: <b>'+dias+' dias</b>\n\n'
    +'<i>Envialo al cliente para canjear en ciberstore.lat</i>'
  );
}

async function crearPINConLabel(label,dias,fromChatId){
  const code=genPIN();
  await sbPost('likes_pines',{codigo:code,dias:parseInt(dias),activo:true,usado:false,creado_por:'telegram'});
  await tgSendTo(fromChatId||CHAT_ID,
    '\uD83D\uDD11 <b>PIN generado</b>\n\n'
    +'\uD83D\uDCCB Codigo: <code>'+code+'</code>\n'
    +'\uD83C\uDFAE Plan: <b>'+label+'</b>\n'
    +'\uD83D\uDDD3 Duracion: <b>'+dias+' dias</b>\n\n'
    +'<i>Envialo al cliente para canjear en ciberstore.lat</i>'
  );
}

export default async function handler(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  if(req.method==='OPTIONS') return res.status(200).end();

  const body=req.body||{};

  /* ── Telegram webhook ──────────────────────────────────────── */
  if(body.message||body.callback_query){
    if(body.message){
      const msg=body.message;
      const text=(msg.text||'').trim();
      const chatId=msg.chat&&msg.chat.id;
      /* /pin7 /pin14 /pin21 /pin30 legacy */
      const pinMatch=text.match(/^\/pin(\d+)/i);
      if(pinMatch){ await crearPIN(pinMatch[1],chatId); return res.status(200).json({ok:true}); }
      /* Plan name commands */
      const planCmds={'basico':'30','estandar':'30','pro':'30','elite':'30','master':'30'};
      const planLabels={'basico':'Basico (1 ID/dia)','estandar':'Estandar (4 IDs/dia)','pro':'PRO (7 IDs/dia)','elite':'ELITE (10 IDs/dia)','master':'MASTER (20 IDs/dia)'};
      const cmdMatch=text.match(/^\/([a-z]+)/i);
      if(cmdMatch&&planCmds[cmdMatch[1].toLowerCase()]){
        const planKey=cmdMatch[1].toLowerCase();
        await crearPINConLabel(planLabels[planKey],30,chatId);
        return res.status(200).json({ok:true});
      }
      if(text==='/menu'||text==='/start'){
        await tgSendTo(chatId,'\uD83C\uDFAE <b>CiberStore Admin</b>\n\nGenera un PIN:',{reply_markup:{inline_keyboard:[
          [{text:'\uD83D\uDC9A Basico - 1 ID/dia',callback_data:'mkplan:basico'}],
          [{text:'\uD83D\uDC99 Estandar - 4 IDs/dia',callback_data:'mkplan:estandar'}],
          [{text:'\uD83D\uDC9B PRO - 7 IDs/dia',callback_data:'mkplan:pro'}],
          [{text:'\uD83D\uDC97 ELITE - 10 IDs/dia',callback_data:'mkplan:elite'}],
          [{text:'\uD83D\uDC51 MASTER - 20 IDs/dia',callback_data:'mkplan:master'}],
          [{text:'\uD83D\uDCCA Planes activos',callback_data:'planes:list'},{text:'\uD83D\uDCB0 Stats',callback_data:'stats:quick'}]
        ]}});
        return res.status(200).json({ok:true});
      }
    }
    if(body.callback_query){
      const cb=body.callback_query;
      const data=cb.data||'';
      const msgId=cb.message&&cb.message.message_id;
      const chatId=cb.message&&cb.message.chat&&cb.message.chat.id;
      await tgAnswer(cb.id,'Procesando...');
      const parts=data.split(':');
      const action=parts[0];

      if(action==='mkpin'){ await crearPIN(parts[1],chatId); return res.status(200).json({ok:true}); }

      if(action==='mkplan'){
        const planLabels2={'basico':'Basico (1 ID/dia)','estandar':'Estandar (4 IDs/dia)','pro':'PRO (7 IDs/dia)','elite':'ELITE (10 IDs/dia)','master':'MASTER (20 IDs/dia)'};
        const label=planLabels2[parts[1]]||parts[1];
        await crearPINConLabel(label,30,chatId);
        return res.status(200).json({ok:true});
      }

      if(action==='planes'){
        const planes=await sbGet('likes_planes','activo=eq.true&order=created_at.desc&limit=10');
        if(!planes||!planes.length){
          await tgSendTo(chatId,'\uD83D\uDCCB Sin planes activos actualmente.');
        } else {
          let txt='\uD83D\uDCCB <b>Planes activos ('+planes.length+')</b>\n\n';
          planes.forEach(function(p){
            txt+='\uD83D\uDC64 <b>'+p.username+'</b> \u2014 ID: '+(p.ff_id||'sin ID')+'\n   \uD83D\uDDD3 '+p.dias_restantes+' dias restantes \u2022 '+(p.likes_enviados||0)+' likes enviados\n\n';
          });
          await tgSendTo(chatId,txt);
        }
        return res.status(200).json({ok:true});
      }

      if(action==='stats'){
        const [users,movs]=await Promise.all([
          sbGet('profiles','select=id'),
          sbGet('movimientos_saldo','tipo=eq.compra&created_at=gte.'+new Date(Date.now()-86400000).toISOString()+'&select=monto')
        ]);
        const ventas=movs?movs.reduce(function(s,m){return s+(m.monto||0);},0):0;
        await tgSendTo(chatId,'\uD83D\uDCCA <b>Stats rapidas</b>\n\n\uD83D\uDC65 Usuarios: '+(users?users.length:0)+'\n\uD83D\uDCB0 Ventas hoy: $'+ventas.toLocaleString('es-MX')+' MX');
        return res.status(200).json({ok:true});
      }

      if(action==='accept'){
        const username=parts[1]; const monto=parseFloat(parts[2]||'0');
        try {
          const users=await sbGet('profiles','username=eq.'+encodeURIComponent(username)+'&limit=1');
          const user=Array.isArray(users)?users[0]:null;
          if(!user){ await tgEdit(chatId,msgId,'\u274C Usuario no encontrado.'); return res.status(200).end(); }
          const newSaldo=(user.saldo||0)+monto;
          await sbPatch('profiles',{saldo:newSaldo},'id=eq.'+user.id);
          await sbPost('movimientos_saldo',{user_id:user.id,tipo:'credito',monto,descripcion:'Recarga aprobada $'+monto+' MX'});
          await tgEdit(chatId,msgId,'\u2705 <b>Recarga APROBADA</b>\n\n\uD83D\uDC64 <b>'+username+'</b>\n\uD83D\uDCB0 $'+monto+' MX\n\uD83D\uDCB3 Nuevo saldo: $'+newSaldo+' MX');
        } catch(e){ await tgEdit(chatId,msgId,'\u274C Error: '+e.message); }
        return res.status(200).json({ok:true});
      }

      if(action==='reject'){
        await tgEdit(chatId,msgId,'\u274C <b>Recarga RECHAZADA</b>\n\n\uD83D\uDC64 <b>'+parts[1]+'</b>\n\uD83D\uDCB0 $'+parts[2]+' MX');
        return res.status(200).json({ok:true});
      }
    }
    return res.status(200).json({ok:true});
  }

  /* ── Browser calls ─────────────────────────────────────────── */
  if(req.method!=='POST') return res.status(405).json({error:'Method not allowed'});

  try {
    const {message,buttons,action,playerId,username}=body;

    if(action==='sendlikes'&&playerId){
      try {
        const r=await fetch(LIKES_API_URL+'?id='+encodeURIComponent(playerId)+'&key='+LIKES_API_KEY);
        const result=await r.json();
        if(result.sucesso){
          const d=result.data&&result.data[0];
          const enviadas=d&&d.likes&&d.likes.enviadas||'~220';
          const depois=d&&d.likes&&d.likes.depois||'?';
          await tgSend('\u26A1 <b>Likes enviados</b>\n\n\uD83D\uDC64 <b>'+(username||'?')+'</b>\n\uD83C\uDFAE ID: '+playerId+'\n\uD83D\uDC4D Enviados: <b>'+enviadas+'</b>\n\uD83D\uDCCA Total: '+depois);
          return res.status(200).json({ok:true,enviadas,result});
        } else {
          await tgSend('\u26A0\uFE0F Error likes API\n\nUsuario: '+(username||'?')+'\nID: '+playerId+'\nEstado: '+(result.status||'ERROR'));
          return res.status(200).json({ok:false,result});
        }
      } catch(e){
        await tgSend('\u26A0\uFE0F Error likes: '+e.message);
        return res.status(500).json({error:e.message});
      }
    }

    if(!message) return res.status(400).json({error:'No message'});
    const payload={chat_id:CHAT_ID,text:message,parse_mode:'HTML'};
    if(buttons&&buttons.length){
      payload.reply_markup={inline_keyboard:[buttons.map(function(b){return{text:b.text,callback_data:b.data};})]};
    }
    const tgRes=await fetch('https://api.telegram.org/bot'+TOKEN+'/sendMessage',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    return res.status(200).json(await tgRes.json());
  } catch(e){
    return res.status(500).json({error:e.message});
  }
}

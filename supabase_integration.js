/* ================================================================
   SUPABASE INTEGRATION — Reemplaza localStorage con Supabase
   Incluir DESPUES de supabase.js y ANTES de script.js
================================================================ */

/* ── USUARIOS ─────────────────────────────────────────────────── */
function sbGetUser(username){
  return sb.select('usuarios', 'username=eq.'+encodeURIComponent(username)+'&limit=1')
    .then(function(rows){ return rows[0]||null; });
}

function sbCreateUser(username, passHash, refCode){
  return sb.insert('usuarios', {
    username:  username,
    pass_hash: passHash,
    ref_code:  refCode,
    spent:     0,
    orders:    0
  }).then(function(rows){ return rows[0]||null; });
}

function sbUpdateUser(username, data){
  return sb.update('usuarios', data, 'username=eq.'+encodeURIComponent(username));
}

/* ── AUTH OVERRIDE ─────────────────────────────────────────────── */
function doRegister(){
  var user  = (document.getElementById('reg-user')||{value:''}).value.trim().toLowerCase();
  var pass  = (document.getElementById('reg-pass')||{value:''}).value;
  var pass2 = (document.getElementById('reg-pass2')||{value:''}).value;
  var err   = document.getElementById('reg-err');
  var ok    = document.getElementById('reg-ok');
  err.style.display='none'; ok.style.display='none';

  if(!user||user.length<3){err.textContent='Usuario muy corto (min 3 caracteres)';err.style.display='block';return;}
  if(!/^[a-z0-9_]+$/.test(user)){err.textContent='Solo letras, numeros y guion bajo';err.style.display='block';return;}
  if(!pass||pass.length<6){err.textContent='Contrasena muy corta (min 6 caracteres)';err.style.display='block';return;}
  if(pass!==pass2){err.textContent='Las contrasenas no coinciden';err.style.display='block';return;}

  /* Show loading */
  err.style.display='none';
  ok.textContent='Verificando...'; ok.style.display='block';

  sbGetUser(user).then(function(existing){
    if(existing){
      ok.style.display='none';
      err.textContent='Ese nombre de usuario ya existe';
      err.style.display='block';
      return;
    }
    var chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    var refCode='REF-';
    for(var i=0;i<6;i++) refCode+=chars[Math.floor(Math.random()*chars.length)];

    sbCreateUser(user, hashPass(pass), refCode).then(function(created){
      if(!created){
        ok.style.display='none';
        err.textContent='Error al crear cuenta. Intenta de nuevo.';
        err.style.display='block';
        return;
      }
      ok.textContent='Cuenta creada! Entrando...';
      setTimeout(function(){ loginUser(user); }, 800);
    }).catch(function(e){
      ok.style.display='none';
      err.textContent='Error de conexion. Intenta de nuevo.';
      err.style.display='block';
    });
  }).catch(function(){
    ok.style.display='none';
    err.textContent='Error de conexion. Intenta de nuevo.';
    err.style.display='block';
  });
}

function doLogin(){
  var user = (document.getElementById('login-user')||{value:''}).value.trim().toLowerCase();
  var pass = (document.getElementById('login-pass')||{value:''}).value;
  var err  = document.getElementById('login-err');
  err.style.display='none';
  if(!user||!pass){err.textContent='Ingresa tu usuario y contrasena';err.style.display='block';return;}

  err.textContent='Verificando...';
  err.style.color='var(--muted)';
  err.style.display='block';

  sbGetUser(user).then(function(u){
    err.style.color='#ff6b6b';
    if(!u){
      err.textContent='Usuario no encontrado';
      return;
    }
    var ok = u.pass_hash === hashPass(pass);
    /* Migration: try old hash */
    if(!ok){
      var oldH=0;
      for(var i=0;i<pass.length;i++){var c=pass.charCodeAt(i);oldH=((oldH<<5)-oldH)+c;oldH|=0;}
      if(u.pass_hash===oldH.toString(36)){
        /* Migrate hash */
        sbUpdateUser(user,{pass_hash:hashPass(pass)});
        ok=true;
      }
    }
    if(!ok){
      err.textContent='Contrasena incorrecta';
      return;
    }
    err.style.display='none';
    loginUser(user);
  }).catch(function(){
    err.textContent='Error de conexion. Intenta de nuevo.';
  });
}

function loginUser(username){
  isGuest=false;
  authSession={username:username};
  saveSession({username:username});
  hideAuthModal();
  updateAuthUI();
  refreshUI();
  showToast('Bienvenido, '+username+'!', 2500);
}

/* ── HISTORIAL ─────────────────────────────────────────────────── */
function addToHistory(item){
  if(!authSession) return;
  sb.insert('historial',{
    username:  authSession.username,
    producto:  item.name,
    precio:    item.price,
    icon:      item.icon||'',
    order_num: item.order||0
  }).catch(function(){});
  /* Also update spent + orders on usuario */
  sbGetUser(authSession.username).then(function(u){
    if(u) sbUpdateUser(authSession.username,{
      spent:  (u.spent||0)+(item.price||0),
      orders: (u.orders||0)+1
    });
  }).catch(function(){});
}

function getHistory(){
  if(!authSession) return Promise.resolve([]);
  return sb.select('historial',
    'username=eq.'+encodeURIComponent(authSession.username)+'&order=created_at.desc&limit=50'
  );
}

/* ── RESENAS ───────────────────────────────────────────────────── */
function submitResena(){
  var nombre    = (document.getElementById('r-nombre')||{value:''}).value.trim();
  var servicio  = (document.getElementById('r-servicio')||{value:''}).value;
  var comentario= (document.getElementById('r-comentario')||{value:''}).value.trim();
  if(!selectedStars){showToast('Elige una calificacion');return;}
  if(!nombre){showToast('Ingresa tu nombre');return;}
  if(!servicio){showToast('Selecciona el servicio');return;}
  if(comentario.length<5){showToast('Escribe un comentario mas largo');return;}

  sb.insert('resenas',{username:nombre,servicio:servicio,stars:selectedStars,texto:comentario})
    .then(function(){
      closeResenaModal();
      renderResenas();
      showToast('Gracias por tu resena!',2500);
    }).catch(function(){ showToast('Error al publicar. Intenta de nuevo.'); });
}

function renderResenas(){
  var grid=document.getElementById('resenas-grid');
  var summary=document.getElementById('resenas-summary');
  if(!grid) return;
  grid.innerHTML='<div style="text-align:center;padding:2rem;color:var(--muted);font-size:.82rem;grid-column:1/-1">Cargando resenas...</div>';

  sb.select('resenas','order=created_at.desc&limit=9').then(function(rows){
    if(!rows||!rows.length){
      grid.innerHTML='<div style="text-align:center;padding:2rem;color:var(--muted);font-size:.82rem;grid-column:1/-1;background:var(--card);border:1px solid var(--border);border-radius:11px">Aun no hay resenas. Se el primero!</div>';
      if(summary) summary.textContent='Se el primero en opinar';
      return;
    }
    /* Avg stars */
    var total=rows.reduce(function(s,r){return s+r.stars;},0);
    var avg=(total/rows.length).toFixed(1);
    if(summary) summary.textContent=avg+' de 5 \u2605 \u2014 '+rows.length+' resena'+(rows.length!==1?'s':'');
    var html='';
    for(var i=0;i<rows.length;i++){
      var r=rows[i];
      var stars='';
      for(var s=1;s<=5;s++) stars+='<span style="color:'+(s<=r.stars?'#ffd000':'#2a2a3a')+'">&#11088;</span>';
      var fecha=r.created_at?new Date(r.created_at).toLocaleDateString('es-MX',{day:'2-digit',month:'short',year:'numeric'}):'';
      html+='<div style="background:var(--card);border:1px solid var(--border);border-radius:11px;padding:1rem;display:flex;flex-direction:column;gap:.5rem">'
        +'<div style="display:flex;justify-content:space-between;align-items:flex-start">'
        +'<div style="font-size:.85rem;font-weight:700;color:#fff">'+r.username+'</div>'
        +'<div style="font-size:.62rem;color:var(--muted)">'+fecha+'</div>'
        +'</div>'
        +'<div>'+stars+'</div>'
        +'<div style="font-size:.65rem;color:var(--c1);font-weight:600">'+r.servicio+'</div>'
        +'<div style="font-size:.78rem;color:var(--muted);line-height:1.55">'+r.texto+'</div>'
        +'</div>';
    }
    grid.innerHTML=html;
  }).catch(function(){
    grid.innerHTML='<div style="text-align:center;padding:1.5rem;color:var(--muted);font-size:.8rem;grid-column:1/-1">Error al cargar resenas.</div>';
  });
}

/* ── CHAT ──────────────────────────────────────────────────────── */
function renderChat(){
  var feed=document.getElementById('chat-feed');
  var av=document.getElementById('chat-av');
  if(!feed) return;
  if(av&&authSession) av.textContent=authSession.username.charAt(0).toUpperCase();
  feed.innerHTML='<div style="text-align:center;padding:1.5rem;color:var(--muted);font-size:.78rem">Cargando...</div>';

  sb.select('chat','order=created_at.desc&limit=50').then(function(rows){
    if(!rows||!rows.length){
      feed.innerHTML='<div style="text-align:center;padding:2rem;color:var(--muted);font-size:.82rem;background:var(--card);border:1px solid var(--border);border-radius:11px">Se el primero en publicar algo!</div>';
      return;
    }
    var html='';
    for(var i=0;i<rows.length;i++){
      var m=rows[i];
      var isMe=authSession&&m.username===authSession.username;
      var fecha=m.created_at?new Date(m.created_at).toLocaleString('es-MX',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}):'';
      html+='<div style="background:var(--card);border:1px solid var(--border);border-radius:11px;padding:.85rem">'
        +'<div style="display:flex;align-items:center;gap:.55rem;margin-bottom:.45rem">'
        +'<div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,var(--c2),var(--c1));display:flex;align-items:center;justify-content:center;font-family:Orbitron;font-size:.6rem;font-weight:700;color:#fff;flex-shrink:0">'+m.username.charAt(0).toUpperCase()+'</div>'
        +'<div style="flex:1"><span style="font-size:.78rem;font-weight:700;color:#fff">'+m.username+'</span>'
        +(isMe?' <span style="font-size:.58rem;color:var(--c1)">Tu</span>':'')+'</div>'
        +'<span style="font-size:.62rem;color:var(--muted)">'+fecha+'</span>'
        +'</div>'
        +'<div style="font-size:.82rem;color:var(--text);line-height:1.6;margin-bottom:.5rem">'+m.texto+'</div>'
        +'<div style="display:flex;align-items:center;gap:.5rem">'
        +'<button data-id="'+m.id+'" onclick="likeMsg(this.dataset.id)" style="background:none;border:1px solid rgba(255,255,255,.1);color:var(--muted);border-radius:5px;padding:.18rem .5rem;font-size:.68rem;cursor:pointer">\u2764 '+(m.likes||0)+'</button>'
        +((isMe||adminAuthed)?'<button data-id="'+m.id+'" onclick="deleteChatMsg(this.dataset.id)" style="background:none;border:1px solid rgba(255,80,80,.2);color:rgba(255,80,80,.6);border-radius:5px;padding:.18rem .5rem;font-size:.68rem;cursor:pointer">Eliminar</button>':'')
        +'</div>'
        +'</div>';
    }
    feed.innerHTML=html;
  }).catch(function(){
    feed.innerHTML='<div style="text-align:center;padding:1.5rem;color:var(--muted)">Error al cargar el chat.</div>';
  });
}

function postChatMsg(){
  if(!authSession){showToast('Inicia sesion para participar');setTimeout(showAuthModal,600);return;}
  var inp=document.getElementById('chat-input');
  var txt=inp?inp.value.trim():'';
  if(!txt||txt.length<2){showToast('Escribe algo primero');return;}
  if(txt.length>280){showToast('Maximo 280 caracteres');return;}
  sb.insert('chat',{username:authSession.username,texto:txt,likes:0})
    .then(function(){
      if(inp) inp.value='';
      renderChat();
      showToast('Publicado!',1500);
    }).catch(function(){ showToast('Error al publicar.'); });
}

function likeMsg(id){
  if(!authSession){showToast('Inicia sesion');return;}
  /* Check if already liked */
  sb.select('chat_likes','msg_id=eq.'+id+'&username=eq.'+encodeURIComponent(authSession.username))
    .then(function(rows){
      if(rows&&rows.length>0){showToast('Ya le diste like');return;}
      sb.insert('chat_likes',{msg_id:parseInt(id),username:authSession.username}).then(function(){
        /* Increment likes */
        sb.select('chat','id=eq.'+id+'&limit=1').then(function(msgs){
          if(msgs&&msgs[0]){
            sb.update('chat',{likes:(msgs[0].likes||0)+1},'id=eq.'+id).then(renderChat);
          }
        });
      }).catch(function(){showToast('Error al dar like.');});
    });
}

function deleteChatMsg(id){
  sb.delete('chat','id=eq.'+id).then(renderChat).catch(function(){showToast('Error al eliminar.');});
}

/* ── CODIGOS PROMO ─────────────────────────────────────────────── */
function getPromoCodes(){
  /* Sync version — returns cached or [] */
  try{ return JSON.parse(localStorage.getItem('cs_promos_cache')||'[]'); }
  catch(e){ return []; }
}

function loadPromoCodesFromSB(){
  return sb.select('codigos','order=created_at.desc').then(function(rows){
    if(rows) localStorage.setItem('cs_promos_cache', JSON.stringify(rows.map(function(r){
      return {code:r.code,disc:r.disc,maxUses:r.max_uses,uses:r.uses,desc:r.descripcion||'',active:r.active,id:r.id};
    })));
    return rows||[];
  });
}

function savePromoCodes(arr){
  /* Save to Supabase via upsert */
  localStorage.setItem('cs_promos_cache', JSON.stringify(arr));
  /* Sync each code */
  for(var i=0;i<arr.length;i++){
    (function(c){
      sb.upsert('codigos',{
        code:c.code, disc:c.disc, max_uses:c.maxUses||100,
        uses:c.uses||0, descripcion:c.desc||'', active:c.active!==false
      }).catch(function(){});
    })(arr[i]);
  }
}

function recordPromoUse(code, orderId, discount){
  sb.select('codigos','code=eq.'+encodeURIComponent(code)+'&limit=1').then(function(rows){
    if(rows&&rows[0]){
      sb.update('codigos',{uses:(rows[0].uses||0)+1},'code=eq.'+encodeURIComponent(code));
    }
  });
  /* Update cache */
  var codes=getPromoCodes();
  for(var i=0;i<codes.length;i++){
    if(codes[i].code===code){ codes[i].uses=(codes[i].uses||0)+1; break; }
  }
  localStorage.setItem('cs_promos_cache', JSON.stringify(codes));
}

/* ── ADMIN USERS ───────────────────────────────────────────────── */
function renderAdminUsers(){
  var list=document.getElementById('adm-users-list');
  if(!list) return;
  list.innerHTML='<div style="text-align:center;padding:1rem;color:var(--muted);font-size:.78rem">Cargando...</div>';
  var query=(document.getElementById('adm-search-user')||{value:''}).value.trim().toLowerCase();
  var sbq='order=created_at.desc&limit=100';
  if(query) sbq+='&username=ilike.*'+query+'*';

  sb.select('usuarios', sbq).then(function(users){
    renderAdminStats2(users);
    if(!users||!users.length){
      list.innerHTML='<div style="text-align:center;padding:1.5rem;color:var(--muted);font-size:.78rem">Sin usuarios'+(query?' con ese nombre':'')+'</div>';
      return;
    }
    var rows='';
    for(var i=0;i<users.length;i++){
      var u=users[i];
      var tier=getTier?(getTier(u.spent||0)):{name:'Visitante'};
      var fecha=u.created_at?new Date(u.created_at).toLocaleDateString('es-MX'):'';
      rows+='<div style="background:#141828;border:1px solid rgba(255,255,255,.07);border-radius:8px;padding:.6rem .75rem">'
        +'<div style="display:flex;align-items:center;gap:.55rem;margin-bottom:.4rem">'
        +'<div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,var(--c2),var(--c1));display:flex;align-items:center;justify-content:center;font-family:Orbitron;font-size:.65rem;font-weight:700;color:#fff;flex-shrink:0">'+u.username.charAt(0).toUpperCase()+'</div>'
        +'<div style="flex:1;min-width:0"><div style="font-family:Orbitron;font-size:.72rem;font-weight:700;color:#fff">'+u.username+'</div>'
        +'<div style="font-size:.62rem;color:var(--muted)">'+tier.name+' &bull; '+fecha+'</div></div>'
        +'<div style="text-align:right;flex-shrink:0">'
        +'<div style="font-family:Orbitron;font-size:.75rem;font-weight:700;color:var(--c1)">$'+(u.spent||0).toLocaleString('es-MX')+'</div>'
        +'<div style="font-size:.6rem;color:var(--muted)">'+(u.orders||0)+' pedidos</div>'
        +'</div></div>'
        +'<div style="display:flex;gap:.35rem;flex-wrap:wrap">'
        +'<button data-user="'+u.username+'" onclick="admAddSaldo(this.dataset.user)" style="padding:.22rem .55rem;background:rgba(0,230,118,.1);border:1px solid rgba(0,230,118,.25);color:#00e676;border-radius:5px;font-family:\'Exo 2\';font-size:.62rem;cursor:pointer;font-weight:700">+ Saldo</button>'
        +'<button data-user="'+u.username+'" onclick="admResetPass(this.dataset.user)" style="padding:.22rem .55rem;background:rgba(0,170,255,.08);border:1px solid rgba(0,170,255,.2);color:var(--c1);border-radius:5px;font-family:\'Exo 2\';font-size:.62rem;cursor:pointer;font-weight:700">Reset pass</button>'
        +'<button data-user="'+u.username+'" onclick="admDeleteUser(this.dataset.user)" style="padding:.22rem .55rem;background:rgba(255,80,80,.08);border:1px solid rgba(255,80,80,.2);color:#ff6b6b;border-radius:5px;font-family:\'Exo 2\';font-size:.62rem;cursor:pointer;font-weight:700">Eliminar</button>'
        +'</div></div>';
    }
    list.innerHTML=rows;
  }).catch(function(){
    list.innerHTML='<div style="text-align:center;padding:1.5rem;color:var(--muted)">Error al cargar usuarios.</div>';
  });
}

function renderAdminStats2(users){
  if(!users){
    sb.select('usuarios','select=spent,orders').then(function(u){ renderAdminStats2(u); });
    return;
  }
  var totalSpent=users.reduce(function(s,u){return s+(u.spent||0);},0);
  var totalOrders=users.reduce(function(s,u){return s+(u.orders||0);},0);
  var tu=document.getElementById('adm-total-users');
  var ts=document.getElementById('adm-total-spent');
  var to=document.getElementById('adm-total-orders');
  if(tu) tu.textContent=users.length;
  if(ts) ts.textContent='$'+totalSpent.toLocaleString('es-MX');
  if(to) to.textContent=totalOrders;
}

function admAddSaldo(username){
  var amt=parseFloat(prompt('Agregar saldo a '+username+':\nMonto en MXN (negativo para restar):'));
  if(isNaN(amt)) return;
  sbGetUser(username).then(function(u){
    if(!u){showToast('Usuario no encontrado');return;}
    sbUpdateUser(username,{
      spent:  Math.max(0,(u.spent||0)+amt),
      orders: (u.orders||0)+(amt>0?1:0)
    }).then(function(){ renderAdminUsers(); showToast((amt>0?'+':'')+amt+' MX a '+username); });
  });
}

function admResetPass(username){
  var np=prompt('Nueva contrasena para '+username+' (min 6 chars):');
  if(!np||np.length<6){showToast('Contrasena muy corta');return;}
  sbUpdateUser(username,{pass_hash:hashPass(np)}).then(function(){ showToast('Contrasena de '+username+' actualizada'); });
}

function admDeleteUser(username){
  if(!confirm('Eliminar usuario '+username+'?')) return;
  sb.delete('usuarios','username=eq.'+encodeURIComponent(username))
    .then(function(){ renderAdminUsers(); showToast('Usuario '+username+' eliminado'); });
}

/* ── SPENT / ORDERS from Supabase ──────────────────────────────── */
function getSpent(){
  /* Use cached value from session */
  return parseInt(localStorage.getItem('cs_spent_'+( authSession?authSession.username:'guest' ))||'0');
}
function addSpend(amt){
  if(!authSession) return null;
  var key = 'cs_spent_'+authSession.username;
  var before = getSpent();
  var after  = before + amt;
  localStorage.setItem(key, after);
  /* Sync to Supabase async */
  sbGetUser(authSession.username).then(function(u){
    if(u) sbUpdateUser(authSession.username,{
      spent:  Math.max(0,(u.spent||0)+amt),
      orders: (u.orders||0)+1
    });
  }).catch(function(){});
  /* Check level up */
  var beforeTier = getTIdx(before);
  var afterTier  = getTIdx(after);
  if(afterTier > beforeTier && TIERS[afterTier]){
    setTimeout(function(){ showLevelUp(TIERS[afterTier].name); }, 800);
  }
  return null;
}

/* ── INIT SUPABASE ─────────────────────────────────────────────── */
(function initSupabase(){
  /* Load promo codes from Supabase */
  loadPromoCodesFromSB().catch(function(){});

  /* Sync spent from Supabase if logged in */
  var saved = JSON.parse(localStorage.getItem('cs_session')||'null');
  if(saved && saved.username){
    sbGetUser(saved.username).then(function(u){
      if(u){
        localStorage.setItem('cs_spent_'+saved.username, u.spent||0);
      }
    }).catch(function(){});
  }
})();

/* ── EXPORT CSV from Supabase ───────────────────────────────────── */
function exportCSV(){
  sb.select('usuarios','order=created_at.desc').then(function(users){
    if(!users||!users.length){showToast('No hay usuarios para exportar');return;}
    var rows=[['Usuario','Fecha registro','Pedidos','Gastado MXN','Codigo referido']];
    for(var i=0;i<users.length;i++){
      var u=users[i];
      var fecha=u.created_at?new Date(u.created_at).toLocaleDateString('es-MX'):'';
      rows.push([u.username,fecha,u.orders||0,u.spent||0,u.ref_code||'']);
    }
    var csv=rows.map(function(r){return r.map(function(c){return '"'+String(c).replace(/"/g,'""')+'"';}).join(',');}).join('\n');
    var blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8;'});
    var url=URL.createObjectURL(blob);
    var a=document.createElement('a');
    a.href=url; a.download='ciberstore_'+new Date().toISOString().slice(0,10)+'.csv';
    a.click();
    URL.revokeObjectURL(url);
    showToast('CSV descargado!',2000);
  }).catch(function(){showToast('Error al exportar.');});
}

/* ── DASHBOARD from Supabase ────────────────────────────────────── */
function renderSalesDash(){
  var canvas=document.getElementById('sales-chart');
  if(!canvas) return;
  /* Get historial last 7 days */
  var since=new Date(Date.now()-7*86400000).toISOString();
  sb.select('historial','created_at=gte.'+since+'&order=created_at.asc').then(function(rows){
    var days=[],sales=[];
    for(var d=6;d>=0;d--){
      var date=new Date(Date.now()-d*86400000);
      var label=date.toLocaleDateString('es-MX',{day:'2-digit',month:'short'});
      days.push(label);
      var total=0;
      if(rows) for(var i=0;i<rows.length;i++){
        var rd=new Date(rows[i].created_at).toLocaleDateString('es-MX',{day:'2-digit',month:'short'});
        if(rd===label) total+=rows[i].precio||0;
      }
      sales.push(total);
    }
    /* Draw chart */
    var W=canvas.width=canvas.offsetWidth||300;
    var H=120; canvas.height=H;
    var ctx=canvas.getContext('2d');
    var maxVal=Math.max.apply(null,sales.concat([1]));
    var pad=24;
    ctx.clearRect(0,0,W,H);
    for(var k=0;k<7;k++){
      var x=pad+k*((W-pad*2)/7);
      var barW2=Math.floor((W-pad*2)/7)-4;
      var barH=Math.round((sales[k]/maxVal)*(H-30));
      var grad=ctx.createLinearGradient(0,H-barH,0,H);
      grad.addColorStop(0,'#00aaff'); grad.addColorStop(1,'rgba(0,170,255,.1)');
      ctx.fillStyle=grad;
      ctx.fillRect(x,H-barH-10,barW2,barH);
      ctx.fillStyle='rgba(90,101,128,.8)'; ctx.font='9px sans-serif'; ctx.textAlign='center';
      ctx.fillText(days[k],x+barW2/2,H);
      if(sales[k]>0){ctx.fillStyle='#fff';ctx.font='bold 9px sans-serif';ctx.fillText('$'+sales[k],x+barW2/2,H-barH-12);}
    }
    /* Extra stats */
    sb.select('usuarios','select=spent,orders').then(function(users2){
      var extra=document.getElementById('dash-extra');
      if(!extra||!users2) return;
      var ts2=users2.reduce(function(s,u){return s+(u.spent||0);},0);
      var to2=users2.reduce(function(s,u){return s+(u.orders||0);},0);
      var avg=to2>0?Math.round(ts2/to2):0;
      extra.innerHTML=
        '<div style="background:rgba(0,170,255,.07);border:1px solid rgba(0,170,255,.18);border-radius:8px;padding:.6rem;text-align:center">'
        +'<div style="font-family:Orbitron;font-size:.9rem;font-weight:700;color:var(--c1)">$'+avg.toLocaleString('es-MX')+'</div>'
        +'<div style="font-size:.6rem;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-top:.1rem">Ticket promedio</div></div>'
        +'<div style="background:rgba(255,208,0,.07);border:1px solid rgba(255,208,0,.18);border-radius:8px;padding:.6rem;text-align:center">'
        +'<div style="font-family:Orbitron;font-size:.9rem;font-weight:700;color:var(--c4)">'+users2.length+'</div>'
        +'<div style="font-size:.6rem;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-top:.1rem">Clientes</div></div>';
    });
  }).catch(function(){});
}

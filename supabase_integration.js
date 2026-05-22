/* ================================================================
   SUPABASE INTEGRATION — CiberStore COMPLETO
   Carga ANTES de script.js
================================================================ */

/* ── CLIENT ─────────────────────────────────────────────────── */
var SB_URL = 'https://pnotsqsudqpwqzssevig.supabase.co';
var SB_KEY = 'sb_publishable_D1au7Op7OWZTsNIRONwg2A_ATibU1mm';

function sbq(method, table, body, qs){
  var url = SB_URL+'/rest/v1/'+table+(qs?'?'+qs:'');
  var headers = {
    'Content-Type':'application/json',
    'apikey': SB_KEY,
    'Authorization':'Bearer '+SB_KEY,
    'Prefer': method==='POST'?'return=representation':''
  };
  return fetch(url,{method:method,headers:headers,body:body?JSON.stringify(body):undefined})
    .then(function(r){ return r.status===204?[]:r.json(); });
}

var sb = {
  get:    function(t,q)   { return sbq('GET',   t, null, q); },
  post:   function(t,d)   { return sbq('POST',  t, d); },
  patch:  function(t,d,q) { return sbq('PATCH', t, d, q); },
  del:    function(t,q)   { return sbq('DELETE',t, null, q); },
  upsert: function(t,d){
    return fetch(SB_URL+'/rest/v1/'+t,{
      method:'POST',
      headers:{'Content-Type':'application/json','apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY,
               'Prefer':'resolution=merge-duplicates,return=representation'},
      body:JSON.stringify(d)
    }).then(function(r){return r.status===204?[]:r.json();});
  }
};

/* ── HASH ───────────────────────────────────────────────────── */
function hashPass(pass){
  var h=0, s='cs_'+pass+'_ff';
  for(var i=0;i<s.length;i++){
    var c=s.charCodeAt(i);
    h=((h<<5)-h)+c;
    h=h&h;
  }
  return (h>>>0).toString(36)+s.length.toString(16);
}

/* ── USERS ──────────────────────────────────────────────────── */
function sbGetUser(u){
  return sb.get('usuarios','username=eq.'+encodeURIComponent(u)+'&limit=1')
           .then(function(r){return r[0]||null;});
}
function sbCreateUser(u,ph,rc){
  return sb.post('usuarios',{username:u,pass_hash:ph,ref_code:rc,spent:0,orders:0,balance:0})
           .then(function(r){return r[0]||null;});
}
function sbUpdateUser(u,d){
  return sb.patch('usuarios',d,'username=eq.'+encodeURIComponent(u));
}

/* ── SESSION ────────────────────────────────────────────────── */
function getSession(){
  try{return JSON.parse(localStorage.getItem('cs_session')||'null');}catch(e){return null;}
}
function saveSession(s){localStorage.setItem('cs_session',s?JSON.stringify(s):'null');}

/* ── SPENT (cached locally, synced to SB) ───────────────────── */
function getSpent(){
  if(!authSession) return 0;
  return parseInt(localStorage.getItem('cs_sp_'+authSession.username)||'0');
}
function setSpentCache(u,v){ localStorage.setItem('cs_sp_'+u, v); }

/* ── REGISTER ───────────────────────────────────────────────── */
function doRegister(){
  var user  = ((document.getElementById('reg-user')||{}).value||'').trim().toLowerCase();
  var pass  = ((document.getElementById('reg-pass')||{}).value||'');
  var pass2 = ((document.getElementById('reg-pass2')||{}).value||'');
  var err   = document.getElementById('reg-err');
  var ok    = document.getElementById('reg-ok');
  if(err) err.style.display='none';
  if(ok)  ok.style.display='none';

  if(!user||user.length<3){showAuthErr('reg-err','Usuario muy corto (min 3)');return;}
  if(!/^[a-z0-9_]+$/.test(user)){showAuthErr('reg-err','Solo letras, numeros y guion bajo');return;}
  if(!pass||pass.length<6){showAuthErr('reg-err','Contrasena muy corta (min 6)');return;}
  if(pass!==pass2){showAuthErr('reg-err','Las contrasenas no coinciden');return;}

  showAuthOk('reg-ok','Verificando...');

  var chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  var rc='REF-'; for(var i=0;i<6;i++) rc+=chars[Math.floor(Math.random()*chars.length)];

  sbGetUser(user).then(function(ex){
    if(ex){showAuthErr('reg-err','Ese usuario ya existe');showAuthOk('reg-ok','');return;}
    return sbCreateUser(user, hashPass(pass), rc).then(function(created){
      if(!created){showAuthErr('reg-err','Error al crear cuenta');showAuthOk('reg-ok','');return;}
      showAuthOk('reg-ok','Cuenta creada! Entrando...');
      setTimeout(function(){loginUser(user,0);},800);
    });
  }).catch(function(e){
    /* Fallback localStorage */
    showAuthOk('reg-ok','');
    var users=sbGetLocalUsers();
    if(users[user]){showAuthErr('reg-err','Ese usuario ya existe');return;}
    users[user]={passHash:hashPass(pass),spent:0,orders:0,refCode:rc,balance:0,created:new Date().toLocaleDateString('es-MX')};
    sbSaveLocalUsers(users);
    showAuthOk('reg-ok','Cuenta creada!');
    setTimeout(function(){loginUser(user,0);},800);
  });
}

/* ── LOGIN ──────────────────────────────────────────────────── */
function doLogin(){
  var user = ((document.getElementById('login-user')||{}).value||'').trim().toLowerCase();
  var pass = ((document.getElementById('login-pass')||{}).value||'');
  var err  = document.getElementById('login-err');
  if(err){err.style.display='none'; err.style.color='#ff6b6b';}
  if(!user||!pass){showAuthErr('login-err','Ingresa usuario y contrasena');return;}

  showAuthErr('login-err','Verificando...','rgba(0,170,255,.7)');

  sbGetUser(user).then(function(u){
    if(!u){
      /* Fallback localStorage */
      var users=sbGetLocalUsers();
      if(!users[user]){showAuthErr('login-err','Usuario no encontrado');return;}
      if(users[user].passHash!==hashPass(pass)){showAuthErr('login-err','Contrasena incorrecta');return;}
      loginUser(user, users[user].spent||0);
      return;
    }
    var ok2 = u.pass_hash===hashPass(pass);
    if(!ok2){
      /* migration old hash */
      var oh=0; for(var i=0;i<pass.length;i++){var c=pass.charCodeAt(i);oh=((oh<<5)-oh)+c;oh|=0;}
      if(u.pass_hash===oh.toString(36)){sbUpdateUser(user,{pass_hash:hashPass(pass)});ok2=true;}
    }
    if(!ok2){showAuthErr('login-err','Contrasena incorrecta');return;}
    var el=document.getElementById('login-err');
    if(el) el.style.display='none';
    loginUser(user, u.spent||0);
  }).catch(function(){
    /* Full fallback */
    var users=sbGetLocalUsers();
    if(!users[user]){showAuthErr('login-err','Sin conexion y usuario no encontrado');return;}
    if(users[user].passHash!==hashPass(pass)){showAuthErr('login-err','Contrasena incorrecta');return;}
    loginUser(user, users[user].spent||0);
  });
}

function loginUser(username, spent){
  isGuest=false;
  authSession={username:username};
  saveSession({username:username});
  setSpentCache(username, spent||0);
  hideAuthModal();
  updateAuthUI();
  refreshUI();
  showToast('Bienvenido, '+username+'!', 2500);
}

function doGuest(){
  isGuest=true; authSession=null;
  hideAuthModal();
  showToast('Modo invitado - solo puedes explorar',2500);
}

function doLogout(){
  authSession=null; isGuest=false;
  saveSession(null);
  updateAuthUI();
  showAuthModal();
  showToast('Sesion cerrada');
}

/* ── AUTH UI HELPERS ────────────────────────────────────────── */
function showAuthErr(id, msg, color){
  var el=document.getElementById(id);
  if(!el) return;
  el.textContent=msg;
  el.style.color=color||'#ff6b6b';
  el.style.display='block';
}
function showAuthOk(id, msg){
  var el=document.getElementById(id);
  if(!el) return;
  if(!msg){el.style.display='none';return;}
  el.textContent=msg;
  el.style.display='block';
}

/* ── LOCAL FALLBACK STORAGE ─────────────────────────────────── */
function sbGetLocalUsers(){
  try{return JSON.parse(localStorage.getItem('cs_users')||'{}');}catch(e){return {};}
}
function sbSaveLocalUsers(u){ localStorage.setItem('cs_users',JSON.stringify(u)); }

/* For backward compat */
function getUsers(){ return sbGetLocalUsers(); }
function saveUsers(u){ sbSaveLocalUsers(u); }

/* ── SPENT / ORDERS SYNC ─────────────────────────────────────── */
function addSpend(amt){
  if(!authSession) return null;
  var before=getSpent();
  var after=before+amt;
  setSpentCache(authSession.username, after);
  /* Async sync */
  sbGetUser(authSession.username).then(function(u){
    if(u) sbUpdateUser(authSession.username,{
      spent:(u.spent||0)+amt,
      orders:(u.orders||0)+1
    });
  }).catch(function(){
    var users=sbGetLocalUsers();
    if(users[authSession.username]){
      users[authSession.username].spent=(users[authSession.username].spent||0)+amt;
      users[authSession.username].orders=(users[authSession.username].orders||0)+1;
      sbSaveLocalUsers(users);
    }
  });
  /* Level up check */
  var bi=getTIdx(before), ai=getTIdx(after);
  if(ai>bi && typeof TIERS!=='undefined' && TIERS[ai]){
    setTimeout(function(){if(typeof showLevelUp==='function')showLevelUp(TIERS[ai].name);},800);
  }
  return null;
}

function addToHistory(item){
  if(!authSession) return;
  sb.post('historial',{
    username:authSession.username,
    producto:item.name,
    precio:item.price,
    icon:item.icon||'',
    order_num:item.order||0
  }).catch(function(){});
}

/* ── PROMO CODES ─────────────────────────────────────────────── */
function getPromoCodes(){
  try{return JSON.parse(localStorage.getItem('cs_promos_cache')||'[]');}catch(e){return [];}
}
function savePromoCodes(arr){
  localStorage.setItem('cs_promos_cache',JSON.stringify(arr));
  for(var i=0;i<arr.length;i++){
    (function(c){
      sb.upsert('codigos',{
        code:c.code, disc:c.disc, max_uses:c.maxUses||100,
        uses:c.uses||0, descripcion:c.desc||'', active:c.active!==false
      }).catch(function(){});
    })(arr[i]);
  }
}
function recordPromoUse(code,orderId,discount){
  sb.get('codigos','code=eq.'+encodeURIComponent(code)+'&limit=1').then(function(r){
    if(r&&r[0]) sb.patch('codigos',{uses:(r[0].uses||0)+1},'code=eq.'+encodeURIComponent(code));
  }).catch(function(){});
  var codes=getPromoCodes();
  for(var i=0;i<codes.length;i++) if(codes[i].code===code){codes[i].uses=(codes[i].uses||0)+1;break;}
  localStorage.setItem('cs_promos_cache',JSON.stringify(codes));
}
function loadPromosFromSB(){
  return sb.get('codigos','order=created_at.desc').then(function(rows){
    if(!rows) return;
    var arr=rows.map(function(r){
      return {code:r.code,disc:r.disc,maxUses:r.max_uses,uses:r.uses,
              desc:r.descripcion||'',active:r.active,id:r.id};
    });
    localStorage.setItem('cs_promos_cache',JSON.stringify(arr));
  }).catch(function(){});
}

/* ── RESENAS ─────────────────────────────────────────────────── */
function submitResena(){
  var nombre    =((document.getElementById('r-nombre')||{}).value||'').trim();
  var servicio  =((document.getElementById('r-servicio')||{}).value||'');
  var comentario=((document.getElementById('r-comentario')||{}).value||'').trim();
  if(!selectedStars){showToast('Elige una calificacion');return;}
  if(!nombre){showToast('Ingresa tu nombre');return;}
  if(!servicio){showToast('Selecciona el servicio');return;}
  if(comentario.length<5){showToast('Escribe un comentario mas largo');return;}
  sb.post('resenas',{username:nombre,servicio:servicio,stars:selectedStars,texto:comentario})
    .then(function(){closeResenaModal();renderResenas();showToast('Gracias por tu resena!',2500);})
    .catch(function(){showToast('Error al publicar');});
}

function renderResenas(){
  var grid=document.getElementById('resenas-grid');
  var summary=document.getElementById('resenas-summary');
  if(!grid) return;
  grid.innerHTML='<div style="text-align:center;padding:2rem;color:var(--muted);font-size:.82rem;grid-column:1/-1">Cargando...</div>';
  sb.get('resenas','order=created_at.desc&limit=9').then(function(rows){
    if(!rows||!rows.length){
      grid.innerHTML='<div style="text-align:center;padding:2rem;color:var(--muted);font-size:.82rem;grid-column:1/-1;background:var(--card);border:1px solid var(--border);border-radius:11px">Aun no hay resenas. Se el primero!</div>';
      if(summary) summary.textContent='Se el primero en opinar';
      return;
    }
    var total=rows.reduce(function(s,r){return s+r.stars;},0);
    var avg=(total/rows.length).toFixed(1);
    if(summary) summary.textContent=avg+' de 5 \u2605 \u2014 '+rows.length+' resena'+(rows.length!==1?'s':'');
    var h='';
    for(var i=0;i<rows.length;i++){
      var r=rows[i];
      var stars='';
      for(var s=1;s<=5;s++) stars+='<span style="color:'+(s<=r.stars?'#ffd000':'#2a2a3a')+'">&#11088;</span>';
      var fecha=r.created_at?new Date(r.created_at).toLocaleDateString('es-MX',{day:'2-digit',month:'short',year:'numeric'}):'';
      h+='<div style="background:var(--card);border:1px solid var(--border);border-radius:11px;padding:1rem;display:flex;flex-direction:column;gap:.5rem">'
        +'<div style="display:flex;justify-content:space-between"><span style="font-size:.85rem;font-weight:700;color:#fff">'+r.username+'</span><span style="font-size:.62rem;color:var(--muted)">'+fecha+'</span></div>'
        +'<div>'+stars+'</div>'
        +'<div style="font-size:.65rem;color:var(--c1);font-weight:600">'+r.servicio+'</div>'
        +'<div style="font-size:.78rem;color:var(--muted);line-height:1.55">'+r.texto+'</div>'
        +'</div>';
    }
    grid.innerHTML=h;
  }).catch(function(){
    grid.innerHTML='<div style="text-align:center;padding:1.5rem;color:var(--muted);grid-column:1/-1">Error al cargar.</div>';
  });
}

/* ── CHAT ────────────────────────────────────────────────────── */
function renderChat(){
  var feed=document.getElementById('chat-feed');
  var av=document.getElementById('chat-av');
  if(!feed) return;
  if(av&&authSession) av.textContent=authSession.username.charAt(0).toUpperCase();
  feed.innerHTML='<div style="text-align:center;padding:1.5rem;color:var(--muted);font-size:.78rem">Cargando...</div>';
  sb.get('chat','order=created_at.desc&limit=50').then(function(rows){
    if(!rows||!rows.length){
      feed.innerHTML='<div style="text-align:center;padding:2rem;color:var(--muted);font-size:.82rem;background:var(--card);border:1px solid var(--border);border-radius:11px">Se el primero en publicar!</div>';
      return;
    }
    var h='';
    for(var i=0;i<rows.length;i++){
      var m=rows[i];
      var isMe=authSession&&m.username===authSession.username;
      var fecha=m.created_at?new Date(m.created_at).toLocaleString('es-MX',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}):'';
      h+='<div style="background:var(--card);border:1px solid var(--border);border-radius:11px;padding:.85rem">'
        +'<div style="display:flex;align-items:center;gap:.55rem;margin-bottom:.45rem">'
        +'<div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,var(--c2),var(--c1));display:flex;align-items:center;justify-content:center;font-family:Orbitron;font-size:.6rem;font-weight:700;color:#fff;flex-shrink:0">'+m.username.charAt(0).toUpperCase()+'</div>'
        +'<div style="flex:1"><span style="font-size:.78rem;font-weight:700;color:#fff">'+m.username+'</span>'+(isMe?' <span style="font-size:.58rem;color:var(--c1)">Tu</span>':'')+'</div>'
        +'<span style="font-size:.62rem;color:var(--muted)">'+fecha+'</span>'
        +'</div>'
        +'<div style="font-size:.82rem;color:var(--text);line-height:1.6;margin-bottom:.5rem">'+m.texto+'</div>'
        +'<div style="display:flex;align-items:center;gap:.5rem">'
        +'<button data-id="'+m.id+'" onclick="likeMsg(this.dataset.id)" style="background:none;border:1px solid rgba(255,255,255,.1);color:var(--muted);border-radius:5px;padding:.18rem .5rem;font-size:.68rem;cursor:pointer">\u2764 '+(m.likes||0)+'</button>'
        +((isMe||adminAuthed)?'<button data-id="'+m.id+'" onclick="deleteChatMsg(this.dataset.id)" style="background:none;border:1px solid rgba(255,80,80,.2);color:rgba(255,80,80,.6);border-radius:5px;padding:.18rem .5rem;font-size:.68rem;cursor:pointer">Eliminar</button>':'')
        +'</div></div>';
    }
    feed.innerHTML=h;
  }).catch(function(){
    feed.innerHTML='<div style="text-align:center;padding:1.5rem;color:var(--muted)">Error al cargar.</div>';
  });
}

function postChatMsg(){
  if(!authSession){showToast('Inicia sesion');setTimeout(showAuthModal,600);return;}
  var inp=document.getElementById('chat-input');
  var txt=inp?inp.value.trim():'';
  if(!txt||txt.length<2){showToast('Escribe algo primero');return;}
  if(txt.length>280){showToast('Max 280 caracteres');return;}
  sb.post('chat',{username:authSession.username,texto:txt,likes:0})
    .then(function(){if(inp)inp.value='';renderChat();showToast('Publicado!',1500);})
    .catch(function(){showToast('Error al publicar');});
}

function likeMsg(id){
  if(!authSession){showToast('Inicia sesion');return;}
  sb.get('chat_likes','msg_id=eq.'+id+'&username=eq.'+encodeURIComponent(authSession.username))
    .then(function(rows){
      if(rows&&rows.length>0){showToast('Ya le diste like');return;}
      sb.post('chat_likes',{msg_id:parseInt(id),username:authSession.username}).then(function(){
        sb.get('chat','id=eq.'+id+'&limit=1').then(function(msgs){
          if(msgs&&msgs[0]) sb.patch('chat',{likes:(msgs[0].likes||0)+1},'id=eq.'+id).then(renderChat);
        });
      });
    }).catch(function(){showToast('Error');});
}

function deleteChatMsg(id){
  sb.del('chat','id=eq.'+id).then(renderChat).catch(function(){showToast('Error al eliminar');});
}

/* ── ADMIN FUNCTIONS ─────────────────────────────────────────── */
function renderAdminUsers(){
  var list=document.getElementById('adm-users-list');
  if(!list) return;
  list.innerHTML='<div style="text-align:center;padding:1rem;color:var(--muted);font-size:.78rem">Cargando...</div>';
  var q=((document.getElementById('adm-search-user')||{}).value||'').trim().toLowerCase();
  var qs='order=created_at.desc&limit=100'+(q?'&username=ilike.*'+encodeURIComponent(q)+'*':'');
  sb.get('usuarios',qs).then(function(users){
    renderAdminStats2(users);
    if(!users||!users.length){
      list.innerHTML='<div style="text-align:center;padding:1.5rem;color:var(--muted);font-size:.78rem">Sin usuarios'+(q?' con ese nombre':'')+'</div>';
      return;
    }
    var rows='';
    for(var i=0;i<users.length;i++){
      var u=users[i];
      var tier=typeof getTier==='function'?getTier(u.spent||0):{name:'Visitante',color:'#8892a4'};
      var fecha=u.created_at?new Date(u.created_at).toLocaleDateString('es-MX'):'';
      rows+='<div style="background:#141828;border:1px solid rgba(255,255,255,.07);border-radius:8px;padding:.7rem .8rem;margin-bottom:.4rem">'
        +'<div style="display:flex;align-items:center;gap:.55rem;margin-bottom:.5rem">'
        +'<div style="width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg,var(--c2),var(--c1));display:flex;align-items:center;justify-content:center;font-family:Orbitron;font-size:.65rem;font-weight:700;color:#fff;flex-shrink:0">'+u.username.charAt(0).toUpperCase()+'</div>'
        +'<div style="flex:1;min-width:0">'
        +'<div style="font-family:Orbitron;font-size:.72rem;font-weight:700;color:#fff">'+u.username+'</div>'
        +'<div style="font-size:.62rem;color:var(--muted)">'+tier.name+' &bull; '+fecha+' &bull; Ref: '+(u.ref_code||'—')+'</div>'
        +'</div>'
        +'<div style="text-align:right;flex-shrink:0">'
        +'<div style="font-family:Orbitron;font-size:.75rem;font-weight:700;color:var(--c1)">$'+(u.spent||0).toLocaleString('es-MX')+'</div>'
        +'<div style="font-size:.6rem;color:var(--muted)">'+(u.orders||0)+' pedidos</div>'
        +'<div style="font-size:.6rem;color:#00e676">Saldo: $'+(u.balance||0)+'</div>'
        +'</div></div>'
        +'<div style="display:flex;gap:.3rem;flex-wrap:wrap">'
        +'<button data-u="'+u.username+'" onclick="admAddSaldo(this.dataset.u)" style="padding:.22rem .5rem;background:rgba(0,230,118,.1);border:1px solid rgba(0,230,118,.25);color:#00e676;border-radius:5px;font-family:\'Exo 2\';font-size:.6rem;cursor:pointer;font-weight:700">+ Saldo</button>'
        +'<button data-u="'+u.username+'" onclick="admAddGasto(this.dataset.u)" style="padding:.22rem .5rem;background:rgba(0,170,255,.08);border:1px solid rgba(0,170,255,.2);color:var(--c1);border-radius:5px;font-family:\'Exo 2\';font-size:.6rem;cursor:pointer;font-weight:700">+ Gasto</button>'
        +'<button data-u="'+u.username+'" onclick="admEditUser(this.dataset.u)" style="padding:.22rem .5rem;background:rgba(255,208,0,.08);border:1px solid rgba(255,208,0,.2);color:#ffd000;border-radius:5px;font-family:\'Exo 2\';font-size:.6rem;cursor:pointer;font-weight:700">Editar</button>'
        +'<button data-u="'+u.username+'" onclick="admResetPass(this.dataset.u)" style="padding:.22rem .5rem;background:rgba(124,58,237,.08);border:1px solid rgba(124,58,237,.2);color:#a78bfa;border-radius:5px;font-family:\'Exo 2\';font-size:.6rem;cursor:pointer;font-weight:700">Reset</button>'
        +'<button data-u="'+u.username+'" onclick="admDeleteUser(this.dataset.u)" style="padding:.22rem .5rem;background:rgba(255,80,80,.08);border:1px solid rgba(255,80,80,.2);color:#ff6b6b;border-radius:5px;font-family:\'Exo 2\';font-size:.6rem;cursor:pointer;font-weight:700">Eliminar</button>'
        +'</div></div>';
    }
    list.innerHTML=rows;
  }).catch(function(e){
    list.innerHTML='<div style="text-align:center;padding:1.5rem;color:var(--muted)">Error al cargar usuarios.</div>';
  });
}

function renderAdminStats2(users){
  if(!users){
    sb.get('usuarios','select=spent,orders,balance').then(function(u){renderAdminStats2(u);}).catch(function(){});
    return;
  }
  var ts=users.reduce(function(s,u){return s+(u.spent||0);},0);
  var to=users.reduce(function(s,u){return s+(u.orders||0);},0);
  var tu=document.getElementById('adm-total-users');
  var tsp=document.getElementById('adm-total-spent');
  var tor=document.getElementById('adm-total-orders');
  if(tu) tu.textContent=users.length;
  if(tsp) tsp.textContent='$'+ts.toLocaleString('es-MX');
  if(tor) tor.textContent=to;
}

function admAddSaldo(username){
  var amt=parseFloat(prompt('Agregar saldo a '+username+':\nMonto en MXN (negativo para restar):'));
  if(isNaN(amt)) return;
  sbGetUser(username).then(function(u){
    if(!u){showToast('Usuario no encontrado');return;}
    sbUpdateUser(username,{balance:Math.max(0,(u.balance||0)+amt)}).then(function(){
      renderAdminUsers();
      showToast((amt>0?'+':'')+amt+' MX de saldo a '+username);
    });
  });
}

function admAddGasto(username){
  var amt=parseFloat(prompt('Agregar gasto a '+username+':\nMonto en MXN:'));
  if(isNaN(amt)||amt<=0) return;
  sbGetUser(username).then(function(u){
    if(!u){showToast('Usuario no encontrado');return;}
    sbUpdateUser(username,{
      spent:(u.spent||0)+amt,
      orders:(u.orders||0)+1
    }).then(function(){ renderAdminUsers(); showToast('+$'+amt+' gasto a '+username); });
  });
}

function admEditUser(username){
  var newUser=prompt('Nuevo nombre de usuario para '+username+' (dejar vacio para no cambiar):');
  if(newUser===null) return;
  newUser=newUser.trim().toLowerCase();
  if(newUser && newUser!==username){
    if(!/^[a-z0-9_]+$/.test(newUser)||newUser.length<3){showToast('Nombre invalido');return;}
    sbUpdateUser(username,{username:newUser}).then(function(){
      renderAdminUsers();
      showToast('Usuario renombrado a '+newUser);
    }).catch(function(){showToast('Error al renombrar');});
  }
}

function admResetPass(username){
  var np=prompt('Nueva contrasena para '+username+' (min 6 chars):');
  if(!np||np.length<6){showToast('Contrasena muy corta');return;}
  sbUpdateUser(username,{pass_hash:hashPass(np)}).then(function(){showToast('Contrasena de '+username+' actualizada');});
}

function admDeleteUser(username){
  if(!confirm('Eliminar usuario '+username+'?\nEsta accion no se puede deshacer.')) return;
  sb.del('usuarios','username=eq.'+encodeURIComponent(username))
    .then(function(){renderAdminUsers();showToast('Usuario '+username+' eliminado');})
    .catch(function(){showToast('Error al eliminar');});
}

function renderAdminCodes(){
  var codes=getPromoCodes();
  var el=document.getElementById('adm-codes-list');
  var cnt=document.getElementById('adm-codes-count');
  if(!el) return;
  if(cnt) cnt.textContent=codes.length+' codigo'+(codes.length!==1?'s':'');
  if(!codes.length){el.innerHTML='<div style="text-align:center;padding:1.2rem;color:var(--muted);font-size:.8rem">Sin codigos</div>';return;}
  var rows='';
  for(var i=codes.length-1;i>=0;i--){
    var c=codes[i];
    rows+='<div class="admin-code-item">'
      +'<div class="code-active" style="background:'+(c.active?'#00e676':'#555')+'"></div>'
      +'<div class="code-badge">'+c.code+'</div>'
      +'<div class="code-disc">-'+c.disc+'%</div>'
      +'<div class="code-uses">'+(c.uses||0)+'/'+(c.maxUses||100)+'</div>'
      +(c.desc?'<div style="font-size:.62rem;color:var(--muted);flex:1">'+c.desc+'</div>':'<div style="flex:1"></div>')
      +'<button class="code-del" data-code="'+c.code+'" onclick="adminToggleCode(this.dataset.code)" style="font-size:.62rem;color:var(--muted)">'+(c.active?'OFF':'ON')+'</button>'
      +'<button class="code-del" data-code="'+c.code+'" onclick="adminDeleteCode(this.dataset.code)">&#215;</button>'
      +'</div>';
  }
  el.innerHTML=rows;
}

function renderAdminStats(){
  var log=getPromoLog?getPromoLog():[];
  var codes=getPromoCodes();
  var el=document.getElementById('adm-stats');
  if(!el) return;
  var totalUses=codes.reduce(function(s,c){return s+(c.uses||0);},0);
  var h='Total usos: <strong style="color:#fff">'+totalUses+'</strong><br/>'
    +'Activos: <strong style="color:#00e676">'+codes.filter(function(c){return c.active;}).length+'</strong><br/>'
    +'Inactivos: <strong style="color:#ff5252">'+codes.filter(function(c){return !c.active;}).length+'</strong>';
  el.innerHTML=h;
}

/* ── DASHBOARD + EXPORT ─────────────────────────────────────── */
function renderSalesDash(){
  var canvas=document.getElementById('sales-chart');
  if(!canvas) return;
  var since=new Date(Date.now()-7*86400000).toISOString();
  sb.get('historial','created_at=gte.'+since+'&order=created_at.asc').then(function(rows){
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
    var W=canvas.width=canvas.offsetWidth||300;
    var H=120; canvas.height=H;
    var ctx=canvas.getContext('2d');
    var mx=Math.max.apply(null,sales.concat([1]));
    var pad=24;
    ctx.clearRect(0,0,W,H);
    for(var k=0;k<7;k++){
      var x=pad+k*((W-pad*2)/7);
      var bw=Math.floor((W-pad*2)/7)-4;
      var bh=Math.round((sales[k]/mx)*(H-30));
      var g=ctx.createLinearGradient(0,H-bh,0,H);
      g.addColorStop(0,'#00aaff'); g.addColorStop(1,'rgba(0,170,255,.1)');
      ctx.fillStyle=g; ctx.fillRect(x,H-bh-10,bw,bh);
      ctx.fillStyle='rgba(90,101,128,.8)'; ctx.font='9px sans-serif'; ctx.textAlign='center';
      ctx.fillText(days[k],x+bw/2,H);
      if(sales[k]>0){ctx.fillStyle='#fff';ctx.font='bold 9px sans-serif';ctx.fillText('$'+sales[k],x+bw/2,H-bh-12);}
    }
    sb.get('usuarios','select=spent,orders').then(function(us){
      var extra=document.getElementById('dash-extra');
      if(!extra||!us) return;
      var ts2=us.reduce(function(s,u){return s+(u.spent||0);},0);
      var to2=us.reduce(function(s,u){return s+(u.orders||0);},0);
      var avg=to2>0?Math.round(ts2/to2):0;
      extra.innerHTML=
        '<div style="background:rgba(0,170,255,.07);border:1px solid rgba(0,170,255,.18);border-radius:8px;padding:.6rem;text-align:center">'
        +'<div style="font-family:Orbitron;font-size:.9rem;font-weight:700;color:var(--c1)">$'+avg.toLocaleString('es-MX')+'</div>'
        +'<div style="font-size:.6rem;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-top:.1rem">Ticket promedio</div></div>'
        +'<div style="background:rgba(255,208,0,.07);border:1px solid rgba(255,208,0,.18);border-radius:8px;padding:.6rem;text-align:center">'
        +'<div style="font-family:Orbitron;font-size:.9rem;font-weight:700;color:var(--c4)">'+us.length+'</div>'
        +'<div style="font-size:.6rem;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-top:.1rem">Clientes</div></div>';
    });
  }).catch(function(){});
}

function exportCSV(){
  sb.get('usuarios','order=created_at.desc').then(function(users){
    if(!users||!users.length){showToast('No hay usuarios');return;}
    var rows=[['Usuario','Registro','Pedidos','Gastado MXN','Balance MXN','Nivel','Ref Code']];
    for(var i=0;i<users.length;i++){
      var u=users[i];
      var tier=typeof getTier==='function'?getTier(u.spent||0):{name:'Visitante'};
      var fecha=u.created_at?new Date(u.created_at).toLocaleDateString('es-MX'):'';
      rows.push([u.username,fecha,u.orders||0,u.spent||0,u.balance||0,tier.name,u.ref_code||'']);
    }
    var csv=rows.map(function(r){return r.map(function(c){return '"'+String(c).replace(/"/g,'""')+'"';}).join(',');}).join('\n');
    var blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8;'});
    var url=URL.createObjectURL(blob);
    var a=document.createElement('a');
    a.href=url; a.download='ciberstore_'+new Date().toISOString().slice(0,10)+'.csv';
    a.click(); URL.revokeObjectURL(url);
    showToast('CSV descargado!',2000);
  }).catch(function(){showToast('Error al exportar');});
}

/* ── PROFILE / MISCOMPRAS from Supabase ─────────────────────── */
function getHistoryFromSB(){
  if(!authSession) return Promise.resolve([]);
  return sb.get('historial','username=eq.'+encodeURIComponent(authSession.username)+'&order=created_at.desc&limit=50');
}

/* ── INIT ────────────────────────────────────────────────────── */
(function(){
  loadPromosFromSB();
  /* Restore session */
  var saved=getSession();
  if(saved&&saved.username){
    sbGetUser(saved.username).then(function(u){
      if(u){
        authSession={username:saved.username};
        isGuest=false;
        setSpentCache(saved.username,u.spent||0);
        var el=document.getElementById('auth-modal');
        if(el) el.style.display='none';
        if(typeof updateAuthUI==='function') updateAuthUI();
        if(typeof refreshUI==='function') setTimeout(refreshUI,100);
        if(typeof renderResenas==='function') setTimeout(renderResenas,200);
      } else {
        saveSession(null);
        if(typeof showAuthModal==='function') showAuthModal();
      }
    }).catch(function(){
      /* Offline fallback */
      var users=sbGetLocalUsers();
      if(users[saved.username]){
        authSession={username:saved.username};
        isGuest=false;
        setSpentCache(saved.username,users[saved.username].spent||0);
        var el=document.getElementById('auth-modal');
        if(el) el.style.display='none';
        if(typeof updateAuthUI==='function') updateAuthUI();
        if(typeof refreshUI==='function') setTimeout(refreshUI,100);
      } else {
        if(typeof showAuthModal==='function') showAuthModal();
      }
    });
  } else {
    setTimeout(function(){
      if(typeof showAuthModal==='function') showAuthModal();
    },100);
  }
})();

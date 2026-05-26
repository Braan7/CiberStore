/* CiberStore SB v1779504760 */
/* ================================================================
   SUPABASE INTEGRATION — CiberStore SISTEMA FINAL
   - Auth: profiles table
   - Saldo: profiles.saldo + movimientos_saldo
   - Perfil: datos reales desde Supabase
   - NO localStorage para datos de usuario importantes
================================================================ */

/* ── ESTADO GLOBAL ──────────────────────────────────────────── */
var authSession  = null;  /* { id, username, nombre, whatsapp, role, saldo, ref_code, banned, created_at } */
var isGuest      = false;
var adminAuthed  = false;

/* ── HASH ───────────────────────────────────────────────────── */
function hashPass(pass){
  var h = 0, s = 'cs_' + pass + '_ff';
  for(var i = 0; i < s.length; i++){
    var c = s.charCodeAt(i);
    h = ((h << 5) - h) + c;
    h = h & h;
  }
  return (h >>> 0).toString(36) + s.length.toString(16);
}

/* ── SESSION ────────────────────────────────────────────────── */
function saveSession(data){
  if(data) localStorage.setItem('cs_sess', JSON.stringify({id: data.id, username: data.username}));
  else localStorage.removeItem('cs_sess');
}
function getSavedSession(){
  try { return JSON.parse(localStorage.getItem('cs_sess') || 'null'); }
  catch(e){ return null; }
}

/* ── PROFILES ───────────────────────────────────────────────── */
function sbGetByUsername(username){
  return sb.get('profiles', 'username=eq.' + encodeURIComponent(username) + '&limit=1')
           .then(function(r){
             if(!r || !Array.isArray(r)) return null;
             return r[0] || null;
           });
}
function sbGetById(id){
  return sb.get('profiles', 'id=eq.' + encodeURIComponent(id) + '&limit=1')
           .then(function(r){ return r[0] || null; });
}
function sbCreateProfile(data){
  return sb.post('profiles', data).then(function(r){ return r[0] || null; });
}
function sbUpdateProfile(id, data){
  return sb.patch('profiles', data, 'id=eq.' + encodeURIComponent(id));
}

/* ── REGISTER ───────────────────────────────────────────────── */
function doRegister(){
  var username  = ((document.getElementById('reg-user') || {}).value || '').trim().toLowerCase();
  var nombre    = ((document.getElementById('reg-nombre') || {}).value || '').trim();
  var lada      = ((document.getElementById('reg-lada') || {}).value || '52').trim();
  var waRaw     = ((document.getElementById('reg-whatsapp') || {}).value || '').trim().replace(/\D/g,'');
  /* Remove leading 0 if user typed it */
  if(waRaw.startsWith('0')) waRaw = waRaw.slice(1);
  /* Remove lada if user already included it */
  if(waRaw.startsWith(lada)) waRaw = waRaw.slice(lada.length);
  var whatsapp  = lada + waRaw;
  var pass      = ((document.getElementById('reg-pass') || {}).value || '');
  var pass2     = ((document.getElementById('reg-pass2') || {}).value || '');
  var err       = document.getElementById('reg-err');
  var ok        = document.getElementById('reg-ok');
  if(err) err.style.display = 'none';
  if(ok)  ok.style.display  = 'none';

  if(!username || username.length < 3)     { showAuthMsg('reg-err', 'Usuario muy corto (min 3)'); return; }
  if(!/^[a-z0-9_]+$/.test(username))       { showAuthMsg('reg-err', 'Solo letras, numeros y _'); return; }
  if(!nombre || nombre.length < 2)          { showAuthMsg('reg-err', 'Ingresa tu nombre'); return; }
  if(!waRaw || waRaw.length < 7)            { showAuthMsg('reg-err', 'Numero de WhatsApp invalido (muy corto)'); return; }
  if(waRaw.length > 11)                     { showAuthMsg('reg-err', 'Numero de WhatsApp invalido (muy largo)'); return; }
  if(!pass || pass.length < 6)              { showAuthMsg('reg-err', 'Contrasena minimo 6 caracteres'); return; }
  if(pass !== pass2)                        { showAuthMsg('reg-err', 'Las contrasenas no coinciden'); return; }

  showAuthMsg('reg-ok', 'Verificando...', true);

  var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  var rc = 'REF-';
  for(var i = 0; i < 6; i++) rc += chars[Math.floor(Math.random() * chars.length)];

  sbGetByUsername(username).then(function(existing){
    if(existing){
      showAuthMsg('reg-err', 'Ese nombre de usuario ya existe');
      if(ok) ok.style.display = 'none';
      return;
    }
    return sbCreateProfile({
      username:      username,
      nombre:        nombre,
      whatsapp:      whatsapp,
      password_hash: hashPass(pass),
      role:          'user',
      saldo:         0,
      ref_code:      rc
    }).then(function(profile){
      if(!profile || (Array.isArray(profile) && !profile.length)){
        showAuthMsg('reg-err', 'Error: Corre el SQL en Supabase primero (setup_supabase.sql)');
        if(ok) ok.style.display = 'none';
        return;
      }
      var p = Array.isArray(profile) ? profile[0] : profile;
      showAuthMsg('reg-ok', '\u2714 Cuenta creada! Entrando...', true);
      /* Notify admin via WA */
      try {
        var admMsg='*Nuevo registro - CiberStore*\n\nUsuario: '+username+'\nNombre: '+nombre+'\nWhatsApp: +'+whatsapp+'\nFecha: '+new Date().toLocaleString('es-MX');
        var admUrl='https://wa.me/5215548461200?text='+encodeURIComponent(admMsg);
        var notifKey='cs_notif_reg_'+Date.now();
        localStorage.setItem(notifKey, admUrl);
      } catch(e){}
      setTimeout(function(){ loginWithProfile(p); }, 800);
    });
  }).catch(function(e){
    var msg = e && e.message ? e.message : 'error desconocido';
    if(msg.indexOf('does not exist') > -1 || msg.indexOf('relation') > -1 || msg.indexOf('profiles') > -1){
      msg = 'Tabla no existe. Ve a Supabase > SQL Editor y corre el archivo setup_supabase.sql';
    }
    showAuthMsg('reg-err', msg);
    if(ok) ok.style.display = 'none';
  });
}

/* ── LOGIN ──────────────────────────────────────────────────── */
function doLogin(){
  var username = ((document.getElementById('login-user') || {}).value || '').trim().toLowerCase();
  var pass     = ((document.getElementById('login-pass') || {}).value || '');
  var err      = document.getElementById('login-err');
  if(err){ err.style.display = 'none'; err.style.color = '#ff6b6b'; }
  if(!username || !pass){ showAuthMsg('login-err', 'Ingresa usuario y contrasena'); return; }

  showAuthMsg('login-err', 'Verificando...', false, 'rgba(0,170,255,.7)');
  var loginTimeout = setTimeout(function(){
    showAuthMsg('login-err', 'Conexion lenta. Intenta de nuevo.');
  }, 25000);

  sbGetByUsername(username).then(function(u){
    clearTimeout(loginTimeout);
    if(!u){ showAuthMsg('login-err', 'Usuario no encontrado'); return; }
    if(u.banned){ showAuthMsg('login-err', 'Cuenta suspendida. Contacta soporte.'); return; }

    var ok = u.password_hash === hashPass(pass);
    if(!ok){
      /* migration: old hash */
      var oh = 0;
      for(var i = 0; i < pass.length; i++){
        var c = pass.charCodeAt(i);
        oh = ((oh << 5) - oh) + c;
        oh |= 0;
      }
      if(u.password_hash === oh.toString(36)){
        sbUpdateProfile(u.id, {password_hash: hashPass(pass)});
        ok = true;
      }
    }
    if(!ok){ showAuthMsg('login-err', 'Contrasena incorrecta'); return; }
    if(err) err.style.display = 'none';
    loginWithProfile(u);
  }).catch(function(e){
    clearTimeout(loginTimeout);
    var msg = e && e.message ? e.message : 'Error de conexion';
    if(msg.indexOf('Timeout') > -1 || msg.indexOf('fetch') > -1 || msg.indexOf('network') > -1){
      msg = 'Error de red. Verifica tu internet e intenta de nuevo.';
    }
    if(msg.indexOf('does not exist') > -1){
      msg = 'Error de base de datos. Contacta soporte.';
    }
    showAuthMsg('login-err', msg);
  });
}

function loginWithProfile(profile){
  isGuest      = false;
  authSession  = profile;
  saveSession(profile);
  hideAuthModal();
  updateAuthUI();
  if(typeof refreshUI === 'function') refreshUI();
  if(typeof renderPerfil === 'function') setTimeout(renderPerfil, 100);
  /* If admin role — open admin panel automatically */
  if(profile.role === 'admin'){
    adminAuthed = true;
    setTimeout(function(){
      showAuthModal();
      authTab('admin');
    }, 300);
    showToast('Bienvenido Admin ' + profile.username + '!', 2500);
  } else {
    showToast('Bienvenido, ' + profile.username + '!', 2500);
  }
}

function doGuest(){
  isGuest     = true;
  authSession = null;
  hideAuthModal();
  showToast('Modo invitado - solo puedes explorar', 2500);
}

function doLogout(){
  authSession = null;
  isGuest     = false;
  saveSession(null);
  if(typeof updateAuthUI === 'function') updateAuthUI();
  showAuthModal();
  showToast('Sesion cerrada');
}

/* ── AUTH MSG HELPER ────────────────────────────────────────── */
function showAuthMsg(id, msg, isOk, color){
  var el = document.getElementById(id);
  if(!el) return;
  el.textContent = msg;
  el.style.color = color || (isOk ? '#00e676' : '#ff6b6b');
  el.style.display = 'block';
}

/* ── REFRESH PROFILE FROM DB ────────────────────────────────── */
function refreshProfile(){
  if(!authSession) return Promise.resolve(null);
  return sbGetById(authSession.id).then(function(u){
    if(u){
      authSession = u;
      if(typeof updateAuthUI === 'function') updateAuthUI();
      if(typeof renderPerfil === 'function') renderPerfil();
    }
    return u;
  }).catch(function(){ return null; });
}

/* ── SALDO ──────────────────────────────────────────────────── */
function getSpent(){
  /* Returns saldo from live session */
  return authSession ? (authSession.saldo || 0) : 0;
}

function addSpend(amt, descripcion){
  if(!authSession) return;
  var newSaldo = Math.max(0, (authSession.saldo || 0) - amt);
  authSession.saldo = newSaldo;
  sbUpdateProfile(authSession.id, { saldo: newSaldo });
  sbAddMovimiento(authSession.id, 'compra', amt, descripcion || 'Compra en CiberStore');
  if(typeof updateAuthUI === 'function') updateAuthUI();
  if(typeof renderPerfil === 'function'){
    var pfPage = document.getElementById('page-perfil');
    if(pfPage && pfPage.classList.contains('active')) renderPerfil();
  }
}

function sbAddMovimiento(userId, tipo, monto, descripcion){
  return sb.post('movimientos_saldo', {
    user_id:     userId,
    tipo:        tipo,
    monto:       monto,
    descripcion: descripcion
  }).catch(function(){});
}

function sbGetMovimientos(userId){
  return sb.get('movimientos_saldo',
    'user_id=eq.' + encodeURIComponent(userId) +
    '&order=created_at.desc&limit=30'
  );
}

/* ── HISTORY (linked to session) ────────────────────────────── */
function addToHistory(item){
  /* addSpend already creates the movimiento - nothing to do here */
  /* This function kept for compatibility only */
}

/* ── PROMO CODES ────────────────────────────────────────────── */
function getPromoCodes(){
  try { return JSON.parse(localStorage.getItem('cs_promos_cache') || '[]'); }
  catch(e){ return []; }
}
function savePromoCodes(arr){
  localStorage.setItem('cs_promos_cache', JSON.stringify(arr));
  arr.forEach(function(c){
    sb.upsert('codigos', {
      code: c.code, disc: c.disc, max_uses: c.maxUses || 100,
      uses: c.uses || 0, descripcion: c.desc || '', active: c.active !== false
    }).catch(function(){});
  });
}
function recordPromoUse(code){
  sb.get('codigos', 'code=eq.' + encodeURIComponent(code) + '&limit=1')
    .then(function(r){
      if(r && r[0]) sb.patch('codigos', {uses: (r[0].uses || 0) + 1}, 'code=eq.' + encodeURIComponent(code));
    }).catch(function(){});
  var codes = getPromoCodes();
  for(var i = 0; i < codes.length; i++) if(codes[i].code === code){ codes[i].uses = (codes[i].uses || 0) + 1; break; }
  localStorage.setItem('cs_promos_cache', JSON.stringify(codes));
}
function loadPromos(){
  return sb.get('codigos', 'order=created_at.desc').then(function(rows){
    if(!rows) return;
    localStorage.setItem('cs_promos_cache', JSON.stringify(rows.map(function(r){
      return { code: r.code, disc: r.disc, maxUses: r.max_uses, uses: r.uses,
               desc: r.descripcion || '', active: r.active, id: r.id };
    })));
  }).catch(function(){});
}

/* ── RESENAS ────────────────────────────────────────────────── */
var selectedStars = 0;
function setStars(n){
  selectedStars = n;
  document.querySelectorAll('.star-btn').forEach(function(b, i){
    b.style.opacity = i < n ? '1' : '0.28';
  });
}
function openResenaModal(){
  selectedStars = 0;
  setStars(0);
  ['r-nombre','r-comentario'].forEach(function(id){
    var el = document.getElementById(id);
    if(el) el.value = '';
  });
  var rs = document.getElementById('r-servicio');
  if(rs) rs.selectedIndex = 0;
  var rm = document.getElementById('r-msg');
  if(rm) rm.style.display = 'none';
  if(authSession){
    var rn = document.getElementById('r-nombre');
    if(rn) rn.value = authSession.username;
  }
  var el = document.getElementById('modal-resena');
  if(el) el.classList.add('show');
}
function closeResenaModal(){
  var el = document.getElementById('modal-resena');
  if(el) el.classList.remove('show');
}
function submitResena(){
  var nombre     = ((document.getElementById('r-nombre') || {}).value || '').trim();
  var servicio   = ((document.getElementById('r-servicio') || {}).value || '');
  var comentario = ((document.getElementById('r-comentario') || {}).value || '').trim();
  if(!selectedStars){ showToast('Elige una calificacion'); return; }
  if(!nombre)        { showToast('Ingresa tu nombre'); return; }
  if(!servicio)      { showToast('Selecciona el servicio'); return; }
  if(comentario.length < 5){ showToast('Escribe un comentario mas largo'); return; }
  sb.post('resenas', { username: nombre, servicio: servicio, stars: selectedStars, texto: comentario })
    .then(function(){ closeResenaModal(); renderResenas(); showToast('Gracias por tu resena!', 2500); })
    .catch(function(){ showToast('Error al publicar. Intenta de nuevo.'); });
}
function renderResenas(){
  var grid    = document.getElementById('resenas-grid');
  var summary = document.getElementById('resenas-summary');
  if(!grid) return;
  grid.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--muted);font-size:.82rem;grid-column:1/-1">Cargando...</div>';
  sb.get('resenas', 'order=created_at.desc&limit=9').then(function(rows){
    if(!rows || !rows.length){
      grid.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--muted);font-size:.82rem;grid-column:1/-1;background:var(--card);border:1px solid var(--border);border-radius:11px">Aun no hay resenas. Se el primero!</div>';
      if(summary) summary.textContent = 'Se el primero en opinar';
      return;
    }
    var avg = (rows.reduce(function(s, r){ return s + r.stars; }, 0) / rows.length).toFixed(1);
    if(summary) summary.textContent = avg + ' de 5 \u2605 \u2014 ' + rows.length + ' resena' + (rows.length !== 1 ? 's' : '');
    var h = '';
    rows.forEach(function(r){
      var stars = '';
      for(var s = 1; s <= 5; s++) stars += '<span style="color:' + (s <= r.stars ? '#ffd000' : '#2a2a3a') + '">&#11088;</span>';
      var fecha = r.created_at ? new Date(r.created_at).toLocaleDateString('es-MX', {day:'2-digit', month:'short', year:'numeric'}) : '';
      h += '<div style="background:var(--card);border:1px solid var(--border);border-radius:11px;padding:1rem;display:flex;flex-direction:column;gap:.5rem">'
        + '<div style="display:flex;justify-content:space-between"><span style="font-size:.85rem;font-weight:700;color:#fff">' + r.username + '</span><span style="font-size:.62rem;color:var(--muted)">' + fecha + '</span></div>'
        + '<div>' + stars + '</div>'
        + '<div style="font-size:.65rem;color:var(--c1);font-weight:600">' + r.servicio + '</div>'
        + '<div style="font-size:.78rem;color:var(--muted);line-height:1.55">' + r.texto + '</div>'
        + '</div>';
    });
    grid.innerHTML = h;
  }).catch(function(){ grid.innerHTML = '<div style="text-align:center;padding:1.5rem;color:var(--muted);grid-column:1/-1">Error al cargar.</div>'; });
}

/* ── CHAT ───────────────────────────────────────────────────── */
function renderChat(){
  var feed = document.getElementById('chat-feed');
  var av   = document.getElementById('chat-av');
  if(!feed) return;
  if(av && authSession) av.textContent = authSession.username.charAt(0).toUpperCase();
  feed.innerHTML = '<div style="text-align:center;padding:1.5rem;color:var(--muted);font-size:.78rem">Cargando...</div>';
  sb.get('chat', 'order=created_at.desc&limit=50').then(function(rows){
    if(!rows || !rows.length){
      feed.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--muted);font-size:.82rem;background:var(--card);border:1px solid var(--border);border-radius:11px">Se el primero en publicar!</div>';
      return;
    }
    var h = '';
    rows.forEach(function(m){
      var isMe = authSession && m.username === authSession.username;
      var fecha = m.created_at ? new Date(m.created_at).toLocaleString('es-MX', {day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit'}) : '';
      h += '<div style="background:var(--card);border:1px solid var(--border);border-radius:11px;padding:.85rem">'
        + '<div style="display:flex;align-items:center;gap:.55rem;margin-bottom:.45rem">'
        + '<div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,var(--c2),var(--c1));display:flex;align-items:center;justify-content:center;font-family:Orbitron;font-size:.6rem;font-weight:700;color:#fff;flex-shrink:0">' + m.username.charAt(0).toUpperCase() + '</div>'
        + '<div style="flex:1"><span style="font-size:.78rem;font-weight:700;color:#fff">' + m.username + '</span>' + (isMe ? ' <span style="font-size:.58rem;color:var(--c1)">Tu</span>' : '') + '</div>'
        + '<span style="font-size:.62rem;color:var(--muted)">' + fecha + '</span>'
        + '</div>'
        + '<div style="font-size:.82rem;color:var(--text);line-height:1.6;margin-bottom:.5rem">' + m.texto + '</div>'
        + '<div style="display:flex;align-items:center;gap:.5rem">'
        + '<button data-id="' + m.id + '" onclick="likeMsg(this.dataset.id)" style="background:none;border:1px solid rgba(255,255,255,.1);color:var(--muted);border-radius:5px;padding:.18rem .5rem;font-size:.68rem;cursor:pointer">\u2764 ' + (m.likes || 0) + '</button>'
        + ((isMe || adminAuthed) ? '<button data-id="' + m.id + '" onclick="deleteChatMsg(this.dataset.id)" style="background:none;border:1px solid rgba(255,80,80,.2);color:rgba(255,80,80,.6);border-radius:5px;padding:.18rem .5rem;font-size:.68rem;cursor:pointer">Eliminar</button>' : '')
        + '</div></div>';
    });
    feed.innerHTML = h;
  }).catch(function(){ feed.innerHTML = '<div style="text-align:center;padding:1.5rem;color:var(--muted)">Error al cargar.</div>'; });
}
function postChatMsg(){
  if(!authSession){ showToast('Inicia sesion para participar'); setTimeout(showAuthModal, 600); return; }
  var inp = document.getElementById('chat-input');
  var txt = inp ? inp.value.trim() : '';
  if(!txt || txt.length < 2){ showToast('Escribe algo primero'); return; }
  if(txt.length > 280){ showToast('Max 280 caracteres'); return; }
  sb.post('chat', { username: authSession.username, texto: txt, likes: 0 })
    .then(function(){ if(inp) inp.value = ''; renderChat(); showToast('Publicado!', 1500); })
    .catch(function(){ showToast('Error al publicar'); });
}
function likeMsg(id){
  if(!authSession){ showToast('Inicia sesion'); return; }
  sb.get('chat_likes', 'msg_id=eq.' + id + '&username=eq.' + encodeURIComponent(authSession.username))
    .then(function(rows){
      if(rows && rows.length > 0){ showToast('Ya le diste like'); return; }
      sb.post('chat_likes', { msg_id: parseInt(id), username: authSession.username }).then(function(){
        sb.get('chat', 'id=eq.' + id + '&limit=1').then(function(msgs){
          if(msgs && msgs[0]) sb.patch('chat', { likes: (msgs[0].likes || 0) + 1 }, 'id=eq.' + id).then(renderChat);
        });
      });
    }).catch(function(){ showToast('Error'); });
}
function deleteChatMsg(id){
  sb.del('chat', 'id=eq.' + id).then(renderChat).catch(function(){ showToast('Error al eliminar'); });
}

/* ── ADMIN ──────────────────────────────────────────────────── */
function renderAdminUsers(){
  var list  = document.getElementById('adm-users-list');
  if(!list) return;
  list.innerHTML = '<div style="text-align:center;padding:1rem;color:var(--muted);font-size:.78rem">Cargando...</div>';
  var q   = ((document.getElementById('adm-search-user') || {}).value || '').trim().toLowerCase();
  var qs  = 'order=created_at.desc&limit=100' + (q ? '&username=ilike.*' + encodeURIComponent(q) + '*' : '');
  sb.get('profiles', qs).then(function(users){
    if(!users || !Array.isArray(users)){
      list.innerHTML = '<div style="text-align:center;padding:1.5rem;color:var(--muted)">Error al cargar. Verifica las tablas en Supabase.</div>';
      return;
    }
    renderAdminStats2(users);
    if(!users.length){
      list.innerHTML = '<div style="text-align:center;padding:1.5rem;color:var(--muted);font-size:.78rem">Sin usuarios' + (q ? ' con ese nombre' : '') + '</div>';
      return;
    }
    var rows = '';
    users.forEach(function(u){
      var fecha = u.created_at ? new Date(u.created_at).toLocaleDateString('es-MX') : '';
      var roleColor = u.role === 'admin' ? '#a78bfa' : u.banned ? '#ff6b6b' : '#00e676';
      rows += '<div style="background:#141828;border:1px solid rgba(255,255,255,.07);border-radius:8px;padding:.7rem .8rem;margin-bottom:.4rem">'
        + '<div style="display:flex;align-items:center;gap:.55rem;margin-bottom:.5rem">'
        + '<div style="width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg,var(--c2),var(--c1));display:flex;align-items:center;justify-content:center;font-family:Orbitron;font-size:.65rem;font-weight:700;color:#fff;flex-shrink:0">' + u.username.charAt(0).toUpperCase() + '</div>'
        + '<div style="flex:1;min-width:0">'
        + '<div style="font-family:Orbitron;font-size:.72rem;font-weight:700;color:#fff">' + u.username + '</div>'
        + '<div style="font-size:.62rem;color:var(--muted)">' + (u.nombre || '') + ' &bull; ' + (u.whatsapp ? '+' + u.whatsapp : '') + ' &bull; ' + fecha + '</div>'
        + '</div>'
        + '<div style="text-align:right;flex-shrink:0">'
        + '<div style="font-size:.65rem;font-weight:700;color:' + roleColor + '">' + (u.banned ? 'BANEADO' : u.role.toUpperCase()) + '</div>'
        + '<div style="font-family:Orbitron;font-size:.75rem;font-weight:700;color:#00e676">$' + (u.saldo || 0).toLocaleString('es-MX') + ' MX</div>'
        + '</div></div>'
        + '<div style="display:flex;gap:.3rem;flex-wrap:wrap">'
        + '<button data-u="' + u.id + '" data-name="' + u.username + '" onclick="admAddSaldo(this.dataset.u, this.dataset.name)" style="padding:.22rem .5rem;background:rgba(0,230,118,.1);border:1px solid rgba(0,230,118,.25);color:#00e676;border-radius:5px;font-family:\'Exo 2\';font-size:.6rem;cursor:pointer;font-weight:700">+ Saldo</button>'
        + '<button data-u="' + u.id + '" data-name="' + u.username + '" onclick="admQuitarSaldo(this.dataset.u, this.dataset.name)" style="padding:.22rem .5rem;background:rgba(255,80,80,.08);border:1px solid rgba(255,80,80,.2);color:#ff6b6b;border-radius:5px;font-family:\'Exo 2\';font-size:.6rem;cursor:pointer;font-weight:700">- Saldo</button>'
        + '<button data-u="' + u.id + '" data-name="' + u.username + '" onclick="admVerHistorial(this.dataset.u, this.dataset.name)" style="padding:.22rem .5rem;background:rgba(0,170,255,.08);border:1px solid rgba(0,170,255,.2);color:var(--c1);border-radius:5px;font-family:\'Exo 2\';font-size:.6rem;cursor:pointer;font-weight:700">Historial</button>'
        + '<button data-u="' + u.id + '" data-name="' + u.username + '" data-role="' + u.role + '" onclick="admCambiarRol(this.dataset.u, this.dataset.name, this.dataset.role)" style="padding:.22rem .5rem;background:rgba(124,58,237,.08);border:1px solid rgba(124,58,237,.2);color:#a78bfa;border-radius:5px;font-family:\'Exo 2\';font-size:.6rem;cursor:pointer;font-weight:700">Rol</button>'
        + '<button data-u="' + u.id + '" data-name="' + u.username + '" data-banned="' + u.banned + '" onclick="admBanear(this.dataset.u, this.dataset.name, this.dataset.banned)" style="padding:.22rem .5rem;background:rgba(255,165,0,.08);border:1px solid rgba(255,165,0,.2);color:#ffa500;border-radius:5px;font-family:\'Exo 2\';font-size:.6rem;cursor:pointer;font-weight:700">' + (u.banned ? 'Desbanear' : 'Banear') + '</button>'
        + '<button data-u="' + u.id + '" data-name="' + u.username + '" onclick="admResetPass(this.dataset.u, this.dataset.name)" style="padding:.22rem .5rem;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);color:var(--muted);border-radius:5px;font-family:\'Exo 2\';font-size:.6rem;cursor:pointer;font-weight:700">Reset</button>'
        + '</div></div>';
    });
    list.innerHTML = rows;
  }).catch(function(e){
    var msg = e && e.message ? e.message : 'Error de conexion';
    /* Common causes */
    if(msg.indexOf('does not exist') > -1 || msg.indexOf('relation') > -1){
      msg = 'Tabla "profiles" no existe. Corre el SQL en Supabase primero.';
    }
    list.innerHTML = '<div style="text-align:center;padding:1.5rem;color:#ff6b6b;font-size:.78rem">' + msg + '</div>';
  });
}

function renderAdminStats2(users){
  if(!users || !Array.isArray(users)){
    sb.get('profiles', 'select=saldo,role').then(function(u){
      if(u && Array.isArray(u)) renderAdminStats2(u);
    }).catch(function(){});
    return;
  }
  var totalSaldo = users.reduce(function(s, u){ return s + (u.saldo || 0); }, 0);
  var tu  = document.getElementById('adm-total-users');
  var ts  = document.getElementById('adm-total-spent');
  var tor = document.getElementById('adm-total-orders');
  if(tu)  tu.textContent  = users.length;
  if(ts)  ts.textContent  = '$' + totalSaldo.toLocaleString('es-MX');
  if(tor) tor.textContent = users.filter(function(u){ return u.role === 'admin'; }).length + ' admins';
}

function admAddSaldo(uid, uname){
  var amt = parseFloat(prompt('Agregar saldo a ' + uname + ':\nMonto en MXN:'));
  if(isNaN(amt) || amt <= 0) return;
  sbGetById(uid).then(function(u){
    if(!u){ showToast('Usuario no encontrado'); return; }
    var newSaldo = (u.saldo || 0) + amt;
    return sbUpdateProfile(uid, { saldo: newSaldo }).then(function(){
      return sbAddMovimiento(uid, 'credito', amt, 'Saldo agregado por admin');
    }).then(function(){
      renderAdminUsers();
      showToast('+$' + amt + ' MX a ' + uname);
      if(authSession && authSession.id === uid){
        authSession.saldo = newSaldo;
        if(typeof updateAuthUI === 'function') updateAuthUI();
      }
    });
  });
}

function admQuitarSaldo(uid, uname){
  var amt = parseFloat(prompt('Quitar saldo a ' + uname + ':\nMonto en MXN:'));
  if(isNaN(amt) || amt <= 0) return;
  sbGetById(uid).then(function(u){
    if(!u){ showToast('Usuario no encontrado'); return; }
    var newSaldo = Math.max(0, (u.saldo || 0) - amt);
    return sbUpdateProfile(uid, { saldo: newSaldo }).then(function(){
      return sbAddMovimiento(uid, 'debito', amt, 'Saldo quitado por admin');
    }).then(function(){
      renderAdminUsers();
      showToast('-$' + amt + ' MX a ' + uname);
    });
  });
}

function admVerHistorial(uid, uname){
  sbGetMovimientos(uid).then(function(movs){
    if(!movs || !movs.length){ alert('Sin movimientos para ' + uname); return; }
    var txt = 'Historial de ' + uname + ':\n\n';
    movs.forEach(function(m){
      var fecha = m.created_at ? new Date(m.created_at).toLocaleDateString('es-MX') : '';
      var signo = (m.tipo === 'credito' || m.tipo === 'ajuste') ? '+' : '-';
      txt += signo + '$' + m.monto + ' MX | ' + m.tipo + ' | ' + m.descripcion + ' | ' + fecha + '\n';
    });
    alert(txt);
  });
}

function admCambiarRol(uid, uname, currentRole){
  var newRole = currentRole === 'admin' ? 'user' : 'admin';
  if(!confirm('Cambiar rol de ' + uname + ' a ' + newRole.toUpperCase() + '?')) return;
  sbUpdateProfile(uid, { role: newRole }).then(function(){
    renderAdminUsers();
    showToast('Rol de ' + uname + ' cambiado a ' + newRole);
  });
}

function admBanear(uid, uname, banned){
  var isBanned = banned === 'true' || banned === true;
  var action = isBanned ? 'desbanear' : 'banear';
  if(!confirm(action.charAt(0).toUpperCase() + action.slice(1) + ' a ' + uname + '?')) return;
  sbUpdateProfile(uid, { banned: !isBanned }).then(function(){
    renderAdminUsers();
    showToast(uname + ' ' + (isBanned ? 'desbaneado' : 'baneado'));
  });
}

function admResetPass(uid, uname){
  var np = prompt('Nueva contrasena para ' + uname + ' (min 6 chars):');
  if(!np || np.length < 6){ showToast('Contrasena muy corta'); return; }
  sbUpdateProfile(uid, { password_hash: hashPass(np) }).then(function(){
    showToast('Contrasena de ' + uname + ' actualizada');
  });
}

function renderAdminCodes(){
  var codes = getPromoCodes();
  var el    = document.getElementById('adm-codes-list');
  var cnt   = document.getElementById('adm-codes-count');
  if(!el) return;
  if(cnt) cnt.textContent = codes.length + ' codigo' + (codes.length !== 1 ? 's' : '');
  if(!codes.length){
    el.innerHTML = '<div style="text-align:center;padding:1.2rem;color:var(--muted);font-size:.8rem">Sin codigos</div>';
    return;
  }
  var rows = '';
  for(var i = codes.length - 1; i >= 0; i--){
    var c = codes[i];
    rows += '<div class="admin-code-item">'
      + '<div class="code-active" style="background:' + (c.active ? '#00e676' : '#555') + '"></div>'
      + '<div class="code-badge">' + c.code + '</div>'
      + '<div class="code-disc">-' + c.disc + '%</div>'
      + '<div class="code-uses">' + (c.uses || 0) + '/' + (c.maxUses || 100) + '</div>'
      + '<div style="flex:1;font-size:.62rem;color:var(--muted)">' + (c.desc || '') + '</div>'
      + '<button class="code-del" data-c="' + c.code + '" onclick="adminToggleCode(this.dataset.c)">' + (c.active ? 'OFF' : 'ON') + '</button>'
      + '<button class="code-del" data-c="' + c.code + '" onclick="adminDeleteCode(this.dataset.c)">&#215;</button>'
      + '</div>';
  }
  el.innerHTML = rows;
}

function renderAdminStats(){
  var codes   = getPromoCodes();
  var el      = document.getElementById('adm-stats');
  if(!el) return;
  var totalUses = codes.reduce(function(s, c){ return s + (c.uses || 0); }, 0);
  el.innerHTML = 'Total usos: <strong style="color:#fff">' + totalUses + '</strong><br/>'
    + 'Activos: <strong style="color:#00e676">' + codes.filter(function(c){ return c.active; }).length + '</strong><br/>'
    + 'Inactivos: <strong style="color:#ff5252">' + codes.filter(function(c){ return !c.active; }).length + '</strong>';
}

/* ── ADMIN CHAT ─────────────────────────────────────────────── */
function admLoadChat(){
  var list = document.getElementById('adm-chat-list');
  if(!list) return;
  list.innerHTML = '<div style="text-align:center;padding:1rem;color:var(--muted)">Cargando...</div>';
  sb.get('chat', 'order=created_at.desc&limit=30').then(function(rows){
    if(!rows || !rows.length){ list.innerHTML = '<div style="text-align:center;padding:1rem;color:var(--muted)">Sin mensajes</div>'; return; }
    var h = '';
    rows.forEach(function(m){
      var fecha = m.created_at ? new Date(m.created_at).toLocaleString('es-MX', {day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}) : '';
      h += '<div style="background:#141828;border:1px solid rgba(255,255,255,.07);border-radius:7px;padding:.55rem .7rem;display:flex;align-items:center;gap:.5rem;margin-bottom:.35rem">'
        + '<div style="flex:1;min-width:0">'
        + '<span style="font-size:.72rem;font-weight:700;color:var(--c1)">' + m.username + '</span>'
        + ' <span style="font-size:.62rem;color:var(--muted)">' + fecha + '</span>'
        + '<div style="font-size:.75rem;color:var(--text);margin-top:.2rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + m.texto + '</div>'
        + '</div>'
        + '<button data-id="' + m.id + '" onclick="admDeleteChatMsg(this.dataset.id)" style="background:none;border:1px solid rgba(255,80,80,.2);color:#ff6b6b;border-radius:5px;padding:.18rem .45rem;font-size:.62rem;cursor:pointer;flex-shrink:0">&#215;</button>'
        + '</div>';
    });
    list.innerHTML = h;
  }).catch(function(){ list.innerHTML = '<div style="text-align:center;padding:1rem;color:var(--muted)">Error</div>'; });
}
function admDeleteChatMsg(id){
  if(!confirm('Eliminar este mensaje?')) return;
  sb.del('chat', 'id=eq.' + id).then(function(){ admLoadChat(); showToast('Eliminado'); });
}

/* ── DASHBOARD ──────────────────────────────────────────────── */
function renderSalesDash(){
  var canvas = document.getElementById('sales-chart');
  if(!canvas) return;
  var since = new Date(Date.now() - 7 * 86400000).toISOString();
  sb.get('movimientos_saldo', 'tipo=eq.compra&created_at=gte.' + since + '&order=created_at.asc')
    .then(function(rows){
      var days = [], sales = [];
      for(var d = 6; d >= 0; d--){
        var date  = new Date(Date.now() - d * 86400000);
        var label = date.toLocaleDateString('es-MX', {day: '2-digit', month: 'short'});
        days.push(label);
        var total = 0;
        if(rows) rows.forEach(function(r){
          var rd = new Date(r.created_at).toLocaleDateString('es-MX', {day: '2-digit', month: 'short'});
          if(rd === label) total += r.monto || 0;
        });
        sales.push(total);
      }
      var W = canvas.width = canvas.offsetWidth || 300;
      var H = 120; canvas.height = H;
      var ctx = canvas.getContext('2d');
      var mx  = Math.max.apply(null, sales.concat([1]));
      var pad = 24;
      ctx.clearRect(0, 0, W, H);
      for(var k = 0; k < 7; k++){
        var x  = pad + k * ((W - pad * 2) / 7);
        var bw = Math.floor((W - pad * 2) / 7) - 4;
        var bh = Math.round((sales[k] / mx) * (H - 30));
        var g  = ctx.createLinearGradient(0, H - bh, 0, H);
        g.addColorStop(0, '#00aaff'); g.addColorStop(1, 'rgba(0,170,255,.1)');
        ctx.fillStyle = g; ctx.fillRect(x, H - bh - 10, bw, bh);
        ctx.fillStyle = 'rgba(90,101,128,.8)'; ctx.font = '9px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(days[k], x + bw / 2, H);
        if(sales[k] > 0){ ctx.fillStyle = '#fff'; ctx.font = 'bold 9px sans-serif'; ctx.fillText('$' + sales[k], x + bw / 2, H - bh - 12); }
      }
      var extra = document.getElementById('dash-extra');
      if(extra){
        sb.get('profiles', 'select=saldo,role').then(function(us){
          if(!us || !Array.isArray(us)) return;
          var totalSaldo = us.reduce(function(s, u){ return s + (u.saldo || 0); }, 0);
          var avg = us.length > 0 ? Math.round(totalSaldo / us.length) : 0;
          extra.innerHTML =
            '<div style="background:rgba(0,170,255,.07);border:1px solid rgba(0,170,255,.18);border-radius:8px;padding:.6rem;text-align:center">'
            + '<div style="font-family:Orbitron;font-size:.9rem;font-weight:700;color:var(--c1)">$' + avg.toLocaleString('es-MX') + '</div>'
            + '<div style="font-size:.6rem;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-top:.1rem">Saldo promedio</div></div>'
            + '<div style="background:rgba(255,208,0,.07);border:1px solid rgba(255,208,0,.18);border-radius:8px;padding:.6rem;text-align:center">'
            + '<div style="font-family:Orbitron;font-size:.9rem;font-weight:700;color:var(--c4)">' + us.length + '</div>'
            + '<div style="font-size:.6rem;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-top:.1rem">Clientes</div></div>';
        });
      }
    }).catch(function(){});
}

function exportCSV(){
  sb.get('profiles', 'order=created_at.desc').then(function(users){
    if(!users || !Array.isArray(users) || !users.length){ showToast('No hay usuarios'); return; }
    var rows = [['Usuario', 'Nombre', 'WhatsApp', 'Rol', 'Saldo MXN', 'Baneado', 'Ref Code', 'Registro']];
    users.forEach(function(u){
      var fecha = u.created_at ? new Date(u.created_at).toLocaleDateString('es-MX') : '';
      rows.push([u.username, u.nombre || '', u.whatsapp || '', u.role, u.saldo || 0, u.banned ? 'SI' : 'NO', u.ref_code || '', fecha]);
    });
    var csv = rows.map(function(r){ return r.map(function(c){ return '"' + String(c).replace(/"/g, '""') + '"'; }).join(','); }).join('\n');
    var blob = new Blob(['\uFEFF' + csv], {type: 'text/csv;charset=utf-8;'});
    var url  = URL.createObjectURL(blob);
    var a    = document.createElement('a');
    a.href   = url; a.download = 'ciberstore_' + new Date().toISOString().slice(0, 10) + '.csv';
    a.click(); URL.revokeObjectURL(url);
    showToast('CSV descargado!', 2000);
  }).catch(function(){ showToast('Error al exportar'); });
}

/* ── INIT ───────────────────────────────────────────────────── */
(function initSB(){
  loadPromos();

  /* Sync order counter in background - non-blocking */
  setTimeout(function(){
    sb.get('movimientos_saldo','tipo=eq.compra&select=id').then(function(rows){
      if(rows && Array.isArray(rows) && rows.length > 0){
        var current = parseInt(localStorage.getItem('cs_ord_seq')||'0');
        if(rows.length > current) localStorage.setItem('cs_ord_seq', rows.length);
      }
    }).catch(function(){});
  }, 2000);

  var saved = getSavedSession();

  if(saved && saved.id){
    /* Show page immediately with local session */
    authSession = { id: saved.id, username: saved.username || 'Usuario',
                    saldo: 0, role: 'user', nombre: '', whatsapp: '', ref_code: '' };
    isGuest = false;
    var elModal = document.getElementById('auth-modal');
    if(elModal) elModal.style.display = 'none';
    setTimeout(function(){
      if(typeof updateAuthUI === 'function') updateAuthUI();
      if(typeof refreshUI   === 'function') refreshUI();
    }, 50);
    /* Verify session from DB in background */
    setTimeout(function(){
      sbGetById(saved.id).then(function(u){
        if(!u || u.banned){
          authSession = null;
          saveSession(null);
          if(typeof showAuthModal === 'function') showAuthModal();
          return;
        }
        authSession = u;
        if(typeof updateAuthUI === 'function') updateAuthUI();
        if(typeof renderPerfil === 'function') renderPerfil();
      }).catch(function(){});
    }, 800);
  } else {
    /* No session — show login modal */
    var showModal = function(){
      var el = document.getElementById('auth-modal');
      if(el){
        el.style.display = 'flex';
        el.style.alignItems = 'center';
        el.style.justifyContent = 'center';
        /* Show login tab */
        var login = document.getElementById('auth-login');
        var reg   = document.getElementById('auth-register');
        var adm   = document.getElementById('auth-admin');
        if(login) login.style.display = 'block';
        if(reg)   reg.style.display   = 'none';
        if(adm)   adm.style.display   = 'none';
        /* Active tab */
        var tl = document.getElementById('atab-login');
        var tr = document.getElementById('atab-register');
        if(tl){ tl.style.color='#00aaff'; tl.style.borderBottom='2px solid #00aaff'; }
        if(tr){ tr.style.color='#5a6580'; tr.style.borderBottom='2px solid transparent'; }
      } else {
        /* DOM not ready yet, retry */
        setTimeout(showModal, 100);
      }
    };
    setTimeout(showModal, 150);
  }
})();

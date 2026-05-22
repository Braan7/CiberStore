
var WA='5215548461200';
var TIERS=[
  {id:'free',    name:'Visitante',color:'#8892a4',colorBg:'rgba(136,146,164,.1)',threshold:0,     perks:['Precios estandar','Acceso a la tienda','Soporte por chat']},
  {id:'silver',  name:'Plata',   color:'#b0bec5',colorBg:'rgba(176,190,197,.1)',threshold:500,   perks:['Descuento en paquetes grandes','Soporte prioritario','Ofertas flash'],badge:{text:'STARTER',bg:'#b0bec5',color:'#111'}},
  {id:'gold',    name:'Oro',     color:'#ffd000',colorBg:'rgba(255,208,0,.1)',  threshold:2000,  perks:['Mayor descuento','Entrega prioritaria','Pases especiales'],badge:{text:'POPULAR',bg:'#ffd000',color:'#111'}},
  {id:'diamond', name:'Diamante',color:'#00aaff',colorBg:'rgba(0,170,255,.1)', threshold:6000,  perks:['Maximo descuento en paquetes','Soporte VIP 24/7','Acceso anticipado'],badge:{text:'TOP',bg:'#00aaff',color:'#020a0a'}},
  {id:'legend',  name:'Leyenda', color:'#00f5ff',colorBg:'rgba(0,245,255,.1)', threshold:15000, perks:['Precio minimo garantizado','Gestor personal','Precios bulk'],badge:{text:'ELITE',bg:'linear-gradient(90deg,#005fa3,#00aaff)',color:'#fff'}}
];
var PRODUCTS=[
  {id:1, name:'110',    total:110,   bonus:10,  region:'LATAM & BR', prices:[17,17,17,17,17],       badge:null,        isPase:false, popular:false},
  {id:2, name:'341',    total:341,   bonus:31,  region:'LATAM & BR', prices:[60,60,60,60,60],        badge:'POPULAR',   isPase:false, popular:true},
  {id:3, name:'572',    total:572,   bonus:52,  region:'LATAM & BR', prices:[85,85,85,85,85],        badge:null,        isPase:false, popular:false},
  {id:4, name:'1,166',  total:1166,  bonus:106, region:'LATAM & BR', prices:[175,173,170,168,166],   badge:'OFERTA',    isPase:false, popular:false},
  {id:5, name:'2,398',  total:2398,  bonus:218, region:'LATAM & BR', prices:[310,306,302,298,294],   badge:null,        isPase:false, popular:false},
  {id:6, name:'6,160',  total:6160,  bonus:560, region:'LATAM & BR', prices:[770,760,750,740,730],   badge:'GRAN VALOR',isPase:false, popular:false},
  {id:7, name:'12,320', total:12320, bonus:1120,region:'LATAM & BR', prices:[1540,1520,1500,1480,1460],badge:null,      isPase:false, popular:false},
  {id:8, name:'18,480', total:18480, bonus:1680,region:'LATAM & BR', prices:[2310,2280,2250,2220,2190],badge:'MEGA',    isPase:false, popular:false},
  {id:11,name:'Pase Elite',total:0,  bonus:0,   region:'LATAM & BR', prices:[45,45,45,45,45],        badge:null,        isPase:true,  popular:false}
];
var LIKES=[
  {id:1, label:'Inicio',          emoji:'\uD83E\uDD49', priceMX:79,  priceUSD:4.1,  total:1400,  perDay:220, days:7,   color:'#cc7700', popular:false, best:false},
  {id:2, label:'Bronce',          emoji:'\uD83E\uDD48', priceMX:99,  priceUSD:5.1,  total:2200,  perDay:220, days:10,  color:'#a05530', popular:false, best:false},
  {id:3, label:'Plata',           emoji:'\uD83E\uDD47', priceMX:129, priceUSD:6.6,  total:3300,  perDay:220, days:15,  color:'#8899aa', popular:true,  best:false},
  {id:4, label:'Oro',             emoji:'\uD83D\uDC8E', priceMX:159, priceUSD:8.1,  total:4400,  perDay:220, days:20,  color:'#ffd000', popular:false, best:false},
  {id:5, label:'Diamante',        emoji:'\u26A1',         priceMX:189, priceUSD:9.7,  total:5500,  perDay:220, days:25,  color:'#00aaff', popular:false, best:false},
  {id:6, label:'Mensual Completo',emoji:'\uD83D\uDC51',  priceMX:219, priceUSD:11.2, total:6600,  perDay:220, days:30,  color:'#7c3aed', popular:false, best:true},
  {id:7, label:'Ultra',           emoji:'\uD83D\uDE80',  priceMX:279, priceUSD:14.2, total:8800,  perDay:220, days:40,  color:'#00f5ff', popular:false, best:false},
  {id:8, label:'Supreme',         emoji:'\uD83D\uDD25',  priceMX:349, priceUSD:17.8, total:11000, perDay:220, days:50,  color:'#ff4422', popular:false, best:false},
  {id:9, label:'MEGA PACK VIP',   emoji:'\uD83C\uDF1F',  priceMX:899, priceUSD:45.8, total:30000, perDay:220, days:136, color:'#f0b90b', popular:false, best:false, isVip:true, origMX:1299}
];
var HONOR=[
  {id:0,region:'Norteamerica',  price:340,color:'#ffd000'},
  {id:1,region:'Estados Unidos',price:160,color:'#4dabf7'},
  {id:2,region:'Sudamerica',    price:340,color:'#40c057'},
  {id:3,region:'Europa',        price:340,color:'#b39ddb'}
];

/* STATE */
function gst(){try{return JSON.parse(localStorage.getItem('cs5')||'{}');}catch(e){return {};}}
function sst(s){localStorage.setItem('cs5',JSON.stringify(s));}
function getSpent(){return gst().spent||0;}
function getTIdx(spent){var i=0,x=0;for(x=0;x<TIERS.length;x++){if(spent>=TIERS[x].threshold)i=x;}return i;}
function getTier(spent){return TIERS[getTIdx(spent)];}
function fmt(n){return '$'+n.toLocaleString('es-MX')+' MX';}
function getNextOrder(){var n=parseInt(localStorage.getItem('cs_ord')||'0')+1;localStorage.setItem('cs_ord',n);return n;}
function peekOrder(){return parseInt(localStorage.getItem('cs_ord')||'0')+1;}
function getHistory(){try{return JSON.parse(localStorage.getItem('cs_hist')||'[]');}catch(e){return [];}}
function saveHistory(h){localStorage.setItem('cs_hist',JSON.stringify(h.slice(-50)));}
function getUsername(){return localStorage.getItem('cs_user')||'';}

/* SIDEBAR */
function toggleSB(){document.getElementById('sidebar').classList.toggle('open');document.getElementById('overlay').classList.toggle('open');}
function closeSB(){document.getElementById('sidebar').classList.remove('open');document.getElementById('overlay').classList.remove('open');}

/* PAGE NAV */
function goPage(id){
  var pages=document.querySelectorAll('.page');
  for(var i=0;i<pages.length;i++) pages[i].classList.remove('active');
  var navs=document.querySelectorAll('.nav-item');
  for(var i=0;i<navs.length;i++) navs[i].classList.remove('active');
  var pg=document.getElementById('page-'+id);
  if(pg) pg.classList.add('active');
  var ni=document.getElementById('ni-'+id);
  if(ni) ni.classList.add('active');
  closeSB();
  window.scrollTo({top:0,behavior:'smooth'});
  if(id==='diamantes') renderProds();
  if(id==='likes') renderLikes();
  if(id==='perfil') renderPerfil();
  if(id==='membresia'){renderMems();renderWallet();}
}

/* CONSTRUCION */
/* PRODUCTS */
function renderProds(){
  var spent=getSpent(),tIdx=getTIdx(spent);
  var g=document.getElementById('prod-grid');
  if(!g) return;
  var rows='';
  for(var i=0;i<PRODUCTS.length;i++){
    var p=PRODUCTS[i];
    var base=p.prices[0],now=p.prices[tIdx],saved=base-now;
    var hasDisc=tIdx>0&&saved>0;
    var badgeHtml='';
    if(p.popular) badgeHtml='<div class="ff-badge ff-badge-hot">MAS VENDIDO</div>';
    else if(p.badge) badgeHtml='<div class="ff-badge">'+p.badge+'</div>';
    var bonusHtml=p.bonus>0?'<div class="ff-bonus">+'+p.bonus+' BONUS</div>':'';
    var origHtml=hasDisc?'<span class="ff-price-orig">'+fmt(base)+'</span>':'';
    rows+='<div class="ff-card" onclick="openProdModal('+p.id+')"'+(p.popular?' style="border-color:rgba(240,165,0,.3)"':'')+'>'  
      +badgeHtml
      +'<div class="ff-top">'
      +'<span class="ff-ico">\uD83D\uDC8E</span>'
      +'<span class="ff-num">'+p.name+'</span>'
      +'</div>'
      +bonusHtml
      +'<span class="ff-price">'+fmt(now)+'</span>'
      +origHtml
      +'<div class="ff-qty-row" onclick="event.stopPropagation()">'
      +'<div class="ff-qty">'
      +'<button class="ff-qty-btn" onclick="ffQty('+p.id+',-1)">-</button>'
      +'<span class="ff-qty-n" id="ffq-'+p.id+'">0</span>'
      +'<button class="ff-qty-btn" onclick="ffQty('+p.id+',1)">+</button>'
      +'</div>'
      +'<button class="ff-cart-btn" onclick="ffAddCart('+p.id+')">+Carrito</button>'
      +'</div>'
      +'</div>';
  }
  g.innerHTML=rows;
}



function renderLikes(){
  var g=document.getElementById('likes-grid');
  if(!g) return;
  var rows='';
  for(var i=0;i<LIKES.length;i++){
    var p=LIKES[i];
    var price=p.priceMX;
    var isVip=p.isVip||false;
    var cls='lk-card'+(p.popular?' lk-popular':'')+(p.best?' lk-best':'')+(isVip?' lk-vip':'');
    var card='<div class="'+cls+'" onclick="openLikeModal('+p.id+')" style="--lk-clr:'+p.color+';border-color:'+p.color+'22">';
    if(p.popular) card+='<div class="lk-ribbon">POPULAR</div>';
    if(p.best)    card+='<div class="lk-ribbon" style="background:linear-gradient(90deg,#00a87a,#00f5d4);color:#002a22">MEJOR VALOR</div>';
    if(isVip)     card+='<div class="lk-ribbon" style="background:linear-gradient(90deg,#c97b00,#f0b90b);color:#1a0a00">VIP</div>';
    card+='<div class="lk-top">';
    card+='<div class="lk-ico">'+p.emoji+'</div>';
    card+='<div style="flex:1"><div class="lk-label">'+p.label+'</div>';
    card+='<div class="lk-total">'+p.total.toLocaleString()+'<span> likes</span></div></div></div>';
    card+='<div class="lk-price-row">';
    if(isVip && p.origMX){
      card+='<div>';
      card+='<div style="text-decoration:line-through;font-size:.78rem;color:var(--muted);font-family:Orbitron">'+fmt(p.origMX)+'</div>';
      card+='<div class="lk-price">'+fmt(price)+'<span> MX</span></div>';
      card+='</div>';
    } else {
      card+='<div class="lk-price">'+fmt(price)+'<span> MX</span></div>';
    }
    card+='</div>';
    card+='<div class="lk-stats">';
    card+='<div class="lk-stat"><span class="lk-stat-n">'+p.perDay+'</span><span class="lk-stat-l">likes/dia</span></div>';
    card+='<div class="lk-stat-div"></div>';
    card+='<div class="lk-stat"><span class="lk-stat-n">'+p.days+'</span><span class="lk-stat-l">dias</span></div>';
    card+='<div class="lk-stat-div"></div>';
    card+='<div class="lk-stat"><span class="lk-stat-n">'+p.total.toLocaleString()+'</span><span class="lk-stat-l">total</span></div>';
    card+='</div>';
    if(isVip){
      card+='<div style="display:flex;flex-direction:column;gap:.2rem;margin:.45rem 0;padding:.55rem;background:rgba(240,185,11,.07);border-radius:7px;border:1px solid rgba(240,185,11,.2)">';
      card+='<div style="font-size:.68rem;color:#f0b90b;font-weight:700">\uD83C\uDF81 Incluye:</div>';
      card+='<div style="font-size:.65rem;color:var(--muted)">\u2B50 Prioridad de entrega</div>';
      card+='<div style="font-size:.65rem;color:var(--muted)">\uD83C\uDD95 Atencion preferente</div>';
      card+='<div style="font-size:.65rem;color:var(--muted)">\uD83C\uDF81 Bonus sorpresa</div>';
      card+='</div>';
    }
    card+='<button class="lk-btn" onclick="event.stopPropagation();openLikeModal('+p.id+')">';
    card+=(LANG==='en'?'Get plan':'Obtener plan')+'</button>';
    card+='</div>';
    rows+=card;
  }
  g.innerHTML=rows;
}

function renderMems(){
  var spent=getSpent(),cIdx=getTIdx(spent);
  var g=document.getElementById('mem-grid'),html='';
  for(var i=0;i<TIERS.length;i++){
    var t=TIERS[i],isA=(i===cIdx),reached=(spent>=t.threshold);
    var bHtml=t.badge?'<div class="mc-badge" style="background:'+t.badge.bg+';color:'+t.badge.color+'">'+t.badge.text+'</div>':'';
    var sv=i>0?(PRODUCTS[5].prices[0]-PRODUCTS[5].prices[i]):0;
    var perksHtml='';
    for(var j=0;j<t.perks.length;j++) perksHtml+='<li style="color:'+(reached?'var(--text)':'var(--muted)')+'"><span style="color:'+t.color+'">&bull;</span> '+t.perks[j]+'</li>';
    html+='<div class="mem-card" style="'+(isA?'border-color:'+t.color+';box-shadow:0 0 28px '+t.color+'18':'')+'">'
      +bHtml+'<span class="mc-icon" style="color:'+t.color+'">\u2B50</span>'
      +'<div class="mc-name" style="color:'+t.color+'">'+t.name+'</div>'
      +'<div class="mc-disc" style="color:'+t.color+'">'+(i===0?'Precios estandar':'Hasta $'+sv+' MX menos')+'</div>'
      +'<div class="mc-disc-sub">nivel de descuento</div>'
      +'<div class="mc-req">'+(t.threshold===0?'Sin requisito':'Gasta '+fmt(t.threshold)+' en total')+'</div>'
      +'<ul class="mc-perks">'+perksHtml+'</ul>'
      +'<button class="btn-mem" style="border-color:'+t.color+';color:'+t.color+';background:'+(isA?t.colorBg:'transparent')+'">'+(isA?'NIVEL ACTUAL':reached?'DESBLOQUEADO':'Bloqueado')+'</button>'
      +'</div>';
  }
  g.innerHTML=html;
}

/* WALLET */
function renderWallet(){
  var spent=getSpent(),cIdx=getTIdx(spent),cur=TIERS[cIdx];
  var next=cIdx+1<TIERS.length?TIERS[cIdx+1]:null;
  var pct=next?Math.min(100,(spent-cur.threshold)/(next.threshold-cur.threshold)*100):100;
  var pills='';
  for(var i=0;i<TIERS.length;i++){var t=TIERS[i],r=(spent>=t.threshold);pills+='<div class="tier-pill" style="border-color:'+t.color+(r?';background:'+t.colorBg+';color:'+t.color:';color:var(--muted)')+'">'+(r?'* ':'')+t.name+'</div>';}
  var html='<div class="w-row">'
    +'<div><div style="font-size:.7rem;color:var(--muted);letter-spacing:1px;text-transform:uppercase;margin-bottom:.2rem">Total gastado</div>'
    +'<div class="w-amt">'+fmt(spent)+'</div>'
    +'<div style="margin-top:.4rem;display:inline-flex;align-items:center;gap:.35rem;padding:.2rem .68rem;border-radius:20px;background:'+cur.colorBg+';border:1px solid '+cur.color+'40;font-size:.7rem;font-weight:700;color:'+cur.color+'">'+cur.name.toUpperCase()+'</div>'
    +'</div>'
    +'<div style="text-align:right"><div style="font-size:.65rem;color:var(--muted);letter-spacing:1px;text-transform:uppercase;margin-bottom:.22rem">Nivel</div><div class="w-lvl" style="color:'+cur.color+'">'+cur.name+'</div></div>'
    +'</div>'
    +(next?'<div style="display:flex;align-items:center;gap:.6rem;margin-bottom:.32rem"><span style="font-size:.67rem;color:var(--muted);white-space:nowrap">'+cur.name+'</span><div class="prog-track" style="flex:1"><div class="prog-fill" style="width:'+pct+'%"></div></div><span style="font-size:.67rem;color:var(--muted);white-space:nowrap">'+next.name+'</span></div><div style="text-align:center;font-size:.77rem;color:var(--muted);margin-bottom:.82rem">Faltan <strong style="color:'+next.color+'">'+fmt(next.threshold-spent)+'</strong> para <strong style="color:'+next.color+'">'+next.name+'</strong></div>'
    :'<div style="text-align:center;font-size:.77rem;color:var(--c5);margin-bottom:.82rem;font-family:Orbitron">LEYENDA MAXIMA ALCANZADA</div>')
    +'<div class="tier-pills">'+pills+'</div>';
  document.getElementById('wallet-box').innerHTML=html;
}

/* PERFIL */
function renderPerfil(){
  var spent=getSpent(),tier=getTier(spent),cIdx=getTIdx(spent);
  var next=cIdx+1<TIERS.length?TIERS[cIdx+1]:null;
  var pct=next?Math.min(100,(spent-tier.threshold)/(next.threshold-tier.threshold)*100):100;
  var hist=getHistory(),user=getUsername()||'Sin nombre',initial=user[0].toUpperCase();
  var av=document.getElementById('pf-avatar');if(av){av.textContent=initial;av.style.background='linear-gradient(135deg,'+tier.color+'80,'+tier.color+')';}
  var un=document.getElementById('pf-username');if(un) un.textContent=user;
  var nd=document.getElementById('pf-name-display');if(nd) nd.textContent=user;
  var ni=document.getElementById('pf-name-input');if(ni&&getUsername()) ni.value=getUsername();
  var tb=document.getElementById('pf-tier-badge');if(tb){tb.textContent=tier.name;tb.style.borderColor=tier.color+'60';tb.style.color=tier.color;tb.style.background=tier.colorBg;}
  var st=document.getElementById('pf-spent-total');if(st) st.textContent=fmt(spent)+' gastado en total';
  var so=document.getElementById('pf-stat-orders');if(so) so.textContent=hist.length;
  var ss=document.getElementById('pf-stat-spent');if(ss) ss.textContent='$'+spent.toLocaleString('es-MX');
  var sl=document.getElementById('pf-stat-level');if(sl) sl.textContent=cIdx+1;
  var hl=document.getElementById('hist-list');if(!hl) return;
  if(hist.length===0){hl.innerHTML='<div class="hist-empty">Aun no tienes compras registradas</div>';return;}
  var rev=hist.slice().reverse(),rows='';
  for(var i=0;i<rev.length;i++){
    var it=rev[i];
    rows+='<div class="hist-item">'
      +'<div class="hist-ico">'+it.icon+'</div>'
      +'<div class="hist-info"><div class="hist-name">'+it.name+'</div><div class="hist-date">'+it.date+'</div></div>'
      +'<div style="text-align:right"><div class="hist-price">'+fmt(it.price)+'</div><div class="hist-order">#'+it.order+'</div></div>'
      +'</div>';
  }
  hl.innerHTML=rows;
}

function saveUsername(){
  var val=document.getElementById('pf-name-input').value.trim();
  if(!val){showToast('Escribe un nombre de usuario');return;}
  if(val.length<2){showToast('Minimo 2 caracteres');return;}
  localStorage.setItem('cs_user',val);
  renderPerfil();updateSidebarUser();
  showToast('Nombre guardado: '+val,2500);
}

function clearHistory(){
  if(!confirm('Borrar todo el historial?')) return;
  localStorage.removeItem('cs_hist');
  renderPerfil();
  showToast('Historial borrado',2000);
}

/* SIDEBAR USER */
function updateSidebarUser(){
  var spent=getSpent(),tier=getTier(spent),cIdx=getTIdx(spent);
  var next=cIdx+1<TIERS.length?TIERS[cIdx+1]:null;
  var pct=next?Math.min(100,(spent-tier.threshold)/(next.threshold-tier.threshold)*100):100;
  var av=document.getElementById('sb-avatar');if(av){av.textContent=(getUsername()||tier.name)[0].toUpperCase();av.style.background='linear-gradient(135deg,'+tier.color+'80,'+tier.color+')';}
  var lvl=document.getElementById('sb-user-lvl');if(lvl){lvl.textContent=getUsername()||tier.name;lvl.style.color=tier.color;}
  var sp=document.getElementById('sb-user-spent');if(sp) sp.textContent=fmt(spent)+' gastado';
  var fill=document.getElementById('sb-mini-fill');if(fill){fill.style.width=pct+'%';fill.style.background='linear-gradient(90deg,'+tier.color+'80,'+tier.color+')';}
  var pill=document.getElementById('mem-pill');if(tier.id==='free'){pill.style.display='none';}else{pill.style.display='flex';pill.style.borderColor=tier.color+'55';pill.style.color=tier.color;pill.textContent=tier.name;}
}

/* MODAL */
var curMode=null,curId=null;
function setModal(title,ico,name,priceStr,origPrice,sub,discText,idLabel,lbl2Text,btnFn){
  document.getElementById('m-title').textContent=title;
  document.getElementById('m-ico').innerHTML=ico;
  document.getElementById('m-name').textContent=name;
  var origEl=document.getElementById('m-orig');
  if(origPrice){origEl.textContent=fmt(origPrice);origEl.style.display='block';}else{origEl.style.display='none';}
  document.getElementById('m-price').textContent=priceStr;
  document.getElementById('m-sub').textContent=sub;
  var discEl=document.getElementById('m-disc');
  if(discText){discEl.style.display='block';discEl.style.background='rgba(0,170,255,.07)';discEl.style.borderColor='rgba(0,170,255,.3)';discEl.style.color='var(--c1)';discEl.textContent=discText;}else{discEl.style.display='none';}
  document.getElementById('m-order').textContent='PEDIDO #'+peekOrder();
  document.getElementById('lbl1').textContent=idLabel;
  document.getElementById('lbl2').textContent=lbl2Text;
  document.getElementById('f1').value='';document.getElementById('f2').value='';document.getElementById('f3').value='';if(document.getElementById('f4'))document.getElementById('f4').value='';
  document.getElementById('f2').placeholder=lbl2Text==='Nombre del Clan'?'Nombre exacto del clan':'Repite tu ID';
  document.getElementById('btn-submit').onclick=btnFn;
  var _msh=document.getElementById('modal');if(_msh)_msh.classList.add('show');
}
function openProdModal(id){
  var p=null;for(var i=0;i<PRODUCTS.length;i++){if(PRODUCTS[i].id===id){p=PRODUCTS[i];break;}}if(!p) return;
  curMode='prod';curId=id;
  var spent=getSpent(),tIdx=getTIdx(spent),tier=TIERS[tIdx];
  var base=p.prices[0],now=p.prices[tIdx],saved=base-now;
  var disc=tIdx>0&&saved>0?tier.name+' - Ahorras $'+saved+' MX':null;
  setModal('Completar pedido',p.isPase?'\u26D3':'\uD83D\uDC8E',p.name,fmt(now),tIdx>0&&saved>0?base:null,'Recarga las veces que quieras',disc,'Tu ID de Free Fire','Confirmar ID',submitProd);
}
function openLikeModal(planId){
  var plan=null;for(var i=0;i<LIKES.length;i++){if(LIKES[i].id===planId){plan=LIKES[i];break;}}if(!plan) return;
  curMode='likes';curId=planId;
  setModal('Likes para perfil','\uD83D\uDC4D',plan.label+' - '+plan.total.toLocaleString()+' likes','$'+plan.priceMX+' MX / $'+plan.priceUSD+' USD',null,plan.perDay+'/dia - '+plan.days+' dias','220 likes diarios - entrega automatica - sin contrasena','Tu ID de Free Fire','Confirmar ID',submitLikes);
}
function openHonorModal(idx){
  var h=HONOR[idx];curMode='honor';curId=idx;
  setModal('Honor de Clan','\uD83C\uDFC6','Honor - '+h.region,fmt(h.price),null,'Entrega en menos de 24 horas - '+h.region,'Necesitamos el ID y nombre de tu clan.','ID del Clan','Nombre del Clan',submitHonor);
}
function clanWA(){window.open('https://wa.me/'+WA+'?text='+encodeURIComponent('*COTIZACION CLAN NIVEL 7 - CiberStore*\n\nHola, quiero informacion sobre clanes nivel 7.'),'_blank');}
function closeModal(){
  var m=document.getElementById('modal');
  if(m) m.classList.remove('show');
}

function addToHistory(item){var h=getHistory();h.push(item);saveHistory(h);}

function addSpend(amount){
  var s=gst(),prev=getTIdx(s.spent||0);
  s.spent=(s.spent||0)+amount;sst(s);
  var nw=getTIdx(s.spent);
  updateSidebarUser();
  return nw>prev?'Subiste a nivel '+TIERS[nw].name+'!':null;
}

function sendWA(msg,levelUp){
  closeModal();updateSidebarUser();
  if(levelUp) showToast(levelUp,5000); else showToast('Abriendo WhatsApp...',2500);
  setTimeout(function(){window.open('https://wa.me/'+WA+'?text='+encodeURIComponent(msg),'_blank');},700);
}

function getDateStr(){return new Date().toLocaleDateString('es-MX',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});}

function validateForm(){
  var v1     = document.getElementById('f1') ? document.getElementById('f1').value.trim() : '';
  var v2     = document.getElementById('f2') ? document.getElementById('f2').value.trim() : '';
  var nombre = document.getElementById('f3') ? document.getElementById('f3').value.trim() : '';
  var wa     = document.getElementById('f4') ? document.getElementById('f4').value.trim() : '';
  if(!v1)           { showToast('Ingresa tu ID de Free Fire'); return null; }
  if(!v2)           { showToast('Confirma tu ID de Free Fire'); return null; }
  if(!nombre)       { showToast('Ingresa tu nombre'); return null; }
  if(!wa||wa.replace(/\D/g,'').length < 8) { showToast('Ingresa tu numero de WhatsApp'); return null; }
  return { v1:v1, v2:v2, nombre:nombre, wa:wa };
}

function submitProd(){
  var v=validateForm();if(!v) return;
  var p=null;for(var i=0;i<PRODUCTS.length;i++){if(PRODUCTS[i].id===curId){p=PRODUCTS[i];break;}}
  if(!p) return;
  var spent=getSpent(),tIdx=getTIdx(spent),tier=TIERS[tIdx];
  var now=p.prices[tIdx],base=p.prices[0],saved=base-now;
  var ord=getNextOrder(),lu=addSpend(now);
  addToHistory({name:p.name,price:now,icon:p.isPase?'\u26D3':'\uD83D\uDC8E',date:new Date().toLocaleDateString('es-MX',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}),order:ord});
  var msg='*NUEVO PEDIDO #'+ord+' - CiberStore*\n\nProducto: '+p.name+'\nPrecio: '+fmt(now)+(saved>0?'\nAhorro: $'+saved+' MX':'')+'\nMetodo de pago: Transferencia Bancaria\n\nNombre: '+v.nombre+'\nID Free Fire: '+v.v1+'\nWhatsApp: '+v.wa+'\n\nManda tu comprobante con el numero #'+ord;
  sendWA(msg,lu);
}

function submitLikes(){
  var v=validateForm();if(!v) return;
  var plan=null;for(var i=0;i<LIKES.length;i++){if(LIKES[i].id===curId){plan=LIKES[i];break;}}
  if(!plan) return;
  var ord=getNextOrder(),lu=addSpend(plan.priceMX);
  addToHistory({name:'Likes '+plan.label,price:plan.priceMX,icon:'\uD83D\uDC4D',date:new Date().toLocaleDateString('es-MX',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}),order:ord});
  var msg='*NUEVO PEDIDO #'+ord+' - CiberStore*\n\nServicio: Likes para Perfil\nPlan: '+plan.label+'\nPrecio: $'+plan.priceMX+' MX / $'+plan.priceUSD+' USD\nLikes totales: '+plan.total.toLocaleString()+'\nPor dia: '+plan.perDay+'\nDuracion: '+plan.days+' dias\nMetodo de pago: Transferencia Bancaria\n\nNombre: '+v.nombre+'\nID Free Fire: '+v.v1+'\nWhatsApp: '+v.wa+'\n\nManda tu comprobante con el numero #'+ord;
  sendWA(msg,lu);
}

function submitHonor(){
  var clanId=document.getElementById('f1').value.trim();
  var clanName=document.getElementById('f2').value.trim();
  var nombre=document.getElementById('f3')?document.getElementById('f3').value.trim():'';
  var wa=document.getElementById('f4')?document.getElementById('f4').value.trim():'';
  if(!clanId){showToast('Ingresa el ID del Clan');return;}
  if(!clanName){showToast('Ingresa el nombre del Clan');return;}
  if(!nombre){showToast('Ingresa tu nombre');return;}
  if(!wa||wa.length<8){showToast('Ingresa tu numero de WhatsApp');return;}
  var h=HONOR[curId];
  var ord=getNextOrder(),lu=addSpend(h.price);
  addToHistory({name:'Honor - '+h.region,price:h.price,icon:'\uD83C\uDFC6',date:new Date().toLocaleDateString('es-MX',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}),order:ord});
  var msg='*NUEVO PEDIDO #'+ord+' - CiberStore*\n\nServicio: Honor de Clan\nRegion: '+h.region+'\nPrecio: '+fmt(h.price)+'\nMetodo de pago: Transferencia Bancaria\n\nNombre: '+nombre+'\nID del Clan: '+clanId+'\nNombre del Clan: '+clanName+'\nWhatsApp: '+wa+'\n\nManda tu comprobante con el numero #'+ord;
  sendWA(msg,lu);
}

function copyClabe(){navigator.clipboard.writeText('646180402332964686').then(function(){showToast('Numero copiado!',2000);});}

/* RIPPLE */
document.addEventListener('click',function(e){
  var btn=e.target.closest('.btn-buy,.btn-like,.btn-honor,.btn-clan,.btn-main,.btn-submit,.btn-hero,.btn-mem,.btn-wa');
  if(!btn) return;
  var r=document.createElement('span');r.className='ripple';
  var rect=btn.getBoundingClientRect(),size=Math.max(rect.width,rect.height);
  r.style.width=r.style.height=size+'px';
  r.style.left=(e.clientX-rect.left-size/2)+'px';
  r.style.top=(e.clientY-rect.top-size/2)+'px';
  btn.appendChild(r);setTimeout(function(){r.remove();},550);
});

/* SOCIAL PROOF */
var SP=['alguien compro 341 Diamantes','alguien compro Pase Elite','alguien compro Honor Norteamerica','alguien compro 6,160 Diamantes','alguien activo Likes 30 Dias','alguien compro 1,166 Diamantes'];
function showSP(){
  var el=document.getElementById('social-proof'),txt=document.getElementById('sp-text');
  var ago=Math.floor(Math.random()*55)+5;
  txt.innerHTML='<strong style="color:#00e676">'+SP[Math.floor(Math.random()*SP.length)]+'</strong><br><span style="color:var(--muted);font-size:.68rem">hace '+ago+' min</span>';
  el.classList.add('show');
  setTimeout(function(){el.classList.remove('show');},4000);
}
setInterval(showSP,12000);setTimeout(showSP,3500);

/* TYPING */
function runTyping(){
  var el=document.getElementById('hero-l2');if(!el) return;
  var text='STORE',cursor=document.createElement('span');
  cursor.className='typing-cursor';el.textContent='';el.appendChild(cursor);
  var i=0,timer=setInterval(function(){
    if(i<text.length){el.insertBefore(document.createTextNode(text[i]),cursor);i++;}
    else{clearInterval(timer);setTimeout(function(){cursor.remove();},1500);}
  },120);
}

/* PARTICLES */
(function(){
  var cv=document.getElementById('canvas'),ctx=cv.getContext('2d'),W,H,pts=[];
  var COLS=['rgba(0,120,220,','rgba(0,170,255,','rgba(0,80,160,'];
  function resize(){W=cv.width=window.innerWidth;H=cv.height=window.innerHeight;}
  resize();window.addEventListener('resize',resize);
  for(var i=0;i<70;i++) pts.push({x:Math.random()*9999,y:Math.random()*9999,vx:(Math.random()-.5)*.22,vy:(Math.random()-.5)*.22,r:Math.random()*1.2+.3,col:COLS[Math.floor(Math.random()*3)],a:Math.random()*.32+.08});
  function draw(){
    ctx.clearRect(0,0,W,H);
    for(var i=0;i<pts.length;i++){var p=pts[i];p.x+=p.vx;p.y+=p.vy;if(p.x<0)p.x=W;if(p.x>W)p.x=0;if(p.y<0)p.y=H;if(p.y>H)p.y=0;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fillStyle=p.col+p.a+')';ctx.fill();}
    for(var i=0;i<pts.length;i++) for(var j=i+1;j<pts.length;j++){var dx=pts[i].x-pts[j].x,dy=pts[i].y-pts[j].y,d=Math.sqrt(dx*dx+dy*dy);if(d<85){ctx.beginPath();ctx.strokeStyle='rgba(0,150,255,'+(0.03*(1-d/85))+')';ctx.lineWidth=.4;ctx.moveTo(pts[i].x,pts[i].y);ctx.lineTo(pts[j].x,pts[j].y);ctx.stroke();}}
    requestAnimationFrame(draw);
  }
  draw();
})();

function showToast(msg,dur){var t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');setTimeout(function(){t.classList.remove('show');},dur||3000);}
window.addEventListener('scroll',function(){document.getElementById('scrolltop').classList.toggle('vis',scrollY>300);});

/* INIT */
renderProds();
updateSidebarUser();
setTimeout(runTyping,600);

/* ====== CARRITO ====== */





/* Add to cart button in prod cards */



/* ====== PINES FF ====== */



















var _mp=document.getElementById('modal-pines');if(_mp)_mp.addEventListener('click',function(e){if(e.target===this)closePinesModal();});



/* Render pines when page opened */


function openStoriModal(){
  var el=document.getElementById('modal-stori');
  if(el) el.classList.add('show');
}
function closeStoriModal(){
  var el=document.getElementById('modal-stori');
  if(el) el.classList.remove('show');
}
function renderMisCompras(){
  var hist=getHistory(),spent=getSpent(),tier=getTier(spent);
  var o=document.getElementById('mc2-orders');
  var s=document.getElementById('mc2-spent');
  var t=document.getElementById('mc2-tier');
  if(o) o.textContent=hist.length;
  if(s) s.textContent='$'+spent.toLocaleString('es-MX');
  if(t){t.textContent=tier.name;t.style.color=tier.color;}
  var hl=document.getElementById('mc2-list');
  if(!hl) return;
  if(!hist.length){
    hl.innerHTML='<div style="text-align:center;padding:2.5rem 1rem;color:var(--muted);font-size:.85rem">Aun no tienes compras registradas</div>';
    return;
  }
  var rev=hist.slice().reverse(),rows='';
  for(var i=0;i<rev.length;i++){
    var it=rev[i];
    rows+='<div style="display:flex;align-items:center;gap:.85rem;padding:.75rem .5rem;border-bottom:1px solid var(--border);border-radius:8px">'
      +'<div style="width:42px;height:42px;border-radius:11px;background:rgba(0,170,255,.1);border:1px solid rgba(0,170,255,.2);display:flex;align-items:center;justify-content:center;font-size:1.2rem;flex-shrink:0">'+it.icon+'</div>'
      +'<div style="flex:1;min-width:0"><div style="font-size:.84rem;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+it.name+'</div><div style="font-size:.68rem;color:var(--muted);margin-top:.1rem">'+it.date+'</div></div>'
      +'<div style="text-align:right;flex-shrink:0"><div style="font-family:Orbitron;font-size:.84rem;font-weight:700;color:var(--c1)">'+fmt(it.price)+'</div><div style="font-size:.62rem;color:var(--muted);margin-top:.1rem">Pedido #'+it.order+'</div></div>'
      +'</div>';
  }
  hl.innerHTML=rows;
}
function clearHistMC(){
  if(!confirm('Borrar todo el historial?')) return;
  localStorage.removeItem('cs_hist');
  renderMisCompras();
  if(typeof renderPerfil==='function') renderPerfil();
  showToast('Historial borrado',2000);
}

var _ms_el = document.getElementById('modal-stori');
if(_ms_el) _ms_el.addEventListener('click',function(e){if(e.target===this)closeStoriModal();});

/* Patch goPage to render miscompras */
var _gp_mc = goPage;
goPage = function(id){
  _gp_mc(id);
  if(id==='miscompras') renderMisCompras();
  if(id==='saldo'){}
};

/* ================================================================
   PROMO CODES SYSTEM
================================================================ */
var ADMIN_EMAIL = 'ciberstore@admin.com';
var ADMIN_PASS  = 'ciberstore26';
var adminLoggedIn = false;
var activePromo = null;

function getPromoCodes(){
  try{ return JSON.parse(localStorage.getItem('cs_promos')||'[]'); }catch(e){ return []; }
}
function savePromoCodes(arr){ localStorage.setItem('cs_promos',JSON.stringify(arr)); }
function getPromoLog(){
  try{ return JSON.parse(localStorage.getItem('cs_promo_log')||'[]'); }catch(e){ return []; }
}
function savePromoLog(arr){ localStorage.setItem('cs_promo_log',JSON.stringify(arr)); }

function applyPromo(){
  var inp = document.getElementById('f-promo');
  var msg = document.getElementById('promo-msg');
  if(!inp||!msg) return;
  var code = inp.value.trim().toUpperCase();
  if(!code){ showToast('Ingresa un codigo'); return; }

  var codes=getPromoCodes(), found=null;
  for(var i=0;i<codes.length;i++){
    if(codes[i].code===code && codes[i].active){ found=codes[i]; break; }
  }
  if(!found){
    msg.style.display='block'; msg.style.color='#ff5252';
    msg.innerHTML='Codigo invalido o expirado';
    activePromo=null; inp.style.borderColor='#ff5252';
    refreshModalPrice(); return;
  }
  if(found.maxUses>0 && (found.uses||0)>=found.maxUses){
    msg.style.display='block'; msg.style.color='#ff5252';
    msg.innerHTML='Codigo sin usos disponibles';
    activePromo=null; inp.style.borderColor='#ff5252';
    refreshModalPrice(); return;
  }

  activePromo={code:found.code, disc:found.disc};
  inp.style.borderColor='#00e676';
  msg.style.display='block'; msg.style.color='#00e676';
  msg.innerHTML='<strong>'+found.disc+'% de descuento aplicado</strong>'+(found.desc?' &bull; '+found.desc:'');
  refreshModalPrice();
  showToast(found.disc+'% de descuento aplicado!', 2500);
}

function refreshModalPrice(){
  var priceEl  = document.getElementById('m-price');
  var prodCard = document.getElementById('m-prod-card-wrap');
  if(!priceEl || !curId) return;
  var tIdx=getTIdx(getSpent()), p=null;
  for(var i=0;i<PRODUCTS.length;i++){ if(PRODUCTS[i].id===curId){ p=PRODUCTS[i]; break; } }
  if(!p) return;
  var base = p.prices[tIdx];
  if(activePromo){
    var disc     = activePromo.disc;
    var final2   = Math.floor(base * (1 - disc/100));
    var saved    = base - final2;
    // Precio tachado + precio final verde + ahorro
    priceEl.innerHTML = '<span style="text-decoration:line-through;color:var(--muted);font-size:.8rem;font-weight:400">'+fmt(base)+'</span>'
      + ' <span style="color:#00e676;font-size:1.3rem;font-weight:900">'+fmt(final2)+'</span>'
      + '<span style="display:block;font-size:.72rem;color:#00e676;margin-top:.1rem">Ahorras $'+saved.toLocaleString('es-MX')+' MX con codigo '+activePromo.code+'</span>';
    // Highlight the modal card
    var mCard = document.querySelector('.m-prod-card');
    if(mCard) mCard.style.borderColor='rgba(0,230,118,.3)';
  } else {
    var tIdx2=getTIdx(getSpent());
    priceEl.innerHTML = '<span style="font-family:Orbitron;font-size:1.2rem;font-weight:900;color:var(--c1)">'+fmt(p.prices[tIdx2])+'</span>';
    var mCard2=document.querySelector('.m-prod-card');
    if(mCard2) mCard2.style.borderColor='';
  }
}

function getDiscountedPrice(base){
  if(!activePromo) return base;
  return Math.floor(base*(1-activePromo.disc/100));
}

function recordPromoUse(code,orderId,discount){
  var codes=getPromoCodes();
  for(var i=0;i<codes.length;i++){
    if(codes[i].code===code){ codes[i].uses=(codes[i].uses||0)+1; break; }
  }
  savePromoCodes(codes);
  var log=getPromoLog();
  log.push({code:code,order:orderId,discount:discount,
    date:new Date().toLocaleDateString('es-MX',{day:'2-digit',month:'short',year:'numeric'})});
  savePromoLog(log);
}

var _origCloseModal2=closeModal;
closeModal=function(){
  _origCloseModal2();
  activePromo=null;
  var inp=document.getElementById('f-promo');
  var msg=document.getElementById('promo-msg');
  if(inp){ inp.value=''; inp.style.borderColor=''; }
  if(msg) msg.style.display='none';
  var mCard3=document.querySelector('.m-prod-card');
  if(mCard3) mCard3.style.borderColor='';
};

var _origSubmitProd3=submitProd;
submitProd=function(){
  var v=validateForm(); if(!v) return;
  var p=null;
  for(var i=0;i<PRODUCTS.length;i++){ if(PRODUCTS[i].id===curId){ p=PRODUCTS[i]; break; } }
  if(!p) return;
  var tIdx=getTIdx(getSpent()), tier=TIERS[tIdx];
  var base=p.prices[tIdx], now=getDiscountedPrice(base), baseOrig=p.prices[0];
  var ord=getNextOrder(), lu=addSpend(now);
  if(activePromo) recordPromoUse(activePromo.code,ord,activePromo.disc);
  addToHistory({name:p.name,price:now,icon:p.isPase?'\u26D3':'\uD83D\uDC8E',
    date:new Date().toLocaleDateString('es-MX',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}),order:ord});
  var promoLine=activePromo?('\nCodigo promo: '+activePromo.code+' (-'+activePromo.disc+'%)'):'';
  var msg2='*NUEVO PEDIDO #'+ord+' - CiberStore*\n\nProducto: '+p.name
    +'\nPrecio: '+fmt(now)+promoLine
    +'\nMetodo de pago: Transferencia Bancaria'
    +'\n\nNombre: '+v.nombre+'\nID Free Fire: '+v.v1+'\nWhatsApp: '+v.wa
    +'\n\nManda tu comprobante con el numero #'+ord;
  sendWA(msg2,lu);
};

/* ================================================================
   ADMIN PANEL
================================================================ */
function openAdmin(){
  closeSB();
  var el=document.getElementById('admin-modal');
  if(el) el.classList.add('show');
  if(adminLoggedIn){
    document.getElementById('admin-login-section').style.display='none';
    document.getElementById('admin-dashboard').style.display='block';
    renderAdminCodes(); renderAdminStats();
  } else {
    document.getElementById('admin-login-section').style.display='block';
    document.getElementById('admin-dashboard').style.display='none';
  }
}
function closeAdmin(){
  var el=document.getElementById('admin-modal');
  if(el) el.classList.remove('show');
}
var _aEl=document.getElementById('admin-modal');
if(_aEl) _aEl.addEventListener('click',function(e){ if(e.target===this) closeAdmin(); });

function adminLogin(){
  var email=document.getElementById('adm-email').value.trim().toLowerCase();
  var pass=document.getElementById('adm-pass').value.trim();
  var err=document.getElementById('adm-login-err');
  if(email!==ADMIN_EMAIL||pass!==ADMIN_PASS){
    err.style.display='block'; err.textContent='Correo o contrasena incorrectos'; return;
  }
  adminLoggedIn=true; err.style.display='none';
  document.getElementById('admin-login-section').style.display='none';
  document.getElementById('admin-dashboard').style.display='block';
  renderAdminCodes(); renderAdminStats();
}

function adminLogout(){
  adminLoggedIn=false;
  document.getElementById('admin-dashboard').style.display='none';
  document.getElementById('admin-login-section').style.display='block';
  document.getElementById('adm-email').value='';
  document.getElementById('adm-pass').value='';
}

function adminCreateCode(){
  var code=document.getElementById('adm-code').value.trim().toUpperCase();
  var disc=parseInt(document.getElementById('adm-disc').value||'0');
  var uses=parseInt(document.getElementById('adm-uses').value||'0');
  var desc=document.getElementById('adm-desc').value.trim();
  var msg3=document.getElementById('adm-create-msg');
  if(!code||code.length<3){ showAdminMsg(msg3,'Codigo muy corto (min 3 caracteres)','#ff5252'); return; }
  if(disc<1||disc>99){ showAdminMsg(msg3,'Descuento debe ser 1-99%','#ff5252'); return; }
  if(uses<1){ showAdminMsg(msg3,'Usos debe ser mayor a 0','#ff5252'); return; }
  var codes=getPromoCodes();
  for(var i=0;i<codes.length;i++){
    if(codes[i].code===code){ showAdminMsg(msg3,'Ese codigo ya existe','#ff5252'); return; }
  }
  codes.push({code:code,disc:disc,maxUses:uses,uses:0,desc:desc,active:true,
    created:new Date().toLocaleDateString('es-MX',{day:'2-digit',month:'short',year:'numeric'})});
  savePromoCodes(codes);
  document.getElementById('adm-code').value='';
  document.getElementById('adm-disc').value='';
  document.getElementById('adm-uses').value='';
  document.getElementById('adm-desc').value='';
  showAdminMsg(msg3,'Codigo '+code+' creado!','#00e676');
  renderAdminCodes(); renderAdminStats();
}

function showAdminMsg(el,text,color){
  if(!el) return;
  el.style.display='block'; el.style.color=color; el.textContent=text;
  setTimeout(function(){ el.style.display='none'; },4000);
}

function adminDeleteCode(code){
  if(!confirm('Eliminar codigo '+code+'?')) return;
  savePromoCodes(getPromoCodes().filter(function(c){ return c.code!==code; }));
  renderAdminCodes(); renderAdminStats();
}

function adminToggleCode(code){
  var codes=getPromoCodes();
  for(var i=0;i<codes.length;i++){
    if(codes[i].code===code){ codes[i].active=!codes[i].active; break; }
  }
  savePromoCodes(codes);
  renderAdminCodes();
}

function renderAdminCodes(){
  var codes=getPromoCodes();
  var el=document.getElementById('adm-codes-list');
  var cnt=document.getElementById('adm-codes-count');
  if(!el) return;
  if(cnt) cnt.textContent=codes.length+' codigo'+(codes.length!==1?'s':'');
  if(!codes.length){el.innerHTML='<div style="text-align:center;padding:1.5rem;color:var(--muted)">Sin codigos</div>';return;}
  var rows='';
  for(var i=codes.length-1;i>=0;i--){
    var c=codes[i];
    rows+='<div class="admin-code-item">'
      +'<div class="code-active" style="background:'+(c.active?'#00e676':'#555')+'"></div>'
      +'<div class="code-badge">'+c.code+'</div>'
      +'<div class="code-disc">-'+c.disc+'%</div>'
      +'<div class="code-uses">'+(c.uses||0)+'/'+c.maxUses+' usos</div>'
      +(c.desc?'<div style="font-size:.62rem;color:var(--muted);flex:1">'+c.desc+'</div>':'<div style="flex:1"></div>')
      +'<button class="code-del" data-code="'+c.code+'" onclick="adminToggleCode(this.dataset.code)" style="font-size:.62rem;color:var(--muted)">'+(c.active?'OFF':'ON')+'</button>'
      +'<button class="code-del" data-code="'+c.code+'" onclick="adminDeleteCode(this.dataset.code)">\u00D7</button>'
      +'</div>';
  }
  el.innerHTML=rows;
}

function renderAdminStats(){
  var log=getPromoLog(), codes=getPromoCodes();
  var el=document.getElementById('adm-stats');
  if(!el) return;
  var totalUses=codes.reduce(function(s,c){ return s+(c.uses||0); },0);
  var html3='Total de usos: <strong style="color:#fff">'+totalUses+'</strong><br/>'
    +'Codigos activos: <strong style="color:#00e676">'+codes.filter(function(c){return c.active;}).length+'</strong><br/>'
    +'Codigos inactivos: <strong style="color:#ff5252">'+codes.filter(function(c){return !c.active;}).length+'</strong>';
  if(log.length){
    html3+='<br/><br/><strong style="color:var(--c1)">Ultimos usos:</strong><br/>';
    var recent=log.slice(-5).reverse();
    for(var i=0;i<recent.length;i++){
      html3+=recent[i].date+'  -  Pedido #'+recent[i].order+'  -  '+recent[i].code+' (-'+recent[i].discount+'%)<br/>';
    }
  }
  el.innerHTML=html3;
}

/* ====== CARRITO ====== */
function getCart(){try{return JSON.parse(localStorage.getItem('cs_cart')||'[]');}catch(e){return[];}}
function saveCart(c){localStorage.setItem('cs_cart',JSON.stringify(c));}

function addToCart(item){
  var c=getCart();
  c.push({id:Date.now(),name:item.name,price:item.price,icon:item.icon});
  saveCart(c);
  updateCartCount();
  showToast(item.name+' agregado al carrito',2000);
}

function removeFromCart(id){
  var c=getCart().filter(function(i){return i.id!==id;});
  saveCart(c);
  renderCartModal();
  updateCartCount();
}

function clearCart(){
  saveCart([]);
  renderCartModal();
  updateCartCount();
}

function updateCartCount(){
  var c=getCart(),el=document.getElementById('cart-count');
  if(!el) return;
  el.textContent=c.length;
  el.className='cart-count'+(c.length>0?' vis':'');
}

function openCart(){
  renderCartModal();
  var el=document.getElementById('modal-cart');
  if(el) el.classList.add('show');
}

function closeCart(){
  var el=document.getElementById('modal-cart');
  if(el) el.classList.remove('show');
}

function renderCartModal(){
  var c=getCart(), body=document.getElementById('cart-modal-body');
  if(!body) return;
  if(!c.length){ body.innerHTML='<div class="cart-empty">'+t('empty_cart')+'</div>'; return; }
  var totalMXN=c.reduce(function(s,i){return s+i.price;},0);
  var rows='<div style="padding:0 .5rem">';
  for(var i=0;i<c.length;i++){
    var it=c[i];
    rows+='<div class="cart-item-row">'
      +'<div class="cart-item-ico">'+it.icon+'</div>'
      +'<div class="cart-item-name">'+it.name+'</div>'
      +'<div class="cart-item-price">'+fmt(it.price)+'</div>'
      +'<button class="cart-item-del" data-id="'+it.id+'" onclick="removeFromCart(+this.dataset.id)">\u00D7</button>'
      +'</div>';
  }
  rows+='</div>';
  rows+='<div class="cart-total-row">'
    +'<span class="cart-total-lbl">Total</span>'
    +'<span class="cart-total-val">'+fmt(totalMXN)+'</span>'
    +'</div>';
  rows+='<div style="padding:0 1.25rem 1.25rem">'
    +'<button class="btn-cart-checkout" onclick="checkoutCart()">'
    +'\uD83D\uDCDE Pedir todo por WhatsApp'
    +'</button></div>';
  body.innerHTML=rows;
}

function checkoutCart(){
  var c=getCart();
  if(!c.length){showToast('El carrito esta vacio');return;}
  var totalMXN=c.reduce(function(s,i){return s+i.price;},0);
  var lines='*PEDIDO CARRITO - CiberStore*\n\n';
  for(var i=0;i<c.length;i++) lines+=c[i].name+': $'+c[i].price.toLocaleString('es-MX')+' MX\n';
  lines+='\nTotal: $'+totalMXN.toLocaleString('es-MX')+' MX';
  lines+='\nMetodo de pago: Transferencia Bancaria';
  lines+='\n\nPor favor manda tu nombre, ID de Free Fire y WhatsApp junto con el comprobante.';
  closeCart();
  setTimeout(function(){window.open('https://wa.me/'+WA+'?text='+encodeURIComponent(lines),'_blank');},400);
}

/* Add + button to each product card */


var _mcEl=document.getElementById('modal-cart');
if(_mcEl) _mcEl.addEventListener('click',function(e){if(e.target===this)closeCart();});
updateCartCount();

/* ====== BINANCE PAY ====== */
function openBinanceModal(){
  var el=document.getElementById('modal-binance');
  if(el) el.classList.add('show');
}
function closeBinanceModal(){
  var el=document.getElementById('modal-binance');
  if(el) el.classList.remove('show');
}
function copyBinanceID(){
  navigator.clipboard.writeText('1106987175').then(function(){
    showToast('Binance ID copiado: 1106987175',2000);
  });
}
// Close on overlay click
(function(){
  var el=document.getElementById('modal-binance');
  if(el) el.addEventListener('click',function(e){ if(e.target===this) closeBinanceModal(); });
})();

function switchPayTab(tab){
  var stori   = document.getElementById('paybox-stori');
  var binance = document.getElementById('paybox-binance');
  var tStori  = document.getElementById('tab-stori');
  var tBin    = document.getElementById('tab-binance');
  if(tab==='stori'){
    if(stori)  stori.style.display='block';
    if(binance)binance.style.display='none';
    if(tStori) { tStori.style.background='rgba(37,211,102,.12)'; tStori.style.borderColor='rgba(37,211,102,.4)'; tStori.style.color='#25d366'; }
    if(tBin)   { tBin.style.background='rgba(255,255,255,.04)';  tBin.style.borderColor='rgba(255,255,255,.1)';  tBin.style.color='var(--muted)'; }
  } else {
    if(stori)  stori.style.display='none';
    if(binance)binance.style.display='block';
    if(tBin)   { tBin.style.background='rgba(240,185,11,.12)';   tBin.style.borderColor='rgba(240,185,11,.4)';   tBin.style.color='#f0b90b'; }
    if(tStori) { tStori.style.background='rgba(255,255,255,.04)';tStori.style.borderColor='rgba(255,255,255,.1)';tStori.style.color='var(--muted)'; }
  }
}

/* \u2500\u2500 DIAMOND QTY \u2500\u2500 */
var ffQtyMap = {};

function ffQty(id, delta){
  ffQtyMap[id] = Math.max(0, (ffQtyMap[id]||0) + delta);
  var el = document.getElementById('ffq-'+id);
  if(el) el.textContent = ffQtyMap[id];
}

function ffAddCart(id){
  var qty=ffQtyMap[id]||0;
  if(qty===0){ showToast('Elige la cantidad primero'); return; }
  var p=null;
  for(var i=0;i<PRODUCTS.length;i++){ if(PRODUCTS[i].id===id){ p=PRODUCTS[i]; break; } }
  if(!p) return;
  var tIdx=getTIdx(getSpent());
  var now=p.prices[tIdx];
  for(var q=0;q<qty;q++){
    addToCart({name:p.name+' Diamantes',price:now,icon:'\uD83D\uDC8E'});
  }
  ffQtyMap[id]=0;
  var el=document.getElementById('ffq-'+id);
  if(el) el.textContent='0';
  showToast(qty+'x '+p.name+' Diamantes al carrito',2200);
}




/* ================================================================
   IDIOMA Y MONEDA  -  FUNCIONAL
================================================================ */
var LANG     = localStorage.getItem('cs_lang')     || 'es';
var CURRENCY = localStorage.getItem('cs_currency') || 'MXN';

/* Tasas vs MXN */
var RATES   = {MXN:1, USD:0.051, EUR:0.047, ARS:50.2, PEN:0.19};
var CUR_SYM = {MXN:'$', USD:'$', EUR:'\u20AC', ARS:'$', PEN:'S/'};
var CUR_SUF = {MXN:' MX', USD:' USD', EUR:' EUR', ARS:' ARS', PEN:' PEN'};

/* Override fmt to convert currency */
fmt = function(mxn){
  if(!mxn && mxn!==0) return '';
  var rate = RATES[CURRENCY]||1;
  var sym  = CUR_SYM[CURRENCY]||'$';
  var suf  = CUR_SUF[CURRENCY]||'';
  var val  = mxn * rate;
  var str;
  if(CURRENCY==='MXN') str = sym + Math.round(val).toLocaleString('es-MX');
  else if(CURRENCY==='ARS') str = sym + Math.round(val).toLocaleString('es-AR');
  else str = sym + val.toFixed(2);
  return str + suf;
};

/* -- TRANSLATIONS ----------------------------------------------- */
var TR = {
  es:{
    nav_home:'Inicio', nav_diamantes:'Diamantes FF', nav_likes:'Likes Perfil',
    nav_honor:'Honor de Clan', nav_clanes:'Venta de Clanes', nav_codigos:'Codigos FF',
    nav_cajas:'Cajas Evolutiva', nav_canal:'Canal WhatsApp', nav_admin:'Panel Admin',
    nav_perfil:'Mi Perfil', nav_saldo:'Recargar Saldo', nav_miscompras:'Mis Compras',
    nav_membresia:'Mi Rango',
    hero_sub:'La tienda definitiva de Free Fire. Diamantes, likes y honor de clan.',
    hero_btn1:'Ver Diamantes', hero_btn2:'Honor de Clan',
    buy_btn:'Comprar', add_cart:'+Carrito', get_plan:'Obtener plan',
    best_seller:'MAS VENDIDO', popular:'POPULAR', oferta:'OFERTA',
    gran_valor:'GRAN VALOR', mega:'MEGA',
    modal_f1:'Tu ID de Free Fire', modal_f2:'Confirmar ID',
    modal_f3:'Nombre completo', modal_f4:'Numero de WhatsApp',
    modal_promo:'Codigo Promocional', modal_optional:'(opcional)',
    modal_confirm:'Confirmar y abrir WhatsApp',
    modal_note:'Despues envia tu comprobante al WhatsApp con tu numero de pedido',
    buy_now:'Comprar ahora', delivery:'Entrega en menos de 24 hrs',
    cotizar:'Cotizar por WhatsApp',
    stori_tab:'STORI', binance_tab:'BINANCE',
    promo_applied:'de descuento aplicado', promo_invalid:'Codigo invalido o expirado',
    sec_dia:'DIAMANTES FREE FIRE', sec_dia_sub:'Recarga las veces que quieras. Descuento segun tu nivel.',
    sec_likes:'LIKES PARA TU PERFIL', sec_likes_sub:'220 likes diarios. Sin contrasena. Elige tu plan.',
    sec_honor:'HONOR DE CLAN', sec_honor_sub:'Selecciona tu region. Entrega rapida garantizada.',
    sec_rank:'MI RANGO', sec_perfil:'MI PERFIL', sec_saldo:'RECARGAR SALDO',
    sec_compras:'MIS COMPRAS', sec_codigos:'CODIGOS DE FREE FIRE', sec_cajas:'CAJAS PARA TU EVOLUTIVA',
    savings:'Ahorras', level_up:'Subiste a nivel', empty_cart:'Tu carrito esta vacio',
    add_to_cart_toast:'agregado al carrito', choose_qty:'Elige la cantidad primero',
    banner_txt:'ENTREGA AUTOMATICA 24/7  |  MAS COMPRAS = MAS DESCUENTOS  |  PAGOS SEGUROS'
  },
  en:{
    nav_home:'Home', nav_diamantes:'FF Diamonds', nav_likes:'Profile Likes',
    nav_honor:'Clan Honor', nav_clanes:'Clan Sales', nav_codigos:'FF Codes',
    nav_cajas:'Evolutive Boxes', nav_canal:'WhatsApp Channel', nav_admin:'Admin Panel',
    nav_perfil:'My Profile', nav_saldo:'Add Funds', nav_miscompras:'My Orders',
    nav_membresia:'My Rank',
    hero_sub:'The ultimate Free Fire store. Diamonds, likes and clan honor.',
    hero_btn1:'See Diamonds', hero_btn2:'Clan Honor',
    buy_btn:'Buy', add_cart:'+Cart', get_plan:'Get plan',
    best_seller:'BEST SELLER', popular:'POPULAR', oferta:'OFFER',
    gran_valor:'GREAT VALUE', mega:'MEGA',
    modal_f1:'Your Free Fire ID', modal_f2:'Confirm ID',
    modal_f3:'Full name', modal_f4:'WhatsApp number',
    modal_promo:'Promo Code', modal_optional:'(optional)',
    modal_confirm:'Confirm and open WhatsApp',
    modal_note:'Then send your receipt to WhatsApp with your order number',
    buy_now:'Buy now', delivery:'Delivery in less than 24 hrs',
    cotizar:'Quote on WhatsApp',
    stori_tab:'STORI', binance_tab:'BINANCE',
    promo_applied:'discount applied', promo_invalid:'Invalid or expired code',
    sec_dia:'FREE FIRE DIAMONDS', sec_dia_sub:'Recharge as many times as you want. Discounts based on your level.',
    sec_likes:'LIKES FOR YOUR PROFILE', sec_likes_sub:'220 automatic daily likes. No password. Choose your plan.',
    sec_honor:'CLAN HONOR', sec_honor_sub:'Select your region. Fast delivery guaranteed.',
    sec_rank:'MY RANK', sec_perfil:'MY PROFILE', sec_saldo:'ADD FUNDS',
    sec_compras:'MY ORDERS', sec_codigos:'FREE FIRE CODES', sec_cajas:'EVOLUTIVE BOXES',
    savings:'You save', level_up:'Level up to', empty_cart:'Your cart is empty',
    add_to_cart_toast:'added to cart', choose_qty:'Choose quantity first',
    banner_txt:'INSTANT DELIVERY 24/7  |  MORE PURCHASES = MORE DISCOUNTS  |  SECURE PAYMENTS'
  }
};

function t(k){ return (TR[LANG]&&TR[LANG][k]) ? TR[LANG][k] : (TR['es'][k]||k); }

/* -- APPLY ALL TRANSLATIONS TO DOM ------------------------------ */
function applyTranslations(){
  var lg = LANG;

  /* NAV items */
  var navMap = {
    'ni-home':       'nav_home',
    'ni-diamantes':  'nav_diamantes',
    'ni-likes':      'nav_likes',
    'ni-honor':      'nav_honor',
    'ni-clanes':     'nav_clanes',
    'ni-codigos':    'nav_codigos',
    'ni-cajas':      'nav_cajas',
    'ni-perfil':     'nav_perfil',
    'ni-saldo':      'nav_saldo',
    'ni-miscompras': 'nav_miscompras',
    'ni-membresia':  'nav_membresia'
  };
  for(var id in navMap){
    var el=document.getElementById(id);
    if(!el) continue;
    var ico=el.querySelector('.nav-icon');
    var nb=el.querySelector('.nb');
    var icoH=ico?ico.outerHTML:'';
    var nbH=nb?(' '+nb.outerHTML):'';
    el.innerHTML=icoH+' '+t(navMap[id])+nbH;
  }

  /* Hero */
  var hSub=document.querySelector('.hero-sub');
  if(hSub) hSub.innerHTML=t('hero_sub');
  var hBtns=document.querySelectorAll('.btn-hero');
  if(hBtns[0]) hBtns[0].textContent=t('hero_btn1');
  if(hBtns[1]) hBtns[1].textContent=t('hero_btn2');

  /* Banner */
  var ban=document.querySelector('.banner');
  if(ban) ban.textContent=t('banner_txt');

  /* Page titles */
  var titleMap={
    'page-diamantes':['sec_dia','sec_dia_sub'],
    'page-likes':    ['sec_likes','sec_likes_sub'],
    'page-honor':    ['sec_honor','sec_honor_sub'],
    'page-membresia':['sec_rank',null],
    'page-perfil':   ['sec_perfil',null],
    'page-saldo':    ['sec_saldo',null],
    'page-miscompras':['sec_compras',null],
    'page-codigos':  ['sec_codigos',null],
    'page-cajas':    ['sec_cajas',null]
  };
  for(var pg in titleMap){
    var pgEl=document.getElementById(pg);
    if(!pgEl) continue;
    var tEl=pgEl.querySelector('.ptitle');
    var sEl=pgEl.querySelector('.psub');
    if(tEl && titleMap[pg][0]) tEl.innerHTML=t(titleMap[pg][0]);
    if(sEl && titleMap[pg][1]) sEl.textContent=t(titleMap[pg][1]);
  }

  /* Modal labels */
  var l1=document.getElementById('lbl1'); if(l1) l1.textContent=t('modal_f1');
  var l2=document.getElementById('lbl2'); if(l2) l2.textContent=t('modal_f2');
  var l3=document.getElementById('lbl3'); if(l3) l3.textContent=t('modal_f3');
  var f4l=document.querySelector('label[for="f4"]');
  /* find label before f4 */
  var f4=document.getElementById('f4');
  if(f4 && f4.previousElementSibling && f4.previousElementSibling.tagName==='LABEL'){
    f4.previousElementSibling.textContent=t('modal_f4');
  }
  /* promo label */
  var promoLbl=document.querySelector('#promo-section .flabel');
  if(promoLbl) promoLbl.textContent=t('modal_promo');
  var promoOpt=document.querySelector('#promo-section span');
  if(promoOpt) promoOpt.textContent=t('modal_optional');
  /* submit btn */
  var sub=document.getElementById('btn-submit');
  if(sub) sub.innerHTML='\uD83D\uDCF1 '+t('modal_confirm');
  /* modal note */
  var note=document.querySelector('.wa-note');
  if(note) note.innerHTML=t('modal_note');
  /* pay tabs */
  var ts=document.getElementById('tab-stori');   if(ts) ts.textContent=t('stori_tab');
  var tb=document.getElementById('tab-binance'); if(tb) tb.textContent=t('binance_tab');

  /* Refresh rendered sections */
  renderProds();
  renderLikes();
}

/* -- CHANGE HANDLERS --------------------------------------------- */
function changeLang(lang){
  LANG=lang;
  localStorage.setItem('cs_lang',lang);
  applyTranslations();
  refreshUI();
}

function changeCurrency(cur){
  CURRENCY=cur;
  localStorage.setItem('cs_currency',cur);
  refreshUI();
  var page=document.querySelector('.page.active');
  if(page){
    var id=page.id.replace('page-','');
    if(id==='diamantes') renderProds();
    if(id==='likes') renderLikes();
    if(id==='membresia'){renderMems();renderWallet();}
  }
  /* Re-render open cart if visible */
  var cart=document.getElementById('modal-cart');
  if(cart && cart.classList.contains('show')) renderCartModal();
}

/* -- INIT --------------------------------------------------------- */
(function(){
  var ls=document.getElementById('lang-select');
  var cs=document.getElementById('currency-select');
  if(ls) ls.value=LANG;
  if(cs) cs.value=CURRENCY;
  applyTranslations();
})();

/* ================================================================
   HONOR CUENTA FF
================================================================ */
var HONOR_CUENTA_PRICE = 200;

function openHonorCuentaModal(){
  var el=document.getElementById('modal-honor-cuenta');
  if(el) el.classList.add('show');
  var ordEl=document.getElementById('hcff-order');
  if(ordEl) ordEl.textContent='PEDIDO #'+peekOrder();
  var prEl=document.getElementById('hcff-modal-price');
  if(prEl) prEl.textContent=fmt(HONOR_CUENTA_PRICE);
}

function closeHonorCuentaModal(){
  var el=document.getElementById('modal-honor-cuenta');
  if(el) el.classList.remove('show');
}

function hcffPayTab(tab){
  var s=document.getElementById('hcff-paybox-stori');
  var b=document.getElementById('hcff-paybox-binance');
  var ts=document.getElementById('hcff-tab-stori');
  var tb=document.getElementById('hcff-tab-binance');
  if(tab==='stori'){
    if(s) s.style.display='block';
    if(b) b.style.display='none';
    if(ts){ts.style.background='rgba(37,211,102,.12)';ts.style.borderColor='rgba(37,211,102,.4)';ts.style.color='#25d366';}
    if(tb){tb.style.background='rgba(255,255,255,.04)';tb.style.borderColor='rgba(255,255,255,.1)';tb.style.color='var(--muted)';}
  } else {
    if(s) s.style.display='none';
    if(b) b.style.display='block';
    if(tb){tb.style.background='rgba(240,185,11,.12)';tb.style.borderColor='rgba(240,185,11,.4)';tb.style.color='#f0b90b';}
    if(ts){ts.style.background='rgba(255,255,255,.04)';ts.style.borderColor='rgba(255,255,255,.1)';ts.style.color='var(--muted)';}
  }
}

function submitHonorCuenta(){
  var token  = document.getElementById('hcff-token').value.trim();
  var ncuenta= document.getElementById('hcff-nombre-cuenta').value.trim();
  var nombre = document.getElementById('hcff-nombre').value.trim();
  var wa     = document.getElementById('hcff-wa').value.trim();
  if(!token)  { showToast('Ingresa tu token de Free Fire'); return; }
  if(!ncuenta){ showToast('Ingresa el nombre de tu cuenta'); return; }
  if(!nombre) { showToast('Ingresa tu nombre'); return; }
  if(!wa || wa.replace(/\D/g,'').length<8){ showToast('Ingresa tu numero de WhatsApp'); return; }

  var ord=getNextOrder();
  var lu=addSpend(HONOR_CUENTA_PRICE);
  addToHistory({
    name:'Experiencia Cuenta FF',
    price:HONOR_CUENTA_PRICE,
    icon:'\uD83C\uDF71',
    date:new Date().toLocaleDateString('es-MX',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}),
    order:ord
  });

  var msg='*NUEVO PEDIDO #'+ord+' - CiberStore*\n\n'
    +'Servicio: Experiencia Cuenta Free Fire (Nivel 1 al 40)\n'
    +'Nivel: 1 al 40 (aprox)\n'
    +'Precio: '+fmt(HONOR_CUENTA_PRICE)+'\n'
    +'Metodo de pago: Transferencia Bancaria\n\n'
    +'Nombre: '+nombre+'\n'
    +'Nombre de cuenta FF: '+ncuenta+'\n'
    +'Token FF: '+token+'\n'
    +'WhatsApp: '+wa+'\n\n'
    +'Manda tu comprobante con el numero #'+ord;

  closeHonorCuentaModal();
  updateSidebarUser();
  if(lu) showToast(lu,5000); else showToast('Abriendo WhatsApp...',2500);
  setTimeout(function(){
    window.open('https://wa.me/'+WA+'?text='+encodeURIComponent(msg),'_blank');
  },700);
}

/* Close modal on overlay click */
(function(){
  var el=document.getElementById('modal-honor-cuenta');
  if(el) el.addEventListener('click',function(e){ if(e.target===this) closeHonorCuentaModal(); });
})();

/* Update price display when currency changes */
var _origChangeCurHCFF=changeCurrency;
changeCurrency=function(cur){
  _origChangeCurHCFF(cur);
  var prEl=document.getElementById('hcff-price');
  if(prEl) prEl.textContent=fmt(HONOR_CUENTA_PRICE);
  var prEl2=document.getElementById('hcff-modal-price');
  if(prEl2) prEl2.textContent=fmt(HONOR_CUENTA_PRICE);
};

/* ================================================================
   SISTEMA DE RESENAS
================================================================ */
var selectedStars = 0;

function setStars(n){
  selectedStars = n;
  var btns = document.querySelectorAll('.star-btn');
  for(var i=0;i<btns.length;i++){
    btns[i].style.opacity = i < n ? '1' : '0.28';
  }
}

function openResenaModal(){
  selectedStars = 0;
  setStars(0);
  var el=document.getElementById('modal-resena');
  if(el) el.classList.add('show');
  var rn=document.getElementById('r-nombre');
  var rc=document.getElementById('r-comentario');
  var rs=document.getElementById('r-servicio');
  var rm=document.getElementById('r-msg');
  if(rn) rn.value='';
  if(rc) rc.value='';
  if(rs) rs.selectedIndex=0;
  if(rm) rm.style.display='none';
}

function closeResenaModal(){
  var el=document.getElementById('modal-resena');
  if(el) el.classList.remove('show');
}

function submitResena(){
  var nombre    = (document.getElementById('r-nombre')||{}).value||'';
  var servicio  = (document.getElementById('r-servicio')||{}).value||'';
  var comentario= (document.getElementById('r-comentario')||{}).value||'';
  var msg       = document.getElementById('r-msg');

  nombre     = nombre.trim();
  comentario = comentario.trim();

  if(!selectedStars){ showToast('Elige una calificacion'); return; }
  if(!nombre)        { showToast('Ingresa tu nombre'); return; }
  if(!servicio)      { showToast('Selecciona el servicio'); return; }
  if(comentario.length < 5){ showToast('Escribe un comentario mas largo'); return; }

  var resenas = getResenas();
  resenas.unshift({
    nombre:   nombre,
    servicio: servicio,
    stars:    selectedStars,
    texto:    comentario,
    fecha:    new Date().toLocaleDateString('es-MX',{day:'2-digit',month:'short',year:'numeric'})
  });
  if(resenas.length > 50) resenas = resenas.slice(0,50);
  localStorage.setItem('cs_resenas', JSON.stringify(resenas));

  closeResenaModal();
  renderResenas();
  showToast('Gracias por tu resena!', 2500);
}

function getResenas(){
  try{ return JSON.parse(localStorage.getItem('cs_resenas')||'[]'); }
  catch(e){ return []; }
}

function renderResenas(){
  var grid    = document.getElementById('resenas-grid');
  var summary = document.getElementById('resenas-summary');
  if(!grid) return;
  var resenas = getResenas();
  if(!resenas.length){
    grid.innerHTML='<div style="text-align:center;padding:2rem;color:var(--muted);font-size:.82rem;grid-column:1/-1;background:var(--card);border:1px solid var(--border);border-radius:11px">Aun no hay resenas. \uD83D\uDE0A Se el primero!</div>';
    if(summary) summary.textContent='Se el primero en opinar';
    return;
  }
  var totalStars = resenas.reduce(function(s,r){ return s+r.stars; },0);
  var avg = (totalStars/resenas.length).toFixed(1);
  if(summary) summary.textContent = avg+' de 5 \u2605 \u2014 '+resenas.length+' resena'+(resenas.length!==1?'s':'');

  var html2='';
  for(var i=0;i<Math.min(resenas.length,9);i++){
    var r=resenas[i];
    var stars='';
    for(var s=1;s<=5;s++) stars+='<span style="color:'+(s<=r.stars?'#ffd000':'#2a2a3a')+'">\u2B50</span>';
    html2+='<div style="background:var(--card);border:1px solid var(--border);border-radius:11px;padding:1rem;display:flex;flex-direction:column;gap:.5rem">'
      +'<div style="display:flex;justify-content:space-between;align-items:flex-start">'
      +'<div style="font-size:.85rem;font-weight:700;color:#fff">'+r.nombre+'</div>'
      +'<div style="font-size:.62rem;color:var(--muted)">'+r.fecha+'</div>'
      +'</div>'
      +'<div>'+stars+'</div>'
      +'<div style="font-size:.65rem;color:var(--c1);font-weight:600">'+r.servicio+'</div>'
      +'<div style="font-size:.78rem;color:var(--muted);line-height:1.55">'+r.texto+'</div>'
      +'</div>';
  }
  grid.innerHTML=html2;
}

(function(){
  var el=document.getElementById('modal-resena');
  if(el) el.addEventListener('click',function(e){ if(e.target===this) closeResenaModal(); });
  renderResenas();
})();

/* ================================================================
   SMART WHATSAPP BUTTON
================================================================ */
function openSmartWA(){
  var activePage = document.querySelector('.page.active');
  var pageId = activePage ? activePage.id.replace('page-','') : 'home';
  var msgs = {
    'home':         'Hola! Quiero saber mas sobre CiberStore',
    'diamantes':    'Hola! Quiero comprar diamantes de Free Fire',
    'likes':        'Hola! Quiero saber mas sobre los likes para perfil',
    'honor':        'Hola! Quiero comprar honor de clan',
    'honorcuenta':  'Hola! Quiero subir la experiencia de mi cuenta FF',
    'clanes':       'Hola! Me interesa comprar un clan nivel 7',
    'codigos':      'Hola! Quiero que me avisen cuando esten los codigos FF',
    'cajas':        'Hola! Quiero que me avisen cuando esten las cajas evolutiva',
    'saldo':        'Hola! Quiero informacion sobre los metodos de pago',
    'membresia':    'Hola! Quiero saber mas sobre los rangos y descuentos',
    'referidos':    'Hola! Quiero informacion sobre el programa de referidos'
  };
  var msg = msgs[pageId] || msgs['home'];
  window.open('https://wa.me/'+WA+'?text='+encodeURIComponent(msg),'_blank');
}

/* ================================================================
   PROGRAMA DE REFERIDOS
================================================================ */
function getRefCode(){
  var code = localStorage.getItem('cs_ref_code');
  if(!code){
    var chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    code='REF-';
    for(var i=0;i<6;i++) code+=chars[Math.floor(Math.random()*chars.length)];
    localStorage.setItem('cs_ref_code', code);
  }
  return code;
}

function getRefStats(){
  try{ return JSON.parse(localStorage.getItem('cs_ref_stats')||'{"total":0,"ahorrado":0}'); }
  catch(e){ return {total:0,ahorrado:0}; }
}

function renderReferidos(){
  var code  = getRefCode();
  var stats = getRefStats();
  var disc  = Math.min(stats.total * 10, 50);

  var cEl = document.getElementById('ref-codigo');
  var tEl = document.getElementById('ref-total');
  var dEl = document.getElementById('ref-desc');
  var aEl = document.getElementById('ref-ahorrado');

  if(cEl) cEl.textContent = code;
  if(tEl) tEl.textContent = stats.total;
  if(dEl) dEl.textContent = disc+'%';
  if(aEl) aEl.textContent = fmt(stats.ahorrado);
}

function copyRefCode(){
  var code = getRefCode();
  navigator.clipboard.writeText(code).then(function(){
    showToast('Codigo '+code+' copiado!', 2000);
  }).catch(function(){
    showToast('Codigo: '+getRefCode(), 3000);
  });
}

function shareRefCode(){
  var code = getRefCode();
  var msg  = 'Usa mi codigo *'+code+'* en CiberStore y obten 5% de descuento en diamantes, likes y mas para Free Fire!\n\nhttps://ciberstore.lat';
  window.open('https://wa.me/?text='+encodeURIComponent(msg),'_blank');
}

/* Patch applyPromo to also accept referral codes */
var _origApplyPromo2 = applyPromo;
applyPromo = function(){
  var inp = document.getElementById('f-promo');
  if(!inp) return;
  var code = inp.value.trim().toUpperCase();
  /* Check if it's a referral code */
  if(code.startsWith('REF-') && code.length === 10){
    if(code === getRefCode()){
      showToast('No puedes usar tu propio codigo');
      return;
    }
    /* Apply 5% referral discount */
    activePromo = {code: code, disc: 5};
    var msg2 = document.getElementById('promo-msg');
    if(inp) inp.style.borderColor='#00e676';
    if(msg2){
      msg2.style.display='block';
      msg2.style.color='#00e676';
      msg2.textContent='Codigo de referido aplicado: 5% de descuento';
    }
    refreshModalPrice();
    showToast('5% de descuento de referido aplicado!', 2500);
    return;
  }
  _origApplyPromo2();
};

/* goPage referidos merged below */

/* ================================================================
   EXP PACKAGES - Experiencia Cuenta FF
================================================================ */
var EXP_PACKAGES = [
  {id:'exp5',  days:5,  exp:250000,  priceMX:200, priceUSD:15},
  {id:'exp10', days:10, exp:500000,  priceMX:300, priceUSD:25},
  {id:'exp15', days:15, exp:750000,  priceMX:400, priceUSD:35},
  {id:'exp20', days:20, exp:1000000, priceMX:500, priceUSD:45},
  {id:'exp25', days:25, exp:1250000, priceMX:600, priceUSD:55},
  {id:'exp30', days:30, exp:1500000, priceMX:700, priceUSD:65}
];

var selectedExpPkg = null;

function renderExpPackages(){
  var g = document.getElementById('exp-packages-grid');
  if(!g) return;
  var rows='';
  for(var i=0;i<EXP_PACKAGES.length;i++){
    var p=EXP_PACKAGES[i];
    var expStr = p.exp>=1000000
      ? (p.exp/1000000).toFixed(1)+'M'
      : (p.exp/1000)+'K';
    rows+='<div class="exp-pkg-card" id="expc-'+p.id+'" onclick="selectExpPkg(\''+p.id+'\')">'
      +'<div class="exp-pkg-days">'+p.days+'D</div>'
      +'<div class="exp-pkg-exp">'+expStr+' EXP</div>'
      +'<div class="exp-pkg-price">'+fmt(p.priceMX)+'</div>'
      +'<div class="exp-pkg-usd">~$'+p.priceUSD+' USD</div>'
      +'</div>';
  }
  rows+='<div style="grid-column:1/-1;text-align:center;margin-top:.5rem">'
    +'<button onclick="openHonorCuentaModalWithPkg()" style="padding:.75rem 2rem;background:linear-gradient(90deg,#007799,#00f5ff);color:#020a0a;border:none;border-radius:8px;font-family:\'Exo 2\';font-weight:800;font-size:.85rem;letter-spacing:2px;text-transform:uppercase;cursor:pointer;box-shadow:0 0 20px rgba(0,245,255,.3)">\u26A1 Contratar plan</button>'
    +'</div>';
  g.innerHTML=rows;
}

function selectExpPkg(id){
  selectedExpPkg = id;
  var cards = document.querySelectorAll('.exp-pkg-card');
  for(var i=0;i<cards.length;i++){
    cards[i].style.borderColor = cards[i].id==='expc-'+id
      ? 'rgba(0,245,255,.7)'
      : 'rgba(255,255,255,.07)';
    cards[i].style.background = cards[i].id==='expc-'+id
      ? 'rgba(0,245,255,.08)'
      : '';
  }
}

function openHonorCuentaModalWithPkg(){
  if(!selectedExpPkg){
    showToast('Selecciona un plan primero');
    return;
  }
  var pkg = null;
  for(var i=0;i<EXP_PACKAGES.length;i++){
    if(EXP_PACKAGES[i].id===selectedExpPkg){ pkg=EXP_PACKAGES[i]; break; }
  }
  if(!pkg) return;
  openHonorCuentaModal(pkg);
}

/* Override openHonorCuentaModal to accept optional pkg param */
var _origOpenHCFF = openHonorCuentaModal;
openHonorCuentaModal = function(pkg){
  var el=document.getElementById('modal-honor-cuenta');
  if(el) el.classList.add('show');
  var ordEl=document.getElementById('hcff-order');
  if(ordEl) ordEl.textContent='PEDIDO #'+peekOrder();
  var prEl=document.getElementById('hcff-modal-price');
  var subEl=document.getElementById('hcff-modal-sub');

  if(pkg && typeof pkg === 'object'){
    /* Package selected */
    var expStr = pkg.exp>=1000000
      ? (pkg.exp/1000000).toFixed(1)+'M'
      : (pkg.exp/1000)+'K';
    if(prEl) prEl.textContent=fmt(pkg.priceMX);
    if(subEl) subEl.textContent=pkg.days+' dias \u2014 '+expStr+' EXP total \u2014 50K/dia';
    el.setAttribute('data-pkg-price', pkg.priceMX);
    el.setAttribute('data-pkg-days', pkg.days);
    el.setAttribute('data-pkg-exp', expStr);
  } else {
    /* No package  -  show generic */
    if(prEl) prEl.textContent=fmt(HONOR_CUENTA_PRICE);
    if(subEl) subEl.textContent='Nivel 1 al 40 \u2014 Minutos u horas';
    el.setAttribute('data-pkg-price', HONOR_CUENTA_PRICE);
    el.setAttribute('data-pkg-days','');
    el.setAttribute('data-pkg-exp','');
  }
};

/* Override submitHonorCuenta to include pkg info */
var _origSubmitHCFF = submitHonorCuenta;
submitHonorCuenta = function(){
  var token   = (document.getElementById('hcff-token')||{}).value||'';
  var ncuenta = (document.getElementById('hcff-nombre-cuenta')||{}).value||'';
  var nombre  = (document.getElementById('hcff-nombre')||{}).value||'';
  var wa      = (document.getElementById('hcff-wa')||{}).value||'';
  token=token.trim(); ncuenta=ncuenta.trim(); nombre=nombre.trim(); wa=wa.trim();
  if(!token)  { showToast('Ingresa tu token de Free Fire'); return; }
  if(!ncuenta){ showToast('Ingresa el nombre de tu cuenta'); return; }
  if(!nombre) { showToast('Ingresa tu nombre'); return; }
  if(!wa||wa.replace(/\D/g,'').length<8){ showToast('Ingresa tu numero de WhatsApp'); return; }

  var modalEl = document.getElementById('modal-honor-cuenta');
  var pkgPrice = modalEl ? parseInt(modalEl.getAttribute('data-pkg-price')||HONOR_CUENTA_PRICE) : HONOR_CUENTA_PRICE;
  var pkgDays  = modalEl ? modalEl.getAttribute('data-pkg-days')||'' : '';
  var pkgExp   = modalEl ? modalEl.getAttribute('data-pkg-exp')||'' : '';

  var ord=getNextOrder();
  var lu=addSpend(pkgPrice);
  addToHistory({
    name:'Experiencia Cuenta FF'+(pkgDays?' ('+pkgDays+'D)':''),
    price:pkgPrice,
    icon:'\uD83C\uDF71',
    date:new Date().toLocaleDateString('es-MX',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}),
    order:ord
  });

  var planLine = pkgDays
    ? 'Plan: '+pkgDays+' dias \u2014 '+pkgExp+' EXP total (50K/dia)\n'
    : 'Plan: Nivel 1 al 40\n';

  var msg='*NUEVO PEDIDO #'+ord+' - CiberStore*\n\n'
    +'Servicio: Experiencia Cuenta Free Fire\n'
    +planLine
    +'Precio: $'+pkgPrice.toLocaleString('es-MX')+' MX\n'
    +'Metodo de pago: Transferencia Bancaria\n\n'
    +'Nombre: '+nombre+'\n'
    +'Nombre de cuenta FF: '+ncuenta+'\n'
    +'Token FF: '+token+'\n'
    +'WhatsApp: '+wa+'\n\n'
    +'Manda tu comprobante con el numero #'+ord;

  closeHonorCuentaModal();
  updateSidebarUser();
  if(lu) showToast(lu,5000); else showToast('Abriendo WhatsApp...',2500);
  setTimeout(function(){
    window.open('https://wa.me/'+WA+'?text='+encodeURIComponent(msg),'_blank');
  },700);
};

/* goPage honorcuenta merged below */

/* ================================================================
   LIVE SALES COUNTER
================================================================ */
var liveBase = Math.floor(Math.random()*30)+28; /* 28-57 */
var liveCount = liveBase;

function updateLiveCounter(){
  var el = document.getElementById('live-counter');
  if(!el) return;
  el.textContent = liveCount+' personas compraron hoy';
}

function startLiveCounter(){
  updateLiveCounter();
  /* Randomly increment every 25-90 seconds */
  function tick(){
    var wait = (Math.random()*65+25)*1000;
    setTimeout(function(){
      liveCount += Math.random()>0.3 ? 1 : 0;
      updateLiveCounter();
      tick();
    }, wait);
  }
  tick();
}

startLiveCounter();
renderResenas();

/* ================================================================
   SERVICE WORKER REGISTRATION (PWA)
================================================================ */
if('serviceWorker' in navigator){
  window.addEventListener('load',function(){
    navigator.serviceWorker.register('sw.js').catch(function(){});
  });
}

/* \u2500\u2500 Consolidated goPage hooks \u2500\u2500 */
var _origGoPageFinal = goPage;
goPage = function(id){
  _origGoPageFinal(id);
  if(id==='referidos')    { setTimeout(renderReferidos,   50); }
  if(id==='honorcuenta')  { setTimeout(renderExpPackages, 50); }
  if(id==='home')         { setTimeout(renderResenas,     50); }
};

/* Init on DOM load */
document.addEventListener('DOMContentLoaded', function(){
  var pg = document.getElementById('page-honorcuenta');
  if(pg && pg.classList.contains('active')) renderExpPackages();
  var pgR = document.getElementById('page-referidos');
  if(pgR && pgR.classList.contains('active')) renderReferidos();
  /* Always render reviews on home */
  renderResenas();
});

/* ================================================================
   AUTH SYSTEM  -  usuario + contrasena con localStorage
================================================================ */

/* Storage keys:
   cs_users  -> { username: { passHash, created, spent, history, refCode } }
   cs_session -> { username, loginTime }
*/

var authSession = null; /* { username } or null */
var isGuest     = false;

/* Simple hash  -  not cryptographic but ok para localStorage */
function hashPass(pass){
  var h=0, i, chr;
  for(i=0;i<pass.length;i++){
    chr=pass.charCodeAt(i);
    h=((h<<5)-h)+chr;
    h|=0;
  }
  return h.toString(36);
}

function getUsers(){
  try{ return JSON.parse(localStorage.getItem('cs_users')||'{}'); }
  catch(e){ return {}; }
}
function saveUsers(u){ localStorage.setItem('cs_users',JSON.stringify(u)); }

function getSession(){
  try{ return JSON.parse(localStorage.getItem('cs_session')||'null'); }
  catch(e){ return null; }
}
function saveSession(s){ localStorage.setItem('cs_session', s ? JSON.stringify(s) : 'null'); }

function currentUser(){ return authSession ? authSession.username : null; }

/*  AUTH MODAL CONTROLS  */
function authTab(tab){
  document.getElementById('auth-login').style.display    = tab==='login'    ? 'block' : 'none';
  document.getElementById('auth-register').style.display = tab==='register' ? 'block' : 'none';
  document.getElementById('atab-login').className    = 'auth-tab'+(tab==='login'    ? ' active' : '');
  document.getElementById('atab-register').className = 'auth-tab'+(tab==='register' ? ' active' : '');
}

function showAuthModal(){
  var el=document.getElementById('auth-modal');
  if(el) el.style.display='flex';
  authTab('login');
}

function hideAuthModal(){
  var el=document.getElementById('auth-modal');
  if(el) el.style.display='none';
}

/*  REGISTER  */
function doRegister(){
  var user  = (document.getElementById('reg-user')||{value:''}).value.trim().toLowerCase();
  var pass  = (document.getElementById('reg-pass')||{value:''}).value;
  var pass2 = (document.getElementById('reg-pass2')||{value:''}).value;
  var err   = document.getElementById('reg-err');
  var ok    = document.getElementById('reg-ok');

  err.style.display='none'; ok.style.display='none';

  if(!user || user.length<3){ err.textContent='Usuario muy corto (min 3 caracteres)'; err.style.display='block'; return; }
  if(!/^[a-z0-9_]+$/.test(user)){ err.textContent='Solo letras, numeros y guion bajo'; err.style.display='block'; return; }
  if(!pass || pass.length<6){ err.textContent='Contrasena muy corta (min 6 caracteres)'; err.style.display='block'; return; }
  if(pass !== pass2){ err.textContent='Las contrasenas no coinciden'; err.style.display='block'; return; }

  var users = getUsers();
  if(users[user]){ err.textContent='Ese nombre de usuario ya existe'; err.style.display='block'; return; }

  /* Create user */
  var refCode='REF-';
  var chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for(var i=0;i<6;i++) refCode+=chars[Math.floor(Math.random()*chars.length)];

  users[user]={
    passHash: hashPass(pass),
    created:  new Date().toLocaleDateString('es-MX'),
    spent:    0,
    history:  [],
    refCode:  refCode,
    orders:   0
  };
  saveUsers(users);

  ok.textContent='Cuenta creada! Iniciando sesion...';
  ok.style.display='block';
  setTimeout(function(){ loginUser(user); }, 900);
}

/*  LOGIN  */
function doLogin(){
  var user = (document.getElementById('login-user')||{value:''}).value.trim().toLowerCase();
  var pass = (document.getElementById('login-pass')||{value:''}).value;
  var err  = document.getElementById('login-err');
  err.style.display='none';

  if(!user || !pass){ err.textContent='Ingresa tu usuario y contrasena'; err.style.display='block'; return; }

  var users = getUsers();
  if(!users[user] || users[user].passHash !== hashPass(pass)){
    err.textContent='Usuario o contrasena incorrectos';
    err.style.display='block';
    return;
  }
  loginUser(user);
}

function loginUser(username){
  isGuest = false;
  authSession = { username: username };
  saveSession(authSession);
  hideAuthModal();
  updateAuthUI();
  refreshUI();
  showToast('Bienvenido, '+username+'!', 2500);
}

function doGuest(){
  isGuest = true;
  authSession = null;
  hideAuthModal();
  showToast('Modo invitado  -  puedes explorar la tienda', 2500);
}

/*  LOGOUT  */
function doLogout(){
  authSession = null;
  isGuest     = false;
  saveSession(null);
  updateAuthUI();
  showToast('Sesion cerrada');
  showAuthModal();
}

/*  USER MENU  */
function openUserMenu(){
  var u = currentUser();
  if(!u) return;
  /* Simple confirm dialog */
  if(confirm('Usuario: '+u+'\n\nDeseas cerrar sesion?')){
    doLogout();
  }
}

/*  UPDATE UI  */
function updateAuthUI(){
  var pill     = document.getElementById('user-pill');
  var pillAv   = document.getElementById('user-pill-av');
  var pillName = document.getElementById('user-pill-name');
  var u = currentUser();

  if(u){
    if(pill){ pill.style.display='flex'; }
    if(pillAv)   pillAv.textContent   = u.charAt(0).toUpperCase();
    if(pillName) pillName.textContent = u;
    /* Also update sidebar */
    var sbUname = document.getElementById('sb-uname');
    if(sbUname) sbUname.textContent = u;
  } else {
    if(pill) pill.style.display='none';
  }
}

/*  BLOCK PURCHASE if not logged in  */
/* Patch openProdModal */
var _origOpenProdModal = openProdModal;
openProdModal = function(id){
  if(!authSession){
    showToast('Inicia sesion para comprar');
    setTimeout(showAuthModal, 600);
    return;
  }
  _origOpenProdModal(id);
};

/* Patch openLikeModal */
var _origOpenLikeModal = openLikeModal;
openLikeModal = function(id){
  if(!authSession){
    showToast('Inicia sesion para comprar');
    setTimeout(showAuthModal, 600);
    return;
  }
  _origOpenLikeModal(id);
};

/* Patch openHonorModal */
var _origOpenHonorModal = openHonorModal;
openHonorModal = function(idx){
  if(!authSession){
    showToast('Inicia sesion para comprar');
    setTimeout(showAuthModal, 600);
    return;
  }
  _origOpenHonorModal(idx);
};

/* Patch openHonorCuentaModal */
var _origOpenHonorCuentaModal2 = openHonorCuentaModal;
openHonorCuentaModal = function(pkg){
  if(!authSession){
    showToast('Inicia sesion para comprar');
    setTimeout(showAuthModal, 600);
    return;
  }
  _origOpenHonorCuentaModal2(pkg);
};

/* Patch openCart */
var _origOpenCart = openCart;
openCart = function(){
  if(!authSession){
    showToast('Inicia sesion para usar el carrito');
    setTimeout(showAuthModal, 600);
    return;
  }
  _origOpenCart();
};

/*  INIT  */
(function(){
  /* Restore session */
  var saved = getSession();
  if(saved && saved.username){
    var users = getUsers();
    if(users[saved.username]){
      authSession = saved;
      isGuest = false;
      updateAuthUI();
      /* Don't show auth modal */
      var el=document.getElementById('auth-modal');
      if(el) el.style.display='none';
      return;
    }
  }
  /* No session  -  show auth modal */
  showAuthModal();
})();

/* Enter key support */
document.addEventListener('keydown', function(e){
  if(e.key!=='Enter') return;
  var loginVisible = document.getElementById('auth-login') &&
                     document.getElementById('auth-login').style.display!=='none';
  var regVisible   = document.getElementById('auth-register') &&
                     document.getElementById('auth-register').style.display!=='none';
  var authOpen     = document.getElementById('auth-modal') &&
                     document.getElementById('auth-modal').style.display!=='none';
  if(!authOpen) return;
  if(loginVisible) doLogin();
  else if(regVisible) doRegister();
});

/* ================================================================
   ADMIN INSIDE AUTH MODAL
================================================================ */
var ADMIN_EMAIL2 = 'ciberstore@admin.com';
var ADMIN_PASS2  = 'ciberstore26';
var adminAuthed  = false;

function doAdminLogin(){
  var email = (document.getElementById('adm-auth-email')||{value:''}).value.trim().toLowerCase();
  var pass  = (document.getElementById('adm-auth-pass')||{value:''}).value.trim();
  var err   = document.getElementById('adm-auth-err');
  if(email !== ADMIN_EMAIL2 || pass !== ADMIN_PASS2){
    err.textContent = 'Credenciales incorrectas';
    err.style.display = 'block';
    return;
  }
  adminAuthed = true;
  err.style.display = 'none';
  document.getElementById('adm-auth-login').style.display = 'none';
  document.getElementById('adm-auth-dash').style.display  = 'block';
  admSubTab('users');
  renderAdminStats2();
  renderAdminUsers();
}

function doAdminLogout(){
  adminAuthed = false;
  document.getElementById('adm-auth-login').style.display = 'block';
  document.getElementById('adm-auth-dash').style.display  = 'none';
  document.getElementById('adm-auth-email').value = '';
  document.getElementById('adm-auth-pass').value  = '';
}

function admSubTab(tab){
  var tabs = ['users','codes'];
  for(var i=0;i<tabs.length;i++){
    var t = tabs[i];
    var panelEl = document.getElementById('adm-tab-'+t);
    var btnEl   = document.getElementById('adm-stab-'+t);
    if(panelEl) panelEl.style.display = t===tab ? 'block' : 'none';
    if(btnEl){
      if(t===tab){
        btnEl.style.background   = 'rgba(0,170,255,.12)';
        btnEl.style.borderColor  = 'rgba(0,170,255,.3)';
        btnEl.style.color        = 'var(--c1)';
      } else {
        btnEl.style.background  = 'rgba(255,255,255,.04)';
        btnEl.style.borderColor = 'rgba(255,255,255,.1)';
        btnEl.style.color       = 'var(--muted)';
      }
    }
  }
  if(tab==='codes'){ renderAdminCodes(); renderAdminStats(); }
  if(tab==='users'){ renderAdminUsers(); }
}

/*  ADMIN STATS  */
function renderAdminStats2(){
  var users   = getUsers();
  var uKeys   = Object.keys(users);
  var totalSpent  = 0;
  var totalOrders = 0;
  for(var i=0;i<uKeys.length;i++){
    totalSpent  += users[uKeys[i]].spent  || 0;
    totalOrders += users[uKeys[i]].orders || 0;
  }
  var tu = document.getElementById('adm-total-users');
  var ts = document.getElementById('adm-total-spent');
  var to = document.getElementById('adm-total-orders');
  if(tu) tu.textContent = uKeys.length;
  if(ts) ts.textContent = '$'+totalSpent.toLocaleString('es-MX');
  if(to) to.textContent = totalOrders;
}

/*  ADMIN USERS LIST  */
function renderAdminUsers(){
  var list  = document.getElementById('adm-users-list');
  if(!list) return;
  var users = getUsers();
  var uKeys = Object.keys(users);
  var query = (document.getElementById('adm-search-user')||{value:''}).value.trim().toLowerCase();
  if(query) uKeys = uKeys.filter(function(k){ return k.indexOf(query)>=0; });

  if(!uKeys.length){
    list.innerHTML = '<div style="text-align:center;padding:1.5rem;color:var(--muted);font-size:.78rem">Sin usuarios'+(query?' con ese nombre':'')+'</div>';
    return;
  }

  var rows = '';
  for(var i=0;i<uKeys.length;i++){
    var k = uKeys[i];
    var u = users[k];
    var tier = getTier ? getTier(u.spent||0) : {name:'Visitante'};
    rows += '<div style="background:#141828;border:1px solid rgba(255,255,255,.07);border-radius:8px;padding:.6rem .75rem">'
      /* Header row */
      +'<div style="display:flex;align-items:center;gap:.55rem;margin-bottom:.4rem">'
      +'<div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,var(--c2),var(--c1));display:flex;align-items:center;justify-content:center;font-family:Orbitron;font-size:.65rem;font-weight:700;color:#fff;flex-shrink:0">'+k.charAt(0).toUpperCase()+'</div>'
      +'<div style="flex:1;min-width:0">'
      +'<div style="font-family:Orbitron;font-size:.72rem;font-weight:700;color:#fff">'+k+'</div>'
      +'<div style="font-size:.62rem;color:var(--muted)">'+tier.name+' &bull; Desde '+( u.created||'' )+'</div>'
      +'</div>'
      +'<div style="text-align:right;flex-shrink:0">'
      +'<div style="font-family:Orbitron;font-size:.75rem;font-weight:700;color:var(--c1)">$'+(u.spent||0).toLocaleString('es-MX')+'</div>'
      +'<div style="font-size:.6rem;color:var(--muted)">'+(u.orders||0)+' pedidos</div>'
      +'</div>'
      +'</div>'
      /* Actions */
      +'<div style="display:flex;gap:.35rem;flex-wrap:wrap">'
      +'<button data-user="'+k+'" onclick="admAddSaldo(this.dataset.user)" style="padding:.22rem .55rem;background:rgba(0,230,118,.1);border:1px solid rgba(0,230,118,.25);color:#00e676;border-radius:5px;font-family:\'Exo 2\';font-size:.62rem;cursor:pointer;font-weight:700">+ Saldo</button>'
      +'<button data-user="'+k+'" onclick="admResetPass(this.dataset.user)" style="padding:.22rem .55rem;background:rgba(0,170,255,.08);border:1px solid rgba(0,170,255,.2);color:var(--c1);border-radius:5px;font-family:\'Exo 2\';font-size:.62rem;cursor:pointer;font-weight:700">Reset pass</button>'
      +'<button data-user="'+k+'" onclick="admDeleteUser(this.dataset.user)" style="padding:.22rem .55rem;background:rgba(255,80,80,.08);border:1px solid rgba(255,80,80,.2);color:#ff6b6b;border-radius:5px;font-family:\'Exo 2\';font-size:.62rem;cursor:pointer;font-weight:700">Eliminar</button>'
      +'</div>'
      +'</div>';
  }
  list.innerHTML = rows;
}

/*  ADMIN ACTIONS  */
function admAddSaldo(username){
  var amtStr = prompt('Agregar saldo a '+username+':\nIngresa el monto en MXN (puede ser negativo para restar):');
  if(amtStr === null) return;
  var amt = parseFloat(amtStr);
  if(isNaN(amt)){ showToast('Monto invalido'); return; }
  var users = getUsers();
  if(!users[username]){ showToast('Usuario no encontrado'); return; }
  users[username].spent  = Math.max(0, (users[username].spent||0) + amt);
  users[username].orders = (users[username].orders||0) + (amt>0 ? 1 : 0);
  saveUsers(users);
  renderAdminUsers();
  renderAdminStats2();
  showToast((amt>0?'+':'')+amt+' MX aplicado a '+username);
}

function admResetPass(username){
  var newPass = prompt('Nueva contrasena para '+username+' (min 6 chars):');
  if(!newPass || newPass.length < 6){ showToast('Contrasena muy corta'); return; }
  var users = getUsers();
  if(!users[username]) return;
  users[username].passHash = hashPass(newPass);
  saveUsers(users);
  showToast('Contrasena de '+username+' actualizada');
}

function admDeleteUser(username){
  if(!confirm('Eliminar usuario '+username+'?\nEsta accion no se puede deshacer.')) return;
  var users = getUsers();
  delete users[username];
  saveUsers(users);
  renderAdminUsers();
  renderAdminStats2();
  showToast('Usuario '+username+' eliminado');
}

/*  PATCH authTab to support admin  */
var _origAuthTab = authTab;
authTab = function(tab){
  /* Hide all panels */
  var panels = ['auth-login','auth-register','auth-admin'];
  for(var i=0;i<panels.length;i++){
    var el = document.getElementById(panels[i]);
    if(el) el.style.display = 'none';
  }
  var tabs = ['atab-login','atab-register','atab-admin'];
  for(var j=0;j<tabs.length;j++){
    var tel = document.getElementById(tabs[j]);
    if(tel) tel.className = 'auth-tab';
  }
  /* Show selected */
  var panelEl = document.getElementById('auth-'+tab);
  var tabEl   = document.getElementById('atab-'+tab);
  if(panelEl) panelEl.style.display = 'block';
  if(tabEl)   tabEl.className = 'auth-tab active';

  /* If admin, restore dash if already authed */
  if(tab==='admin' && adminAuthed){
    document.getElementById('adm-auth-login').style.display = 'none';
    document.getElementById('adm-auth-dash').style.display  = 'block';
    renderAdminStats2();
    renderAdminUsers();
  }
};

/*  PATCH openAdmin (from old sidebar) to open auth admin tab  */
openAdmin = function(){
  showAuthModal();
  setTimeout(function(){ authTab('admin'); }, 80);
};

/* ================================================================
   OFFER TIMER
================================================================ */
(function(){
  function updateTimer(){
    var el = document.getElementById('offer-timer-txt');
    if(!el) return;
    var key = 'cs_offer_end';
    var end = localStorage.getItem(key);
    if(!end || Date.now() > parseInt(end)){
      /* Reset to 23:59:59 from now */
      end = Date.now() + 86399000;
      localStorage.setItem(key, end);
    }
    var diff = Math.max(0, parseInt(end) - Date.now());
    var h = Math.floor(diff/3600000);
    var m = Math.floor((diff%3600000)/60000);
    var s = Math.floor((diff%60000)/1000);
    el.textContent = (h<10?'0':'')+h+':'+(m<10?'0':'')+m+':'+(s<10?'0':'')+s;
  }
  updateTimer();
  setInterval(updateTimer, 1000);
})();

/* ================================================================
   THEME TOGGLE
================================================================ */
(function(){
  var saved = localStorage.getItem('cs_theme');
  if(saved==='light') document.body.classList.add('light-mode');
})();

function toggleTheme(){
  var isLight = document.body.classList.toggle('light-mode');
  localStorage.setItem('cs_theme', isLight ? 'light' : 'dark');
  var btn = document.getElementById('theme-btn');
  if(btn) btn.textContent = isLight ? '\uD83C\uDF19' : '\u2600\uFE0F';
}

/* ================================================================
   GLOBAL SEARCH
================================================================ */
var SEARCH_INDEX = [
  {name:'Diamantes FF', sub:'110 al 18,480  desde $17 MX', ico:'\uD83D\uDC8E', page:'diamantes'},
  {name:'Likes Perfil', sub:'220 likes/dia  desde $79 MX', ico:'\uD83D\uDC4D', page:'likes'},
  {name:'Honor de Clan', sub:'4 regiones  desde $160 MX', ico:'\uD83C\uDFC6', page:'honor'},
  {name:'Experiencia Cuenta FF', sub:'50K EXP/dia  desde $200 MX', ico:'\uD83C\uDF71', page:'honorcuenta'},
  {name:'Venta de Clanes', sub:'Nivel 7  $500 a $5,000 MX', ico:'\uD83C\uDFF0', page:'clanes'},
  {name:'Codigos FF', sub:'Proximamente', ico:'\uD83C\uDF9F', page:'codigos'},
  {name:'Cajas Evolutiva', sub:'Proximamente', ico:'\uD83C\uDF81', page:'cajas'},
  {name:'Recargar Saldo', sub:'STORI + Binance Pay', ico:'\uD83D\uDCB0', page:'saldo'},
  {name:'Mi Rango', sub:'Niveles y descuentos', ico:'\uD83D\uDC51', page:'membresia'},
  {name:'Programa de Referidos', sub:'Gana descuentos', ico:'\uD83C\uDF81', page:'referidos'},
  {name:'FAQ / Ayuda', sub:'Preguntas frecuentes', ico:'\u2753', page:'faq'},
  {name:'Mi Perfil', sub:'Tu cuenta y historial', ico:'\uD83D\uDC64', page:'perfil'},
  {name:'Mis Compras', sub:'Historial de pedidos', ico:'\uD83D\uDED2', page:'miscompras'}
];

function doSearch(q){
  var res = document.getElementById('search-results');
  if(!res) return;
  q = q.trim().toLowerCase();
  if(!q){ res.style.display='none'; return; }
  var matches = SEARCH_INDEX.filter(function(i){
    return i.name.toLowerCase().indexOf(q)>=0 || i.sub.toLowerCase().indexOf(q)>=0;
  });
  if(!matches.length){ res.style.display='none'; return; }
  var rows='';
  for(var i=0;i<Math.min(matches.length,6);i++){
    var m=matches[i];
    rows+='<div class="search-result-item" onclick="searchGo(\''+m.page+'\')">'
      +'<span class="sri-ico">'+m.ico+'</span>'
      +'<div><div class="sri-name">'+m.name+'</div><div class="sri-sub">'+m.sub+'</div></div>'
      +'</div>';
  }
  res.innerHTML=rows;
  res.style.display='block';
}

function searchGo(page){
  closeSearch();
  var inp = document.getElementById('global-search');
  if(inp) inp.value='';
  goPage(page);
}

function closeSearch(){
  var res = document.getElementById('search-results');
  if(res) res.style.display='none';
}

/* ================================================================
   CONFETTI
================================================================ */
function launchConfetti(){
  var canvas = document.getElementById('confetti-canvas');
  if(!canvas) return;
  canvas.style.display='block';
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  var ctx = canvas.getContext('2d');
  var pieces = [];
  var colors = ['#00aaff','#ffd000','#ff4422','#00f5ff','#25d366','#7c3aed'];
  for(var i=0;i<120;i++){
    pieces.push({
      x: Math.random()*canvas.width,
      y: Math.random()*canvas.height - canvas.height,
      w: Math.random()*10+4,
      h: Math.random()*6+3,
      color: colors[Math.floor(Math.random()*colors.length)],
      rot: Math.random()*360,
      vx: (Math.random()-0.5)*3,
      vy: Math.random()*4+2,
      vr: (Math.random()-0.5)*5
    });
  }
  var frame=0;
  function draw(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    for(var j=0;j<pieces.length;j++){
      var p=pieces[j];
      ctx.save();
      ctx.translate(p.x,p.y);
      ctx.rotate(p.rot*Math.PI/180);
      ctx.fillStyle=p.color;
      ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h);
      ctx.restore();
      p.x+=p.vx; p.y+=p.vy; p.rot+=p.vr;
    }
    frame++;
    if(frame<120) requestAnimationFrame(draw);
    else canvas.style.display='none';
  }
  draw();
}

/* ================================================================
   LEVEL UP NOTIFICATION
================================================================ */
function showLevelUp(tierName){
  var el  = document.getElementById('levelup-toast');
  var lvl = document.getElementById('levelup-lvl');
  if(!el) return;
  if(lvl) lvl.textContent = tierName.toUpperCase();
  el.classList.add('show');
  launchConfetti();
  setTimeout(function(){ el.classList.remove('show'); }, 3200);
}

/* Patch addSpend to detect level up */
var _origAddSpend2 = addSpend;
addSpend = function(amt){
  var before = getTIdx(getSpent());
  var result = _origAddSpend2(amt);
  var after  = getTIdx(getSpent());
  if(after > before && TIERS[after]){
    setTimeout(function(){ showLevelUp(TIERS[after].name); }, 800);
  }
  return result;
};

/* ================================================================
   ONBOARDING
================================================================ */
var obStep = 0;
var OB_STEPS = [
  {ico:'\uD83D\uDC8E', title:'Bienvenido a CiberStore', desc:'La tienda definitiva de Free Fire. Diamantes, likes, honor y mucho mas al mejor precio.'},
  {ico:'\uD83D\uDCB0', title:'Como pagar', desc:'Aceptamos STORI y Binance Pay. Transfiere el monto exacto y manda tu comprobante al WhatsApp para confirmar.'},
  {ico:'\uD83C\uDFC6', title:'Gana mas con tu cuenta', desc:'Cada compra sube tu rango y aumenta tu descuento. Comparte tu codigo de referido y gana aun mas.'}
];

function showOnboard(){
  obStep=0;
  renderOnboard();
  var el=document.getElementById('onboard-modal');
  if(el) el.style.display='flex';
}

function renderOnboard(){
  var s=OB_STEPS[obStep];
  document.getElementById('ob-ico').textContent   = s.ico;
  document.getElementById('ob-title').textContent = s.title;
  document.getElementById('ob-desc').textContent  = s.desc;
  for(var i=0;i<3;i++){
    var dot=document.getElementById('ob-step-'+i);
    if(dot) dot.className='onboard-step'+(i===obStep?' active':'');
  }
  var btn=document.querySelector('.btn-onboard-next');
  if(btn) btn.textContent = obStep===2 ? 'Empezar \u2192' : 'Siguiente \u2192';
}

function nextOnboard(){
  if(obStep<2){ obStep++; renderOnboard(); }
  else { skipOnboard(); }
}

function skipOnboard(){
  var el=document.getElementById('onboard-modal');
  if(el) el.style.display='none';
  localStorage.setItem('cs_onboarded','1');
}

/* Show onboarding on first visit */
(function(){
  if(!localStorage.getItem('cs_onboarded') && !localStorage.getItem('cs_session')){
    setTimeout(function(){
      var authOpen = document.getElementById('auth-modal');
      if(authOpen && authOpen.style.display!=='none') return;
      showOnboard();
    }, 1200);
  }
})();

/* ================================================================
   FAQ TOGGLE
================================================================ */
function toggleFaq(el){
  var arrow = el.querySelector('.faq-arrow');
  var ans   = el.nextElementSibling;
  var isOpen = ans.classList.contains('open');
  /* Close all */
  document.querySelectorAll('.faq-a').forEach(function(a){ a.classList.remove('open'); });
  document.querySelectorAll('.faq-arrow').forEach(function(a){ a.classList.remove('open'); });
  if(!isOpen){
    ans.classList.add('open');
    if(arrow) arrow.classList.add('open');
  }
}

/* ================================================================
   BUNDLE MODAL
================================================================ */
function openBundleModal(){
  if(!authSession){
    showToast('Inicia sesion para comprar');
    setTimeout(showAuthModal,600);
    return;
  }
  var el=document.getElementById('modal-bundle');
  if(el) el.classList.add('show');
  var ord=document.getElementById('bundle-order');
  if(ord) ord.textContent='PEDIDO #'+peekOrder();
}

function closeBundleModal(){
  var el=document.getElementById('modal-bundle');
  if(el) el.classList.remove('show');
}

function bundlePayTab(tab){
  var s=document.getElementById('bpaybox-stori');
  var b=document.getElementById('bpaybox-binance');
  var ts=document.getElementById('btab-stori');
  var tb=document.getElementById('btab-binance');
  if(tab==='stori'){
    if(s) s.style.display='block'; if(b) b.style.display='none';
    if(ts){ts.style.background='rgba(37,211,102,.12)';ts.style.borderColor='rgba(37,211,102,.4)';ts.style.color='#25d366';}
    if(tb){tb.style.background='rgba(255,255,255,.04)';tb.style.borderColor='rgba(255,255,255,.1)';tb.style.color='var(--muted)';}
  } else {
    if(s) s.style.display='none'; if(b) b.style.display='block';
    if(tb){tb.style.background='rgba(240,185,11,.12)';tb.style.borderColor='rgba(240,185,11,.4)';tb.style.color='#f0b90b';}
    if(ts){ts.style.background='rgba(255,255,255,.04)';ts.style.borderColor='rgba(255,255,255,.1)';ts.style.color='var(--muted)';}
  }
}

function submitBundle(){
  var id     = (document.getElementById('bundle-id')||{value:''}).value.trim();
  var nombre = (document.getElementById('bundle-nombre')||{value:''}).value.trim();
  var wa     = (document.getElementById('bundle-wa')||{value:''}).value.trim();
  if(!id)    { showToast('Ingresa tu ID de Free Fire'); return; }
  if(!nombre){ showToast('Ingresa tu nombre'); return; }
  if(!wa||wa.replace(/\D/g,'').length<8){ showToast('Ingresa tu WhatsApp'); return; }
  var ord=getNextOrder();
  var lu=addSpend(125);
  addToHistory({name:'Bundle Diamantes + Likes',price:125,icon:'\uD83D\uDC8E',
    date:new Date().toLocaleDateString('es-MX',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}),order:ord});
  var msg='*NUEVO PEDIDO #'+ord+' - CiberStore*\n\n'
    +'Bundle: 341 Diamantes + Likes 14 dias\n'
    +'Precio: $125 MX (10% descuento)\n'
    +'Metodo: Transferencia Bancaria\n\n'
    +'Nombre: '+nombre+'\nID Free Fire: '+id+'\nWhatsApp: '+wa
    +'\n\nManda comprobante con el # de pedido.';
  closeBundleModal();
  if(lu) showToast(lu,5000); else showToast('Abriendo WhatsApp...',2500);
  setTimeout(function(){ window.open('https://wa.me/'+WA+'?text='+encodeURIComponent(msg),'_blank'); },700);
}

(function(){
  var bm=document.getElementById('modal-bundle');
  if(bm) bm.addEventListener('click',function(e){ if(e.target===this) closeBundleModal(); });
})();

/* ================================================================
   TOTAL ORDERS COUNTER
================================================================ */
(function(){
  var base = 1247;
  var key  = 'cs_total_orders_disp';
  var stored = parseInt(localStorage.getItem(key)||base);
  var count  = Math.max(stored, base);
  function updateBadge(){
    var el=document.getElementById('total-orders-badge');
    if(el) el.textContent=count.toLocaleString('es-MX');
  }
  updateBadge();
  /* Increment slowly over time */
  setInterval(function(){
    if(Math.random()>0.7){
      count++;
      localStorage.setItem(key, count);
      updateBadge();
    }
  }, 45000);
})();

/* Patch goPage for faq */
var _origGoPageAll = goPage;
goPage = function(id){
  _origGoPageAll(id);
  if(id==='faq') closeSearch();
};

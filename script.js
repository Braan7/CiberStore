
var WA='5215523371367';
var TIERS=[
  {id:'free',    name:'Visitante',color:'#8892a4',colorBg:'rgba(136,146,164,.1)',threshold:0,     perks:['Precios estandar','Acceso a la tienda','Soporte por chat']},
  {id:'silver',  name:'Plata',   color:'#b0bec5',colorBg:'rgba(176,190,197,.1)',threshold:500,   perks:['Descuento en paquetes grandes','Soporte prioritario','Ofertas flash'],badge:{text:'STARTER',bg:'#b0bec5',color:'#111'}},
  {id:'gold',    name:'Oro',     color:'#ffd000',colorBg:'rgba(255,208,0,.1)',  threshold:2000,  perks:['Mayor descuento','Entrega prioritaria','Pases especiales'],badge:{text:'POPULAR',bg:'#ffd000',color:'#111'}},
  {id:'diamond', name:'Diamante',color:'#00aaff',colorBg:'rgba(0,170,255,.1)', threshold:6000,  perks:['Maximo descuento en paquetes','Soporte VIP 24/7','Acceso anticipado'],badge:{text:'TOP',bg:'#00aaff',color:'#020a0a'}},
  {id:'legend',  name:'Leyenda', color:'#00f5ff',colorBg:'rgba(0,245,255,.1)', threshold:15000, perks:['Precio minimo garantizado','Gestor personal','Precios bulk'],badge:{text:'ELITE',bg:'linear-gradient(90deg,#005fa3,#00aaff)',color:'#fff'}}
];
var PRODUCTS=[
  {id:1, name:'110 Diamantes',    desc:'Recarga las veces que quieras',prices:[17,17,17,17,17],          badge:null,         icon:'D', isPase:false},
  {id:2, name:'341 Diamantes',    desc:'Recarga las veces que quieras',prices:[60,60,60,60,60],          badge:'POPULAR',    icon:'D', badgeBg:'#00aaff',isPase:false},
  {id:3, name:'572 Diamantes',    desc:'Recarga las veces que quieras',prices:[85,85,85,85,85],          badge:null,         icon:'D', isPase:false},
  {id:4, name:'1,166 Diamantes',  desc:'Recarga las veces que quieras',prices:[175,173,170,168,166],     badge:'OFERTA',     icon:'D', badgeBg:'#00f5ff',isPase:false},
  {id:5, name:'2,398 Diamantes',  desc:'Recarga las veces que quieras',prices:[310,306,302,298,294],     badge:null,         icon:'D', isPase:false},
  {id:6, name:'6,160 Diamantes',  desc:'Recarga las veces que quieras',prices:[770,760,750,740,730],     badge:'GRAN VALOR', icon:'D', badgeBg:'#ffd000',isPase:false},
  {id:7, name:'12,320 Diamantes', desc:'Recarga las veces que quieras',prices:[1540,1520,1500,1480,1460],badge:null,         icon:'D', isPase:false},
  {id:8, name:'18,480 Diamantes', desc:'Recarga las veces que quieras',prices:[2310,2280,2250,2220,2190],badge:'MEGA',       icon:'D', badgeBg:'#7c3aed',isPase:false},
  {id:11,name:'Pase Elite',       desc:'Pase de temporada completa',   prices:[45,45,45,45,45],          badge:null,         icon:'P', isPase:true}
];
var LIKES=[
  {id:1,label:'14 Dias', priceMX:140,priceUSD:7,  total:3080, perDay:220,days:14, color:'#ff5050',lbl:'14 DIAS'},
  {id:2,label:'30 Dias', priceMX:180,priceUSD:5.9,total:6600, perDay:220,days:30, color:'#00aaff',lbl:'30 DIAS - POPULAR'},
  {id:3,label:'60 Dias', priceMX:260,priceUSD:13, total:13200,perDay:220,days:60, color:'#ffd000',lbl:'60 DIAS'},
  {id:4,label:'120 Dias',priceMX:280,priceUSD:14, total:26400,perDay:220,days:120,color:'#00f5ff',lbl:'120 DIAS - MEJOR VALOR'}
];
var HONOR=[
  {id:0,region:'Norteamerica',  price:340,color:'#ffd000'},
  {id:1,region:'Estados Unidos',price:180,color:'#4dabf7'},
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
  var spent=getSpent(),tIdx=getTIdx(spent),tier=TIERS[tIdx];
  var g=document.getElementById('prod-grid'),html='';
  for(var i=0;i<PRODUCTS.length;i++){
    var p=PRODUCTS[i];
    var base=p.prices[0],now=p.prices[tIdx],saved=base-now;
    var ico=p.isPase?'\u26D3':'\uD83D\uDC8E';
    var bHtml=p.badge?'<div class="prod-badge" style="background:'+(p.badgeBg||'#00aaff')+';color:'+(p.badgeBg==='#ffd000'?'#020a0a':'#fff')+'">'+p.badge+'</div>':'';
    var oHtml=tIdx>0&&saved>0?'<div class="price-orig" style="display:block">'+fmt(base)+'</div>':'';
    var sHtml=tIdx>0&&saved>0?'<div class="price-save" style="display:block">Ahorras $'+saved+' MX</div>':'';
    html+='<div class="prod-card" onclick="openProdModal('+p.id+')">'
      +bHtml+'<div class="prod-thumb"><div class="prod-thumb-ico">'+ico+'</div></div>'
      +'<div class="prod-body"><div class="prod-name">'+p.name+'</div><div class="prod-desc">'+p.desc+'</div>'
      +'<div class="prod-foot"><div>'+oHtml+'<div class="price-now">'+fmt(now)+'</div>'+sHtml+'</div>'
      +'<button class="btn-buy" onclick="event.stopPropagation();openProdModal('+p.id+')">Comprar</button>'
      +'</div></div></div>';
  }
  g.innerHTML=html;
}

/* LIKES */
function renderLikes(){
  var bords=['rgba(255,80,80,.22)','rgba(0,170,255,.2)','rgba(255,208,0,.22)','rgba(0,245,255,.2)'];
  var g=document.getElementById('likes-grid'),html='';
  for(var i=0;i<LIKES.length;i++){
    var p=LIKES[i];
    var dark=(p.color==='#ffd000'||p.color==='#00f5ff')?'#020a0a':'#fff';
    html+='<div class="lk-card" onclick="openLikeModal('+p.id+')" style="border-color:'+bords[i]+'">'
      +'<div class="lk-top" style="background:'+p.color+'18;color:'+p.color+'">'+p.lbl+'</div>'
      +'<span class="lk-icon" style="color:'+p.color+'">\uD83D\uDC4D</span>'
      +'<div class="lk-days" style="color:'+p.color+'">'+p.label+'</div>'
      +'<div class="lk-price" style="color:'+p.color+'">$'+p.priceMX+' <span style="font-size:1rem">MX</span></div>'
      +'<div class="lk-usd" style="color:'+p.color+'">$'+p.priceUSD+' USD</div>'
      +'<div class="lk-div"></div>'
      +'<div class="lk-row"><span class="lk-lbl">Total likes</span><span class="lk-val" style="color:'+p.color+'">'+p.total.toLocaleString()+'</span></div>'
      +'<div class="lk-row"><span class="lk-lbl">Por dia</span><span class="lk-val" style="color:'+p.color+'">'+p.perDay+'</span></div>'
      +'<div class="lk-row"><span class="lk-lbl">Duracion</span><span class="lk-val" style="color:'+p.color+'">'+p.days+' dias</span></div>'
      +'<button class="btn-like" style="background:linear-gradient(90deg,'+p.color+'cc,'+p.color+');color:'+dark+'" onclick="event.stopPropagation();openLikeModal('+p.id+')">Obtener ahora</button>'
      +'</div>';
  }
  g.innerHTML=html;
}

/* MEMBERSHIPS */
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
function getCart(){try{return JSON.parse(localStorage.getItem('cs_cart')||'[]');}catch(e){return[];}}
function saveCart(c){localStorage.setItem('cs_cart',JSON.stringify(c));}
function addToCart(item){
  var c=getCart();
  c.push({id:Date.now(),name:item.name,price:item.price,icon:item.icon});
  saveCart(c);updateCartCount();
  showToast(item.name+' agregado al carrito',2000);
}
function removeFromCart(id){
  var c=getCart().filter(function(i){return i.id!==id;});
  saveCart(c);renderCartModal();updateCartCount();
}
function clearCart(){saveCart([]);renderCartModal();updateCartCount();}
function updateCartCount(){
  var c=getCart(),el=document.getElementById('cart-count');
  if(!el) return;
  el.textContent=c.length;
  el.className='cart-count'+(c.length>0?' vis':'');
}
function openCart(){renderCartModal();document.getElementById('modal-cart').classList.add('show');}
function closeCart(){document.getElementById('modal-cart').classList.remove('show');}
var _mc=document.getElementById('modal-cart');if(_mc)_mc.addEventListener('click',function(e){if(e.target===this)closeCart();});
function renderCartModal(){
  var c=getCart(),body=document.getElementById('cart-modal-body');
  if(!body) return;
  if(!c.length){body.innerHTML='<div class="cart-empty">Tu carrito esta vacio</div>';return;}
  var total=c.reduce(function(s,i){return s+i.price;},0);
  var rows='<div style="padding:0 .5rem">';
  for(var i=0;i<c.length;i++){
    var it=c[i];
    rows+='<div class="cart-item-row">'
      +'<div class="cart-item-ico">'+it.icon+'</div>'
      +'<div class="cart-item-name">'+it.name+'</div>'
      +'<div class="cart-item-price">$'+it.price.toLocaleString('es-MX')+'</div>'
      +'<button class="cart-item-del" onclick="removeFromCart('+it.id+')">\u00D7</button>'
      +'</div>';
  }
  rows+='</div>';
  rows+='<div class="cart-total-row"><span class="cart-total-lbl">Total</span><span class="cart-total-val">$'+total.toLocaleString('es-MX')+' MX</span></div>';
  rows+='<div style="padding:0 1.35rem 1.35rem"><button class="btn-cart-checkout" onclick="checkoutCart()">\uD83D\uDCDE Pedir por WhatsApp</button></div>';
  body.innerHTML=rows;
}
function checkoutCart(){
  var c=getCart();
  if(!c.length){showToast('El carrito esta vacio');return;}
  var total=c.reduce(function(s,i){return s+i.price;},0);
  var lines='*PEDIDO CARRITO - CiberStore*\n\n';
  for(var i=0;i<c.length;i++) lines+=c[i].name+': $'+c[i].price.toLocaleString('es-MX')+' MX\n';
  lines+='\nTotal: $'+total.toLocaleString('es-MX')+' MX';
  lines+='\nMetodo de pago: Transferencia Bancaria';
  lines+='\n\nManda tu comprobante al recibir este mensaje.';
  closeCart();
  setTimeout(function(){window.open('https://wa.me/5215523371367?text='+encodeURIComponent(lines),'_blank');},400);
}
/* Add to cart button in prod cards */
var _origRenderProds=renderProds;
renderProds=function(){
  _origRenderProds();
  var g=document.getElementById('prod-grid');
  if(!g) return;
  var cards=g.querySelectorAll('.prod-card');
  cards.forEach(function(card,i){
    var p=PRODUCTS[i];
    var spent=getSpent(),tIdx=getTIdx(spent);
    var now=p.prices[tIdx];
    var addBtn=document.createElement('button');
    addBtn.className='btn-buy';addBtn.style.cssText='background:rgba(255,255,255,.08);color:var(--text);border:1px solid var(--border);margin-left:.3rem';
    addBtn.innerHTML='\u002B';addBtn.title='Agregar al carrito';
    addBtn.onclick=function(e){
      e.stopPropagation();
      addToCart({name:p.name,price:now,icon:p.isPase?'\u26D3':'\uD83D\uDC8E'});
    };
    var foot=card.querySelector('.prod-foot');
    if(foot) foot.appendChild(addBtn);
  });
};
updateCartCount();

/* ====== PINES FF ====== */
var PINES_PRODS = [
  {id:101, name:'110 Diamantes',   price:17,  icon:'\uD83D\uDC8E'},
  {id:102, name:'341 Diamantes',   price:52,  icon:'\uD83D\uDC8E'},
  {id:103, name:'572 Diamantes',   price:80,  icon:'\uD83D\uDC8E'},
  {id:104, name:'1,166 Diamantes', price:140, icon:'\uD83D\uDC8E'},
  {id:105, name:'2,398 Diamantes', price:275, icon:'\uD83D\uDC8E'},
  {id:106, name:'6,160 Diamantes', price:668, icon:'\uD83D\uDC8E'}
];
var PINES_MIN = 200;
var pinesCart = {};

function renderPinesGrid(){
  var g=document.getElementById('pines-grid');
  if(!g) return;
  var rows='';
  for(var i=0;i<PINES_PRODS.length;i++){
    var p=PINES_PRODS[i];
    var qty=pinesCart[p.id]||0;
    rows+='<div class="prod-card" style="border-color:rgba(255,208,0,.22)">'
      +'<div class="prod-thumb" style="background:linear-gradient(135deg,#120e00,#1a1400)">'
      +'<div class="prod-thumb-ico" style="color:var(--c4)">\uD83D\uDC8E</div>'
      +'</div>'
      +'<div class="prod-body">'
      +'<div class="prod-name">'+p.name+'</div>'
      +'<div class="prod-desc" style="color:rgba(255,208,0,.65)">Precio revendedor</div>'
      +'<div class="prod-foot">'
      +'<div><div class="price-now" style="color:var(--c4)">$'+p.price+' MX</div>'
      +'<div style="font-size:.6rem;color:var(--muted)">por unidad</div></div>'
      +'<div class="pines-qty">'
      +'<button class="pines-qty-btn" onclick="pinesQty('+p.id+',-1)">-</button>'
      +'<span class="pines-qty-n" id="pq-'+p.id+'">'+qty+'</span>'
      +'<button class="pines-qty-btn" onclick="pinesQty('+p.id+',1)">+</button>'
      +'</div>'
      +'</div>'
      +'</div>'
      +'</div>';
  }
  g.innerHTML=rows;
  updatePinesBar();
}

function pinesQty(id, delta){
  pinesCart[id] = Math.max(0, (pinesCart[id]||0) + delta);
  var el = document.getElementById('pq-'+id);
  if(el) el.textContent = pinesCart[id];
  updatePinesBar();
}

function getPinesTotal(){
  var total = 0;
  for(var i=0;i<PINES_PRODS.length;i++){
    var p = PINES_PRODS[i];
    total += (pinesCart[p.id]||0) * p.price;
  }
  return total;
}

function getPinesItems(){
  var items = [];
  for(var i=0;i<PINES_PRODS.length;i++){
    var p = PINES_PRODS[i];
    if(pinesCart[p.id] > 0) items.push({name:p.name, qty:pinesCart[p.id], price:p.price, subtotal:pinesCart[p.id]*p.price});
  }
  return items;
}

function updatePinesBar(){
  var total=getPinesTotal();
  var items=getPinesItems();
  var allQty=0;
  for(var i=0;i<items.length;i++) allQty+=items[i].qty;
  var bar=document.getElementById('pines-cart-bar');
  var lbl=document.getElementById('pc-items-lbl');
  var warn=document.getElementById('pc-min-warn');
  var btn=document.getElementById('pc-checkout-btn');
  if(bar) bar.style.display=(allQty>0)?'flex':'none';
  if(lbl) lbl.textContent='$'+total.toLocaleString('es-MX')+' MX ('+allQty+' unidades)';
  if(warn) warn.style.display=(total>0&&total<PINES_MIN)?'inline':'none';
  if(btn){
    btn.style.opacity=(total>=PINES_MIN)?'1':'.45';
    btn.style.cursor=(total>=PINES_MIN)?'pointer':'not-allowed';
    btn.title=(total<PINES_MIN)?('Minimo $'+PINES_MIN+' MX'):'';
  }
}

function clearPinesCart(){
  pinesCart = {};
  renderPinesGrid();
}

function checkoutPines(){
  var total = getPinesTotal();
  var items = getPinesItems();
  if(items.length === 0){ showToast('Agrega productos al carrito'); return; }
  if(total < PINES_MIN){ showToast('Minimo $'+PINES_MIN+' MX para pedir'); return; }
  // Open modal
  var ord = peekOrder();
  document.getElementById('mp-order').textContent = 'PEDIDO #'+ord;
  var namesHtml = items.map(function(i){return i.qty+'x '+i.name+' = $'+i.subtotal+' MX';}).join(' | ');
  document.getElementById('mp-name').textContent = namesHtml;
  document.getElementById('mp-price').textContent = 'Total: $'+total.toLocaleString('es-MX')+' MX';
  document.getElementById('mp-nombre').value = '';
  document.getElementById('mp-ffid').value   = '';
  document.getElementById('mp-wa').value     = '';
  document.getElementById('modal-pines').classList.add('show');
}

function closePinesModal(){
  document.getElementById('modal-pines').classList.remove('show');
}
var _mp=document.getElementById('modal-pines');if(_mp)_mp.addEventListener('click',function(e){if(e.target===this)closePinesModal();});

function submitPines(){
  var nombre = document.getElementById('mp-nombre').value.trim();
  var ffid   = document.getElementById('mp-ffid').value.trim();
  var wa2    = document.getElementById('mp-wa').value.trim();
  if(!nombre){ showToast('Ingresa tu nombre'); return; }
  if(!ffid){ showToast('Ingresa tu ID de Free Fire'); return; }
  if(!wa2 || wa2.length < 8){ showToast('Ingresa tu WhatsApp'); return; }
  var items = getPinesItems();
  var total = getPinesTotal();
  var ord   = getNextOrder();
  var msg   = '*NUEVO PEDIDO #'+ord+' - CiberStore (PINES FF)*\n\n';
  msg += 'Servicio: Pines FF Revendedor\n';
  for(var i=0;i<items.length;i++){
    msg += items[i].qty+'x '+items[i].name+' = $'+items[i].subtotal+' MX\n';
  }
  msg += '\nTotal: $'+total.toLocaleString('es-MX')+' MX';
  msg += '\nMetodo de pago: Transferencia Bancaria';
  msg += '\n\nNombre: '+nombre;
  msg += '\nID Free Fire: '+ffid;
  msg += '\nWhatsApp: '+wa2;
  msg += '\n\nManda tu comprobante con el numero #'+ord;
  closePinesModal();
  addToHistory({name:'Pines FF - '+items.length+' productos',price:total,icon:'\uD83D\uDC8E',date:new Date().toLocaleDateString('es-MX',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}),order:ord});
  addSpend(total);
  refreshUI();
  setTimeout(function(){window.open('https://wa.me/'+WA+'?text='+encodeURIComponent(msg),'_blank');},500);
  clearPinesCart();
}

/* Render pines when page opened */
var _gp2 = goPage;
goPage = function(id){
  _gp2(id);
  if(id === 'pines') renderPinesGrid();
};

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

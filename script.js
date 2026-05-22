/* ================================================================
   CiberStore script.js \u2014 Full rebuild
   supabase_integration.js loads BEFORE this file and provides:
   doLogin, doRegister, loginUser, doGuest, doLogout,
   hashPass, getSpent, addSpend, addToHistory,
   getPromoCodes, savePromoCodes, recordPromoUse,
   submitResena, renderResenas, renderChat, postChatMsg,
   likeMsg, deleteChatMsg, renderAdminUsers, renderAdminStats2,
   renderAdminCodes, renderAdminStats, admAddSaldo, admAddGasto,
   admEditUser, admResetPass, admDeleteUser, admLoadChat,
   admDeleteChatMsg, renderSalesDash, exportCSV, sbGetUser
================================================================ */

/* \u2500\u2500 DATA \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
var WA = '5215548461200';

var PRODUCTS = [
  {id:1,  name:'110',    total:110,   bonus:10,  region:'LATAM & BR', prices:[17,17,17,17,17],       badge:null,        isPase:false, popular:false},
  {id:2,  name:'341',    total:341,   bonus:31,  region:'LATAM & BR', prices:[60,60,60,60,60],        badge:'POPULAR',   isPase:false, popular:true},
  {id:3,  name:'572',    total:572,   bonus:52,  region:'LATAM & BR', prices:[85,85,85,85,85],        badge:null,        isPase:false, popular:false},
  {id:4,  name:'1,166',  total:1166,  bonus:106, region:'LATAM & BR', prices:[175,173,170,168,166],   badge:'OFERTA',    isPase:false, popular:false},
  {id:5,  name:'2,398',  total:2398,  bonus:218, region:'LATAM & BR', prices:[310,306,302,298,294],   badge:null,        isPase:false, popular:false},
  {id:6,  name:'6,160',  total:6160,  bonus:560, region:'LATAM & BR', prices:[770,760,750,740,730],   badge:'GRAN VALOR',isPase:false, popular:false},
  {id:7,  name:'12,320', total:12320, bonus:1120,region:'LATAM & BR', prices:[1540,1520,1500,1480,1460],badge:null,      isPase:false, popular:false},
  {id:8,  name:'18,480', total:18480, bonus:1680,region:'LATAM & BR', prices:[2310,2280,2250,2220,2190],badge:'MEGA',    isPase:false, popular:false},
  {id:11, name:'Pase Elite',total:0,  bonus:0,   region:'LATAM & BR', prices:[45,45,45,45,45],        badge:null,        isPase:true,  popular:false}
];

var LIKES = [
  {id:1, label:'Inicio',          emoji:'\uD83E\uDD49', priceMX:79,  priceUSD:4.1,  total:1400,  perDay:220, days:7,   color:'#cc7700'},
  {id:2, label:'Bronce',          emoji:'\uD83E\uDD48', priceMX:99,  priceUSD:5.1,  total:2200,  perDay:220, days:10,  color:'#a05530'},
  {id:3, label:'Plata',           emoji:'\uD83E\uDD47', priceMX:129, priceUSD:6.6,  total:3300,  perDay:220, days:15,  color:'#8899aa', popular:true},
  {id:4, label:'Oro',             emoji:'\uD83D\uDC8E', priceMX:159, priceUSD:8.1,  total:4400,  perDay:220, days:20,  color:'#ffd000'},
  {id:5, label:'Diamante',        emoji:'\u26A1',        priceMX:189, priceUSD:9.7,  total:5500,  perDay:220, days:25,  color:'#00aaff'},
  {id:6, label:'Mensual Completo',emoji:'\uD83D\uDC51',  priceMX:219, priceUSD:11.2, total:6600,  perDay:220, days:30,  color:'#7c3aed', best:true},
  {id:7, label:'Ultra',           emoji:'\uD83D\uDE80',  priceMX:279, priceUSD:14.2, total:8800,  perDay:220, days:40,  color:'#00f5ff'},
  {id:8, label:'Supreme',         emoji:'\uD83D\uDD25',  priceMX:349, priceUSD:17.8, total:11000, perDay:220, days:50,  color:'#ff4422'},
  {id:9, label:'MEGA PACK VIP',   emoji:'\uD83C\uDF1F',  priceMX:899, priceUSD:45.8, total:30000, perDay:220, days:136, color:'#f0b90b', isVip:true, origMX:1299}
];

var HONOR = [
  {region:'Norteamerica',flag:'\uD83C\uDDE8\uD83C\uDDE6',color:var_c4||'#ffd000',price:340},
  {region:'Estados Unidos',flag:'\uD83C\uDDFA\uD83C\uDDF8',color:'#4dabf7',price:160},
  {region:'Sudamerica',flag:'\uD83C\uDDE7\uD83C\uDDF7',color:'#40c057',price:340},
  {region:'Europa',flag:'\uD83C\uDDEA\uD83C\uDDFA',color:'#b39ddb',price:340}
];

var TIERS = [
  {id:'free',     name:'Visitante', color:'#8892a4', colorBg:'rgba(136,146,164,.1)', threshold:0,     perks:['Precio base'],                    disc:0,  icon:'\uD83D\uDC64'},
  {id:'silver',   name:'Plata',     color:'#c0c0c0', colorBg:'rgba(192,192,192,.1)', threshold:500,   perks:['2% descuento','Acceso likes'],     disc:2,  icon:'\uD83E\uDD48'},
  {id:'gold',     name:'Oro',       color:'#ffd700', colorBg:'rgba(255,215,0,.1)',   threshold:2000,  perks:['5% descuento','Soporte prioritario'],disc:5, icon:'\uD83E\uDD47'},
  {id:'diamond',  name:'Diamante',  color:'#00aaff', colorBg:'rgba(0,170,255,.1)',   threshold:6000,  perks:['8% descuento','Bundle gratis'],     disc:8,  icon:'\uD83D\uDC8E'},
  {id:'legend',   name:'Leyenda',   color:'#ff4422', colorBg:'rgba(255,68,34,.1)',   threshold:15000, perks:['12% descuento','VIP exclusivo'],    disc:12, icon:'\uD83D\uDD25'}
];

var EXP_PACKAGES = [
  {id:'exp5',  days:5,  exp:250000,  priceMX:200, priceUSD:15},
  {id:'exp10', days:10, exp:500000,  priceMX:300, priceUSD:25},
  {id:'exp15', days:15, exp:750000,  priceMX:400, priceUSD:35},
  {id:'exp20', days:20, exp:1000000, priceMX:500, priceUSD:45},
  {id:'exp25', days:25, exp:1250000, priceMX:600, priceUSD:55},
  {id:'exp30', days:30, exp:1500000, priceMX:700, priceUSD:65}
];

var HONOR_CUENTA_PRICE = 200;
var ADMIN_EMAIL2 = 'ciberstore@admin.com';
var ADMIN_PASS2  = 'ciberstore26';
var adminAuthed  = false;
var authSession  = null;
var isGuest      = false;
var selectedStars = 0;
var selectedExpPkg = null;
var curId = null;
var activePromo = null;
var ffQtyMap = {};
var ruletaSpinning = false;
var ruletaAngle = 0;
var liveCount = Math.floor(Math.random()*30)+28;
var obStep = 0;

/* \u2500\u2500 CURRENCY / LANG \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
var LANG     = localStorage.getItem('cs_lang')     || 'es';
var CURRENCY = localStorage.getItem('cs_currency') || 'MXN';
var RATES    = {MXN:1, USD:0.051, EUR:0.047, ARS:50.2, PEN:0.19};
var CUR_SYM  = {MXN:'$', USD:'$', EUR:'\u20AC', ARS:'$', PEN:'S/'};
var CUR_SUF  = {MXN:' MX', USD:' USD', EUR:' EUR', ARS:' ARS', PEN:' PEN'};

function fmt(mxn){
  if(!mxn&&mxn!==0) return '';
  var rate=RATES[CURRENCY]||1, sym=CUR_SYM[CURRENCY]||'$', suf=CUR_SUF[CURRENCY]||'';
  var val=mxn*rate, str;
  if(CURRENCY==='MXN') str=sym+Math.round(val).toLocaleString('es-MX');
  else if(CURRENCY==='ARS') str=sym+Math.round(val).toLocaleString('es-AR');
  else str=sym+val.toFixed(2);
  return str+suf;
}

function changeLang(lang){
  LANG=lang; localStorage.setItem('cs_lang',lang);
  applyTranslations(); refreshUI();
}
function changeCurrency(cur){
  CURRENCY=cur; localStorage.setItem('cs_currency',cur);
  refreshUI();
  var page=document.querySelector('.page.active');
  if(page){
    var id=page.id.replace('page-','');
    if(id==='diamantes') renderProds();
    if(id==='likes') renderLikes();
    if(id==='membresia'){renderMems();renderWallet();}
  }
  var cart=document.getElementById('modal-cart');
  if(cart&&cart.classList.contains('show')) renderCartModal();
}

function t(k){
  var TR={
    es:{nav_home:'Inicio',nav_diamantes:'Diamantes FF',nav_likes:'Likes Perfil',
        nav_honor:'Honor de Clan',nav_clanes:'Venta de Clanes',nav_codigos:'Codigos FF',
        nav_cajas:'Cajas Evolutiva',nav_canal:'Canal WhatsApp',nav_perfil:'Mi Perfil',
        nav_saldo:'Recargar Saldo',nav_miscompras:'Mis Compras',nav_membresia:'Mi Rango',
        buy_btn:'Comprar',add_cart:'+Carrito',get_plan:'Obtener plan',
        best_seller:'MAS VENDIDO',modal_f1:'Tu ID de Free Fire',
        modal_f2:'Confirmar ID',modal_f3:'Nombre completo',modal_f4:'Numero de WhatsApp',
        modal_promo:'Codigo Promocional',modal_optional:'(opcional)',
        modal_confirm:'Confirmar y abrir WhatsApp',
        modal_note:'Despues envia tu comprobante al WhatsApp con tu numero de pedido',
        empty_cart:'Tu carrito esta vacio',choose_qty:'Elige la cantidad primero',
        savings:'Ahorras',banner_txt:'ENTREGA AUTOMATICA 24/7 | MAS COMPRAS = MAS DESCUENTOS | PAGOS SEGUROS'},
    en:{nav_home:'Home',nav_diamantes:'FF Diamonds',nav_likes:'Profile Likes',
        nav_honor:'Clan Honor',nav_clanes:'Clan Sales',nav_codigos:'FF Codes',
        nav_cajas:'Evolutive Boxes',nav_canal:'WhatsApp Channel',nav_perfil:'My Profile',
        nav_saldo:'Add Funds',nav_miscompras:'My Orders',nav_membresia:'My Rank',
        buy_btn:'Buy',add_cart:'+Cart',get_plan:'Get plan',
        best_seller:'BEST SELLER',modal_f1:'Your Free Fire ID',
        modal_f2:'Confirm ID',modal_f3:'Full name',modal_f4:'WhatsApp number',
        modal_promo:'Promo Code',modal_optional:'(optional)',
        modal_confirm:'Confirm and open WhatsApp',
        modal_note:'Then send your receipt to WhatsApp with your order number',
        empty_cart:'Your cart is empty',choose_qty:'Choose quantity first',
        savings:'You save',banner_txt:'INSTANT DELIVERY 24/7 | MORE PURCHASES = MORE DISCOUNTS | SECURE PAYMENTS'}
  };
  return (TR[LANG]&&TR[LANG][k])||(TR['es'][k])||k;
}

function applyTranslations(){
  var navMap={
    'ni-home':'nav_home','ni-diamantes':'nav_diamantes','ni-likes':'nav_likes',
    'ni-honor':'nav_honor','ni-clanes':'nav_clanes','ni-codigos':'nav_codigos',
    'ni-cajas':'nav_cajas','ni-perfil':'nav_perfil','ni-saldo':'nav_saldo',
    'ni-miscompras':'nav_miscompras','ni-membresia':'nav_membresia'
  };
  for(var id in navMap){
    var el=document.getElementById(id);
    if(!el) continue;
    var ico=el.querySelector('.nav-ico');
    var nb=el.querySelector('.nb');
    var icoH=ico?ico.outerHTML:'';
    var nbH=nb?' '+nb.outerHTML:'';
    el.innerHTML=icoH+' '+t(navMap[id])+nbH;
  }
  var l1=document.getElementById('lbl1');
  var l2=document.getElementById('lbl2');
  var l3=document.getElementById('lbl3');
  if(l1) l1.textContent=t('modal_f1');
  if(l2) l2.textContent=t('modal_f2');
  if(l3) l3.textContent=t('modal_f3');
  var sub=document.getElementById('btn-submit');
  if(sub) sub.innerHTML='\uD83D\uDCF1 '+t('modal_confirm');
  var ban=document.getElementById('banner-txt');
  if(ban) ban.textContent=t('banner_txt');
  var ls=document.getElementById('lang-select');
  var cs=document.getElementById('currency-select');
  if(ls) ls.value=LANG;
  if(cs) cs.value=CURRENCY;
  renderProds();
  renderLikes();
}

/* \u2500\u2500 TIERS / SPENT \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
function getTier(spent){
  var tier=TIERS[0];
  for(var i=TIERS.length-1;i>=0;i--){
    if(spent>=TIERS[i].threshold){tier=TIERS[i];break;}
  }
  return tier;
}
function getTIdx(spent){
  for(var i=TIERS.length-1;i>=0;i--){
    if(spent>=TIERS[i].threshold) return i;
  }
  return 0;
}

/* \u2500\u2500 ORDERS \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
function getNextOrder(){
  var n=parseInt(localStorage.getItem('cs_ord')||'999')+1;
  localStorage.setItem('cs_ord',n);
  return n;
}
function peekOrder(){
  return parseInt(localStorage.getItem('cs_ord')||'999')+1;
}

/* \u2500\u2500 HISTORY (local cache) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
function getHistory(){
  try{return JSON.parse(localStorage.getItem('cs_hist_'+(authSession?authSession.username:'guest'))||'[]');}
  catch(e){return [];}
}
function saveHistory(h){
  localStorage.setItem('cs_hist_'+(authSession?authSession.username:'guest'),JSON.stringify(h.slice(0,50)));
}
function addToHistoryLocal(item){
  var h=getHistory();
  h.unshift(item);
  saveHistory(h);
  addToHistory(item); /* Supabase sync */
}
function clearHistory(){
  localStorage.removeItem('cs_hist_'+(authSession?authSession.username:'guest'));
  renderPerfil();
}
function clearHistMC(){
  clearHistory(); renderMisCompras();
}

/* \u2500\u2500 CART \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
function getCart(){
  try{return JSON.parse(localStorage.getItem('cs_cart')||'[]');}catch(e){return [];}
}
function saveCart(c){ localStorage.setItem('cs_cart',JSON.stringify(c)); }
function addToCart(item){
  var c=getCart();
  c.push({id:Date.now(),name:item.name,price:item.price,icon:item.icon||'\uD83D\uDC8E'});
  saveCart(c); updateCartCount();
  showToast(item.name+' agregado al carrito',2000);
}
function removeFromCart(id){
  saveCart(getCart().filter(function(i){return i.id!==id;}));
  renderCartModal(); updateCartCount();
}
function clearCart(){ saveCart([]); renderCartModal(); updateCartCount(); }
function updateCartCount(){
  var c=getCart(), el=document.getElementById('cart-count');
  if(!el) return;
  el.textContent=c.length;
  el.className='cart-count'+(c.length>0?' vis':'');
}
function openCart(){
  if(!authSession){showToast('Inicia sesion para usar el carrito');setTimeout(showAuthModal,600);return;}
  renderCartModal();
  var el=document.getElementById('modal-cart');
  if(el) el.classList.add('show');
}
function closeCart(){
  var el=document.getElementById('modal-cart');
  if(el) el.classList.remove('show');
}
function renderCartModal(){
  var body=document.getElementById('cart-modal-body');
  if(!body) return;
  var c=getCart();
  if(!c.length){body.innerHTML='<div class="cart-empty">'+t('empty_cart')+'</div>';return;}
  var total=c.reduce(function(s,i){return s+i.price;},0);
  var rows='<div style="padding:0 .5rem">';
  for(var i=0;i<c.length;i++){
    var it=c[i];
    rows+='<div class="cart-item-row">'
      +'<div class="cart-item-ico">'+it.icon+'</div>'
      +'<div class="cart-item-name">'+it.name+'</div>'
      +'<div class="cart-item-price">'+fmt(it.price)+'</div>'
      +'<button class="cart-item-del" data-id="'+it.id+'" onclick="removeFromCart(+this.dataset.id)">\xD7</button>'
      +'</div>';
  }
  rows+='</div>';
  rows+='<div class="cart-total-row"><span class="cart-total-lbl">Total</span><span class="cart-total-val">'+fmt(total)+'</span></div>';
  rows+='<div style="padding:0 1.25rem 1.25rem"><button class="btn-cart-checkout" onclick="checkoutCart()">\uD83D\uDCDE Pedir por WhatsApp</button></div>';
  body.innerHTML=rows;
}
function checkoutCart(){
  var c=getCart();
  if(!c.length){showToast(t('empty_cart'));return;}
  var total=c.reduce(function(s,i){return s+i.price;},0);
  var lines='*PEDIDO CARRITO - CiberStore*\n\n';
  for(var i=0;i<c.length;i++) lines+=c[i].name+': $'+c[i].price.toLocaleString('es-MX')+' MX\n';
  lines+='\nTotal: $'+total.toLocaleString('es-MX')+' MX\nMetodo: Transferencia Bancaria\n\nManda comprobante al recibir este mensaje.';
  closeCart();
  setTimeout(function(){window.open('https://wa.me/'+WA+'?text='+encodeURIComponent(lines),'_blank');},400);
}

/* \u2500\u2500 DIAMOND QTY \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
function ffQty(id, delta){
  ffQtyMap[id]=Math.max(0,(ffQtyMap[id]||0)+delta);
  var el=document.getElementById('ffq-'+id);
  if(el) el.textContent=ffQtyMap[id];
}
function ffAddCart(id){
  var qty=ffQtyMap[id]||0;
  if(qty===0){showToast(t('choose_qty'));return;}
  var p=null;
  for(var i=0;i<PRODUCTS.length;i++){if(PRODUCTS[i].id===id){p=PRODUCTS[i];break;}}
  if(!p) return;
  var now=p.prices[getTIdx(getSpent())];
  for(var q=0;q<qty;q++) addToCart({name:p.name+' Diamantes',price:now,icon:'\uD83D\uDC8E'});
  ffQtyMap[id]=0;
  var el=document.getElementById('ffq-'+id);
  if(el) el.textContent='0';
  showToast(qty+'x '+p.name+' Diamantes al carrito',2000);
}

/* \u2500\u2500 SIDEBAR / TOPBAR \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
function toggleSB(){
  var sb=document.getElementById('sidebar');
  var ov=document.getElementById('overlay');
  if(sb){sb.classList.toggle('open');}
  if(ov){ov.classList.toggle('open');}
}
function closeSB(){
  var sb=document.getElementById('sidebar');
  var ov=document.getElementById('overlay');
  if(sb) sb.classList.remove('open');
  if(ov) ov.classList.remove('open');
}
function updateSidebarUser(){
  var spent=getSpent();
  var tier=getTier(spent);
  var tIdx=getTIdx(spent);
  var nextTier=TIERS[tIdx+1];
  var uname=authSession?authSession.username:'Visitante';
  var av=document.getElementById('sb-av');
  var un=document.getElementById('sb-uname');
  var us=document.getElementById('sb-uspent');
  var pf=document.getElementById('sb-prog-fill');
  var mp=document.getElementById('mem-pill');
  if(av) av.textContent=uname.charAt(0).toUpperCase();
  if(un) un.textContent=uname;
  if(us) us.textContent='$'+spent.toLocaleString('es-MX')+' MX gastado';
  if(pf){
    var pct=nextTier?Math.min(100,Math.round(((spent-tier.threshold)/(nextTier.threshold-tier.threshold))*100)):100;
    pf.style.width=pct+'%';
  }
  if(mp&&authSession){
    mp.style.display='flex';
    mp.textContent=tier.name;
    mp.style.color=tier.color;
    mp.style.borderColor=tier.color+'44';
    mp.style.background=tier.colorBg;
  }
}

/* \u2500\u2500 AUTH UI \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
function showAuthModal(){
  var el=document.getElementById('auth-modal');
  if(el) el.style.display='flex';
  authTab('login');
}
function hideAuthModal(){
  var el=document.getElementById('auth-modal');
  if(el) el.style.display='none';
}
function authTab(tab){
  var panels=['auth-login','auth-register','auth-admin'];
  var tabIds=['atab-login','atab-register','atab-admin'];
  for(var i=0;i<panels.length;i++){
    var pe=document.getElementById(panels[i]);
    var te=document.getElementById(tabIds[i]);
    if(pe) pe.style.display='none';
    if(te) te.className='auth-tab';
  }
  var se=document.getElementById('auth-'+tab);
  var st=document.getElementById('atab-'+tab);
  if(se) se.style.display='block';
  if(st) st.className='auth-tab active';
  if(tab==='admin'&&adminAuthed){
    var dl=document.getElementById('adm-auth-login');
    var dd=document.getElementById('adm-auth-dash');
    if(dl) dl.style.display='none';
    if(dd){dd.style.display='block';renderAdminStats2();admSubTab('dash');}
  }
}
function updateAuthUI(){
  var pill=document.getElementById('user-pill');
  var pillAv=document.getElementById('user-pill-av');
  var pillName=document.getElementById('user-pill-name');
  var u=authSession?authSession.username:null;
  if(u){
    if(pill) pill.style.display='flex';
    if(pillAv) pillAv.textContent=u.charAt(0).toUpperCase();
    if(pillName) pillName.textContent=u;
  } else {
    if(pill) pill.style.display='none';
  }
  updateSidebarUser();
}
function openUserMenu(){
  if(!authSession) return;
  if(confirm('Usuario: '+authSession.username+'\n\nDeseas cerrar sesion?')) doLogout();
}

/* \u2500\u2500 ADMIN \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
function doAdminLogin(){
  var email=((document.getElementById('adm-auth-email')||{}).value||'').trim().toLowerCase();
  var pass=((document.getElementById('adm-auth-pass')||{}).value||'').trim();
  var err=document.getElementById('adm-auth-err');
  if(email!==ADMIN_EMAIL2||pass!==ADMIN_PASS2){
    if(err){err.textContent='Credenciales incorrectas';err.style.display='block';}
    return;
  }
  adminAuthed=true;
  if(err) err.style.display='none';
  var dl=document.getElementById('adm-auth-login');
  var dd=document.getElementById('adm-auth-dash');
  if(dl) dl.style.display='none';
  if(dd) dd.style.display='block';
  renderAdminStats2();
  admSubTab('dash');
}
function doAdminLogout(){
  adminAuthed=false;
  var dl=document.getElementById('adm-auth-login');
  var dd=document.getElementById('adm-auth-dash');
  if(dl) dl.style.display='block';
  if(dd) dd.style.display='none';
  var ae=document.getElementById('adm-auth-email');
  var ap=document.getElementById('adm-auth-pass');
  if(ae) ae.value=''; if(ap) ap.value='';
}
function admSubTab(tab){
  var tabs=['dash','users','codes','chat'];
  for(var i=0;i<tabs.length;i++){
    var panel=document.getElementById('adm-tab-'+tabs[i]);
    var btn=document.getElementById('adm-stab-'+tabs[i]);
    if(panel) panel.style.display=tabs[i]===tab?'block':'none';
    if(btn){
      var colors={dash:['rgba(124,58,237,.2)','rgba(124,58,237,.45)','#a78bfa'],
                  users:['rgba(0,170,255,.12)','rgba(0,170,255,.35)','var(--c1)'],
                  codes:['rgba(0,230,118,.1)','rgba(0,230,118,.3)','#00e676'],
                  chat:['rgba(255,165,0,.1)','rgba(255,165,0,.3)','#ffa500']};
      var cc=tabs[i]===tab?(colors[tabs[i]]||colors.dash):null;
      if(cc){btn.style.background=cc[0];btn.style.borderColor=cc[1];btn.style.color=cc[2];}
      else{btn.style.background='rgba(255,255,255,.04)';btn.style.borderColor='rgba(255,255,255,.1)';btn.style.color='var(--muted)';}
    }
  }
  if(tab==='dash')  setTimeout(renderSalesDash,80);
  if(tab==='users') setTimeout(renderAdminUsers,80);
  if(tab==='codes') setTimeout(function(){renderAdminCodes();renderAdminStats();},80);
  if(tab==='chat')  setTimeout(admLoadChat,80);
}
function adminLogin(){ doAdminLogin(); }
function adminLogout(){ doAdminLogout(); }
function adminCreateCode(){
  var code=((document.getElementById('adm-code')||{}).value||'').trim().toUpperCase();
  var disc=parseInt((document.getElementById('adm-disc')||{}).value||'0');
  var uses=parseInt((document.getElementById('adm-uses')||{}).value||'0');
  var desc=((document.getElementById('adm-desc')||{}).value||'').trim();
  var msg=document.getElementById('adm-create-msg');
  if(!code||code.length<3){showAdminMsg(msg,'Codigo muy corto','#ff5252');return;}
  if(disc<1||disc>99){showAdminMsg(msg,'Descuento 1-99%','#ff5252');return;}
  if(uses<1){showAdminMsg(msg,'Usos mayor a 0','#ff5252');return;}
  var codes=getPromoCodes();
  for(var i=0;i<codes.length;i++){if(codes[i].code===code){showAdminMsg(msg,'Codigo ya existe','#ff5252');return;}}
  codes.push({code:code,disc:disc,maxUses:uses,uses:0,desc:desc,active:true,
    created:new Date().toLocaleDateString('es-MX')});
  savePromoCodes(codes);
  var dc=document.getElementById('adm-code');
  var dd=document.getElementById('adm-disc');
  var du=document.getElementById('adm-uses');
  var ddesc=document.getElementById('adm-desc');
  if(dc) dc.value=''; if(dd) dd.value=''; if(du) du.value=''; if(ddesc) ddesc.value='';
  showAdminMsg(msg,'Codigo '+code+' creado!','#00e676');
  renderAdminCodes(); renderAdminStats();
}
function adminDeleteCode(code){
  if(!confirm('Eliminar codigo '+code+'?')) return;
  savePromoCodes(getPromoCodes().filter(function(c){return c.code!==code;}));
  renderAdminCodes(); renderAdminStats();
}
function adminToggleCode(code){
  var codes=getPromoCodes();
  for(var i=0;i<codes.length;i++){if(codes[i].code===code){codes[i].active=!codes[i].active;break;}}
  savePromoCodes(codes); renderAdminCodes();
}
function showAdminMsg(el,text,color){
  if(!el) return;
  el.style.display='block'; el.style.color=color; el.textContent=text;
  setTimeout(function(){el.style.display='none';},4000);
}
function openAdmin(){
  showAuthModal();
  setTimeout(function(){authTab('admin');},80);
}
function closeAdmin(){
  var el=document.getElementById('auth-modal');
  if(el) el.style.display='none';
}

/* \u2500\u2500 PAGES \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
function goPage(id){
  document.querySelectorAll('.page').forEach(function(p){p.classList.remove('active');});
  document.querySelectorAll('.nav-item').forEach(function(n){n.classList.remove('active');});
  var pg=document.getElementById('page-'+id);
  var ni=document.getElementById('ni-'+id);
  if(pg) pg.classList.add('active');
  if(ni) ni.classList.add('active');
  closeSB();
  window.scrollTo(0,0);
  if(id==='diamantes') renderProds();
  if(id==='likes') renderLikes();
  if(id==='membresia'){renderMems();renderWallet();}
  if(id==='perfil') renderPerfil();
  if(id==='miscompras') renderMisCompras();
  if(id==='honorcuenta') setTimeout(renderExpPackages,50);
  if(id==='referidos') setTimeout(renderReferidos,50);
  if(id==='home'){setTimeout(renderResenas,50);}
  if(id==='comunidad') setTimeout(renderChat,50);
}

function refreshUI(){
  updateSidebarUser();
  var active=document.querySelector('.page.active');
  if(active){
    var id=active.id.replace('page-','');
    if(id==='diamantes') renderProds();
    if(id==='likes') renderLikes();
    if(id==='membresia'){renderMems();renderWallet();}
    if(id==='perfil') renderPerfil();
    if(id==='miscompras') renderMisCompras();
    if(id==='home') setTimeout(renderResenas,100);
  }
}

/* \u2500\u2500 RENDER PRODS \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
function renderProds(){
  var g=document.getElementById('prod-grid');
  if(!g) return;
  var spent=getSpent(), tIdx=getTIdx(spent);
  var rows='';
  for(var i=0;i<PRODUCTS.length;i++){
    var p=PRODUCTS[i];
    var base=p.prices[0], now=p.prices[tIdx], hasDisc=tIdx>0&&(base-now)>0;
    var badgeHtml='';
    if(p.popular) badgeHtml='<div class="ff-badge ff-badge-hot">'+t('best_seller')+'</div>';
    else if(p.badge) badgeHtml='<div class="ff-badge ff-badge-normal">'+p.badge+'</div>';
    var bonusHtml=p.bonus>0?'<div class="ff-bonus">+'+p.bonus+' BONUS</div>':'';
    var origHtml=hasDisc?'<span class="ff-price-orig">'+fmt(base)+'</span>':'';
    rows+='<div class="ff-card" onclick="openProdModal('+p.id+')"'+(p.popular?' style="border-color:rgba(240,165,0,.3)"':'')+' >'
      +badgeHtml
      +'<div class="ff-top"><span class="ff-ico">\uD83D\uDC8E</span><span class="ff-num">'+p.name+'</span></div>'
      +bonusHtml
      +'<span class="ff-price">'+fmt(now)+'</span>'
      +origHtml
      +'<div class="ff-qty-row" onclick="event.stopPropagation()">'
      +'<div class="ff-qty">'
      +'<button class="ff-qty-btn" onclick="ffQty('+p.id+',-1)">-</button>'
      +'<span class="ff-qty-n" id="ffq-'+p.id+'">0</span>'
      +'<button class="ff-qty-btn" onclick="ffQty('+p.id+',1)">+</button>'
      +'</div>'
      +'<button class="ff-cart-btn" onclick="ffAddCart('+p.id+')">'+t('add_cart')+'</button>'
      +'</div>'
      +'</div>';
  }
  g.innerHTML=rows;
}

/* \u2500\u2500 RENDER LIKES \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
function renderLikes(){
  var g=document.getElementById('likes-grid');
  if(!g) return;
  var rows='';
  for(var i=0;i<LIKES.length;i++){
    var p=LIKES[i];
    var isVip=p.isVip||false;
    var cls='lk-card'+(p.popular?' lk-popular':'')+(p.best?' lk-best':'')+(isVip?' lk-vip':'');
    var card='<div class="'+cls+'" onclick="openLikeModal('+p.id+')" style="--lk-clr:'+p.color+';border-color:'+p.color+'22">';
    if(p.popular) card+='<div class="lk-ribbon">POPULAR</div>';
    if(p.best) card+='<div class="lk-ribbon" style="background:linear-gradient(90deg,#00a87a,#00f5d4);color:#002a22">MEJOR VALOR</div>';
    if(isVip) card+='<div class="lk-ribbon" style="background:linear-gradient(90deg,#c97b00,#f0b90b);color:#1a0a00">VIP</div>';
    card+='<div class="lk-top"><div class="lk-ico">'+p.emoji+'</div>';
    card+='<div style="flex:1"><div class="lk-label">'+p.label+'</div>';
    card+='<div class="lk-total">'+p.total.toLocaleString()+'<span> likes</span></div></div></div>';
    card+='<div class="lk-price-row">';
    if(isVip&&p.origMX){
      card+='<div><div style="text-decoration:line-through;font-size:.78rem;color:var(--muted);font-family:Orbitron">'+fmt(p.origMX)+'</div>';
      card+='<div class="lk-price">'+fmt(p.priceMX)+'<span> MX</span></div></div>';
    } else {
      card+='<div class="lk-price">'+fmt(p.priceMX)+'<span> MX</span></div>';
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
      card+='<div style="font-size:.68rem;color:#f0b90b;font-weight:700">\uD83C\uDF73 Incluye:</div>';
      card+='<div style="font-size:.65rem;color:var(--muted)">\u2B50 Prioridad de entrega</div>';
      card+='<div style="font-size:.65rem;color:var(--muted)">\uD83C\uDF81 Bonus sorpresa</div>';
      card+='</div>';
    }
    card+='<button class="lk-btn" onclick="event.stopPropagation();openLikeModal('+p.id+')">'+t('get_plan')+'</button>';
    card+='</div>';
    rows+=card;
  }
  g.innerHTML=rows;
}

/* \u2500\u2500 RENDER MEMS / WALLET \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
function renderMems(){
  var g=document.getElementById('mem-grid');
  if(!g) return;
  var spent=getSpent(), cTIdx=getTIdx(spent);
  var rows='';
  for(var i=0;i<TIERS.length;i++){
    var tier=TIERS[i];
    var isCurrent=i===cTIdx;
    rows+='<div class="mem-card" style="border-color:'+(isCurrent?tier.color+'55':'')+';">'
      +(isCurrent?'<div class="mc-badge-top" style="background:'+tier.color+';color:#000">ACTUAL</div>':'')
      +'<span class="mc-icon">'+tier.icon+'</span>'
      +'<div class="mc-name" style="color:'+tier.color+'">'+tier.name+'</div>'
      +'<div class="mc-disc" style="color:'+tier.color+'">'+tier.disc+'%</div>'
      +'<div class="mc-disc-sub">de descuento</div>'
      +'<div class="mc-req">Desde $'+tier.threshold.toLocaleString('es-MX')+' MX gastado</div>'
      +'<ul class="mc-perks">'
      +tier.perks.map(function(pk){return '<li>\u2714 '+pk+'</li>';}).join('')
      +'</ul>'
      +'<button class="btn-mem" style="border-color:'+tier.color+';color:'+tier.color+'">'+(isCurrent?'Nivel actual':'Desbloquear')+'</button>'
      +'</div>';
  }
  g.innerHTML=rows;
}
function renderWallet(){
  var wb=document.getElementById('wallet-box');
  if(!wb) return;
  var spent=getSpent(), tIdx=getTIdx(spent), tier=TIERS[tIdx];
  var nextTier=TIERS[tIdx+1];
  var pct=nextTier?Math.min(100,Math.round(((spent-tier.threshold)/(nextTier.threshold-tier.threshold))*100)):100;
  wb.innerHTML='<div class="w-row">'
    +'<div><div style="font-size:.65rem;color:var(--muted);letter-spacing:1.5px;text-transform:uppercase;margin-bottom:.15rem">Total gastado</div>'
    +'<div class="w-amt">'+fmt(spent)+'</div></div>'
    +'<div style="text-align:right"><div style="font-size:.65rem;color:var(--muted);letter-spacing:1.5px;text-transform:uppercase;margin-bottom:.15rem">Tu rango</div>'
    +'<div class="w-lvl" style="color:'+tier.color+'">'+tier.icon+' '+tier.name+'</div></div>'
    +'</div>'
    +'<div class="prog-track"><div class="prog-fill" style="width:'+pct+'%;background:linear-gradient(90deg,'+tier.color+','+tier.color+'cc)"></div></div>'
    +(nextTier?'<div style="font-size:.72rem;color:var(--muted);text-align:right">$'+((nextTier.threshold-spent).toLocaleString('es-MX'))+' MX para '+nextTier.name+'</div>':'<div style="font-size:.72rem;color:'+tier.color+';text-align:right">\uD83C\uDFC6 Nivel maximo!</div>')
    +'<div class="tier-pills">'
    +TIERS.map(function(tr,idx){return '<span class="tier-pill" style="color:'+tr.color+';border-color:'+tr.color+'44;background:'+tr.colorBg+'">'+(idx<=tIdx?'\u2714':'')+' '+tr.name+'</span>';}).join('')
    +'</div>';
}

/* \u2500\u2500 PERFIL \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
function saveUsername(){
  var inp=document.getElementById('pf-name-input');
  if(!inp||!inp.value.trim()) return;
  var name=inp.value.trim().slice(0,20);
  localStorage.setItem('cs_uname',name);
  var nd=document.getElementById('pf-name-display');
  if(nd) nd.textContent=name;
  var sbu=document.getElementById('sb-uname');
  if(sbu&&!authSession) sbu.textContent=name;
  showToast('Nombre guardado: '+name);
}
function getUsername(){
  return authSession?authSession.username:(localStorage.getItem('cs_uname')||'Sin nombre');
}
function renderPerfil(){
  var spent=getSpent(), tIdx=getTIdx(spent), tier=TIERS[tIdx];
  var uname=getUsername();
  var av=document.getElementById('pf-avatar');
  var un=document.getElementById('pf-username');
  var tb=document.getElementById('pf-tier-badge');
  var sp=document.getElementById('pf-spent-total');
  var s1=document.getElementById('pf-stat-orders');
  var s2=document.getElementById('pf-stat-spent');
  var s3=document.getElementById('pf-stat-level');
  var nd=document.getElementById('pf-name-display');
  var ni=document.getElementById('pf-name-input');
  if(av) av.textContent=uname.charAt(0).toUpperCase();
  if(un) un.textContent=uname;
  if(tb){tb.textContent=tier.icon+' '+tier.name;tb.style.color=tier.color;tb.style.borderColor=tier.color+'44';tb.style.background=tier.colorBg;}
  if(sp) sp.textContent=fmt(spent)+' gastado en total';
  var hist=getHistory();
  if(s1) s1.textContent=hist.length;
  if(s2) s2.textContent=fmt(spent);
  if(s3) s3.textContent=tIdx+1;
  if(nd) nd.textContent=uname;
  if(ni) ni.placeholder=uname;
  var hl=document.getElementById('hist-list');
  if(hl){
    if(!hist.length){hl.innerHTML='<div class="hist-empty">Aun no tienes compras registradas</div>';return;}
    var rows='';
    for(var i=0;i<hist.length;i++){
      var h=hist[i];
      rows+='<div class="hist-item">'
        +'<div class="hist-ico">'+(h.icon||'\uD83D\uDC8E')+'</div>'
        +'<div class="hist-info"><div class="hist-name">'+h.name+'</div><div class="hist-date">'+(h.date||'')+'</div></div>'
        +'<div class="hist-right"><div class="hist-price">'+fmt(h.price)+'</div><div class="hist-ord">#'+(h.order||0)+'</div></div>'
        +'</div>';
    }
    hl.innerHTML=rows;
  }
}
function renderMisCompras(){
  var hist=getHistory(), spent=getSpent(), tIdx=getTIdx(spent), tier=TIERS[tIdx];
  var o=document.getElementById('mc2-orders');
  var s=document.getElementById('mc2-spent');
  var tr=document.getElementById('mc2-tier');
  if(o) o.textContent=hist.length;
  if(s) s.textContent=fmt(spent);
  if(tr) tr.textContent=tier.name;
  var ml=document.getElementById('mc2-list');
  if(ml){
    if(!hist.length){ml.innerHTML='<div class="hist-empty">Aun no tienes compras registradas</div>';return;}
    var rows='';
    for(var i=0;i<hist.length;i++){
      var h=hist[i];
      rows+='<div class="hist-item">'
        +'<div class="hist-ico">'+(h.icon||'\uD83D\uDC8E')+'</div>'
        +'<div class="hist-info"><div class="hist-name">'+h.name+'</div><div class="hist-date">'+(h.date||'')+'</div></div>'
        +'<div class="hist-right"><div class="hist-price">'+fmt(h.price)+'</div><div class="hist-ord">#'+(h.order||0)+'</div></div>'
        +'</div>';
    }
    ml.innerHTML=rows;
  }
}

/* \u2500\u2500 MODAL HELPERS \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
function validateForm(){
  var v1=((document.getElementById('f1')||{}).value||'').trim();
  var v2=((document.getElementById('f2')||{}).value||'').trim();
  var nombre=((document.getElementById('f3')||{}).value||'').trim();
  var wa=((document.getElementById('f4')||{}).value||'').trim();
  if(!v1){showToast('Ingresa tu ID de Free Fire');return null;}
  if(!v2){showToast('Confirma tu ID de Free Fire');return null;}
  if(v1!==v2){showToast('Los IDs no coinciden');return null;}
  if(!nombre){showToast('Ingresa tu nombre');return null;}
  if(!wa||wa.replace(/\D/g,'').length<8){showToast('Ingresa tu numero de WhatsApp');return null;}
  return {v1:v1,v2:v2,nombre:nombre,wa:wa};
}
function sendWA(msg){
  closeModal();
  showToast('Abriendo WhatsApp...',2500);
  setTimeout(function(){window.open('https://wa.me/'+WA+'?text='+encodeURIComponent(msg),'_blank');},700);
}
function closeModal(){
  var el=document.getElementById('modal');
  if(el) el.classList.remove('show');
  activePromo=null;
  var inp=document.getElementById('f-promo');
  var msg=document.getElementById('promo-msg');
  if(inp){inp.value='';inp.style.borderColor='';}
  if(msg) msg.style.display='none';
  var mc=document.querySelector('.m-prod-card');
  if(mc) mc.style.borderColor='';
}
function switchPayTab(tab){
  var s=document.getElementById('paybox-stori');
  var b=document.getElementById('paybox-binance');
  var ts=document.getElementById('tab-stori');
  var tb=document.getElementById('tab-binance');
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
function copyClabe(){
  navigator.clipboard.writeText('646180402332964686').then(function(){showToast('CLABE copiada',2000);}).catch(function(){showToast('CLABE: 646180402332964686',3000);});
}
function copyBinanceID(){
  navigator.clipboard.writeText('1106987175').then(function(){showToast('ID copiado: 1106987175',2000);}).catch(function(){showToast('Binance ID: 1106987175',3000);});
}

/* \u2500\u2500 PROMO \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
function getPromoLog(){
  try{return JSON.parse(localStorage.getItem('cs_promo_log')||'[]');}catch(e){return [];}
}
function applyPromo(){
  var inp=document.getElementById('f-promo');
  var msg=document.getElementById('promo-msg');
  if(!inp||!msg) return;
  var code=inp.value.trim().toUpperCase();
  if(!code){showToast('Ingresa un codigo');return;}
  if(code.startsWith('REF-')&&code.length===10){
    if(code===getRefCode()){showToast('No puedes usar tu propio codigo');return;}
    activePromo={code:code,disc:5};
    inp.style.borderColor='#00e676';
    msg.style.display='block'; msg.style.color='#00e676';
    msg.textContent='Codigo de referido: 5% de descuento';
    refreshModalPrice(); showToast('5% aplicado!',2500); return;
  }
  var codes=getPromoCodes(), found=null;
  for(var i=0;i<codes.length;i++){if(codes[i].code===code&&codes[i].active){found=codes[i];break;}}
  if(!found){msg.style.display='block';msg.style.color='#ff5252';msg.textContent='Codigo invalido';inp.style.borderColor='#ff5252';activePromo=null;refreshModalPrice();return;}
  if(found.maxUses>0&&(found.uses||0)>=found.maxUses){msg.style.display='block';msg.style.color='#ff5252';msg.textContent='Codigo sin usos';activePromo=null;refreshModalPrice();return;}
  activePromo={code:found.code,disc:found.disc};
  inp.style.borderColor='#00e676';
  msg.style.display='block'; msg.style.color='#00e676';
  msg.textContent=found.disc+'% aplicado'+(found.desc?' ('+found.desc+')':'');
  refreshModalPrice(); showToast(found.disc+'% aplicado!',2500);
}
function getDiscountedPrice(base){
  if(!activePromo) return base;
  return Math.floor(base*(1-activePromo.disc/100));
}
function refreshModalPrice(){
  var priceEl=document.getElementById('m-price');
  if(!priceEl||!curId) return;
  var tIdx=getTIdx(getSpent()), p=null;
  for(var i=0;i<PRODUCTS.length;i++){if(PRODUCTS[i].id===curId){p=PRODUCTS[i];break;}}
  if(!p) return;
  var base=p.prices[tIdx], fin=getDiscountedPrice(base);
  if(activePromo){
    priceEl.innerHTML='<span style="text-decoration:line-through;color:var(--muted);font-size:.8rem">'+fmt(base)+'</span> <span style="color:#00e676;font-size:1.3rem;font-weight:900">'+fmt(fin)+'</span>';
    var mc=document.querySelector('.m-prod-card');
    if(mc) mc.style.borderColor='rgba(0,230,118,.3)';
  } else {
    priceEl.textContent=fmt(base);
    var mc2=document.querySelector('.m-prod-card');
    if(mc2) mc2.style.borderColor='';
  }
}

/* \u2500\u2500 PRODUCT MODAL \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
function openProdModal(id){
  if(!authSession){showToast('Inicia sesion para comprar');setTimeout(showAuthModal,600);return;}
  var p=null;
  for(var i=0;i<PRODUCTS.length;i++){if(PRODUCTS[i].id===id){p=PRODUCTS[i];break;}}
  if(!p) return;
  curId=id;
  var spent=getSpent(), tIdx=getTIdx(spent), tier=TIERS[tIdx];
  var now=p.prices[tIdx];
  var mico=document.getElementById('m-ico');
  var mname=document.getElementById('m-name');
  var mprice=document.getElementById('m-price');
  var msub=document.getElementById('m-sub');
  var morder=document.getElementById('m-order');
  var mdisk=document.getElementById('m-disc');
  if(mico) mico.textContent=p.isPase?'\u26D3':'\uD83D\uDC8E';
  if(mname) mname.textContent=p.isPase?'Pase Elite':p.name+' Diamantes FF';
  if(mprice) mprice.textContent=fmt(now);
  if(msub) msub.textContent=p.isPase?'Pase de temporada':p.total+' diamantes incl. '+p.bonus+' bono lat';
  if(morder) morder.textContent='PEDIDO #'+peekOrder();
  if(mdisk){
    if(tIdx>0){mdisk.style.display='block';mdisk.style.background='rgba(0,230,118,.08)';mdisk.style.border='1px solid rgba(0,230,118,.22)';mdisk.style.color='#00e676';mdisk.textContent=tier.name+': '+tier.disc+'% de descuento aplicado';}
    else{mdisk.style.display='none';}
  }
  var f1=document.getElementById('f1'),f2=document.getElementById('f2'),f3=document.getElementById('f3'),f4=document.getElementById('f4');
  if(f1) f1.value=''; if(f2) f2.value=''; if(f3) f3.value=''; if(f4) f4.value='';
  var fp=document.getElementById('f-promo');
  var pm=document.getElementById('promo-msg');
  if(fp) fp.value=''; if(pm) pm.style.display='none';
  activePromo=null;
  var el=document.getElementById('modal');
  if(el) el.classList.add('show');
  switchPayTab('stori');
}
function submitProd(){
  var v=validateForm(); if(!v) return;
  var p=null;
  for(var i=0;i<PRODUCTS.length;i++){if(PRODUCTS[i].id===curId){p=PRODUCTS[i];break;}}
  if(!p) return;
  var tIdx=getTIdx(getSpent()), tier=TIERS[tIdx];
  var base=p.prices[tIdx], now=getDiscountedPrice(base);
  var ord=getNextOrder();
  addSpend(now);
  var item={name:(p.isPase?'Pase Elite':p.name+' Diamantes FF'),price:now,icon:p.isPase?'\u26D3':'\uD83D\uDC8E',
    date:new Date().toLocaleDateString('es-MX',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}),order:ord};
  addToHistoryLocal(item);
  if(activePromo) recordPromoUse(activePromo.code,ord,activePromo.disc);
  var promoLine=activePromo?('\nCodigo: '+activePromo.code+' (-'+activePromo.disc+'%)'):'';
  var msg='*PEDIDO #'+ord+' - CiberStore*\n\nProducto: '+(p.isPase?'Pase Elite':p.name+' Diamantes FF')
    +'\nPrecio: '+fmt(now)+promoLine
    +'\nMetodo: Transferencia Bancaria'
    +'\n\nNombre: '+v.nombre+'\nID: '+v.v1+'\nWhatsApp: '+v.wa
    +'\n\nManda comprobante con # '+ord;
  sendWA(msg);
}

/* \u2500\u2500 LIKES MODAL \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
function openLikeModal(id){
  if(!authSession){showToast('Inicia sesion para comprar');setTimeout(showAuthModal,600);return;}
  var p=null;
  for(var i=0;i<LIKES.length;i++){if(LIKES[i].id===id){p=LIKES[i];break;}}
  if(!p) return;
  curId='lk_'+id;
  var mico=document.getElementById('m-ico');
  var mname=document.getElementById('m-name');
  var mprice=document.getElementById('m-price');
  var msub=document.getElementById('m-sub');
  var morder=document.getElementById('m-order');
  var mdisk=document.getElementById('m-disc');
  if(mico) mico.textContent=p.emoji;
  if(mname) mname.textContent='Likes Perfil - '+p.label;
  if(mprice) mprice.textContent=fmt(p.priceMX);
  if(msub) msub.textContent=p.total.toLocaleString()+' likes en '+p.days+' dias ('+p.perDay+'/dia)';
  if(morder) morder.textContent='PEDIDO #'+peekOrder();
  if(mdisk) mdisk.style.display='none';
  var f1=document.getElementById('f1'),f2=document.getElementById('f2'),f3=document.getElementById('f3'),f4=document.getElementById('f4');
  if(f1) f1.value=''; if(f2) f2.value=''; if(f3) f3.value=''; if(f4) f4.value='';
  var lbl1=document.getElementById('lbl1');
  var lbl2=document.getElementById('lbl2');
  if(lbl1) lbl1.textContent='Tu ID de Free Fire';
  if(lbl2) lbl2.textContent='Confirmar ID';
  activePromo=null;
  var el=document.getElementById('modal');
  if(el) el.classList.add('show');
  switchPayTab('stori');
  document.getElementById('btn-submit').onclick=submitLikes;
}
function submitLikes(){
  var v=validateForm(); if(!v) return;
  var lkId=parseInt(curId.replace('lk_',''));
  var p=null;
  for(var i=0;i<LIKES.length;i++){if(LIKES[i].id===lkId){p=LIKES[i];break;}}
  if(!p) return;
  var ord=getNextOrder();
  addSpend(p.priceMX);
  addToHistoryLocal({name:'Likes '+p.label,price:p.priceMX,icon:p.emoji,
    date:new Date().toLocaleDateString('es-MX',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}),order:ord});
  var msg='*PEDIDO #'+ord+' - CiberStore*\n\nServicio: Likes Perfil - '+p.label
    +'\nTotal: '+p.total.toLocaleString()+' likes en '+p.days+' dias'
    +'\nPrecio: '+fmt(p.priceMX)
    +'\nMetodo: Transferencia Bancaria'
    +'\n\nNombre: '+v.nombre+'\nID FF: '+v.v1+'\nWhatsApp: '+v.wa
    +'\n\nManda comprobante con # '+ord;
  sendWA(msg);
}

/* \u2500\u2500 HONOR MODAL \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
function openHonorModal(idx){
  if(!authSession){showToast('Inicia sesion para comprar');setTimeout(showAuthModal,600);return;}
  var h=HONOR[idx];
  if(!h) return;
  curId='honor_'+idx;
  var mico=document.getElementById('m-ico');
  var mname=document.getElementById('m-name');
  var mprice=document.getElementById('m-price');
  var msub=document.getElementById('m-sub');
  var morder=document.getElementById('m-order');
  var mdisk=document.getElementById('m-disc');
  if(mico) mico.textContent=h.flag;
  if(mname) mname.textContent='Honor de Clan - '+h.region;
  if(mprice) mprice.textContent=fmt(h.price);
  if(msub) msub.textContent='Region '+h.region+' - Entrega menos de 24hrs';
  if(morder) morder.textContent='PEDIDO #'+peekOrder();
  if(mdisk) mdisk.style.display='none';
  var f1=document.getElementById('f1'),f2=document.getElementById('f2'),f3=document.getElementById('f3'),f4=document.getElementById('f4');
  if(f1) f1.value=''; if(f2) f2.value=''; if(f3) f3.value=''; if(f4) f4.value='';
  var lbl1=document.getElementById('lbl1');
  var lbl2=document.getElementById('lbl2');
  if(lbl1) lbl1.textContent='Nombre del Clan';
  if(lbl2) lbl2.textContent='ID del Clan';
  activePromo=null;
  var el=document.getElementById('modal');
  if(el) el.classList.add('show');
  switchPayTab('stori');
  document.getElementById('btn-submit').onclick=submitHonor;
}
function submitHonor(){
  var f1=((document.getElementById('f1')||{}).value||'').trim();
  var f2=((document.getElementById('f2')||{}).value||'').trim();
  var nombre=((document.getElementById('f3')||{}).value||'').trim();
  var wa=((document.getElementById('f4')||{}).value||'').trim();
  if(!f1){showToast('Ingresa el nombre del clan');return;}
  if(!f2){showToast('Ingresa el ID del clan');return;}
  if(!nombre){showToast('Ingresa tu nombre');return;}
  if(!wa||wa.replace(/\D/g,'').length<8){showToast('Ingresa tu WhatsApp');return;}
  var hIdx=parseInt(curId.replace('honor_',''));
  var h=HONOR[hIdx];
  var ord=getNextOrder();
  addSpend(h.price);
  addToHistoryLocal({name:'Honor '+h.region,price:h.price,icon:h.flag,
    date:new Date().toLocaleDateString('es-MX',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}),order:ord});
  var msg='*PEDIDO #'+ord+' - CiberStore*\n\nServicio: Honor de Clan - '+h.region
    +'\nPrecio: '+fmt(h.price)
    +'\nMetodo: Transferencia Bancaria'
    +'\n\nNombre: '+nombre+'\nNombre Clan: '+f1+'\nID Clan: '+f2+'\nWhatsApp: '+wa
    +'\n\nManda comprobante con # '+ord;
  sendWA(msg);
}
function clanWA(){
  window.open('https://wa.me/'+WA+'?text='+encodeURIComponent('Hola! Me interesa comprar un clan nivel 7. Quiero mas informacion y cotizacion.'),'_blank');
}

/* \u2500\u2500 EXPERIENCIA CUENTA FF \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
var selectedExpPkgData = null;
function renderExpPackages(){
  var g=document.getElementById('exp-packages-grid');
  if(!g) return;
  var rows='';
  for(var i=0;i<EXP_PACKAGES.length;i++){
    var p=EXP_PACKAGES[i];
    var expStr=p.exp>=1000000?(p.exp/1000000).toFixed(1)+'M':(p.exp/1000)+'K';
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
  selectedExpPkg=id;
  selectedExpPkgData=null;
  for(var i=0;i<EXP_PACKAGES.length;i++){if(EXP_PACKAGES[i].id===id){selectedExpPkgData=EXP_PACKAGES[i];break;}}
  var cards=document.querySelectorAll('.exp-pkg-card');
  for(var j=0;j<cards.length;j++){
    cards[j].style.borderColor=cards[j].id==='expc-'+id?'rgba(0,245,255,.7)':'rgba(255,255,255,.07)';
    cards[j].style.background=cards[j].id==='expc-'+id?'rgba(0,245,255,.08)':'';
  }
}
function openHonorCuentaModalWithPkg(){
  if(!selectedExpPkgData){showToast('Selecciona un plan primero');return;}
  openHonorCuentaModal(selectedExpPkgData);
}
function openHonorCuentaModal(pkg){
  if(!authSession){showToast('Inicia sesion para comprar');setTimeout(showAuthModal,600);return;}
  var el=document.getElementById('modal-honor-cuenta');
  if(el) el.classList.add('show');
  var ordEl=document.getElementById('hcff-order');
  var prEl=document.getElementById('hcff-modal-price');
  var subEl=document.getElementById('hcff-modal-sub');
  if(ordEl) ordEl.textContent='PEDIDO #'+peekOrder();
  if(pkg&&typeof pkg==='object'){
    var expStr=pkg.exp>=1000000?(pkg.exp/1000000).toFixed(1)+'M':(pkg.exp/1000)+'K';
    if(prEl) prEl.textContent=fmt(pkg.priceMX);
    if(subEl) subEl.textContent=pkg.days+' dias - '+expStr+' EXP total - 50K/dia';
    if(el){el.setAttribute('data-pkg-price',pkg.priceMX);el.setAttribute('data-pkg-days',pkg.days);el.setAttribute('data-pkg-exp',expStr);}
  } else {
    if(prEl) prEl.textContent=fmt(HONOR_CUENTA_PRICE);
    if(subEl) subEl.textContent='Nivel 1 al 40 - Minutos u horas';
    if(el){el.setAttribute('data-pkg-price',HONOR_CUENTA_PRICE);el.setAttribute('data-pkg-days','');el.setAttribute('data-pkg-exp','');}
  }
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
    if(s) s.style.display='block'; if(b) b.style.display='none';
    if(ts){ts.style.background='rgba(37,211,102,.12)';ts.style.borderColor='rgba(37,211,102,.4)';ts.style.color='#25d366';}
    if(tb){tb.style.background='rgba(255,255,255,.04)';tb.style.borderColor='rgba(255,255,255,.1)';tb.style.color='var(--muted)';}
  } else {
    if(s) s.style.display='none'; if(b) b.style.display='block';
    if(tb){tb.style.background='rgba(240,185,11,.12)';tb.style.borderColor='rgba(240,185,11,.4)';tb.style.color='#f0b90b';}
    if(ts){ts.style.background='rgba(255,255,255,.04)';ts.style.borderColor='rgba(255,255,255,.1)';ts.style.color='var(--muted)';}
  }
}
function submitHonorCuenta(){
  var token=((document.getElementById('hcff-token')||{}).value||'').trim();
  var ncuenta=((document.getElementById('hcff-nombre-cuenta')||{}).value||'').trim();
  var nombre=((document.getElementById('hcff-nombre')||{}).value||'').trim();
  var wa=((document.getElementById('hcff-wa')||{}).value||'').trim();
  if(!token){showToast('Ingresa tu token de Free Fire');return;}
  if(!ncuenta){showToast('Ingresa el nombre de tu cuenta');return;}
  if(!nombre){showToast('Ingresa tu nombre');return;}
  if(!wa||wa.replace(/\D/g,'').length<8){showToast('Ingresa tu WhatsApp');return;}
  var modalEl=document.getElementById('modal-honor-cuenta');
  var pkgPrice=modalEl?parseInt(modalEl.getAttribute('data-pkg-price')||HONOR_CUENTA_PRICE):HONOR_CUENTA_PRICE;
  var pkgDays=modalEl?modalEl.getAttribute('data-pkg-days')||'':'';
  var pkgExp=modalEl?modalEl.getAttribute('data-pkg-exp')||'':'';
  var ord=getNextOrder();
  addSpend(pkgPrice);
  var planLine=pkgDays?('Plan: '+pkgDays+' dias - '+pkgExp+' EXP total (50K/dia)\n'):'Plan: Nivel 1 al 40\n';
  addToHistoryLocal({name:'Experiencia FF'+(pkgDays?' '+pkgDays+'D':''),price:pkgPrice,icon:'\uD83C\uDF71',
    date:new Date().toLocaleDateString('es-MX',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}),order:ord});
  var msg='*PEDIDO #'+ord+' - CiberStore*\n\nServicio: Experiencia Cuenta Free Fire\n'
    +planLine+'Precio: $'+pkgPrice.toLocaleString('es-MX')+' MX\nMetodo: Transferencia Bancaria'
    +'\n\nNombre: '+nombre+'\nNombre cuenta FF: '+ncuenta+'\nToken FF: '+token+'\nWhatsApp: '+wa
    +'\n\nManda comprobante con # '+ord;
  closeHonorCuentaModal();
  showToast('Abriendo WhatsApp...',2500);
  setTimeout(function(){window.open('https://wa.me/'+WA+'?text='+encodeURIComponent(msg),'_blank');},700);
}

/* \u2500\u2500 STORI / BINANCE MODALS \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
function openStoriModal(){var el=document.getElementById('modal-stori');if(el) el.classList.add('show');}
function closeStoriModal(){var el=document.getElementById('modal-stori');if(el) el.classList.remove('show');}
function openBinanceModal(){var el=document.getElementById('modal-binance');if(el) el.classList.add('show');}
function closeBinanceModal(){var el=document.getElementById('modal-binance');if(el) el.classList.remove('show');}

/* \u2500\u2500 BUNDLE \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
function openBundleModal(){
  if(!authSession){showToast('Inicia sesion para comprar');setTimeout(showAuthModal,600);return;}
  var el=document.getElementById('modal-bundle');
  if(el) el.classList.add('show');
  var ord=document.getElementById('bundle-order');
  if(ord) ord.textContent='PEDIDO #'+peekOrder();
}
function closeBundleModal(){var el=document.getElementById('modal-bundle');if(el) el.classList.remove('show');}
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
  var id=((document.getElementById('bundle-id')||{}).value||'').trim();
  var nombre=((document.getElementById('bundle-nombre')||{}).value||'').trim();
  var wa=((document.getElementById('bundle-wa')||{}).value||'').trim();
  if(!id){showToast('Ingresa tu ID de Free Fire');return;}
  if(!nombre){showToast('Ingresa tu nombre');return;}
  if(!wa||wa.replace(/\D/g,'').length<8){showToast('Ingresa tu WhatsApp');return;}
  var ord=getNextOrder();
  addSpend(125);
  addToHistoryLocal({name:'Bundle Diamantes + Likes',price:125,icon:'\uD83D\uDC8E',
    date:new Date().toLocaleDateString('es-MX',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}),order:ord});
  var msg='*PEDIDO #'+ord+' - CiberStore*\n\nBundle: 341 Diamantes + Likes 14 dias\nPrecio: $125 MX (10% descuento)\nMetodo: Transferencia Bancaria\n\nNombre: '+nombre+'\nID FF: '+id+'\nWhatsApp: '+wa+'\n\nManda comprobante con # '+ord;
  closeBundleModal();
  showToast('Abriendo WhatsApp...',2500);
  setTimeout(function(){window.open('https://wa.me/'+WA+'?text='+encodeURIComponent(msg),'_blank');},700);
}

/* \u2500\u2500 REFERIDOS \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
function getRefCode(){
  var key='cs_ref_'+(authSession?authSession.username:'guest');
  var code=localStorage.getItem(key);
  if(!code){
    var chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    code='REF-';
    for(var i=0;i<6;i++) code+=chars[Math.floor(Math.random()*chars.length)];
    localStorage.setItem(key,code);
  }
  return code;
}
function renderReferidos(){
  var code=getRefCode();
  var el=document.getElementById('ref-codigo');
  if(el) el.textContent=code;
  var refs=parseInt(localStorage.getItem('cs_ref_count_'+(authSession?authSession.username:'guest'))||'0');
  var disc=Math.min(refs*10,50);
  var tEl=document.getElementById('ref-total');
  var dEl=document.getElementById('ref-desc');
  var aEl=document.getElementById('ref-ahorrado');
  if(tEl) tEl.textContent=refs;
  if(dEl) dEl.textContent=disc+'%';
  if(aEl) aEl.textContent=fmt(refs*15);
}
function copyRefCode(){
  var code=getRefCode();
  navigator.clipboard.writeText(code).then(function(){showToast('Codigo '+code+' copiado!',2000);}).catch(function(){showToast('Codigo: '+getRefCode(),3000);});
}
function shareRefCode(){
  var code=getRefCode();
  var msg='Usa mi codigo *'+code+'* en CiberStore y obten 5% de descuento!\nhttps://ciberstore.lat';
  window.open('https://wa.me/?text='+encodeURIComponent(msg),'_blank');
}

/* \u2500\u2500 FAQ \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
function toggleFaq(el){
  var arrow=el.querySelector('.faq-arrow');
  var ans=el.nextElementSibling;
  var isOpen=ans.classList.contains('open');
  document.querySelectorAll('.faq-a').forEach(function(a){a.classList.remove('open');});
  document.querySelectorAll('.faq-arrow').forEach(function(a){a.classList.remove('open');});
  if(!isOpen){ans.classList.add('open');if(arrow) arrow.classList.add('open');}
}

/* \u2500\u2500 SEARCH \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
var SEARCH_INDEX=[
  {name:'Diamantes FF',sub:'desde $17 MX',ico:'\uD83D\uDC8E',page:'diamantes'},
  {name:'Likes Perfil',sub:'220 likes/dia desde $79 MX',ico:'\uD83D\uDC4D',page:'likes'},
  {name:'Honor de Clan',sub:'4 regiones desde $160 MX',ico:'\uD83C\uDFC6',page:'honor'},
  {name:'Experiencia Cuenta FF',sub:'50K EXP/dia desde $200 MX',ico:'\uD83C\uDF71',page:'honorcuenta'},
  {name:'Venta de Clanes',sub:'Nivel 7 $500-$5,000 MX',ico:'\uD83C\uDFF0',page:'clanes'},
  {name:'Codigos FF',sub:'Proximamente',ico:'\uD83C\uDF9F',page:'codigos'},
  {name:'Cajas Evolutiva',sub:'Proximamente',ico:'\uD83C\uDF81',page:'cajas'},
  {name:'Recargar Saldo',sub:'STORI + Binance',ico:'\uD83D\uDCB0',page:'saldo'},
  {name:'Mi Rango',sub:'Niveles y descuentos',ico:'\uD83D\uDC51',page:'membresia'},
  {name:'Referidos',sub:'Gana descuentos',ico:'\uD83C\uDF81',page:'referidos'},
  {name:'FAQ',sub:'Preguntas frecuentes',ico:'\u2753',page:'faq'},
  {name:'Mi Perfil',sub:'Tu cuenta',ico:'\uD83D\uDC64',page:'perfil'},
  {name:'Mis Compras',sub:'Historial',ico:'\uD83D\uDED2',page:'miscompras'},
  {name:'Comunidad',sub:'Chat',ico:'\uD83D\uDCAC',page:'comunidad'}
];
function doSearch(q){
  var res=document.getElementById('search-results');
  if(!res) return;
  q=q.trim().toLowerCase();
  if(!q){res.style.display='none';return;}
  var matches=SEARCH_INDEX.filter(function(i){return i.name.toLowerCase().indexOf(q)>=0||i.sub.toLowerCase().indexOf(q)>=0;});
  if(!matches.length){res.style.display='none';return;}
  var rows='';
  for(var i=0;i<Math.min(matches.length,6);i++){
    var m=matches[i];
    rows+='<div class="search-result-item" onclick="searchGo(\''+m.page+'\')">'
      +'<span class="sri-ico">'+m.ico+'</span>'
      +'<div><div class="sri-name">'+m.name+'</div><div class="sri-sub">'+m.sub+'</div></div>'
      +'</div>';
  }
  res.innerHTML=rows; res.style.display='block';
}
function searchGo(page){closeSearch();var inp=document.getElementById('global-search');if(inp) inp.value='';goPage(page);}
function closeSearch(){var res=document.getElementById('search-results');if(res) res.style.display='none';}

/* \u2500\u2500 THEME \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
(function(){
  var saved=localStorage.getItem('cs_theme');
  if(saved==='light') document.body.classList.add('light-mode');
})();
function toggleTheme(){
  var isLight=document.body.classList.toggle('light-mode');
  localStorage.setItem('cs_theme',isLight?'light':'dark');
  var btn=document.getElementById('theme-btn');
  if(btn) btn.textContent=isLight?'\uD83C\uDF19':'\u2600\uFE0F';
}

/* \u2500\u2500 TOAST \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
function showToast(msg,dur){
  var el=document.getElementById('toast');
  if(!el) return;
  el.textContent=msg; el.classList.add('show');
  setTimeout(function(){el.classList.remove('show');},dur||2500);
}

/* \u2500\u2500 SOCIAL PROOF \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
function showSP(){
  var msgs=[
    'alguien compro 341 Diamantes hace 3 min',
    'alguien activo Likes 30 dias hace 8 min',
    'alguien compro Honor Norteamerica hace 12 min',
    'alguien activo MEGA PACK VIP hace 18 min',
    'alguien compro 6,160 Diamantes hace 22 min',
    'alguien giro la Ruleta y gano 10% hace 5 min'
  ];
  var sp=document.getElementById('social-proof');
  var txt=document.getElementById('sp-text');
  if(!sp||!txt) return;
  txt.textContent=msgs[Math.floor(Math.random()*msgs.length)];
  sp.classList.add('show');
  setTimeout(function(){sp.classList.remove('show');},4500);
}
setInterval(showSP, 22000);
setTimeout(showSP, 5000);

/* \u2500\u2500 LIVE COUNTER \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
function updateLiveCounter(){
  var el=document.getElementById('live-counter');
  if(el) el.textContent=liveCount+' personas compraron hoy';
}
function startLiveCounter(){
  updateLiveCounter();
  (function tick(){
    setTimeout(function(){liveCount+=Math.random()>0.3?1:0;updateLiveCounter();tick();},(Math.random()*65+25)*1000);
  })();
}
startLiveCounter();

/* \u2500\u2500 TOTAL ORDERS \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
(function(){
  var base=1247, key='cs_tod';
  var count=Math.max(parseInt(localStorage.getItem(key)||base),base);
  function update(){var el=document.getElementById('total-orders-badge');if(el) el.textContent=count.toLocaleString('es-MX');}
  update();
  setInterval(function(){if(Math.random()>0.7){count++;localStorage.setItem(key,count);update();}},45000);
})();

/* \u2500\u2500 OFFER TIMER \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
(function(){
  function updateTimer(){
    var el=document.getElementById('offer-timer-txt');
    if(!el) return;
    var key='cs_offer_end';
    var end=localStorage.getItem(key);
    if(!end||Date.now()>parseInt(end)){end=Date.now()+86399000;localStorage.setItem(key,end);}
    var diff=Math.max(0,parseInt(end)-Date.now());
    var h=Math.floor(diff/3600000),m=Math.floor((diff%3600000)/60000),s=Math.floor((diff%60000)/1000);
    el.textContent=(h<10?'0':'')+h+':'+(m<10?'0':'')+m+':'+(s<10?'0':'')+s;
  }
  updateTimer();
  setInterval(updateTimer,1000);
})();

/* \u2500\u2500 SCROLLTOP \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
window.addEventListener('scroll',function(){
  var el=document.getElementById('scrolltop');
  if(el) el.className='scrolltop'+(window.scrollY>300?' vis':'');
});

/* \u2500\u2500 CONFETTI \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
function launchConfetti(){
  var canvas=document.getElementById('confetti-canvas');
  if(!canvas) return;
  canvas.style.display='block';
  canvas.width=window.innerWidth; canvas.height=window.innerHeight;
  var ctx=canvas.getContext('2d');
  var pieces=[];
  var colors=['#00aaff','#ffd000','#ff4422','#00f5ff','#25d366','#7c3aed'];
  for(var i=0;i<120;i++) pieces.push({x:Math.random()*canvas.width,y:Math.random()*canvas.height-canvas.height,w:Math.random()*10+4,h:Math.random()*6+3,color:colors[Math.floor(Math.random()*colors.length)],rot:Math.random()*360,vx:(Math.random()-.5)*3,vy:Math.random()*4+2,vr:(Math.random()-.5)*5});
  var frame=0;
  function draw(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    for(var j=0;j<pieces.length;j++){var p=pieces[j];ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.rot*Math.PI/180);ctx.fillStyle=p.color;ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h);ctx.restore();p.x+=p.vx;p.y+=p.vy;p.rot+=p.vr;}
    frame++;
    if(frame<120) requestAnimationFrame(draw); else canvas.style.display='none';
  }
  draw();
}

/* \u2500\u2500 LEVEL UP \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
function showLevelUp(tierName){
  var el=document.getElementById('levelup-toast');
  var lvl=document.getElementById('levelup-lvl');
  if(!el) return;
  if(lvl) lvl.textContent=tierName.toUpperCase();
  el.classList.add('show');
  launchConfetti();
  setTimeout(function(){el.classList.remove('show');},3200);
}

/* \u2500\u2500 ONBOARDING \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
var OB_STEPS=[
  {ico:'\uD83D\uDC8E',title:'Bienvenido a CiberStore',desc:'La tienda definitiva de Free Fire. Diamantes, likes, honor y mucho mas al mejor precio.'},
  {ico:'\uD83D\uDCB0',title:'Como pagar',desc:'Aceptamos STORI y Binance Pay. Transfiere el monto y manda tu comprobante al WhatsApp.'},
  {ico:'\uD83C\uDFC6',title:'Gana mas con tu cuenta',desc:'Cada compra sube tu rango y aumenta tu descuento. Comparte tu codigo de referido y gana mas.'}
];
function showOnboard(){obStep=0;renderOnboard();var el=document.getElementById('onboard-modal');if(el) el.style.display='flex';}
function renderOnboard(){
  var s=OB_STEPS[obStep];
  var ico=document.getElementById('ob-ico');
  var title=document.getElementById('ob-title');
  var desc=document.getElementById('ob-desc');
  if(ico) ico.textContent=s.ico;
  if(title) title.textContent=s.title;
  if(desc) desc.textContent=s.desc;
  for(var i=0;i<3;i++){var dot=document.getElementById('ob-step-'+i);if(dot) dot.className='onboard-step'+(i===obStep?' active':'');}
  var btn=document.querySelector('.btn-onboard-next');
  if(btn) btn.textContent=obStep===2?'Empezar \u2192':'Siguiente \u2192';
}
function nextOnboard(){if(obStep<2){obStep++;renderOnboard();}else{skipOnboard();}}
function skipOnboard(){var el=document.getElementById('onboard-modal');if(el) el.style.display='none';localStorage.setItem('cs_onboarded','1');}

/* \u2500\u2500 EXIT POPUP \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
var exitShown=false;
document.addEventListener('mouseleave',function(e){
  if(e.clientY<=0&&!exitShown&&authSession){
    exitShown=true;
    var el=document.getElementById('exit-popup');
    if(el) el.classList.add('show');
  }
});
function closeExitPopup(){var el=document.getElementById('exit-popup');if(el) el.classList.remove('show');}
function copyExitCode(){
  navigator.clipboard.writeText('VUELVETE5').catch(function(){});
  showToast('Codigo VUELVETE5 copiado!',2200);
  closeExitPopup();
  var inp=document.getElementById('f-promo');
  if(inp) inp.value='VUELVETE5';
}

/* \u2500\u2500 RULETA \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
var RULETA_PRIZES=[
  {label:'2%',disc:2,color:'#0055cc'},{label:'5%',disc:5,color:'#00aaff'},
  {label:'3%',disc:3,color:'#7c3aed'},{label:'10%',disc:10,color:'#ffd000'},
  {label:'1%',disc:1,color:'#333855'},{label:'7%',disc:7,color:'#00f5ff'},
  {label:'15%',disc:15,color:'#ff4422'},{label:'4%',disc:4,color:'#25d366'}
];
function drawRuleta(angle){
  var canvas=document.getElementById('ruleta-canvas');
  if(!canvas) return;
  var ctx=canvas.getContext('2d'), n=RULETA_PRIZES.length, arc=(Math.PI*2)/n;
  var cx=canvas.width/2, cy=canvas.height/2, r=cx-4;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  for(var i=0;i<n;i++){
    var start=angle+arc*i, end=start+arc;
    ctx.beginPath(); ctx.moveTo(cx,cy); ctx.arc(cx,cy,r,start,end); ctx.closePath();
    ctx.fillStyle=RULETA_PRIZES[i].color; ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,.15)'; ctx.lineWidth=1.5; ctx.stroke();
    ctx.save(); ctx.translate(cx,cy); ctx.rotate(start+arc/2);
    ctx.textAlign='right'; ctx.fillStyle='#fff'; ctx.font='bold 13px Orbitron,sans-serif';
    ctx.fillText(RULETA_PRIZES[i].label,r-8,5); ctx.restore();
  }
  ctx.beginPath(); ctx.arc(cx,cy,16,0,Math.PI*2);
  ctx.fillStyle='#0d1020'; ctx.fill();
  ctx.strokeStyle='rgba(0,170,255,.5)'; ctx.lineWidth=2; ctx.stroke();
}
function openRuleta(){
  if(!authSession){showToast('Inicia sesion para girar');setTimeout(showAuthModal,600);return;}
  var el=document.getElementById('modal-ruleta');
  if(el) el.classList.add('show');
  ruletaAngle=0; drawRuleta(0);
  var lastSpin=localStorage.getItem('cs_ruleta_last');
  var res=document.getElementById('ruleta-result');
  var nextEl=document.getElementById('ruleta-next');
  var btn=document.getElementById('ruleta-btn');
  var now=Date.now(), canSpin=!lastSpin||(now-parseInt(lastSpin))>86400000;
  if(res) res.textContent='';
  if(canSpin){
    if(btn){btn.disabled=false;btn.style.opacity='1';btn.textContent='GIRAR \uD83C\uDFB2';btn.onclick=spinRuleta;}
    if(nextEl) nextEl.style.display='none';
  } else {
    var rem=86400000-(now-parseInt(lastSpin));
    var h=Math.floor(rem/3600000), m=Math.floor((rem%3600000)/60000);
    if(btn){btn.disabled=true;btn.style.opacity='.45';btn.textContent='Vuelve en '+h+'h '+m+'m';}
    if(nextEl) nextEl.style.display='none';
    var lp=localStorage.getItem('cs_ruleta_prize');
    if(lp&&res) res.textContent='Ultimo premio: '+lp+'% descuento!';
  }
}
function closeRuleta(){var el=document.getElementById('modal-ruleta');if(el) el.classList.remove('show');}
function spinRuleta(){
  if(ruletaSpinning) return;
  ruletaSpinning=true;
  var btn=document.getElementById('ruleta-btn');
  if(btn){btn.disabled=true;btn.textContent='Girando...';}
  var prizeIdx=Math.floor(Math.random()*RULETA_PRIZES.length);
  var n=RULETA_PRIZES.length, arc=(Math.PI*2)/n;
  var extraSpins=(Math.PI*2)*(5+Math.random()*3);
  var targetAngle=extraSpins+(Math.PI*2)-(arc*prizeIdx+arc/2);
  var duration=4000, start=null;
  function easeOut(t){return 1-Math.pow(1-t,3);}
  function animate(ts){
    if(!start) start=ts;
    var elapsed=ts-start, progress=Math.min(elapsed/duration,1);
    var current=targetAngle*easeOut(progress);
    ruletaAngle=current; drawRuleta(current);
    if(progress<1){requestAnimationFrame(animate);}
    else{
      ruletaSpinning=false;
      var prize=RULETA_PRIZES[prizeIdx];
      localStorage.setItem('cs_ruleta_last',Date.now());
      localStorage.setItem('cs_ruleta_prize',prize.disc);
      var res=document.getElementById('ruleta-result');
      if(res) res.textContent='Ganaste '+prize.disc+'% de descuento!';
      var code='RULETA'+prize.disc;
      var codes=getPromoCodes();
      var found=false;
      for(var i=0;i<codes.length;i++) if(codes[i].code===code) found=true;
      if(!found){codes.push({code:code,disc:prize.disc,maxUses:1,uses:0,desc:'Premio ruleta',active:true,created:new Date().toLocaleDateString('es-MX')});savePromoCodes(codes);}
      if(btn){btn.disabled=false;btn.style.opacity='1';btn.textContent='Usar: '+code;
        btn.onclick=function(){closeRuleta();var inp=document.getElementById('f-promo');if(inp) inp.value=code;showToast('Codigo '+code+' listo!',3000);};}
      launchConfetti(); showToast('Ganaste '+prize.disc+'% de descuento!',3000);
    }
  }
  requestAnimationFrame(animate);
}

/* \u2500\u2500 PUSH NOTIFS \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
function requestNotifPerm(){
  if(!('Notification' in window)){showToast('Tu navegador no soporta notificaciones');return;}
  Notification.requestPermission().then(function(perm){
    var btn=document.getElementById('notif-btn');
    if(perm==='granted'){
      if(btn){btn.textContent='Activadas';btn.style.background='rgba(0,230,118,.15)';btn.style.color='#00e676';btn.disabled=true;}
      localStorage.setItem('cs_notif','granted');
      new Notification('CiberStore',{body:'Notificaciones activadas! Te avisaremos de ofertas.',icon:'icon-192.png'});
      showToast('Notificaciones activadas!',2500);
    } else {showToast('Permiso denegado.');}
  });
}
(function(){
  var btn=document.getElementById('notif-btn');
  if(btn&&localStorage.getItem('cs_notif')==='granted'){
    btn.textContent='Activadas';btn.style.background='rgba(0,230,118,.15)';btn.style.color='#00e676';btn.disabled=true;
  }
})();

/* \u2500\u2500 SMART WA \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
function openSmartWA(){
  var activePage=document.querySelector('.page.active');
  var pageId=activePage?activePage.id.replace('page-',''):'home';
  var msgs={
    home:'Hola! Quiero saber mas sobre CiberStore',
    diamantes:'Hola! Quiero comprar diamantes de Free Fire',
    likes:'Hola! Quiero saber mas sobre los likes para perfil',
    honor:'Hola! Quiero comprar honor de clan',
    honorcuenta:'Hola! Quiero subir la experiencia de mi cuenta FF',
    clanes:'Hola! Me interesa comprar un clan nivel 7',
    codigos:'Hola! Quiero que me avisen cuando esten los codigos FF',
    cajas:'Hola! Quiero que me avisen cuando esten las cajas evolutiva',
    saldo:'Hola! Quiero informacion sobre los metodos de pago',
    membresia:'Hola! Quiero saber mas sobre los rangos y descuentos',
    referidos:'Hola! Quiero informacion sobre el programa de referidos'
  };
  var msg=msgs[pageId]||msgs.home;
  window.open('https://wa.me/'+WA+'?text='+encodeURIComponent(msg),'_blank');
}

/* \u2500\u2500 PROMO VUELVETE5 AUTO-REGISTER \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
(function(){
  var codes=getPromoCodes();
  var found=false;
  for(var i=0;i<codes.length;i++) if(codes[i].code==='VUELVETE5') found=true;
  if(!found){
    codes.push({code:'VUELVETE5',disc:5,maxUses:9999,uses:0,desc:'Codigo de salida',active:true,created:new Date().toLocaleDateString('es-MX')});
    savePromoCodes(codes);
  }
})();

/* \u2500\u2500 PWA SERVICE WORKER \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
if('serviceWorker' in navigator){
  window.addEventListener('load',function(){
    navigator.serviceWorker.register('sw.js').catch(function(){});
  });
}

/* \u2500\u2500 INIT ON DOM LOAD \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
document.addEventListener('DOMContentLoaded', function(){
  updateCartCount();
  applyTranslations();
  var pg=document.getElementById('page-honorcuenta');
  if(pg&&pg.classList.contains('active')) renderExpPackages();
  /* Onboarding on first visit (only if not logged in) */
  if(!localStorage.getItem('cs_onboarded')&&!getSession()){
    setTimeout(function(){
      var authOpen=document.getElementById('auth-modal');
      if(authOpen&&authOpen.style.display!=='none') return;
      showOnboard();
    },1500);
  }
  /* Modal overlay close handlers */
  var modals=['modal','modal-cart','modal-stori','modal-binance','modal-bundle','modal-ruleta','modal-honor-cuenta'];
  modals.forEach(function(id){
    var el=document.getElementById(id);
    if(el) el.addEventListener('click',function(e){
      if(e.target!==this) return;
      el.classList.remove('show');
      if(id==='modal') closeModal();
    });
  });
  /* Enter key login */
  document.addEventListener('keydown',function(e){
    if(e.key!=='Enter') return;
    var authOpen=document.getElementById('auth-modal');
    if(!authOpen||authOpen.style.display==='none') return;
    var loginVis=document.getElementById('auth-login')&&document.getElementById('auth-login').style.display!=='none';
    var regVis=document.getElementById('auth-register')&&document.getElementById('auth-register').style.display!=='none';
    var admVis=document.getElementById('auth-admin')&&document.getElementById('auth-admin').style.display!=='none';
    if(loginVis) doLogin();
    else if(regVis) doRegister();
    else if(admVis) doAdminLogin();
  });
  /* Render home */
  setTimeout(function(){renderResenas();},300);
});

/* CiberStore v1779504760 */
/* \u2500\u2500 DATA \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
var WA = '5215548461200';

/* Fallback if supabase_integration.js not loaded yet */
if(typeof getSpent === 'undefined'){
  getSpent = function(){ return authSession ? (authSession.saldo||0) : 0; };
}
/**
 * Restar saldo y registrar movimiento en Supabase
 */
var _addSpendBusy = false; // Lock para evitar descuentos simultaneos/dobles

function _refreshSaldoUI(saldo){
  var s = '$' + Math.round(saldo).toLocaleString('es-MX') + ' MX';
  ['saldo-page-balance','modal-saldo-amt','frag-saldo-disp','lk200-saldo-val','lk2k-saldo-val','renta-bot-saldo'].forEach(function(id){
    var el = document.getElementById(id);
    if(el) el.textContent = s;
  });
}

function addSpend(amount, description){
  if(!authSession || !window.sb){
    console.error('[ADDSPEND] No hay sesión o sb');
    return;
  }
  amount = Number(amount) || 0;
  if(amount <= 0){ console.warn('[ADDSPEND] Monto invalido:', amount); return; }

  // LOCK: si ya hay un descuento en proceso, ignorar este (evita dobles)
  if(_addSpendBusy){
    console.warn('[ADDSPEND] Ya hay una compra en proceso, ignorando duplicado');
    showToast('Espera, procesando tu compra...');
    return;
  }
  _addSpendBusy = true;

  var userId = authSession.id;

  // 1. LEER el saldo REAL de la BD (no el local que puede estar viejo)
  sb.get('profiles', 'select=saldo&id=eq."'+userId+'"').then(function(rows){
    var saldoReal = (rows && rows[0]) ? (Number(rows[0].saldo)||0) : (authSession.saldo||0);

    // 2. Validar que alcance (sin forzar a 0)
    if(saldoReal < amount){
      _addSpendBusy = false;
      authSession.saldo = saldoReal;
      _refreshSaldoUI(saldoReal);
      showToast('Saldo insuficiente. Tienes $'+Math.round(saldoReal).toLocaleString('es-MX')+' MX');
      console.warn('[ADDSPEND] Saldo insuficiente. real='+saldoReal+' necesita='+amount);
      return;
    }

    var newSaldo = saldoReal - amount;
    console.log('[ADDSPEND] real='+saldoReal+' - '+amount+' = '+newSaldo);

    // 3. Registrar movimiento
    sb.post('movimientos_saldo', {
      user_id: userId,
      tipo: 'compra',
      monto: amount,
      descripcion: description || 'Compra',
      created_at: new Date().toISOString()
    }).then(function(){
      // 4. Actualizar saldo en profiles
      sb.patch('profiles', {saldo: newSaldo}, 'id=eq."'+userId+'"').then(function(){
        authSession.saldo = newSaldo;
        _refreshSaldoUI(newSaldo);
        showToast('✓ Compra registrada. Saldo: $'+Math.round(newSaldo).toLocaleString('es-MX')+' MX');
        _addSpendBusy = false;
      }).catch(function(e){
        console.error('[ADDSPEND] Error actualizando saldo:', e);
        showToast('Error al actualizar saldo');
        _addSpendBusy = false;
      });
    }).catch(function(e){
      console.error('[ADDSPEND] Error registrando movimiento:', e);
      showToast('Error al registrar compra');
      _addSpendBusy = false;
    });
  }).catch(function(e){
    console.error('[ADDSPEND] Error leyendo saldo:', e);
    showToast('Error al leer saldo');
    _addSpendBusy = false;
  });
}
if(typeof addToHistory === 'undefined'){
  addToHistory = function(item){ return; };
}
if(typeof getPromoCodes === 'undefined'){
  getPromoCodes = function(){ try{ return JSON.parse(localStorage.getItem('cs_promos_cache')||'[]'); }catch(e){ return []; } };
}
if(typeof savePromoCodes === 'undefined'){
  savePromoCodes = function(arr){ localStorage.setItem('cs_promos_cache',JSON.stringify(arr)); };
}
if(typeof recordPromoUse === 'undefined'){
  recordPromoUse = function(code){ return; };
}

/* \u2500\u2500 DIAMANTES ILIMITADOS (precios actualizados) \u2500\u2500 */
var PRODUCTS = [
  {id:1,  name:'110',   total:110,  bonus:0, region:'LATAM & BR', prices:[18,18,18,18,18],  badge:null,        isPase:false, popular:false},
  {id:2,  name:'341',   total:341,  bonus:0, region:'LATAM & BR', prices:[55,55,55,55,55],  badge:'POPULAR',   isPase:false, popular:true},
  {id:3,  name:'572',   total:572,  bonus:0, region:'LATAM & BR', prices:[85,85,85,85,85],  badge:null,        isPase:false, popular:false},
  {id:4,  name:'1,166', total:1166, bonus:0, region:'LATAM & BR', prices:[165,165,165,165,165], badge:'OFERTA',isPase:false, popular:false},
  {id:5,  name:'2,398', total:2398, bonus:0, region:'LATAM & BR', prices:[295,295,295,295,295], badge:null,    isPase:false, popular:false},
  {id:6,  name:'6,160', total:6160, bonus:0, region:'LATAM & BR', prices:[750,750,750,750,750], badge:'GRAN VALOR',isPase:false, popular:false}
];

/* \u2500\u2500 DIAMANTES 1 VEZ x ID (precios especiales) \u2500\u2500 */
var PRODUCTS_1VEZ = [
  {id:21, name:'110',   total:110,  bonus:0, region:'LATAM & BR', prices:[13,13,13,13,13],  badge:null,        isPase:false, popular:false, is1vez:true},
  {id:22, name:'341',   total:341,  bonus:0, region:'LATAM & BR', prices:[45,45,45,45,45],  badge:'POPULAR',   isPase:false, popular:true,  is1vez:true},
  {id:23, name:'572',   total:572,  bonus:0, region:'LATAM & BR', prices:[65,65,65,65,65],  badge:null,        isPase:false, popular:false, is1vez:true},
  {id:24, name:'1,166', total:1166, bonus:0, region:'LATAM & BR', prices:[120,120,120,120,120], badge:'OFERTA',isPase:false, popular:false, is1vez:true},
  {id:25, name:'2,398', total:2398, bonus:0, region:'LATAM & BR', prices:[220,220,220,220,220], badge:null,    isPase:false, popular:false, is1vez:true},
  {id:26, name:'6,160', total:6160, bonus:0, region:'LATAM & BR', prices:[520,520,520,520,520], badge:'MEJOR PRECIO',isPase:false, popular:false, is1vez:true}
];

var LIKES = [
  {id:1,  label:'1 dia',   emoji:'\uD83D\uDC4D', priceMX:10,  total:200,  perDay:200, days:1,   color:'#00e676'},
  {id:2,  label:'7 dias',  emoji:'\uD83D\uDC4D', priceMX:25,  total:1400, perDay:200, days:7,   color:'#00aaff', popular:true},
  {id:3,  label:'14 dias', emoji:'\uD83D\uDC4D', priceMX:35,  total:2800, perDay:200, days:14,  color:'#00aaff'},
  {id:4,  label:'21 dias', emoji:'\uD83D\uDC4D', priceMX:60,  total:4200, perDay:200, days:21,  color:'#ffd700'},
  {id:5,  label:'30 dias', emoji:'\uD83D\uDC4D', priceMX:70,  total:6600, perDay:220, days:30,  color:'#00aaff', best:true},
  {id:11, label:'Instant 2K',  emoji:'\u26A1', priceMX:120,  total:2000,  perDay:2000, days:1,  color:'#ff4da6', isInstant:true},
  {id:12, label:'Instant 4K',  emoji:'\u26A1', priceMX:230,  total:4000,  perDay:2000, days:2,  color:'#ff4da6', isInstant:true},
  {id:13, label:'Instant 10K', emoji:'\u26A1', priceMX:590,  total:10000, perDay:2000, days:5,  color:'#ff4da6', isInstant:true},
  {id:14, label:'Instant 20K', emoji:'\u26A1', priceMX:1190, total:20000, perDay:2000, days:10, color:'#ff4da6', isInstant:true}
];

var HONOR = [
  {region:'Norteamerica',flag:'\uD83C\uDDE8\uD83C\uDDE6',color:'#ffd000',price:340},
  {region:'Estados Unidos',flag:'\uD83C\uDDFA\uD83C\uDDF8',color:'#4dabf7',price:285},
  {region:'Sudamerica',flag:'\uD83C\uDDE7\uD83C\uDDF7',color:'#40c057',price:340},
  {region:'Europa',flag:'\uD83C\uDDEA\uD83C\uDDFA',color:'#b39ddb',price:340}
];

var TIERS = [
  {id:'free', name:'Cliente', color:'#00aaff', colorBg:'rgba(0,170,255,.1)', threshold:0, perks:['Precio fijo'], disc:0, icon:'\uD83D\uDC64'}
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
/* adminAuthed, authSession, isGuest declared in supabase_integration.js */
/* selectedStars in supabase_integration.js */
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
  /* Simple consecutive: get count from Supabase movimientos */
  var n = parseInt(localStorage.getItem('cs_ord_seq') || '0') + 1;
  localStorage.setItem('cs_ord_seq', n);
  /* Sync with Supabase count in background */
  sb.get('movimientos_saldo', 'tipo=eq.compra&select=id').then(function(rows){
    if(rows && Array.isArray(rows) && rows.length >= n){
      localStorage.setItem('cs_ord_seq', rows.length);
    }
  }).catch(function(){});
  return n;
}
function peekOrder(){
  return parseInt(localStorage.getItem('cs_ord_seq') || '0') + 1;
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
  /* Just save to local history for display in "Mis Compras" */
  var h=getHistory();
  h.unshift(item);
  saveHistory(h);
  /* addToHistory() intentionally NOT called here */
  /* addSpend() already created the Supabase movimiento */
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
  closeCart();
  goPage('saldo');
  showToast('Recarga tu saldo', 2000);
}
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
  if(!p) for(var ii=0;ii<PRODUCTS_1VEZ.length;ii++){if(PRODUCTS_1VEZ[ii].id===id){p=PRODUCTS_1VEZ[ii];break;}}
  if(!p) return;
  var now=p.prices[0];
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
  if(el){
    el.style.display='flex';
    el.style.alignItems='center';
    el.style.justifyContent='center';
  }
  authTab('login');
}
function hideAuthModal(){
  var el=document.getElementById('auth-modal');
  if(el) el.style.display='none';
}
function authTab(tab){
  /* Hide all panels */
  ['auth-login','auth-register','auth-admin'].forEach(function(id){
    var el=document.getElementById(id);
    if(el) el.style.display='none';
  });
  /* Reset tab styles */
  ['atab-login','atab-register'].forEach(function(id){
    var btn=document.getElementById(id);
    if(btn){
      btn.style.color='#5a6580';
      btn.style.borderBottom='2px solid transparent';
    }
  });
  /* Show selected panel */
  var panel=document.getElementById('auth-'+tab);
  if(panel) panel.style.display='block';
  /* Highlight selected tab */
  var tabBtn=document.getElementById('atab-'+tab);
  if(tabBtn){
    tabBtn.style.color='#00aaff';
    tabBtn.style.borderBottom='2px solid #00aaff';
  }
}
function updateAuthUI(){
  var pill     = document.getElementById('user-pill');
  var pillAv   = document.getElementById('user-pill-av');
  var pillName = document.getElementById('user-pill-name');
  if(authSession){
    if(pill) pill.style.display='flex';
    if(pillAv)   pillAv.textContent   = authSession.username.charAt(0).toUpperCase();
    if(pillName) pillName.textContent = authSession.username;
    var saldo    = authSession.saldo || 0;
    var saldoFmt = '$' + saldo.toLocaleString('es-MX') + ' MX';
    ['pf-saldo-display','pf-saldo-big','saldo-page-balance'].forEach(function(id){
      var el=document.getElementById(id); if(el) el.textContent=saldoFmt;
    });
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
  var pass=((document.getElementById('adm-auth-pass')||{}).value||'');
  var err=document.getElementById('adm-auth-err');
  var emailOk=(email==='ciberstore@admin.com');
  var passOk =(pass ==='ciberstore26');
  if(!emailOk||!passOk){
    if(err){err.textContent='Credenciales incorrectas';err.style.display='block';}
    return;
  }
  adminAuthed=true;
  if(err) err.style.display='none';
  /* Open full panel directly */
  hideAuthModal();
  setTimeout(function(){ openFullAdmin(); }, 100);
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
function openRecargaWA(){
  var user  = authSession ? authSession.username : 'invitado';
  var waNum = authSession ? (authSession.whatsapp || '') : '';
  var msg   = '*Solicitud de Recarga - CiberStore*\n\n'
    + 'Usuario: ' + user + '\n'
    + 'WhatsApp: ' + (waNum ? '+' + waNum : 'no registrado') + '\n\n'
    + 'Monto a recargar: (indica el monto)\n'
    + 'TXID/Referencia: (indica el TXID o referencia)\n\n'
    + 'Por favor adjunta tu comprobante de pago.';
  window.open('https://wa.me/' + WA + '?text=' + encodeURIComponent(msg), '_blank');
}

function enviarComprobanteWA(){
  var monto   = ((document.getElementById('recarga-monto')||{}).value||'').trim();
  var metodo  = ((document.getElementById('recarga-metodo')||{}).value||'');
  var txid    = ((document.getElementById('recarga-txid')||{}).value||'').trim();
  var nota    = ((document.getElementById('recarga-nota')||{}).value||'').trim();
  if(!monto || isNaN(monto) || parseFloat(monto)<=0){ showToast('Ingresa el monto recargado'); return; }
  if(!metodo){ showToast('Selecciona el metodo de pago'); return; }
  if(!txid){ showToast('Ingresa el TXID o numero de referencia'); return; }
  var user = authSession ? authSession.username : 'invitado';
  var wa   = authSession ? (authSession.whatsapp||'') : '';
  /* Notify Telegram */
  if(typeof tgNotifyRecarga==='function'){
    tgNotifyRecarga(user, monto, metodo, txid, wa);
  }
  var msg  = '*Solicitud de Recarga - CiberStore*\n\n'
    + 'Usuario: ' + user + '\n'
    + (wa ? 'WhatsApp: +' + wa + '\n' : '')
    + 'Monto: $' + parseFloat(monto).toLocaleString('es-MX') + ' MX\n'
    + 'Metodo: ' + metodo + '\n'
    + 'TXID/Referencia: ' + txid + '\n'
    + (nota ? 'Nota: ' + nota + '\n' : '')
    + '\nAdjunto mi comprobante de pago.';
  var url = 'https://wa.me/' + WA + '?text=' + encodeURIComponent(msg);
  var win = window.open(url, '_blank');
  if(!win) window.location.href = url;
  showToast('Abriendo WhatsApp...', 2000);
  /* Clear form */
  ['recarga-monto','recarga-txid','recarga-nota'].forEach(function(id){
    var el=document.getElementById(id); if(el) el.value='';
  });
  var sel=document.getElementById('recarga-metodo'); if(sel) sel.selectedIndex=0;
}

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
  /* Always re-render products and likes so prices update with new session */
  setTimeout(function(){
    renderProds();
    renderLikes();
    renderMems();
  }, 50);
  var active=document.querySelector('.page.active');
  if(active){
    var id=active.id.replace('page-','');
    if(id==='membresia') renderWallet();
    if(id==='perfil') renderPerfil();
    if(id==='miscompras') renderMisCompras();
    if(id==='home') setTimeout(renderResenas,100);
  }
}

/* \u2500\u2500 RENDER PRODS \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
function renderProds(){
  var g=document.getElementById('prod-grid');
  if(!g) return;

  function makeCard(p, is1vez){
    var now=p.prices[0];
    var badgeHtml='';
    if(p.popular) badgeHtml='<div class="ff-badge ff-badge-hot">'+t('best_seller')+'</div>';
    else if(p.badge) badgeHtml='<div class="ff-badge ff-badge-normal">'+p.badge+'</div>';
    var borderColor = is1vez ? 'rgba(0,230,118,.35)' : 'rgba(0,170,255,.18)';
    if(p.popular) borderColor = is1vez ? 'rgba(0,230,118,.5)' : 'rgba(240,165,0,.3)';
    return '<div class="ff-card" onclick="openProdModal('+p.id+')" style="border-color:'+borderColor+'">'
      +badgeHtml
      +'<div class="ff-top"><span class="ff-ico">\uD83D\uDC8E</span><span class="ff-num">'+p.name+'</span></div>'
      +'<span class="ff-price" style="color:'+(is1vez?'#00e676':'var(--c1)')+'">'+fmt(now)+'</span>'
      +'<div class="ff-qty-row" onclick="event.stopPropagation()">'
      +'<div class="ff-qty">'
      +'<button class="ff-qty-btn" onclick="ffQty('+p.id+',-1)">-</button>'
      +'<span class="ff-qty-n" id="ffq-'+p.id+'">0</span>'
      +'<button class="ff-qty-btn" onclick="ffQty('+p.id+',1)">+</button>'
      +'</div>'
      +'<button class="ff-cart-btn" onclick="ffAddCart('+p.id+')" style="background:'+(is1vez?'rgba(0,230,118,.15)':'rgba(0,170,255,.12)')+';border-color:'+(is1vez?'rgba(0,230,118,.4)':'rgba(0,170,255,.3)')+';color:'+(is1vez?'#00e676':'var(--c1)')+'">'+t('add_cart')+'</button>'
      +'</div>'
      +'</div>';
  }

  var rows='';

  /* \u2500\u2500 Diamantes Ilimitados \u2500\u2500 */
  rows+='<div style="grid-column:1/-1;margin-bottom:.35rem">'
    +'<div style="font-family:Orbitron;font-size:.72rem;font-weight:700;color:var(--c1);letter-spacing:1.5px">\u26A1 DIAMANTES ILIMITADOS</div>'
    +'</div>';
  for(var i=0;i<PRODUCTS.length;i++) rows+=makeCard(PRODUCTS[i], false);

  /* \u2500\u2500 Diamantes 1 Vez x ID \u2500\u2500 */
  rows+='<div style="grid-column:1/-1;margin:1rem 0 .35rem">'
    +'<div style="font-family:Orbitron;font-size:.72rem;font-weight:700;color:#00e676;letter-spacing:1.5px">\uD83C\uDF1F DIAMANTES 1 VEZ x ID</div>'
    +'</div>';
  /* Warning box */
  rows+='<div style="grid-column:1/-1;background:rgba(255,165,0,.08);border:1px solid rgba(255,165,0,.3);border-radius:9px;padding:.75rem 1rem;display:flex;gap:.65rem;align-items:flex-start;margin-bottom:.5rem">'
    +'<span style="font-size:1.1rem;flex-shrink:0">\u26A0\uFE0F</span>'
    +'<div style="font-size:.78rem;color:var(--text);line-height:1.65">'
    +'<strong style="color:#ffa500">FAVOR DE MANDAR SU ID PARA COMPROBAR SI TIENE LA OFERTA.</strong>'
    +' Una vez comprobada, puedes hacer tu pedido.'
    +'</div>'
    +'</div>'
    +'<div style="grid-column:1/-1;margin-bottom:.65rem">'
    +'<a href="https://wa.me/5215548461200?text=Hola!%20Quiero%20verificar%20mi%20ID%20para%20Diamantes%201%20Vez%20x%20ID" target="_blank" '
    +'style="display:flex;align-items:center;justify-content:center;gap:.5rem;width:100%;padding:.72rem;background:linear-gradient(90deg,#128c3e,#25d366);color:#fff;border:none;border-radius:8px;font-family:Exo 2,sans-serif;font-weight:800;font-size:.85rem;cursor:pointer;text-decoration:none;box-sizing:border-box">'
    +'\uD83D\uDCF1 Mandar WhatsApp para verificar ID'
    +'</a>'
    +'</div>';
  for(var j=0;j<PRODUCTS_1VEZ.length;j++) rows+=makeCard(PRODUCTS_1VEZ[j], true);

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
    var isInst=p.isInstant||false;
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
    if(p.isInstant){
      card+='<div class="lk-stat"><span class="lk-stat-n" style="color:#00f5ff">'+p.total.toLocaleString()+'</span><span class="lk-stat-l">likes</span></div>';
      card+='<div class="lk-stat-div"></div>';
      card+='<div class="lk-stat"><span class="lk-stat-n" style="color:#00f5ff">24H</span><span class="lk-stat-l">entrega</span></div>';
      card+='<div class="lk-stat-div"></div>';
      card+='<div class="lk-stat"><span class="lk-stat-n" style="color:#00f5ff">\u26A1</span><span class="lk-stat-l">instant</span></div>';
    } else {
      card+='<div class="lk-stat"><span class="lk-stat-n">'+p.perDay+'</span><span class="lk-stat-l">likes/dia</span></div>';
      card+='<div class="lk-stat-div"></div>';
      card+='<div class="lk-stat"><span class="lk-stat-n">'+p.days+'</span><span class="lk-stat-l">dias</span></div>';
      card+='<div class="lk-stat-div"></div>';
      card+='<div class="lk-stat"><span class="lk-stat-n">'+p.total.toLocaleString()+'</span><span class="lk-stat-l">total</span></div>';
    }
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
  var av   = document.getElementById('pf-avatar');
  var un   = document.getElementById('pf-username');
  var sdo  = document.getElementById('pf-saldo-display');
  var sdb  = document.getElementById('pf-saldo-big');
  var sbp  = document.getElementById('saldo-page-balance');
  var rol  = document.getElementById('pf-role-display');
  var nb   = document.getElementById('pf-stat-nombre');
  var waEl = document.getElementById('pf-stat-wa');
  var fch  = document.getElementById('pf-stat-fecha');
  var ref  = document.getElementById('pf-ref-code');
  var movs = document.getElementById('pf-movimientos');
  if(!authSession){
    if(av)   av.textContent  = '?';
    if(un)   un.textContent  = 'Sin sesion';
    if(sdo)  sdo.textContent = '$0 MX';
    if(sdb)  sdb.textContent = '$0 MX';
    if(sbp)  sbp.textContent = '$0 MX';
    if(rol)  rol.textContent = 'Invitado';
    if(movs) movs.innerHTML  = '<div style="text-align:center;padding:1rem;color:var(--muted);font-size:.78rem">Inicia sesion para ver tu historial</div>';
    return;
  }
  var u        = authSession;
  var saldo    = u.saldo || 0;
  var saldoFmt = '$' + saldo.toLocaleString('es-MX') + ' MX';
  var fecha    = u.created_at ? new Date(u.created_at).toLocaleDateString('es-MX',{day:'2-digit',month:'short',year:'numeric'}) : '-';
  var roleStr  = u.role === 'admin' ? 'Admin' : 'Usuario';
  if(av)   av.textContent   = u.username.charAt(0).toUpperCase();
  if(un)   un.textContent   = u.username;
  if(sdo)  sdo.textContent  = saldoFmt;
  if(sdb)  sdb.textContent  = saldoFmt;
  if(sbp)  sbp.textContent  = saldoFmt;
  if(rol)  rol.textContent  = roleStr;
  if(nb)   nb.textContent   = u.nombre   || '-';
  if(waEl) waEl.textContent = u.whatsapp ? '+' + u.whatsapp : '-';
  if(fch)  fch.textContent  = fecha;
  if(ref)  ref.textContent  = u.ref_code || '-';
  if(movs && u.id){
    sbGetMovimientos(u.id).then(function(rows){
      if(!rows||!rows.length){movs.innerHTML='<div style="text-align:center;padding:1rem;color:var(--muted);font-size:.78rem">Sin movimientos</div>';return;}
      var h='';
      rows.forEach(function(m){
        var f2=m.created_at?new Date(m.created_at).toLocaleDateString('es-MX',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}):'';  
        var isC=m.tipo==='credito'||m.tipo==='ajuste';
        var color=isC?'#00e676':'#ff6b6b';
        var signo=isC?'+':'-';
        h+='<div style="display:flex;align-items:center;justify-content:space-between;padding:.42rem .55rem;background:rgba(255,255,255,.03);border:1px solid var(--border);border-radius:6px">'
          +'<div style="min-width:0;flex:1"><div style="font-size:.75rem;font-weight:600;color:var(--text);overflow:hidden;text-overflow:ellipsis">'+(m.descripcion||m.tipo)+'</div>'
          +'<div style="font-size:.62rem;color:var(--muted)">'+f2+'</div></div>'
          +'<div style="font-family:Orbitron;font-size:.75rem;font-weight:700;color:'+color+';flex-shrink:0;margin-left:.5rem">'+signo+'$'+(m.monto||0).toLocaleString('es-MX')+'</div>'
          +'</div>';
      });
      movs.innerHTML=h;
    }).catch(function(){movs.innerHTML='<div style="text-align:center;padding:1rem;color:var(--muted)">Error al cargar</div>';});
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
  /* Open WA immediately to avoid popup blocker */
  var url = 'https://wa.me/'+WA+'?text='+encodeURIComponent(msg);
  var win = window.open(url,'_blank');
  if(!win){
    /* Popup blocked - use location */
    window.location.href = url;
  }
  closeModal();
  showToast('Pedido enviado!',2500);
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
  /* Show current saldo */
  var saldoEl=document.getElementById('modal-saldo-amt');
  if(saldoEl) saldoEl.textContent='$'+(authSession?(authSession.saldo||0).toLocaleString('es-MX'):0)+' MX';
  var el=document.getElementById('modal');
  if(el) el.classList.add('show');
  var bsub=document.getElementById('btn-submit');
  if(bsub) bsub.onclick=submitProd;
}
function submitProd(){
  var v=validateForm(); if(!v) return;
  var bsub=document.getElementById('btn-submit');
  if(bsub && bsub.disabled) return;
  if(bsub){ bsub.disabled=true; setTimeout(function(){if(bsub)bsub.disabled=false;},3000); }
  var p=null;
  for(var i=0;i<PRODUCTS.length;i++){if(PRODUCTS[i].id===curId){p=PRODUCTS[i];break;}}
  if(!p) for(var ii=0;ii<PRODUCTS_1VEZ.length;ii++){if(PRODUCTS_1VEZ[ii].id===curId){p=PRODUCTS_1VEZ[ii];break;}}
  if(!p) return;
  var tIdx=0; var tier=TIERS[0];
  var base=p.prices[0], now=getDiscountedPrice(base);
  /* Check saldo */
  var saldo=authSession?(authSession.saldo||0):0;
  if(saldo < now){
    showToast('Saldo insuficiente. Recarga tu cuenta.');
    var saldoEl=document.getElementById('modal-saldo-amt');
    if(saldoEl) saldoEl.style.color='#ff6b6b';
    setTimeout(function(){if(saldoEl) saldoEl.style.color='#00e676';},2000);
    return;
  }
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
  var saldoEl2=document.getElementById('modal-saldo-amt');
  if(saldoEl2) saldoEl2.textContent='$'+(authSession?(authSession.saldo||0).toLocaleString('es-MX'):0)+' MX';
  var el=document.getElementById('modal');
  if(el) el.classList.add('show');
  var bsub2=document.getElementById('btn-submit');
  if(bsub2) bsub2.onclick=submitLikes;
}
function submitLikes(){
  var v=validateForm(); if(!v) return;
  var bsub=document.getElementById('btn-submit');
  if(bsub && bsub.disabled) return;
  if(bsub){ bsub.disabled=true; setTimeout(function(){if(bsub)bsub.disabled=false;},3000); }
  var lkId=parseInt(curId.replace('lk_',''));
  var p=null;
  for(var i=0;i<LIKES.length;i++){if(LIKES[i].id===lkId){p=LIKES[i];break;}}
  if(!p) return;
  var saldo2=authSession?(authSession.saldo||0):0;
  if(saldo2 < p.priceMX){
    showToast('Saldo insuficiente. Recarga tu cuenta.');
    return;
  }
  var ord=getNextOrder();
  addSpend(p.priceMX, 'Likes '+p.label+' - Pedido #'+ord);
  if(typeof tgNotifyPurchase==='function') tgNotifyPurchase(authSession.username, 'Likes '+p.label, p.priceMX, ord);
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

/**
 * Actualizar saldo en TODOS los modales cuando se abren
 */
function updateModalBalance(){
  setTimeout(function(){
    var saldoMX = authSession ? Math.round(authSession.saldo || 0) : 0;
    var saldoStr = '$' + saldoMX.toLocaleString('es-MX') + ' MX';
    
    // Modal principal
    var ms = document.getElementById('modal-saldo-amt');
    if(ms) ms.textContent = saldoStr;
    
    // Modal de fragmentos
    var fs = document.getElementById('frag-saldo-disp');
    if(fs) fs.textContent = saldoStr;
    
    // Sidebar
    var sb = document.getElementById('saldo-page-balance');
    if(sb) sb.textContent = saldoStr;
  }, 50);
}
function openHonorModal(idx){
  if(!authSession){showToast('Inicia sesion para comprar');setTimeout(showAuthModal,600);return;}
  var h=HONOR[idx];
  if(!h) return;
  curId='honor_'+idx;
  updateModalBalance();
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
    /* Reset only if expired, not on every load */
    if(!end || isNaN(parseInt(end)) || Date.now()>parseInt(end)){
      end=Date.now()+86399000;
      localStorage.setItem(key,String(end));
    }
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
  /* Always ensure proper size */
  if(canvas.width < 100){ canvas.width=220; canvas.height=220; }
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
  ruletaAngle=0;
  /* Wait for modal to be visible before drawing */
  setTimeout(function(){
    var canvas=document.getElementById('ruleta-canvas');
    if(canvas){
      canvas.width=220;
      canvas.height=220;
    }
    drawRuleta(0);
  },50);
  var rKey = 'cs_ruleta_'+(authSession?authSession.id:'guest');
  var lastSpin=localStorage.getItem(rKey+'_last');
  var res=document.getElementById('ruleta-result');
  var nextEl=document.getElementById('ruleta-next');
  var btn=document.getElementById('ruleta-btn');
  var now=Date.now(), canSpin=!lastSpin||(now-parseInt(lastSpin))>86400000;
  if(res) res.textContent='';
  if(canSpin){
    if(btn){btn.disabled=false;btn.style.opacity='1';btn.textContent='GIRAR \uD83C\uDFB2';btn.onclick=spinRuleta;}
    if(nextEl) nextEl.style.display='none';
  } else {
    var rem=604800000-(now-parseInt(lastSpin)); /* 7 days */
    var h=Math.floor(rem/3600000), m=Math.floor((rem%3600000)/60000);
    if(btn){btn.disabled=true;btn.style.opacity='.45';btn.textContent='Vuelve en '+h+'h '+m+'m';}
    if(nextEl) nextEl.style.display='none';
    var lp=localStorage.getItem(rKey+'_prize');
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
      var rKey = 'cs_ruleta_'+(authSession?authSession.id:'guest');
      localStorage.setItem(rKey+'_last',Date.now());
      localStorage.setItem(rKey+'_prize',prize.disc);
      /* Save giro to Supabase */
      if(authSession && typeof sb !== 'undefined'){
        sb.post('ruleta_giros',{
          user_id: authSession.id,
          premio:  prize.label,
          disc:    prize.disc
        }).catch(function(){});
      }
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

/* WhatsApp number live preview in register */
document.addEventListener('DOMContentLoaded', function(){
  var waInput = document.getElementById('reg-whatsapp');
  var ladaSel = document.getElementById('reg-lada');
  var preview = document.getElementById('reg-wa-preview');
  var waFull  = document.getElementById('reg-wa-full');

  function updateWAPreview(){
    if(!waInput || !ladaSel) return;
    var lada  = ladaSel.value;
    var raw   = waInput.value.replace(/\D/g,'');
    if(raw.startsWith('0')) raw = raw.slice(1);
    if(raw.startsWith(lada)) raw = raw.slice(lada.length);
    if(raw.length >= 7){
      var full = '+' + lada + raw;
      if(waFull)  waFull.textContent  = full;
      if(preview) preview.style.display = 'block';
    } else {
      if(preview) preview.style.display = 'none';
    }
  }

  if(waInput) waInput.addEventListener('input', updateWAPreview);
  if(ladaSel) ladaSel.addEventListener('change', updateWAPreview);
});

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
  /* Render all sections after SB integration loads */
  setTimeout(function(){
    renderProds();
    renderLikes();
    renderMems();
  }, 500);
  setTimeout(function(){
    renderResenas();
  }, 800);
});

/* ================================================================
   LEADERBOARD \u2014 Animado con tabs
================================================================ */
var lbPeriod = 'semana';
var lbAnimTimer = null;

function setLbPeriod(period){
  lbPeriod = period;
  /* Update tab styles */
  var tabs = ['semana','mes','todo'];
  tabs.forEach(function(t){
    var btn = document.getElementById('lb-tab-'+t);
    if(!btn) return;
    if(t===period){
      btn.style.background = 'linear-gradient(90deg,var(--c2),var(--c1))';
      btn.style.color = '#fff';
    } else {
      btn.style.background = 'none';
      btn.style.color = 'var(--muted)';
    }
  });
  loadLeaderboard();
}

function loadLeaderboard(){
  var list = document.getElementById('leaderboard-list');
  var upd  = document.getElementById('lb-updated');
  if(!list) return;

  /* Shimmer loading */
  var shimmer = '';
  for(var s=0;s<5;s++){
    shimmer += '<div style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.05);border-radius:11px;padding:.75rem 1rem;display:flex;align-items:center;gap:.75rem;animation:blink 1.5s infinite">'
      +'<div style="width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,.05);flex-shrink:0"></div>'
      +'<div style="flex:1"><div style="height:10px;background:rgba(255,255,255,.05);border-radius:4px;width:60%;margin-bottom:.35rem"></div>'
      +'<div style="height:8px;background:rgba(255,255,255,.04);border-radius:4px;width:80%"></div></div>'
      +'<div style="width:60px;height:12px;background:rgba(255,255,255,.05);border-radius:4px"></div>'
      +'</div>';
  }
  list.innerHTML = shimmer;

  /* Date filter */
  var since = null;
  if(lbPeriod==='semana')  since = new Date(Date.now()-7*86400000).toISOString();
  if(lbPeriod==='mes')     since = new Date(Date.now()-30*86400000).toISOString();

  /* Get movimientos to count diamonds/likes per user */
  var movsQs = 'tipo=eq.compra&select=user_id,descripcion,monto' + (since?'&created_at=gte.'+since:'');
  sb.get('movimientos_saldo', movsQs).then(function(movs){
    if(!movs||!Array.isArray(movs)){list.innerHTML='<div style="text-align:center;padding:2rem;color:var(--muted)">Sin datos</div>';return;}

    /* Aggregate per user */
    var agg = {};
    movs.forEach(function(m){
      var uid = m.user_id||'';
      if(!agg[uid]) agg[uid] = {monto:0, diamonds:0, likes:0};
      agg[uid].monto += m.monto||0;
      var d = (m.descripcion||'').toLowerCase();
      if(d.indexOf('diamante')>=0){
        var match = d.match(/(\d[\d,.]*)\s*diamante/);
        if(match) agg[uid].diamonds += parseInt(match[1].replace(/[,. ]/g,''))||100;
        else agg[uid].diamonds += 100;
      }
      if(d.indexOf('like')>=0){
        var matchL = d.match(/(\d[\d,.]*)\s*like/);
        if(matchL) agg[uid].likes += parseInt(matchL[1].replace(/[,. ]/g,''))||1000;
        else agg[uid].likes += 1000;
      }
    });

    /* Get usernames */
    var uids = Object.keys(agg);
    if(!uids.length){list.innerHTML='<div style="text-align:center;padding:2rem;color:var(--muted);font-size:.85rem">Aun no hay compras en este periodo</div>';return;}

    sb.get('profiles','select=id,username&id=in.('+uids.slice(0,20).map(function(u){return '"'+u+'"';}).join(',')+')')
      .then(function(profs){
        var umap = {};
        if(profs) profs.forEach(function(p){umap[p.id]=p.username;});

        /* Sort by monto */
        var sorted = uids.map(function(uid){
          return {uid:uid, username:umap[uid]||'Usuario', data:agg[uid]};
        }).filter(function(u){return u.data.monto>0;})
          .sort(function(a,b){return b.data.monto-a.data.monto;})
          .slice(0,10);

        if(!sorted.length){list.innerHTML='<div style="text-align:center;padding:2rem;color:var(--muted)">Sin datos este periodo</div>';return;}

        var medals   = ['\uD83E\uDD47','\uD83E\uDD48','\uD83E\uDD49'];
        var colors   = ['#ffd700','#c0c0c0','#cd7f32'];
        var bgColors = ['rgba(255,215,0,.06)','rgba(192,192,192,.04)','rgba(205,127,50,.04)'];
        var h = '';

        sorted.forEach(function(u,i){
          var medal    = i<3 ? medals[i] : (i+1)+'.';
          var color    = i<3 ? colors[i] : 'var(--muted)';
          var bg       = i<3 ? bgColors[i] : 'rgba(255,255,255,.02)';
          var border   = i===0 ? 'rgba(255,215,0,.25)' : 'rgba(255,255,255,.06)';
          var isMe     = authSession && authSession.username === u.username;
          var initial  = (u.username||'?').charAt(0).toUpperCase();
          var diamonds = u.data.diamonds;
          var likes    = u.data.likes;
          var monto    = u.data.monto;

          h += '<div style="background:'+bg+';border:1px solid '+border+';border-radius:11px;padding:.75rem 1rem;display:flex;align-items:center;gap:.75rem;'+(i===0?'box-shadow:0 0 20px rgba(255,215,0,.08);':'')+'animation:pgIn .3s ease '+(i*0.06)+'s both">'
            /* Position */
            + '<div style="width:30px;text-align:center;font-size:'+(i<3?'1.2rem':'.82rem')+';color:'+color+';font-weight:700;flex-shrink:0">'+medal+'</div>'
            /* Avatar */
            + '<div style="width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,var(--c2),var(--c1));display:flex;align-items:center;justify-content:center;font-family:Orbitron;font-size:.72rem;font-weight:900;color:#fff;flex-shrink:0;border:2px solid '+(i===0?'#ffd700':color)+'44">'+initial+'</div>'
            /* Name + stats */
            + '<div style="flex:1;min-width:0">'
            + '<div style="font-size:.85rem;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'
            + u.username + (isMe?' <span style="font-size:.62rem;background:rgba(0,170,255,.15);color:var(--c1);padding:.1rem .35rem;border-radius:4px;font-family:sans-serif">Tu</span>':'')+'</div>'
            + '<div style="display:flex;align-items:center;gap:.6rem;margin-top:.2rem;flex-wrap:wrap">'
            + (diamonds>0?'<span style="font-size:.68rem;color:#a78bfa;font-weight:600">&#128142; '+diamonds.toLocaleString('es-MX')+'</span>':'')
            + (likes>0?'<span style="font-size:.68rem;color:#ff6b9d;font-weight:600">&#128077; '+likes.toLocaleString('es-MX')+'</span>':'')
            + '</div></div>'
            /* Amount */
            + '<div style="text-align:right;flex-shrink:0">'
            + '<div style="font-family:Orbitron;font-size:.82rem;font-weight:900;color:'+(i===0?'#ffd700':'#00e676')+'">'+'$'+monto.toLocaleString('es-MX')+'</div>'
            + '<div style="font-size:.6rem;color:var(--muted);margin-top:.1rem">MX</div>'
            + '</div>'
            + '</div>';
        });

        list.innerHTML = h;
        if(upd) upd.textContent = 'Actualizado ' + new Date().toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'});
      }).catch(function(){
        list.innerHTML='<div style="text-align:center;padding:2rem;color:var(--muted)">Error al cargar</div>';
      });
  }).catch(function(){
    list.innerHTML='<div style="text-align:center;padding:2rem;color:var(--muted)">Error de conexion</div>';
  });
}

/* Auto-refresh every 60 seconds */
function startLbAutoRefresh(){
  if(lbAnimTimer) clearInterval(lbAnimTimer);
  lbAnimTimer = setInterval(function(){
    var home = document.querySelector('#page-home.active');
    if(home) loadLeaderboard();
  }, 60000);
}

var _origGoPageLB = goPage;
goPage = function(id){
  _origGoPageLB(id);
  if(id==='home') setTimeout(loadLeaderboard, 300);
};

setTimeout(function(){
  loadLeaderboard();
  startLbAutoRefresh();
}, 1200);

/* ================================================================
   FULL ADMIN PANEL \u2014 COMPLETO
================================================================ */

/* \u2500\u2500 ADMIN CLOCK \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
function startAdmClock(){
  function tick(){
    var now  = new Date();
    var cl   = document.getElementById('adm-clock');
    var dt   = document.getElementById('adm-date');
    if(cl) cl.textContent = now.toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
    if(dt) dt.textContent = now.toLocaleDateString('es-MX',{weekday:'short',day:'2-digit',month:'short',year:'numeric'});
  }
  tick();
  setInterval(tick, 1000);
}

function openFullAdmin(){
  if(!adminAuthed){
    showAuthModal();
    authTab('admin');
    return;
  }
  var el=document.getElementById('full-admin-panel');
  if(el) el.classList.add('open');
  admFullTab('stats');
}

function closeFullAdmin(){
  var el=document.getElementById('full-admin-panel');
  if(el) el.classList.remove('open');
}



function admFullTab(tab){
  var tabs=['stats','users','pedidos','saldos','top','codigos','chat','resenas','config'];
  tabs.forEach(function(t){
    var btn=document.getElementById('admn-'+t);
    var sec=document.getElementById('adms-'+t);
    if(btn) btn.className='adm-nav-btn'+(t===tab?' active':'');
    if(sec) sec.className='adm-section'+(t===tab?' active':'');
  });
  if(tab==='stats')   admFullLoadStats();
  if(tab==='users')   admFullLoadUsers();
  if(tab==='pedidos') admLoadPedidos();
  if(tab==='saldos')  admFullLoadMovs();
  if(tab==='top')     admLoadTop();
  if(tab==='codigos'){ renderAdminCodes();renderAdminStats(); }
  if(tab==='chat')    admLoadChat();
  if(tab==='resenas') admLoadResenas();
  /* config tab has no load function - static content */
}

/* \u2500\u2500 DASHBOARD \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
function admFullLoadStats(){
  var upd=document.getElementById('adm-last-update');
  if(upd) upd.textContent='Actualizado '+new Date().toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'});

  sb.get('profiles','select=saldo,role,banned').then(function(users){
    if(!users||!Array.isArray(users)) return;
    var total=users.reduce(function(s,u){return s+(u.saldo||0);},0);
    var admins=users.filter(function(u){return u.role==='admin';}).length;
    var el1=document.getElementById('adm-s-users');
    var el2=document.getElementById('adm-s-saldo');
    var el3=document.getElementById('adm-s-admins');
    if(el1) el1.textContent=users.length;
    if(el2) el2.textContent='$'+total.toLocaleString('es-MX');
    if(el3) el3.textContent=admins;
    renderAdminStats2(users);
  }).catch(function(){});

  sb.get('movimientos_saldo','select=id,tipo,descripcion,monto').then(function(movs){
    if(!movs||!Array.isArray(movs)) return;
    var el4=document.getElementById('adm-s-movs');
    if(el4) el4.textContent=movs.length;
    /* Count diamonds and likes from descriptions */
    var diamonds=0,likes=0;
    movs.forEach(function(m){
      var d=m.descripcion||'';
      if(d.toLowerCase().indexOf('diamante')>=0) diamonds++;
      if(d.toLowerCase().indexOf('like')>=0) likes++;
    });
    var ed=document.getElementById('adm-s-diamonds');
    var el=document.getElementById('adm-s-likes');
    if(ed) ed.textContent=diamonds+' pedidos';
    if(el) el.textContent=likes+' pedidos';
  }).catch(function(){});

  /* Recent purchases */
  var tbody=document.getElementById('adm-recent-body');
  if(tbody){
    sb.get('movimientos_saldo','tipo=eq.compra&order=created_at.desc&limit=8').then(function(rows){
      if(!rows||!rows.length){tbody.innerHTML='<tr><td colspan="4" style="text-align:center;color:var(--muted);padding:1.5rem">Sin compras aun</td></tr>';return;}
      sb.get('profiles','select=id,username').then(function(profs){
        var umap={};
        if(profs) profs.forEach(function(p){umap[p.id]=p.username;});
        var h='';
        rows.forEach(function(m){
          var fecha=m.created_at?new Date(m.created_at).toLocaleString('es-MX',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}):'';
          h+='<tr>'
            +'<td style="font-weight:700;color:#fff">'+(umap[m.user_id]||'-')+'</td>'
            +'<td style="color:var(--muted)">'+(m.descripcion||'-')+'</td>'
            +'<td style="font-family:Orbitron;color:#00e676;font-weight:700">$'+(m.monto||0).toLocaleString('es-MX')+'</td>'
            +'<td style="color:var(--muted)">'+fecha+'</td>'
            +'</tr>';
        });
        tbody.innerHTML=h;
      });
    }).catch(function(){});
  }

  /* Sales chart */
  var canvas=document.getElementById('adm-sales-chart');
  if(canvas) admRenderChart(canvas);
}

function admRenderChart(canvas){
  var since=new Date(Date.now()-7*86400000).toISOString();
  sb.get('movimientos_saldo','tipo=eq.compra&created_at=gte.'+since+'&order=created_at.asc')
    .then(function(rows){
      var days=[],sales=[];
      for(var d=6;d>=0;d--){
        var date=new Date(Date.now()-d*86400000);
        var label=date.toLocaleDateString('es-MX',{weekday:'short',day:'2-digit'});
        days.push(label);
        var total=0;
        if(rows) rows.forEach(function(r){
          var rd=new Date(r.created_at).toLocaleDateString('es-MX',{weekday:'short',day:'2-digit'});
          if(rd===label) total+=r.monto||0;
        });
        sales.push(total);
      }
      var W=canvas.width=canvas.offsetWidth||300;
      var H=140; canvas.height=H;
      var ctx=canvas.getContext('2d');
      var mx=Math.max.apply(null,sales.concat([1]));
      var pad=32;
      var totalVentas=sales.reduce(function(a,b){return a+b;},0);
      var ct=document.getElementById('adm-chart-total');
      if(ct) ct.textContent='Total semana: $'+totalVentas.toLocaleString('es-MX')+' MX';
      ctx.clearRect(0,0,W,H);
      for(var k=0;k<7;k++){
        var x=pad+k*((W-pad*2)/7);
        var bw=Math.floor((W-pad*2)/7)-6;
        var bh=Math.round((sales[k]/mx)*(H-36));
        /* Bar */
        var g=ctx.createLinearGradient(0,H-bh,0,H);
        g.addColorStop(0,'#00aaff');
        g.addColorStop(1,'rgba(0,85,204,.3)');
        ctx.fillStyle=g;
        if(ctx.roundRect) ctx.roundRect(x,H-bh-16,bw,bh,4);
        else ctx.rect(x,H-bh-16,bw,bh);
        ctx.fill();
        /* Day label */
        ctx.fillStyle='rgba(90,101,128,.8)';
        ctx.font='9px sans-serif';
        ctx.textAlign='center';
        ctx.fillText(days[k],x+bw/2,H-2);
        /* Value */
        if(sales[k]>0){
          ctx.fillStyle='#fff';
          ctx.font='bold 9px sans-serif';
          ctx.fillText('$'+sales[k],x+bw/2,H-bh-19);
        }
      }
      /* Extra stats */
      var extra=document.getElementById('adm-chart-extra');
      if(extra){
        var avg=totalVentas>0?Math.round(totalVentas/sales.filter(function(s){return s>0;}).length):0;
        var maxDay=Math.max.apply(null,sales);
        extra.innerHTML=
          '<div style="background:rgba(0,170,255,.07);border:1px solid rgba(0,170,255,.15);border-radius:8px;padding:.65rem;text-align:center">'
          +'<div style="font-family:Orbitron;font-size:.9rem;font-weight:700;color:var(--c1)">$'+avg.toLocaleString('es-MX')+'</div>'
          +'<div style="font-size:.62rem;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-top:.1rem">Promedio/dia</div></div>'
          +'<div style="background:rgba(255,208,0,.07);border:1px solid rgba(255,208,0,.15);border-radius:8px;padding:.65rem;text-align:center">'
          +'<div style="font-family:Orbitron;font-size:.9rem;font-weight:700;color:var(--c4)">$'+maxDay.toLocaleString('es-MX')+'</div>'
          +'<div style="font-size:.62rem;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-top:.1rem">Mejor dia</div></div>';
      }
    }).catch(function(){});
}

/* \u2500\u2500 USERS \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
function admFullLoadUsers(){
  var tbody=document.getElementById('adm-full-users-body');
  if(!tbody) return;
  tbody.innerHTML='<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:2rem">Cargando...</td></tr>';
  var q   =((document.getElementById('adm-full-search')||{}).value||'').trim().toLowerCase();
  var qwa =((document.getElementById('adm-search-wa')||{}).value||'').trim();
  var qrol=((document.getElementById('adm-search-rol')||{}).value||'');
  var qs='order=created_at.desc&limit=150';
  if(q)    qs+='&or=(username.ilike.*'+encodeURIComponent(q)+'*,nombre.ilike.*'+encodeURIComponent(q)+'*)';
  if(qwa)  qs+='&whatsapp=ilike.*'+encodeURIComponent(qwa)+'*';
  if(qrol) qs+='&role=eq.'+encodeURIComponent(qrol);
  sb.get('profiles',qs).then(function(users){
    if(!users||!Array.isArray(users)||!users.length){
      tbody.innerHTML='<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:2rem">Sin resultados</td></tr>';
      return;
    }
    var rows='';
    users.forEach(function(u){
      var fecha=u.created_at?new Date(u.created_at).toLocaleDateString('es-MX'):'';
      var roleBadge=u.banned
        ?'<span class="adm-badge adm-badge-banned">BANEADO</span>'
        :u.role==='admin'
          ?'<span class="adm-badge adm-badge-admin">ADMIN</span>'
          :'<span class="adm-badge adm-badge-user">USER</span>';
      rows+='<tr>'
        +'<td style="font-weight:700;color:#fff">'+u.username+'</td>'
        +'<td>'+(u.nombre||'-')+'</td>'
        +'<td>'+(u.whatsapp?'+'+u.whatsapp:'-')+'</td>'
        +'<td>'+roleBadge+'</td>'
        +'<td style="font-family:Orbitron;color:#00e676;font-weight:700">$'+(u.saldo||0).toLocaleString('es-MX')+'</td>'
        +'<td style="color:var(--muted)">'+fecha+'</td>'
        +'<td><div style="display:flex;gap:.3rem;flex-wrap:wrap">'
        +'<button data-u="'+u.id+'" data-n="'+u.username+'" onclick="admAddSaldo(this.dataset.u,this.dataset.n)" class="adm-action-btn" style="border-color:rgba(0,230,118,.3);color:#00e676">+$</button>'
        +'<button data-u="'+u.id+'" data-n="'+u.username+'" onclick="admQuitarSaldo(this.dataset.u,this.dataset.n)" class="adm-action-btn" style="border-color:rgba(255,80,80,.3);color:#ff6b6b">-$</button>'
        +'<button data-u="'+u.id+'" data-n="'+u.username+'" onclick="admVerHistorial(this.dataset.u,this.dataset.n)" class="adm-action-btn" style="border-color:rgba(0,170,255,.3);color:var(--c1)">Hist</button>'
        +'<button data-u="'+u.id+'" data-n="'+u.username+'" data-r="'+u.role+'" onclick="admCambiarRol(this.dataset.u,this.dataset.n,this.dataset.r)" class="adm-action-btn" style="border-color:rgba(124,58,237,.3);color:#a78bfa">Rol</button>'
        +'<button data-u="'+u.id+'" data-n="'+u.username+'" data-b="'+u.banned+'" onclick="admBanear(this.dataset.u,this.dataset.n,this.dataset.b)" class="adm-action-btn" style="border-color:rgba(255,165,0,.3);color:#ffa500">'+(u.banned?'Des':'Ban')+'</button>'
        +'<button data-u="'+u.id+'" data-n="'+u.username+'" onclick="admResetPass(this.dataset.u,this.dataset.n)" class="adm-action-btn" style="border-color:rgba(255,255,255,.15);color:var(--muted)">Reset</button>'
        +'</div></td></tr>';
    });
    tbody.innerHTML=rows;
  }).catch(function(){
    tbody.innerHTML='<tr><td colspan="7" style="text-align:center;color:#ff6b6b;padding:2rem">Error al cargar</td></tr>';
  });
}

/* \u2500\u2500 PEDIDOS \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
function admLoadPedidos(){
  var tbody=document.getElementById('adm-pedidos-body');
  if(!tbody) return;
  tbody.innerHTML='<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:2rem">Cargando...</td></tr>';
  var userFilter=((document.getElementById('adm-ped-user')||{}).value||'').trim().toLowerCase();
  var tipoFilter=((document.getElementById('adm-ped-tipo')||{}).value||'');
  var qs='order=created_at.desc&limit=100';
  if(tipoFilter) qs+='&tipo=eq.'+encodeURIComponent(tipoFilter);
  sb.get('movimientos_saldo',qs).then(function(movs){
    if(!movs||!movs.length){tbody.innerHTML='<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:2rem">Sin pedidos</td></tr>';return;}
    sb.get('profiles','select=id,username').then(function(profs){
      var umap={};
      if(profs) profs.forEach(function(p){umap[p.id]=p.username;});
      var filtered=movs.filter(function(m){
        if(!userFilter) return true;
        var uname=(umap[m.user_id]||'').toLowerCase();
        return uname.indexOf(userFilter)>=0;
      });
      if(!filtered.length){tbody.innerHTML='<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:2rem">Sin resultados</td></tr>';return;}
      var h='';
      filtered.forEach(function(m,i){
        var fecha=m.created_at?new Date(m.created_at).toLocaleString('es-MX',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}):'';
        var isC=m.tipo==='credito'||m.tipo==='ajuste';
        var tipoBadge='<span class="adm-badge" style="background:rgba('+(isC?'0,230,118':'255,80,80')+',.1);color:'+(isC?'#00e676':m.tipo==='compra'?'var(--c1)':'#ff6b6b')+'">'+m.tipo+'</span>';
        h+='<tr>'
          +'<td style="color:var(--muted);font-family:Orbitron;font-size:.7rem">'+(i+1)+'</td>'
          +'<td style="font-weight:700;color:#fff">'+(umap[m.user_id]||'-')+'</td>'
          +'<td>'+tipoBadge+'</td>'
          +'<td style="color:var(--muted)">'+(m.descripcion||'-')+'</td>'
          +'<td style="font-family:Orbitron;font-weight:700;color:'+(isC?'#00e676':'#ff6b6b')+'">'+(isC?'+':'-')+'$'+(m.monto||0).toLocaleString('es-MX')+'</td>'
          +'<td style="color:var(--muted)">'+fecha+'</td>'
          +'</tr>';
      });
      tbody.innerHTML=h;
    });
  }).catch(function(){tbody.innerHTML='<tr><td colspan="6" style="text-align:center;color:#ff6b6b;padding:2rem">Error</td></tr>';});
}

/* \u2500\u2500 SALDOS \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
function admFullLoadMovs(){
  var tbody=document.getElementById('adm-movs-body');
  if(!tbody) return;
  tbody.innerHTML='<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:2rem">Cargando...</td></tr>';
  sb.get('movimientos_saldo','order=created_at.desc&limit=50').then(function(movs){
    if(!movs||!movs.length){tbody.innerHTML='<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:2rem">Sin movimientos</td></tr>';return;}
    sb.get('profiles','select=id,username').then(function(profs){
      var umap={};
      if(profs) profs.forEach(function(p){umap[p.id]=p.username;});
      var h='';
      movs.forEach(function(m){
        var fecha=m.created_at?new Date(m.created_at).toLocaleDateString('es-MX',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}):'';
        var isC=m.tipo==='credito'||m.tipo==='ajuste';
        h+='<tr>'
          +'<td style="color:#fff;font-weight:600">'+(umap[m.user_id]||'-')+'</td>'
          +'<td><span class="adm-badge" style="background:rgba('+(isC?'0,230,118':'255,80,80')+',.1);color:'+(isC?'#00e676':'#ff6b6b')+'">'+m.tipo+'</span></td>'
          +'<td style="font-family:Orbitron;font-weight:700;color:'+(isC?'#00e676':'#ff6b6b')+'">'+(isC?'+':'-')+'$'+(m.monto||0).toLocaleString('es-MX')+'</td>'
          +'<td style="color:var(--muted)">'+(m.descripcion||'-')+'</td>'
          +'<td style="color:var(--muted)">'+fecha+'</td>'
          +'</tr>';
      });
      tbody.innerHTML=h;
    });
  }).catch(function(){tbody.innerHTML='<tr><td colspan="5" style="text-align:center;color:#ff6b6b;padding:2rem">Error</td></tr>';});
}

function admSaldoAction(action){
  var username=((document.getElementById('adm-saldo-user')||{}).value||'').trim().toLowerCase();
  var monto=parseFloat((document.getElementById('adm-saldo-monto')||{}).value||'0');
  var desc=((document.getElementById('adm-saldo-desc')||{}).value||'').trim()||'Ajuste manual por admin';
  var msgEl=document.getElementById('adm-saldo-msg');
  function showMsg(txt,color){
    if(!msgEl) return;
    msgEl.textContent=txt;
    msgEl.style.color=color;
    msgEl.style.borderColor=color+'44';
    msgEl.style.background=color+'11';
    msgEl.style.display='block';
  }
  if(!username){showMsg('Ingresa el usuario','#ff6b6b');return;}
  if(!monto||monto<=0){showMsg('Ingresa un monto valido','#ff6b6b');return;}
  sb.get('profiles','username=eq.'+encodeURIComponent(username)+'&limit=1').then(function(users){
    if(!users||!users[0]){showMsg('Usuario no encontrado','#ff6b6b');return;}
    var u=users[0];
    var newSaldo=action==='add'?(u.saldo||0)+monto:Math.max(0,(u.saldo||0)-monto);
    sbUpdateProfile(u.id,{saldo:newSaldo}).then(function(){
      sbAddMovimiento(u.id,action==='add'?'credito':'debito',monto,desc);
      showMsg((action==='add'?'+':'-')+'$'+monto+' MX a '+username+'. Nuevo saldo: $'+newSaldo.toLocaleString('es-MX'),'#00e676');
      admFullLoadMovs();
      /* Clear fields */
      var mu=document.getElementById('adm-saldo-monto');
      var md=document.getElementById('adm-saldo-desc');
      if(mu) mu.value=''; if(md) md.value='';
    });
  }).catch(function(){showMsg('Error de conexion','#ff6b6b');});
}

/* \u2500\u2500 TOP \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
function admLoadTop(){
  /* Top hoy */
  var hoy=new Date(); hoy.setHours(0,0,0,0);
  var semana=new Date(Date.now()-7*86400000);
  var medals=['\uD83E\uDD47','\uD83E\uDD48','\uD83E\uDD49'];
  function renderTopList(elId,users,field){
    var el=document.getElementById(elId);
    if(!el) return;
    if(!users||!users.length){el.innerHTML='<div style="text-align:center;padding:1.5rem;color:var(--muted);font-size:.82rem">Sin datos</div>';return;}
    var h='';
    users.slice(0,8).forEach(function(u,i){
      var val=u[field]||0;
      if(val<=0) return;
      var medal=i<3?medals[i]:(i+1)+'.';
      var color=i===0?'#ffd700':i===1?'#c0c0c0':i===2?'#cd7f32':'var(--muted)';
      h+='<div style="display:flex;align-items:center;gap:.6rem;padding:.55rem .65rem;background:rgba(255,255,255,.02);border-radius:8px;border:1px solid rgba(255,255,255,.05)">'
        +'<div style="width:26px;text-align:center;font-size:'+(i<3?'1rem':'.8rem')+';color:'+color+';font-weight:700;flex-shrink:0">'+medal+'</div>'
        +'<div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,var(--c2),var(--c1));display:flex;align-items:center;justify-content:center;font-family:Orbitron;font-size:.62rem;font-weight:700;color:#fff;flex-shrink:0">'+u.username.charAt(0).toUpperCase()+'</div>'
        +'<div style="flex:1;font-size:.82rem;font-weight:700;color:#fff">'+u.username+'</div>'
        +'<div style="font-family:Orbitron;font-size:.78rem;font-weight:900;color:'+(i===0?'#ffd700':'#00e676')+'">'+'$'+val.toLocaleString('es-MX')+'</div>'
        +'</div>';
    });
    el.innerHTML=h||'<div style="text-align:center;padding:1.5rem;color:var(--muted);font-size:.82rem">Sin datos</div>';
  }
  /* Top total - by saldo spent (approximation: highest saldo users) */
  sb.get('profiles','select=username,saldo&order=saldo.desc&limit=8').then(function(users){
    renderTopList('adm-top-total',users,'saldo');
  }).catch(function(){});
  /* Top hoy - from movimientos */
  sb.get('movimientos_saldo','tipo=eq.compra&created_at=gte.'+hoy.toISOString()+'&order=monto.desc&limit=20')
    .then(function(movs){
      if(!movs||!movs.length){
        var el=document.getElementById('adm-top-hoy');
        if(el) el.innerHTML='<div style="text-align:center;padding:1.5rem;color:var(--muted);font-size:.82rem">Sin compras hoy</div>';
        return;
      }
      sb.get('profiles','select=id,username').then(function(profs){
        var umap={};
        if(profs) profs.forEach(function(p){umap[p.id]=p.username;});
        var agg={};
        movs.forEach(function(m){
          var u=umap[m.user_id]||m.user_id;
          agg[u]=(agg[u]||0)+(m.monto||0);
        });
        var sorted=Object.keys(agg).map(function(u){return{username:u,saldo:agg[u]};}).sort(function(a,b){return b.saldo-a.saldo;});
        renderTopList('adm-top-hoy',sorted,'saldo');
      });
    }).catch(function(){});
  /* Top semana */
  sb.get('movimientos_saldo','tipo=eq.compra&created_at=gte.'+semana.toISOString()+'&order=monto.desc&limit=30')
    .then(function(movs){
      if(!movs||!movs.length){
        var el=document.getElementById('adm-top-semana');
        if(el) el.innerHTML='<div style="text-align:center;padding:1.5rem;color:var(--muted);font-size:.82rem">Sin datos esta semana</div>';
        return;
      }
      sb.get('profiles','select=id,username').then(function(profs){
        var umap={};
        if(profs) profs.forEach(function(p){umap[p.id]=p.username;});
        var agg={};
        movs.forEach(function(m){
          var u=umap[m.user_id]||m.user_id;
          agg[u]=(agg[u]||0)+(m.monto||0);
        });
        var sorted=Object.keys(agg).map(function(u){return{username:u,saldo:agg[u]};}).sort(function(a,b){return b.saldo-a.saldo;});
        renderTopList('adm-top-semana',sorted,'saldo');
      });
    }).catch(function(){});
}

/* \u2500\u2500 RESENAS \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
function admLoadResenas(){
  var tbody=document.getElementById('adm-resenas-body');
  if(!tbody) return;
  tbody.innerHTML='<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:2rem">Cargando...</td></tr>';
  sb.get('resenas','order=created_at.desc&limit=50').then(function(rows){
    if(!rows||!rows.length){tbody.innerHTML='<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:2rem">Sin resenas</td></tr>';return;}
    var h='';
    rows.forEach(function(r){
      var fecha=r.created_at?new Date(r.created_at).toLocaleDateString('es-MX'):'';
      var stars='';
      for(var s=1;s<=5;s++) stars+='<span style="color:'+(s<=r.stars?'#ffd000':'#333')+'">&#11088;</span>';
      h+='<tr>'
        +'<td style="font-weight:700;color:#fff">'+r.username+'</td>'
        +'<td style="color:var(--c1)">'+r.servicio+'</td>'
        +'<td>'+stars+'</td>'
        +'<td style="color:var(--muted)">'+r.texto+'</td>'
        +'<td style="color:var(--muted)">'+fecha+'</td>'
        +'<td><button data-id="'+r.id+'" onclick="admDelResena(this.dataset.id)" class="adm-action-btn" style="border-color:rgba(255,80,80,.3);color:#ff6b6b">Eliminar</button></td>'
        +'</tr>';
    });
    tbody.innerHTML=h;
  }).catch(function(){tbody.innerHTML='<tr><td colspan="6" style="text-align:center;color:#ff6b6b;padding:2rem">Error</td></tr>';});
}

function admDelResena(id){
  if(!confirm('Eliminar esta resena?')) return;
  sb.del('resenas','id=eq.'+id).then(function(){admLoadResenas();showToast('Resena eliminada');});
}

/* \u2500\u2500 REPORTE WA \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
function admSendReporte(){
  sb.get('profiles','select=saldo').then(function(users){
    var total=users&&Array.isArray(users)?users.reduce(function(s,u){return s+(u.saldo||0);},0):0;
    var since=new Date(Date.now()-86400000).toISOString();
    sb.get('movimientos_saldo','tipo=eq.compra&created_at=gte.'+since).then(function(movs){
      var ventasHoy=movs&&Array.isArray(movs)?movs.reduce(function(s,m){return s+(m.monto||0);},0):0;
      var fechaRep=new Date().toLocaleDateString('es-MX');
      var lines=[
        '*Reporte CiberStore - '+fechaRep+'*',
        '',
        'Usuarios: '+(users?users.length:0),
        'Saldo total: $'+total.toLocaleString('es-MX')+' MX',
        'Ventas hoy: $'+ventasHoy.toLocaleString('es-MX')+' MX',
        'Pedidos hoy: '+(movs?movs.length:0),
        '',
        'Panel: ciberstore.lat'
      ];
      var msg=lines.join('\n');
      var url='https://wa.me/'+WA+'?text='+encodeURIComponent(msg);
      var win=window.open(url,'_blank');
      if(!win) window.location.href=url;
    });
  }).catch(function(){showToast('Error al generar reporte');});
}

/* ================================================================
   LIVE STATS \u2014 Home counter
================================================================ */
function loadLiveStats(){
  sb.get('profiles','select=id').then(function(users){
    var el=document.getElementById('stats-users');
    if(el&&users&&Array.isArray(users)) el.textContent=users.length.toLocaleString('es-MX');
  }).catch(function(){});
  /* Count diamonds and likes from movimientos */
  sb.get('movimientos_saldo','tipo=eq.compra&select=descripcion,monto').then(function(movs){
    if(!movs||!Array.isArray(movs)) return;
    var diamonds=0, likes=0;
    movs.forEach(function(m){
      var d=(m.descripcion||'').toLowerCase();
      if(d.indexOf('diamante')>=0){
        /* Extract number from description */
        var match=d.match(/(\d[\d,]*)\s*diamante/);
        if(match) diamonds+=parseInt(match[1].replace(/,/g,''))||0;
        else diamonds+=100;
      }
      if(d.indexOf('like')>=0){
        var matchL=d.match(/(\d[\d,]*)\s*like/);
        if(matchL) likes+=parseInt(matchL[1].replace(/,/g,''))||0;
        else likes+=1000;
      }
    });
    /* Add base numbers so it doesn't look empty */
    diamonds=Math.max(diamonds+56000, 56000);
    likes=Math.max(likes+1500, 1500);
    var elD=document.getElementById('stats-diamonds');
    var elL=document.getElementById('stats-likes');
    if(elD) elD.textContent=diamonds.toLocaleString('es-MX');
    if(elL) elL.textContent=likes.toLocaleString('es-MX');
  }).catch(function(){});
  /* Rating from resenas */
  sb.get('resenas','select=stars').then(function(rows){
    if(!rows||!rows.length) return;
    var avg=(rows.reduce(function(s,r){return s+r.stars;},0)/rows.length).toFixed(1);
    var elR=document.getElementById('stats-rating');
    if(elR) elR.textContent=avg;
  }).catch(function(){});
}

/* Weekly report \u2014 every Monday */
(function(){
  var lastReport=localStorage.getItem('cs_weekly_report');
  var now=new Date();
  var isMonday=now.getDay()===1;
  var todayStr=now.toDateString();
  if(isMonday&&lastReport!==todayStr&&adminAuthed){
    localStorage.setItem('cs_weekly_report',todayStr);
    setTimeout(admSendReporte,5000);
  }
})();

/* Load live stats on home */
/* goPage wrapper consolidated above */
setTimeout(loadLiveStats,1200);

/* ================================================================
   AC80 \u2014 Codigos Free Fire
================================================================ */
var ac80CurrentProduct = '';
var ac80CurrentPrice   = 0;

function openAC80Modal(product, price){
  if(!authSession){
    showToast('Inicia sesion para comprar');
    setTimeout(showAuthModal, 600);
    return;
  }
  ac80CurrentProduct = product;
  ac80CurrentPrice   = price;
  var pn  = document.getElementById('ac80-product-name');
  var pp  = document.getElementById('ac80-product-price');
  var sal = document.getElementById('ac80-saldo');
  var err = document.getElementById('ac80-err');
  var id  = document.getElementById('ac80-id');
  var nom = document.getElementById('ac80-nombre');
  if(pn)  pn.textContent  = 'AC80 - ' + product;
  if(pp)  pp.textContent  = '$' + price.toLocaleString('es-MX') + ' MX';
  if(sal) sal.textContent = '$' + (authSession.saldo||0).toLocaleString('es-MX') + ' MX';
  if(err) err.style.display = 'none';
  if(id)  id.value  = '';
  if(nom) nom.value = '';
  var el = document.getElementById('modal-ac80');
  if(el){ el.style.display='flex'; el.style.alignItems='center'; el.style.justifyContent='center'; }
}

function closeAC80Modal(){
  var el = document.getElementById('modal-ac80');
  if(el) el.style.display = 'none';
}

function submitAC80(){
  var ffId  = ((document.getElementById('ac80-id')||{}).value||'').trim();
  var ffNom = ((document.getElementById('ac80-nombre')||{}).value||'').trim();
  var err   = document.getElementById('ac80-err');

  if(!ffId){ if(err){err.textContent='Ingresa tu ID de Free Fire';err.style.display='block';} return; }
  if(!ffNom){ if(err){err.textContent='Ingresa tu nombre en el juego';err.style.display='block';} return; }

  var saldo = authSession ? (authSession.saldo||0) : 0;
  if(saldo < ac80CurrentPrice){
    if(err){
      err.textContent = 'Saldo insuficiente ($' + saldo.toLocaleString('es-MX') + ' MX). Recarga tu cuenta.';
      err.style.display = 'block';
    }
    return;
  }

  var ord = getNextOrder();
  addSpend(ac80CurrentPrice, 'AC80 ' + ac80CurrentProduct + ' - Pedido #' + ord);

  var lines = [
    '*PEDIDO #' + ord + ' - CiberStore*',
    '',
    'Producto: AC80 - ' + ac80CurrentProduct,
    'Precio: $' + ac80CurrentPrice.toLocaleString('es-MX') + ' MX',
    'Metodo: Saldo de la pagina',
    '',
    'ID Free Fire: ' + ffId,
    'Nombre en juego: ' + ffNom,
    'Usuario: ' + (authSession ? authSession.username : '-'),
    '',
    'Entrega: ~2 semanas al correo FF'
  ];

  closeAC80Modal();
  showToast('Pedido enviado!', 2500);

  var url = 'https://wa.me/' + WA + '?text=' + encodeURIComponent(lines.join('\n'));
  var win = window.open(url, '_blank');
  if(!win) window.location.href = url;
}

/* ================================================================
   FRAGMENTOS EVO
================================================================ */
var fragCurrent = {frags:0, diam:0, usd:0, mxn:0};


/**
 * Actualizar saldo en tiempo real desde Supabase
 */
function refreshUserBalance(){
  if(!authSession || !window.sb) return;
  
  sb.get('profiles', 'select=saldo&id=eq."'+authSession.id+'"').then(function(result){
    if(result && result[0]){
      var newSaldo = result[0].saldo || 0;
      authSession.saldo = newSaldo;
      
      // Actualizar en sidebar
      var sbEl = document.getElementById('saldo-page-balance');
      if(sbEl) sbEl.textContent = '$' + Math.round(newSaldo).toLocaleString('es-MX') + ' MX';
      
      // Actualizar en modal
      var ms = document.getElementById('modal-saldo-amt');
      if(ms) ms.textContent = '$' + Math.round(newSaldo).toLocaleString('es-MX') + ' MX';
      
      // Actualizar en modal de fragmentos
      var fs = document.getElementById('frag-saldo-disp');
      if(fs) fs.textContent = '$' + Math.round(newSaldo).toLocaleString('es-MX') + ' MX';
      
      console.log('[BALANCE] Saldo actualizado: $'+newSaldo.toLocaleString('es-MX'));
    }
  }).catch(function(e){
    console.error('[BALANCE] Error refrescando saldo:', e);
  });
}

// Refrescar saldo cada 5 segundos si hay una sesión activa
setInterval(function(){
  if(authSession) refreshUserBalance();
}, 5000);

function openFragModal(frags, diam, usd, mxn){
  if(!authSession){
    showToast('Inicia sesion para pedir');
    setTimeout(showAuthModal, 600);
    return;
  }
  updateModalBalance();
  fragCurrent = {frags:frags, diam:diam, usd:usd, mxn:mxn};
  var eq = document.getElementById('frag-qty');
  var ed = document.getElementById('frag-diam');
  var eu = document.getElementById('frag-usd');
  var em = document.getElementById('frag-mxn');
  var err = document.getElementById('frag-err');
  var fi = document.getElementById('frag-id');
  var fn = document.getElementById('frag-nombre');
  var fp = document.getElementById('frag-pago');
  var fs = document.getElementById('frag-saldo-disp');
  if(eq)  eq.textContent  = frags.toLocaleString('es-MX');
  if(ed)  ed.textContent  = diam.toLocaleString('es-MX') + ' 💎';
  if(eu)  eu.textContent  = '$' + mxn.toLocaleString('es-MX') + ' MX';
  if(em)  em.textContent  = '';
  if(err) err.style.display = 'none';
  if(fi)  fi.value  = '';
  if(fn)  fn.value  = '';
  if(fp)  fp.selectedIndex = 0;
  // Cargar saldo actual
  if(fs && authSession && authSession.saldo !== undefined){
    fs.textContent = '$' + Math.round(authSession.saldo).toLocaleString('es-MX') + ' MX';
  } else if(fs && window.sb && authSession){
    // Si no hay saldo en sesión, cargar de Supabase
    sb.get('profiles', 'select=saldo&id=eq."'+authSession.id+'"').then(function(result){
      if(result && result[0]){
        var saldo = result[0].saldo || 0;
        if(fs) fs.textContent = '$' + Math.round(saldo).toLocaleString('es-MX') + ' MX';
      }
    });
  }
  var el = document.getElementById('modal-frag');
  if(el){ el.style.display='flex'; el.style.alignItems='center'; el.style.justifyContent='center'; }
}

function closeFragModal(){
  var el = document.getElementById('modal-frag');
  if(el) el.style.display = 'none';
}

function submitFrag(){
  var ffId   = ((document.getElementById('frag-id')||{}).value||'').trim();
  var ffNom  = ((document.getElementById('frag-nombre')||{}).value||'').trim();
  var pago   = ((document.getElementById('frag-pago')||{}).value||'');
  var err    = document.getElementById('frag-err');
  function showErr(msg){ if(err){err.textContent=msg;err.style.display='block';} }

  if(!ffId)  { showErr('Ingresa tu ID de Free Fire'); return; }
  if(!ffNom) { showErr('Ingresa tu nombre en el juego'); return; }
  if(!pago)  { showErr('Selecciona un metodo de pago'); return; }

  // Verificar saldo para fragmentos
  var saldoActual = authSession ? (authSession.saldo || 0) : 0;
  if(saldoActual < fragCurrent.mxn){
    showErr('Saldo insuficiente. Tu saldo: $'+Math.round(saldoActual).toLocaleString('es-MX')+' MX. Necesitas: $'+fragCurrent.mxn.toLocaleString('es-MX')+' MX');
    return;
  }

  var ord = getNextOrder();
  // Restar saldo por la compra
  addSpend(fragCurrent.mxn, 'Fragmentos Evo: '+fragCurrent.frags+' frags / '+fragCurrent.diam+' diamantes - Pedido #'+ord);
  var lines = [
    '*PEDIDO #' + ord + ' - CiberStore*',
    '',
    'Servicio: Fragmentos Evo',
    'Fragmentos: ' + fragCurrent.frags.toLocaleString('es-MX'),
    'Diamantes: ' + fragCurrent.diam.toLocaleString('es-MX') + ' \uD83D\uDC8E',
    'Precio: $' + fragCurrent.usd + ' USD (~$' + fragCurrent.mxn.toLocaleString('es-MX') + ' MX)',
    'Metodo de pago: ' + pago,
    '',
    'ID Free Fire: ' + ffId,
    'Nombre en juego: ' + ffNom,
    'Usuario CiberStore: ' + (authSession ? authSession.username : '-'),
    '',
    'Por favor coordinar pago y entrega.'
  ];

  closeFragModal();
  showToast('Abriendo WhatsApp...', 2000);
  var url = 'https://wa.me/' + WA + '?text=' + encodeURIComponent(lines.join('\n'));
  var win = window.open(url, '_blank');
  if(!win) window.location.href = url;
}


/* \u2500\u2500 CART WITH SALDO \u2500\u2500 */
function renderCart(){
  var body=document.getElementById('cart-modal-body');
  if(!body) return;
  var c=getCart(); cart=c;
  if(!c.length){ body.innerHTML='<div class="cart-empty">Tu carrito esta vacio</div>'; return; }
  var total=c.reduce(function(s,i){return s+i.price;},0);
  var saldo=authSession?(authSession.saldo||0):0;
  var enough=saldo>=total;
  var rows=c.map(function(item){
    return '<div class="cart-item"><div class="ci-info"><div class="ci-name">'+item.name+'</div><div class="ci-sub">'+fmt(item.price)+'</div></div><button class="ci-del" onclick="removeFromCart('+item.id+')">&#215;</button></div>';
  }).join('');
  rows+='<div class="cart-total"><span>Total</span><span style="color:'+(enough?'#00e676':'#ff6b6b')+'">'+fmt(total)+'</span></div>';
  rows+='<div style="display:flex;justify-content:space-between;background:rgba(0,230,118,.06);border:1px solid rgba(0,230,118,.18);border-radius:8px;padding:.5rem .85rem;margin:.5rem 0"><span style="font-size:.72rem;color:var(--muted)">Tu saldo</span><span style="font-family:Orbitron;font-weight:700;color:'+(enough?'#00e676':'#ff6b6b')+'">$'+saldo.toLocaleString('es-MX')+' MX</span></div>';
  if(!authSession){
    rows+='<button onclick="closeCart();showAuthModal();" style="width:100%;padding:.72rem;background:linear-gradient(90deg,#0055cc,#00aaff);color:#fff;border:none;border-radius:7px;font-weight:700;font-size:.9rem;cursor:pointer">Inicia sesion</button>';
  } else if(!enough){
    var falta=total-saldo;
    rows+='<div style="font-size:.78rem;color:#ff6b6b;margin-bottom:.5rem">Saldo insuficiente. Te faltan $'+falta.toLocaleString('es-MX')+' MX.</div>';
    rows+='<button onclick="closeCart();goPage(String.fromCharCode(115,97,108,100,111));" style="width:100%;padding:.72rem;background:linear-gradient(90deg,#128c3e,#25d366);color:#fff;border:none;border-radius:7px;font-weight:700;font-size:.9rem;cursor:pointer">Recargar saldo</button>';
  } else {
    rows+='<label style="display:block;font-size:.62rem;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#5a6580;margin:.5rem 0 .2rem">ID de Free Fire</label>';
    rows+='<input id="cart-ff-id" type="text" placeholder="Ej: 123456789" style="width:100%;background:#10131f;border:1px solid rgba(0,150,255,.2);color:#fff;border-radius:5px;padding:.48rem .72rem;font-size:.84rem;margin-bottom:.4rem;box-sizing:border-box"/>';
    rows+='<label style="display:block;font-size:.62rem;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#5a6580;margin-bottom:.2rem">Nombre en el juego</label>';
    rows+='<input id="cart-ff-nombre" type="text" placeholder="Tu nickname" style="width:100%;background:#10131f;border:1px solid rgba(0,150,255,.2);color:#fff;border-radius:5px;padding:.48rem .72rem;font-size:.84rem;margin-bottom:.55rem;box-sizing:border-box"/>';
    rows+='<div id="cart-err" style="color:#ff6b6b;font-size:.75rem;margin-bottom:.4rem;display:none"></div>';
    rows+='<button onclick="submitCart()" style="width:100%;padding:.72rem;background:linear-gradient(90deg,#128c3e,#25d366);color:#fff;border:none;border-radius:7px;font-weight:700;font-size:.9rem;cursor:pointer">Confirmar con saldo</button>';
  }
  body.innerHTML=rows;
}

function submitCart(){
  if(!authSession){ showToast('Inicia sesion'); return; }
  var ffId=((document.getElementById('cart-ff-id')||{}).value||'').trim();
  var ffNom=((document.getElementById('cart-ff-nombre')||{}).value||'').trim();
  var errEl=document.getElementById('cart-err');
  var btn=document.getElementById('cart-confirm-btn');
  function showErr(m){ if(errEl){errEl.textContent=m;errEl.style.display='block';} }
  if(!ffId){ showErr('Ingresa tu ID de Free Fire'); return; }
  if(!ffNom){ showErr('Ingresa tu nombre en el juego'); return; }
  var c=getCart();
  if(!c.length){ showErr('Tu carrito esta vacio'); return; }
  var total=c.reduce(function(s,i){return s+i.price;},0);
  var saldo=authSession.saldo||0;
  if(saldo<total){ showErr('Saldo insuficiente ($'+saldo.toLocaleString('es-MX')+' MX). Recarga tu cuenta.'); return; }
  // Anti-doble-click
  if(btn && btn.disabled) return;
  if(btn){ btn.disabled=true; setTimeout(function(){ if(btn) btn.disabled=false; }, 4000); }
  if(errEl) errEl.style.display='none';
  var ord=getNextOrder();
  var names=c.map(function(i){return i.name;}).join(', ');
  addSpend(total,'Carrito: '+names+' - Pedido #'+ord);
  if(typeof tgNotifyPurchase==='function') tgNotifyPurchase(authSession.username,'Carrito: '+names,total,ord);
  showToast('Pedido #'+ord+' confirmado!',2500);
  clearCart(); closeCart();
}

/* Auto-call renderCart when opening cart */
var _origOpenCart=openCart;
openCart=function(){
  _origOpenCart();
  setTimeout(renderCart,50);
};

/* ================================================================
   LIKES 2K & 200 RANKINGS
================================================================ */
function _buildLikesRanking(listId, keyword, medals){
  var el = document.getElementById(listId);
  if(!el) return;
  el.innerHTML = '<div style="text-align:center;padding:1.25rem;color:var(--muted)">Cargando...</div>';

  sb.get('movimientos_saldo','tipo=eq.compra&select=user_id,descripcion,monto&order=created_at.desc')
    .then(function(movs){
      if(!movs||!movs.length){
        el.innerHTML='<div style="text-align:center;padding:1.25rem;color:var(--muted);font-size:.8rem">Sin datos aun</div>';
        return;
      }
      var agg = {};
      movs.forEach(function(m){
        var d = (m.descripcion||'').toLowerCase();
        if(d.indexOf(keyword)<0) return;
        var uid = m.user_id;
        if(!agg[uid]) agg[uid] = {likes:0};
        var match = d.match(/\((\d[\d,]+)\)/);
        if(match) agg[uid].likes += parseInt(match[1].replace(/,/g,''))||0;
        else agg[uid].likes += parseInt(m.monto||0);
      });

      if(!Object.keys(agg).length){
        el.innerHTML='<div style="text-align:center;padding:1.25rem;color:var(--muted);font-size:.8rem">Sin compras aun</div>';
        return;
      }

      sb.get('profiles','select=id,username,role').then(function(profs){
        var umap={}, admins={};
        if(profs) profs.forEach(function(p){
          umap[p.id]=p.username;
          if(p.role==='admin') admins[p.id]=true;
        });

        var sorted = Object.keys(agg)
          .filter(function(uid){ return !admins[uid] && agg[uid].likes>0; })
          .map(function(uid){ return {uid:uid, username:umap[uid]||'Usuario', likes:agg[uid].likes}; })
          .sort(function(a,b){ return b.likes-a.likes; })
          .slice(0,10);

        if(!sorted.length){
          el.innerHTML='<div style="text-align:center;padding:1.25rem;color:var(--muted);font-size:.8rem">Sin datos</div>';
          return;
        }

        var h='';
        sorted.forEach(function(u,i){
          var isMe = authSession && authSession.username===u.username;
          var initial = (u.username||'?').charAt(0).toUpperCase();
          var medalColor = i===0?'#ffd700':i===1?'#c0c0c0':i===2?'#cd7f32':'var(--muted)';
          h+='<div style="display:flex;align-items:center;gap:.6rem;padding:.6rem 1rem;border-bottom:1px solid rgba(255,255,255,.04)'+(i===0?';background:rgba(255,77,166,.04)':'')+'">'
            +'<span style="font-size:'+(i<3?'1rem':'.78rem')+';flex-shrink:0;color:'+medalColor+'">'+(i<3?medals[i]:(i+1)+'.')+'</span>'
            +'<div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#ff006688,#ff4da6);display:flex;align-items:center;justify-content:center;font-size:.65rem;font-weight:900;color:#fff;flex-shrink:0">'+initial+'</div>'
            +'<div style="flex:1;min-width:0">'
              +'<div style="font-size:.82rem;font-weight:700;color:#fff">'+u.username+(isMe?' <span style="font-size:.58rem;background:rgba(255,77,166,.15);color:#ff4da6;padding:.05rem .28rem;border-radius:3px">Tu</span>':'')+'</div>'
              +'<div style="font-size:.65rem;color:var(--muted)">Compro '+u.likes.toLocaleString('es-MX')+' likes</div>'
            +'</div>'
            +'</div>';
        });
        el.innerHTML = h;
      }).catch(function(){ el.innerHTML='<div style="text-align:center;padding:1.25rem;color:#ff6b6b;font-size:.8rem">Error</div>'; });
    }).catch(function(){ el.innerHTML='<div style="text-align:center;padding:1.25rem;color:#ff6b6b;font-size:.8rem">Error</div>'; });
}

var _medals = ['\uD83E\uDD47','\uD83E\uDD48','\uD83E\uDD49'];

function loadLikes2kRanking(){ _buildLikesRanking('likes2k-ranking-list','likes 2k',_medals); }
function loadLikes200Ranking(){ _buildLikesRanking('likes200-ranking-list','likes 200',_medals); }

/* Auto-load on page visit */
var _origGoPageLk2 = goPage;
goPage = function(id){
  _origGoPageLk2(id);
  if(id==='likes2k') setTimeout(loadLikes2kRanking,400);
  if(id==='likes200') setTimeout(loadLikes200Ranking,400);
};

/* ================================================================
   LIKES 2K & 200 ORDER FORMS
================================================================ */
function submitLk2k(){
  var plan   = ((document.getElementById('lk2k-plan')||{}).value||'').split('|');
  var ffId   = ((document.getElementById('lk2k-id')||{}).value||'').trim();
  var ffNom  = ((document.getElementById('lk2k-nombre')||{}).value||'').trim();
  var errEl  = document.getElementById('lk2k-err');
  function showErr(m){ if(errEl){errEl.textContent=m;errEl.style.display='block';} }
  if(errEl) errEl.style.display='none';
  if(!ffId)  { showErr('Ingresa tu ID de Free Fire'); return; }
  if(!ffNom) { showErr('Ingresa tu nombre en el juego'); return; }
  var likes  = plan[0]||'2000';
  var precio = plan[1]||'85';
  var msg = 'Hola!%20Quiero%20comprar%20Likes%202K%0A%0A'
    + 'Plan%3A%20'+likes+'%20likes%20-%20%24'+precio+'%20MX%0A'
    + 'ID%20FF%3A%20'+encodeURIComponent(ffId)+'%0A'
    + 'Nombre%3A%20'+encodeURIComponent(ffNom);
  window.open('https://wa.me/5215548461200?text='+msg,'_blank');
}

function submitLk200(){
  var plan   = ((document.getElementById('lk200-plan')||{}).value||'').split('|');
  var ffId   = ((document.getElementById('lk200-id')||{}).value||'').trim();
  var ffNom  = ((document.getElementById('lk200-nombre')||{}).value||'').trim();
  var errEl  = document.getElementById('lk200-err');
  function showErr(m){ if(errEl){errEl.textContent=m;errEl.style.display='block';} }
  if(errEl) errEl.style.display='none';
  if(!ffId)  { showErr('Ingresa tu ID de Free Fire'); return; }
  if(!ffNom) { showErr('Ingresa tu nombre en el juego'); return; }
  var likes  = plan[0]||'200';
  var precio = plan[1]||'35';
  var msg = 'Hola!%20Quiero%20comprar%20Likes%20200%0A%0A'
    + 'Plan%3A%20'+likes+'%20likes%20-%20%24'+precio+'%20MX%0A'
    + 'ID%20FF%3A%20'+encodeURIComponent(ffId)+'%0A'
    + 'Nombre%3A%20'+encodeURIComponent(ffNom);
  window.open('https://wa.me/5215548461200?text='+msg,'_blank');
}

/* ================================================================
   LIKES 2K & 200 \u2014 SALDO PAYMENT
================================================================ */
var LK2K_PLANES = {
  '2000|120':  {likes:2000,  precio:120,  label:'2,000 likes - 1 dia'},
  '4000|230':  {likes:4000,  precio:230,  label:'4,000 likes - 2 dias'},
  '10000|590': {likes:10000, precio:590,  label:'10,000 likes - 5 dias'},
  '20000|1190':{likes:20000, precio:1190, label:'20,000 likes - 10 dias'}
};

var LK200_PLANES = {
  '200|10':   {likes:200,  precio:10,  label:'200 likes - 1 dia'},
  '1400|25':  {likes:1400, precio:25,  label:'1,400 likes - 7 dias'},
  '2800|35':  {likes:2800, precio:35,  label:'2,800 likes - 14 dias'},
  '4200|60':  {likes:4200, precio:60,  label:'4,200 likes - 21 dias'},
  '6600|70':  {likes:6600, precio:70,  label:'6,600 likes - 30 dias'}
};

function _updateLkSaldo(saldoElId){
  var el = document.getElementById(saldoElId);
  if(el && authSession) el.textContent='$'+(authSession.saldo||0).toLocaleString('es-MX')+' MX';
}

function submitLk2kSaldo(){
  if(!authSession){ showToast('Inicia sesion para comprar'); return; }
  var planKey = ((document.getElementById('lk2k-plan')||{}).value||'');
  var ffId    = ((document.getElementById('lk2k-id')||{}).value||'').trim();
  var ffNom   = ((document.getElementById('lk2k-nombre')||{}).value||'').trim();
  var errEl   = document.getElementById('lk2k-err');
  function showErr(m){ if(errEl){errEl.textContent=m;errEl.style.display='block';} }
  if(errEl) errEl.style.display='none';
  if(!ffId)  { showErr('Ingresa tu ID de Free Fire'); return; }
  if(!ffNom) { showErr('Ingresa tu nombre en el juego'); return; }
  var plan = LK2K_PLANES[planKey];
  if(!plan){ showErr('Selecciona un plan'); return; }
  var saldo = authSession.saldo||0;
  if(saldo < plan.precio){
    showErr('Saldo insuficiente ($'+saldo.toLocaleString('es-MX')+' MX). Recarga tu cuenta.');
    return;
  }
  var ord = getNextOrder();
  addSpend(plan.precio, 'Venta Likes 2K: '+plan.label+' - ID:'+ffId+' - Pedido #'+ord);
  if(typeof tgNotifyPurchase==='function') tgNotifyPurchase(
    authSession.username,
    'Likes 2K: '+plan.label+' (ID: '+ffId+' / '+ffNom+')',
    plan.precio, ord
  );
  showToast('\u2705 Pedido #'+ord+' confirmado!', 2500);
  var idEl=document.getElementById('lk2k-id'); if(idEl) idEl.value='';
  var nomEl=document.getElementById('lk2k-nombre'); if(nomEl) nomEl.value='';
  _updateLkSaldo('lk2k-saldo-val');
}

function submitLk200Saldo(){
  if(!authSession){ showToast('Inicia sesion para comprar'); return; }
  var planKey = ((document.getElementById('lk200-plan')||{}).value||'');
  var ffId    = ((document.getElementById('lk200-id')||{}).value||'').trim();
  var ffNom   = ((document.getElementById('lk200-nombre')||{}).value||'').trim();
  var errEl   = document.getElementById('lk200-err');
  function showErr(m){ if(errEl){errEl.textContent=m;errEl.style.display='block';} }
  if(errEl) errEl.style.display='none';
  if(!ffId)  { showErr('Ingresa tu ID de Free Fire'); return; }
  if(!ffNom) { showErr('Ingresa tu nombre en el juego'); return; }
  var plan = LK200_PLANES[planKey];
  if(!plan){ showErr('Selecciona un plan'); return; }
  var saldo = authSession.saldo||0;
  if(saldo < plan.precio){
    showErr('Saldo insuficiente ($'+saldo.toLocaleString('es-MX')+' MX). Recarga tu cuenta.');
    return;
  }
  var ord = getNextOrder();
  addSpend(plan.precio, 'Venta Likes 200: '+plan.label+' - ID:'+ffId+' - Pedido #'+ord);
  if(typeof tgNotifyPurchase==='function') tgNotifyPurchase(
    authSession.username,
    'Likes 200: '+plan.label+' (ID: '+ffId+' / '+ffNom+')',
    plan.precio, ord
  );
  showToast('\u2705 Pedido #'+ord+' confirmado!', 2500);
  var idEl=document.getElementById('lk200-id'); if(idEl) idEl.value='';
  var nomEl=document.getElementById('lk200-nombre'); if(nomEl) nomEl.value='';
  _updateLkSaldo('lk200-saldo-val');
}

/* Update saldo display when visiting pages */
var _origGoPageLkSaldo = goPage;
goPage = function(id){
  _origGoPageLkSaldo(id);
  if(id==='likes2k') setTimeout(function(){ _updateLkSaldo('lk2k-saldo-val'); }, 300);
  if(id==='likes200') setTimeout(function(){ _updateLkSaldo('lk200-saldo-val'); }, 300);
};

/* ════════════════════════════════════════════════════════════════════════════
   TOP & RANKING SYSTEM - COMPLETE OVERHAUL
   ════════════════════════════════════════════════════════════════════════════ */

var rankPeriod = 'daily'; // daily, weekly, monthly

/**
 * Renderiza una lista de top generica
 */
function renderTopList(elId, data, colorFn, maxItems){
  maxItems = maxItems || 10;
  var el = document.getElementById(elId);
  if(!el) return;

  var medals = ['🥇','🥈','🥉'];
  var medalColors = ['#ffd700','#c0c0c0','#cd7f32'];
  var html = '';

  data.slice(0, maxItems).forEach(function(item, i){
    var medal = i < 3 ? medals[i] : (i+1)+'.';
    var medalColor = i < 3 ? medalColors[i] : 'var(--muted)';
    var value = item.value || item.monto || item.likes || item.diamonds || 0;
    var valueColor = colorFn ? colorFn(i) : (i === 0 ? '#ffd700' : '#00e676');
    var initial = (item.username || 'U').charAt(0).toUpperCase();
    var isMe = authSession && authSession.username === item.username;
    var bg = i === 0 ? 'rgba(255,215,0,.06)' : 'rgba(255,255,255,.02)';
    var border = i === 0 ? 'rgba(255,215,0,.25)' : 'rgba(255,255,255,.06)';

    html += '<div style="background:'+bg+';border:1px solid '+border+';border-radius:11px;padding:.75rem 1rem;display:flex;align-items:center;gap:.75rem;'+(i===0?'box-shadow:0 0 20px rgba(255,215,0,.08);':'')+'margin-bottom:.5rem">'
      + '<div style="width:30px;text-align:center;font-size:'+(i<3?'1.2rem':'.82rem')+';color:'+medalColor+';font-weight:700;flex-shrink:0">'+medal+'</div>'
      + '<div style="width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,var(--c2),var(--c1));display:flex;align-items:center;justify-content:center;font-family:Orbitron;font-size:.72rem;font-weight:900;color:#fff;flex-shrink:0;border:2px solid '+medalColor+'44">'+initial+'</div>'
      + '<div style="flex:1;min-width:0">'
      + '<div style="font-size:.85rem;font-weight:700;color:#fff">'+item.username+(isMe?' <span style="font-size:.62rem;background:rgba(0,170,255,.15);color:var(--c1);padding:.1rem .35rem;border-radius:4px">Tu</span>':'')+' </div>'
      + '</div>'
      + '<div style="text-align:right;flex-shrink:0;font-family:Orbitron;font-size:.82rem;font-weight:900;color:'+valueColor+'">$'+Math.round(value).toLocaleString('es-MX')+'</div>'
      + '</div>';
  });

  el.innerHTML = html || '<div style="text-align:center;padding:1.5rem;color:var(--muted);font-size:.82rem">Sin datos</div>';
}

/**
 * Top por periodo (dinero gastado)
 */
function loadRankingByPeriod(period){
  rankPeriod = period;
  var since = null;
  
  // Verificar que sb esté disponible
  if(!window.sb || typeof sb !== 'object'){
    console.error('[RANKING] sb no disponible. Asegúrate de que supabase_integration.js está cargado');
    var el = document.getElementById('rank-list-top-'+period);
    if(el) el.innerHTML = '<div style="text-align:center;padding:1.5rem;color:#ff9900;font-size:.82rem">⚠️ Error: Supabase no está disponible</div>';
    return;
  }

  if(period === 'weekly')  since = new Date(Date.now()-7*86400000).toISOString();
  if(period === 'monthly') since = new Date(Date.now()-30*86400000).toISOString();
  // daily: since = null (mismo dia)
  if(period === 'daily')   since = new Date(new Date().setHours(0,0,0,0)).toISOString();

  // Mostrar "Cargando..."
  ['rank-list-top-diario','rank-list-top-semanal','rank-list-top-mensual','rank-list-top-general'].forEach(function(id){
    var el = document.getElementById(id);
    if(el) el.innerHTML = '<div style="text-align:center;padding:1.5rem;color:var(--muted)">Cargando...</div>';
  });

  var qs = 'tipo=eq.compra&select=user_id,monto' + (since ? '&created_at=gte.'+since : '');
  sb.get('movimientos_saldo', qs).then(function(movs){
    if(!movs || !Array.isArray(movs) || !movs.length){
      document.getElementById('rank-list-top-'+period).innerHTML = '<div style="text-align:center;padding:1.5rem;color:var(--muted);font-size:.82rem">Sin compras</div>';
      return;
    }

    // Agregar por usuario
    var agg = {};
    movs.forEach(function(m){
      var uid = m.user_id;
      agg[uid] = (agg[uid] || 0) + (m.monto || 0);
    });

    // Obtener usernames
    var uids = Object.keys(agg);
    sb.get('profiles', 'select=id,username&id=in.('+uids.map(function(u){return '"'+u+'"';}).join(',')+')').then(function(profs){
      var umap = {};
      if(profs) profs.forEach(function(p){ umap[p.id] = p.username; });

      var sorted = uids.map(function(uid){
        return {username: umap[uid] || 'Usuario', value: agg[uid]};
      }).sort(function(a,b){ return b.value - a.value; }).slice(0,10);

      renderTopList('rank-list-top-'+period, sorted);
    });
  }).catch(function(){
    document.getElementById('rank-list-top-'+period).innerHTML = '<div style="text-align:center;padding:1.5rem;color:#ff6b6b;font-size:.82rem">Error</div>';
  });
}

function setRankPeriod(period){
  rankPeriod = period;
  // Cambiar tabs activos
  ['rtab-daily','rtab-weekly','rtab-monthly'].forEach(function(id){
    var el = document.getElementById(id);
    if(el) el.classList.toggle('active', id === 'rtab-'+period);
  });
  // Cargar datos
  loadRankingByPeriod(period);
}

/**
 * Top general (todos los tiempos)
 */
function loadTopGeneral(){
  var el = document.getElementById('rank-list-top-general');
  if(!el) return;
  
  if(!window.sb || typeof sb !== 'object'){
    el.innerHTML = '<div style="text-align:center;padding:1.5rem;color:#ff9900;font-size:.82rem">⚠️ Esperando conexión...</div>';
    setTimeout(loadTopGeneral, 2000);
    return;
  }
  el.innerHTML = '<div style="text-align:center;padding:1.5rem;color:var(--muted)">Cargando...</div>';

  sb.get('movimientos_saldo', 'tipo=eq.compra&select=user_id,monto').then(function(movs){
    if(!movs || !Array.isArray(movs) || !movs.length){
      el.innerHTML = '<div style="text-align:center;padding:1.5rem;color:var(--muted);font-size:.82rem">Sin datos historicos</div>';
      return;
    }

    var agg = {};
    movs.forEach(function(m){
      var uid = m.user_id;
      agg[uid] = (agg[uid] || 0) + (m.monto || 0);
    });

    var uids = Object.keys(agg);
    sb.get('profiles', 'select=id,username&id=in.('+uids.map(function(u){return '"'+u+'"';}).join(',')+')').then(function(profs){
      var umap = {};
      if(profs) profs.forEach(function(p){ umap[p.id] = p.username; });

      var sorted = uids.map(function(uid){
        return {username: umap[uid] || 'Usuario', value: agg[uid]};
      }).sort(function(a,b){ return b.value - a.value; }).slice(0,15);

      renderTopList('rank-list-top-general', sorted);
    });
  }).catch(function(){
    el.innerHTML = '<div style="text-align:center;padding:1.5rem;color:#ff6b6b;font-size:.82rem">Error</div>';
  });
}

/**
 * Top compradores de LIKES
 */
function loadTopLikes(){
  var el = document.getElementById('rank-list-top-likes');
  if(!el) return;
  el.innerHTML = '<div style="text-align:center;padding:1.5rem;color:var(--muted)">Cargando...</div>';

  sb.get('movimientos_saldo', 'tipo=eq.compra&select=user_id,descripcion,monto').then(function(movs){
    if(!movs || !Array.isArray(movs) || !movs.length){
      el.innerHTML = '<div style="text-align:center;padding:1.5rem;color:var(--muted);font-size:.82rem">Sin compras de likes aun</div>';
      return;
    }

    // Filtrar solo likes y sumar
    var agg = {};
    movs.forEach(function(m){
      var desc = (m.descripcion || '').toLowerCase();
      if(desc.indexOf('like') < 0) return; // solo likes

      var uid = m.user_id;
      if(!agg[uid]) agg[uid] = {monto: 0, likes: 0};
      agg[uid].monto += (m.monto || 0);

      // Extraer cantidad de likes
      var match = desc.match(/(\\d[\\d,]*)\\s*like/);
      if(match) agg[uid].likes += parseInt(match[1].replace(/[,]/g,''))||0;
    });

    var uids = Object.keys(agg);
    if(!uids.length){
      el.innerHTML = '<div style="text-align:center;padding:1.5rem;color:var(--muted);font-size:.82rem">Sin compras de likes</div>';
      return;
    }

    sb.get('profiles', 'select=id,username&id=in.('+uids.map(function(u){return '"'+u+'"';}).join(',')+')').then(function(profs){
      var umap = {};
      if(profs) profs.forEach(function(p){ umap[p.id] = p.username; });

      var sorted = uids.map(function(uid){
        return {username: umap[uid] || 'Usuario', value: agg[uid].monto, likes: agg[uid].likes};
      }).sort(function(a,b){ return b.value - a.value; }).slice(0,15);

      // Renderizar con likes incluidos
      var medals = ['🥇','🥈','🥉'];
      var html = '';
      sorted.forEach(function(item, i){
        var medal = i < 3 ? medals[i] : (i+1)+'.';
        var medalColor = i < 3 ? (i===0?'#ffd700':i===1?'#c0c0c0':'#cd7f32') : 'var(--muted)';
        var initial = (item.username || 'U').charAt(0).toUpperCase();
        var isMe = authSession && authSession.username === item.username;
        var bg = i === 0 ? 'rgba(255,215,0,.06)' : 'rgba(255,255,255,.02)';
        var border = i === 0 ? 'rgba(255,215,0,.25)' : 'rgba(255,255,255,.06)';

        html += '<div style="background:'+bg+';border:1px solid '+border+';border-radius:11px;padding:.75rem 1rem;display:flex;align-items:center;gap:.75rem;margin-bottom:.5rem">'
          + '<div style="width:30px;text-align:center;font-size:'+(i<3?'1.2rem':'.82rem')+';color:'+medalColor+';font-weight:700;flex-shrink:0">'+medal+'</div>'
          + '<div style="width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,var(--c2),var(--c1));display:flex;align-items:center;justify-content:center;font-family:Orbitron;font-size:.72rem;font-weight:900;color:#fff;flex-shrink:0;border:2px solid '+medalColor+'44">'+initial+'</div>'
          + '<div style="flex:1;min-width:0">'
          + '<div style="font-size:.85rem;font-weight:700;color:#fff">'+item.username+(isMe?' <span style="font-size:.62rem;background:rgba(0,170,255,.15);color:var(--c1);padding:.1rem .35rem;border-radius:4px">Tu</span>':'')+' </div>'
          + '<div style="font-size:.65rem;color:var(--muted);margin-top:.15rem">👍 '+item.likes.toLocaleString('es-MX')+' likes</div>'
          + '</div>'
          + '<div style="text-align:right;flex-shrink:0;font-family:Orbitron;font-size:.82rem;font-weight:900;color:'+(i===0?'#ffd700':'#00e676')+'">$'+item.value.toLocaleString('es-MX')+'</div>'
          + '</div>';
      });

      el.innerHTML = html;
    });
  }).catch(function(){
    el.innerHTML = '<div style="text-align:center;padding:1.5rem;color:#ff6b6b;font-size:.82rem">Error</div>';
  });
}

/**
 * Top compradores de DIAMANTES
 */
function loadTopDiamantes(){
  var el = document.getElementById('rank-list-top-diamantes');
  if(!el) return;
  el.innerHTML = '<div style="text-align:center;padding:1.5rem;color:var(--muted)">Cargando...</div>';

  sb.get('movimientos_saldo', 'tipo=eq.compra&select=user_id,descripcion,monto').then(function(movs){
    if(!movs || !Array.isArray(movs) || !movs.length){
      el.innerHTML = '<div style="text-align:center;padding:1.5rem;color:var(--muted);font-size:.82rem">Sin compras de diamantes aun</div>';
      return;
    }

    // Filtrar solo diamantes y sumar
    var agg = {};
    movs.forEach(function(m){
      var desc = (m.descripcion || '').toLowerCase();
      if(desc.indexOf('diamante') < 0) return; // solo diamantes

      var uid = m.user_id;
      if(!agg[uid]) agg[uid] = {monto: 0, diamantes: 0};
      agg[uid].monto += (m.monto || 0);

      // Extraer cantidad de diamantes
      var match = desc.match(/(\\d[\\d,]*)\\s*diamante/);
      if(match) agg[uid].diamantes += parseInt(match[1].replace(/[,]/g,''))||0;
    });

    var uids = Object.keys(agg);
    if(!uids.length){
      el.innerHTML = '<div style="text-align:center;padding:1.5rem;color:var(--muted);font-size:.82rem">Sin compras de diamantes</div>';
      return;
    }

    sb.get('profiles', 'select=id,username&id=in.('+uids.map(function(u){return '"'+u+'"';}).join(',')+')').then(function(profs){
      var umap = {};
      if(profs) profs.forEach(function(p){ umap[p.id] = p.username; });

      var sorted = uids.map(function(uid){
        return {username: umap[uid] || 'Usuario', value: agg[uid].monto, diamantes: agg[uid].diamantes};
      }).sort(function(a,b){ return b.value - a.value; }).slice(0,15);

      // Renderizar con diamantes incluidos
      var medals = ['🥇','🥈','🥉'];
      var html = '';
      sorted.forEach(function(item, i){
        var medal = i < 3 ? medals[i] : (i+1)+'.';
        var medalColor = i < 3 ? (i===0?'#ffd700':i===1?'#c0c0c0':'#cd7f32') : 'var(--muted)';
        var initial = (item.username || 'U').charAt(0).toUpperCase();
        var isMe = authSession && authSession.username === item.username;
        var bg = i === 0 ? 'rgba(255,215,0,.06)' : 'rgba(255,255,255,.02)';
        var border = i === 0 ? 'rgba(255,215,0,.25)' : 'rgba(255,255,255,.06)';

        html += '<div style="background:'+bg+';border:1px solid '+border+';border-radius:11px;padding:.75rem 1rem;display:flex;align-items:center;gap:.75rem;margin-bottom:.5rem">'
          + '<div style="width:30px;text-align:center;font-size:'+(i<3?'1.2rem':'.82rem')+';color:'+medalColor+';font-weight:700;flex-shrink:0">'+medal+'</div>'
          + '<div style="width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,var(--c2),var(--c1));display:flex;align-items:center;justify-content:center;font-family:Orbitron;font-size:.72rem;font-weight:900;color:#fff;flex-shrink:0;border:2px solid '+medalColor+'44">'+initial+'</div>'
          + '<div style="flex:1;min-width:0">'
          + '<div style="font-size:.85rem;font-weight:700;color:#fff">'+item.username+(isMe?' <span style="font-size:.62rem;background:rgba(0,170,255,.15);color:var(--c1);padding:.1rem .35rem;border-radius:4px">Tu</span>':'')+' </div>'
          + '<div style="font-size:.65rem;color:var(--muted);margin-top:.15rem">💎 '+item.diamantes.toLocaleString('es-MX')+' diamantes</div>'
          + '</div>'
          + '<div style="text-align:right;flex-shrink:0;font-family:Orbitron;font-size:.82rem;font-weight:900;color:'+(i===0?'#ffd700':'#00e676')+'">$'+item.value.toLocaleString('es-MX')+'</div>'
          + '</div>';
      });

      el.innerHTML = html;
    });
  }).catch(function(){
    el.innerHTML = '<div style="text-align:center;padding:1.5rem;color:#ff6b6b;font-size:.82rem">Error</div>';
  });
}

/**
 * Cargar todos los tops cuando se abre la página de ranking
 */

/**
 * Top Habibis - Top 1-3 del día
 */
function loadTopHabibis(){
  var el = document.getElementById('rank-list-habibis');
  if(!el) return;

  if(!window.sb || typeof sb !== 'object'){
    console.log('[HABIBI] Supabase no listo');
    return;
  }

  var hoy = new Date(new Date().setHours(0,0,0,0)).toISOString();
  var qs = 'tipo=eq.compra&select=user_id,monto&created_at=gte.'+hoy;
  
  sb.get('movimientos_saldo', qs).then(function(movs){
    if(!movs || !Array.isArray(movs) || !movs.length){
      el.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--muted);font-size:.82rem">Sin compras hoy</div>';
      return;
    }

    var agg = {};
    movs.forEach(function(m){
      var uid = m.user_id;
      agg[uid] = (agg[uid] || 0) + (m.monto || 0);
    });

    var uids = Object.keys(agg);
    sb.get('profiles', 'select=id,username&id=in.('+uids.map(function(u){return '"'+u+'"';}).join(',')+')').then(function(profs){
      var umap = {};
      if(profs) profs.forEach(function(p){ umap[p.id] = p.username; });

      var sorted = uids.map(function(uid){
        return {username: umap[uid] || 'Usuario', value: agg[uid]};
      }).sort(function(a,b){ return b.value - a.value; }).slice(0,3);

      if(!sorted.length){
        el.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--muted);font-size:.82rem">Sin datos</div>';
        return;
      }

      var medals = ['🥇','🥈','🥉'];
      var html = '';
      sorted.forEach(function(item, i){
        var medal = medals[i];
        var medalColor = i===0?'#ffd700':i===1?'#c0c0c0':'#cd7f32';
        var initial = (item.username || 'U').charAt(0).toUpperCase();
        var isMe = authSession && authSession.username === item.username;
        var bg = i === 0 ? 'rgba(255,215,0,.08)' : 'rgba(255,255,255,.02)';
        var border = i === 0 ? 'rgba(255,215,0,.3)' : 'rgba(255,255,255,.08)';

        html += '<div style="background:'+bg+';border:1px solid '+border+';border-radius:10px;padding:.85rem 1rem;display:flex;align-items:center;gap:.8rem;box-shadow:'+(i===0?'0 0 20px rgba(255,215,0,.1);':'')+'transition:all .2s">'
          + '<div style="width:32px;text-align:center;font-size:1.3rem;flex-shrink:0">'+medal+'</div>'
          + '<div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,var(--c2),var(--c1));display:flex;align-items:center;justify-content:center;font-family:Orbitron;font-size:.75rem;font-weight:900;color:#fff;flex-shrink:0">'+initial+'</div>'
          + '<div style="flex:1"><div style="font-size:.88rem;font-weight:700;color:#fff">'+item.username+(isMe?' 👤':'')+' </div><div style="font-size:.65rem;color:var(--muted)">Dinero: $'+item.value.toLocaleString('es-MX')+'</div></div>'
          + '<div style="text-align:right;flex-shrink:0"><div style="font-family:Orbitron;font-size:.95rem;font-weight:900;color:'+medalColor+'">$'+item.value.toLocaleString('es-MX')+'</div><div style="font-size:.6rem;color:var(--muted)">MX</div></div>'
          + '</div>';
      });

      el.innerHTML = html;
    });
  }).catch(function(){
    el.innerHTML = '<div style="text-align:center;padding:2rem;color:#ff6b6b;font-size:.82rem">Error</div>';
  });
}

function initRankingPage(){
  console.log('[RANKING] initRankingPage llamado');
  
  if(!window.sb){
    console.error('[RANKING] sb NO disponible aún');
    return false;
  }
  
  if(typeof authSession === 'undefined' || !authSession){
    console.warn('[RANKING] authSession no disponible');
  }
  
  console.log('[RANKING] Iniciando todas las cargas...');
  try {
    loadTopHabibis();
    loadRankingByPeriod('daily');
    loadRankingByPeriod('weekly');
    loadRankingByPeriod('monthly');
    loadTopGeneral();
    loadTopLikes();
    loadTopDiamantes();
    console.log('[RANKING] ✓ Todas las funciones lanzadas');
    return true;
  } catch(e){
    console.error('[RANKING] Error en initRankingPage:', e);
    return false;
  }
}

// Auto-cargar cuando se abre page-ranking
if(typeof goPage !== 'undefined'){
  var _origGoPageRanking = goPage;
  var newGoPage = function(id){
    _origGoPageRanking(id);
    if(id === 'ranking'){
      setTimeout(function(){
        if(typeof initRankingPage === 'function') initRankingPage();
      }, 300);
    }
  };
  goPage = newGoPage;
}

// Fallback: cargar directamente si la página se abre
document.addEventListener('DOMContentLoaded', function(){
  var page = document.getElementById('page-ranking');
  if(page && page.classList.contains('active')){
    setTimeout(function(){
      if(typeof initRankingPage === 'function') initRankingPage();
    }, 500);
  }
});


// ═══ FUNCIONES PARA PAGE-LIKES CONSOLIDADA ═══

function updateLikesSaldo(){
  if(!authSession) return;
  var saldo = authSession.saldo || 0;
  var saldoStr = '$' + Math.round(saldo).toLocaleString('es-MX') + ' MX';
  
  // Campos del formulario de saldo (básicos y 2k)
  var lk200 = document.getElementById('lk200-saldo-val');
  if(lk200) lk200.textContent = saldoStr;
  
  var lk2k = document.getElementById('lk2k-saldo-val');
  if(lk2k) lk2k.textContent = saldoStr;
  
  var el3 = document.getElementById('renta-bot-saldo');
  if(el3) el3.textContent = saldoStr;
}

function buyLikesBasico(){
  if(!authSession){
    showToast('Inicia sesión para comprar');
    setTimeout(showAuthModal, 600);
    return;
  }
  var saldo = authSession.saldo || 0;
  if(saldo <= 0){
    showToast('No tienes saldo. Te llevamos a recargar.');
    setTimeout(function(){ goPage('saldo'); }, 800);
    return;
  }
  openModal('Likes Básicos', '$10-$70 MX', '', '👍');
}

function buyLikesInstant(){
  if(!authSession){
    showToast('Inicia sesión para comprar');
    setTimeout(showAuthModal, 600);
    return;
  }
  var saldo = authSession.saldo || 0;
  if(saldo <= 0){
    showToast('No tienes saldo. Te llevamos a recargar.');
    setTimeout(function(){ goPage('saldo'); }, 800);
    return;
  }
  openModal('Likes Instantáneos', '$120-$1,190 MX', '', '⚡');
}

function quoteLikesBasico(){
  var msg = 'Hola, quiero cotizar un plan de likes básicos. ¿Cuál es el mejor para mí?';
  window.open('https://wa.me/5215548461200?text='+encodeURIComponent(msg), '_blank');
}

function quoteLikesInstant(){
  var msg = 'Hola, me interesa un plan de likes instantáneos. ¿Cuál recomiendas?';
  window.open('https://wa.me/5215548461200?text='+encodeURIComponent(msg), '_blank');
}

// Cargar saldo cuando se abre la página de likes
var _origGoPageLikes = goPage;
goPage = function(id){
  _origGoPageLikes(id);
  if(id === 'likes'){
    setTimeout(updateLikesSaldo, 300);
  }
};

// Actualizar saldo cada 5 segundos
setInterval(function(){
  if(document.getElementById('page-likes') && document.getElementById('page-likes').offsetParent !== null){
    updateLikesSaldo();
  }
}, 5000);


// ═══ TOP COMPRADORES DIAMANTES CON PERÍODOS (HOME) ═══
var diamondPeriod = 'historico';

function setDiamondPeriod(period){
  diamondPeriod = period;
  // Actualizar tabs visualmente
  ['historico','mes','semana','dia'].forEach(function(p){
    var tab = document.getElementById('dtab-'+p);
    if(tab){
      if(p === period){
        tab.style.background = 'linear-gradient(90deg,#a78bfa,#7c3aed)';
        tab.style.color = '#fff';
      } else {
        tab.style.background = 'transparent';
        tab.style.color = 'var(--muted)';
      }
    }
  });
  loadDiamondTop();
}

function loadDiamondTop(){
  var list = document.getElementById('diamond-top-list');
  if(!list) return;
  if(!window.sb){ setTimeout(loadDiamondTop, 1500); return; }

  list.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--muted);font-size:.82rem">Cargando...</div>';

  // Filtro de fecha según período
  var since = null;
  if(diamondPeriod === 'dia')    since = new Date(new Date().setHours(0,0,0,0)).toISOString();
  if(diamondPeriod === 'semana') since = new Date(Date.now()-7*86400000).toISOString();
  if(diamondPeriod === 'mes')    since = new Date(Date.now()-30*86400000).toISOString();

  var qs = 'tipo=eq.compra&select=user_id,descripcion,monto' + (since ? '&created_at=gte.'+since : '');
  sb.get('movimientos_saldo', qs).then(function(movs){
    if(!movs || !Array.isArray(movs)){
      list.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--muted);font-size:.82rem">Sin datos</div>';
      return;
    }

    // Agregar diamantes por usuario (solo compras de diamantes)
    var agg = {};
    movs.forEach(function(m){
      var desc = (m.descripcion || '').toLowerCase();
      if(desc.indexOf('diamante') < 0) return;
      var uid = m.user_id;
      if(!agg[uid]) agg[uid] = {diamonds: 0, monto: 0};
      var match = desc.match(/(\d[\d,]*)\s*diamante/);
      agg[uid].diamonds += match ? (parseInt(match[1].replace(/,/g,''))||0) : Math.round((m.monto||0)/0.12);
      agg[uid].monto += (m.monto || 0);
    });

    var uids = Object.keys(agg);
    if(!uids.length){
      list.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--muted);font-size:.82rem">Sin compras de diamantes en este período</div>';
      return;
    }

    sb.get('profiles', 'select=id,username&id=in.('+uids.map(function(u){return '"'+u+'"';}).join(',')+')').then(function(profs){
      var umap = {};
      if(profs) profs.forEach(function(p){ umap[p.id] = p.username; });

      var sorted = uids.map(function(uid){
        return {username: umap[uid] || 'Usuario', diamonds: agg[uid].diamonds};
      }).sort(function(a,b){ return b.diamonds - a.diamonds; }).slice(0,10);

      var medals = ['🥇','🥈','🥉'];
      var medalColors = ['#ffd700','#c0c0c0','#cd7f32'];
      var html = '';

      sorted.forEach(function(item, i){
        var rank = i < 3 ? medals[i] : (i+1);
        var rankColor = i < 3 ? medalColors[i] : 'var(--muted)';
        var initial = item.username.charAt(0).toUpperCase();
        var isTop1 = i === 0;
        var bg = isTop1 ? 'linear-gradient(90deg,rgba(255,215,0,.1),rgba(167,139,250,.05))' : 'rgba(255,255,255,.03)';
        var border = isTop1 ? 'rgba(255,215,0,.3)' : 'rgba(255,255,255,.06)';
        var avSize = isTop1 ? '44px' : '38px';

        html += '<div style="background:'+bg+';border:1px solid '+border+';border-radius:11px;padding:'+(isTop1?'.85rem .9rem':'.65rem .9rem')+';display:flex;align-items:center;gap:.75rem;'+(isTop1?'box-shadow:0 0 18px rgba(255,215,0,.1);':'')+'">'
          + '<div style="width:26px;text-align:center;font-size:'+(i<3?'1.2rem':'.85rem')+';font-weight:900;color:'+rankColor+';flex-shrink:0">'+rank+'</div>'
          + '<div style="width:'+avSize+';height:'+avSize+';border-radius:11px;background:linear-gradient(135deg,#a78bfa,#7c3aed);display:flex;align-items:center;justify-content:center;font-family:Orbitron;font-size:'+(isTop1?'.9rem':'.78rem')+';font-weight:900;color:#fff;flex-shrink:0;border:2px solid '+rankColor+'44">'+initial+'</div>'
          + '<div style="flex:1;min-width:0">'
          + '<div style="font-size:'+(isTop1?'1rem':'.85rem')+';font-weight:'+(isTop1?'900':'700')+';color:#fff">'+item.username+'</div>'
          + '<div style="font-size:.62rem;color:var(--muted)">diamantes comprados</div>'
          + '</div>'
          + '<div style="text-align:right;flex-shrink:0;font-family:Orbitron;font-size:'+(isTop1?'1.05rem':'.88rem')+';font-weight:900;color:'+(isTop1?'#ffd700':'#a78bfa')+'">'+item.diamonds.toLocaleString('es-MX')+' 💎</div>'
          + '</div>';
      });

      list.innerHTML = html;
    });
  }).catch(function(){
    list.innerHTML = '<div style="text-align:center;padding:2rem;color:#ff6b6b;font-size:.82rem">Error al cargar</div>';
  });
}

// Auto-cargar en el home
var _origGoPageDiamond = goPage;
goPage = function(id){
  _origGoPageDiamond(id);
  if(id === 'home') setTimeout(loadDiamondTop, 400);
};

document.addEventListener('DOMContentLoaded', function(){
  setTimeout(function(){
    if(document.getElementById('diamond-top-list')) loadDiamondTop();
  }, 1500);
});

// Refrescar cada 20 segundos en el home
setInterval(function(){
  var el = document.getElementById('diamond-top-list');
  var home = document.getElementById('page-home');
  if(el && home && home.classList.contains('active')) loadDiamondTop();
}, 20000);


// ═══ TOP MILLONARIOS - DINERO GASTADO (HOME) ═══
var millonarioPeriod = 'historico';

function setMillonarioPeriod(period){
  millonarioPeriod = period;
  ['historico','mes','semana','dia'].forEach(function(p){
    var tab = document.getElementById('mtab-'+p);
    if(tab){
      if(p === period){
        tab.style.background = 'linear-gradient(90deg,#ffd700,#f0a000)';
        tab.style.color = '#1a0a00';
      } else {
        tab.style.background = 'transparent';
        tab.style.color = 'var(--muted)';
      }
    }
  });
  loadMillonarioTop();
}

function loadMillonarioTop(){
  var list = document.getElementById('millonario-top-list');
  if(!list) return;
  if(!window.sb){ setTimeout(loadMillonarioTop, 1500); return; }

  list.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--muted);font-size:.82rem">Cargando...</div>';

  var since = null;
  if(millonarioPeriod === 'dia')    since = new Date(new Date().setHours(0,0,0,0)).toISOString();
  if(millonarioPeriod === 'semana') since = new Date(Date.now()-7*86400000).toISOString();
  if(millonarioPeriod === 'mes')    since = new Date(Date.now()-30*86400000).toISOString();

  // TODOS los movimientos de compra (cualquier servicio = dinero gastado)
  var qs = 'tipo=eq.compra&select=user_id,monto' + (since ? '&created_at=gte.'+since : '');
  sb.get('movimientos_saldo', qs).then(function(movs){
    if(!movs || !Array.isArray(movs)){
      list.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--muted);font-size:.82rem">Sin datos</div>';
      return;
    }

    // Sumar dinero gastado por usuario
    var agg = {};
    movs.forEach(function(m){
      var uid = m.user_id;
      agg[uid] = (agg[uid] || 0) + (m.monto || 0);
    });

    var uids = Object.keys(agg);
    if(!uids.length){
      list.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--muted);font-size:.82rem">Sin gastos en este período</div>';
      return;
    }

    sb.get('profiles', 'select=id,username&id=in.('+uids.map(function(u){return '"'+u+'"';}).join(',')+')').then(function(profs){
      var umap = {};
      if(profs) profs.forEach(function(p){ umap[p.id] = p.username; });

      var sorted = uids.map(function(uid){
        return {username: umap[uid] || 'Usuario', monto: agg[uid]};
      }).sort(function(a,b){ return b.monto - a.monto; }).slice(0,10);

      var medals = ['🥇','🥈','🥉'];
      var medalColors = ['#ffd700','#c0c0c0','#cd7f32'];
      var html = '';

      sorted.forEach(function(item, i){
        var rank = i < 3 ? medals[i] : (i+1);
        var rankColor = i < 3 ? medalColors[i] : 'var(--muted)';
        var initial = item.username.charAt(0).toUpperCase();
        var isTop1 = i === 0;
        var bg = isTop1 ? 'linear-gradient(90deg,rgba(255,215,0,.12),rgba(240,160,0,.05))' : 'rgba(255,255,255,.03)';
        var border = isTop1 ? 'rgba(255,215,0,.35)' : 'rgba(255,255,255,.06)';
        var avSize = isTop1 ? '44px' : '38px';

        html += '<div style="background:'+bg+';border:1px solid '+border+';border-radius:11px;padding:'+(isTop1?'.85rem .9rem':'.65rem .9rem')+';display:flex;align-items:center;gap:.75rem;'+(isTop1?'box-shadow:0 0 18px rgba(255,215,0,.12);':'')+'">'
          + '<div style="width:26px;text-align:center;font-size:'+(i<3?'1.2rem':'.85rem')+';font-weight:900;color:'+rankColor+';flex-shrink:0">'+rank+'</div>'
          + '<div style="width:'+avSize+';height:'+avSize+';border-radius:11px;background:linear-gradient(135deg,#ffd700,#f0a000);display:flex;align-items:center;justify-content:center;font-family:Orbitron;font-size:'+(isTop1?'.9rem':'.78rem')+';font-weight:900;color:#1a0a00;flex-shrink:0;border:2px solid '+rankColor+'44">'+initial+'</div>'
          + '<div style="flex:1;min-width:0">'
          + '<div style="font-size:'+(isTop1?'1rem':'.85rem')+';font-weight:'+(isTop1?'900':'700')+';color:#fff">'+item.username+'</div>'
          + '<div style="font-size:.62rem;color:var(--muted)">gastado en total</div>'
          + '</div>'
          + '<div style="text-align:right;flex-shrink:0;font-family:Orbitron;font-size:'+(isTop1?'1.05rem':'.88rem')+';font-weight:900;color:'+(isTop1?'#ffd700':'#f0a000')+'">$'+Math.round(item.monto).toLocaleString('es-MX')+'</div>'
          + '</div>';
      });

      list.innerHTML = html;
    });
  }).catch(function(){
    list.innerHTML = '<div style="text-align:center;padding:2rem;color:#ff6b6b;font-size:.82rem">Error al cargar</div>';
  });
}

// Auto-cargar en el home
var _origGoPageMillon = goPage;
goPage = function(id){
  _origGoPageMillon(id);
  if(id === 'home') setTimeout(loadMillonarioTop, 500);
};

document.addEventListener('DOMContentLoaded', function(){
  setTimeout(function(){
    if(document.getElementById('millonario-top-list')) loadMillonarioTop();
  }, 1700);
});

setInterval(function(){
  var el = document.getElementById('millonario-top-list');
  var home = document.getElementById('page-home');
  if(el && home && home.classList.contains('active')) loadMillonarioTop();
}, 20000);


// ═══ TOP LIKERS - LIKES COMPRADOS (HOME) ═══
var likerPeriod = 'historico';

function setLikerPeriod(period){
  likerPeriod = period;
  ['historico','mes','semana','dia'].forEach(function(p){
    var tab = document.getElementById('ltab-'+p);
    if(tab){
      if(p === period){
        tab.style.background = 'linear-gradient(90deg,#ff4da6,#d6249f)';
        tab.style.color = '#fff';
      } else {
        tab.style.background = 'transparent';
        tab.style.color = 'var(--muted)';
      }
    }
  });
  loadLikerTop();
}

function loadLikerTop(){
  var list = document.getElementById('liker-top-list');
  if(!list) return;
  if(!window.sb){ setTimeout(loadLikerTop, 1500); return; }

  list.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--muted);font-size:.82rem">Cargando...</div>';

  var since = null;
  if(likerPeriod === 'dia')    since = new Date(new Date().setHours(0,0,0,0)).toISOString();
  if(likerPeriod === 'semana') since = new Date(Date.now()-7*86400000).toISOString();
  if(likerPeriod === 'mes')    since = new Date(Date.now()-30*86400000).toISOString();

  var qs = 'tipo=eq.compra&select=user_id,descripcion,monto' + (since ? '&created_at=gte.'+since : '');
  sb.get('movimientos_saldo', qs).then(function(movs){
    if(!movs || !Array.isArray(movs)){
      list.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--muted);font-size:.82rem">Sin datos</div>';
      return;
    }

    // Sumar likes por usuario (cualquier compra que diga "like" = 2k o 200)
    var agg = {};
    movs.forEach(function(m){
      var desc = (m.descripcion || '').toLowerCase();
      if(desc.indexOf('like') < 0) return;
      var uid = m.user_id;
      if(!agg[uid]) agg[uid] = {likes: 0, monto: 0};
      var match = desc.match(/(\d[\d,]*)\s*like/);
      agg[uid].likes += match ? (parseInt(match[1].replace(/,/g,''))||0) : 0;
      agg[uid].monto += (m.monto || 0);
    });

    var uids = Object.keys(agg);
    if(!uids.length){
      list.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--muted);font-size:.82rem">Sin compras de likes en este período</div>';
      return;
    }

    sb.get('profiles', 'select=id,username&id=in.('+uids.map(function(u){return '"'+u+'"';}).join(',')+')').then(function(profs){
      var umap = {};
      if(profs) profs.forEach(function(p){ umap[p.id] = p.username; });

      var sorted = uids.map(function(uid){
        return {username: umap[uid] || 'Usuario', likes: agg[uid].likes, monto: agg[uid].monto};
      }).sort(function(a,b){ return b.likes - a.likes; }).slice(0,10);

      var medals = ['🥇','🥈','🥉'];
      var medalColors = ['#ffd700','#c0c0c0','#cd7f32'];
      var html = '';

      sorted.forEach(function(item, i){
        var rank = i < 3 ? medals[i] : (i+1);
        var rankColor = i < 3 ? medalColors[i] : 'var(--muted)';
        var initial = item.username.charAt(0).toUpperCase();
        var isTop1 = i === 0;
        var bg = isTop1 ? 'linear-gradient(90deg,rgba(255,77,166,.12),rgba(214,36,159,.05))' : 'rgba(255,255,255,.03)';
        var border = isTop1 ? 'rgba(255,77,166,.35)' : 'rgba(255,255,255,.06)';
        var avSize = isTop1 ? '44px' : '38px';

        html += '<div style="background:'+bg+';border:1px solid '+border+';border-radius:11px;padding:'+(isTop1?'.85rem .9rem':'.65rem .9rem')+';display:flex;align-items:center;gap:.75rem;'+(isTop1?'box-shadow:0 0 18px rgba(255,77,166,.12);':'')+'">'
          + '<div style="width:26px;text-align:center;font-size:'+(i<3?'1.2rem':'.85rem')+';font-weight:900;color:'+rankColor+';flex-shrink:0">'+rank+'</div>'
          + '<div style="width:'+avSize+';height:'+avSize+';border-radius:11px;background:linear-gradient(135deg,#ff4da6,#d6249f);display:flex;align-items:center;justify-content:center;font-family:Orbitron;font-size:'+(isTop1?'.9rem':'.78rem')+';font-weight:900;color:#fff;flex-shrink:0;border:2px solid '+rankColor+'44">'+initial+'</div>'
          + '<div style="flex:1;min-width:0">'
          + '<div style="font-size:'+(isTop1?'1rem':'.85rem')+';font-weight:'+(isTop1?'900':'700')+';color:#fff">'+item.username+'</div>'
          + '<div style="font-size:.62rem;color:var(--muted)">likes comprados</div>'
          + '</div>'
          + '<div style="text-align:right;flex-shrink:0;font-family:Orbitron;font-size:'+(isTop1?'1.05rem':'.88rem')+';font-weight:900;color:'+(isTop1?'#ff4da6':'#d6249f')+'">'+item.likes.toLocaleString('es-MX')+' 👍</div>'
          + '</div>';
      });

      list.innerHTML = html;
    });
  }).catch(function(){
    list.innerHTML = '<div style="text-align:center;padding:2rem;color:#ff6b6b;font-size:.82rem">Error al cargar</div>';
  });
}

// Auto-cargar en el home
var _origGoPageLiker = goPage;
goPage = function(id){
  _origGoPageLiker(id);
  if(id === 'home') setTimeout(loadLikerTop, 600);
};

document.addEventListener('DOMContentLoaded', function(){
  setTimeout(function(){
    if(document.getElementById('liker-top-list')) loadLikerTop();
  }, 1900);
});

setInterval(function(){
  var el = document.getElementById('liker-top-list');
  var home = document.getElementById('page-home');
  if(el && home && home.classList.contains('active')) loadLikerTop();
}, 20000);

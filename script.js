/* CiberStore v1779504760 */
/* \u2500\u2500 DATA \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
var WA = '12894273983';

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
  ['saldo-page-balance','modal-saldo-amt','frag-saldo-disp','lk200-saldo-val','lk2k-saldo-val','renta-bot-saldo','bonus-saldo-val','ilim-saldo-val','v1-saldo-val','pin-saldo-val','pin-api-saldo'].forEach(function(id){
    var el = document.getElementById(id);
    if(el) el.textContent = s;
  });
}

function addSpend(amount, description){
  if(!authSession){
    console.error('[ADDSPEND] No hay sesión');
    showToast('Inicia sesion de nuevo');
    return;
  }
  amount = Number(amount) || 0;
  if(amount <= 0){ console.warn('[ADDSPEND] Monto invalido:', amount); return; }

  // LOCK anti-doble
  if(_addSpendBusy){
    console.warn('[ADDSPEND] Compra en proceso, ignorando duplicado');
    return;
  }

  var userId = authSession.id;
  _addSpendBusy = true;

  // ⚠️ DESCUENTO ATÓMICO: la base de datos resta en UNA sola operacion.
  // Imposible que se pise con otra compra o con un ajuste del panel admin.
  _rpcAjustarSaldo(userId, -amount).then(function(saldoNuevo){
    var sn = Number(saldoNuevo) || 0;
    authSession.saldo = sn;
    _refreshSaldoUI(sn);
    if(typeof saveSession === 'function') saveSession(authSession);

    // Registrar el movimiento
    if(typeof sbAddMovimiento === 'function'){
      sbAddMovimiento(userId, 'compra', amount, description);
    }
    console.log('[ADDSPEND] OK. Saldo real ahora: $'+sn);
    showToast('\u2713 Compra registrada. Saldo: '+fmt(sn));
    _addSpendBusy = false;
  }).catch(function(err){
    console.error('[ADDSPEND] RPC fallo:', err);
    showToast('Error al procesar el pago. Contacta al admin.');
    _addSpendBusy = false;
    // Refrescar el saldo real por si acaso
    if(typeof refreshUserBalance === 'function') refreshUserBalance();
  });
}

// Guarda el nuevo saldo en Supabase + registra el movimiento
function _guardarNuevoSaldo(userId, newSaldo, amount, description, saldoActual){

  // Registrar movimiento con tipo 'compra' (para que los rankings lo cuenten)
  function registrarMov(){
    if(typeof sb !== 'undefined' && sb.post){
      sb.post('movimientos_saldo', {
        user_id: userId,
        tipo: 'compra',
        monto: amount,
        descripcion: description || 'Compra'
      }).catch(function(e){ console.warn('[ADDSPEND] registrarMov fallo:', e); });
    }
  }

  if(typeof sbUpdateProfile === 'function'){
    sbUpdateProfile(userId, {saldo: newSaldo}).then(function(){
      registrarMov();
      console.log('[ADDSPEND] OK. Nuevo saldo: $'+newSaldo);
      showToast('✓ Compra registrada. Saldo: $'+Math.round(newSaldo).toLocaleString('es-MX')+' MX');
      _addSpendBusy = false;
    }).catch(function(e){
      // Revertir si falla
      console.error('[ADDSPEND] Error actualizando saldo:', e);
      authSession.saldo = saldoActual;
      _refreshSaldoUI(saldoActual);
      showToast('Error al procesar. Intenta de nuevo.');
      _addSpendBusy = false;
    });
  } else {
    // Fallback si no existe sbUpdateProfile: usar sb.patch sin comillas
    sb.patch('profiles', {saldo: newSaldo}, 'id=eq.'+userId).then(function(){
      registrarMov();
      showToast('✓ Compra registrada. Saldo: $'+Math.round(newSaldo).toLocaleString('es-MX')+' MX');
      _addSpendBusy = false;
    }).catch(function(e){
      console.error('[ADDSPEND] Error (fallback):', e);
      authSession.saldo = saldoActual;
      _refreshSaldoUI(saldoActual);
      showToast('Error al procesar. Intenta de nuevo.');
      _addSpendBusy = false;
    });
  }
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
  {id:1,  name:'110',    total:110,   bonus:0, region:'LATAM & BR', prices:[15,15,15,15,15],       badge:null,          isPase:false, popular:false},
  {id:2,  name:'341',    total:341,   bonus:0, region:'LATAM & BR', prices:[45,45,45,45,45],       badge:'POPULAR',     isPase:false, popular:true},
  {id:3,  name:'572',    total:572,   bonus:0, region:'LATAM & BR', prices:[75,75,75,75,75],       badge:null,          isPase:false, popular:false},
  {id:4,  name:'1,166',  total:1166,  bonus:0, region:'LATAM & BR', prices:[160,160,160,160,160],  badge:'OFERTA',      isPase:false, popular:false},
  {id:5,  name:'2,398',  total:2398,  bonus:0, region:'LATAM & BR', prices:[260,260,260,260,260],  badge:null,          isPase:false, popular:false},
  {id:6,  name:'6,160',  total:6160,  bonus:0, region:'LATAM & BR', prices:[680,680,680,680,680],  badge:'GRAN VALOR',  isPase:false, popular:false},
  {id:7,  name:'12,320', total:12320, bonus:0, region:'LATAM & BR', prices:[1390,1390,1390,1390,1390], badge:'MEGA PACK', isPase:false, popular:false}
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
  {id:2,  label:'7 dias',  emoji:'\uD83D\uDC4D', priceMX:25,  total:1400, perDay:200, days:7,   color:'#22d3ee', popular:true},
  {id:3,  label:'14 dias', emoji:'\uD83D\uDC4D', priceMX:35,  total:2800, perDay:200, days:14,  color:'#22d3ee'},
  {id:4,  label:'21 dias', emoji:'\uD83D\uDC4D', priceMX:60,  total:4200, perDay:200, days:21,  color:'#ffd700'},
  {id:5,  label:'30 dias', emoji:'\uD83D\uDC4D', priceMX:70,  total:6600, perDay:220, days:30,  color:'#22d3ee', best:true},
  {id:11, label:'Instant 2K',  emoji:'\u26A1', priceMX:120,  total:2000,  perDay:2000, days:1,  color:'#ff4da6', isInstant:true},
  {id:12, label:'Instant 4K',  emoji:'\u26A1', priceMX:230,  total:4000,  perDay:2000, days:2,  color:'#ff4da6', isInstant:true},
  {id:13, label:'Instant 10K', emoji:'\u26A1', priceMX:590,  total:10000, perDay:2000, days:5,  color:'#ff4da6', isInstant:true},
  {id:14, label:'Instant 20K', emoji:'\u26A1', priceMX:1190, total:20000, perDay:2000, days:10, color:'#ff4da6', isInstant:true}
];

var HONOR = [
  {region:'Norteamerica',flag:'\uD83C\uDDE8\uD83C\uDDE6',color:'#ffd000',price:340,paises:'Canada, Rep. Dominicana'},
  {region:'Estados Unidos',flag:'\uD83C\uDDFA\uD83C\uDDF8',color:'#4dabf7',price:290,paises:'Mexico'},
  {region:'Sudamerica',flag:'\uD83C\uDDE7\uD83C\uDDF7',color:'#40c057',price:340,paises:'Peru, Chile'},
  {region:'Europa',flag:'\uD83C\uDDEA\uD83C\uDDFA',color:'#b39ddb',price:340,paises:'Espana'}
];

var TIERS = [
  {id:'free', name:'Cliente', color:'#22d3ee', colorBg:'rgba(34,211,238,.1)', threshold:0, perks:['Precio fijo'], disc:0, icon:'\uD83D\uDC64'}
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
var USD_MXN  = 17; // 1 USD = 17 MXN
var RETIRO_COMISION = 0.15; // 15% de comision por retiro
var RATES    = {MXN:1, USD:(1/USD_MXN), EUR:0.047, ARS:50.2, PEN:0.19};
var CUR_SYM  = {MXN:'$', USD:'$', EUR:'\u20AC', ARS:'$', PEN:'S/'};
var CUR_SUF  = {MXN:' MX', USD:' USD', EUR:' EUR', ARS:' ARS', PEN:' PEN'};

// Calcula el inicio real del periodo (dia = hoy 00:00, semana = lunes 00:00, mes = dia 1)
function _inicioPeriodo(period){
  var ahora = new Date();
  if(period === 'dia'){
    var d = new Date(ahora); d.setHours(0,0,0,0);
    return d.toISOString();
  }
  if(period === 'semana'){
    var s = new Date(ahora);
    s.setHours(0,0,0,0);
    // getDay(): 0=domingo, 1=lunes ... queremos que la semana empiece el LUNES
    var dia = s.getDay();
    var diffAlLunes = (dia === 0) ? 6 : (dia - 1); // domingo cuenta como fin de semana anterior
    s.setDate(s.getDate() - diffAlLunes);
    return s.toISOString();
  }
  if(period === 'mes'){
    var m = new Date(ahora.getFullYear(), ahora.getMonth(), 1, 0, 0, 0, 0);
    return m.toISOString();
  }
  return null; // historico = sin filtro
}


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
    if(id==='diamantes') setTimeout(function(){ renderDiamCatalogo(); if(document.getElementById('diam-detalle').style.display!=='none' && _diamSeleccionado) _refrescarDiamPrecios(); }, 100);
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
    tabBtn.style.color='#22d3ee';
    tabBtn.style.borderBottom='2px solid #22d3ee';
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
      var colors={dash:['rgba(34,211,238,.2)','rgba(34,211,238,.45)','#67e8f9'],
                  users:['rgba(34,211,238,.12)','rgba(34,211,238,.35)','var(--c1)'],
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
  if(id==='diamantes') setTimeout(function(){ setDiamTipo('ilim'); }, 100);
  if(id==='codigos') setTimeout(_updateScarSaldo, 100);
  if(id==='clanes') setTimeout(renderClanes, 100);
  if(id==='pase') setTimeout(_paseReiniciar, 100);
  if(id==='saldo') setTimeout(function(){ recSetMoneda('MXN'); }, 100);
  if(id==='sobre') setTimeout(function(){ sobreTab('resenas'); }, 100);
  if(id==='likes') renderLikes();
  if(id==='membresia'){renderMems();renderWallet();}
  if(id==='perfil') renderPerfil();
  if(id==='miscompras'){ renderMisCompras(); setTimeout(cargarPedidosSeguimiento,300); }
  if(id==='honorcuenta') setTimeout(renderExpPackages,50);
  if(id==='referidos') setTimeout(renderReferidos,50);
  if(id==='creadores') setTimeout(renderCreadoresTabla,50);
  if(id==='retirar') setTimeout(_updateRetiroSaldo,50);
  if(typeof _syncBottomNav==='function') _syncBottomNav(id);
  if(id==='home'){setTimeout(renderResenas,50); setTimeout(renderHomeDashboard,60);}
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

  // Tarjeta estilo moderno (como +20% BONUS)
  function makeModernCard(p, color, isBest){
    var now=p.prices[0];
    var metaTxt = p.popular ? 'Más vendido ⭐' : (p.badge ? p.badge : 'Recarga directa');
    var cls = isBest ? 'lkpln lkpln-best' : 'lkpln';
    return '<div class="lkpln-wrap"><div class="'+cls+'">'
      + '<div class="lkpln-l">'
      + '<div class="lkpln-ico" style="background:'+color+'1a;border:1px solid '+color+'47">\uD83D\uDC8E</div>'
      + '<div><div class="lkpln-name">'+p.name+' <span>diamantes</span></div><div class="lkpln-meta">'+metaTxt+'</div></div>'
      + '</div>'
      + '<div class="lkpln-r"><div class="lkpln-price" style="color:'+color+'">'+fmt(now)+'</div><div class="lkpln-cur">MXN</div></div>'
      + '</div></div>';
  }

  var rows='';

  /* ═══ DIAMANTES ILIMITADOS ═══ */
  rows+='<div style="grid-column:1/-1;background:linear-gradient(135deg,#0a0a0a,#0a0a0a);border:1px solid rgba(34,211,238,.28);border-radius:16px;padding:1.3rem 1.15rem;margin-bottom:1.25rem">'
    +'<div style="display:flex;align-items:center;gap:.6rem;margin-bottom:1rem">'
    +'<span style="font-size:1.5rem">\u26A1</span>'
    +'<div><div style="font-family:Oxanium;font-size:1rem;font-weight:900;color:#22d3ee;letter-spacing:.5px">DIAMANTES ILIMITADOS</div>'
    +'<div style="font-size:.72rem;color:var(--muted)">Recarga las veces que quieras</div></div>'
    +'</div>'
    +'<div class="lkpln-grid" style="margin-bottom:1.1rem">';
  for(var i=0;i<PRODUCTS.length;i++){
    rows+=makeModernCard(PRODUCTS[i], '#22d3ee', PRODUCTS[i].badge==='GRAN VALOR'||PRODUCTS[i].badge==='MEGA PACK');
  }
  rows+='</div>'
    // Formulario ilimitados
    +'<div style="border-top:1px solid rgba(34,211,238,.15);padding-top:1rem">'
    +'<div style="font-size:.7rem;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:.5rem">Pedir con saldo</div>'
    +'<label style="font-size:.72rem;color:var(--muted);display:block;margin-bottom:.25rem">Elige tu paquete</label>'
    +'<select id="ilim-plan" style="width:100%;background:#0a0a0a;border:1px solid rgba(34,211,238,.25);color:#fff;border-radius:9px;padding:.6rem .8rem;font-family:Poppins,sans-serif;font-size:.88rem;margin-bottom:.55rem;box-sizing:border-box">';
  for(var a=0;a<PRODUCTS.length;a++){
    rows+='<option value="'+PRODUCTS[a].total+'|'+PRODUCTS[a].prices[0]+'">'+PRODUCTS[a].name+' diamantes \u2014 '+fmt(PRODUCTS[a].prices[0])+' MX</option>';
  }
  rows+='</select>'
    +'<label style="font-size:.72rem;color:var(--muted);display:block;margin-bottom:.25rem">Tu ID de Free Fire</label>'
    +'<input id="ilim-id" type="text" placeholder="Ej: 123456789" style="width:100%;background:#0a0a0a;border:1px solid rgba(34,211,238,.25);color:#fff;border-radius:9px;padding:.6rem .8rem;font-family:Poppins,sans-serif;font-size:.88rem;margin-bottom:.55rem;box-sizing:border-box"/>'
    +'<label style="font-size:.72rem;color:var(--muted);display:block;margin-bottom:.25rem">Nombre en el juego</label>'
    +'<input id="ilim-nombre" type="text" placeholder="Tu nickname" style="width:100%;background:#0a0a0a;border:1px solid rgba(34,211,238,.25);color:#fff;border-radius:9px;padding:.6rem .8rem;font-family:Poppins,sans-serif;font-size:.88rem;margin-bottom:.65rem;box-sizing:border-box"/>'
    +'<div style="display:flex;justify-content:space-between;background:rgba(34,211,238,.06);border:1px solid rgba(34,211,238,.18);border-radius:8px;padding:.45rem .85rem;margin-bottom:.5rem"><span style="font-size:.72rem;color:var(--muted)">Tu saldo</span><span id="ilim-saldo-val" style="font-family:Oxanium;font-weight:700;color:#22d3ee;font-size:.82rem">$0 MX</span></div>'
    +'<div id="ilim-err" style="display:none;color:#ff6b6b;font-size:.75rem;margin-bottom:.5rem"></div>'
    +'<button onclick="submitIlimSaldo()" style="width:100%;padding:.78rem;background:linear-gradient(90deg,#128c3e,#25d366);color:#fff;border:none;border-radius:10px;font-family:Poppins,sans-serif;font-weight:900;font-size:.9rem;cursor:pointer">\uD83D\uDD12 Confirmar con saldo</button>'
    +'<button onclick="cotizarIlim()" style="width:100%;padding:.62rem;margin-top:.5rem;background:rgba(34,211,238,.08);border:1px solid rgba(34,211,238,.3);color:#22d3ee;border-radius:10px;font-family:Poppins;font-weight:900;font-size:.82rem;cursor:pointer">\uD83D\uDCAC O cotizar por WhatsApp</button>'
    +'</div>'
    +'</div>';

  /* ═══ DIAMANTES 1 VEZ x ID ═══ */
  rows+='<div style="grid-column:1/-1;background:linear-gradient(135deg,#0a1f14,#0a0a0a);border:1px solid rgba(0,230,118,.28);border-radius:16px;padding:1.3rem 1.15rem">'
    +'<div style="display:flex;align-items:center;gap:.6rem;margin-bottom:.5rem">'
    +'<span style="font-size:1.5rem">\uD83C\uDF1F</span>'
    +'<div><div style="font-family:Oxanium;font-size:1rem;font-weight:900;color:#00e676;letter-spacing:.5px">DIAMANTES 1 VEZ x ID</div>'
    +'<div style="font-size:.72rem;color:var(--muted)">Precios especiales · una vez por ID</div></div>'
    +'</div>'
    // Aviso verificar ID
    +'<div style="background:rgba(255,165,0,.08);border:1px solid rgba(255,165,0,.3);border-radius:9px;padding:.7rem .9rem;display:flex;gap:.6rem;align-items:flex-start;margin-bottom:.85rem">'
    +'<span style="font-size:1.1rem;flex-shrink:0">\u26A0\uFE0F</span>'
    +'<div style="font-size:.76rem;color:var(--text);line-height:1.6"><strong style="color:#ffa500">Manda tu ID para comprobar si tiene la oferta.</strong> Una vez comprobada, haz tu pedido con saldo.</div>'
    +'</div>'
    +'<a href="https://wa.me/12894273983?text=Hola!%20Quiero%20verificar%20mi%20ID%20para%20Diamantes%201%20Vez%20x%20ID" target="_blank" style="display:flex;align-items:center;justify-content:center;gap:.5rem;width:100%;padding:.72rem;background:linear-gradient(90deg,#128c3e,#25d366);color:#fff;border-radius:9px;font-family:Poppins,sans-serif;font-weight:800;font-size:.85rem;text-decoration:none;box-sizing:border-box;margin-bottom:1.1rem">\uD83D\uDCF1 Verificar mi ID por WhatsApp</a>'
    +'<div class="lkpln-grid" style="margin-bottom:1.1rem">';
  for(var j=0;j<PRODUCTS_1VEZ.length;j++){
    rows+=makeModernCard(PRODUCTS_1VEZ[j], '#00e676', PRODUCTS_1VEZ[j].badge==='MEJOR PRECIO');
  }
  rows+='</div>'
    // Formulario 1 vez
    +'<div style="border-top:1px solid rgba(0,230,118,.15);padding-top:1rem">'
    +'<div style="font-size:.7rem;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:.5rem">Pedir con saldo (ID ya verificado)</div>'
    +'<label style="font-size:.72rem;color:var(--muted);display:block;margin-bottom:.25rem">Elige tu paquete</label>'
    +'<select id="v1-plan" style="width:100%;background:#0a1f14;border:1px solid rgba(0,230,118,.25);color:#fff;border-radius:9px;padding:.6rem .8rem;font-family:Poppins,sans-serif;font-size:.88rem;margin-bottom:.55rem;box-sizing:border-box">';
  for(var b=0;b<PRODUCTS_1VEZ.length;b++){
    rows+='<option value="'+PRODUCTS_1VEZ[b].total+'|'+PRODUCTS_1VEZ[b].prices[0]+'">'+PRODUCTS_1VEZ[b].name+' diamantes \u2014 '+fmt(PRODUCTS_1VEZ[b].prices[0])+' MX</option>';
  }
  rows+='</select>'
    +'<label style="font-size:.72rem;color:var(--muted);display:block;margin-bottom:.25rem">Tu ID de Free Fire</label>'
    +'<input id="v1-id" type="text" placeholder="Ej: 123456789" style="width:100%;background:#0a1f14;border:1px solid rgba(0,230,118,.25);color:#fff;border-radius:9px;padding:.6rem .8rem;font-family:Poppins,sans-serif;font-size:.88rem;margin-bottom:.55rem;box-sizing:border-box"/>'
    +'<label style="font-size:.72rem;color:var(--muted);display:block;margin-bottom:.25rem">Nombre en el juego</label>'
    +'<input id="v1-nombre" type="text" placeholder="Tu nickname" style="width:100%;background:#0a1f14;border:1px solid rgba(0,230,118,.25);color:#fff;border-radius:9px;padding:.6rem .8rem;font-family:Poppins,sans-serif;font-size:.88rem;margin-bottom:.65rem;box-sizing:border-box"/>'
    +'<div style="display:flex;justify-content:space-between;background:rgba(0,230,118,.06);border:1px solid rgba(0,230,118,.18);border-radius:8px;padding:.45rem .85rem;margin-bottom:.5rem"><span style="font-size:.72rem;color:var(--muted)">Tu saldo</span><span id="v1-saldo-val" style="font-family:Oxanium;font-weight:700;color:#00e676;font-size:.82rem">$0 MX</span></div>'
    +'<div id="v1-err" style="display:none;color:#ff6b6b;font-size:.75rem;margin-bottom:.5rem"></div>'
    +'<button onclick="submitV1Saldo()" style="width:100%;padding:.78rem;background:linear-gradient(90deg,#128c3e,#25d366);color:#fff;border:none;border-radius:10px;font-family:Poppins,sans-serif;font-weight:900;font-size:.9rem;cursor:pointer">\uD83D\uDD12 Confirmar con saldo</button>'
    +'</div>'
    +'</div>';

  g.innerHTML=rows;
  _updateDiamSaldos();
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
      card+='<div><div style="text-decoration:line-through;font-size:.78rem;color:var(--muted);font-family:Oxanium">'+fmt(p.origMX)+'</div>';
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
  // Campos rapidos nuevos
  var qu=document.getElementById('pf-quick-user'); if(qu) qu.textContent=u.username;
  var qav=document.getElementById('pf-quick-av'); if(qav) qav.textContent=u.username.charAt(0).toUpperCase();
  _iniciarRelojMexico();
  cargarWalletPerfil();
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
          +'<div style="font-family:Oxanium;font-size:.75rem;font-weight:700;color:'+color+';flex-shrink:0;margin-left:.5rem">'+signo+'$'+(m.monto||0).toLocaleString('es-MX')+'</div>'
          +'</div>';
      });
      movs.innerHTML=h;
    }).catch(function(){movs.innerHTML='<div style="text-align:center;padding:1rem;color:var(--muted)">Error al cargar</div>';});
  }
}

function renderMisCompras(){
  // Actualizar saldo y movimientos (movidos desde el perfil)
  _cargarSaldoYMovimientos();
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
  var instr=document.getElementById('honor-instr');
  if(instr) instr.style.display='none';
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
  if(saldoEl) saldoEl.textContent=authSession?fmt(authSession.saldo||0):fmt(0);
  var instrH=document.getElementById('honor-instr');
  if(instrH) instrH.style.display='none';
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
  // Notificar por Telegram (ya no WhatsApp) + registrar
  notificarPedidoTelegram('Compra', msg.replace(/\*/g,'').replace(/\n/g,' | '), 0, ord);
  showToast('\u2705 Pedido #'+ord+' enviado! Te contactaremos.', 3000);
  closeModal();
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
  if(saldoEl2) saldoEl2.textContent=authSession?fmt(authSession.saldo||0):fmt(0);
  var instrH2=document.getElementById('honor-instr');
  if(instrH2) instrH2.style.display='none';
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
  // Notificar por Telegram (ya no WhatsApp) + registrar
  notificarPedidoTelegram('Compra', msg.replace(/\*/g,'').replace(/\n/g,' | '), 0, ord);
  showToast('\u2705 Pedido #'+ord+' enviado! Te contactaremos.', 3000);
  closeModal();
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
  // Mostrar instrucciones OBLIGATORIAS de configuracion del clan
  var instr=document.getElementById('honor-instr');
  if(instr) instr.style.display='';
  var chk=document.getElementById('honor-confirmo');
  if(chk) chk.checked=false;
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
  // OBLIGATORIO: debe confirmar que configuro el clan
  var chk=document.getElementById('honor-confirmo');
  if(chk && !chk.checked){
    showToast('\u26A0 Debes confirmar que ya configuraste tu clan');
    var instr=document.getElementById('honor-instr');
    if(instr){
      instr.scrollIntoView({behavior:'smooth', block:'center'});
      instr.style.borderColor='#ff6b6b';
      setTimeout(function(){ instr.style.borderColor='rgba(255,180,60,.3)'; }, 2500);
    }
    return;
  }
  if(!f1){showToast('Ingresa el nombre del clan');return;}
  if(!f2){showToast('Ingresa el ID del clan');return;}
  if(!nombre){showToast('Ingresa tu nombre');return;}
  if(!wa||wa.replace(/\D/g,'').length<8){showToast('Ingresa tu WhatsApp');return;}

  var hIdx=parseInt(curId.replace('honor_',''));
  var h=HONOR[hIdx];
  if(!h) return;

  // Anti doble compra
  if(_comprandoHonor){ return; }

  // Validar saldo suficiente
  var saldo=(authSession&&authSession.saldo)?authSession.saldo:0;
  if(saldo < h.price){
    showToast('Saldo insuficiente. Tienes '+fmt(saldo)+' y necesitas '+fmt(h.price));
    return;
  }

  _comprandoHonor = true;
  var btnH=document.getElementById('btn-submit');
  if(btnH){ btnH.disabled=true; }

  var ord=getNextOrder();

  // COBRAR CON SALDO (con descripcion completa para historial/ranking)
  addSpend(h.price, 'Honor de Clan '+h.region+' - Clan:'+f1+' - ID:'+f2+' - Pedido #'+ord);

  addToHistoryLocal({name:'Honor '+h.region,price:h.price,icon:h.flag,
    date:new Date().toLocaleDateString('es-MX',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}),order:ord});

  // Registrar pedido con progreso (Honor de Clan se entrega en 7 dias)
  registrarPedidoHonor('Honor de Clan - '+h.region, f2, h.price, f1);

  // NOTIFICAR SOLO POR TELEGRAM
  if(typeof tgNotifyPurchase==='function'){
    tgNotifyPurchase(authSession.username,
      'HONOR DE CLAN '+h.region+' | Clan: '+f1+' | ID: '+f2+' | Nombre: '+nombre+' | WA: '+wa,
      h.price, ord);
  }

  _mostrarReciboHonor(h, f1, f2, ord);
  showToast('\u2705 Pedido #'+ord+' confirmado!', 3000);

  setTimeout(function(){
    _comprandoHonor = false;
    if(btnH){ btnH.disabled=false; }
  }, 3000);
}

var _comprandoHonor = false;

// Recibo de compra de Honor de Clan
function _mostrarReciboHonor(h, nombreClan, idClan, ord){
  var ahora = new Date();
  var fecha = ahora.toLocaleDateString('es-MX', { day:'2-digit', month:'2-digit', year:'numeric' });
  var hora = ahora.toLocaleTimeString('es-MX', { hour:'2-digit', minute:'2-digit' });

  // Cerrar el modal de compra (se reutiliza para otros productos)
  closeModal();

  // Crear una ventana propia para el recibo
  var ov = document.getElementById('recibo-honor-ov');
  if(ov) ov.remove();
  ov = document.createElement('div');
  ov.id = 'recibo-honor-ov';
  ov.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.82);display:flex;align-items:center;justify-content:center;padding:1.2rem;overflow-y:auto';
  ov.onclick = function(e){ if(e.target===ov) ov.remove(); };
  document.body.appendChild(ov);
  var cont = document.createElement('div');
  cont.style.cssText = 'max-width:420px;width:100%';
  ov.appendChild(cont);

  cont.innerHTML =
    '<div style="background:linear-gradient(160deg,#0a0e14,#0a0f14);border:2px solid rgba(37,211,102,.35);border-radius:18px;padding:1.75rem 1.25rem;text-align:center">'
    + '<div style="font-size:2.8rem;margin-bottom:.5rem">\u2705</div>'
    + '<div style="font-family:Oxanium;font-weight:900;font-size:1.25rem;color:#25d366;margin-bottom:.35rem;letter-spacing:.5px">PEDIDO CONFIRMADO</div>'
    + '<div style="font-size:.8rem;color:var(--muted);margin-bottom:1.35rem">Tu honor de clan esta en proceso</div>'
    + '<div style="background:rgba(0,0,0,.25);border-radius:99px;height:10px;overflow:hidden;margin-bottom:1.4rem"><div style="height:100%;width:20%;border-radius:99px;background:linear-gradient(90deg,#22d3ee,#ff9900);box-shadow:0 0 12px rgba(255,180,60,.5)"></div></div>'
    + '<div style="background:rgba(0,0,0,.25);border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:1rem;text-align:left">'
    +   _filaRecibo('\uD83D\uDCCB Pedido', '#'+ord)
    +   _filaRecibo('\uD83C\uDFC6 Servicio', 'Honor '+h.region)
    +   _filaRecibo('\uD83D\uDEE1\uFE0F Clan', nombreClan)
    +   _filaRecibo('\uD83C\uDD94 ID Clan', idClan)
    +   _filaRecibo('\uD83D\uDCB5 Precio', fmt(h.price))
    +   _filaRecibo('\uD83D\uDCC5 Fecha', fecha + ' \u00B7 ' + hora, true)
    + '</div>'
    + '<div style="background:rgba(255,180,60,.08);border:1px solid rgba(255,180,60,.25);border-radius:10px;padding:.75rem .9rem;margin-top:1rem;font-size:.73rem;color:#22d3ee;line-height:1.55">&#128197; Los pedidos se procesan <b>sabados y domingos</b>.<br/>&#129302; Los bots se uniran entre las <b>3:00 y 7:00 AM</b>.</div>'
    + '<button onclick="var o=document.getElementById(\'recibo-honor-ov\'); if(o) o.remove();" style="width:100%;margin-top:1.25rem;padding:.9rem;background:linear-gradient(135deg,#0e7490,#f0b90b);color:#fff;border:none;border-radius:12px;font-family:Poppins;font-weight:700;font-size:.9rem;cursor:pointer">Entendido</button>'
    + '</div>';
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
    +'<button onclick="openHonorCuentaModalWithPkg()" style="padding:.75rem 2rem;background:linear-gradient(90deg,#007799,#00f5ff);color:#020a0a;border:none;border-radius:8px;font-family:\'Poppins\';font-weight:800;font-size:.85rem;letter-spacing:2px;text-transform:uppercase;cursor:pointer;box-shadow:0 0 20px rgba(0,245,255,.3)">\u26A1 Contratar plan</button>'
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
  if(!authSession){ showToast('Inicia sesion para comprar'); setTimeout(showAuthModal,600); return; }
  if(typeof _comprandoHC!=='undefined' && _comprandoHC){ return; }

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

  // Solo pago con saldo
  var saldo = authSession.saldo || 0;
  if(saldo < pkgPrice){
    showToast('Saldo insuficiente. Tienes '+fmt(saldo)+' y necesitas '+fmt(pkgPrice)+'.');
    return;
  }

  _comprandoHC = true;
  var ord=getNextOrder();
  var planTxt = pkgDays?(pkgDays+' dias - '+pkgExp+' EXP'):'Nivel 1 al 40';
  addSpend(pkgPrice, 'Experiencia FF ('+planTxt+') - Cuenta:'+ncuenta+' - Pedido #'+ord);
  addToHistoryLocal({name:'Experiencia FF'+(pkgDays?' '+pkgDays+'D':''),price:pkgPrice,icon:'\uD83C\uDF71',
    date:new Date().toLocaleDateString('es-MX',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}),order:ord});
  if(typeof registrarPedido==='function') registrarPedido('Experiencia FF '+planTxt, 0, 'otro', ncuenta, pkgPrice, 0);
  if(typeof tgNotifyPurchase==='function'){
    tgNotifyPurchase(authSession.username,
      '\uD83C\uDF71 Experiencia FF\n\uD83D\uDCC5 Plan: '+planTxt+'\n\uD83D\uDC64 Cuenta FF: '+ncuenta+'\n\uD83D\uDD11 Token: '+token+'\n\uD83D\uDCF1 WA: +'+wa,
      pkgPrice, ord);
  }

  closeHonorCuentaModal();
  if(typeof _mostrarAvisoModal==='function'){
    _mostrarAvisoModal('PEDIDO #'+ord+' CONFIRMADO',
      'Tu <b style="color:#fff">Experiencia FF</b> ('+planTxt+') fue pedida.<br/>Te contactaremos por WhatsApp para coordinar.',
      '#22d3ee');
  }
  showToast('\u2705 Pedido #'+ord+' confirmado!', 3000);
  setTimeout(function(){ _comprandoHC = false; }, 3000);
}
var _comprandoHC = false;

/* \u2500\u2500 STORI / BINANCE MODALS \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
function openStoriModal(monto){var el=document.getElementById('modal-stori');if(el) el.classList.add('show'); var mi=document.getElementById('stori-monto'); if(mi && monto) mi.value=monto;}
function closeStoriModal(){var el=document.getElementById('modal-stori');if(el) el.classList.remove('show');}
function openBinanceModal(monto){var el=document.getElementById('modal-binance');if(el) el.classList.add('show');}
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
  var colors=['#22d3ee','#ffd000','#ff4422','#00f5ff','#25d366','#0e7490'];
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
  {label:'2%',disc:2,color:'#0055cc'},{label:'5%',disc:5,color:'#22d3ee'},
  {label:'3%',disc:3,color:'#0e7490'},{label:'10%',disc:10,color:'#ffd000'},
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
    ctx.textAlign='right'; ctx.fillStyle='#fff'; ctx.font='bold 13px Oxanium,sans-serif';
    ctx.fillText(RULETA_PRIZES[i].label,r-8,5); ctx.restore();
  }
  ctx.beginPath(); ctx.arc(cx,cy,16,0,Math.PI*2);
  ctx.fillStyle='#0b0b0b'; ctx.fill();
  ctx.strokeStyle='rgba(34,211,238,.5)'; ctx.lineWidth=2; ctx.stroke();
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
    if(typeof renderHomeDashboard==='function') renderHomeDashboard();
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
  if(lbPeriod==='semana')  since = _inicioPeriodo('semana');
  if(lbPeriod==='mes')     since = _inicioPeriodo('mes');

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
            + '<div style="width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,var(--c2),var(--c1));display:flex;align-items:center;justify-content:center;font-family:Oxanium;font-size:.72rem;font-weight:900;color:#fff;flex-shrink:0;border:2px solid '+(i===0?'#ffd700':color)+'44">'+initial+'</div>'
            /* Name + stats */
            + '<div style="flex:1;min-width:0">'
            + '<div style="font-size:.85rem;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'
            + u.username + (isMe?' <span style="font-size:.62rem;background:rgba(34,211,238,.15);color:var(--c1);padding:.1rem .35rem;border-radius:4px;font-family:sans-serif">Tu</span>':'')+'</div>'
            + '<div style="display:flex;align-items:center;gap:.6rem;margin-top:.2rem;flex-wrap:wrap">'
            + (diamonds>0?'<span style="font-size:.68rem;color:#67e8f9;font-weight:600">&#128142; '+diamonds.toLocaleString('es-MX')+'</span>':'')
            + (likes>0?'<span style="font-size:.68rem;color:#ff6b9d;font-weight:600">&#128077; '+likes.toLocaleString('es-MX')+'</span>':'')
            + '</div></div>'
            /* Amount */
            + '<div style="text-align:right;flex-shrink:0">'
            + '<div style="font-family:Oxanium;font-size:.82rem;font-weight:900;color:'+(i===0?'#ffd700':'#00e676')+'">'+'$'+monto.toLocaleString('es-MX')+'</div>'
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
            +'<td style="font-family:Oxanium;color:#00e676;font-weight:700">$'+(m.monto||0).toLocaleString('es-MX')+'</td>'
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
        g.addColorStop(0,'#22d3ee');
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
          '<div style="background:rgba(34,211,238,.07);border:1px solid rgba(34,211,238,.15);border-radius:8px;padding:.65rem;text-align:center">'
          +'<div style="font-family:Oxanium;font-size:.9rem;font-weight:700;color:var(--c1)">$'+avg.toLocaleString('es-MX')+'</div>'
          +'<div style="font-size:.62rem;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-top:.1rem">Promedio/dia</div></div>'
          +'<div style="background:rgba(255,208,0,.07);border:1px solid rgba(255,208,0,.15);border-radius:8px;padding:.65rem;text-align:center">'
          +'<div style="font-family:Oxanium;font-size:.9rem;font-weight:700;color:var(--c4)">$'+maxDay.toLocaleString('es-MX')+'</div>'
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
        +'<td style="font-family:Oxanium;color:#00e676;font-weight:700">$'+(u.saldo||0).toLocaleString('es-MX')+'</td>'
        +'<td style="color:var(--muted)">'+fecha+'</td>'
        +'<td><div style="display:flex;gap:.3rem;flex-wrap:wrap">'
        +'<button data-u="'+u.id+'" data-n="'+u.username+'" onclick="admAddSaldo(this.dataset.u,this.dataset.n)" class="adm-action-btn" style="border-color:rgba(0,230,118,.3);color:#00e676">+$</button>'
        +'<button data-u="'+u.id+'" data-n="'+u.username+'" onclick="admQuitarSaldo(this.dataset.u,this.dataset.n)" class="adm-action-btn" style="border-color:rgba(255,80,80,.3);color:#ff6b6b">-$</button>'
        +'<button data-u="'+u.id+'" data-n="'+u.username+'" onclick="admVerHistorial(this.dataset.u,this.dataset.n)" class="adm-action-btn" style="border-color:rgba(34,211,238,.3);color:var(--c1)">Hist</button>'
        +'<button data-u="'+u.id+'" data-n="'+u.username+'" data-r="'+u.role+'" onclick="admCambiarRol(this.dataset.u,this.dataset.n,this.dataset.r)" class="adm-action-btn" style="border-color:rgba(34,211,238,.3);color:#67e8f9">Rol</button>'
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
          +'<td style="color:var(--muted);font-family:Oxanium;font-size:.7rem">'+(i+1)+'</td>'
          +'<td style="font-weight:700;color:#fff">'+(umap[m.user_id]||'-')+'</td>'
          +'<td>'+tipoBadge+'</td>'
          +'<td style="color:var(--muted)">'+(m.descripcion||'-')+'</td>'
          +'<td style="font-family:Oxanium;font-weight:700;color:'+(isC?'#00e676':'#ff6b6b')+'">'+(isC?'+':'-')+'$'+(m.monto||0).toLocaleString('es-MX')+'</td>'
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
          +'<td style="font-family:Oxanium;font-weight:700;color:'+(isC?'#00e676':'#ff6b6b')+'">'+(isC?'+':'-')+'$'+(m.monto||0).toLocaleString('es-MX')+'</td>'
          +'<td style="color:var(--muted)">'+(m.descripcion||'-')+'</td>'
          +'<td style="color:var(--muted)">'+fecha+'</td>'
          +'</tr>';
      });
      tbody.innerHTML=h;
    });
  }).catch(function(){tbody.innerHTML='<tr><td colspan="5" style="text-align:center;color:#ff6b6b;padding:2rem">Error</td></tr>';});
}

// Muestra el equivalente en MXN mientras el admin escribe
function admCalcEquiv(){
  var monto=parseFloat((document.getElementById('adm-saldo-monto')||{}).value||'0');
  var cur=((document.getElementById('adm-saldo-moneda')||{}).value||'MXN');
  var el=document.getElementById('adm-saldo-equiv');
  if(!el) return;
  if(!monto || monto<=0 || cur==='MXN'){ el.style.display='none'; return; }
  var mxn = monto / (RATES[cur]||1);
  el.style.display='block';
  el.textContent = '\u2248 $'+mxn.toLocaleString('es-MX',{maximumFractionDigits:2})+' MXN (se aplicara este monto)';
}

function admSaldoAction(action){
  var username=((document.getElementById('adm-saldo-user')||{}).value||'').trim().toLowerCase();
  var montoInput=parseFloat((document.getElementById('adm-saldo-monto')||{}).value||'0');
  var curAdm=((document.getElementById('adm-saldo-moneda')||{}).value||'MXN');
  // Convertir siempre a MXN (el saldo se guarda en MXN)
  var monto = Math.round((montoInput / (RATES[curAdm]||1)) * 100) / 100;
  var desc=((document.getElementById('adm-saldo-desc')||{}).value||'').trim()||'Ajuste manual por admin';
  if(curAdm!=='MXN'){ desc += ' ('+montoInput+' '+curAdm+')'; }
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
  if(!montoInput||montoInput<=0){showMsg('Ingresa un monto valido','#ff6b6b');return;}
  sb.get('profiles','username=eq.'+encodeURIComponent(username)+'&limit=1').then(function(users){
    if(!users||!users[0]){showMsg('Usuario no encontrado','#ff6b6b');return;}
    var u=users[0];
    var delta = (action==='add') ? monto : -monto;

    // AJUSTE ATÓMICO: la base de datos suma/resta (no se puede pisar)
    _rpcAjustarSaldo(u.id, delta).then(function(saldoNuevo){
      var sn = Number(saldoNuevo) || 0;
      sbAddMovimiento(u.id, action==='add'?'credito':'debito', monto, desc);
      var detCur = (curAdm!=='MXN') ? (' ('+montoInput+' '+curAdm+')') : '';
      showMsg((action==='add'?'+':'-')+'$'+monto+' MXN'+detCur+' a '+username+'. Saldo TOTAL ahora: $'+sn.toLocaleString('es-MX'),'#00e676');
      admFullLoadMovs();
      var mu=document.getElementById('adm-saldo-monto');
      var md=document.getElementById('adm-saldo-desc');
      if(mu) mu.value=''; if(md) md.value='';
      var eqEl=document.getElementById('adm-saldo-equiv'); if(eqEl) eqEl.style.display='none';
    }).catch(function(err){
      console.error('[ADM SALDO] RPC fallo:', err);
      showMsg('Error: falta ejecutar FIX-SALDO-ATOMICO.sql en Supabase. Detalle: '+(err&&err.message?err.message:err),'#ff6b6b');
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
        +'<div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,var(--c2),var(--c1));display:flex;align-items:center;justify-content:center;font-family:Oxanium;font-size:.62rem;font-weight:700;color:#fff;flex-shrink:0">'+u.username.charAt(0).toUpperCase()+'</div>'
        +'<div style="flex:1;font-size:.82rem;font-weight:700;color:#fff">'+u.username+'</div>'
        +'<div style="font-family:Oxanium;font-size:.78rem;font-weight:900;color:'+(i===0?'#ffd700':'#00e676')+'">'+'$'+val.toLocaleString('es-MX')+'</div>'
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
  if(!authSession){ showToast('Inicia sesion para comprar'); setTimeout(showAuthModal,600); return; }
  if(typeof _comprandoFrag!=='undefined' && _comprandoFrag){ return; }

  var ffId   = ((document.getElementById('frag-id')||{}).value||'').trim();
  var ffNom  = ((document.getElementById('frag-nombre')||{}).value||'').trim();
  var err    = document.getElementById('frag-err');
  function showErr(msg){ if(err){err.textContent=msg;err.style.display='block';} }

  if(!ffId)  { showErr('Ingresa tu ID de Free Fire'); return; }
  if(!ffNom) { showErr('Ingresa tu nombre en el juego'); return; }

  // Solo pago con saldo
  var saldoActual = authSession.saldo || 0;
  if(saldoActual < fragCurrent.mxn){
    showErr('Saldo insuficiente. Tienes '+fmt(saldoActual)+' y necesitas '+fmt(fragCurrent.mxn)+'.');
    return;
  }
  if(err) err.style.display='none';

  _comprandoFrag = true;
  var ord = getNextOrder();
  addSpend(fragCurrent.mxn, fragCurrent.diam+' Diamantes (Fragmentos Evo '+fragCurrent.frags+' frags) - ID:'+ffId+' ('+ffNom+') - Pedido #'+ord);
  registrarPedido('Fragmentos Evo '+fragCurrent.frags, fragCurrent.diam, 'diamantes', ffId, fragCurrent.mxn, 0);
  if(typeof tgNotifyPurchase==='function'){
    tgNotifyPurchase(authSession.username,
      '\uD83E\uDDE9 Fragmentos Evo\n\uD83D\uDCA0 '+fragCurrent.frags+' frags / '+fragCurrent.diam+' diamantes\n\uD83C\uDFAE ID: '+ffId+'\n\uD83D\uDC64 Nombre IG: '+ffNom,
      fragCurrent.mxn, ord);
  }

  closeFragModal();
  if(typeof _mostrarAvisoModal==='function'){
    _mostrarAvisoModal('PEDIDO #'+ord+' CONFIRMADO',
      'Tus <b style="color:#fff">'+fragCurrent.frags+' Fragmentos Evo</b> fueron pedidos.<br/>Te avisaremos cuando esten entregados.',
      '#22d3ee');
  }
  showToast('\u2705 Pedido #'+ord+' confirmado!', 3000);
  setTimeout(function(){ _comprandoFrag = false; }, 3000);
}
var _comprandoFrag = false;

/* \u2500\u2500 CART WITH SALDO \u2500\u2500 */
function renderCart(){
  var body=document.getElementById('cart-modal-body');
  if(!body) return;
  var c=getCart(); cart=c;
  if(!c.length){ body.innerHTML='<div class="cart-empty">Tu carrito esta vacio</div>'; return; }
  var total=c.reduce(function(s,i){return s+i.price;},0);
  var saldo=authSession?(authSession.saldo||0):0;
  var enough=saldo>=total;

  // Cada item con SU PROPIO formulario de ID y nombre
  var rows=c.map(function(item,idx){
    var h='<div class="cart-item" style="flex-direction:column;align-items:stretch;gap:.5rem">';
    h+='<div style="display:flex;align-items:center;justify-content:space-between">';
    h+='<div class="ci-info"><div class="ci-name">'+(item.icon||'')+' '+item.name+'</div><div class="ci-sub">'+fmt(item.price)+'</div></div>';
    h+='<button class="ci-del" onclick="removeFromCart('+item.id+')">&#215;</button>';
    h+='</div>';
    // Formulario por item (solo si hay sesion)
    if(authSession){
      h+='<div style="background:rgba(0,150,255,.04);border:1px solid rgba(0,150,255,.12);border-radius:7px;padding:.5rem .6rem">';
      h+='<label style="display:block;font-size:.58rem;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#5a6580;margin-bottom:.15rem">ID de Free Fire</label>';
      h+='<input id="cart-id-'+item.id+'" type="text" value="'+(item.ffId||'')+'" oninput="updateCartItemField('+item.id+',\'ffId\',this.value)" placeholder="Ej: 123456789" style="width:100%;background:#10131f;border:1px solid rgba(0,150,255,.2);color:#fff;border-radius:5px;padding:.42rem .6rem;font-size:.8rem;margin-bottom:.35rem;box-sizing:border-box"/>';
      h+='<label style="display:block;font-size:.58rem;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#5a6580;margin-bottom:.15rem">Nombre en el juego</label>';
      h+='<input id="cart-nom-'+item.id+'" type="text" value="'+(item.ffNom||'')+'" oninput="updateCartItemField('+item.id+',\'ffNom\',this.value)" placeholder="Tu nickname" style="width:100%;background:#10131f;border:1px solid rgba(0,150,255,.2);color:#fff;border-radius:5px;padding:.42rem .6rem;font-size:.8rem;box-sizing:border-box"/>';
      h+='</div>';
    }
    h+='</div>';
    return h;
  }).join('');

  rows+='<div class="cart-total"><span>Total</span><span style="color:'+(enough?'#00e676':'#ff6b6b')+'">'+fmt(total)+'</span></div>';
  rows+='<div style="display:flex;justify-content:space-between;background:rgba(0,230,118,.06);border:1px solid rgba(0,230,118,.18);border-radius:8px;padding:.5rem .85rem;margin:.5rem 0"><span style="font-size:.72rem;color:var(--muted)">Tu saldo</span><span style="font-family:Oxanium;font-weight:700;color:'+(enough?'#00e676':'#ff6b6b')+'">'+fmt(saldo)+'</span></div>';
  if(!authSession){
    rows+='<button onclick="closeCart();showAuthModal();" style="width:100%;padding:.72rem;background:linear-gradient(90deg,#0055cc,#22d3ee);color:#fff;border:none;border-radius:7px;font-weight:700;font-size:.9rem;cursor:pointer">Inicia sesion</button>';
  } else if(!enough){
    var falta=total-saldo;
    rows+='<div style="font-size:.78rem;color:#ff6b6b;margin-bottom:.5rem">Saldo insuficiente. Te faltan $'+falta.toLocaleString('es-MX')+' MX.</div>';
    rows+='<button onclick="closeCart();goPage(String.fromCharCode(115,97,108,100,111));" style="width:100%;padding:.72rem;background:linear-gradient(90deg,#128c3e,#25d366);color:#fff;border:none;border-radius:7px;font-weight:700;font-size:.9rem;cursor:pointer">Recargar saldo</button>';
  } else {
    rows+='<div id="cart-err" style="color:#ff6b6b;font-size:.75rem;margin-bottom:.4rem;display:none"></div>';
    rows+='<button id="cart-confirm-btn" onclick="submitCart()" style="width:100%;padding:.72rem;background:linear-gradient(90deg,#128c3e,#25d366);color:#fff;border:none;border-radius:7px;font-weight:700;font-size:.9rem;cursor:pointer">Confirmar con saldo</button>';
  }
  body.innerHTML=rows;
}

// Guardar ID/nombre de cada item del carrito
function updateCartItemField(itemId, field, value){
  var c=getCart();
  var item=c.filter(function(i){return i.id===itemId;})[0];
  if(item){ item[field]=value; saveCart(c); }
}

function submitCart(){
  if(!authSession){ showToast('Inicia sesion'); return; }
  var errEl=document.getElementById('cart-err');
  var btn=document.getElementById('cart-confirm-btn');
  function showErr(m){ if(errEl){errEl.textContent=m;errEl.style.display='block';} }
  var c=getCart();
  if(!c.length){ showErr('Tu carrito esta vacio'); return; }

  // Validar que CADA item tenga su ID y nombre
  for(var i=0;i<c.length;i++){
    if(!c[i].ffId || !c[i].ffId.trim()){ showErr('Falta el ID de Free Fire en: '+c[i].name); return; }
    if(!c[i].ffNom || !c[i].ffNom.trim()){ showErr('Falta el nombre en el juego en: '+c[i].name); return; }
  }

  var total=c.reduce(function(s,i){return s+i.price;},0);
  var saldo=authSession.saldo||0;
  if(saldo<total){ showErr('Saldo insuficiente ($'+saldo.toLocaleString('es-MX')+' MX). Recarga tu cuenta.'); return; }
  // Anti-doble-click
  if(btn && btn.disabled) return;
  if(btn){ btn.disabled=true; setTimeout(function(){ if(btn) btn.disabled=false; }, 4000); }
  if(errEl) errEl.style.display='none';
  var ord=getNextOrder();
  // Detalle por item: "110 diamantes (ID:123 / Nick)"
  var detalle=c.map(function(i){return i.name+' [ID:'+i.ffId+' / '+i.ffNom+']';}).join(' | ');
  addSpend(total,'Carrito: '+detalle+' - Pedido #'+ord);
  if(typeof tgNotifyPurchase==='function') tgNotifyPurchase(authSession.username,'Carrito: '+detalle,total,ord);
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
  window.open('https://wa.me/12894273983?text='+msg,'_blank');
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
  window.open('https://wa.me/12894273983?text='+msg,'_blank');
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
  if(el && authSession) el.textContent=fmt(authSession.saldo||0);
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
  registrarPedido('Likes Instantaneos '+plan.label, plan.label, 'likes', ffId, plan.precio, 0);
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
  registrarPedido('Likes Basicos '+plan.label, plan.label, 'likes', ffId, plan.precio, 7);
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
      + '<div style="width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,var(--c2),var(--c1));display:flex;align-items:center;justify-content:center;font-family:Oxanium;font-size:.72rem;font-weight:900;color:#fff;flex-shrink:0;border:2px solid '+medalColor+'44">'+initial+'</div>'
      + '<div style="flex:1;min-width:0">'
      + '<div style="font-size:.85rem;font-weight:700;color:#fff">'+item.username+(isMe?' <span style="font-size:.62rem;background:rgba(34,211,238,.15);color:var(--c1);padding:.1rem .35rem;border-radius:4px">Tu</span>':'')+' </div>'
      + '</div>'
      + '<div style="text-align:right;flex-shrink:0;font-family:Oxanium;font-size:.82rem;font-weight:900;color:'+valueColor+'">$'+Math.round(value).toLocaleString('es-MX')+'</div>'
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

  if(period === 'weekly')  since = _inicioPeriodo('semana');
  if(period === 'monthly') since = _inicioPeriodo('mes');
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
          + '<div style="width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,var(--c2),var(--c1));display:flex;align-items:center;justify-content:center;font-family:Oxanium;font-size:.72rem;font-weight:900;color:#fff;flex-shrink:0;border:2px solid '+medalColor+'44">'+initial+'</div>'
          + '<div style="flex:1;min-width:0">'
          + '<div style="font-size:.85rem;font-weight:700;color:#fff">'+item.username+(isMe?' <span style="font-size:.62rem;background:rgba(34,211,238,.15);color:var(--c1);padding:.1rem .35rem;border-radius:4px">Tu</span>':'')+' </div>'
          + '<div style="font-size:.65rem;color:var(--muted);margin-top:.15rem">👍 '+item.likes.toLocaleString('es-MX')+' likes</div>'
          + '</div>'
          + '<div style="text-align:right;flex-shrink:0;font-family:Oxanium;font-size:.82rem;font-weight:900;color:'+(i===0?'#ffd700':'#00e676')+'">$'+item.value.toLocaleString('es-MX')+'</div>'
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
          + '<div style="width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,var(--c2),var(--c1));display:flex;align-items:center;justify-content:center;font-family:Oxanium;font-size:.72rem;font-weight:900;color:#fff;flex-shrink:0;border:2px solid '+medalColor+'44">'+initial+'</div>'
          + '<div style="flex:1;min-width:0">'
          + '<div style="font-size:.85rem;font-weight:700;color:#fff">'+item.username+(isMe?' <span style="font-size:.62rem;background:rgba(34,211,238,.15);color:var(--c1);padding:.1rem .35rem;border-radius:4px">Tu</span>':'')+' </div>'
          + '<div style="font-size:.65rem;color:var(--muted);margin-top:.15rem">💎 '+item.diamantes.toLocaleString('es-MX')+' diamantes</div>'
          + '</div>'
          + '<div style="text-align:right;flex-shrink:0;font-family:Oxanium;font-size:.82rem;font-weight:900;color:'+(i===0?'#ffd700':'#00e676')+'">$'+item.value.toLocaleString('es-MX')+'</div>'
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
          + '<div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,var(--c2),var(--c1));display:flex;align-items:center;justify-content:center;font-family:Oxanium;font-size:.75rem;font-weight:900;color:#fff;flex-shrink:0">'+initial+'</div>'
          + '<div style="flex:1"><div style="font-size:.88rem;font-weight:700;color:#fff">'+item.username+(isMe?' 👤':'')+' </div><div style="font-size:.65rem;color:var(--muted)">Dinero: $'+item.value.toLocaleString('es-MX')+'</div></div>'
          + '<div style="text-align:right;flex-shrink:0"><div style="font-family:Oxanium;font-size:.95rem;font-weight:900;color:'+medalColor+'">$'+item.value.toLocaleString('es-MX')+'</div><div style="font-size:.6rem;color:var(--muted)">MX</div></div>'
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
        if(typeof cargarTotalesGlobales === 'function') cargarTotalesGlobales();
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
  window.open('https://wa.me/12894273983?text='+encodeURIComponent(msg), '_blank');
}

function quoteLikesInstant(){
  var msg = 'Hola, me interesa un plan de likes instantáneos. ¿Cuál recomiendas?';
  window.open('https://wa.me/12894273983?text='+encodeURIComponent(msg), '_blank');
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
        tab.style.background = 'linear-gradient(90deg,#67e8f9,#0e7490)';
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

  // Filtro de fecha según período (calendario real, no "ultimos N dias")
  var since = _inicioPeriodo(diamondPeriod);

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
          + '<div style="width:'+avSize+';height:'+avSize+';border-radius:11px;background:linear-gradient(135deg,#67e8f9,#0e7490);display:flex;align-items:center;justify-content:center;font-family:Oxanium;font-size:'+(isTop1?'.9rem':'.78rem')+';font-weight:900;color:#fff;flex-shrink:0;border:2px solid '+rankColor+'44">'+initial+'</div>'
          + '<div style="flex:1;min-width:0">'
          + '<div style="font-size:'+(isTop1?'1rem':'.85rem')+';font-weight:'+(isTop1?'900':'700')+';color:#fff">'+item.username+'</div>'
          + '<div style="font-size:.62rem;color:var(--muted)">diamantes comprados</div>'
          + '</div>'
          + '<div style="text-align:right;flex-shrink:0;font-family:Oxanium;font-size:'+(isTop1?'1.05rem':'.88rem')+';font-weight:900;color:'+(isTop1?'#ffd700':'#67e8f9')+'">'+item.diamonds.toLocaleString('es-MX')+' 💎</div>'
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
          + '<div style="width:'+avSize+';height:'+avSize+';border-radius:11px;background:linear-gradient(135deg,#ffd700,#f0a000);display:flex;align-items:center;justify-content:center;font-family:Oxanium;font-size:'+(isTop1?'.9rem':'.78rem')+';font-weight:900;color:#1a0a00;flex-shrink:0;border:2px solid '+rankColor+'44">'+initial+'</div>'
          + '<div style="flex:1;min-width:0">'
          + '<div style="font-size:'+(isTop1?'1rem':'.85rem')+';font-weight:'+(isTop1?'900':'700')+';color:#fff">'+item.username+'</div>'
          + '<div style="font-size:.62rem;color:var(--muted)">gastado en total</div>'
          + '</div>'
          + '<div style="text-align:right;flex-shrink:0;font-family:Oxanium;font-size:'+(isTop1?'1.05rem':'.88rem')+';font-weight:900;color:'+(isTop1?'#ffd700':'#f0a000')+'">$'+Math.round(item.monto).toLocaleString('es-MX')+'</div>'
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
          + '<div style="width:'+avSize+';height:'+avSize+';border-radius:11px;background:linear-gradient(135deg,#ff4da6,#d6249f);display:flex;align-items:center;justify-content:center;font-family:Oxanium;font-size:'+(isTop1?'.9rem':'.78rem')+';font-weight:900;color:#fff;flex-shrink:0;border:2px solid '+rankColor+'44">'+initial+'</div>'
          + '<div style="flex:1;min-width:0">'
          + '<div style="font-size:'+(isTop1?'1rem':'.85rem')+';font-weight:'+(isTop1?'900':'700')+';color:#fff">'+item.username+'</div>'
          + '<div style="font-size:.62rem;color:var(--muted)">likes comprados</div>'
          + '</div>'
          + '<div style="text-align:right;flex-shrink:0;font-family:Oxanium;font-size:'+(isTop1?'1.05rem':'.88rem')+';font-weight:900;color:'+(isTop1?'#ff4da6':'#d6249f')+'">'+item.likes.toLocaleString('es-MX')+' 👍</div>'
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


// ═══ POPUP DE BIENVENIDA (canal WhatsApp) ═══
var WA_CHANNEL = 'https://whatsapp.com/channel/0029VbCXQVjJENyAgAoJLJ3g';

function showWelcome(){
  var el = document.getElementById('welcome-modal');
  if(el){ el.style.display = 'flex'; }
}

function closeWelcome(){
  var el = document.getElementById('welcome-modal');
  if(el){ el.style.display = 'none'; }
}

function joinWhatsAppChannel(){
  window.open(WA_CHANNEL, '_blank');
  closeWelcome();
}

// Vigilante: detecta cuando un usuario NUEVO inicia sesión/se registra
// y le muestra la bienvenida solo una vez (por usuario)
(function(){
  var lastSeenUser = null;
  setInterval(function(){
    if(typeof authSession !== 'undefined' && authSession && authSession.id){
      // Si cambió el usuario logueado
      if(lastSeenUser !== authSession.id){
        lastSeenUser = authSession.id;
        // ¿Ya vio la bienvenida este usuario?
        var key = 'ciberstore_welcome_' + authSession.id;
        try {
          if(!localStorage.getItem(key)){
            localStorage.setItem(key, '1');
            setTimeout(showWelcome, 800); // pequeño delay para que cargue la UI
          }
        } catch(e){
          // Si localStorage falla, mostrar igual una vez por sesión
          setTimeout(showWelcome, 800);
        }
      }
    } else {
      lastSeenUser = null;
    }
  }, 1000);
})();


// ═══ COTIZAR MÁS DIAMANTES (WhatsApp) ═══
function cotizarDiamantes(){
  var cantidad = ((document.getElementById('cotizar-cantidad')||{}).value||'').trim();
  var ffId = ((document.getElementById('cotizar-id')||{}).value||'').trim();

  if(!cantidad){ showToast('Ingresa la cantidad de diamantes'); return; }
  if(!ffId){ showToast('Ingresa tu ID de Free Fire'); return; }

  var msg = 'Hola CiberStore! Quiero COTIZAR diamantes ilimitados.%0A%0A'
          + '💎 Cantidad: ' + encodeURIComponent(cantidad) + ' diamantes%0A'
          + '🆔 Mi ID de Free Fire: ' + encodeURIComponent(ffId) + '%0A%0A'
          + 'Me pasan el precio por favor?';

  // Tambien avisar a Telegram (sin foto, ya que por WhatsApp va aparte)
  _notifTelegramTexto(metodo);

  window.open('https://wa.me/12894273983?text=' + msg, '_blank');
}

// Manda solo el aviso de texto a Telegram (para el flujo de WhatsApp)
function _notifTelegramTexto(metodo){
  var user = (authSession && authSession.username) ? authSession.username : 'Cliente';
  var metodoNom = '', monto = '', extra = '';

  if(metodo === 'stori'){
    metodoNom = 'Transferencia Bancaria';
    monto = ((document.getElementById('stori-monto')||{}).value||'').trim();
    var ref = ((document.getElementById('stori-ref')||{}).value||'').trim();
    extra = (ref ? 'Referencia: '+ref+' | ' : '') + 'Enviara comprobante por WhatsApp';
  } else if(metodo === 'zelle'){
    metodoNom = 'Zelle (USA)';
    var usdT = ((document.getElementById('zelle-monto')||{}).value||'').trim();
    var mxnT = _zelleMXN(usdT);
    monto = '$'+usdT+' USD = $'+mxnT.toLocaleString('es-MX')+' MXN';
    var nom = ((document.getElementById('zelle-nombre')||{}).value||'').trim();
    extra = (nom ? 'Enviado por: '+nom+' | ' : '') + 'Enviara comprobante por WhatsApp';
  } else if(metodo === 'binance'){
    metodoNom = 'Binance Pay (USDT)';
    if(_bncSel){ monto = 'Paga '+_bncSel.paga+' USDT / Recibe $'+_bncSel.recibe+' MXN'; }
    extra = 'Enviara comprobante por WhatsApp';
  }

  try {
    fetch(NOTIF_RECARGA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario: user, metodo: metodoNom, monto: monto, extra: extra, foto_base64: '' })
    }).catch(function(){});
  } catch(e){}
}


// ═══ DIAMANTES X ID +20% BONUS ═══
var BONUS_PLANES = {
  '120|15':     {diamantes:120,   precio:15,   label:'100 + 20% = 120 Diamantes'},
  '372|50':     {diamantes:372,   precio:50,   label:'310 + 20% = 372 Diamantes'},
  '624|75':     {diamantes:624,   precio:75,   label:'520 + 20% = 624 Diamantes'},
  '1272|150':   {diamantes:1272,  precio:150,  label:'1060 + 20% = 1,272 Diamantes'},
  '2616|270':   {diamantes:2616,  precio:270,  label:'2180 + 20% = 2,616 Diamantes'},
  '6720|685':   {diamantes:6720,  precio:685,  label:'5600 + 20% = 6,720 Diamantes'},
  '13440|1370': {diamantes:13440, precio:1370, label:'11200 + 20% = 13,440 Diamantes'}
};

function submitBonusSaldo(){
  if(!authSession){ showToast('Inicia sesion para comprar'); setTimeout(showAuthModal,600); return; }
  var planKey = ((document.getElementById('bonus-plan')||{}).value||'');
  var ffId = ((document.getElementById('bonus-id')||{}).value||'').trim();
  var ffNom = ((document.getElementById('bonus-nombre')||{}).value||'').trim();
  var err = document.getElementById('bonus-err');
  function showErr(m){ if(err){err.textContent=m;err.style.display='block';} }

  var plan = BONUS_PLANES[planKey];
  if(!plan){ showErr('Selecciona una oferta'); return; }
  if(!ffId){ showErr('Ingresa tu ID de Free Fire'); return; }
  if(!ffNom){ showErr('Ingresa tu nombre en el juego'); return; }

  var saldo = authSession.saldo || 0;
  if(saldo < plan.precio){
    showErr('Saldo insuficiente ($'+saldo.toLocaleString('es-MX')+' MX). Recarga tu cuenta.');
    return;
  }
  if(err) err.style.display='none';

  var ord = getNextOrder();
  addSpend(plan.precio, plan.label+' Diamantes (Bonus +20%) - ID:'+ffId+' ('+ffNom+') - Pedido #'+ord);
  if(typeof tgNotifyPurchase==='function'){
    tgNotifyPurchase(authSession.username,
      '\uD83C\uDF81 Bonus (+20%)\n\uD83D\uDCA0 Paquete: ' + plan.label + '\n\uD83C\uDFAE ID: ' + ffId + '\n\uD83D\uDC64 Nombre IG: ' + ffNom,
      plan.precio, ord);
  }
  showToast('Pedido #'+ord+' confirmado!', 2500);

  // Limpiar
  var idEl=document.getElementById('bonus-id'); if(idEl) idEl.value='';
  var nomEl=document.getElementById('bonus-nombre'); if(nomEl) nomEl.value='';
  _updateBonusSaldo();
}

function cotizarBonus(){
  var planKey = ((document.getElementById('bonus-plan')||{}).value||'');
  var plan = BONUS_PLANES[planKey];
  var ffId = ((document.getElementById('bonus-id')||{}).value||'').trim();
  var txt = 'Hola! Quiero pedir '+(plan?plan.label:'diamantes x ID +20% bonus');
  if(ffId) txt += ' para mi ID: '+ffId;
  window.open('https://wa.me/12894273983?text='+encodeURIComponent(txt), '_blank');
}

function _updateBonusSaldo(){
  var el = document.getElementById('bonus-saldo-val');
  if(el && authSession) el.textContent = fmt(authSession.saldo||0);
}

// Actualizar saldo del bonus al abrir diamantes
var _origGoPageBonus = goPage;
goPage = function(id){
  _origGoPageBonus(id);
  if(id === 'diamantes') setTimeout(function(){ _updateBonusSaldo(); if(typeof _updateDiamSaldos==='function') _updateDiamSaldos(); }, 300);
};


// ═══ COMPRA DIAMANTES ILIMITADOS / 1 VEZ x ID (con saldo) ═══
function _updateDiamSaldos(){
  var s = authSession ? fmt(authSession.saldo||0) : fmt(0);
  ['ilim-saldo-val','v1-saldo-val','pin-saldo-val','pin-api-saldo'].forEach(function(id){
    var el=document.getElementById(id); if(el) el.textContent=s;
  });
}

function _procesarCompraDiam(planVal, idEl, nomEl, errEl, etiqueta){
  if(!authSession){ showToast('Inicia sesion para comprar'); setTimeout(showAuthModal,600); return; }
  var err=document.getElementById(errEl);
  function showErr(m){ if(err){err.textContent=m;err.style.display='block';} }

  var parts=(planVal||'').split('|');
  var diamantes=parseInt(parts[0])||0;
  var precio=parseInt(parts[1])||0;
  var ffId=((document.getElementById(idEl)||{}).value||'').trim();
  var ffNom=((document.getElementById(nomEl)||{}).value||'').trim();

  if(!precio){ showErr('Selecciona un paquete'); return; }
  if(!ffId){ showErr('Ingresa tu ID de Free Fire'); return; }
  if(!ffNom){ showErr('Ingresa tu nombre en el juego'); return; }

  var saldo=authSession.saldo||0;
  if(saldo<precio){ showErr('Saldo insuficiente ($'+saldo.toLocaleString('es-MX')+' MX). Recarga tu cuenta.'); return; }
  if(err) err.style.display='none';

  var ord=getNextOrder();
  var diamTxt = diamantes.toLocaleString('es-MX');
  addSpend(precio, diamTxt+' Diamantes ('+etiqueta+') - ID:'+ffId+' ('+ffNom+') - Pedido #'+ord);
  registrarPedido(diamTxt+' Diamantes ('+etiqueta+')', diamantes, 'diamantes', ffId, precio, 0);
  if(typeof tgNotifyPurchase==='function'){
    tgNotifyPurchase(authSession.username,
      '\uD83D\uDC8E ' + etiqueta + '\n\uD83D\uDCA0 Cantidad: ' + diamTxt + ' diamantes\n\uD83C\uDFAE ID: ' + ffId + '\n\uD83D\uDC64 Nombre IG: ' + ffNom,
      precio, ord);
  }
  showToast('Pedido #'+ord+' confirmado!', 2500);

  if(document.getElementById(idEl)) document.getElementById(idEl).value='';
  if(document.getElementById(nomEl)) document.getElementById(nomEl).value='';
  _updateDiamSaldos();
}

function submitIlimSaldo(){
  var v=((document.getElementById('ilim-plan')||{}).value||'');
  _procesarCompraDiam(v, 'ilim-id', 'ilim-nombre', 'ilim-err', 'Diamantes Ilimitados');
}

function submitV1Saldo(){
  var v=((document.getElementById('v1-plan')||{}).value||'');
  _procesarCompraDiam(v, 'v1-id', 'v1-nombre', 'v1-err', 'Diamantes 1 Vez x ID');
}

function cotizarIlim(){
  var v=((document.getElementById('ilim-plan')||{}).value||'');
  var diamantes=(v.split('|')[0])||'';
  var ffId=((document.getElementById('ilim-id')||{}).value||'').trim();
  var txt='Hola! Quiero pedir '+diamantes+' diamantes ilimitados';
  if(ffId) txt+=' para mi ID: '+ffId;
  window.open('https://wa.me/12894273983?text='+encodeURIComponent(txt),'_blank');
}


// ═══ PINES DE FREE FIRE (stock + entrega automática) ═══
// Tabla Supabase sugerida: "pines" con columnas:
//   id, tipo (ej '110 diamantes'), precio (int), codigo (text), vendido (bool), user_id (text, null hasta vender)
var _pinesDisponibles = [];
var _ultimoPin = '';

function loadPines(){
  var grid = document.getElementById('pines-grid');
  var sel = document.getElementById('pin-plan');
  if(!grid) return;
  if(!window.sb){ setTimeout(loadPines, 1500); return; }

  // Traer pines NO vendidos
  sb.get('pines', 'vendido=eq.false&select=id,tipo,precio,codigo&order=precio.asc').then(function(pins){
    if(!pins || !Array.isArray(pins) || !pins.length){
      grid.innerHTML = '<div style="text-align:center;padding:1.5rem;color:var(--muted);font-size:.82rem">No hay pines en stock ahora. Vuelve pronto o contacta al admin.</div>';
      if(sel) sel.innerHTML = '<option value="">Sin stock</option>';
      return;
    }

    // Agrupar por tipo para mostrar cuántos hay disponibles
    var porTipo = {};
    pins.forEach(function(p){
      if(!porTipo[p.tipo]) porTipo[p.tipo] = {tipo:p.tipo, precio:p.precio, count:0};
      porTipo[p.tipo].count++;
    });

    _pinesDisponibles = pins;

    // Render de tarjetas (por tipo)
    var html = '';
    Object.keys(porTipo).forEach(function(k){
      var t = porTipo[k];
      html += '<div class="lkpln-wrap"><div class="lkpln">'
        + '<div class="lkpln-l">'
        + '<div class="lkpln-ico" style="background:rgba(255,204,0,.1);border:1px solid rgba(255,204,0,.28)">🎟️</div>'
        + '<div><div class="lkpln-name">'+t.tipo+'</div><div class="lkpln-meta">'+t.count+' disponibles</div></div>'
        + '</div>'
        + '<div class="lkpln-r"><div class="lkpln-price" style="color:#ffcc00">$'+t.precio+'</div><div class="lkpln-cur">MXN</div></div>'
        + '</div></div>';
    });
    grid.innerHTML = html;

    // Llenar el selector (un option por tipo)
    if(sel){
      var opts = '';
      Object.keys(porTipo).forEach(function(k){
        var t = porTipo[k];
        opts += '<option value="'+t.tipo+'|'+t.precio+'">'+t.tipo+' — $'+t.precio+' MX ('+t.count+' disp.)</option>';
      });
      sel.innerHTML = opts;
    }
    _updatePinSaldo();
    if(typeof _updatePinTotal==='function') _updatePinTotal();
  }).catch(function(e){
    console.error('[PINES] Error:', e);
    grid.innerHTML = '<div style="text-align:center;padding:1.5rem;color:var(--muted);font-size:.82rem">Pronto más pines disponibles aquí ⏳</div>';
    var sel=document.getElementById('pin-plan'); if(sel) sel.innerHTML='<option value="">Sin stock por ahora</option>';
  });
}

function _updatePinSaldo(){
  var s = authSession ? fmt(authSession.saldo||0) : fmt(0);
  ['pin-saldo-val','pin-api-saldo'].forEach(function(id){ var el=document.getElementById(id); if(el) el.textContent=s; });
}

// Muestra los pines comprados en lista, cada uno con botón de copiar
function _mostrarPinesEntregados(pines, tipo){
  var box = document.getElementById('pin-entregado');
  if(!box) return;

  // Guardar todos los códigos para el botón "copiar todos"
  _ultimoPin = pines.map(function(p){ return p.codigo; }).join('\n');

  var lista = '';
  pines.forEach(function(p, i){
    lista += '<div style="display:flex;align-items:center;gap:.5rem;background:rgba(0,230,118,.06);border:1px solid rgba(0,230,118,.25);border-radius:10px;padding:.7rem .85rem;margin-bottom:.5rem">'
      + '<div style="flex:1;min-width:0"><div style="font-size:.62rem;color:var(--muted);text-transform:uppercase">PIN '+(i+1)+'</div>'
      + '<div id="pincode-'+i+'" style="font-family:Oxanium;font-weight:700;font-size:.92rem;color:#fff;word-break:break-all">'+p.codigo+'</div></div>'
      + '<button onclick="_copiarUnPin(\''+String(p.codigo).replace(/'/g,"") +'\',this)" style="flex-shrink:0;background:rgba(0,230,118,.15);border:1px solid rgba(0,230,118,.4);color:#25d366;border-radius:8px;padding:.5rem .8rem;font-family:Poppins;font-weight:700;font-size:.72rem;cursor:pointer">Copiar</button>'
      + '</div>';
  });

  box.innerHTML = '<div style="font-size:1.8rem;margin-bottom:.4rem;text-align:center">\u2705</div>'
    + '<div style="font-family:Oxanium;font-weight:800;font-size:1rem;color:#25d366;text-align:center;margin-bottom:.25rem">'+pines.length+' PIN(es) de '+tipo+'</div>'
    + '<div style="font-size:.72rem;color:var(--muted);text-align:center;margin-bottom:1rem">Copia cada uno y canjealo en redeempins.com</div>'
    + lista
    + '<button onclick="copiarPin()" style="width:100%;margin-top:.5rem;padding:.7rem;background:rgba(0,230,118,.12);border:1px solid rgba(0,230,118,.3);color:#25d366;border-radius:9px;font-family:Poppins;font-weight:700;font-size:.8rem;cursor:pointer">\u{1F4CB} Copiar todos</button>';

  box.style.display = 'block';
  box.scrollIntoView({behavior:'smooth',block:'center'});
}

// Copiar un PIN individual
function _copiarUnPin(codigo, btn){
  function ok(){ if(btn){ var t=btn.textContent; btn.textContent='\u2713 Copiado'; setTimeout(function(){ btn.textContent=t; },1500); } }
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(codigo).then(ok).catch(function(){ _copiarFallback(codigo); ok(); });
  } else { _copiarFallback(codigo); ok(); }
}

function copiarPin(){
  // Copiar el contenido del recuadro (PIN o lista de IDs)
  var texto = _ultimoPin;
  var codEl = document.getElementById('pin-codigo');
  if((!texto || texto==='') && codEl) texto = codEl.textContent;
  if(!texto) return;

  // Método 1: API moderna
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(texto).then(function(){
      showToast('✓ Copiado');
    }).catch(function(){
      _copiarFallback(texto);
    });
  } else {
    _copiarFallback(texto);
  }
}

// Respaldo para móviles/navegadores viejos
function _copiarFallback(texto){
  try {
    var ta = document.createElement('textarea');
    ta.value = texto;
    ta.style.position = 'fixed';
    ta.style.top = '0';
    ta.style.left = '0';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, texto.length); // importante en iOS
    var ok = document.execCommand('copy');
    document.body.removeChild(ta);
    showToast(ok ? '✓ Copiado' : 'Selecciona y copia manualmente');
  } catch(e){
    showToast('No se pudo copiar. Selecciona el texto manualmente.');
  }
}

// Cargar pines al abrir la página
var _origGoPagePines = goPage;
goPage = function(id){
  _origGoPagePines(id);
  if(id === 'pines') setTimeout(function(){ loadPinesMayoreo(); renderPinesAPI(); _updatePinSaldo(); }, 300);
};


// ═══ MODO API: comprar PIN via Recargas América (a través del Portero seguro) ═══
// PEGA AQUÍ la URL de tu Edge Function de Supabase (Paso 3 de la guía):
var PORTERO_URL = 'https://pnotsqsudqpwqzssevig.supabase.co/functions/v1/bright-processor';
// La "anon key" pública de Supabase (segura de exponer). Si tu supabase_integration.js
// ya la define en otra variable, se usa esa. Si no, pégala aquí entre las comillas:
// ⬇️ PEGA AQUÍ tu anon key PÚBLICA de Supabase (Settings → API → anon public)
// Es pública y segura de compartir. Ejemplo: 'eyJhbGciOiJIUzI1...'
var SUPABASE_ANON = 'PEGA_TU_ANON_KEY_AQUI';
// (si dejas 'PEGA_TU_ANON_KEY_AQUI', la busca automaticamente en supabase.js)
function _esKeyValida(v){
  if(typeof v !== 'string' || v.length < 20) return false;
  // Formato JWT antiguo (eyJ...) o formato nuevo (sb_publishable_... / sb_secret_...)
  return v.indexOf('eyJ') === 0 || v.indexOf('sb_publishable_') === 0 || v.indexOf('sb_') === 0;
}

function _detectarAnonKey(){
  // 1) Nombres de variable conocidos (SB_KEY es el que usa supabase.js de CiberStore)
  var nombres = ['SB_KEY','SUPABASE_ANON_KEY','supabaseAnonKey','SUPABASE_KEY','SB_ANON','ANON_KEY',
                 'SUPABASE_ANON_PUBLIC','sbKey','sbAnonKey','SUPABASE_PUBLIC_KEY','supabaseKey','SUPA_KEY'];
  for(var i=0;i<nombres.length;i++){
    try{
      var v = window[nombres[i]];
      if(_esKeyValida(v)) return v;
    }catch(e){}
  }
  // 2) Escanear globales por si cambia el nombre
  try{
    for(var g in window){
      try{
        if(_esKeyValida(window[g])) return window[g];
      }catch(e){}
    }
  }catch(e){}
  return '';
}

if(SUPABASE_ANON === 'PEGA_TU_ANON_KEY_AQUI'){
  SUPABASE_ANON = _detectarAnonKey();
  if(!SUPABASE_ANON){
    console.error('[SALDO] No se encontro la anon key. El sistema de saldo atomico no funcionara.');
  } else {
    console.log('[SALDO] Anon key detectada correctamente.');
  }
}

// Compra un PIN por API. productId = id del producto en Recargas América.
// precioLocal = lo que le cobras al cliente en TU web (en pesos).

// Busca el código PIN en la respuesta sin importar cómo venga anidado
function _extraerPin(data){
  if(!data) return '';

  // Campos a IGNORAR (control, NO son el codigo de canje)
  var ignorar = ['transaction_id','id','order_id','amount_charged','amount','price','currency','status','success','sandbox','quantity','product_id','reference','fecha','date','created_at','http_status','message','name','sku','type','product'];

  // El campo que SE CANJEA (prioridad). redeempins usa un solo codigo/key.
  var clavesCodigo = ['key','pin','code','codigo','serial','voucher','redemption_code','pin_code','coupon','clave','numero','pins','codes'];

  var encontrado = '';

  function buscar(obj, depth){
    if(depth > 6 || obj == null || encontrado) return;
    if(Array.isArray(obj)){ obj.forEach(function(x){ buscar(x, depth+1); }); return; }
    if(typeof obj === 'object'){
      // primero buscar en los campos de codigo conocidos
      for(var i=0;i<clavesCodigo.length && !encontrado;i++){
        var v = obj[clavesCodigo[i]];
        if(v != null && (typeof v === 'string' || typeof v === 'number')){
          encontrado = String(v).trim();
          return;
        }
      }
      // si no, seguir buscando en sub-objetos (ignorando campos de control)
      for(var k in obj){
        if(encontrado) return;
        if(obj.hasOwnProperty(k) && ignorar.indexOf(k.toLowerCase()) < 0 && typeof obj[k] === 'object'){
          buscar(obj[k], depth+1);
        }
      }
    }
  }
  buscar(data, 0);

  return encontrado || '';
}

function comprarPinAPI(productId, precioLocal, nombreProducto){
  if(!authSession){ showToast('Inicia sesion'); setTimeout(showAuthModal,600); return; }

  var saldo = authSession.saldo || 0;
  if(saldo < precioLocal){
    showToast('Saldo insuficiente ($'+saldo.toLocaleString('es-MX')+' MX). Recarga tu cuenta.');
    return;
  }

  showToast('Procesando compra...', 2000);

  // Llamar al PORTERO (Edge Function), nunca a Recargas América directo
  var _headers = { 'Content-Type': 'application/json' };
  if(SUPABASE_ANON){ _headers['Authorization'] = 'Bearer '+SUPABASE_ANON; _headers['apikey'] = SUPABASE_ANON; }
  fetch(PORTERO_URL, {
    method: 'POST',
    headers: _headers,
    body: JSON.stringify({ product_id: productId, quantity: 1 })
  }).then(function(r){ return r.json(); }).then(function(res){
    if(!res || res.success === false){
      showToast('Error: '+((res&&res.error)||'no se pudo comprar')+'. Contacta al admin.', 4000);
      return;
    }

    // Buscar el PIN/serial en la respuesta de Recargas América
    var fuente = res.ra_response || res.data || res;
    var pin = _extraerPin(fuente);
    // Si de plano no se encontró nada, guardar la respuesta para soporte (sin mostrarla fea)
    if(!pin || pin === 'Ver detalle en Mis Compras'){
      console.log('[PIN API] Sin datos claros:', JSON.stringify(res));
      pin = 'Codigo recibido. Si no lo ves completo, contacta al admin con tu numero de pedido.';
    }

    // Descontar saldo del cliente en TU web
    var ord = getNextOrder();
    addSpend(precioLocal, 'PIN API: '+(nombreProducto||'Producto')+' - '+pin+' - Pedido #'+ord);
    if(typeof tgNotifyPurchase==='function') tgNotifyPurchase(authSession.username, 'PIN API '+(nombreProducto||''), precioLocal, ord);

    // Mostrar el PIN al cliente
    _ultimoPin = pin;
    var box = document.getElementById('pin-entregado');
    var cod = document.getElementById('pin-codigo');
    if(cod) cod.textContent = pin;
    if(box){ box.style.display='block'; box.scrollIntoView({behavior:'smooth',block:'center'}); }

    var msg = res.sandbox ? '✓ (PRUEBA) PIN generado' : '✓ PIN entregado!';
    showToast(msg, 3000);
  }).catch(function(e){
    console.error('[PIN API] Error:', e);
    showToast('Error de conexión. Contacta al admin por WhatsApp (no se te cobró).', 4000);
  });
}


// ═══ PRODUCTOS PIN POR API (Recargas América) ═══
// product_id = ID en Recargas América | precio = tu precio de venta en MXN
var PINES_API = [
  {product_id:5, nombre:'Free Fire 100 Diamantes +10 Bono',  precio:15,  diamantes:'110'},
  {product_id:3, nombre:'Free Fire 310 Diamantes +31 Bono',  precio:55,  diamantes:'341'},
  {product_id:6, nombre:'Free Fire 520 Diamantes +52 Bono',  precio:75,  diamantes:'572'},
  {product_id:1, nombre:'Free Fire 1060 Diamantes +106 Bono', precio:140, diamantes:'1,166'},
  {product_id:2, nombre:'Free Fire 2180 Diamantes +218 Bono', precio:270, diamantes:'2,398'},
  {product_id:4, nombre:'Free Fire 5600 Diamantes +560 Bono', precio:665, diamantes:'6,160'}
];

function renderPinesAPI(){
  var cont = document.getElementById('pines-api-grid');
  if(!cont) return;
  var html = '';
  PINES_API.forEach(function(p){
    html += '<div class="lkpln-wrap"><div class="lkpln">'
      + '<div class="lkpln-l">'
      + '<div class="lkpln-ico" style="background:rgba(34,211,238,.1);border:1px solid rgba(34,211,238,.28)">\uD83D\uDC8E</div>'
      + '<div><div class="lkpln-name">'+p.diamantes+' <span>diamantes</span></div><div class="lkpln-meta">Entrega automática por API</div></div>'
      + '</div>'
      + '<div class="lkpln-r" style="display:flex;flex-direction:column;align-items:flex-end;gap:.4rem">'
      + '<div><div class="lkpln-price" style="color:#22d3ee">$'+p.precio+'</div><div class="lkpln-cur">MXN</div></div>'
      + '<button onclick="comprarPinAPI('+p.product_id+','+p.precio+',\''+p.nombre.replace(/'/g,"")+'\')" style="padding:.35rem .8rem;background:linear-gradient(90deg,#128c3e,#25d366);border:none;border-radius:8px;color:#fff;font-family:Poppins,sans-serif;font-weight:800;font-size:.72rem;cursor:pointer;white-space:nowrap">Comprar</button>'
      + '</div>'
      + '</div></div>';
  });
  cont.innerHTML = html;
}


// ═══ TEMPORAL: ver los product_id reales de Recargas América ═══
function verProductosReales(){
  var _headers = { 'Content-Type': 'application/json' };
  if(SUPABASE_ANON){ _headers['Authorization'] = 'Bearer '+SUPABASE_ANON; _headers['apikey'] = SUPABASE_ANON; }
  fetch(PORTERO_URL, {
    method: 'POST',
    headers: _headers,
    body: JSON.stringify({ action: 'listar' })
  }).then(function(r){ return r.json(); }).then(function(res){
    var box = document.getElementById('pin-entregado');
    var cod = document.getElementById('pin-codigo');
    if(cod) cod.textContent = 'PRODUCTOS REALES:\n' + JSON.stringify(res.productos || res, null, 2);
    if(box){ box.style.display='block'; box.scrollIntoView({behavior:'smooth'}); }
  }).catch(function(e){
    showToast('Error: '+e.message);
  });
}


// Seleccionar todo el texto del recuadro del PIN al tocarlo (facilita copiar manual)
function _seleccionarPin(el){
  try {
    var range = document.createRange();
    range.selectNodeContents(el);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  } catch(e){}
}


// ═══ Solicitar acceso a la API de revendedores (WhatsApp) ═══
function solicitarAccesoAPI(){
  var nombre = ((document.getElementById('api-reg-nombre')||{}).value||'').trim();
  var email = ((document.getElementById('api-reg-email')||{}).value||'').trim();
  var tel = ((document.getElementById('api-reg-tel')||{}).value||'').trim();

  if(!nombre){ showToast('Ingresa tu nombre o tienda'); return; }
  if(!email){ showToast('Ingresa tu correo'); return; }
  if(!tel){ showToast('Ingresa tu WhatsApp'); return; }

  var msg = 'Hola CiberStore! Quiero acceso a la API de REVENDEDORES.%0A%0A'
    + '👤 Nombre/Tienda: ' + encodeURIComponent(nombre) + '%0A'
    + '📧 Correo: ' + encodeURIComponent(email) + '%0A'
    + '📱 WhatsApp: ' + encodeURIComponent(tel) + '%0A%0A'
    + 'Quedo atento para recibir mi API Key y recargar saldo. Gracias!';

  window.open('https://wa.me/12894273983?text=' + msg, '_blank');
  showToast('Abriendo WhatsApp...', 2000);
}


// ═══ MODAL RECARGA BINANCE ═══
var _bncSel = null; // {paga, recibe}

function selBinance(paga, recibe, el){
  _bncSel = { paga: paga, recibe: recibe, custom: false };
  document.querySelectorAll('.bnc-card').forEach(function(c){ c.classList.remove('sel'); });
  if(el) el.classList.add('sel');
  var inp = document.getElementById('bnc-custom-input'); if(inp) inp.value = '';
  _bncMostrarResumen();
}

function selBinanceCustom(el){
  var inp = document.getElementById('bnc-custom-input');
  var val = parseFloat((inp||{}).value) || 0;
  document.querySelectorAll('.bnc-card').forEach(function(c){ c.classList.remove('sel'); });
  if(el) el.classList.add('sel');
  if(val > 0){
    // paga = USDT, recibe = USDT * USD_MXN en MXN (sin bono)
    _bncSel = { paga: val, recibe: Math.round(val * USD_MXN), custom: true };
    _bncMostrarResumen();
  } else {
    if(inp) inp.focus();
  }
}

function onBncCustom(){
  var inp = document.getElementById('bnc-custom-input');
  var val = parseFloat((inp||{}).value) || 0;
  document.querySelectorAll('.bnc-card').forEach(function(c){ c.classList.remove('sel'); });
  var card = document.getElementById('bnc-custom-card');
  if(card) card.classList.add('sel');
  if(val > 0){
    _bncSel = { paga: val, recibe: Math.round(val * USD_MXN), custom: true };
    _bncMostrarResumen();
  } else {
    _bncSel = null;
    var r = document.getElementById('bnc-resumen'); if(r) r.style.display = 'none';
  }
}

function _bncMostrarResumen(){
  if(!_bncSel) return;
  var r = document.getElementById('bnc-resumen');
  var rec = document.getElementById('bnc-resumen-recibe');
  var det = document.getElementById('bnc-resumen-detalle');
  if(r) r.style.display = 'block';
  if(rec) rec.textContent = fmt(_bncSel.recibe);
  if(det){
    if(_bncSel.custom){
      det.textContent = 'Pagas ' + _bncSel.paga.toLocaleString('es-MX',{maximumFractionDigits:2}) + ' USDT (personalizado, sin bono)';
    } else {
      var bonoMxn = _bncSel.recibe - Math.round(_bncSel.paga * USD_MXN);
      det.textContent = 'Pagas ' + _bncSel.paga + ' USDT' + (bonoMxn>0 ? (' + '+fmt(bonoMxn)+' de bono') : '');
    }
  }
}

function confirmarBinance(){
  if(!_bncSel || _bncSel.paga <= 0){
    showToast('Selecciona un monto primero');
    return;
  }
  var user = (authSession && authSession.username) ? authSession.username : 'Cliente';
  var msg = 'Hola CiberStore! Quiero RECARGAR SALDO por Binance Pay.%0A%0A'
    + 'Usuario: ' + encodeURIComponent(user) + '%0A'
    + 'Pago: $' + _bncSel.paga.toLocaleString('es-MX') + ' MXN%0A'
    + 'Recibo: $' + _bncSel.recibe.toLocaleString('es-MX') + ' MXN'
    + (_bncSel.custom ? '' : ' (con bono)') + '%0A%0A'
    + 'Ya transferi a Binance ID 1106987175. Adjunto mi comprobante.';
  _notifTelegramTexto('binance');
  window.open('https://wa.me/12894273983?text=' + msg, '_blank');
}


// ═══ MODALES DE PAGO: Zelle + formularios ═══
function openZelleModal(monto){var el=document.getElementById('modal-zelle');if(el) el.classList.add('show'); var mi=document.getElementById('zelle-monto'); if(mi && monto){ mi.value=monto; if(typeof calcZelleConversion==='function') calcZelleConversion(); }}
function closeZelleModal(){var el=document.getElementById('modal-zelle');if(el) el.classList.remove('show');}

function copyStoriClabe(){
  _copiarTexto('646180402332964686', 'CLABE copiada');
}
function copyZelle(){
  _copiarTexto('14407050630', 'Numero Zelle copiado');
}

// Helper de copiado con respaldo móvil
function _copiarTexto(texto, msg){
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(texto).then(function(){ showToast('✓ '+(msg||'Copiado')); }).catch(function(){ _copiarFallbackTxt(texto,msg); });
  } else { _copiarFallbackTxt(texto,msg); }
}
function _copiarFallbackTxt(texto,msg){
  try{
    var ta=document.createElement('textarea'); ta.value=texto;
    ta.style.position='fixed'; ta.style.opacity='0'; document.body.appendChild(ta);
    ta.focus(); ta.select(); ta.setSelectionRange(0,texto.length);
    document.execCommand('copy'); document.body.removeChild(ta);
    showToast('✓ '+(msg||'Copiado'));
  }catch(e){ showToast('Copia manual: '+texto); }
}

// Mostrar el formulario dentro del modal al presionar el botón
function mostrarFormPago(metodo){
  var form = document.getElementById(metodo+'-form');
  var btn = document.getElementById(metodo+'-show-form-btn');
  if(form){ form.style.display='block'; form.scrollIntoView({behavior:'smooth',block:'center'}); }
  if(btn){ btn.style.display='none'; }
}

// Enviar el comprobante por WhatsApp según el método
function enviarPagoWA(metodo){
  var user = (authSession && authSession.username) ? authSession.username : 'Cliente';
  var msg = '';

  if(metodo === 'stori'){
    var monto = ((document.getElementById('stori-monto')||{}).value||'').trim();
    var ref = ((document.getElementById('stori-ref')||{}).value||'').trim();
    if(!monto){ showToast('Escribe el monto transferido'); return; }
    msg = 'Hola CiberStore! Recargue por TRANSFERENCIA BANCARIA.%0A%0A'
      + 'Usuario: ' + encodeURIComponent(user) + '%0A'
      + 'Monto: $' + encodeURIComponent(monto) + ' MXN%0A'
      + (ref ? 'Referencia: ' + encodeURIComponent(ref) + '%0A' : '')
      + '%0AAdjunto mi comprobante.';
  } else if(metodo === 'zelle'){
    var montoZ = ((document.getElementById('zelle-monto')||{}).value||'').trim();
    var nombreZ = ((document.getElementById('zelle-nombre')||{}).value||'').trim();
    if(!montoZ){ showToast('Escribe el monto enviado'); return; }
    var mxnW = _zelleMXN(montoZ);
    msg = 'Hola CiberStore! Recargue por ZELLE (USA).%0A%0A'
      + 'Usuario: ' + encodeURIComponent(user) + '%0A'
      + 'Envie: $' + encodeURIComponent(montoZ) + ' USD%0A'
      + 'Equivale a: $' + mxnW.toLocaleString('es-MX') + ' MXN (menos 6 USD comision, TC 17.5)%0A'
      + (nombreZ ? 'Enviado por: ' + encodeURIComponent(nombreZ) + '%0A' : '')
      + '%0AAdjunto mi comprobante.';
  }

  window.open('https://wa.me/12894273983?text=' + msg, '_blank');
}


// ═══ Colapsar/expandir secciones del menú lateral ═══
function toggleNavGroup(header){
  header.classList.toggle('collapsed');
  var group = header.nextElementSibling;
  if(group && group.classList.contains('sb-group')){
    group.classList.toggle('collapsed');
  }
}


// ═══ RETIRAR FONDOS (revendedores) ═══
var _retMetodo = 'binance';

function selRetMetodo(metodo, el){
  _retMetodo = metodo;
  document.querySelectorAll('.ret-metodo').forEach(function(c){ c.classList.remove('sel'); });
  if(el) el.classList.add('sel');
  var label = document.getElementById('ret-dato-label');
  var input = document.getElementById('ret-destino');
  if(metodo === 'binance'){
    if(label) label.textContent = 'Correo de Binance Pay o ID';
    if(input) input.placeholder = 'usuario@correo.com o ID de Binance';
  } else {
    if(label) label.textContent = 'Numero o correo de Zelle';
    if(input) input.placeholder = '+1 (___) ___-____ o correo';
  }
}

function calcRetiro(){
  var monto = parseFloat((document.getElementById('ret-monto')||{}).value) || 0;
  var box = document.getElementById('ret-resumen');
  var eq = document.getElementById('ret-equiv');
  if(monto <= 0){
    if(box) box.style.display='none';
    if(eq) eq.style.display='none';
    return;
  }

  var rate = RATES[_retMoneda] || 1;
  var sym = CUR_SYM[_retMoneda] || '$';
  var suf = CUR_SUF[_retMoneda] || '';

  // Convertir a MXN (base) para validar y para el mensaje
  var montoMxn = monto / rate;
  var comision = monto * RETIRO_COMISION;
  var recibe = monto - comision;

  if(box) box.style.display='block';
  var m=document.getElementById('ret-r-monto'); if(m) m.textContent=sym+monto.toLocaleString('es-MX',{maximumFractionDigits:2})+suf;
  var c=document.getElementById('ret-r-comision'); if(c) c.textContent='-'+sym+comision.toLocaleString('es-MX',{maximumFractionDigits:2});
  var f=document.getElementById('ret-r-final'); if(f) f.textContent=sym+recibe.toLocaleString('es-MX',{maximumFractionDigits:2})+suf;

  // Equivalente en MXN si eligio otra moneda
  var rowMxn=document.getElementById('ret-r-mxn');
  var valMxn=document.getElementById('ret-r-mxn-val');
  if(_retMoneda !== 'MXN'){
    if(rowMxn) rowMxn.style.display='flex';
    if(valMxn) valMxn.textContent='$'+montoMxn.toLocaleString('es-MX',{maximumFractionDigits:2})+' MXN';
    if(eq){
      eq.style.display='block';
      eq.textContent = '\u2248 $'+montoMxn.toLocaleString('es-MX',{maximumFractionDigits:2})+' MXN  (1 USD = '+USD_MXN+' MXN)';
    }
  } else {
    if(rowMxn) rowMxn.style.display='none';
    if(eq) eq.style.display='none';
  }
}

// Moneda elegida para el retiro
var _retMoneda = 'MXN';

function selRetMoneda(cur){
  _retMoneda = cur;
  ['MXN','USD','EUR','ARS','PEN'].forEach(function(c){
    var b = document.getElementById('retcur-'+c);
    if(!b) return;
    if(c === cur){
      b.style.background='linear-gradient(90deg,#128c3e,#25d366)';
      b.style.border='none';
      b.style.color='#fff';
    } else {
      b.style.background='rgba(255,255,255,.04)';
      b.style.border='1px solid var(--border)';
      b.style.color='var(--muted)';
    }
  });
  // Actualizar etiqueta y placeholder
  var lbl = document.getElementById('ret-monto-label');
  if(lbl) lbl.textContent = 'Monto a retirar ('+cur+')';
  var inp = document.getElementById('ret-monto');
  if(inp){
    var minCur = 100 * (RATES[cur]||1);
    inp.placeholder = 'Minimo: '+(CUR_SYM[cur]||'$')+minCur.toLocaleString('es-MX',{maximumFractionDigits:2})+(CUR_SUF[cur]||'');
  }
  calcRetiro();
}

// URL de la Edge Function de retiros
var NOTIF_RETIRO_URL = 'https://pnotsqsudqpwqzssevig.supabase.co/functions/v1/notif-retiro';
var _enviandoRetiro = false;

function solicitarRetiro(){
  if(!authSession){ showToast('Inicia sesion'); setTimeout(showAuthModal,600); return; }
  if(_enviandoRetiro){ return; }

  var destino = ((document.getElementById('ret-destino')||{}).value||'').trim();
  var monto = parseFloat((document.getElementById('ret-monto')||{}).value) || 0;

  if(monto <= 0){ showToast('Escribe el monto a retirar'); return; }

  var rate = RATES[_retMoneda] || 1;
  var montoMxn = monto / rate;

  if(montoMxn < 100){
    showToast('El minimo de retiro es $100 MXN');
    return;
  }
  if(!destino){ showToast('Escribe tu '+(_retMetodo==='binance'?'correo/ID de Binance':'dato de Zelle')); return; }

  var saldo = authSession.saldo || 0;
  if(montoMxn > saldo){
    showToast('No tienes saldo suficiente. Tienes '+fmt(saldo));
    return;
  }

  var comisionMxn = montoMxn * RETIRO_COMISION;
  var recibeMxn = montoMxn - comisionMxn;
  var user = authSession.username || 'Revendedor';
  var metodoNom = _retMetodo === 'binance' ? 'Binance Pay' : 'Zelle';

  _enviandoRetiro = true;
  var btnR = event && event.target ? event.target : null;
  if(btnR){ btnR.disabled = true; btnR.innerHTML = 'Enviando...'; }

  fetch(NOTIF_RETIRO_URL, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({
      tipo: 'retiro',
      username: user,
      monto_mxn: Math.round(montoMxn*100)/100,
      moneda: _retMoneda,
      monto_moneda: monto,
      comision_mxn: Math.round(comisionMxn*100)/100,
      recibe_mxn: Math.round(recibeMxn*100)/100,
      metodo: metodoNom,
      destino: destino
    })
  }).then(function(r){ return r.json(); }).then(function(res){
    _enviandoRetiro = false;
    if(btnR){ btnR.disabled=false; btnR.innerHTML='\uD83D\uDE80 SOLICITAR RETIRO'; }
    if(res && res.success){
      _mostrarRetiroEnviado(monto, montoMxn, recibeMxn, metodoNom, destino);
    } else {
      showToast('No se pudo enviar: '+((res&&res.error)||'error'), 4000);
    }
  }).catch(function(){
    _enviandoRetiro = false;
    if(btnR){ btnR.disabled=false; btnR.innerHTML='\uD83D\uDE80 SOLICITAR RETIRO'; }
    showToast('Error de conexion. Intenta de nuevo.', 3500);
  });
}

function _mostrarRetiroEnviado(monto, montoMxn, recibeMxn, metodo, destino){
  var ahora = new Date();
  var fecha = ahora.toLocaleDateString('es-MX',{day:'2-digit',month:'2-digit',year:'numeric'});
  var hora = ahora.toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'});
  var sym = CUR_SYM[_retMoneda] || '$';
  var suf = CUR_SUF[_retMoneda] || '';

  var ov = document.getElementById('recibo-retiro-ov');
  if(ov) ov.remove();
  ov = document.createElement('div');
  ov.id = 'recibo-retiro-ov';
  ov.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.82);display:flex;align-items:center;justify-content:center;padding:1.2rem;overflow-y:auto';
  ov.onclick = function(e){ if(e.target===ov) ov.remove(); };
  document.body.appendChild(ov);

  var cont = document.createElement('div');
  cont.style.cssText = 'max-width:420px;width:100%';
  ov.appendChild(cont);

  cont.innerHTML =
    '<div style="background:linear-gradient(160deg,#0a0e14,#0a0f14);border:2px solid rgba(37,211,102,.35);border-radius:18px;padding:1.75rem 1.25rem;text-align:center">'
    + '<div style="font-size:2.8rem;margin-bottom:.5rem">\uD83D\uDCB8</div>'
    + '<div style="font-family:Oxanium;font-weight:900;font-size:1.2rem;color:#25d366;margin-bottom:.35rem;letter-spacing:.5px">SOLICITUD ENVIADA</div>'
    + '<div style="font-size:.8rem;color:var(--muted);margin-bottom:1.35rem">Estamos revisando tu retiro</div>'
    + '<div style="background:rgba(0,0,0,.25);border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:1rem;text-align:left">'
    +   _filaRecibo('\uD83D\uDCB0 Solicitas', sym+monto.toLocaleString('es-MX',{maximumFractionDigits:2})+suf)
    +   (_retMoneda!=='MXN' ? _filaRecibo('\uD83D\uDCB1 En MXN', '$'+montoMxn.toLocaleString('es-MX',{maximumFractionDigits:2})+' MXN') : '')
    +   _filaRecibo('\u2705 Recibes', '$'+recibeMxn.toLocaleString('es-MX',{maximumFractionDigits:2})+' MXN')
    +   _filaRecibo('\uD83C\uDFE6 Metodo', metodo)
    +   _filaRecibo('\uD83D\uDCE7 Destino', destino)
    +   _filaRecibo('\uD83D\uDCC5 Fecha', fecha+' \u00B7 '+hora, true)
    + '</div>'
    + '<div style="background:rgba(255,180,60,.08);border:1px solid rgba(255,180,60,.25);border-radius:10px;padding:.75rem .9rem;margin-top:1rem;font-size:.73rem;color:#22d3ee;line-height:1.55">\u23F3 Procesamos los retiros en <b>24-48 hrs habiles</b>. El saldo se descuenta cuando aprobamos la solicitud.</div>'
    + '<button onclick="var o=document.getElementById(\'recibo-retiro-ov\'); if(o) o.remove();" style="width:100%;margin-top:1.25rem;padding:.9rem;background:linear-gradient(135deg,#0e7490,#f0b90b);color:#fff;border:none;border-radius:12px;font-family:Poppins;font-weight:700;font-size:.9rem;cursor:pointer">Entendido</button>'
    + '</div>';
}

// Actualizar el saldo mostrado en la página de retiro
function _updateRetiroSaldo(){
  var el = document.getElementById('retiro-saldo');
  if(el && authSession) el.textContent = fmt(authSession.saldo||0);
}


// ═══ ENVIAR COMPROBANTE DE RECARGA A TELEGRAM ═══
// URL de la Edge Function que reenvía a tu canal de Telegram
var NOTIF_RECARGA_URL = 'https://pnotsqsudqpwqzssevig.supabase.co/functions/v1/bright-task';

var _enviandoComprobante = false;
function enviarComprobante(metodo){
  // Candado: evitar envios dobles/triples
  if(_enviandoComprobante){
    showToast('\u23F3 Tu comprobante ya se esta enviando, espera...', 3000);
    return;
  }
  var fotoInput, monto, extra, metodoNom;
  var user = (authSession && authSession.username) ? authSession.username : 'Cliente';

  if(metodo === 'stori'){
    fotoInput = document.getElementById('stori-foto');
    monto = ((document.getElementById('stori-monto')||{}).value||'').trim();
    var ref = ((document.getElementById('stori-ref')||{}).value||'').trim();
    extra = ref ? ('Referencia: '+ref) : '';
    metodoNom = 'Transferencia Bancaria';
    if(!monto){ showToast('Escribe el monto transferido'); return; }
  } else if(metodo === 'zelle'){
    fotoInput = document.getElementById('zelle-foto');
    var usdZ = ((document.getElementById('zelle-monto')||{}).value||'').trim();
    var nom = ((document.getElementById('zelle-nombre')||{}).value||'').trim();
    var mxnZ = _zelleMXN(usdZ);
    monto = '$'+usdZ+' USD = $'+mxnZ.toLocaleString('es-MX')+' MXN';
    extra = (nom ? ('Enviado por: '+nom+' | ') : '') + 'Zelle (-6 USD comision, TC 17.5)';
    metodoNom = 'Zelle (USA)';
    if(!usdZ){ showToast('Escribe el monto enviado en USD'); return; }
    if(parseFloat(usdZ) <= 6){ showToast("El monto debe ser mayor a 6 USD (comision)"); return; }
  } else if(metodo === 'binance'){
    fotoInput = document.getElementById('binance-foto');
    // OBLIGATORIO: debe elegir un paquete o escribir un monto
    if(!_bncSel || !_bncSel.paga || _bncSel.paga <= 0){
      showToast('Selecciona el paquete o escribe el monto que enviaste');
      var mb = document.getElementById('binance-montos');
      if(mb) mb.scrollIntoView({behavior:'smooth', block:'center'});
      return;
    }
    monto = 'Paga '+_bncSel.paga+' USDT / Recibe $'+_bncSel.recibe+' MXN';
    extra = 'Binance ID: 1106987175';
    metodoNom = 'Binance Pay';
  }

  var file = fotoInput && fotoInput.files && fotoInput.files[0];
  if(!file){
    showToast('\u26A0 Debes adjuntar la foto de tu comprobante');
    if(fotoInput){ fotoInput.scrollIntoView({behavior:'smooth', block:'center'}); fotoInput.style.border='2px solid #ff6b6b'; setTimeout(function(){ fotoInput.style.border=''; }, 2500); }
    return;
  }

  _enviandoComprobante = true;
  // Deshabilitar visualmente los botones de enviar
  document.querySelectorAll('button[onclick*="enviarComprobante"]').forEach(function(b){
    b.disabled = true; b.style.opacity = '.5'; b.dataset.txtOriginal = b.textContent; b.textContent = 'Enviando...';
  });
  function _liberarEnvio(){
    _enviandoComprobante = false;
    document.querySelectorAll('button[onclick*="enviarComprobante"]').forEach(function(b){
      b.disabled = false; b.style.opacity = ''; if(b.dataset.txtOriginal) b.textContent = b.dataset.txtOriginal;
    });
  }
  showToast('Enviando comprobante...', 3000);

  // Calcular el monto a ACREDITAR (numero limpio en MXN) segun el metodo
  var montoAcreditar = 0;
  if(metodo === 'binance' && _bncSel){ montoAcreditar = _bncSel.recibe; }
  else if(metodo === 'zelle'){ montoAcreditar = _zelleMXN((document.getElementById('zelle-monto')||{}).value); }
  else { montoAcreditar = parseFloat((document.getElementById('stori-monto')||{}).value) || 0; }

  var reader = new FileReader();
  reader.onload = function(e){
    var fotoB64 = e.target.result;
    fetch(NOTIF_RECARGA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        usuario: user,
        username: user,
        metodo: metodoNom,
        monto: monto,
        monto_acreditar: montoAcreditar,
        extra: extra,
        foto_base64: fotoB64
      })
    }).then(function(r){ return r.json(); }).then(function(res){
      if(res && res.success){
        showToast('✓ Comprobante enviado! Te acreditaremos pronto.', 4000);
        // Cerrar el modal correspondiente
        if(metodo==='stori') closeStoriModal();
        else if(metodo==='zelle') closeZelleModal();
        else if(metodo==='binance') closeBinanceModal();
        // Mantener bloqueado 20s mas para evitar reenvios del mismo comprobante
        setTimeout(_liberarEnvio, 20000);
      } else {
        showToast('Error al enviar. Usa WhatsApp mejor.', 4000);
        console.error('[NOTIF] ', res);
        _liberarEnvio();
      }
    }).catch(function(err){
      showToast('Error de conexion. Usa WhatsApp mejor.', 4000);
      console.error('[NOTIF] ', err);
      _liberarEnvio();
    });
  };
  reader.onerror = function(){ showToast('No se pudo leer la foto'); _liberarEnvio(); };
  reader.readAsDataURL(file);
}


// ═══ Conversión Zelle USD → MXN (18 por USD, -6 USD comision: 3 Zelle + 3 banco) ═══
var ZELLE_TC = 17.5;      // tipo de cambio MXN por USD
var ZELLE_COMISION = 6;   // comision fija en USD (3 Zelle + 3 banco)

function calcZelleConversion(){
  var usd = parseFloat((document.getElementById('zelle-monto')||{}).value) || 0;
  var box = document.getElementById('zelle-conversion');
  if(usd <= 0){ if(box) box.style.display='none'; return; }

  var neto = Math.max(0, usd - ZELLE_COMISION);  // USD convertibles
  var mxn = neto * ZELLE_TC;                       // saldo en pesos

  if(box) box.style.display='block';
  var u=document.getElementById('zc-usd'); if(u) u.textContent='$'+usd+' USD';
  var n=document.getElementById('zc-neto'); if(n) n.textContent='$'+neto+' USD';
  var m=document.getElementById('zc-mxn'); if(m) m.textContent='$'+mxn.toLocaleString('es-MX')+' MXN';
}

// Devuelve el saldo MXN a acreditar por un pago Zelle en USD
function _zelleMXN(usd){
  var neto = Math.max(0, (parseFloat(usd)||0) - ZELLE_COMISION);
  return neto * ZELLE_TC;
}


// ═══ REGISTRAR PEDIDO + notificar a Telegram con botones (Edge Function) ═══
var NOTIF_PEDIDO_URL = 'https://pnotsqsudqpwqzssevig.supabase.co/functions/v1/notif-pedido';

// tipo: 'likes'|'diamantes'|'pin'|'honor'  | total: dias de progreso (0 si no aplica)
function registrarPedido(producto, cantidad, tipo, ffId, precio, progresoTotal){
  if(!authSession) return;
  try {
    fetch(NOTIF_PEDIDO_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: authSession.username,
        producto: producto || 'Pedido',
        cantidad: (cantidad != null ? String(cantidad) : ''),
        tipo: tipo || 'otro',
        ff_id: ffId || '',
        precio: precio || 0,
        progreso_total: progresoTotal || 0
      })
    }).catch(function(e){ console.warn('[PEDIDO] no se registro:', e); });
  } catch(e){ console.warn('[PEDIDO] error:', e); }
}

// Registrar pedido de Honor de Clan (arranca en dia 1/7 fijo)
function registrarPedidoHonor(producto, clanId, precio, clanNombre){
  if(!authSession) return;
  registrarPedido(producto || 'Honor de Clan', (clanNombre ? ('Clan: '+clanNombre) : ''), 'honor', clanId || '', precio || 0, 7);
}


// ═══ CARGAR PEDIDOS EN SEGUIMIENTO (Mis Compras) ═══
var ESTADO_LABEL = {
  pendiente:{t:'\uD83D\uDCE5 Recibido',c:'pe-pendiente',pct:15},
  procesando:{t:'\u2699\uFE0F Preparando',c:'pe-procesando',pct:50},
  enviado:{t:'\uD83D\uDE9A Enviado',c:'pe-enviado',pct:80},
  completado:{t:'\u2705 Entregado',c:'pe-completado',pct:100},
  rechazado:{t:'\u274C Rechazado',c:'pe-rechazado',pct:0}
};

function cargarPedidosSeguimiento(){
  var cont = document.getElementById('pedidos-seguimiento');
  if(!cont) return;
  if(!authSession){ cont.innerHTML='<div style="text-align:center;padding:1.5rem;color:var(--muted);font-size:.82rem">Inicia sesion para ver tus pedidos</div>'; return; }
  if(typeof sb === 'undefined' || !sb.get){ cont.innerHTML=''; return; }

  var qs = 'username=eq.'+encodeURIComponent(authSession.username)+'&order=created_at.desc&limit=20';
  sb.get('pedidos', qs).then(function(peds){
    if(!peds || !peds.length){
      cont.innerHTML='<div style="text-align:center;padding:1.5rem;color:var(--muted);font-size:.82rem">No tienes pedidos en seguimiento por ahora</div>';
      return;
    }
    var html='';
    peds.forEach(function(p){
      var est = ESTADO_LABEL[p.estado] || ESTADO_LABEL.pendiente;
      var tieneProgDias = (p.progreso_total && p.progreso_total > 0);

      html += '<div class="ped-card">';
      html += '<div class="ped-top">';
      html += '<div><div class="ped-prod">'+_esc(p.producto)+'</div><div class="ped-meta">'+(p.ff_id?('ID: '+_esc(p.ff_id)+' \u00b7 '):'')+_fechaPed(p.created_at)+'</div></div>';
      html += '<span class="ped-estado '+est.c+'">'+est.t+'</span>';
      html += '</div>';

      if(tieneProgDias && p.estado !== 'rechazado'){
        // Progreso por días (ej: likes 3/7)
        var actual = p.progreso_actual || 0;
        var total = p.progreso_total;
        var pct = Math.min(100, Math.round((actual/total)*100));

        // Calcular cantidad enviada (para likes: proporcional a los dias)
        var cantNum = parseInt(String(p.cantidad).replace(/[^0-9]/g,'')) || 0;
        var enviado = '';
        if(cantNum > 0 && (p.tipo === 'likes')){
          var yaEnviado = Math.round((actual/total) * cantNum);
          enviado = '<div style="display:flex;justify-content:space-between;font-size:.72rem;margin-bottom:.5rem"><span style="color:var(--muted)">Likes enviados</span><span style="color:#25d366;font-weight:700">'+yaEnviado.toLocaleString('es-MX')+' / '+cantNum.toLocaleString('es-MX')+'</span></div>';
        } else if(p.tipo === 'honor'){
          enviado = '<div style="display:flex;justify-content:space-between;font-size:.72rem;margin-bottom:.5rem"><span style="color:var(--muted)">Honor de clan</span><span style="color:#67e8f9;font-weight:700">Dia '+actual+' de '+total+'</span></div>';
        }

        html += '<div class="ped-prog-wrap">';
        html += enviado;
        html += '<div class="ped-prog-head"><span>Progreso de entrega</span><span style="color:#a5f3fc;font-weight:700">'+actual+'/'+total+' dias</span></div>';
        html += '<div class="ped-prog-bar"><div class="ped-prog-fill" style="width:'+pct+'%"></div></div>';
        // Puntitos por día
        html += '<div class="ped-prog-dots">';
        for(var d=0; d<total; d++){ html += '<div class="ped-dot'+(d<actual?' on':'')+'"></div>'; }
        html += '</div>';
        html += '</div>';
      } else if(p.estado !== 'rechazado'){
        // Progreso por estado (barra simple)
        html += '<div class="ped-prog-wrap"><div class="ped-prog-bar"><div class="ped-prog-fill" style="width:'+est.pct+'%"></div></div></div>';
      }

      if(p.nota){
        html += '<div class="ped-nota"><b>Nota del equipo:</b> '+_esc(p.nota)+'</div>';
      }

      html += '</div>';
    });
    cont.innerHTML = html;
  }).catch(function(e){
    console.warn('[PEDIDOS] error:', e);
    cont.innerHTML='<div style="text-align:center;padding:1.5rem;color:var(--muted);font-size:.82rem">No se pudieron cargar los pedidos</div>';
  });
}

function _esc(s){ return String(s||'').replace(/[<>&"]/g,function(c){return {'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c];}); }
function _fechaPed(s){ if(!s) return ''; var d=new Date(s); return d.toLocaleDateString('es-MX')+' '+d.toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'}); }


// ═══ RELOJ DE MÉXICO (hora local en vivo) ═══
var _relojMxTimer = null;
function _iniciarRelojMexico(){
  if(_relojMxTimer) return; // ya corriendo
  function tick(){
    var horaEl = document.getElementById('pf-hora-mx');
    var fechaEl = document.getElementById('pf-fecha-mx');
    if(!horaEl){ return; }
    try {
      var ahora = new Date();
      var hora = ahora.toLocaleTimeString('es-MX', { timeZone:'America/Mexico_City', hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false });
      var fecha = ahora.toLocaleDateString('es-MX', { timeZone:'America/Mexico_City', weekday:'long', day:'numeric', month:'long' });
      horaEl.textContent = hora;
      if(fechaEl) fechaEl.textContent = fecha.charAt(0).toUpperCase()+fecha.slice(1);
    } catch(e){}
  }
  tick();
  _relojMxTimer = setInterval(tick, 1000);
}

// ═══ CAMBIAR CONTRASEÑA ═══
function openCambiarPass(){
  if(!authSession){ showToast('Inicia sesion'); return; }
  var el=document.getElementById('modal-pass'); if(el) el.classList.add('show');
}
function closeCambiarPass(){
  var el=document.getElementById('modal-pass'); if(el) el.classList.remove('show');
  ['pass-actual','pass-nueva','pass-confirma'].forEach(function(id){ var e=document.getElementById(id); if(e) e.value=''; });
  var m=document.getElementById('pass-msg'); if(m) m.style.display='none';
}
function guardarNuevaPass(){
  var actual=((document.getElementById('pass-actual')||{}).value||'');
  var nueva=((document.getElementById('pass-nueva')||{}).value||'');
  var conf=((document.getElementById('pass-confirma')||{}).value||'');
  var msg=document.getElementById('pass-msg');
  function showMsg(txt,ok){ if(msg){ msg.textContent=txt; msg.style.display='block'; msg.style.background=ok?'rgba(37,211,102,.12)':'rgba(255,80,100,.12)'; msg.style.color=ok?'#25d366':'#ff5c6c'; } }

  if(!actual){ showMsg('Ingresa tu contrasena actual',false); return; }
  if(nueva.length < 6){ showMsg('La nueva debe tener minimo 6 caracteres',false); return; }
  if(nueva !== conf){ showMsg('Las contrasenas nuevas no coinciden',false); return; }

  // Verificar la contrasena actual contra la guardada
  if(authSession.password && authSession.password !== actual){
    showMsg('La contrasena actual es incorrecta',false); return;
  }

  // Actualizar en Supabase
  if(typeof sbUpdateProfile === 'function' && authSession.id){
    sbUpdateProfile(authSession.id, { password: nueva }).then(function(){
      authSession.password = nueva;
      showMsg('Contrasena actualizada!',true);
      setTimeout(closeCambiarPass, 1500);
    }).catch(function(e){
      showMsg('Error al guardar. Intenta de nuevo.',false);
      console.warn('[PASS] ', e);
    });
  } else {
    showMsg('No se pudo actualizar (sin conexion)',false);
  }
}


// ═══ NOTIFICAR PEDIDO A TELEGRAM (reemplaza WhatsApp en compras) ═══
// Usa la misma Edge Function de recargas (bright-task) para mandar a Telegram.
function notificarPedidoTelegram(titulo, detalles, precio, ord){
  var user = (authSession && authSession.username) ? authSession.username : 'Cliente';
  try {
    fetch(NOTIF_RECARGA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        usuario: user,
        username: user,
        metodo: 'PEDIDO: ' + titulo,
        monto: (precio ? ('$'+precio+' MXN') : '') + (ord ? (' - Pedido #'+ord) : ''),
        monto_acreditar: 0,
        extra: detalles || '',
        foto_base64: ''
      })
    }).catch(function(e){ console.warn('[TG PEDIDO] ', e); });
  } catch(e){ console.warn('[TG PEDIDO] ', e); }
}


// ═══ Cargar saldo + movimientos (para Mis Compras) ═══
function _cargarSaldoYMovimientos(){
  var sdb = document.getElementById('pf-saldo-big');
  var movs = document.getElementById('pf-movimientos');
  if(!authSession){
    if(sdb) sdb.textContent='$0 MX';
    if(movs) movs.innerHTML='<div style="text-align:center;padding:1rem;color:var(--muted);font-size:.78rem">Inicia sesion para ver tu historial</div>';
    return;
  }
  var saldo = authSession.saldo || 0;
  if(sdb) sdb.textContent = '$'+saldo.toLocaleString('es-MX')+' MX';

  if(movs && authSession.id && typeof sbGetMovimientos === 'function'){
    sbGetMovimientos(authSession.id).then(function(rows){
      if(!rows||!rows.length){movs.innerHTML='<div style="text-align:center;padding:1rem;color:var(--muted);font-size:.78rem">Sin movimientos</div>';return;}
      var h='';
      rows.forEach(function(m){
        var f2=m.created_at?new Date(m.created_at).toLocaleDateString('es-MX',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}):'';
        var isC=m.tipo==='credito'||m.tipo==='ajuste'||m.tipo==='recarga';
        var color=isC?'#00e676':'#ff6b6b';
        var signo=isC?'+':'-';
        h+='<div style="display:flex;align-items:center;justify-content:space-between;padding:.42rem .55rem;background:rgba(255,255,255,.03);border:1px solid var(--border);border-radius:6px">'
          +'<div style="min-width:0;flex:1"><div style="font-size:.75rem;font-weight:600;color:var(--text);overflow:hidden;text-overflow:ellipsis">'+(m.descripcion||m.tipo)+'</div>'
          +'<div style="font-size:.62rem;color:var(--muted)">'+f2+'</div></div>'
          +'<div style="font-family:Oxanium;font-size:.75rem;font-weight:700;color:'+color+';flex-shrink:0;margin-left:.5rem">'+signo+'$'+(m.monto||0).toLocaleString('es-MX')+'</div>'
          +'</div>';
      });
      movs.innerHTML=h;
    }).catch(function(){movs.innerHTML='<div style="text-align:center;padding:1rem;color:var(--muted)">Error al cargar</div>';});
  }
}


// ═══ Colapsar tablas de ranking (mostrar solo top 1-3) ═══
function toggleTabla(listaId, btn){
  var lista = document.getElementById(listaId);
  if(!lista) return;
  lista.classList.toggle('top3only');
  // Rotar la flechita
  var arrow = btn ? btn.querySelector('.tabla-arrow') : null;
  if(arrow) arrow.classList.toggle('rot');
}


// ═══ SISTEMA DE CREADORES DE CONTENIDO ═══
// Tramos de vistas → diamantes (Free Fire)
var CREADORES_PREMIOS = [
  { min: 1000,   max: 3999,   label: '1,000 - 3,999',    diamantes: 220 },
  { min: 4000,   max: 9999,   label: '4,000 - 9,999',    diamantes: 452 },
  { min: 10000,  max: 29999,  label: '10,000 - 29,999',  diamantes: 682 },
  { min: 30000,  max: 49999,  label: '30,000 - 49,999',  diamantes: 1270 },
  { min: 50000,  max: 99999,  label: '50,000 - 99,999',  diamantes: 2508 },
  { min: 100000, max: Infinity, label: '100,000 o mas',  diamantes: 6270 }
];

function renderCreadoresTabla(){
  var cont = document.getElementById('creadores-tabla');
  if(!cont) return;
  var html = '';
  CREADORES_PREMIOS.forEach(function(p, i){
    var bg = (i % 2 === 0) ? 'rgba(255,255,255,.015)' : 'transparent';
    var esUltimo = (i === CREADORES_PREMIOS.length - 1);
    html += '<div style="display:grid;grid-template-columns:1.3fr 1fr;padding:.85rem 1rem;background:'+bg+';'+(esUltimo?'background:rgba(255,207,64,.06);':'')+'border-bottom:'+(esUltimo?'none':'1px solid rgba(255,255,255,.05)')+'">';
    html += '<div style="font-family:Oxanium;font-weight:700;font-size:.85rem;color:'+(esUltimo?'#67e8f9':'#fff')+';display:flex;align-items:center">'+p.label+'</div>';
    html += '<div style="font-family:Oxanium;font-weight:800;font-size:.92rem;color:'+(esUltimo?'#67e8f9':'#22d3ee')+';display:flex;align-items:center;gap:.35rem">'+p.diamantes.toLocaleString('es-MX')+' \u{1F48E}</div>';
    html += '</div>';
  });
  cont.innerHTML = html;
}

// Calcula la recompensa según las vistas ingresadas
function _premioPorVistas(vistas){
  for(var i=0;i<CREADORES_PREMIOS.length;i++){
    if(vistas >= CREADORES_PREMIOS[i].min && vistas <= CREADORES_PREMIOS[i].max){
      return CREADORES_PREMIOS[i];
    }
  }
  return null;
}

function calcRecompensa(){
  var vistas = parseInt((document.getElementById('cre-vistas')||{}).value) || 0;
  var box = document.getElementById('cre-recompensa');
  var val = document.getElementById('cre-recompensa-val');
  if(vistas < 1000){ if(box) box.style.display='none'; return; }
  var premio = _premioPorVistas(vistas);
  if(premio && box && val){
    box.style.display='block';
    val.textContent = premio.diamantes.toLocaleString('es-MX') + ' \u{1F48E}';
  }
}

function enviarCreadorWA(){
  var user = ((document.getElementById('cre-user')||{}).value||'').trim();
  var tiktok = ((document.getElementById('cre-tiktok')||{}).value||'').trim();
  var link = ((document.getElementById('cre-link')||{}).value||'').trim();
  var vistas = parseInt((document.getElementById('cre-vistas')||{}).value) || 0;
  var ffid = ((document.getElementById('cre-ffid')||{}).value||'').trim();

  if(!user){ showToast('Escribe tu usuario de CiberStore'); return; }
  if(!tiktok){ showToast('Escribe tu TikTok'); return; }
  if(!link){ showToast('Pega el link de tu video'); return; }
  if(vistas < 1000){ showToast('Las vistas deben ser al menos 1,000'); return; }
  if(!ffid){ showToast('Escribe tu ID de Free Fire'); return; }

  var premio = _premioPorVistas(vistas);
  var diamantes = premio ? premio.diamantes : 0;

  var msg = 'Hola CiberStore! Quiero reclamar mi recompensa de CREADOR DE CONTENIDO.%0A%0A'
    + 'Usuario: ' + encodeURIComponent(user) + '%0A'
    + 'TikTok: ' + encodeURIComponent(tiktok) + '%0A'
    + 'Video: ' + encodeURIComponent(link) + '%0A'
    + 'Vistas: ' + vistas.toLocaleString('es-MX') + '%0A'
    + 'Recompensa: ' + diamantes.toLocaleString('es-MX') + ' diamantes%0A'
    + 'ID Free Fire: ' + encodeURIComponent(ffid) + '%0A%0A'
    + 'Aqui esta mi video para verificacion.';

  window.open('https://wa.me/12894273983?text=' + msg, '_blank');
  showToast('Abriendo WhatsApp...', 2000);
}


// ═══ Colapsar secciones genéricas (reseñas, totales, etc.) ═══
function toggleSeccion(elId, header){
  var el = document.getElementById(elId);
  if(!el) return;
  var oculto = (el.style.display === 'none');
  el.style.display = oculto ? '' : 'none';
  var arrow = header ? header.querySelector('.secc-arrow') : null;
  if(arrow) arrow.style.transform = oculto ? 'rotate(0deg)' : 'rotate(-90deg)';
}

// ═══ TOTALES GLOBALES de la plataforma (ranking) ═══
function cargarTotalesGlobales(){
  if(typeof sb === 'undefined' || !sb.get) return;

  // Traer todas las compras
  sb.get('movimientos_saldo', 'tipo=eq.compra&select=descripcion,monto').then(function(movs){
    if(!movs || !Array.isArray(movs)) return;

    var totalLikes = 0, totalDiamantes = 0, totalDinero = 0, totalPedidos = movs.length;

    movs.forEach(function(m){
      var desc = (m.descripcion || '').toLowerCase();
      totalDinero += Number(m.monto) || 0;

      // Extraer cantidad de likes (busca "200 likes", "2800 likes", etc.)
      var mLikes = desc.match(/(\d[\d,]*)\s*likes?/);
      if(mLikes){ totalLikes += parseInt(mLikes[1].replace(/,/g,'')) || 0; }

      // Extraer cantidad de diamantes
      var mDiam = desc.match(/(\d[\d,]*)\s*diamante/);
      if(mDiam){ totalDiamantes += parseInt(mDiam[1].replace(/,/g,'')) || 0; }
    });

    _setTotal('total-likes', totalLikes);
    _setTotal('total-diamantes', totalDiamantes);
    _setTotal('total-dinero', totalDinero, true);
    _setTotal('total-pedidos', totalPedidos);
  }).catch(function(e){ console.warn('[TOTALES] ', e); });
}

function _setTotal(id, valor, esDinero){
  var el = document.getElementById(id);
  if(!el) return;
  var txt = (esDinero ? '$' : '') + Math.round(valor).toLocaleString('es-MX');
  // Animación de conteo simple
  el.textContent = txt;
}


// ═══════════ NUEVO DISEÑO DIAMANTES (catálogo + detalle) ═══════════
var _diamTipoActual = 'ilim';
var _diamMetodoPago = 'saldo';
var _diamSeleccionado = null;

// Construye la lista de productos según el tipo

// ═══════════ RECARGAS AUTOMÁTICAS (Recargas América type=recharge) ═══════════
// package_id = el ID de Recargas América | precio = costo USD × 20 (redondeado)
var RECARGAS_AUTO = [
  { package_id:351, nombre:'100 Diamantes + 10 Bono',      diamantes:110,   costoUSD:0.71,  precio:16,  img:'img/diam-100.png'  },
  { package_id:348, nombre:'310 Diamantes + 31 Bono',      diamantes:341,   costoUSD:2.12,  precio:45,  img:'img/diam-310.png'  },
  { package_id:350, nombre:'520 Diamantes + 52 Bono',      diamantes:572,   costoUSD:3.58,  precio:70,  img:'img/diam-520.png'  },
  { package_id:347, nombre:'1.060 Diamantes + 106 Bono',   diamantes:1166,  costoUSD:6.65,  precio:135, img:'img/diam-1060.png' },
  { package_id:346, nombre:'2.180 Diamantes + 218 Bono',   diamantes:2398,  costoUSD:13.21, precio:250, img:'img/diam-2180.png' },
  { package_id:349, nombre:'5.600 Diamantes + 560 Bono',   diamantes:6160,  costoUSD:33.61, precio:645, img:'img/diam-5600.png' },
  { package_id:null, nombre:'11.200 Diamantes + 1.120 Bono', diamantes:12320, costoUSD:67.22, precio:1390, manual:true }
];


// Devuelve la imagen del diamante según la cantidad total
function _imgPorDiamantes(total){
  var mapa = {
    110:'img/diam-100.png', 341:'img/diam-310.png', 572:'img/diam-520.png',
    1166:'img/diam-1060.png', 2398:'img/diam-2180.png', 6160:'img/diam-5600.png'
  };
  return mapa[total] || null;
}

function _getDiamProductos(tipo){
  if(tipo === 'bonus'){
    // Con Bono (productos originales +20%)
    var arr = [];
    for(var k in BONUS_PLANES){
      if(BONUS_PLANES.hasOwnProperty(k)){
        var bp = BONUS_PLANES[k];
        arr.push({ key:k, nombre:bp.label, diamantes:bp.diamantes, precio:bp.precio, tipo:'bonus' });
      }
    }
    return arr;
  } else if(tipo === 'ilim'){
    // Ilimitado = recargas automáticas (Recargas América, directo al ID)
    return RECARGAS_AUTO.map(function(r){
      return {
        key:(r.manual?'man_':'auto_')+(r.package_id||r.diamantes),
        nombre:r.nombre, diamantes:r.diamantes, precio:r.precio,
        tipo:(r.manual?'manual':'auto'), package_id:r.package_id,
        badge:(r.manual?'MANUAL':'AUTO'),
        esPase:!!r.esPase,
        img:r.img || _imgPorDiamantes(r.diamantes)
      };
    });
  }
  return [];
}

function setDiamTipo(tipo){
  _diamTipoActual = tipo;
  ['ilim'].forEach(function(t){
    var btn = document.getElementById('dtab-'+t);
    if(btn) btn.classList.toggle('active', t===tipo);
  });
  // El aviso de region LATAM siempre visible
  var avisoLatam = document.getElementById('diam-latam-aviso');
  if(avisoLatam) avisoLatam.style.display = 'block';
  // Volver al catálogo si estaba en detalle
  document.getElementById('diam-catalogo').style.display='';
  document.getElementById('diam-detalle').style.display='none';
  renderDiamCatalogo();
}

// Cotizar paquetes especiales por WhatsApp
function cotizarDiamantesWA(){
  var quien = authSession ? authSession.username : '';
  var msg = 'Hola! Quiero cotizar un paquete de diamantes de Free Fire.\n'
    + (quien ? ('Mi usuario: ' + quien + '\n') : '')
    + 'Mi ID de Free Fire: \n'
    + 'Paquete o cantidad que busco: ';
  window.open('https://wa.me/' + WA + '?text=' + encodeURIComponent(msg), '_blank');
}

function renderDiamCatalogo(){
  var grid = document.getElementById('diam-grid');
  var count = document.getElementById('diam-count');
  if(!grid) return;
  var productos = _getDiamProductos(_diamTipoActual);
  if(count) count.textContent = productos.length;

  grid.innerHTML = productos.map(function(p, i){
    var badgeColor = '';
    if(p.badge === 'AUTO') badgeColor = 'background:rgba(37,211,102,.15);border-color:rgba(37,211,102,.4);color:#25d366';
    else if(p.badge === 'MANUAL') badgeColor = 'background:rgba(255,180,60,.15);border-color:rgba(255,180,60,.4);color:#22d3ee';
    var badge = p.badge ? '<span class="dcat-badge" style="'+badgeColor+'">'+p.badge+'</span>' : '';
    var visual = p.img
      ? '<div style="width:100%;aspect-ratio:4/3;border-radius:11px;overflow:hidden;margin-bottom:.65rem;background:#0a0f1a"><img src="'+p.img+'" alt="'+p.nombre+'" style="width:100%;height:100%;object-fit:cover;display:block" onerror="this.parentNode.innerHTML=\'<div class=&quot;dcat-card-ico&quot;>&#127918;</div>\'"/></div>'
      : '<div class="dcat-card-ico">&#127918;</div>';
    return '<div class="dcat-card" onclick="abrirDiamDetalle('+i+')">'
      + badge
      + visual
      + '<div class="dcat-card-name">'+p.nombre+'</div>'
      + '<div class="dcat-card-sub">Free Fire</div>'
      + '<div class="dcat-card-price">'+fmt(p.precio)+'</div>'
      + '</div>';
  }).join('');
}

// Aviso de tiempo de entrega segun el tipo de producto
function _avisoEntrega(p){
  if(p && p.esPase){
    return '<div style="background:rgba(255,180,60,.1);border:1px solid rgba(255,180,60,.32);border-radius:11px;padding:.85rem 1rem;margin-bottom:1.25rem;font-size:.79rem;color:#ffb84d;line-height:1.6">'
      + '\u26A0\uFE0F <b>El pase se manda mediante REGALO.</b><br/>Puede que te llegue de <b>1 a 4 dias</b>. Consulta con el administrador.'
      + '</div>';
  }
  if(p && p.tipo==='bonus'){
    return '<div style="background:rgba(255,180,60,.1);border:1px solid rgba(255,180,60,.32);border-radius:11px;padding:.85rem 1rem;margin-bottom:1.25rem;font-size:.79rem;color:#ffb84d;line-height:1.6">'
      + '\u23F3 Las recargas con <b>bono</b> pueden llegar entre <b>1 y 3 horas</b>.'
      + '</div>';
  }
  if(p && p.tipo==='auto'){
    return '<div style="background:rgba(37,211,102,.08);border:1px solid rgba(37,211,102,.25);border-radius:11px;padding:.7rem .9rem;margin-bottom:1.25rem;font-size:.8rem;color:#25d366">\u26A1 Recarga instantanea directa a tu ID<br/><span style="color:#67e8f9;font-size:.74rem">\uD83C\uDF0E Solo cuentas de region LATAM</span></div>';
  }
  return '<div style="background:rgba(255,180,60,.08);border:1px solid rgba(255,180,60,.25);border-radius:11px;padding:.7rem .9rem;margin-bottom:1.25rem;font-size:.8rem;color:#ffb84d">\u23F3 Se procesa manualmente (te contactamos)</div>';
}

// Ventana emergente de advertencia (Pase / Bonus)
function _mostrarAvisoModal(titulo, texto, color){
  var ov = document.getElementById('aviso-entrega-ov');
  if(ov) ov.remove();
  ov = document.createElement('div');
  ov.id = 'aviso-entrega-ov';
  ov.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.85);display:flex;align-items:center;justify-content:center;padding:1.2rem';
  ov.onclick = function(e){ if(e.target===ov) ov.remove(); };
  document.body.appendChild(ov);

  var c = document.createElement('div');
  c.style.cssText = 'max-width:400px;width:100%;background:#0a0a0a;border:1px solid '+color+'55;border-radius:18px;padding:1.75rem 1.35rem;text-align:center';
  c.innerHTML =
    '<div style="font-size:2.4rem;margin-bottom:.6rem">\u26A0\uFE0F</div>'
    + '<div style="font-family:Oxanium;font-weight:800;font-size:1rem;color:'+color+';margin-bottom:.7rem;letter-spacing:.3px">'+titulo+'</div>'
    + '<div style="font-size:.85rem;color:#c5cad6;line-height:1.65;margin-bottom:1.4rem">'+texto+'</div>'
    + '<button onclick="var o=document.getElementById(\'aviso-entrega-ov\'); if(o) o.remove();" style="width:100%;padding:.85rem;background:rgba(34,211,238,.12);border:1px solid rgba(34,211,238,.4);color:#22d3ee;border-radius:12px;font-family:Poppins;font-weight:600;font-size:.9rem;cursor:pointer">Entendido</button>';
  ov.appendChild(c);
}

function abrirDiamDetalle(idx){
  var productos = _getDiamProductos(_diamTipoActual);
  var p = productos[idx];
  if(!p) return;
  _diamSeleccionado = p;
  _diamMetodoPago = 'saldo';

  // Ventana de advertencia segun el producto
  if(p.esPase){
    setTimeout(function(){
      _mostrarAvisoModal('ENTREGA POR REGALO',
        'El pase se manda mediante <b style="color:#fff">REGALO</b>.<br/><br/>Puede que te llegue de <b style="color:#fff">1 a 4 dias</b>.<br/>Consulta con el administrador.',
        '#ffb84d');
    }, 250);
  } else if(p.tipo==='bonus'){
    setTimeout(function(){
      _mostrarAvisoModal('TIEMPO DE ENTREGA',
        'Las recargas con <b style="color:#fff">bono</b> pueden llegar entre <b style="color:#fff">1 y 3 horas</b>.',
        '#ffb84d');
    }, 250);
  }

  var saldo = (authSession && authSession.saldo) ? authSession.saldo : 0;
  var alcanza = saldo >= p.precio;

  var det = document.getElementById('diam-detalle');
  det.innerHTML =
    '<button class="ddet-back" onclick="cerrarDiamDetalle()" style="background:none;border:none;color:#6b7280;font-size:.85rem;cursor:pointer;margin-bottom:1rem;padding:0">&#8592; Volver al catalogo</button>'
    + '<div style="background:rgba(255,255,255,.022);border:1px solid rgba(255,255,255,.065);border-radius:18px;padding:1.35rem">'
    + (p.img ? '<img src="'+p.img+'" alt="'+p.nombre+'" style="width:150px;display:block;margin:0 auto 1rem;border-radius:12px" onerror="this.style.display=\'none\'"/>' : '')
    + '<div style="text-align:center;margin-bottom:1.15rem">'
    +   '<div style="font-family:Poppins,sans-serif;font-weight:700;font-size:1.15rem;color:#fff;margin-bottom:.2rem">'+p.nombre+'</div>'
    +   '<div style="font-family:Poppins,sans-serif;font-weight:700;font-size:1.9rem;color:#fff">'+fmt(p.precio)+'</div>'
    +   '<div style="font-size:.78rem;color:#6b7280;margin-top:.15rem">Pago con saldo</div>'
    + '</div>'
    + _avisoEntrega(p)
    + '<label class="flabel">Tu ID de Free Fire *</label>'
    + '<input class="finput" id="diam-ffid" type="text" inputmode="numeric" placeholder="Ej: 123456789"/>'
    + '<div style="display:flex;justify-content:space-between;background:rgba(34,211,238,.05);border:1px solid rgba(34,211,238,.15);border-radius:11px;padding:.65rem 1rem;margin:.3rem 0 .8rem"><span style="font-size:.76rem;color:#6b7280">Tu saldo</span><span style="font-weight:600;color:'+(alcanza?'#22d3ee':'#ff6b6b')+';font-size:.85rem">'+fmt(saldo)+'</span></div>'
    + (alcanza ? '' : '<div style="background:rgba(255,60,60,.08);border:1px solid rgba(255,60,60,.25);border-radius:10px;padding:.65rem .85rem;font-size:.77rem;color:#ff6b6b;margin-bottom:.75rem">Saldo insuficiente. <span onclick="goPage(\'saldo\')" style="text-decoration:underline;cursor:pointer">Recarga aqui</span></div>')
    + '<div class="ddet-msg" id="diam-msg"></div>'
    + '<button id="diam-btn" onclick="confirmarDiamCompra()" style="width:100%;padding:.9rem;background:rgba(34,211,238,.12);border:1px solid rgba(34,211,238,.42);color:#22d3ee;border-radius:13px;font-family:Poppins;font-weight:600;font-size:.92rem;cursor:pointer">Comprar con saldo</button>'
    + '</div>';

  document.getElementById('diam-catalogo').style.display='none';
  det.style.display='';
  _actualizarDiamBoton();
}

function cerrarDiamDetalle(){
  document.getElementById('diam-detalle').style.display='none';
  document.getElementById('diam-catalogo').style.display='';
}

function selDiamMetodo(metodo){
  _diamMetodoPago = metodo;
  var s=document.getElementById('dm-saldo'), b=document.getElementById('dm-binance');
  if(s) s.classList.toggle('sel', metodo==='saldo');
  if(b) b.classList.toggle('sel', metodo==='binance');
  _actualizarDiamBoton();
}

function _actualizarDiamBoton(){
  var btn=document.getElementById('diam-btn');
  var msg=document.getElementById('diam-msg');
  if(!btn||!_diamSeleccionado) return;
  var saldo=(authSession&&authSession.saldo)?authSession.saldo:0;

  if(_diamMetodoPago==='saldo'){
    if(saldo>=_diamSeleccionado.precio){
      btn.className='ddet-btn on'; btn.innerHTML='Recargar con saldo &#8594;';
      if(msg){ msg.textContent=''; msg.className='ddet-msg'; }
    } else {
      btn.className='ddet-btn off';
      btn.innerHTML='Recargar con saldo &#8594;';
      if(msg){ msg.textContent='Saldo insuficiente para pagar con saldo. Usa Binance o recarga tu saldo.'; msg.className='ddet-msg err'; }
    }
  } else {
    btn.className='ddet-btn on'; btn.innerHTML='Pagar con Binance &#8594;';
    if(msg){ msg.textContent=''; msg.className='ddet-msg'; }
  }
}

var _comprandoDiam = false; // candado anti-doble-compra

function confirmarDiamCompra(){
  if(!authSession){ showToast('Inicia sesion para comprar'); setTimeout(showAuthModal,600); return; }

  // Evitar doble clic / doble pedido
  if(_comprandoDiam){ return; }

  var p=_diamSeleccionado;
  if(!p) return;
  var ffId=((document.getElementById('diam-ffid')||{}).value||'').trim();
  if(!ffId){ showToast('Escribe tu ID de Free Fire'); return; }

  var saldo=(authSession&&authSession.saldo)?authSession.saldo:0;

  if(saldo < p.precio){ showToast('Saldo insuficiente. Recarga primero.'); return; }

  // ═══ RECARGA AUTOMÁTICA (productos type=auto) ═══
  if(p.tipo === 'auto' && p.package_id){
    _procesarRecargaAutomatica(p, ffId);
    return;
  }

  // Activar candado y deshabilitar el botón
  _comprandoDiam = true;
  var btn = document.getElementById('diam-btn');
  if(btn){ btn.className='ddet-btn off'; btn.innerHTML='Procesando...'; }

  // Compra normal (ilimitados / 1vez): pedido manual
  var ord=getNextOrder();
  addSpend(p.precio, p.diamantes+' Diamantes ('+p.tipo+') - ID:'+ffId+' - Pedido #'+ord);
  registrarPedido(p.nombre, p.diamantes, 'diamantes', ffId, p.precio, 0);
  if(typeof tgNotifyPurchase==='function') tgNotifyPurchase(authSession.username, p.nombre+' - ID:'+ffId, p.precio, ord);
  _mostrarReciboProceso(p, ffId, ord);
  showToast('\u2705 Pedido #'+ord+' realizado!', 3000);

  // Liberar el candado después de un momento
  setTimeout(function(){ _comprandoDiam = false; }, 3000);
}

// ═══ Recibo "en proceso" con barra para compras normales ═══
function _mostrarReciboProceso(p, ffId, ord){
  var det = document.getElementById('diam-detalle');
  if(!det) return;

  var ahora = new Date();
  var fecha = ahora.toLocaleDateString('es-MX', { day:'2-digit', month:'2-digit', year:'numeric' });
  var hora = ahora.toLocaleTimeString('es-MX', { hour:'2-digit', minute:'2-digit' });

  det.innerHTML =
    '<div style="background:linear-gradient(160deg,rgba(255,180,60,.08),rgba(255,255,255,.02));border:2px solid rgba(255,180,60,.35);border-radius:18px;padding:1.75rem 1.35rem;text-align:center;max-width:420px;margin:0 auto">'
    + '<div style="font-size:2.8rem;margin-bottom:.5rem">\u23F3</div>'
    + '<div style="font-family:Oxanium;font-weight:900;font-size:1.25rem;color:#22d3ee;margin-bottom:.35rem;letter-spacing:.5px">RECARGA EN PROCESO</div>'
    + '<div style="font-size:.8rem;color:var(--muted);margin-bottom:1.35rem">Tu pedido se esta procesando, te lo acreditamos pronto</div>'

    // Barra de progreso animada
    + '<div style="background:rgba(0,0,0,.25);border-radius:99px;height:10px;overflow:hidden;margin-bottom:1.5rem">'
    +   '<div id="recibo-barra" style="height:100%;width:15%;border-radius:99px;background:linear-gradient(90deg,#22d3ee,#ff9900,#22d3ee);background-size:200% 100%;box-shadow:0 0 12px rgba(255,180,60,.5);transition:width .8s ease"></div>'
    + '</div>'

    + '<div style="background:rgba(0,0,0,.25);border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:1rem;text-align:left">'
    +   _filaRecibo('\uD83D\uDCCB Pedido', '#'+ord)
    +   _filaRecibo('\uD83D\uDC8E Cantidad', p.nombre)
    +   _filaRecibo('\uD83C\uDFAE ID Free Fire', ffId)
    +   _filaRecibo('\uD83D\uDCB5 Precio', fmt(p.precio))
    +   _filaRecibo('\uD83D\uDCC5 Fecha', fecha + ' \u00B7 \uD83D\uDD52 ' + hora, true)
    + '</div>'

    + '<button onclick="cerrarDiamDetalle()" style="width:100%;margin-top:1.25rem;padding:.9rem;background:linear-gradient(135deg,#0e7490,#f0b90b);color:#fff;border:none;border-radius:12px;font-family:Poppins;font-weight:700;font-size:.9rem;cursor:pointer">Volver al catalogo</button>'
    + '</div>';

  det.style.display = '';
  document.getElementById('diam-catalogo').style.display = 'none';
  det.scrollIntoView({ behavior:'smooth', block:'center' });

  // Animar la barra (avanza gradualmente)
  setTimeout(function(){ var b=document.getElementById('recibo-barra'); if(b) b.style.width='55%'; }, 400);
  setTimeout(function(){ var b=document.getElementById('recibo-barra'); if(b) b.style.width='80%'; }, 1500);
}

// ═══ Procesar recarga automática: valida ID → cobra saldo → recarga ═══
function _procesarRecargaAutomatica(p, ffId){
  if(_comprandoDiam){ return; }
  _comprandoDiam = true;
  var btn = document.getElementById('diam-btn');
  var msg = document.getElementById('diam-msg');
  if(btn){ btn.className='ddet-btn off'; btn.innerHTML='Validando ID...'; }

  // Paso 1: validar que el ID exista
  fetch(COMPRAR_RECARGA_URL, {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ action:'validar', product_id:p.package_id, service_user_id:ffId })
  }).then(function(r){ return r.json(); }).then(function(val){
    if(!val.success || !val.valido){
      if(btn){ btn.className='ddet-btn on'; btn.innerHTML='Recargar con saldo &#8594;'; }
      if(msg){ msg.className='ddet-msg err'; msg.style.fontSize='.65rem'; msg.textContent='DEBUG VALIDAR: '+JSON.stringify(val).substring(0,300); }
      console.error('[RECARGA] validacion fallo:', JSON.stringify(val));
      _comprandoDiam = false;
      return;
    }

    // ID válido: mostrar nombre y confirmar
    var nombre = val.nombre || 'Jugador';
    if(msg){ msg.className='ddet-msg'; msg.style.color='#25d366'; msg.innerHTML='\u2705 Cuenta encontrada: <b>'+nombre+'</b><br>Procesando recarga...'; }
    if(btn){ btn.innerHTML='Recargando...'; }

    // Paso 2: cobrar el saldo AHORA (antes de recargar)
    var ord=getNextOrder();
    addSpend(p.precio, p.diamantes+' Diamantes (Recarga AUTO '+p.nombre+') - ID:'+ffId+' ('+nombre+') - Pedido #'+ord);

    // Paso 3: hacer la recarga automática
    fetch(COMPRAR_RECARGA_URL, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ action:'comprar', package_id:p.package_id, player_id:ffId, client_name:authSession.username })
    }).then(function(r){ return r.json(); }).then(function(res){
      if(res.success && (res.status==='COMPLETED' || res.status==='PENDING')){
        registrarPedido(p.nombre+' (AUTO)', p.diamantes, 'diamantes', ffId, p.precio, 0);
        if(typeof tgNotifyPurchase==='function') tgNotifyPurchase(authSession.username, '\u26A1 Recarga AUTO\n\uD83D\uDCA0 Paquete: '+p.nombre+'\n\uD83C\uDFAE ID: '+ffId+'\n\uD83D\uDC64 Nombre IG: '+nombre, p.precio, ord);
        _mostrarReciboRecarga(p, ffId, nombre, res.status);
        var txt = res.status==='COMPLETED' ? '\u2705 Recarga COMPLETADA!' : '\u23F3 Recarga en proceso...';
        showToast(txt, 3000);
        _comprandoDiam = false;
      } else {
        var errTxt = String(res.error||res.status||'sin confirmar');
        var noDisponible = /no disponible|not available|no encontrado|not found|sin stock|out of stock/i.test(errTxt);

        if(noDisponible){
          // La recarga NO se hizo (producto no disponible): DEVOLVER el saldo automatico
          _rpcAjustarSaldo(authSession.id, p.precio).then(function(saldoNuevo){
            var sn = Number(saldoNuevo)||0;
            authSession.saldo = sn;
            _refreshSaldoUI(sn);
            if(typeof saveSession==='function') saveSession(authSession);
            if(typeof sbAddMovimiento==='function') sbAddMovimiento(authSession.id, 'credito', p.precio, 'Devolucion Pedido #'+ord+' - producto no disponible');
          }).catch(function(e){ console.error('[RECARGA] devolucion fallo:', e); });

          registrarPedido(p.nombre+' (AUTO - NO DISPONIBLE, devuelto)', p.diamantes, 'diamantes', ffId, 0, 0);
          if(typeof tgNotifyPurchase==='function') tgNotifyPurchase(authSession.username, '\u26A0\uFE0F NO DISPONIBLE - Recarga AUTO\n\uD83D\uDCA0 Paquete: '+p.nombre+'\n\uD83C\uDFAE ID: '+ffId+'\n\u2757 '+errTxt+'\n\u2705 SALDO DEVUELTO automaticamente ('+fmt(p.precio)+')', p.precio, ord);
          if(btn){ btn.className='ddet-btn on'; btn.innerHTML='Recargar con saldo &#8594;'; }
          if(msg){ msg.className='ddet-msg err'; msg.style.fontSize='.75rem'; msg.innerHTML='\u274C Este paquete no esta disponible para tu ID en este momento (puede ser por la region de tu cuenta o stock momentaneo).<br/><b>Tu saldo fue devuelto.</b> Intenta de nuevo en unos minutos o contacta al admin.'; }
          showToast('\u274C No disponible. Saldo devuelto.', 4000);
          _comprandoDiam = false;
        } else {
          // Error ambiguo: la recarga pudo haberse hecho igual. NO reembolsar, verificar manual.
          registrarPedido(p.nombre+' (AUTO - VERIFICAR)', p.diamantes, 'diamantes', ffId, p.precio, 0);
          if(typeof tgNotifyPurchase==='function') tgNotifyPurchase(authSession.username, '\u26A0\uFE0F VERIFICAR - Recarga AUTO\n\uD83D\uDCA0 Paquete: '+p.nombre+'\n\uD83C\uDFAE ID: '+ffId+'\n\u2757 '+errTxt, p.precio, ord);
          if(btn){ btn.className='ddet-btn on'; btn.innerHTML='Recargar con saldo &#8594;'; }
          if(msg){ msg.className='ddet-msg'; msg.style.color='#22d3ee'; msg.style.fontSize='.72rem'; msg.innerHTML='\u23F3 Tu recarga se esta verificando. Si no llega en unos minutos, contacta al admin con tu ID.'; }
          console.error('[RECARGA] Sin confirmar (no reembolsado):', JSON.stringify(res));
          _comprandoDiam = false;
          setTimeout(cerrarDiamDetalle, 4000);
        }
      }
    }).catch(function(err){
      // NO reembolsar: la recarga pudo haberse completado aunque la respuesta fallo
      registrarPedido(p.nombre+' (AUTO - VERIFICAR)', p.diamantes, 'diamantes', ffId, p.precio, 0);
      if(typeof tgNotifyPurchase==='function') tgNotifyPurchase(authSession.username, '\u26A0\uFE0F VERIFICAR (sin respuesta) - Recarga AUTO\n\uD83D\uDCA0 Paquete: '+p.nombre+'\n\uD83C\uDFAE ID: '+ffId, p.precio, ord);
      if(btn){ btn.className='ddet-btn on'; btn.innerHTML='Recargar con saldo &#8594;'; }
      if(msg){ msg.className='ddet-msg'; msg.style.color='#22d3ee'; msg.style.fontSize='.72rem'; msg.innerHTML='\u23F3 Tu recarga se esta verificando. Si no llega, contacta al admin.'; }
      console.error('[RECARGA] catch compra (no reembolsado):', err);
      _comprandoDiam = false;
      setTimeout(cerrarDiamDetalle, 4000);
    });

  }).catch(function(err){
    if(btn){ btn.className='ddet-btn on'; btn.innerHTML='Recargar con saldo &#8594;'; }
    if(msg){ msg.className='ddet-msg err'; msg.style.fontSize='.65rem'; msg.textContent='DEBUG CATCH VALIDAR: '+(err&&err.message?err.message:err); }
    console.error('[RECARGA] catch validar:', err);
    _comprandoDiam = false;
  });
}


// Refresca los precios del detalle al cambiar la moneda (sin cerrar)
function _refrescarDiamPrecios(){
  if(!_diamSeleccionado) return;
  var precioEl = document.querySelector('#diam-detalle .ddet-price');
  if(precioEl) precioEl.innerHTML = fmt(_diamSeleccionado.precio);
  var saldo=(authSession&&authSession.saldo)?authSession.saldo:0;
  var subEl = document.querySelector('#dm-saldo .ddet-metodo-sub');
  if(subEl) subEl.textContent = '('+fmt(saldo)+')';
}


// ═══ PANEL BILLETERA (Mi Cuenta) ═══
// Muestra el saldo en una moneda secundaria (si usa MXN muestra USD, y viceversa)
function _actualizarSaldoAlterno(saldoMxn){
  var el = document.getElementById('wallet-saldo-alt');
  if(!el) return;
  var otra = (CURRENCY === 'MXN') ? 'USD' : 'MXN';
  var rate = RATES[otra] || 1;
  var valor = saldoMxn * rate;
  var sym = CUR_SYM[otra] || '$';
  var suf = CUR_SUF[otra] || '';
  el.textContent = sym + valor.toLocaleString('es-MX', {minimumFractionDigits:2, maximumFractionDigits:2}) + suf;
}

function cargarWalletPerfil(){
  var sdb = document.getElementById('wallet-saldo');
  var movs = document.getElementById('wallet-movimientos');
  if(!authSession){
    if(sdb) sdb.textContent = fmt(0);
    var altVacio = document.getElementById('wallet-saldo-alt');
    if(altVacio) altVacio.innerHTML = '&nbsp;';
    if(movs) movs.innerHTML='<div style="text-align:center;padding:1rem;color:var(--muted);font-size:.78rem">Inicia sesion</div>';
    return;
  }
  var saldo = authSession.saldo || 0;
  if(sdb) sdb.textContent = fmt(saldo);
  _actualizarSaldoAlterno(saldo);

  if(movs && authSession.id && typeof sbGetMovimientos === 'function'){
    sbGetMovimientos(authSession.id).then(function(rows){
      if(!rows || !rows.length){ movs.innerHTML='<div style="text-align:center;padding:1rem;color:var(--muted);font-size:.78rem">Sin movimientos aun</div>'; return; }
      var h='';
      rows.slice(0,4).forEach(function(m){
        var isC = m.tipo==='credito'||m.tipo==='ajuste'||m.tipo==='recarga';
        var color = isC?'#00e676':'#ff6b6b';
        var signo = isC?'+':'-';
        var hora = m.created_at ? new Date(m.created_at).toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'}) : '';
        var ico = isC ? '\u{1F4B0}' : '\u{1F4B8}';
        h += '<div style="display:flex;align-items:center;gap:.7rem;padding:.6rem 0;border-bottom:1px solid rgba(255,255,255,.05)">'
          + '<div style="width:38px;height:38px;border-radius:50%;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);display:flex;align-items:center;justify-content:center;font-size:1rem;flex-shrink:0">'+ico+'</div>'
          + '<div style="flex:1;min-width:0"><div style="font-size:.82rem;font-weight:600;color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+(m.descripcion||m.tipo)+'</div>'
          + '<div style="font-size:.68rem;color:var(--muted)">'+hora+'</div></div>'
          + '<div style="text-align:right;flex-shrink:0"><div style="font-family:Oxanium;font-weight:700;font-size:.85rem;color:'+color+'">'+signo+fmt(m.monto||0)+'</div></div>'
          + '</div>';
      });
      movs.innerHTML = h;
    }).catch(function(){ movs.innerHTML='<div style="text-align:center;padding:1rem;color:var(--muted);font-size:.78rem">Error al cargar</div>'; });
  }
}


// ═══ [TEMPORAL] Ver productos de Recargas América con sus IDs ═══
var COMPRAR_RECARGA_URL = 'https://pnotsqsudqpwqzssevig.supabase.co/functions/v1/rapid-handler';

function verProductosRA(){
  var cont = document.getElementById('ra-productos-lista');
  if(!cont) return;
  cont.style.display = 'block';
  cont.innerHTML = '<div style="text-align:center;padding:1rem;color:#22d3ee">Cargando productos...</div>';

  fetch(COMPRAR_RECARGA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'listar' })
  }).then(function(r){ return r.json(); }).then(function(res){
    if(!res.success){
      cont.innerHTML = '<div style="color:#ff6b6b">Error: '+(res.error||'no se pudo')+'</div>';
      return;
    }
    var prods = res.productos;
    if(!prods || !prods.length){
      var dbg = '';
      if(res._debug_respuesta_cruda !== undefined){
        dbg = '<div style="margin-top:.75rem;padding:.6rem;background:rgba(255,255,255,.03);border-radius:8px;font-size:.65rem;color:#a5f3fc;word-break:break-all">HTTP: '+(res._debug_http_status||'?')+'<br>Respuesta cruda:<br>'+JSON.stringify(res._debug_respuesta_cruda)+'</div>';
      }
      cont.innerHTML = '<div style="color:#ff6b6b">No se recibieron productos (lista vacia).</div>'+dbg;
      return;
    }

    // Separar por tipo
    var recargas = prods.filter(function(p){ return (p.type||p.tipo)==='recharge'; });
    var pins = prods.filter(function(p){ return (p.type||p.tipo)==='pin'; });
    var otros = prods.filter(function(p){ return (p.type||p.tipo)!=='recharge' && (p.type||p.tipo)!=='pin'; });

    var html = '<div style="font-family:Oxanium;font-weight:800;color:#22d3ee;margin-bottom:.75rem">'+prods.length+' PRODUCTOS ('+recargas.length+' recargas, '+pins.length+' pins)</div>';

    function pintar(lista, titulo, color){
      if(!lista.length) return '';
      var h = '<div style="font-weight:800;color:'+color+';margin:.75rem 0 .4rem;font-size:.72rem">'+titulo+'</div>';
      lista.forEach(function(p){
        var tipo = p.type || p.tipo || '?';
        h += '<div style="padding:.6rem;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:8px;margin-bottom:.5rem">'
          + '<div style="color:#fff;font-weight:700">ID: '+p.id+' &mdash; '+(p.name||p.sku||p.package||'?')+'</div>'
          + '<div style="color:#22d3ee;font-size:.68rem">Tipo: '+tipo+' &middot; SKU: '+(p.sku||'?')+'</div>'
          + '<div style="color:#25d366;font-size:.72rem">Precio (tu costo): $'+(p.price||'?')+'</div>'
          + '</div>';
      });
      return h;
    }

    html += pintar(recargas, '\u{1F3AE} RECARGAS DIRECTAS (type=recharge):', '#25d366');
    html += pintar(pins, '\u{1F39F}\uFE0F PINS (type=pin):', '#22d3ee');
    html += pintar(otros, '\u{2753} OTROS:', '#67e8f9');
    html += '<div style="margin-top:.75rem;padding:.6rem;background:rgba(34,211,238,.08);border-radius:8px;color:#a5f3fc;font-size:.72rem">&#128203; Copia esta lista y pasala para conectar los productos.</div>';
    cont.innerHTML = html;
  }).catch(function(err){
    cont.innerHTML = '<div style="color:#ff6b6b">Error de conexion: '+err+'<br>Revisa que la funcion comprar-recarga este montada.</div>';
  });
}


// ═══════════ COMPRA DE PINES AL POR MAYOR (API Recargas América) ═══════════
// Llena el selector de la sección "PINES POR STOCK" con los productos de API
function loadPinesMayoreo(){
  var sel = document.getElementById('pin-plan');
  var grid = document.getElementById('pines-grid');
  if(!sel) return;

  // Llenar el selector con los productos de PINES_API
  var opts = '';
  PINES_API.forEach(function(p, i){
    opts += '<option value="'+i+'">'+p.diamantes+' diamantes — $'+p.precio+' MX c/u</option>';
  });
  sel.innerHTML = opts;

  // Mensaje en el grid
  if(grid){
    grid.innerHTML = '<div style="text-align:center;padding:1rem;color:#25d366;font-size:.82rem">\u26A1 Compra al por mayor: elige producto y cantidad (hasta 10 por compra)</div>';
  }
  _updatePinTotal();
}

// Total según producto seleccionado y cantidad
// Devuelve el % de descuento según la cantidad de PINes
function _descuentoPorCantidad(cant){
  if(cant >= 10) return 5;
  if(cant >= 8) return 4;
  if(cant >= 7) return 3;
  if(cant >= 5) return 2;
  if(cant >= 3) return 1;
  return 0;
}

// Calcula el total con descuento aplicado
function _calcularTotalPin(idx, cant){
  if(isNaN(idx) || !PINES_API[idx]) return { subtotal:0, descuento:0, total:0, pct:0 };
  var subtotal = PINES_API[idx].precio * cant;
  var pct = _descuentoPorCantidad(cant);
  var descuento = Math.round(subtotal * pct / 100);
  var total = subtotal - descuento;
  return { subtotal:subtotal, descuento:descuento, total:total, pct:pct };
}

function _updatePinTotal(){
  var idx = parseInt((document.getElementById('pin-plan')||{}).value);
  var cant = parseInt((document.getElementById('pin-cantidad')||{}).value)||1;
  if(cant < 1) cant = 1;
  if(cant > 10){ cant = 10; var inp=document.getElementById('pin-cantidad'); if(inp) inp.value=10; }

  var el = document.getElementById('pin-total-val');
  var descEl = document.getElementById('pin-descuento-row');
  if(isNaN(idx) || !PINES_API[idx]){ if(el) el.textContent='$0 MX'; if(descEl) descEl.style.display='none'; return; }

  var c = _calcularTotalPin(idx, cant);

  // Mostrar/ocultar la fila de descuento
  if(descEl){
    if(c.pct > 0){
      descEl.style.display='flex';
      var descTxt = document.getElementById('pin-descuento-val');
      if(descTxt) descTxt.textContent = '-'+c.pct+'% (-$'+c.descuento.toLocaleString('es-MX')+')';
    } else {
      descEl.style.display='none';
    }
  }

  if(el) el.textContent = '$'+c.total.toLocaleString('es-MX')+' MX';
}

function _cambiarCantPin(delta){
  var inp = document.getElementById('pin-cantidad');
  if(!inp) return;
  var v = (parseInt(inp.value)||1) + delta;
  if(v < 1) v = 1;
  if(v > 10) v = 10;
  inp.value = v;
  _updatePinTotal();
}

// Comprar N pines por API
var _comprandoPin = false; // candado anti-doble-compra de pines

function submitPinSaldo(){
  if(!authSession){ showToast('Inicia sesion para comprar'); setTimeout(showAuthModal,600); return; }
  if(_comprandoPin){ return; }
  var err = document.getElementById('pin-err');
  function showErr(m){ if(err){err.textContent=m;err.style.display='block';} }

  var idx = parseInt((document.getElementById('pin-plan')||{}).value);
  var cant = parseInt((document.getElementById('pin-cantidad')||{}).value)||1;
  if(cant < 1) cant = 1;
  if(cant > 10) cant = 10;

  if(isNaN(idx) || !PINES_API[idx]){ showErr('Elige un producto.'); return; }
  var prod = PINES_API[idx];
  var calc = _calcularTotalPin(idx, cant);
  var total = calc.total;
  var saldo = authSession.saldo||0;

  if(saldo < total){ showErr('Saldo insuficiente ($'+saldo.toLocaleString('es-MX')+' MX). Necesitas $'+total.toLocaleString('es-MX')+' MX.'); return; }
  if(err) err.style.display='none';

  _comprandoPin = true;
  var btn = event && event.target ? event.target : null;
  if(btn){ btn.disabled=true; btn.textContent='Generando '+cant+' PIN(es)...'; }
  showToast('Generando '+cant+' PIN(es)...', 3000);

  // Llamar al portero con quantity = cant
  var _headers = { 'Content-Type': 'application/json' };
  if(SUPABASE_ANON){ _headers['Authorization']='Bearer '+SUPABASE_ANON; _headers['apikey']=SUPABASE_ANON; }

  fetch(PORTERO_URL, {
    method:'POST', headers:_headers,
    body: JSON.stringify({ product_id: prod.product_id, quantity: cant })
  }).then(function(r){ return r.json(); }).then(function(res){
    _comprandoPin = false;
    if(btn){ btn.disabled=false; btn.innerHTML='\uD83D\uDD12 Comprar y recibir PIN'; }
    if(!res || res.success === false){
      showErr('Error: '+((res&&res.error)||'no se pudo comprar')+'. No se te cobro.');
      console.error('[PIN MAYOREO] Error:', JSON.stringify(res));
      return;
    }

    // El portero ahora devuelve res.pines (array) y res.entregados
    var pines = Array.isArray(res.pines) ? res.pines : _extraerPines(res, cant);
    var entregados = pines.length;

    if(!entregados){
      showErr('No se recibieron los codigos. Contacta al admin con tu pedido.');
      console.error('[PIN MAYOREO] respuesta:', JSON.stringify(res));
      return;
    }

    // Cobrar SOLO por los PINes realmente entregados, con descuento por volumen
    var calcReal = _calcularTotalPin(idx, entregados);
    var totalReal = calcReal.total;
    var ord = getNextOrder();
    var descNota = calcReal.pct>0 ? (' ('+calcReal.pct+'% desc)') : '';
    // Total de diamantes = cantidad x diamantes por PIN (va PRIMERO para que el ranking lo cuente bien)
    var diamPorPin = parseInt(String(prod.diamantes).replace(/,/g,'')) || 0;
    var totalDiam = diamPorPin * entregados;
    addSpend(totalReal, totalDiam+' Diamantes en PINes ('+entregados+'x '+prod.nombre+')'+descNota+' - Pedido #'+ord);
    if(typeof tgNotifyPurchase==='function') tgNotifyPurchase(authSession.username, entregados+'x PIN '+prod.diamantes+' diamantes'+descNota, totalReal, ord);

    // Mostrar la lista
    _mostrarPinesEntregados(pines.map(function(c){ return {codigo:c}; }), prod.diamantes+' diamantes');

    // Aviso si entregó menos de los pedidos
    if(entregados < cant){
      showToast('\u26A0 Se entregaron '+entregados+' de '+cant+' (se cobro solo lo entregado)', 4500);
    } else {
      showToast('\u2713 '+entregados+' PIN(es) generado(s)!', 3000);
    }
  }).catch(function(e){
    _comprandoPin = false;
    if(btn){ btn.disabled=false; btn.innerHTML='\uD83D\uDD12 Comprar y recibir PIN'; }
    console.error('[PIN MAYOREO] Error:', e);
    showErr('Error de conexion. No se te cobro. Intenta de nuevo.');
  });
}

// Extraer múltiples PINes de la respuesta (busca en todas las estructuras posibles)
function _extraerPines(res, esperados){
  var fuente = res.ra_response || res.data || res;
  var pines = [];

  // Buscar arrays de pines en varios lugares posibles
  var posiblesArrays = [
    fuente.pins,
    fuente.codes,
    fuente.api_data && fuente.api_data.pins,
    fuente.data && fuente.data.api_data && fuente.data.api_data.pins,
    fuente.data && fuente.data.pins,
    fuente.data && fuente.data.codes,
    fuente.data && fuente.data.data,
    fuente.api_data,
    Array.isArray(fuente.data) ? fuente.data : null,
    Array.isArray(fuente) ? fuente : null
  ];

  for(var i=0; i<posiblesArrays.length && !pines.length; i++){
    var arr = posiblesArrays[i];
    if(Array.isArray(arr) && arr.length){
      arr.forEach(function(item){
        if(typeof item === 'string' && item.trim()){ pines.push(item.trim()); }
        else if(item && typeof item === 'object'){
          var c = item.key || item.pin || item.code || item.codigo || item.serial || item.redemption_code || item.voucher;
          if(c) pines.push(String(c));
        }
      });
    }
  }

  // Si no encontró array, buscar un solo pin
  if(!pines.length){
    var uno = _extraerPin(fuente);
    if(uno && uno !== 'Ver detalle en Mis Compras') pines.push(uno);
  }

  return pines;
}

// ═══ Recibo visual de recarga exitosa ═══
function _mostrarReciboRecarga(p, ffId, nombreJugador, status){
  var det = document.getElementById('diam-detalle');
  if(!det) return;

  var ahora = new Date();
  var fecha = ahora.toLocaleDateString('es-MX', { day:'2-digit', month:'2-digit', year:'numeric' });
  var hora = ahora.toLocaleTimeString('es-MX', { hour:'2-digit', minute:'2-digit' });
  var dia = ahora.toLocaleDateString('es-MX', { weekday:'long' });
  dia = dia.charAt(0).toUpperCase() + dia.slice(1);

  var esPend = (status === 'PENDING');
  var colorBorde = esPend ? 'rgba(255,180,60,.4)' : 'rgba(37,211,102,.4)';
  var colorTxt = esPend ? '#22d3ee' : '#25d366';
  var titulo = esPend ? '\u23F3 RECARGA EN PROCESO' : '\u2705 RECARGA EXITOSA';

  det.innerHTML =
    '<div style="background:linear-gradient(160deg,rgba(37,211,102,.08),rgba(255,255,255,.02));border:2px solid '+colorBorde+';border-radius:18px;padding:1.75rem 1.35rem;text-align:center;max-width:420px;margin:0 auto">'
    + '<div style="font-size:2.8rem;margin-bottom:.5rem">'+(esPend?'\u23F3':'\u2705')+'</div>'
    + '<div style="font-family:Oxanium;font-weight:900;font-size:1.25rem;color:'+colorTxt+';margin-bottom:.35rem;letter-spacing:.5px">'+titulo+'</div>'
    + '<div style="font-size:.8rem;color:var(--muted);margin-bottom:1.5rem">'+(esPend?'Tu recarga se acreditara en breve':'Los diamantes ya estan en tu cuenta')+'</div>'

    + '<div style="background:rgba(0,0,0,.25);border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:1rem;text-align:left">'
    +   _filaRecibo('\uD83D\uDC8E Cantidad', p.nombre)
    +   _filaRecibo('\uD83C\uDFAE ID Free Fire', ffId + (nombreJugador ? ' ('+nombreJugador+')' : ''))
    +   _filaRecibo('\uD83D\uDCB5 Precio', fmt(p.precio))
    +   _filaRecibo('\uD83D\uDCC5 Fecha', fecha + ' - ' + dia)
    +   _filaRecibo('\uD83D\uDD52 Hora', hora, true)
    + '</div>'

    + '<button onclick="cerrarDiamDetalle()" style="width:100%;margin-top:1.25rem;padding:.9rem;background:linear-gradient(135deg,#0e7490,#f0b90b);color:#fff;border:none;border-radius:12px;font-family:Poppins;font-weight:700;font-size:.9rem;cursor:pointer">Volver al catalogo</button>'
    + '</div>';

  det.style.display = '';
  document.getElementById('diam-catalogo').style.display = 'none';
  det.scrollIntoView({ behavior:'smooth', block:'center' });
}

function _filaRecibo(label, valor, ultimo){
  return '<div style="display:flex;justify-content:space-between;align-items:center;padding:.6rem 0;'+(ultimo?'':'border-bottom:1px solid rgba(255,255,255,.06)')+'">'
    + '<span style="font-size:.78rem;color:var(--muted)">'+label+'</span>'
    + '<span style="font-size:.82rem;color:#fff;font-weight:600;text-align:right;max-width:60%">'+valor+'</span>'
    + '</div>';
}


// ═══════════ SCAR EVOLUTIVA NIVEL 7 ═══════════
var SCAR_PRECIO = 1500; // MXN
var _comprandoScar = false;

function _updateScarSaldo(){
  var el = document.getElementById('scar-saldo');
  var precioEl = document.getElementById('scar-precio');
  if(el) el.textContent = authSession ? fmt(authSession.saldo||0) : fmt(0);
  if(precioEl) precioEl.textContent = fmt(SCAR_PRECIO);
}

function comprarScar(){
  if(!authSession){ showToast('Inicia sesion para comprar'); setTimeout(showAuthModal,600); return; }
  if(_comprandoScar){ return; }

  var err = document.getElementById('scar-err');
  function showErr(m){ if(err){ err.textContent=m; err.style.display='block'; } }

  var ffId = ((document.getElementById('scar-id')||{}).value||'').trim();
  var user = ((document.getElementById('scar-user')||{}).value||'').trim();
  var wa = ((document.getElementById('scar-wa')||{}).value||'').trim();

  if(!ffId){ showErr('Escribe tu ID de Free Fire.'); return; }
  if(!user){ showErr('Escribe tu nombre de usuario.'); return; }
  if(!wa){ showErr('Escribe tu WhatsApp.'); return; }

  var saldo = authSession.saldo||0;
  if(saldo < SCAR_PRECIO){ showErr('Saldo insuficiente ('+fmt(saldo)+'). Necesitas '+fmt(SCAR_PRECIO)+'. Recarga tu cuenta.'); return; }
  if(err) err.style.display='none';

  _comprandoScar = true;
  var btn = event && event.target ? event.target : null;
  if(btn){ btn.disabled=true; btn.innerHTML='Procesando...'; }

  var ord = getNextOrder();
  addSpend(SCAR_PRECIO, 'SCAR Evolutiva Nivel 7 - ID:'+ffId+' - User:'+user+' - WA:'+wa+' - Pedido #'+ord);
  registrarPedido('SCAR Evolutiva Nivel 7 (2-3 semanas)', 0, 'skin', ffId, SCAR_PRECIO, 0);
  if(typeof tgNotifyPurchase==='function') tgNotifyPurchase(authSession.username, 'SCAR EVOLUTIVA N7 - ID:'+ffId+' - User:'+user+' - WA:'+wa, SCAR_PRECIO, ord);

  _mostrarReciboScar(ffId, user, ord);
  showToast('\u2705 Pedido #'+ord+' realizado!', 3000);

  setTimeout(function(){ _comprandoScar = false; if(btn){ btn.disabled=false; btn.innerHTML='\uD83D\uDC8E COMPRAR CON SALDO'; } }, 3000);
}

// Recibo de la compra de SCAR
function _mostrarReciboScar(ffId, user, ord){
  var ahora = new Date();
  var fecha = ahora.toLocaleDateString('es-MX', { day:'2-digit', month:'2-digit', year:'numeric' });
  var hora = ahora.toLocaleTimeString('es-MX', { hour:'2-digit', minute:'2-digit' });

  var cont = document.getElementById('page-codigos');
  if(!cont) return;
  var wrap = cont.querySelector('div[style*="max-width:620px"]');
  if(!wrap) return;

  wrap.innerHTML =
    '<div style="background:linear-gradient(160deg,rgba(255,180,60,.08),rgba(255,255,255,.02));border:2px solid rgba(255,180,60,.35);border-radius:18px;padding:2rem 1.35rem;text-align:center;max-width:440px;margin:2rem auto">'
    + '<div style="font-size:3rem;margin-bottom:.5rem">\u2705</div>'
    + '<div style="font-family:Oxanium;font-weight:900;font-size:1.3rem;color:#25d366;margin-bottom:.35rem;letter-spacing:.5px">PEDIDO CONFIRMADO</div>'
    + '<div style="font-size:.82rem;color:var(--muted);margin-bottom:1.5rem">Tu SCAR Evolutiva esta en proceso</div>'
    + '<div style="background:rgba(0,0,0,.25);border-radius:99px;height:10px;overflow:hidden;margin-bottom:1.5rem"><div style="height:100%;width:25%;border-radius:99px;background:linear-gradient(90deg,#22d3ee,#ff9900);box-shadow:0 0 12px rgba(255,180,60,.5)"></div></div>'
    + '<div style="background:rgba(0,0,0,.25);border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:1rem;text-align:left">'
    +   _filaRecibo('\uD83D\uDCCB Pedido', '#'+ord)
    +   _filaRecibo('\uD83D\uDD2B Producto', 'SCAR Evolutiva Nivel 7')
    +   _filaRecibo('\uD83C\uDFAE ID', ffId)
    +   _filaRecibo('\uD83D\uDC64 Usuario', user)
    +   _filaRecibo('\uD83D\uDCB5 Precio', fmt(SCAR_PRECIO))
    +   _filaRecibo('\u23F3 Entrega', '2 a 3 semanas')
    +   _filaRecibo('\uD83D\uDCC5 Fecha', fecha + ' \u00B7 ' + hora, true)
    + '</div>'
    + '<div style="font-size:.75rem;color:#22d3ee;margin-top:1rem;line-height:1.5">Te contactaremos por WhatsApp. La skin llega en 2-3 semanas al correo de tu cuenta.</div>'
    + '<button onclick="goPage(\'home\')" style="width:100%;margin-top:1.25rem;padding:.9rem;background:linear-gradient(135deg,#0e7490,#f0b90b);color:#fff;border:none;border-radius:12px;font-family:Poppins;font-weight:700;font-size:.9rem;cursor:pointer">Volver al inicio</button>'
    + '</div>';
  wrap.scrollIntoView({ behavior:'smooth', block:'start' });
}


// ═══ Botón de WhatsApp ARRASTRABLE ═══
var _waDragged = false;
(function initWaDrag(){
  function setup(){
    var btn = document.getElementById('wa-float-btn');
    if(!btn){ setTimeout(setup, 500); return; }

    var arrastrando = false, offsetX = 0, offsetY = 0, startX = 0, startY = 0;

    function inicio(e){
      arrastrando = true;
      _waDragged = false;
      var punto = e.touches ? e.touches[0] : e;
      var rect = btn.getBoundingClientRect();
      offsetX = punto.clientX - rect.left;
      offsetY = punto.clientY - rect.top;
      startX = punto.clientX;
      startY = punto.clientY;
      btn.style.transition = 'none';
    }

    function mover(e){
      if(!arrastrando) return;
      var punto = e.touches ? e.touches[0] : e;
      // Si se movió más de 6px, cuenta como arrastre (no clic)
      if(Math.abs(punto.clientX-startX) > 6 || Math.abs(punto.clientY-startY) > 6){
        _waDragged = true;
      }
      var x = punto.clientX - offsetX;
      var y = punto.clientY - offsetY;
      // Limitar a la pantalla
      x = Math.max(4, Math.min(x, window.innerWidth - btn.offsetWidth - 4));
      y = Math.max(4, Math.min(y, window.innerHeight - btn.offsetHeight - 4));
      btn.style.left = x + 'px';
      btn.style.top = y + 'px';
      btn.style.bottom = 'auto';
      btn.style.right = 'auto';
      if(e.cancelable) e.preventDefault();
    }

    function fin(){
      arrastrando = false;
      btn.style.transition = '';
      // Resetear la bandera después de un momento (para que el clic funcione luego)
      setTimeout(function(){ _waDragged = false; }, 100);
    }

    btn.addEventListener('mousedown', inicio);
    document.addEventListener('mousemove', mover);
    document.addEventListener('mouseup', fin);
    btn.addEventListener('touchstart', inicio, {passive:true});
    document.addEventListener('touchmove', mover, {passive:false});
    document.addEventListener('touchend', fin);
  }
  setup();
})();


// ═══════════ VENTA DE CLANES NIVEL 7 ═══════════
var CLANES = [
  {
    id: 'cjng',
    nombre: 'CJNG OF1C1AL',
    nivel: 'En proceso de ser Nivel 7',
    honor: '~400,000',
    precio: 500,
    img: 'img/clan-cjng.jpg',
    vendido: true
  }
];
var _comprandoClan = false;

function renderClanes(){
  var cont = document.getElementById('clanes-lista');
  if(!cont) return;
  if(!CLANES.length){
    cont.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--muted)">Pronto mas clanes disponibles</div>';
    return;
  }

  cont.innerHTML = CLANES.map(function(c){
    return '<div style="background:linear-gradient(160deg,rgba(255,179,0,.08),rgba(20,15,8,.4));border:1px solid rgba(255,179,0,.3);border-radius:20px;overflow:hidden;margin-bottom:1.5rem">'
      + '<div style="position:relative;background:radial-gradient(circle at center,rgba(255,179,0,.12),transparent);padding:1.5rem 1.5rem 0">'
      +   '<div style="position:absolute;top:1rem;right:1rem;background:linear-gradient(90deg,#ffb300,#ff8800);color:#fff;font-family:Oxanium;font-weight:800;font-size:.68rem;padding:.35rem .85rem;border-radius:99px;letter-spacing:.5px;z-index:2;box-shadow:0 4px 14px rgba(255,179,0,.4)">'+(c.vendido?'VENDIDO':'NIVEL 7')+'</div>'
      +   '<img src="'+c.img+'" alt="'+c.nombre+'" style="width:100%;border-radius:14px;display:block'+(c.vendido?";filter:grayscale(85%) brightness(.55)":"")+'" onerror="this.style.display=\'none\'"/>'
      +   (c.vendido ? '<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-12deg);background:rgba(255,68,68,.92);color:#fff;font-family:Oxanium;font-weight:900;font-size:1.5rem;letter-spacing:4px;padding:.5rem 2rem;border-radius:8px;z-index:3;box-shadow:0 8px 30px rgba(0,0,0,.6)">VENDIDO</div>' : '')
      + '</div>'
      + '<div style="padding:1.5rem">'
      +   '<div style="font-family:Oxanium;font-weight:800;font-size:1.4rem;color:#fff;margin-bottom:.75rem">&#129409; '+c.nombre+'</div>'
      +   '<div style="display:flex;flex-direction:column;gap:.6rem;margin-bottom:1.35rem">'
      +     '<div style="display:flex;align-items:center;gap:.6rem;font-size:.85rem;color:#e8ecf4"><span style="color:#ffb300">&#127894;</span> Nivel: <b>'+c.nivel+'</b></div>'
      +     '<div style="display:flex;align-items:center;gap:.6rem;font-size:.85rem;color:#e8ecf4"><span style="color:#ffb300">&#128081;</span> Honor aprox: <b>'+c.honor+'</b></div>'
      +   '</div>'
      +   '<div style="display:flex;align-items:baseline;gap:.5rem;margin-bottom:1.35rem;padding:1rem;background:rgba(255,179,0,.06);border:1px solid rgba(255,179,0,.2);border-radius:12px">'
      +     '<span style="font-size:.75rem;color:var(--muted)">Precio:</span>'
      +     '<span style="font-family:Oxanium;font-weight:900;font-size:1.7rem;color:#ffb300">'+fmt(c.precio)+'</span>'
      +   '</div>'
      +   (c.vendido ? '' :
            '<div style="font-family:Oxanium;font-weight:700;font-size:.95rem;color:#fff;margin-bottom:.85rem">Datos para la entrega</div>'
      +   '<label class="flabel">ID de la cuenta a entregar *</label>'
      +   '<input class="finput" id="clan-id-'+c.id+'" type="text" placeholder="ID de tu cuenta de Free Fire"/>'
      +   '<label class="flabel">Usuario del panel *</label>'
      +   '<input class="finput" id="clan-user-'+c.id+'" type="text" placeholder="Tu usuario de CiberStore"/>'
      +   '<label class="flabel">WhatsApp *</label>'
      +   '<input class="finput" id="clan-wa-'+c.id+'" type="text" placeholder="Tu numero de WhatsApp"/>'
      +   '<div style="display:flex;justify-content:space-between;background:rgba(255,255,255,.03);border:1px solid var(--border);border-radius:10px;padding:.7rem 1rem;margin:1rem 0"><span style="font-size:.8rem;color:var(--muted)">Tu saldo</span><span id="clan-saldo-'+c.id+'" style="font-family:Oxanium;font-weight:700;color:#25d366">'+fmt(0)+'</span></div>'
      +   '<div id="clan-err-'+c.id+'" style="display:none;background:rgba(255,60,60,.1);border:1px solid rgba(255,60,60,.3);color:#ff6b6b;border-radius:9px;padding:.7rem .9rem;font-size:.8rem;margin-bottom:.85rem"></div>')
      +   (c.vendido ? '<div style="width:100%;padding:1rem;background:rgba(255,68,68,.08);border:1px solid rgba(255,68,68,.3);color:#ff6b6b;border-radius:12px;font-family:Oxanium;font-weight:900;font-size:.95rem;letter-spacing:.5px;text-align:center;box-sizing:border-box">VENDIDO - NO DISPONIBLE</div>' : '') + (c.vendido ? '' : '<button onclick="comprarClan(\''+c.id+'\')" style="width:100%;padding:1rem;background:linear-gradient(135deg,#ffb300,#ff8800);color:#fff;border:none;border-radius:12px;font-family:Oxanium;font-weight:900;font-size:.95rem;letter-spacing:.5px;cursor:pointer;box-shadow:0 6px 20px rgba(255,179,0,.3)">&#129409; COMPRAR CON SALDO</button>')
      +   (c.vendido ? '' : '<div style="font-size:.7rem;color:var(--muted);text-align:center;margin-top:.85rem;line-height:1.5">Despues de pagar, te contactaremos por WhatsApp (o tu a nosotros) para coordinar la entrega del clan.</div>')
      + '</div>'
      + '</div>';
  }).join('');

  _updateClanSaldos();
}

function _updateClanSaldos(){
  CLANES.forEach(function(c){
    var el = document.getElementById('clan-saldo-'+c.id);
    if(el) el.textContent = authSession ? fmt(authSession.saldo||0) : fmt(0);
  });
}

function comprarClan(clanId){
  if(!authSession){ showToast('Inicia sesion para comprar'); setTimeout(showAuthModal,600); return; }
  if(_comprandoClan){ return; }

  var c = CLANES.filter(function(x){ return x.id===clanId; })[0];
  if(!c) return;
  if(c.vendido){ showToast('Este clan ya fue vendido'); return; }

  var err = document.getElementById('clan-err-'+clanId);
  function showErr(m){ if(err){ err.textContent=m; err.style.display='block'; } }

  var ffId = ((document.getElementById('clan-id-'+clanId)||{}).value||'').trim();
  var user = ((document.getElementById('clan-user-'+clanId)||{}).value||'').trim();
  var wa = ((document.getElementById('clan-wa-'+clanId)||{}).value||'').trim();

  if(!ffId){ showErr('Escribe el ID de la cuenta.'); return; }
  if(!user){ showErr('Escribe tu usuario del panel.'); return; }
  if(!wa){ showErr('Escribe tu WhatsApp.'); return; }

  var saldo = authSession.saldo||0;
  if(saldo < c.precio){ showErr('Saldo insuficiente ('+fmt(saldo)+'). Necesitas '+fmt(c.precio)+'.'); return; }
  if(err) err.style.display='none';

  _comprandoClan = true;

  var ord = getNextOrder();
  addSpend(c.precio, 'Clan '+c.nombre+' (Nivel 7) - ID:'+ffId+' - User:'+user+' - WA:'+wa+' - Pedido #'+ord);
  registrarPedido('Clan '+c.nombre+' (entrega por WhatsApp)', 0, 'clan', ffId, c.precio, 0);
  if(typeof tgNotifyPurchase==='function') tgNotifyPurchase(authSession.username, 'CLAN '+c.nombre+' - ID:'+ffId+' - User:'+user+' - WA:'+wa, c.precio, ord);

  _mostrarReciboClan(c, ffId, user, ord);
  showToast('\u2705 Pedido #'+ord+' realizado!', 3000);

  setTimeout(function(){ _comprandoClan = false; }, 3000);
}

function _mostrarReciboClan(c, ffId, user, ord){
  var ahora = new Date();
  var fecha = ahora.toLocaleDateString('es-MX', { day:'2-digit', month:'2-digit', year:'numeric' });
  var hora = ahora.toLocaleTimeString('es-MX', { hour:'2-digit', minute:'2-digit' });

  var cont = document.getElementById('clanes-lista');
  if(!cont) return;

  cont.innerHTML =
    '<div style="background:linear-gradient(160deg,rgba(37,211,102,.08),rgba(255,255,255,.02));border:2px solid rgba(37,211,102,.35);border-radius:18px;padding:2rem 1.35rem;text-align:center;max-width:440px;margin:1rem auto">'
    + '<div style="font-size:3rem;margin-bottom:.5rem">\u2705</div>'
    + '<div style="font-family:Oxanium;font-weight:900;font-size:1.3rem;color:#25d366;margin-bottom:.35rem;letter-spacing:.5px">PEDIDO CONFIRMADO</div>'
    + '<div style="font-size:.82rem;color:var(--muted);margin-bottom:1.5rem">Te contactaremos para entregar tu clan</div>'
    + '<div style="background:rgba(0,0,0,.25);border-radius:99px;height:10px;overflow:hidden;margin-bottom:1.5rem"><div style="height:100%;width:25%;border-radius:99px;background:linear-gradient(90deg,#ffb300,#ff8800);box-shadow:0 0 12px rgba(255,179,0,.5)"></div></div>'
    + '<div style="background:rgba(0,0,0,.25);border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:1rem;text-align:left">'
    +   _filaRecibo('\uD83D\uDCCB Pedido', '#'+ord)
    +   _filaRecibo('\uD83E\uDD81 Clan', c.nombre)
    +   _filaRecibo('\uD83C\uDFAE ID cuenta', ffId)
    +   _filaRecibo('\uD83D\uDC64 Usuario', user)
    +   _filaRecibo('\uD83D\uDCB5 Precio', fmt(c.precio))
    +   _filaRecibo('\uD83D\uDCC5 Fecha', fecha + ' \u00B7 ' + hora, true)
    + '</div>'
    + '<div style="font-size:.75rem;color:#ffb300;margin-top:1rem;line-height:1.5">Te contactaremos por WhatsApp para coordinar la entrega. Tambien puedes escribirnos tu.</div>'
    + '<button onclick="openSmartWA()" style="width:100%;margin-top:1rem;padding:.9rem;background:linear-gradient(135deg,#128c3e,#25d366);color:#fff;border:none;border-radius:12px;font-family:Poppins;font-weight:700;font-size:.9rem;cursor:pointer">\uD83D\uDCF1 Contactar por WhatsApp</button>'
    + '<button onclick="goPage(\'home\')" style="width:100%;margin-top:.6rem;padding:.9rem;background:rgba(255,255,255,.05);color:#fff;border:1px solid var(--border);border-radius:12px;font-family:Poppins;font-weight:700;font-size:.9rem;cursor:pointer">Volver al inicio</button>'
    + '</div>';
  cont.scrollIntoView({ behavior:'smooth', block:'start' });
}


// ═══════════ AJUSTE ATÓMICO DE SALDO (arregla el bug del dinero) ═══════════
// Llama a la funcion de Postgres que suma/resta el saldo en UNA sola operacion.
// Asi es imposible que dos operaciones se pisen y se pierda dinero.
var _SB_URL_RPC = (typeof SB_URL !== 'undefined' && SB_URL) ? SB_URL : 'https://pnotsqsudqpwqzssevig.supabase.co';

function _rpcAjustarSaldo(userId, delta){
  var key = (typeof SUPABASE_ANON !== 'undefined' && SUPABASE_ANON) ? SUPABASE_ANON : '';
  // Reintentar detectar la key si no la tenemos (por si supabase.js cargo despues)
  if(!key && typeof _detectarAnonKey === 'function'){
    key = _detectarAnonKey();
    if(key) SUPABASE_ANON = key;
  }
  if(!key) return Promise.reject(new Error('No se encontro la anon key de Supabase'));
  return fetch(_SB_URL_RPC + '/rest/v1/rpc/ajustar_saldo', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': key,
      'Authorization': 'Bearer ' + key
    },
    body: JSON.stringify({ p_user_id: userId, p_delta: delta })
  }).then(function(r){
    if(!r.ok) return r.text().then(function(t){ throw new Error(t || ('HTTP '+r.status)); });
    return r.json();
  });
}

function _rpcAjustarSaldoUsername(username, delta){
  var key = (typeof SUPABASE_ANON !== 'undefined' && SUPABASE_ANON) ? SUPABASE_ANON : '';
  if(!key) return Promise.reject(new Error('Sin key'));
  return fetch(_SB_URL_RPC + '/rest/v1/rpc/ajustar_saldo_username', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': key,
      'Authorization': 'Bearer ' + key
    },
    body: JSON.stringify({ p_username: username, p_delta: delta })
  }).then(function(r){
    if(!r.ok) return r.text().then(function(t){ throw new Error(t || ('HTTP '+r.status)); });
    return r.json();
  });
}


// ═══════════ SOLICITAR REEMBOLSO ═══════════
var _enviandoReembolso = false;
var _reembMovs = []; // movimientos cargados en el selector

function toggleReembolso(){
  var form = document.getElementById('reembolso-form');
  var arrow = document.getElementById('reembolso-arrow');
  if(!form) return;
  var abierto = form.style.display !== 'none';
  form.style.display = abierto ? 'none' : 'block';
  if(arrow) arrow.style.transform = abierto ? '' : 'rotate(180deg)';
  if(!abierto){
    _cargarPedidosReembolso();
    // Prellenar WhatsApp si lo tenemos
    var wa = document.getElementById('reemb-wa');
    if(wa && !wa.value && authSession && authSession.whatsapp) wa.value = authSession.whatsapp;
    form.scrollIntoView({behavior:'smooth', block:'nearest'});
  }
}

// Llena el selector con las compras del usuario
function _cargarPedidosReembolso(){
  var sel = document.getElementById('reemb-pedido');
  if(!sel) return;
  if(!authSession || !authSession.id || typeof sbGetMovimientos !== 'function'){
    sel.innerHTML = '<option value="">No se pudieron cargar</option>';
    return;
  }
  sbGetMovimientos(authSession.id).then(function(rows){
    if(!rows || !rows.length){
      sel.innerHTML = '<option value="">No tienes compras registradas</option>';
      return;
    }
    // Solo compras (debitos), no recargas
    var compras = rows.filter(function(m){
      return m.tipo !== 'credito' && m.tipo !== 'ajuste' && m.tipo !== 'recarga';
    });
    if(!compras.length){
      sel.innerHTML = '<option value="">No tienes compras registradas</option>';
      return;
    }
    _reembMovs = compras.slice(0,25);
    var h = '<option value="">Selecciona el pedido</option>';
    _reembMovs.forEach(function(m, i){
      var fechaTxt = m.created_at ? new Date(m.created_at).toLocaleDateString('es-MX',{day:'2-digit',month:'short'}) : '';
      var desc = (m.descripcion || 'Compra');
      var corto = desc.length > 55 ? desc.substring(0,55)+'...' : desc;
      var etiqueta = corto + ' - ' + fmt(m.monto||0) + (fechaTxt ? ' ('+fechaTxt+')' : '');
      h += '<option value="'+i+'">'+etiqueta+'</option>';
    });
    h += '<option value="otro">Otro pedido no listado</option>';
    sel.innerHTML = h;
  }).catch(function(){
    sel.innerHTML = '<option value="">Error al cargar</option><option value="Otro pedido no listado">Otro pedido no listado</option>';
  });
}

function enviarReembolso(){
  if(!authSession){ showToast('Inicia sesion primero'); setTimeout(showAuthModal,600); return; }
  if(_enviandoReembolso){ return; }

  var err = document.getElementById('reemb-err');
  function showErr(m){ if(err){ err.textContent=m; err.style.display='block'; } }

  var idxSel = ((document.getElementById('reemb-pedido')||{}).value||'').trim();
  var motivo = ((document.getElementById('reemb-motivo')||{}).value||'').trim();
  var detalle = ((document.getElementById('reemb-detalle')||{}).value||'').trim();
  var wa = ((document.getElementById('reemb-wa')||{}).value||'').trim();

  if(!idxSel){ showErr('Selecciona el pedido del que quieres reembolso.'); return; }
  if(!motivo){ showErr('Selecciona el motivo.'); return; }
  if(detalle.length < 10){ showErr('Explica un poco mas que paso (minimo 10 caracteres).'); return; }
  if(!wa || wa.replace(/\D/g,'').length < 8){ showErr('Escribe un WhatsApp valido.'); return; }
  if(err) err.style.display='none';

  // Obtener descripcion y monto del pedido elegido
  var pedidoTxt = 'Otro pedido no listado';
  var montoMxn = 0;
  if(idxSel !== 'otro'){
    var mov = _reembMovs[parseInt(idxSel)];
    if(mov){
      var fTxt = mov.created_at ? new Date(mov.created_at).toLocaleDateString('es-MX',{day:'2-digit',month:'short'}) : '';
      pedidoTxt = (mov.descripcion||'Compra') + (fTxt ? ' ('+fTxt+')' : '');
      montoMxn = Number(mov.monto) || 0;
    }
  }

  _enviandoReembolso = true;
  var btnRe = event && event.target ? event.target : null;
  if(btnRe){ btnRe.disabled = true; btnRe.innerHTML = 'Enviando...'; }

  fetch(NOTIF_RETIRO_URL, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({
      tipo: 'reembolso',
      username: authSession.username,
      monto_mxn: montoMxn,
      pedido: pedidoTxt,
      motivo: motivo,
      detalle: detalle,
      whatsapp: wa
    })
  }).then(function(r){ return r.json(); }).then(function(res){
    _enviandoReembolso = false;
    if(btnRe){ btnRe.disabled=false; btnRe.innerHTML='ENVIAR SOLICITUD'; }
    if(res && res.success){
      _mostrarReembolsoEnviado(motivo);
    } else {
      showErr('No se pudo enviar: '+((res&&res.error)||'error'));
    }
  }).catch(function(){
    _enviandoReembolso = false;
    if(btnRe){ btnRe.disabled=false; btnRe.innerHTML='ENVIAR SOLICITUD'; }
    showErr('Error de conexion. Intenta de nuevo.');
  });
}

function _mostrarReembolsoEnviado(motivo){
  var form = document.getElementById('reembolso-form');
  if(!form) return;
  form.innerHTML =
    '<div style="text-align:center;padding:1.25rem .5rem">'
    + '<div style="font-size:2.4rem;margin-bottom:.5rem">\u2705</div>'
    + '<div style="font-family:Oxanium;font-weight:900;font-size:1rem;color:#25d366;margin-bottom:.4rem">SOLICITUD ENVIADA</div>'
    + '<div style="font-size:.78rem;color:var(--muted);line-height:1.6;margin-bottom:1rem">Recibimos tu solicitud por <b style="color:#fff">'+motivo+'</b>.<br/>La revisaremos y te contactaremos por WhatsApp.</div>'
    + '<button onclick="openSmartWA()" style="width:100%;padding:.85rem;background:linear-gradient(135deg,#128c3e,#25d366);color:#fff;border:none;border-radius:11px;font-family:Poppins;font-weight:700;font-size:.85rem;cursor:pointer">\uD83D\uDCF1 Escribirnos por WhatsApp</button>'
    + '</div>';
}


// ═══════════ GESTION DE ENTREGAS (admin cambia estado de pedidos) ═══════════
var _ESTADOS_FLUJO = ['pendiente','procesando','enviado','completado'];
var _ESTADOS_NOMBRE = {
  pendiente:'\uD83D\uDCE5 Recibido',
  procesando:'\u2699\uFE0F Preparando',
  enviado:'\uD83D\uDE9A Enviado',
  completado:'\u2705 Entregado',
  rechazado:'\u274C Rechazado'
};

function admLoadEntregas(){
  var cont = document.getElementById('adm-entregas-lista');
  if(!cont) return;
  cont.innerHTML = '<div style="text-align:center;color:var(--muted);padding:1.5rem;font-size:.82rem">Cargando...</div>';

  var userF = ((document.getElementById('adm-entrega-user')||{}).value||'').trim().toLowerCase();
  var qs = 'order=created_at.desc&limit=60';
  if(userF) qs = 'username=eq.'+encodeURIComponent(userF)+'&order=created_at.desc&limit=60';

  sb.get('pedidos', qs).then(function(peds){
    if(!peds || !peds.length){
      cont.innerHTML = '<div style="text-align:center;color:var(--muted);padding:1.5rem;font-size:.82rem">Sin pedidos</div>';
      return;
    }
    var h = '';
    peds.forEach(function(p){
      var estActual = p.estado || 'pendiente';
      if(estActual === 'rechazado'){
        h += _tarjetaEntrega(p, estActual, true);
      } else {
        h += _tarjetaEntrega(p, estActual, false);
      }
    });
    cont.innerHTML = h;
  }).catch(function(){
    cont.innerHTML = '<div style="text-align:center;color:#ff6b6b;padding:1.5rem;font-size:.82rem">Error al cargar</div>';
  });
}

function _tarjetaEntrega(p, estActual, rechazado){
  var fecha = p.created_at ? new Date(p.created_at).toLocaleString('es-MX',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}) : '';
  var botones = '';
  if(!rechazado){
    _ESTADOS_FLUJO.forEach(function(est){
      var activo = (est === estActual);
      botones += '<button onclick="admSetEstado(\''+p.id+'\',\''+est+'\')" style="flex:1;min-width:70px;padding:.45rem .3rem;border-radius:8px;font-family:Oxanium;font-weight:700;font-size:.65rem;cursor:pointer;border:1px solid '
        + (activo?'#67e8f9;background:linear-gradient(90deg,#67e8f9,#0e7490);color:#fff':'rgba(255,255,255,.1);background:rgba(255,255,255,.03);color:var(--muted)')+'">'
        + _ESTADOS_NOMBRE[est].replace(/[^\x00-\x7F ]/g,'').trim() + '</button>';
    });
  }
  return '<div style="background:rgba(255,255,255,.02);border:1px solid var(--border);border-radius:12px;padding:.9rem 1rem">'
    + '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:.5rem;margin-bottom:.7rem">'
    +   '<div><div style="font-weight:700;color:#fff;font-size:.85rem">'+_esc(p.producto||'Pedido')+'</div>'
    +   '<div style="font-size:.7rem;color:var(--muted);margin-top:.2rem">'+_esc(p.username||'')+(p.ff_id?(' \u00b7 ID: '+_esc(p.ff_id)):'')+' \u00b7 '+fecha+'</div></div>'
    +   '<span style="font-size:.68rem;font-weight:700;color:#a5f3fc;white-space:nowrap">'+(_ESTADOS_NOMBRE[estActual]||estActual)+'</span>'
    + '</div>'
    + (rechazado ? '<div style="font-size:.72rem;color:#ff6b6b">Pedido rechazado</div>'
       : '<div style="display:flex;gap:.35rem;flex-wrap:wrap">'+botones+'</div>'
         + '<button onclick="admSetEstado(\''+p.id+'\',\'rechazado\')" style="width:100%;margin-top:.5rem;padding:.4rem;border-radius:8px;background:rgba(255,80,80,.08);border:1px solid rgba(255,80,80,.25);color:#ff6b6b;font-family:Oxanium;font-weight:700;font-size:.65rem;cursor:pointer">Rechazar pedido</button>')
    + '</div>';
}

function admSetEstado(pedidoId, nuevoEstado){
  if(typeof sb === 'undefined' || !sb.patch){
    showToast('No se puede actualizar ahora');
    return;
  }
  // Calcular progreso segun el estado
  var pct = { pendiente:15, procesando:50, enviado:80, completado:100, rechazado:0 }[nuevoEstado] || 0;

  sb.patch('pedidos', { estado: nuevoEstado }, 'id=eq.'+encodeURIComponent(pedidoId)).then(function(){
    showToast('\u2705 Estado actualizado a '+(_ESTADOS_NOMBRE[nuevoEstado]||nuevoEstado), 2500);
    admLoadEntregas();
  }).catch(function(e){
    console.error('[ENTREGA]', e);
    showToast('Error al actualizar. Revisa que la tabla pedidos permita UPDATE.', 4000);
  });
}

// ═══════════ SOBRE LA PAGINA (tabs: reseñas, terminos, contacto) ═══════════
function sobreTab(tab){
  ['resenas','terminos','contacto'].forEach(function(t){
    var cont = document.getElementById('sobre-'+t);
    var btn = document.getElementById('sobretab-'+t);
    if(cont) cont.style.display = (t===tab)?'':'none';
    if(btn){
      if(t===tab){
        btn.style.background='linear-gradient(90deg,var(--c2),var(--c1))';
        btn.style.color='#fff';
      } else {
        btn.style.background='transparent';
        btn.style.color='var(--muted)';
      }
    }
  });
  if(tab==='resenas') renderResenasFull();
}

// Renderiza TODAS las reseñas en la página Sobre
function renderResenasFull(){
  var grid = document.getElementById('sobre-resenas-grid');
  var summary = document.getElementById('sobre-resenas-summary');
  if(!grid) return;
  if(typeof sb === 'undefined' || !sb.get){ return; }
  grid.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--muted);font-size:.82rem;grid-column:1/-1">Cargando...</div>';
  sb.get('resenas', 'order=created_at.desc&limit=100').then(function(rows){
    if(!rows || !rows.length){
      grid.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--muted);font-size:.82rem;grid-column:1/-1;background:var(--card);border:1px solid var(--border);border-radius:11px">Aun no hay resenas. Se el primero!</div>';
      if(summary) summary.textContent = 'Se el primero en opinar';
      return;
    }
    var avg = (rows.reduce(function(s, r){ return s + r.stars; }, 0) / rows.length).toFixed(1);
    if(summary && typeof _estrellasHTML === 'function'){
      summary.innerHTML = _estrellasHTML(parseFloat(avg)) + ' <b style="color:#fff">'+avg+'</b> de 5 \u00b7 '+rows.length+' resena'+(rows.length!==1?'s':'');
    }
    var h = '';
    rows.forEach(function(r){
      var inicial = (r.username || 'U').charAt(0).toUpperCase();
      var color = (typeof _avatarColor==='function') ? _avatarColor(r.username) : '#0e7490';
      var tiempo = (typeof _tiempoRelativo==='function') ? _tiempoRelativo(r.created_at) : '';
      var estrellas = (typeof _estrellasHTML==='function') ? _estrellasHTML(r.stars) : '';

      h += '<div style="background:linear-gradient(160deg,rgba(255,255,255,.025),rgba(255,255,255,.01));border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:1.1rem;display:flex;flex-direction:column;gap:.7rem">'
        + '<div style="display:flex;align-items:center;gap:.65rem">'
        +   '<div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,'+color+','+color+'aa);display:flex;align-items:center;justify-content:center;font-family:Oxanium;font-weight:800;font-size:1.05rem;color:#fff;flex-shrink:0;box-shadow:0 3px 10px '+color+'55">'+inicial+'</div>'
        +   '<div style="flex:1;min-width:0">'
        +     '<div style="display:flex;align-items:center;gap:.35rem"><span style="font-size:.85rem;font-weight:700;color:#fff">'+r.username+'</span><span style="color:#25d366;font-size:.7rem">\u2714\uFE0F</span></div>'
        +     '<div style="font-size:.62rem;color:var(--muted)">'+tiempo+'</div>'
        +   '</div>'
        + '</div>'
        + '<div style="display:flex;align-items:center;gap:.5rem">'+estrellas+'<span style="font-size:.65rem;color:#25d366;font-weight:700;background:rgba(37,211,102,.1);padding:.1rem .45rem;border-radius:99px">Compra verificada</span></div>'
        + '<div style="font-size:.68rem;color:#67e8f9;font-weight:600">\uD83D\uDCE6 '+r.servicio+'</div>'
        + '<div style="font-size:.8rem;color:#c5cad6;line-height:1.6">\u201c'+r.texto+'\u201d</div>'
        + '</div>';
    });
    grid.innerHTML = h;
  }).catch(function(){ grid.innerHTML = '<div style="text-align:center;padding:1.5rem;color:var(--muted);grid-column:1/-1">Error al cargar.</div>'; });
}


// ═══════════ DASHBOARD DEL INICIO ═══════════
function renderHomeDashboard(){
  // Saludo
  var hola = document.getElementById('home-hola');
  if(hola){
    var nom = authSession ? (authSession.username || 'Jugador') : 'Bienvenido';
    hola.textContent = authSession ? ('Hola, ' + nom) : 'Bienvenido';
  }

  // Fecha en espanol
  var fe = document.getElementById('home-fecha');
  if(fe){
    var d = new Date();
    var txt = d.toLocaleDateString('es-MX', { weekday:'long', day:'numeric', month:'long' });
    fe.textContent = txt.charAt(0).toUpperCase() + txt.slice(1);
  }

  // Saldo + moneda alterna
  function _pintarSaldoHome(saldo){
    var sal = document.getElementById('home-saldo');
    var alt = document.getElementById('home-saldo-alt');
    if(sal){ sal.textContent = fmt(saldo); sal.style.color='#fff'; }
    if(alt){
      var otra = (CURRENCY === 'MXN') ? 'USD' : 'MXN';
      var val = saldo * (RATES[otra] || 1);
      alt.textContent = (CUR_SYM[otra]||'$') + val.toLocaleString('es-MX',{minimumFractionDigits:2,maximumFractionDigits:2}) + (CUR_SUF[otra]||'') + '  \u00B7  ' + CURRENCY;
    }
  }
  _pintarSaldoHome((authSession && authSession.saldo) ? authSession.saldo : 0);

  // Consultar el saldo FRESCO de la base de datos (tiempo real)
  if(authSession && authSession.id && typeof sbGetById === 'function'){
    sbGetById(authSession.id).then(function(u){
      if(u && !u.banned){
        authSession = u;
        _pintarSaldoHome(u.saldo || 0);
        var hola2 = document.getElementById('home-hola');
        if(hola2) hola2.textContent = 'Hola, ' + (u.username || 'Jugador');
      }
    }).catch(function(){});
  }

  // Estadisticas del usuario (desde sus movimientos)
  if(!authSession || !authSession.id || typeof sbGetMovimientos !== 'function'){
    _pintarStatsHome(0, 0, 0, 0);
    return;
  }
  sbGetMovimientos(authSession.id).then(function(rows){
    if(!rows || !rows.length){ _pintarStatsHome(0,0,0,0); return; }
    var pedidos = 0, diam = 0, likes = 0, gasto = 0;
    rows.forEach(function(m){
      var esGasto = !(m.tipo==='credito' || m.tipo==='ajuste' || m.tipo==='recarga');
      if(!esGasto) return;
      pedidos++;
      gasto += Number(m.monto) || 0;
      var desc = m.descripcion || '';
      var md = desc.match(/(\d[\d,]*)\s*[Dd]iamante/);
      if(md) diam += parseInt(md[1].replace(/,/g,'')) || 0;
      var ml = desc.match(/(\d[\d,]*)\s*[Ll]ike/);
      if(ml) likes += parseInt(ml[1].replace(/,/g,'')) || 0;
    });
    _pintarStatsHome(pedidos, diam, likes, gasto);
  }).catch(function(){ _pintarStatsHome(0,0,0,0); });
}

function _pintarStatsHome(pedidos, diam, likes, gasto){
  var d = document.getElementById('home-diam');
  if(d) d.textContent = diam.toLocaleString('es-MX');
  var p = document.getElementById('home-st-pedidos');
  if(p) p.textContent = pedidos.toLocaleString('es-MX');
  var l = document.getElementById('home-st-likes');
  if(l) l.textContent = likes.toLocaleString('es-MX');
  var g = document.getElementById('home-st-gasto');
  if(g) g.textContent = fmt(gasto);
}


// Marca la seccion activa en la barra inferior
function _syncBottomNav(id){
  // Que pestana se marca segun la pagina (las hijas marcan a su padre)
  var mapa = {
    home:'bn-home',
    tienda:'bn-tienda', pase:'bn-tienda', diamantes:'bn-tienda', pines:'bn-tienda', honor:'bn-tienda',
    honorcuenta:'bn-tienda', codigos:'bn-tienda', clanes:'bn-tienda', cajas:'bn-tienda',
    saldo:'bn-saldo', retirar:'bn-saldo', transferir:'bn-saldo',
    likes:'bn-likes',
    menu:'bn-menu', perfil:'bn-menu', miscompras:'bn-menu', api:'bn-menu',
    creadores:'bn-menu', comunidad:'bn-menu', faq:'bn-menu', ranking:'bn-menu',
    sobre:'bn-menu', terminos:'bn-menu', referidos:'bn-menu', membresia:'bn-menu'
  };
  ['bn-home','bn-tienda','bn-saldo','bn-likes','bn-menu'].forEach(function(b){
    var el = document.getElementById(b);
    if(el) el.classList.remove('active');
  });
  var activo = mapa[id];
  if(activo){
    var el2 = document.getElementById(activo);
    if(el2) el2.classList.add('active');
  }
}


// ═══════════ PASE BOOYAH (asistente de 3 pasos) ═══════════
var PASE_PRECIO = 25;
var _comprandoPase = false;
var _paseIdVerificado = null;
var _paseNickVerificado = '';
var _pasePasoActual = 1;

function _updatePasePagina(){
  var s = authSession ? (authSession.saldo||0) : 0;
  ['pase-r-precio','pase-p-precio','pase-p-total'].forEach(function(id){
    var el = document.getElementById(id);
    if(el) el.textContent = fmt(PASE_PRECIO);
  });
  var sa = document.getElementById('pase-saldo');
  if(sa){
    sa.textContent = fmt(s);
    sa.style.color = (s >= PASE_PRECIO) ? '#22d3ee' : '#ff6b6b';
  }
}

// Navegar entre pasos
function paseIrPaso(n){
  // Validaciones para avanzar
  if(n >= 2 && !_paseIdVerificado){ showToast('Primero verifica tu ID'); return; }

  _pasePasoActual = n;
  [1,2,3].forEach(function(p){
    var sec = document.getElementById('pase-paso-'+p);
    if(sec) sec.style.display = (p===n) ? 'block' : 'none';
    var num = document.getElementById('pstep-'+p);
    var lbl = document.getElementById('pstep-lbl-'+p);
    if(num){
      if(p < n){
        num.style.background = 'rgba(34,211,238,.15)';
        num.style.color = '#22d3ee';
        num.innerHTML = '\u2713';
      } else if(p === n){
        num.style.background = '#22d3ee';
        num.style.color = '#021418';
        num.textContent = p;
      } else {
        num.style.background = 'rgba(255,255,255,.06)';
        num.style.color = '#6b7280';
        num.textContent = p;
      }
    }
    if(lbl) lbl.style.color = (p <= n) ? '#22d3ee' : '#6b7280';
  });

  // Llenar el resumen al entrar al paso 2
  if(n === 2){
    var av = document.getElementById('pase-r-avatar');
    if(av) av.textContent = (_paseNickVerificado.charAt(0)||'?').toUpperCase();
    var nk = document.getElementById('pase-r-nick');
    if(nk) nk.textContent = _paseNickVerificado || '-';
    var ud = document.getElementById('pase-r-uid');
    if(ud) ud.textContent = _paseIdVerificado || '-';
  }
  if(n === 3) _updatePasePagina();

  try { window.scrollTo({ top:0, behavior:'smooth' }); } catch(e) { window.scrollTo(0,0); }
}

function _paseSig1Activo(activo){
  var b = document.getElementById('pase-btn-sig1');
  if(!b) return;
  if(activo){
    b.style.background = 'rgba(34,211,238,.14)';
    b.style.border = '1px solid rgba(34,211,238,.45)';
    b.style.color = '#22d3ee';
    b.style.cursor = 'pointer';
    b.innerHTML = 'Continuar <span style="font-size:1.05rem">\u2192</span>';
    b.style.display = 'flex';
    b.style.alignItems = 'center';
    b.style.justifyContent = 'center';
    b.style.gap = '.5rem';
  } else {
    b.style.background = 'rgba(255,255,255,.04)';
    b.style.border = '1px solid rgba(255,255,255,.1)';
    b.style.color = '#4b5563';
    b.style.cursor = 'not-allowed';
    b.textContent = 'Verifica tu ID';
  }
}

// Verificar el ID contra el proveedor
function paseVerificarID(){
  var inp = document.getElementById('pase-id');
  var err = document.getElementById('pase-verif-err');
  var btn = document.getElementById('pase-btn-verif');
  var ffId = ((inp||{}).value||'').trim();

  function showErr(m){ if(err){ err.innerHTML = m; err.style.display='block'; } }
  if(err) err.style.display='none';

  if(!ffId || ffId.replace(/\D/g,'').length < 5){
    showErr('Escribe un ID de Free Fire valido.');
    return;
  }
  if(btn){ btn.disabled = true; btn.textContent = 'Verificando...'; }

  fetch(COMPRAR_RECARGA_URL, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ action:'validar', product_id: 351, service_user_id: ffId })
  }).then(function(r){ return r.json(); }).then(function(res){
    if(btn){ btn.disabled = false; btn.textContent = 'Verificar'; }

    if(res && res.success && res.valido){
      _paseIdVerificado = ffId;
      _paseNickVerificado = res.nombre || 'Jugador';
      var form = document.getElementById('pase-destino-form');
      var okBox = document.getElementById('pase-destino-ok');
      if(form) form.style.display = 'none';
      if(okBox) okBox.style.display = 'block';
      var av = document.getElementById('pase-avatar');
      if(av) av.textContent = (_paseNickVerificado.charAt(0)||'?').toUpperCase();
      var nk = document.getElementById('pase-nick');
      if(nk) nk.textContent = _paseNickVerificado;
      var ud = document.getElementById('pase-uid');
      if(ud) ud.textContent = ffId;
      _paseSig1Activo(true);
      showToast('\u2705 Cuenta verificada', 2500);
    } else if(res && res.success && !res.valido){
      showErr('Ese ID no existe o no es valido. Revisalo e intenta de nuevo.');
    } else {
      showErr('No pudimos verificar tu ID en este momento.<br/>Escribenos por WhatsApp para ayudarte con tu pedido.');
      console.error('[PASE-VALIDAR]', res);
    }
  }).catch(function(e){
    if(btn){ btn.disabled = false; btn.textContent = 'Verificar'; }
    showErr('Error de conexion. Intenta de nuevo en unos segundos.');
    console.error('[PASE-VALIDAR]', e);
  });
}

function paseCambiarID(){
  _paseIdVerificado = null;
  _paseNickVerificado = '';
  var form = document.getElementById('pase-destino-form');
  var okBox = document.getElementById('pase-destino-ok');
  if(form) form.style.display = 'block';
  if(okBox) okBox.style.display = 'none';
  var err = document.getElementById('pase-verif-err');
  if(err) err.style.display = 'none';
  _paseSig1Activo(false);
}

function _paseReiniciar(){
  paseCambiarID();
  var i1 = document.getElementById('pase-id'); if(i1) i1.value='';
  var e1 = document.getElementById('pase-err'); if(e1) e1.style.display='none';
  paseIrPaso(1);
  _updatePasePagina();
}

function comprarPase(){
  if(!authSession){ showToast('Inicia sesion para comprar'); setTimeout(showAuthModal,600); return; }
  if(_comprandoPase){ return; }

  var err = document.getElementById('pase-err');
  function showErr(m){ if(err){ err.textContent=m; err.style.display='block'; } }

  if(!_paseIdVerificado){ showErr('Primero verifica tu ID de Free Fire.'); paseIrPaso(1); return; }

  var saldo = authSession.saldo||0;
  if(saldo < PASE_PRECIO){ showErr('Saldo insuficiente ('+fmt(saldo)+'). Necesitas '+fmt(PASE_PRECIO)+'.'); return; }
  if(err) err.style.display='none';

  _comprandoPase = true;
  var ffId = _paseIdVerificado;
  var nom = _paseNickVerificado || '-';
  var ord = getNextOrder();

  addSpend(PASE_PRECIO, 'Pase Booyah - ID:'+ffId+' ('+nom+') - Pedido #'+ord);
  registrarPedido('Pase Booyah', 0, 'otro', ffId, PASE_PRECIO, 0);
  if(typeof tgNotifyPurchase==='function'){
    tgNotifyPurchase(authSession.username,
      '\uD83C\uDF9F\uFE0F Pase Booyah\n\uD83C\uDFAE ID: '+ffId+'\n\uD83D\uDC64 Cuenta: '+nom+' (verificada)\n\u26A0\uFE0F Entrega por REGALO (1-4 dias)',
      PASE_PRECIO, ord);
  }

  if(typeof _mostrarAvisoModal==='function'){
    _mostrarAvisoModal('PEDIDO #'+ord+' CONFIRMADO',
      'Tu <b style="color:#fff">Pase Booyah</b> fue pedido para <b style="color:#fff">'+nom+'</b>.<br/><br/>Se envia mediante <b style="color:#fff">REGALO</b> y puede tardar de <b style="color:#fff">1 a 4 dias</b>.',
      '#22d3ee');
  }
  showToast('\u2705 Pedido #'+ord+' confirmado!', 3000);

  _paseReiniciar();
  setTimeout(function(){ _comprandoPase = false; }, 3000);
}


// ═══════════ API KEYS (solo admin las genera y entrega) ═══════════

// El revendedor solicita acceso por WhatsApp con mensaje pre-escrito
function solicitarAccesoAPI(){
  var quien = authSession ? authSession.username : 'nuevo';
  var msg = 'Hola! Quiero solicitar acceso a la API de CiberStore.\n'
    + 'Mi usuario: ' + quien + '\n'
    + 'Mi proyecto (pagina web / bot de Telegram): \n'
    + 'Volumen estimado de ventas: ';
  window.open('https://wa.me/' + WA + '?text=' + encodeURIComponent(msg), '_blank');
}

// ADMIN: generar la key de un revendedor aprobado
function admGenerarApiKey(){
  if(!authSession || authSession.role !== 'admin'){ showToast('Solo admin'); return; }
  var user = ((document.getElementById('adm-api-user')||{}).value||'').trim();
  if(!user){ showToast('Escribe el username'); return; }

  fetch(SB_URL + '/rest/v1/rpc/admin_generar_api_key', {
    method: 'POST',
    headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_admin_id: authSession.id, p_username: user })
  }).then(function(r){ return r.json(); }).then(function(res){
    var caja = document.getElementById('adm-api-result');
    if(typeof res === 'string' && res.indexOf('cs_live_') === 0){
      if(caja){ caja.textContent = res; caja.style.display = 'block'; caja.style.color = '#25d366'; }
      showToast('\u2705 Key generada para ' + user + '. Copiala y mandasela por privado.', 4000);
    } else {
      if(caja){ caja.textContent = String(res); caja.style.display = 'block'; caja.style.color = '#ff6b6b'; }
      showToast('No se pudo: ' + String(res), 4000);
    }
  }).catch(function(e){ showToast('Error de conexion'); console.error('[APIKEY]', e); });
}

// ADMIN: revocar la key de un revendedor
function admRevocarApiKey(){
  if(!authSession || authSession.role !== 'admin'){ showToast('Solo admin'); return; }
  var user = ((document.getElementById('adm-api-user')||{}).value||'').trim();
  if(!user){ showToast('Escribe el username'); return; }
  if(!confirm('Revocar la API key de ' + user + '? Dejara de funcionar al instante.')) return;

  fetch(SB_URL + '/rest/v1/rpc/admin_revocar_api_key', {
    method: 'POST',
    headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_admin_id: authSession.id, p_username: user })
  }).then(function(r){ return r.json(); }).then(function(res){
    var caja = document.getElementById('adm-api-result');
    if(caja){ caja.textContent = String(res); caja.style.display = 'block'; caja.style.color = String(res).indexOf('OK') === 0 ? '#25d366' : '#ff6b6b'; }
    showToast(String(res), 3500);
  }).catch(function(e){ showToast('Error de conexion'); console.error('[APIKEY]', e); });
}


// ═══════════ SHEET DE RECARGA (billetera) ═══════════
var _rcCur = 'MXN';
var _rcMetodo = null;

function abrirRecargaSheet(){
  _rcMetodo = null;
  var ov = document.getElementById('sheet-recarga');
  if(ov) ov.classList.add('show');
  rcSetCur(_rcCur);
  rcActualizar();
}
function cerrarRecargaSheet(){
  var ov = document.getElementById('sheet-recarga');
  if(ov) ov.classList.remove('show');
}
function abrirMetodoSheet(){
  var ov = document.getElementById('sheet-metodo');
  if(ov) ov.classList.add('show');
}
function cerrarMetodoSheet(){
  var ov = document.getElementById('sheet-metodo');
  if(ov) ov.classList.remove('show');
}

function rcSetCur(cur){
  _rcCur = cur;
  var bm = document.getElementById('rc-cur-mxn');
  var bu = document.getElementById('rc-cur-usd');
  if(bm) bm.className = 'rc-cur' + (cur==='MXN'?' sel':'');
  if(bu) bu.className = 'rc-cur' + (cur==='USD'?' sel':'');
  var tag = document.getElementById('rc-cur-tag');
  if(tag) tag.textContent = cur;
  var minTxt = document.getElementById('rc-min-txt');
  if(minTxt) minTxt.textContent = cur==='MXN' ? 'Minimo $20 MXN' : 'Minimo $3 USD';
  // Chips por moneda
  var chips = cur==='MXN' ? [50,100,200,500,1000] : [3,10,25,50,100];
  var cont = document.getElementById('rc-chips');
  if(cont){
    cont.innerHTML = chips.map(function(c){
      return '<button class="rc-chip" onclick="rcPonMonto('+c+')">$'+c+'</button>';
    }).join('');
  }
  rcActualizar();
}

function rcPonMonto(v){
  var inp = document.getElementById('rc-monto');
  if(inp) inp.value = v;
  rcActualizar();
}

function rcActualizar(){
  var btn = document.getElementById('rc-continuar');
  if(!btn) return;
  var monto = parseFloat((document.getElementById('rc-monto')||{}).value||'0')||0;
  var min = _rcCur==='MXN' ? 20 : 3;
  var listo = _rcMetodo && monto >= min;
  // Binance no exige monto (los paquetes estan en su ventana)
  if(_rcMetodo === 'binance') listo = true;
  btn.className = 'rc-continuar' + (listo?' on':'');
  btn.textContent = !_rcMetodo ? 'Selecciona metodo de pago' : (listo ? 'Continuar' : 'Monto minimo $'+min+' '+_rcCur);
}

function rcElegirMetodo(m){
  _rcMetodo = m;
  cerrarMetodoSheet();
  var txt = document.getElementById('rc-met-txt');
  var ico = document.getElementById('rc-met-ico');
  var nombres = { transferencia:'Transferencia Bancaria', zelle:'Zelle', binance:'Binance Pay' };
  if(txt){ txt.textContent = nombres[m]||m; txt.className='txt sel'; }
  if(ico){
    if(m==='transferencia') ico.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" stroke-width="1.7" stroke-linecap="round"><path d="M3 9.5 12 4l9 5.5"/><path d="M5 10v8M9.5 10v8M14.5 10v8M19 10v8"/><path d="M3 20h18"/></svg>';
    else if(m==='zelle') ico.innerHTML = '<span style="font-family:Poppins;font-weight:800;color:#a78bfa;font-size:1.05rem">Z</span>';
    else ico.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="#f0b90b"><path d="M12 2 8.6 5.4 12 8.8l3.4-3.4L12 2zM5.4 8.6 2 12l3.4 3.4L8.8 12 5.4 8.6zM18.6 8.6 15.2 12l3.4 3.4L22 12l-3.4-3.4zM12 15.2l-3.4 3.4L12 22l3.4-3.4-3.4-3.4zM12 9.7 9.7 12l2.3 2.3 2.3-2.3L12 9.7z"/></svg>';
  }
  // Si eligio USD y transferencia (MXN), cambiar a MXN automatico
  if(m==='transferencia' && _rcCur==='USD') rcSetCur('MXN');
  if(m==='zelle' && _rcCur==='MXN') rcSetCur('USD');
  rcActualizar();
}

function rcContinuar(){
  if(!_rcMetodo){ abrirMetodoSheet(); return; }
  var monto = parseFloat((document.getElementById('rc-monto')||{}).value||'0')||0;
  var min = _rcCur==='MXN' ? 20 : 3;

  if(_rcMetodo === 'binance'){
    // Binance: abrir su ventana con los paquetes de bono tal cual
    cerrarRecargaSheet();
    if(typeof openBinanceModal==='function') openBinanceModal();
    return;
  }
  if(monto < min){ showToast('Monto minimo $'+min+' '+_rcCur); return; }

  cerrarRecargaSheet();
  if(_rcMetodo === 'transferencia'){
    if(typeof openStoriModal==='function') openStoriModal();
    setTimeout(function(){
      var i = document.getElementById('stori-monto');
      if(i){ i.value = monto; }
    }, 150);
  } else if(_rcMetodo === 'zelle'){
    if(typeof openZelleModal==='function') openZelleModal();
    setTimeout(function(){
      var i = document.getElementById('zelle-monto');
      if(i){ i.value = monto; if(typeof calcZelleConversion==='function') calcZelleConversion(); }
    }, 150);
  }
}


// ═══════════ RECARGAR SALDO (nueva pagina) ═══════════
var _recMoneda = 'MXN';
var REC_MONTOS = { MXN:[50,100,250,500,1000,2500], USD:[3,10,25,50,100,250] };
var REC_MIN = { MXN:50, USD:3 };

function recSetMoneda(m){
  _recMoneda = m;
  var bM = document.getElementById('rec-cur-mxn');
  var bU = document.getElementById('rec-cur-usd');
  if(bM){ bM.style.background = (m==='MXN')?'#fff':'transparent'; bM.style.color = (m==='MXN')?'#000':'#6b7280'; }
  if(bU){ bU.style.background = (m==='USD')?'#fff':'transparent'; bU.style.color = (m==='USD')?'#000':'#6b7280'; }
  var lbl = document.getElementById('rec-cur-label');
  if(lbl) lbl.textContent = m;
  var av = document.getElementById('rec-min-aviso');
  if(av) av.textContent = 'Minimo ' + (m==='MXN'?'$50 MXN':'$3 USD');
  var inp = document.getElementById('rec-monto');
  if(inp) inp.value = (m==='MXN') ? 50 : 3;
  _recPintarMontos();
}

function _recPintarMontos(){
  var cont = document.getElementById('rec-montos');
  if(!cont) return;
  var montos = REC_MONTOS[_recMoneda] || REC_MONTOS.MXN;
  cont.innerHTML = montos.map(function(m){
    return '<button onclick="recSetMonto('+m+')" style="flex:1;min-width:60px;padding:.6rem .3rem;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);color:#c9d1e0;border-radius:11px;font-family:Poppins;font-weight:600;font-size:.82rem;cursor:pointer">$'+m+'</button>';
  }).join('');
}

function recSetMonto(m){
  var inp = document.getElementById('rec-monto');
  if(inp) inp.value = m;
}

function recElegirMetodo(metodo){
  var inp = document.getElementById('rec-monto');
  var monto = parseFloat((inp&&inp.value)||'0') || 0;
  var min = REC_MIN[_recMoneda] || 50;
  if(monto < min){
    showToast('El minimo es ' + (_recMoneda==='MXN'?'$50 MXN':'$3 USD'));
    return;
  }
  // Convertir a MXN si el usuario eligio USD
  var montoMXN = (_recMoneda==='USD') ? Math.round(monto * USD_MXN) : monto;
  _recMontoElegido = montoMXN;

  if(metodo==='transfer'){ if(typeof openStoriModal==='function') openStoriModal(montoMXN); }
  else if(metodo==='binance'){ if(typeof openBinanceModal==='function') openBinanceModal(montoMXN); }
  else if(metodo==='zelle'){ if(typeof openZelleModal==='function') openZelleModal(montoMXN); }
}
var _recMontoElegido = 0;

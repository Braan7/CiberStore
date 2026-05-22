/* ================================================================
   SUPABASE CONFIG - CiberStore
================================================================ */
var SB_URL = 'https://pnotsqsudqpwqzssevig.supabase.co';
var SB_KEY = 'sb_publishable_D1au7Op7OWZTsNIRONwg2A_ATibU1mm';

/* Generic Supabase REST call */
async function sbFetch(method, table, body, params){
  var url = SB_URL + '/rest/v1/' + table;
  if(params) url += '?' + params;
  var opts = {
    method: method,
    headers: {
      'apikey':        SB_KEY,
      'Authorization': 'Bearer ' + SB_KEY,
      'Content-Type':  'application/json',
      'Prefer':        method==='POST' ? 'return=representation' : 'return=representation'
    }
  };
  if(body) opts.body = JSON.stringify(body);
  var res = await fetch(url, opts);
  if(!res.ok){
    var err = await res.text();
    throw new Error(table + ' ' + method + ': ' + err);
  }
  var text = await res.text();
  return text ? JSON.parse(text) : null;
}

/* ── USERS ────────────────────────────────────────────────────── */
async function sbGetUser(username){
  var rows = await sbFetch('GET','cs_users',null,'username=eq.'+encodeURIComponent(username)+'&limit=1');
  return rows && rows.length ? rows[0] : null;
}

async function sbCreateUser(username, passHash, refCode){
  return await sbFetch('POST','cs_users',{
    username:  username,
    pass_hash: passHash,
    ref_code:  refCode,
    spent:     0,
    orders:    0,
    created:   new Date().toISOString()
  });
}

async function sbUpdateUser(username, data){
  return await sbFetch('PATCH','cs_users',data,'username=eq.'+encodeURIComponent(username));
}

async function sbGetAllUsers(){
  return await sbFetch('GET','cs_users',null,'order=created.desc&limit=200');
}

/* ── HISTORY ──────────────────────────────────────────────────── */
async function sbAddHistory(username, item){
  return await sbFetch('POST','cs_history',{
    username:  username,
    name:      item.name,
    price:     item.price,
    icon:      item.icon||'',
    order_num: item.order||'',
    fecha:     item.date||new Date().toISOString()
  });
}

async function sbGetHistory(username){
  return await sbFetch('GET','cs_history',null,
    'username=eq.'+encodeURIComponent(username)+'&order=created.desc&limit=50');
}

/* ── REVIEWS ──────────────────────────────────────────────────── */
async function sbAddResena(data){
  return await sbFetch('POST','cs_resenas',{
    username: data.nombre,
    servicio: data.servicio,
    stars:    data.stars,
    texto:    data.texto,
    fecha:    new Date().toISOString()
  });
}

async function sbGetResenas(){
  return await sbFetch('GET','cs_resenas',null,'order=created.desc&limit=20');
}

/* ── CHAT ─────────────────────────────────────────────────────── */
async function sbPostChat(username, text){
  return await sbFetch('POST','cs_chat',{
    username: username,
    text:     text,
    likes:    0,
    fecha:    new Date().toISOString()
  });
}

async function sbGetChat(){
  return await sbFetch('GET','cs_chat',null,'order=created.desc&limit=50');
}

async function sbLikeChat(id, currentLikes){
  return await sbFetch('PATCH','cs_chat',{likes: currentLikes+1},'id=eq.'+id);
}

async function sbDeleteChat(id){
  return await sbFetch('DELETE','cs_chat',null,'id=eq.'+id);
}

/* ── PROMO CODES ──────────────────────────────────────────────── */
async function sbGetCodes(){
  return await sbFetch('GET','cs_promo_codes',null,'order=created.desc');
}

async function sbCreateCode(code){
  return await sbFetch('POST','cs_promo_codes',{
    code:      code.code,
    disc:      code.disc,
    max_uses:  code.maxUses,
    uses:      0,
    desc:      code.desc||'',
    active:    true,
    created:   new Date().toISOString()
  });
}

async function sbUpdateCode(code, data){
  return await sbFetch('PATCH','cs_promo_codes',data,'code=eq.'+encodeURIComponent(code));
}

async function sbDeleteCode(code){
  return await sbFetch('DELETE','cs_promo_codes',null,'code=eq.'+encodeURIComponent(code));
}

/* ── ORDERS ───────────────────────────────────────────────────── */
async function sbAddOrder(username, data){
  return await sbFetch('POST','cs_orders',{
    username:   username,
    product:    data.name,
    price:      data.price,
    order_num:  data.order||'',
    status:     'pendiente',
    fecha:      new Date().toISOString()
  });
}

async function sbGetOrders(username){
  var q = username
    ? 'username=eq.'+encodeURIComponent(username)+'&order=created.desc&limit=50'
    : 'order=created.desc&limit=200';
  return await sbFetch('GET','cs_orders',null,q);
}

async function sbUpdateOrderStatus(id, status){
  return await sbFetch('PATCH','cs_orders',{status:status},'id=eq.'+id);
}

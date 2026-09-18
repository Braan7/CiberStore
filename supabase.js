/* ================================================================
   SUPABASE CLIENT — CiberStore
================================================================ */
var SB_URL = 'https://pnotsqsudqpwqzssevig.supabase.co';
var SB_KEY = 'sb_publishable_QzToMV34J2zIVjgudq9L3A_a6N6iHPI';

function sbReq(method, table, body, qs, extraHeaders){
  var url = SB_URL + '/rest/v1/' + table + (qs ? '?' + qs : '');
  var headers = Object.assign({
    'Content-Type':  'application/json',
    'apikey':        SB_KEY,
    'Authorization': 'Bearer ' + SB_KEY
  }, extraHeaders || {});
  if(method === 'POST') headers['Prefer'] = 'return=representation';
  return fetch(url, {
    method:  method,
    headers: headers,
    body:    body ? JSON.stringify(body) : undefined
  }).then(function(r){
    if(r.status === 204) return [];
    return r.json().then(function(data){
      if(data && data.code && data.message) return Promise.reject(new Error(data.message));
      return data;
    });
  });
}

// Conteo EXACTO de filas sin traerlas todas (usa el header count=exact de
// PostgREST/Supabase, que devuelve el total real en Content-Range aunque
// haya mas de 1000 filas). qs es opcional (ej: 'role=eq.admin' para filtrar).
// Si el navegador bloquea la lectura del header Content-Range (CORS), cae
// automaticamente a contar trayendo todas las filas paginadas.
function sbCount(table, qs){
  var url = SB_URL + '/rest/v1/' + table + '?select=id' + (qs ? '&' + qs : '') + '&limit=1';
  return fetch(url, {
    method: 'GET',
    headers: {
      'apikey':        SB_KEY,
      'Authorization': 'Bearer ' + SB_KEY,
      'Prefer':        'count=exact'
    }
  }).then(function(r){
    var range = r.headers.get('content-range'); // formato "0-0/1234"
    var total = range ? parseInt(range.split('/')[1], 10) : NaN;
    if(!isNaN(total)) return total;
    // Plan B: el header no llego (CORS u otro motivo). Contar trayendo todo, paginado.
    console.warn('[sbCount] Content-Range no disponible, usando conteo por paginacion para', table);
    return sbCountByPaging(table, qs);
  }).catch(function(e){
    console.error('[sbCount] fetch fallo, usando conteo por paginacion para', table, e);
    return sbCountByPaging(table, qs);
  });
}

// Plan B de conteo: trae solo la columna id, paginando de 1000 en 1000,
// hasta agotar las filas, y devuelve el total real sin limite.
function sbCountByPaging(table, qs){
  var pageSize = 1000;
  function contarDesde(desde, acumulado){
    var url = SB_URL + '/rest/v1/' + table + '?select=id' + (qs ? '&' + qs : '') + '&offset=' + desde + '&limit=' + pageSize;
    return fetch(url, {
      method: 'GET',
      headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY }
    }).then(function(r){ return r.json(); }).then(function(rows){
      if(!rows || !Array.isArray(rows) || !rows.length) return acumulado;
      var nuevoTotal = acumulado + rows.length;
      if(rows.length < pageSize) return nuevoTotal; // ultima pagina
      return contarDesde(desde + pageSize, nuevoTotal);
    });
  }
  return contarDesde(0, 0);
}

function sbRpc(fn, params){
  var url = SB_URL + '/rest/v1/rpc/' + fn;
  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'apikey':        SB_KEY,
      'Authorization': 'Bearer ' + SB_KEY
    },
    body: JSON.stringify(params || {})
  }).then(function(r){
    return r.json().then(function(data){
      if(data && data.code && data.message) return Promise.reject(new Error(data.message));
      return data;
    });
  });
}

var sb = {
  get:    function(t, q)    { return sbReq('GET',    t, null, q); },
  post:   function(t, d)    { return sbReq('POST',   t, d); },
  patch:  function(t, d, q) { return sbReq('PATCH',  t, d, q); },
  del:    function(t, q)    { return sbReq('DELETE', t, null, q); },
  rpc:    function(fn, params) { return sbRpc(fn, params); },
  count:  function(t, q)    { return sbCount(t, q); },
  upsert: function(t, d){
    return sbReq('POST', t, d, null,
      {'Prefer': 'resolution=merge-duplicates,return=representation'});
  }
};

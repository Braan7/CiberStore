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
    return isNaN(total) ? 0 : total;
  });
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

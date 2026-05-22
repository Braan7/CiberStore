/* ================================================================
   SUPABASE CLIENT — CiberStore
================================================================ */
var SB_URL = 'https://pnotsqsudqpwqzssevig.supabase.co';
var SB_KEY = 'sb_publishable_D1au7Op7OWZTsNIRONwg2A_ATibU1mm';

function sbReq(method, table, body, qs, extraHeaders){
  var url = SB_URL + '/rest/v1/' + table + (qs ? '?' + qs : '');
  var headers = Object.assign({
    'Content-Type':  'application/json',
    'apikey':        SB_KEY,
    'Authorization': 'Bearer ' + SB_KEY
  }, extraHeaders || {});
  if(method === 'POST') headers['Prefer'] = 'return=representation';
  return fetch(url, {
    method: method,
    headers: headers,
    body: body ? JSON.stringify(body) : undefined
  }).then(function(r){
    if(r.status === 204) return [];
    return r.json().then(function(data){
      if(data && data.code && data.message){
        return Promise.reject(new Error(data.message));
      }
      return data;
    });
  });
}

var sb = {
  get:    function(t, q)    { return sbReq('GET',    t, null, q); },
  post:   function(t, d)    { return sbReq('POST',   t, d); },
  patch:  function(t, d, q) { return sbReq('PATCH',  t, d, q); },
  del:    function(t, q)    { return sbReq('DELETE', t, null, q); },
  upsert: function(t, d){
    return sbReq('POST', t, d, null,
      {'Prefer': 'resolution=merge-duplicates,return=representation'});
  }
};

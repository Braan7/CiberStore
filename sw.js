// sw.js · Service worker de CiberStore SIN caché de la tienda.
// Objetivo: que nadie se quede con una versión vieja. No guarda copias: todo se pide a la red.
// Al instalarse una versión nueva: borra cualquier caché anterior, toma el control y recarga las pestañas abiertas.
self.addEventListener('install', function(e){ self.skipWaiting(); });
self.addEventListener('activate', function(e){
  e.waitUntil((async function(){
    try{ var llaves = await caches.keys(); await Promise.all(llaves.map(function(k){ return caches.delete(k); })); }catch(err){}
    await self.clients.claim();
    try{
      var abiertas = await self.clients.matchAll({type:'window', includeUncontrolled:true});
      abiertas.forEach(function(c){ try{ c.navigate(c.url); }catch(err){} });
    }catch(err){}
  })());
});
// Sin 'fetch': el service worker no intercepta nada, el navegador va directo a la red.

const CACHE_NAME='foodcost-v4.3';
self.addEventListener('install',event=>{self.skipWaiting();});
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('foodcost-')&&k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 const req=event.request,u=new URL(req.url);
 if(req.method!=='GET'||u.origin!==self.location.origin)return;
 event.respondWith(fetch(req).then(response=>{
  if(response.ok){const copy=response.clone();caches.open(CACHE_NAME).then(cache=>cache.put(req,copy)).catch(()=>{});}return response;
 }).catch(()=>caches.match(req).then(cached=>cached||new Response('غير متصل بالشبكة',{status:503,headers:{'Content-Type':'text/plain;charset=UTF-8'}}))));
});

const CACHE_NAME='foodcost-v5.3.2';
self.addEventListener('install',event=>{self.skipWaiting();});
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('foodcost-')&&k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
const offline=()=>new Response('غير متصل بالشبكة',{status:503,headers:{'Content-Type':'text/plain;charset=UTF-8'}});
const put=(req,res)=>{if(res&&res.ok){const copy=res.clone();caches.open(CACHE_NAME).then(c=>c.put(req,copy)).catch(()=>{});}return res;};
self.addEventListener('fetch',event=>{
 const req=event.request,u=new URL(req.url);
 if(req.method!=='GET'||u.origin!==self.location.origin||/activate\.html$/.test(u.pathname))return;
 // v4.7: الملفات الثابتة ذات رقم الإصدار (?v=) تُقدَّم فوراً من الذاكرة المؤقتة وتُحدَّث في الخلفية — فتح أسرع بكثير
 if(u.searchParams.has('v')&&/\.(js|css|png|jpg|jpeg|svg|webp|woff2?)$/i.test(u.pathname)){
  event.respondWith(caches.open(CACHE_NAME).then(c=>c.match(req).then(hit=>{const net=fetch(req).then(r=>put(req,r)).catch(()=>hit||offline());return hit||net;})));
  return;
 }
 event.respondWith(fetch(req).then(r=>put(req,r)).catch(()=>caches.match(req).then(cached=>cached||offline())));
});

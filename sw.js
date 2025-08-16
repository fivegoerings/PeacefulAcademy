const CACHE_NAME='peaceful-academy-v2';
const ASSETS=['./','./index.html','./manifest.webmanifest','./assets/icon.svg'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  e.respondWith(caches.match(e.request).then(cached=>cached||fetch(e.request).then(res=>{
    if(res.ok && new URL(e.request.url).origin===location.origin) caches.open(CACHE_NAME).then(c=>c.put(e.request,res.clone()));
    return res;
  }).catch(()=> (e.request.mode==='navigate'? caches.match('./index.html') : Promise.reject()))));
});
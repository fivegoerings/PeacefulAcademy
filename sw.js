/* Peaceful Academy PWA Service Worker */
const CACHE_NAME = 'peaceful-academy-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/icon-192.png',
  './assets/icon-256.png',
  './assets/icon-384.png',
  './assets/icon-512.png'
].filter(Boolean);

self.addEventListener('install', (e)=>{
  e.waitUntil((async()=>{
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(ASSETS);
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (e)=>{
  e.waitUntil((async()=>{
    const keys = await caches.keys();
    await Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)));
    self.clients.claim();
  })());
});

self.addEventListener('fetch', (e)=>{
  const req = e.request;
  if (req.method !== 'GET') return;
  e.respondWith((async()=>{
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(req);
    if (cached) return cached;
    try{
      const res = await fetch(req);
      if (res && res.status === 200 && (req.url.startsWith(self.location.origin))) {
        cache.put(req, res.clone());
      }
      return res;
    }catch(err){
      // offline fallback to index.html for SPA routes
      if (req.mode === 'navigate') return cache.match('./index.html');
      throw err;
    }
  })());
});

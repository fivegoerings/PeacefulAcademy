// sw.js (safe caching for Peaceful Academy)
const CACHE_VERSION = 'v2025-08-18-1'; // bump on each deploy
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `runtime-${CACHE_VERSION}`;

// Only precache truly static, versioned files (no HTML)
// Prefer hashed filenames or ?v= query strings.
const STATIC_ASSETS = [
  // '/assets/icon.svg?v=2025-08-18-1', // example (add your versioned assets here)
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(STATIC_CACHE);
    await cache.addAll(STATIC_ASSETS);
    // Activate immediately on install
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((k) => ![STATIC_CACHE, RUNTIME_CACHE].includes(k))
        .map((k) => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const accept = req.headers.get('accept') || '';

  const isSameOrigin = url.origin === self.location.origin;
  const isHTML = req.mode === 'navigate' || accept.includes('text/html');
  const isAPI = url.pathname.startsWith('/.netlify/functions/') || url.pathname.startsWith('/api/');
  const isAsset = isSameOrigin && url.pathname.startsWith('/assets/');

  // 1) HTML & SPA navigations: network-first, never cache
  if (isHTML) {
    event.respondWith((async () => {
      try {
        // no-store ensures we don't get a cached intermediary
        return await fetch(req, { cache: 'no-store' });
      } catch {
        // optional: fall back to a cached shell if you add one later
        const cached = await caches.match('/index.html');
        return cached || new Response('Offline', { status: 503 });
      }
    })());
    return;
  }

  // 2) API/Function calls: network-only, never cache
  if (isAPI) {
    event.respondWith(fetch(req, { cache: 'no-store' }));
    return;
  }

  // 3) Static versioned assets: cache-first
  if (isAsset) {
    event.respondWith((async () => {
      const cached = await caches.match(req);
      if (cached) return cached;

      const res = await fetch(req);
      // Only cache OK, basic (same-origin) responses
      if (res.ok && res.type === 'basic') {
        const cache = await caches.open(RUNTIME_CACHE);
        // clone right away before body is consumed
        const copy = res.clone();
        try { await cache.put(req, copy); } catch { /* ignore put errors */ }
      }
      return res;
    })());
    return;
  }

  // 4) Everything else: just pass through
  // (prevents caching 3rd party, fonts, or anything you didn't classify)
});


// Auto-increment cache version based on build time or manual version
const CACHE_VERSION = '5';
const CACHE_NAME = `peaceful-academy-v${CACHE_VERSION}`;
const STATIC_CACHE = `peaceful-academy-static-v${CACHE_VERSION}`;
const DYNAMIC_CACHE = `peaceful-academy-dynamic-v${CACHE_VERSION}`;

// Assets to cache immediately
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/icon.svg',
  './assets/icon-192.png',
  './assets/icon-256.png',
  './assets/icon-384.png',
  './assets/icon-512.png',
  './favicon.svg',
  './apple-touch-icon.png'
];

// API endpoints to cache
const API_CACHE_PATTERNS = [
  '/.netlify/functions/api/health',
  '/.netlify/functions/api/stats',
  '/.netlify/functions/db'
];

// Install event - cache static assets
self.addEventListener('install', event => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('Static assets cached successfully');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('Failed to cache static assets:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker activated');
        return self.clients.claim();
      })
      .catch(error => {
        console.error('Failed to activate service worker:', error);
      })
  );
});

// Fetch event - handle requests
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Handle API requests
  if (url.pathname.includes('/.netlify/functions/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle static assets
  if (url.origin === location.origin) {
    event.respondWith(handleStaticRequest(request));
    return;
  }

  // Handle external requests (fallback to network)
  event.respondWith(handleExternalRequest(request));
});

// Handle API requests with cache-first strategy
async function handleApiRequest(request) {
  try {
    // Try network first for API requests
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful API responses
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
    
    // If network fails, try cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return network response even if it failed
    return networkResponse;
  } catch (error) {
    console.error('API request failed:', error);
    
    // Try cache as fallback
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline response for API requests
    return new Response(
      JSON.stringify({ 
        error: 'Offline - API unavailable',
        message: 'Please check your connection and try again'
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Handle static requests with cache-first strategy
async function handleStaticRequest(request) {
  try {
    // Try cache first for static assets
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // If not in cache, try network
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful responses
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('Static request failed:', error);
    
    // For navigation requests, return the main page
    if (request.mode === 'navigate') {
      const cachedPage = await caches.match('./index.html');
      if (cachedPage) {
        return cachedPage;
      }
    }
    
    // Return offline page
    return new Response(
      '<!DOCTYPE html><html><head><title>Offline</title></head><body><h1>You are offline</h1><p>Please check your connection and try again.</p></body></html>',
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'text/html' }
      }
    );
  }
}

// Handle external requests
async function handleExternalRequest(request) {
  try {
    const response = await fetch(request);
    return response;
  } catch (error) {
    console.error('External request failed:', error);
    throw error;
  }
}

// Background sync for offline actions
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync') {
    console.log('Background sync triggered');
    event.waitUntil(performBackgroundSync());
  }
});

// Perform background sync
async function performBackgroundSync() {
  try {
    // Get any pending requests from IndexedDB
    const pendingRequests = await getPendingRequests();
    
    for (const request of pendingRequests) {
      try {
        await fetch(request.url, request.options);
        await removePendingRequest(request.id);
        console.log('Background sync completed for request:', request.id);
      } catch (error) {
        console.error('Background sync failed for request:', request.id, error);
      }
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// Helper functions for background sync
async function getPendingRequests() {
  // This would typically use IndexedDB to store pending requests
  // For now, return empty array
  return [];
}

async function removePendingRequest(id) {
  // This would typically remove the request from IndexedDB
  console.log('Removing pending request:', id);
}

// Push notification handling
self.addEventListener('push', event => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body || 'New notification from Peaceful Academy',
      icon: './assets/icon-192.png',
      badge: './assets/icon-192.png',
      tag: 'peaceful-academy-notification',
      requireInteraction: true,
      actions: [
        {
          action: 'open',
          title: 'Open App'
        },
        {
          action: 'close',
          title: 'Close'
        }
      ]
    };
    
    event.waitUntil(
      self.registration.showNotification('Peaceful Academy', options)
    );
  }
});

// Notification click handling
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  if (event.action === 'open') {
    event.waitUntil(
      clients.openWindow('./')
    );
  }
});

// Error handling
self.addEventListener('error', event => {
  console.error('Service Worker error:', event.error);
});

self.addEventListener('unhandledrejection', event => {
  console.error('Service Worker unhandled rejection:', event.reason);
});
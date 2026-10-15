const CACHE_NAME = 'tripnote-unified-v6';
const APP_SHELL = ['/', '/manifest.webmanifest', '/icons/tripnote.svg', '/icons/tripnote-192.png', '/icons/tripnote-512.png', '/icons/tripnote-180.png', '/icons/tripnote-maskable-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(fetch(event.request).then((response) => {
    if (response.ok) {
      const cacheKey = event.request.mode === 'navigate' ? '/' : event.request;
      const copy = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(cacheKey, copy));
    }
    return response;
  }).catch(() => {
    const cacheKey = event.request.mode === 'navigate' ? '/' : event.request;
    return caches.match(cacheKey);
  }));
});

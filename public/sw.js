const CACHE_NAME = 'restrobill-cache-v1';
const urlsToCache = [
  '/',
  '/pos',
  '/dashboard',
  '/manifest.json',
  '/globals.css'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request).catch(() => {
          // Fallback for offline if not in cache
        });
      })
  );
});

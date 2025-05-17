
const CACHE_NAME = 'bina-yemen-v10';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/bundles.html',
  '/rods.html',
  '/workers.html',
  '/box.html',
  '/style.css',
  '/script.js',
  '/IMG_4411.png',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;600;700;800&display=swap'
];

// Cache first, then network strategy
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request)
          .then((networkResponse) => {
            if (!networkResponse || networkResponse.status !== 200) {
              return networkResponse;
            }
            
            return caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, networkResponse.clone());
                return networkResponse;
              });
          })
          .catch(() => {
            return new Response('غير متصل بالإنترنت', {
              status: 503,
              headers: { 'Content-Type': 'text/plain;charset=UTF-8' }
            });
          });
      })
  );
});

// Handle image sharing and caching
self.addEventListener('message', async (event) => {
  if (event.data.type === 'CACHE_IMAGE') {
    const { imageUrl, imageName } = event.data;
    try {
      const cache = await caches.open(CACHE_NAME);
      const response = await fetch(imageUrl);
      await cache.put(`/cached-images/${imageName}`, response);
    } catch (error) {
      console.error('Error caching image:', error);
    }
  }
});

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

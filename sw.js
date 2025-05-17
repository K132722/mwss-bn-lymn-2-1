
const CACHE_NAME = 'bina-yemen-v14';
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
  '/generated-icon.png',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;600;700;800&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css'
];

const IMAGE_CACHE = 'bina-yemen-images-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS_TO_CACHE))
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

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request)
          .then((response) => {
            if (!response || response.status !== 200) {
              return response;
            }
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
            return response;
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

self.addEventListener('message', (event) => {
  if (event.data.type === 'SAVE_IMAGE') {
    const { imageData, timestamp } = event.data;
    caches.open(CACHE_NAME).then((cache) => {
      const blob = new Blob([imageData], { type: 'image/png' });
      const response = new Response(blob);
      cache.put(`/shared-images/${timestamp}`, response);
    });
  }
});

self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/share-target')) {
    event.respondWith(
      (async () => {
        const formData = await event.request.formData();
        const image = formData.get('image');
        const timestamp = Date.now();
        
        if (image) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(`/shared-images/${timestamp}`, new Response(image));
        }
        
        return Response.redirect('/', 303);
      })()
    );
  }
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-images') {
    event.waitUntil(syncImages());
  }
});

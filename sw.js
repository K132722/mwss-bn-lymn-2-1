const CACHE_NAME = 'bina-yemen-v4';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/bundles.html',
  '/rods.html',
  '/workers.html',
  '/box.html',
  '/style.css',
  '/script.js',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS_TO_CACHE))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
const CACHE_NAME = 'bina-yemen-v8'; // تم تحديث رقم الإصدار
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

// 1. مرحلة التثبيت: تخزين جميع الأصول في الكاش
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching all assets');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting()) // تفعيل الخدمة العامل فورًا
  );
});

// 2. مرحلة التنشيط: تنظيف الكاش القديم
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[Service Worker] Claiming clients');
      return self.clients.claim();
    })
  );
});

// 3. مرحلة الجلب: تقديم المحتوى من الكاش أولًا
self.addEventListener('fetch', (event) => {
  // تجاهل طلبات غير GET وطلبات الخارجية (عدا تلك المدرجة في ASSETS_TO_CACHE)
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // إذا كان الملف موجود في الكاش
        if (cachedResponse) {
          console.log('[Service Worker] Serving from cache:', event.request.url);
          return cachedResponse;
        }

        // إذا لم يكن موجود في الكاش، جلب من الشبكة ثم تخزينه
        return fetch(event.request)
          .then((networkResponse) => {
            if (!networkResponse.ok) return networkResponse;

            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                console.log('[Service Worker] Caching new resource:', event.request.url);
                cache.put(event.request, responseToCache);
              });

            return networkResponse;
          })
          .catch(() => {
            // يمكنك إضافة صفحة "غير متصل" مخصصة هنا
            return new Response('عذرًا، التطبيق غير متاح دون اتصال', {
              status: 503,
              headers: { 'Content-Type': 'text/plain; charset=utf-8' }
            });
          });
      })
  );
});
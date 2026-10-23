const CACHE_NAME = 'bina-yemen-cache-v9';

const APP_SHELL = [
  '/',
  '/index.html',
  '/bundles.html',
  '/rods.html',
  '/workers.html',
  '/box.html',
  '/hh.html',
  '/jj.html',

  '/style.css',
  '/calculator.css',

  '/script.js',
  '/calculator.js',
  '/generateData.js',

  '/fa-icons.js',
  '/fa-local.css',
  '/html2canvas.js',
  '/html2canvas.min.js',
  '/jspdf.umd.min.js',
  '/logoBase64.js',
  '/chart.umd.js',

  '/manifest.json',

  // الصور
  '/IMG_4411.png',
  '/IMG_5033.png',
  '/IMG_5078.png',
  '/IMG_5079.png',
  '/IMG_5080.png',
  '/IMG_5081.png',
  '/png 2.png',
  '/png.3.png',

  // أيقونات التطبيق
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png',

  // الخطوط
  '/tajawal.css',
  '/tajawal-300-arabic.woff2',
  '/tajawal-300-latin.woff2',
  '/tajawal-400-arabic.woff2',
  '/tajawal-400-latin.woff2',
  '/tajawal-500-arabic.woff2',
  '/tajawal-500-latin.woff2',
  '/tajawal-700-arabic.woff2',
  '/tajawal-700-latin.woff2',
  '/tajawal-800-arabic.woff2',
  '/tajawal-800-latin.woff2',
  '/inter_24pt-Bold.ttf',

  // FontAwesome
  '/fa-solid-900.woff2',
  '/fa-regular-400.woff2',
  '/fa-brands-400.woff2',
  '/fa-v4compatibility.woff2',
  '/fa-solid-900.ttf',
  '/fa-regular-400.ttf',
  '/fa-brands-400.ttf'
];

// =======================
// INSTALL
// =======================
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(APP_SHELL);
      })
      .then(() => self.skipWaiting())
  );
});

// =======================
// ACTIVATE
// =======================
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// =======================
// FETCH
// =======================
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const requestURL = new URL(event.request.url);

  // =======================
  // البيانات المحلية
  // =======================
  if (requestURL.pathname === '/data.json') {
    event.respondWith(
      (async () => {
        try {
          const db = await openDB('binaYemenDB', 1);
          const steelData = await db.getAll('steelData');
          const calculatorData = await db.getAll('calculatorData');
          const otherData = await db.getAll('otherStore');

          return new Response(
            JSON.stringify({ steelData, calculatorData, otherData }),
            { headers: { 'Content-Type': 'application/json' } }
          );
        } catch (err) {
          return new Response('{}', { headers: { 'Content-Type': 'application/json' } });
        }
      })()
    );
    return;
  }

  // =======================
  // استراتيجية Cache First (مُعدلة لسفاري)
  // =======================
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      // 1. إذا وجد في الكاش، رجعه مباشرة
      if (cachedResponse) {
        return cachedResponse;
      }

      // 2. إذا لم يوجد، اطلبه من الشبكة
      return fetch(event.request).then(networkResponse => {
        
        // *** الحل: لا تقم بإرجاع الردود التي تحمل Redirect أو غير أساسية ***
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        // تخزين نسخة في الكاش
        const responseClone = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseClone);
        });

        return networkResponse;

      }).catch(() => {
        // 3. Fallback للصفحات فقط
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }

        // 4. لأي طلب آخر فاشل، أرجع رد فارغ بدون Redirect
        return new Response('', {
          status: 200,
          statusText: 'OK',
          headers: { 'Content-Type': 'text/plain' }
        });
      });
    })
  );
});

// =======================
// SHARE IMAGE
// =======================
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SHARE_IMAGE') {
    caches.open(CACHE_NAME)
      .then(cache => {
        const response = new Response(event.data.imageData);
        cache.put(`/shared-images/${Date.now()}`, response);
      });
  }
});

const CACHE_NAME = 'bina-yemen-cache-v3';

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
  '/fonts/tajawal/tajawal.css',

  '/fonts/tajawal/tajawal-300-arabic.woff2',
  '/fonts/tajawal/tajawal-300-latin.woff2',

  '/fonts/tajawal/tajawal-400-arabic.woff2',
  '/fonts/tajawal/tajawal-400-latin.woff2',

  '/fonts/tajawal/tajawal-500-arabic.woff2',
  '/fonts/tajawal/tajawal-500-latin.woff2',

  '/fonts/tajawal/tajawal-700-arabic.woff2',
  '/fonts/tajawal/tajawal-700-latin.woff2',

  '/fonts/tajawal/tajawal-800-arabic.woff2',
  '/fonts/tajawal/tajawal-800-latin.woff2',
  '/inter_24pt-Bold.ttf',

  // FontAwesome
  '/webfonts/fa-solid-900.woff2',
  '/webfonts/fa-regular-400.woff2',
  '/webfonts/fa-brands-400.woff2',
  '/webfonts/fa-v4compatibility.woff2',

  '/webfonts/fa-solid-900.ttf',
  '/webfonts/fa-regular-400.ttf',
  '/webfonts/fa-brands-400.ttf'
 
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

            JSON.stringify({
              steelData,
              calculatorData,
              otherData
            }),

            {
              headers: {
                'Content-Type': 'application/json'
              }
            }

          );

        } catch (err) {

          return new Response('{}', {

            headers: {
              'Content-Type': 'application/json'
            }

          });

        }

      })()

    );

    return;

  }


  // =======================
  // استراتيجية Cache First
  // =======================

  event.respondWith(

    caches.match(event.request)

      .then(cachedResponse => {

        if (cachedResponse) {

          return cachedResponse;

        }

        return fetch(event.request)

          .then(networkResponse => {

            if (!networkResponse || networkResponse.status !== 200) {

              return networkResponse;

            }

            const responseClone = networkResponse.clone();

            caches.open(CACHE_NAME)

              .then(cache => {

                cache.put(event.request, responseClone);

              });

            return networkResponse;

          })

          .catch(() => {

            // fallback للصفحات

            if (event.request.mode === 'navigate') {

              return caches.match('/index.html');

            }

            // منع رسالة offline

            return new Response('', {

              status: 200,
              statusText: 'OK'

            });

          });

      })

  );

});



// =======================
// SHARE IMAGE
// =======================

self.addEventListener('message', event => {

  if (
    event.data &&
    event.data.type === 'SHARE_IMAGE'
  ) {

    caches.open(CACHE_NAME)

      .then(cache => {

        const response = new Response(event.data.imageData);

        cache.put(
          `/shared-images/${Date.now()}`,
          response
        );

      });

  }

});
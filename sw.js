const CACHE_NAME = 'bina-yemen-cache-v12'; // رفع الإصدار لضمان التحديث

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
  '/IMG_4411.png',
  '/IMG_5033.png',
  '/IMG_5078.png',
  '/IMG_5079.png',
  '/IMG_5080.png',
  '/IMG_5081.png',
  '/png 2.png',
  '/png.3.png',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png',
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
  '/fa-solid-900.woff2',
  '/fa-regular-400.woff2',
  '/fa-brands-400.woff2',
  '/fa-v4compatibility.woff2',
  '/fa-solid-900.ttf',
  '/fa-regular-400.ttf',
  '/fa-brands-400.ttf'
];

// دالة لتنظيف أي Redirect من أي رد (حماية سفاري)
function cleanResponse(response) {
  if (!response) return response;
  if (!response.redirected) return response;
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers
  });
}

// =======================
// INSTALL
// =======================
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
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
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      );
    }).then(() => self.clients.claim())
  );
});

// =======================
// FETCH
// =======================
self.addEventListener('fetch', event => {
  const request = event.request;

  // ✅ تجاهل أي طلب ليس GET (مثل رفع الملفات)
  if (request.method !== 'GET') return;

  const requestURL = new URL(request.url);

  // ✅ تجاهل الطلبات الخارجية
  if (requestURL.origin !== self.location.origin) return;

  // ✅ البيانات المحلية (data.json)
  if (requestURL.pathname === '/data.json') {
    event.respondWith((async () => {
      try {
        const db = await openDB('binaYemenDB', 1);
        const steelData = await db.getAll('steelData');
        const calculatorData = await db.getAll('calculatorData');
        const otherData = await db.getAll('otherStore');
        return new Response(JSON.stringify({ steelData, calculatorData, otherData }), {
          status: 200,
          headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
        });
      } catch (err) {
        return new Response('{}', {
          status: 200,
          headers: { 'Content-Type': 'application/json; charset=utf-8' }
        });
      }
    })());
    return;
  }

  // ✅ استثناءات مهمة: لا تعترض طلبات النسخ الاحتياطي أو الملفات التي يقرأها التطبيق
  if (
    requestURL.pathname.endsWith('.json') ||
    requestURL.pathname.endsWith('.txt') ||
    requestURL.pathname.includes('backup') ||
    requestURL.pathname.includes('export') ||
    requestURL.pathname.includes('import') ||
    requestURL.pathname.includes('restore')
  ) {
    // اترك المتصفح يتعامل معها بشكل طبيعي
    return;
  }

  // ✅ إذا كان الطلب ليس من نوع "navigate" (فتح صفحة)، اتركه للشبكة ولا تعترضه
  // هذا يحل مشكلة الملفات التي يقرأها التطبيق من جهاز المستخدم
  if (request.mode !== 'navigate') {
    return;
  }

  // ✅ الآن فقط نتعامل مع طلبات فتح الصفحات (navigate)
  event.respondWith((async () => {
    try {
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        return cleanResponse(cachedResponse);
      }

      const networkResponse = await fetch(request);
      return cleanResponse(networkResponse);

    } catch (err) {
      // في حالة الفشل، أرجع index.html
      const home = await caches.match('/index.html');
      if (home) return cleanResponse(home);
      
      return new Response('', {
        status: 200,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }
  })());
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

// ═══════════════════════════════════════════════════════════
//  شغل مخك — Service Worker v5.0
//  !! غيّر رقم VERSION كل ما ترفع تحديث جديد !!
// ═══════════════════════════════════════════════════════════

const VERSION = 'v20';
const CACHE_VERSION   = `shaghel-mokh-${VERSION}`;
const STATIC_CACHE    = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE   = `${CACHE_VERSION}-dynamic`;
const QUESTIONS_CACHE = `${CACHE_VERSION}-questions`;

const STATIC_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './manifest.json',
  './sw.js',
  './admin.html',
  './js/firebase.js',
  './js/helpers.js',
  './js/data.js',
  './js/auth.js',
  './js/ui.js',
  './js/quiz.js',
  './js/challenges.js',
  './js/rooms.js',
  './js/friends.js',
  './js/main.js',
  './js/admin.js',
  'https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;900&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/canvas-confetti/1.6.0/confetti.browser.min.js',
];

const OFFLINE_PAGE = './index.html';

// ── INSTALL — يكاش كل الملفات وينتظر ──────────────────────
self.addEventListener('install', event => {
  console.log(`[SW ${VERSION}] Installing...`);
  event.waitUntil(
    caches.open(STATIC_CACHE).then(async cache => {
      const results = await Promise.allSettled(
        STATIC_ASSETS.map(url =>
          cache.add(url).catch(e => console.warn(`[SW] Skip: ${url}`))
        )
      );
      const ok = results.filter(r => r.status === 'fulfilled').length;
      console.log(`[SW ${VERSION}] ✅ Cached ${ok}/${STATIC_ASSETS.length}`);
    })
  );
  // !! مهم: لا تنتظر — خذ السيطرة فوراً
  self.skipWaiting();
});

// ── ACTIVATE — امسح كل الكاش القديم وخذ السيطرة ───────────
self.addEventListener('activate', event => {
  console.log(`[SW ${VERSION}] Activating — clearing old caches...`);
  event.waitUntil(
    caches.keys().then(names =>
      Promise.all(
        names
          .filter(n => n.startsWith('shaghel-mokh-') && !n.startsWith(CACHE_VERSION))
          .map(n => {
            console.log(`[SW ${VERSION}] 🗑️ Deleted: ${n}`);
            return caches.delete(n);
          })
      )
    ).then(() => {
      console.log(`[SW ${VERSION}] ✅ Activated — claiming all clients`);
      // !! مهم: خذ السيطرة على كل التابات فوراً بدون reload
      return self.clients.claim();
    })
  );
});

// ── FETCH ────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Firebase / Firestore → Network Only
  if (
    url.hostname.includes('firestore.googleapis.com')       ||
    url.hostname.includes('firebase.googleapis.com')        ||
    url.hostname.includes('firebaseapp.com')                ||
    url.hostname.includes('identitytoolkit.googleapis.com') ||
    url.hostname.includes('securetoken.googleapis.com')
  ) {
    event.respondWith(
      fetch(request).catch(() =>
        new Response('{"offline":true}', { headers: { 'Content-Type': 'application/json' } })
      )
    );
    return;
  }

  // 2. Firebase SDK (gstatic) → Cache-First
  if (url.hostname.includes('gstatic.com')) {
    event.respondWith(cacheFirst(request, DYNAMIC_CACHE));
    return;
  }

  // 3. Fonts & CDN → Stale-While-Revalidate
  if (
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com')    ||
    url.hostname.includes('cdnjs.cloudflare.com')
  ) {
    event.respondWith(staleWhileRevalidate(request, DYNAMIC_CACHE));
    return;
  }

  // 4. الصور → Cache-First
  if (request.destination === 'image' || url.hostname.includes('postimg.cc')) {
    event.respondWith(cacheFirst(request, DYNAMIC_CACHE));
    return;
  }

  // 5. الملفات المحلية → Network-First (عشان التحديثات تظهر)
  if (url.origin === self.location.origin) {
    event.respondWith(networkFirst(request, STATIC_CACHE));
    return;
  }

  // 6. الباقي → Network-First
  event.respondWith(networkFirst(request, DYNAMIC_CACHE));
});

// ── STRATEGIES ───────────────────────────────────────────────

// Network-First: يجيب من النت أولاً، لو فشل يرجع للكاش
async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response && response.status === 200 && request.method === 'GET') {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (request.destination === 'document')
      return caches.match(OFFLINE_PAGE) ||
             new Response('<h1 dir="rtl" style="font-family:sans-serif;padding:40px;text-align:center">غير متاح أوفلاين</h1>',
               { headers: { 'Content-Type': 'text/html' } });
    return new Response('', { status: 503 });
  }
}

// Cache-First: يجيب من الكاش أولاً
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response && response.status === 200 && request.method === 'GET') {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    return new Response('', { status: 503 });
  }
}

// Stale-While-Revalidate: يرجع الكاش وبيحدثه في الخلفية
async function staleWhileRevalidate(request, cacheName) {
  const cache  = await caches.open(cacheName);
  const cached = await cache.match(request);
  const fetchP = fetch(request).then(r => {
    if (r && r.status === 200 && request.method === 'GET') cache.put(request, r.clone());
    return r;
  }).catch(() => null);
  return cached || fetchP;
}

// ── MESSAGES ─────────────────────────────────────────────────
self.addEventListener('message', event => {
  const { type, payload } = event.data || {};

  if (type === 'SKIP_WAITING') {
    console.log('[SW] SKIP_WAITING received');
    self.skipWaiting();
  }

  if (type === 'CLEAR_CACHE') {
    caches.keys()
      .then(names => Promise.all(names.map(n => caches.delete(n))))
      .then(() => {
        console.log('[SW] All caches cleared');
        event.source?.postMessage({ type: 'CACHE_CLEARED' });
      });
  }

  if (type === 'GET_CACHE_INFO') {
    caches.keys().then(async names => {
      const info = {};
      for (const n of names) {
        const c = await caches.open(n);
        info[n] = (await c.keys()).length;
      }
      event.source?.postMessage({ type: 'CACHE_INFO', info, version: VERSION });
    });
  }

  if (type === 'CACHE_QUESTIONS' && payload?.questions) {
    caches.open(QUESTIONS_CACHE).then(cache => {
      const key = `questions_${payload.category}_${payload.subCategory}`;
      cache.put(key, new Response(JSON.stringify(payload.questions), {
        headers: { 'Content-Type': 'application/json' }
      }));
    });
  }
});

// ── PUSH ─────────────────────────────────────────────────────
self.addEventListener('push', event => {
  const data  = event.data?.json() || {};
  const title = data.title || 'شغل مخك 🧠';
  const body  = data.body  || 'تحدي اليوم ينتظرك!';
  const icon  = data.icon  || 'https://i.postimg.cc/qqTBP312/1000061201.png';
  event.waitUntil(
    self.registration.showNotification(title, {
      body, icon, badge: icon,
      dir: 'rtl', lang: 'ar',
      tag: 'shaghel-notif', renotify: true,
      vibrate: [200, 100, 200],
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) if ('focus' in c) return c.focus();
      if (clients.openWindow) return clients.openWindow('./');
    })
  );
});

console.log(`[SW ${VERSION}] ✅ شغل مخك — Service Worker ${VERSION} loaded`);

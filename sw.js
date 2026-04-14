// ═══════════════════════════════════════════════════════════
//  شغل مخك — Service Worker v4.0
//  v4: يكاش js/ folder كامل + تحديث تلقائي
// ═══════════════════════════════════════════════════════════

const CACHE_VERSION   = 'shaghel-mokh-v4';
const STATIC_CACHE    = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE   = `${CACHE_VERSION}-dynamic`;
const QUESTIONS_CACHE = `${CACHE_VERSION}-questions`;

const STATIC_ASSETS = [
  './index.html',
  './styles.css',
  './sw.js',
  './manifest.json',
  './admin.html',
  // js/ folder
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
  // CDN
  'https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;900&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/canvas-confetti/1.6.0/confetti.browser.min.js',
];

const OFFLINE_PAGE = './index.html';
const ADMIN_PAGE   = './admin.html';

// ── INSTALL ──────────────────────────────────────────────────
self.addEventListener('install', event => {
  console.log('[SW v4] Installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE).then(async cache => {
      const results = await Promise.allSettled(
        STATIC_ASSETS.map(url =>
          cache.add(url).catch(err =>
            console.warn(`[SW v4] ⚠️ ${url}: ${err.message}`)
          )
        )
      );
      const ok = results.filter(r => r.status === 'fulfilled').length;
      console.log(`[SW v4] ✅ ${ok}/${STATIC_ASSETS.length} cached`);
    })
  );
  self.skipWaiting();
});

// ── ACTIVATE ─────────────────────────────────────────────────
self.addEventListener('activate', event => {
  console.log('[SW v4] Activating...');
  event.waitUntil(
    caches.keys()
      .then(names => Promise.all(
        names
          .filter(n =>
            n.startsWith('shaghel-mokh-') &&
            n !== STATIC_CACHE &&
            n !== DYNAMIC_CACHE &&
            n !== QUESTIONS_CACHE
          )
          .map(n => { console.log('[SW v4] 🗑️ Deleting:', n); return caches.delete(n); })
      ))
      .then(() => { console.log('[SW v4] ✅ Activated'); return self.clients.claim(); })
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
        new Response(JSON.stringify({ offline: true }), {
          headers: { 'Content-Type': 'application/json' }
        })
      )
    );
    return;
  }

  // 2. Firebase JS SDK (gstatic) → Cache-First
  if (url.hostname.includes('gstatic.com')) {
    event.respondWith(cacheFirst(request, DYNAMIC_CACHE));
    return;
  }

  // 3. Gemini AI → Network Only
  if (url.hostname.includes('generativelanguage.googleapis.com')) {
    event.respondWith(
      fetch(request).catch(() =>
        new Response(JSON.stringify({ error: 'offline' }), {
          headers: { 'Content-Type': 'application/json' }
        })
      )
    );
    return;
  }

  // 4. Fonts & CDN → Stale-While-Revalidate
  if (
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com')    ||
    url.hostname.includes('cdnjs.cloudflare.com')
  ) {
    event.respondWith(staleWhileRevalidate(request, DYNAMIC_CACHE));
    return;
  }

  // 5. الصور → Cache-First
  if (request.destination === 'image' || url.hostname.includes('postimg.cc')) {
    event.respondWith(cacheFirst(request, DYNAMIC_CACHE));
    return;
  }

  // 6. الملفات المحلية → Cache-First مع fallback
  if (
    url.origin === self.location.origin ||
    request.url.endsWith('.html') ||
    request.url.endsWith('.css')  ||
    request.url.endsWith('.js')   ||
    request.url.endsWith('.json')
  ) {
    event.respondWith(
      cacheFirst(request, STATIC_CACHE).catch(async () => {
        if (request.url.includes('admin')) {
          return (await caches.match(ADMIN_PAGE)) || caches.match(OFFLINE_PAGE);
        }
        return caches.match(OFFLINE_PAGE);
      })
    );
    return;
  }

  // 7. الباقي → Network-First
  event.respondWith(networkFirst(request, DYNAMIC_CACHE));
});

// ── STRATEGIES ───────────────────────────────────────────────
async function cacheFirst(request, cacheName) {
  try {
    const cached = await caches.match(request);
    if (cached) return cached;
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
      return (await caches.match(OFFLINE_PAGE)) ||
             new Response('<h1 dir="rtl">غير متاح أوفلاين</h1>', { headers: { 'Content-Type': 'text/html' } });
    return new Response('', { status: 503 });
  }
}

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
    if (request.destination === 'document') return caches.match(OFFLINE_PAGE);
    return new Response('', { status: 503 });
  }
}

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

  if (type === 'SKIP_WAITING') self.skipWaiting();

  if (type === 'CLEAR_CACHE') {
    caches.keys()
      .then(names => Promise.all(names.map(n => caches.delete(n))))
      .then(() => event.source?.postMessage({ type: 'CACHE_CLEARED' }));
  }

  if (type === 'CACHE_QUESTIONS' && payload?.questions) {
    caches.open(QUESTIONS_CACHE).then(cache => {
      const key = `questions_${payload.category}_${payload.subCategory}`;
      cache.put(key, new Response(JSON.stringify(payload.questions), {
        headers: { 'Content-Type': 'application/json' }
      }));
    });
  }

  if (type === 'GET_CACHED_QUESTIONS') {
    const key = `questions_${payload?.category}_${payload?.subCategory}`;
    caches.open(QUESTIONS_CACHE).then(async cache => {
      const resp = await cache.match(key);
      const data = resp ? await resp.json() : null;
      event.source?.postMessage({ type: 'CACHED_QUESTIONS', questions: data, key });
    });
  }

  if (type === 'GET_CACHE_INFO') {
    caches.keys().then(async names => {
      const info = {};
      for (const n of names) { const c = await caches.open(n); info[n] = (await c.keys()).length; }
      event.source?.postMessage({ type: 'CACHE_INFO', info });
    });
  }
});

// ── PUSH NOTIFICATIONS ────────────────────────────────────────
self.addEventListener('push', event => {
  const data  = event.data?.json() || {};
  const title = data.title || 'شغل مخك 🧠';
  const body  = data.body  || 'تحدي اليوم ينتظرك!';
  const icon  = data.icon  || 'https://i.postimg.cc/qqTBP312/1000061201.png';
  event.waitUntil(
    self.registration.showNotification(title, {
      body, icon, badge: icon,
      dir: 'rtl', lang: 'ar',
      tag: 'shaghel-mokh-notif', renotify: true,
      vibrate: [200, 100, 200],
      actions: [
        { action: 'play',    title: '🎮 العب الآن' },
        { action: 'dismiss', title: 'لاحقاً'       }
      ]
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'dismiss') return;
  const url = event.notification.data?.url || './index.html';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) if (c.url.includes('index.html') && 'focus' in c) return c.focus();
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

self.addEventListener('sync', event => {
  if (event.tag === 'sync-scores') console.log('[SW v4] Background sync...');
});

console.log('[SW v4] ✅ شغل مخك — Service Worker v4.0');

// ═══════════════════════════════════════════════════════════
//  شغل مخك — Service Worker v3.0
//  v3: أضفنا admin.html + sw.js + styles.css في الكاش
//      + تحسين fallback للأدمن
//      + رسالة GET_CACHE_INFO للتشخيص
// ═══════════════════════════════════════════════════════════

// ── رقم الإصدار — غيّره كل ما تعدّل الملفات ──────────────
// تغيير الرقم ده يخلي الكاش القديم يتحذف تلقائياً
// ويتنزل كاش جديد بدون تدخل المستخدم
const CACHE_VERSION   = 'shaghel-mokh-v3';
const STATIC_CACHE    = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE   = `${CACHE_VERSION}-dynamic`;
const QUESTIONS_CACHE = `${CACHE_VERSION}-questions`;

// ── الملفات الأساسية — بتتخزن فوراً عند أول تشغيل ─────────
const STATIC_ASSETS = [
  // ── ملفات اللعبة الأساسية ──
  './index.html',
  './styles.css',
  './app.js',
  './sw.js',
  './manifest.json',
  // ── لوحة الأدمن ──
  './admin.html',
  // ── Google Fonts ──
  'https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;900&display=swap',
  // ── Font Awesome (اللعبة 6.4 + الأدمن 6.5) ──
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css',
  // ── Confetti ──
  'https://cdnjs.cloudflare.com/ajax/libs/canvas-confetti/1.6.0/confetti.browser.min.js',
];

const OFFLINE_FALLBACK_PAGE = './index.html';
const ADMIN_FALLBACK_PAGE   = './admin.html';

// ── INSTALL ──────────────────────────────────────────────────
self.addEventListener('install', event => {
  console.log('[SW v3] Installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE).then(async cache => {
      console.log('[SW v3] Caching static assets...');
      const results = await Promise.allSettled(
        STATIC_ASSETS.map(url =>
          cache.add(url).then(() => {
            console.log(`[SW v3] ✅ ${url}`);
          }).catch(err => {
            console.warn(`[SW v3] ⚠️ Failed: ${url} —`, err.message);
          })
        )
      );
      const ok = results.filter(r => r.status === 'fulfilled').length;
      console.log(`[SW v3] Cached ${ok}/${STATIC_ASSETS.length} assets`);
    })
  );
  self.skipWaiting();
});

// ── ACTIVATE ─────────────────────────────────────────────────
self.addEventListener('activate', event => {
  console.log('[SW v3] Activating...');
  event.waitUntil(
    caches.keys().then(cacheNames =>
      Promise.all(
        cacheNames
          .filter(name =>
            name.startsWith('shaghel-mokh-') &&
            name !== STATIC_CACHE &&
            name !== DYNAMIC_CACHE &&
            name !== QUESTIONS_CACHE
          )
          .map(name => {
            console.log('[SW v3] 🗑️ Deleting old cache:', name);
            return caches.delete(name);
          })
      )
    ).then(() => {
      console.log('[SW v3] ✅ Activated');
      return self.clients.claim();
    })
  );
});

// ── FETCH ────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Firebase / Firestore / Auth → Network Only
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
        new Response(JSON.stringify({ error: 'offline', message: 'AI يحتاج إنترنت' }), {
          headers: { 'Content-Type': 'application/json' }
        })
      )
    );
    return;
  }

  // 4. Google Fonts & Cloudflare CDN → Stale-While-Revalidate
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

  // 6. الملفات المحلية (HTML / CSS / JS / JSON) → Cache-First
  if (
    url.origin === self.location.origin  ||
    request.url.endsWith('.html')        ||
    request.url.endsWith('.css')         ||
    request.url.endsWith('.js')          ||
    request.url.endsWith('.json')
  ) {
    event.respondWith(
      cacheFirst(request, STATIC_CACHE).catch(async () => {
        if (request.url.includes('admin')) {
          return (await caches.match(ADMIN_FALLBACK_PAGE)) || caches.match(OFFLINE_FALLBACK_PAGE);
        }
        return caches.match(OFFLINE_FALLBACK_PAGE);
      })
    );
    return;
  }

  // 7. الباقي → Network-First
  event.respondWith(networkFirst(request, DYNAMIC_CACHE));
});

// ── CACHE STRATEGIES ─────────────────────────────────────────

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
  } catch(err) {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (request.destination === 'document') {
      return (await caches.match(OFFLINE_FALLBACK_PAGE)) ||
             new Response('<h1>غير متاح أوفلاين</h1>', { headers: { 'Content-Type': 'text/html' } });
    }
    return new Response('', { status: 503, statusText: 'Service Unavailable' });
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
  } catch(err) {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (request.destination === 'document') {
      return caches.match(OFFLINE_FALLBACK_PAGE);
    }
    return new Response('', { status: 503, statusText: 'Service Unavailable' });
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache  = await caches.open(cacheName);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request).then(response => {
    if (response && response.status === 200 && request.method === 'GET') {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => null);
  return cached || fetchPromise;
}

// ── MESSAGES ─────────────────────────────────────────────────
self.addEventListener('message', event => {
  const { type, payload } = event.data || {};

  if (type === 'SKIP_WAITING') {
    console.log('[SW v3] Skip waiting');
    self.skipWaiting();
  }

  if (type === 'CLEAR_CACHE') {
    caches.keys().then(names => {
      Promise.all(names.map(n => caches.delete(n))).then(() => {
        console.log('[SW v3] ✅ All caches cleared');
        event.source?.postMessage({ type: 'CACHE_CLEARED' });
      });
    });
  }

  if (type === 'CACHE_QUESTIONS' && payload?.questions) {
    caches.open(QUESTIONS_CACHE).then(cache => {
      const key  = `questions_${payload.category}_${payload.subCategory}`;
      const resp = new Response(JSON.stringify(payload.questions), {
        headers: { 'Content-Type': 'application/json' }
      });
      cache.put(key, resp);
      console.log(`[SW v3] 📦 Cached questions: ${key}`);
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
      for (const name of names) {
        const cache = await caches.open(name);
        const keys  = await cache.keys();
        info[name]  = keys.length;
      }
      event.source?.postMessage({ type: 'CACHE_INFO', info });
    });
  }
});

// ── BACKGROUND SYNC ───────────────────────────────────────────
self.addEventListener('sync', event => {
  if (event.tag === 'sync-scores') {
    console.log('[SW v3] Background sync: scores...');
  }
});

// ── PUSH NOTIFICATIONS ────────────────────────────────────────
self.addEventListener('push', event => {
  const data  = event.data?.json() || {};
  const title = data.title || 'شغل مخك 🧠';
  const body  = data.body  || 'تحدي اليوم ينتظرك!';
  const icon  = data.icon  || 'https://i.postimg.cc/qqTBP312/1000061201.png';
  const badge = data.badge || 'https://i.postimg.cc/qqTBP312/1000061201.png';
  const url   = data.url   || './index.html';

  event.waitUntil(
    self.registration.showNotification(title, {
      body, icon, badge,
      dir: 'rtl', lang: 'ar',
      tag: 'shaghel-mokh-notif',
      renotify: true,
      vibrate: [200, 100, 200],
      data: { url },
      actions: [
        { action: 'play',    title: '🎮 العب الآن' },
        { action: 'dismiss', title: 'لاحقاً'      }
      ]
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'dismiss') return;
  const url = event.notification.data?.url || './index.html';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes('index.html') && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

console.log('[SW v3] ✅ Service Worker v3.0 — شغل مخك Ultra');

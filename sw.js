// ═══════════════════════════════════════════════════════════
//  شغل مخك — Service Worker v1.0
//  استراتيجية: Cache-First للملفات الثابتة، Network-First للـ API
// ═══════════════════════════════════════════════════════════

const CACHE_VERSION   = 'shaghel-mokh-v1';
const STATIC_CACHE    = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE   = `${CACHE_VERSION}-dynamic`;
const QUESTIONS_CACHE = `${CACHE_VERSION}-questions`;

// ── الملفات الأساسية المطلوب تخزينها فوراً ──────────────────
const STATIC_ASSETS = [
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  // Google Fonts
  'https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;900&display=swap',
  // Font Awesome
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  // Confetti
  'https://cdnjs.cloudflare.com/ajax/libs/canvas-confetti/1.6.0/confetti.browser.min.js',
];

// ── الـ URLs اللي لازم تشتغل أوفلاين بـ fallback ────────────
const OFFLINE_FALLBACK_PAGE = './index.html';

// ── INSTALL: تخزين الملفات الأساسية ────────────────────────
self.addEventListener('install', event => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE).then(async cache => {
      console.log('[SW] Caching static assets');
      // تخزين كل ملف على حدة — لو فيه ملف فشل ميوقفش الباقي
      const results = await Promise.allSettled(
        STATIC_ASSETS.map(url =>
          cache.add(url).catch(err => {
            console.warn(`[SW] Failed to cache: ${url}`, err);
          })
        )
      );
      console.log('[SW] Static assets cached:', results.filter(r => r.status === 'fulfilled').length, '/', STATIC_ASSETS.length);
    })
  );
  // تفعيل الـ SW فوراً بدون انتظار
  self.skipWaiting();
});

// ── ACTIVATE: مسح الكاشات القديمة ───────────────────────────
self.addEventListener('activate', event => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name =>
            name.startsWith('shaghel-mokh-') &&
            name !== STATIC_CACHE &&
            name !== DYNAMIC_CACHE &&
            name !== QUESTIONS_CACHE
          )
          .map(name => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => {
      console.log('[SW] Activated, claiming clients...');
      return self.clients.claim();
    })
  );
});

// ── FETCH: استراتيجية ذكية لكل نوع طلب ─────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // ── 1. Firebase / Firestore / Auth → Network Only ──
  //    بيانات اللاعب لازم تيجي من السيرفر دايماً
  if (
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('firebase.googleapis.com') ||
    url.hostname.includes('firebaseapp.com') ||
    url.hostname.includes('identitytoolkit.googleapis.com') ||
    url.hostname.includes('securetoken.googleapis.com')
  ) {
    event.respondWith(
      fetch(request).catch(() => {
        // Firebase فشل — اللعبة هتشتغل أوفلاين من الـ localStorage
        return new Response(JSON.stringify({ offline: true }), {
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // ── 2. Firebase JS SDK (gstatic) → Cache-First ──
  if (url.hostname.includes('gstatic.com')) {
    event.respondWith(cacheFirst(request, DYNAMIC_CACHE));
    return;
  }

  // ── 3. Gemini AI → Network Only (لا كاشينج للـ AI) ──
  if (url.hostname.includes('generativelanguage.googleapis.com')) {
    event.respondWith(fetch(request).catch(() =>
      new Response(JSON.stringify({ error: 'offline' }), {
        headers: { 'Content-Type': 'application/json' }
      })
    ));
    return;
  }

  // ── 4. Google Fonts & Cloudflare CDN → Stale-While-Revalidate ──
  if (
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com') ||
    url.hostname.includes('cdnjs.cloudflare.com')
  ) {
    event.respondWith(staleWhileRevalidate(request, DYNAMIC_CACHE));
    return;
  }

  // ── 5. الصور (Postimg وغيرها) → Cache-First ──
  if (request.destination === 'image' || url.hostname.includes('postimg.cc')) {
    event.respondWith(cacheFirst(request, DYNAMIC_CACHE));
    return;
  }

  // ── 6. الملفات المحلية (HTML, CSS, JS) → Cache-First ──
  if (
    url.origin === self.location.origin ||
    request.url.endsWith('.html') ||
    request.url.endsWith('.css')  ||
    request.url.endsWith('.js')   ||
    request.url.endsWith('.json')
  ) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // ── 7. باقي الطلبات → Network-First مع fallback ──
  event.respondWith(networkFirst(request, DYNAMIC_CACHE));
});

// ══════════════════════════════════════════════════════════
//  استراتيجيات الكاش
// ══════════════════════════════════════════════════════════

// Cache-First: جيب من الكاش، لو مش موجود جيب من الشبكة
async function cacheFirst(request, cacheName) {
  try {
    const cached = await caches.match(request);
    if (cached) return cached;

    const response = await fetch(request);
    if (response && response.status === 200) {
      const cache = await caches.open(cacheName);
      // لا تكاش طلبات POST
      if (request.method === 'GET') {
        cache.put(request, response.clone());
      }
    }
    return response;
  } catch(err) {
    // الشبكة فشلت والكاش فارغ
    const cached = await caches.match(request);
    if (cached) return cached;
    // Fallback للصفحة الرئيسية
    if (request.destination === 'document') {
      return caches.match(OFFLINE_FALLBACK_PAGE);
    }
    return new Response('', { status: 503 });
  }
}

// Network-First: جيب من الشبكة، لو فشلت جيب من الكاش
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
    return new Response('', { status: 503 });
  }
}

// Stale-While-Revalidate: رجّع الكاش فوراً وجدّد في الخلفية
async function staleWhileRevalidate(request, cacheName) {
  const cache    = await caches.open(cacheName);
  const cached   = await cache.match(request);

  // جدّد في الخلفية
  const fetchPromise = fetch(request).then(response => {
    if (response && response.status === 200 && request.method === 'GET') {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => null);

  return cached || fetchPromise;
}

// ══════════════════════════════════════════════════════════
//  رسائل من الـ App
// ══════════════════════════════════════════════════════════
self.addEventListener('message', event => {
  const { type, payload } = event.data || {};

  // تحديث الـ SW فوراً
  if (type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  // مسح كل الكاشات (لو المستخدم اختار)
  if (type === 'CLEAR_CACHE') {
    caches.keys().then(names => {
      Promise.all(names.map(n => caches.delete(n))).then(() => {
        event.source?.postMessage({ type: 'CACHE_CLEARED' });
      });
    });
  }

  // Pre-cache أسئلة تصنيف معين
  if (type === 'CACHE_QUESTIONS' && payload?.questions) {
    caches.open(QUESTIONS_CACHE).then(cache => {
      // خزّن الأسئلة كـ JSON في الكاش
      const key = `questions_${payload.category}_${payload.subCategory}`;
      const resp = new Response(JSON.stringify(payload.questions), {
        headers: { 'Content-Type': 'application/json' }
      });
      cache.put(key, resp);
    });
  }

  // Get cached questions
  if (type === 'GET_CACHED_QUESTIONS') {
    const key = `questions_${payload?.category}_${payload?.subCategory}`;
    caches.open(QUESTIONS_CACHE).then(async cache => {
      const resp = await cache.match(key);
      const data = resp ? await resp.json() : null;
      event.source?.postMessage({ type: 'CACHED_QUESTIONS', questions: data, key });
    });
  }
});

// ══════════════════════════════════════════════════════════
//  Background Sync (لو الشبكة رجعت)
// ══════════════════════════════════════════════════════════
self.addEventListener('sync', event => {
  if (event.tag === 'sync-scores') {
    console.log('[SW] Background sync: syncing scores...');
    // هنا ممكن نعمل sync للبيانات اللي اتخزنت أوفلاين
  }
});

// ══════════════════════════════════════════════════════════
//  Push Notifications
// ══════════════════════════════════════════════════════════
self.addEventListener('push', event => {
  const data = event.data?.json() || {};
  const title   = data.title   || 'شغل مخك 🧠';
  const body    = data.body    || 'تحدي اليوم ينتظرك!';
  const icon    = data.icon    || 'https://i.postimg.cc/qqTBP312/1000061201.png';
  const badge   = data.badge   || 'https://i.postimg.cc/qqTBP312/1000061201.png';
  const url     = data.url     || './index.html';

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge,
      dir:  'rtl',
      lang: 'ar',
      tag:  'shaghel-mokh-notif',
      renotify: true,
      vibrate: [200, 100, 200],
      data: { url },
      actions: [
        { action: 'play',   title: '🎮 العب الآن' },
        { action: 'dismiss', title: 'لاحقاً' }
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
      // لو التطبيق مفتوح خليه يتفتح في نفس النافذة
      for (const client of clientList) {
        if (client.url.includes('index.html') && 'focus' in client) {
          return client.focus();
        }
      }
      // لو مفيش نافذة مفتوحة افتح جديدة
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

console.log('[SW] Service Worker loaded ✅');

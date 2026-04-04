// ═══════════════════════════════════════════════════════════
//  شغل مخك — Service Worker v2.0
//  استراتيجية: Cache-First للملفات الثابتة، Network-First للـ API
//  v2: أضفنا admin.html + sw.js نفسه في الكاش
//      + تحسين استراتيجية الـ Firebase SDK
// ═══════════════════════════════════════════════════════════

// ── رقم الإصدار — غيّره كل ما تغير ملفات اللعبة ────────────
// هذا الرقم هو المفتاح: لو تغير → الـ SW القديم يتحذف تلقائياً
// ويتنزل النسخة الجديدة بدون ما المستخدم يعمل حاجة.
const CACHE_VERSION   = 'shaghel-mokh-v2';
const STATIC_CACHE    = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE   = `${CACHE_VERSION}-dynamic`;
const QUESTIONS_CACHE = `${CACHE_VERSION}-questions`;

// ── الملفات الأساسية المطلوب تخزينها فوراً ──────────────────
// هذي الملفات بتتخزن في أول تشغيل للـ SW وبتشتغل أوفلاين كامل.
// مهم: كل الملفات المحلية لازم تتزبط هنا.
const STATIC_ASSETS = [
  // ── ملفات اللعبة الأساسية ──
  './index.html',
  './styles.css',
  './app.js',
  './sw.js',
  './manifest.json',
  // ── لوحة الأدمن (محمية بكلمة مرور من جهة المتصفح) ──
  './admin.html',
  // ── Google Fonts ──
  'https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;900&display=swap',
  // ── Font Awesome (اللعبة الأساسية) ──
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  // ── Font Awesome (الأدمن يستخدم 6.5.0) ──
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css',
  // ── Confetti (للاحتفالات داخل اللعبة) ──
  'https://cdnjs.cloudflare.com/ajax/libs/canvas-confetti/1.6.0/confetti.browser.min.js',
];

// ── الـ URLs اللي لازم تشتغل أوفلاين بـ fallback ────────────
const OFFLINE_FALLBACK_PAGE = './index.html';
const ADMIN_FALLBACK_PAGE   = './admin.html';

// ── INSTALL: تخزين الملفات الأساسية ────────────────────────
self.addEventListener('install', event => {
  console.log('[SW v2] Installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE).then(async cache => {
      console.log('[SW v2] Caching static assets...');
      // تخزين كل ملف على حدة — لو فيه ملف فشل ميوقفش الباقي
      const results = await Promise.allSettled(
        STATIC_ASSETS.map(url =>
          cache.add(url).then(() => {
            console.log(`[SW v2] ✅ Cached: ${url}`);
          }).catch(err => {
            // بعض الـ URLs ممكن تفشل بسبب CORS — ده عادي ومش هيوقف الباقي
            console.warn(`[SW v2] ⚠️ Failed to cache: ${url}`, err.message);
          })
        )
      );
      const succeeded = results.filter(r => r.status === 'fulfilled').length;
      console.log(`[SW v2] Cached ${succeeded}/${STATIC_ASSETS.length} assets`);
    })
  );
  // تفعيل الـ SW فوراً بدون انتظار إغلاق التبويبات القديمة
  self.skipWaiting();
});

// ── ACTIVATE: مسح الكاشات القديمة ───────────────────────────
// بيمسح كل كاش اسمه بيبدأ بـ shaghel-mokh- ومش من الإصدار الحالي
self.addEventListener('activate', event => {
  console.log('[SW v2] Activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name =>
            // امسح كل كاش قديم من شغل مخك بس (مش كاشات تطبيقات تانية)
            name.startsWith('shaghel-mokh-') &&
            name !== STATIC_CACHE &&
            name !== DYNAMIC_CACHE &&
            name !== QUESTIONS_CACHE
          )
          .map(name => {
            console.log('[SW v2] 🗑️ Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => {
      console.log('[SW v2] ✅ Activated, claiming clients...');
      return self.clients.claim();
    })
  );
});

// ── FETCH: استراتيجية ذكية لكل نوع طلب ─────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // ── 1. Firebase / Firestore / Auth → Network Only ──────────
  //    بيانات اللاعب لازم تيجي من السيرفر دايماً
  //    لو فشلت الشبكة → اللعبة هتشتغل أوفلاين من الـ localStorage
  if (
    url.hostname.includes('firestore.googleapis.com')      ||
    url.hostname.includes('firebase.googleapis.com')       ||
    url.hostname.includes('firebaseapp.com')               ||
    url.hostname.includes('identitytoolkit.googleapis.com') ||
    url.hostname.includes('securetoken.googleapis.com')
  ) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(JSON.stringify({ offline: true }), {
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // ── 2. Firebase JS SDK (gstatic) → Cache-First ─────────────
  //    ملفات Firebase الكبيرة — خزّنها من أول مرة وبعدين من الكاش
  if (url.hostname.includes('gstatic.com')) {
    event.respondWith(cacheFirst(request, DYNAMIC_CACHE));
    return;
  }

  // ── 3. Gemini AI → Network Only (لا كاشينج للـ AI) ─────────
  //    ردود الـ AI مختلفة في كل مرة ومحتاجة إنترنت
  if (url.hostname.includes('generativelanguage.googleapis.com')) {
    event.respondWith(
      fetch(request).catch(() =>
        new Response(JSON.stringify({ error: 'offline', message: 'AI غير متاح بدون إنترنت' }), {
          headers: { 'Content-Type': 'application/json' }
        })
      )
    );
    return;
  }

  // ── 4. Google Fonts & Cloudflare CDN → Stale-While-Revalidate
  //    اعرض الكاش فوراً، وجدّد في الخلفية
  if (
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com')    ||
    url.hostname.includes('cdnjs.cloudflare.com')
  ) {
    event.respondWith(staleWhileRevalidate(request, DYNAMIC_CACHE));
    return;
  }

  // ── 5. الصور (Postimg وغيرها) → Cache-First ────────────────
  //    الصور كبيرة ومش بتتغير كتير — خزّن من أول مرة
  if (request.destination === 'image' || url.hostname.includes('postimg.cc')) {
    event.respondWith(cacheFirst(request, DYNAMIC_CACHE));
    return;
  }

  // ── 6. الملفات المحلية (HTML, CSS, JS, JSON) → Cache-First ─
  //    كل ملفات اللعبة والأدمن موجودة في الكاش
  if (
    url.origin === self.location.origin ||
    request.url.endsWith('.html')        ||
    request.url.endsWith('.css')         ||
    request.url.endsWith('.js')          ||
    request.url.endsWith('.json')
  ) {
    event.respondWith(
      cacheFirst(request, STATIC_CACHE).catch(async () => {
        // fallback ذكي: لو طلب admin.html → ADMIN_FALLBACK، غيره → index.html
        if (request.url.includes('admin')) {
          return caches.match(ADMIN_FALLBACK_PAGE) || caches.match(OFFLINE_FALLBACK_PAGE);
        }
        return caches.match(OFFLINE_FALLBACK_PAGE);
      })
    );
    return;
  }

  // ── 7. باقي الطلبات → Network-First مع fallback ────────────
  event.respondWith(networkFirst(request, DYNAMIC_CACHE));
});

// ══════════════════════════════════════════════════════════
//  استراتيجيات الكاش
// ══════════════════════════════════════════════════════════

// Cache-First: جيب من الكاش، لو مش موجود جيب من الشبكة وخزّن
async function cacheFirst(request, cacheName) {
  try {
    // حاول من الكاش الأول
    const cached = await caches.match(request);
    if (cached) return cached;

    // مش موجود في الكاش → جيب من الشبكة
    const response = await fetch(request);
    if (response && response.status === 200 && request.method === 'GET') {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch(err) {
    // الشبكة فشلت → حاول من الكاش تاني
    const cached = await caches.match(request);
    if (cached) return cached;

    // مفيش في الكاش وانقطع النت → fallback
    if (request.destination === 'document') {
      // لو طلب صفحة أدمن
      if (request.url.includes('admin')) {
        const adminFallback = await caches.match(ADMIN_FALLBACK_PAGE);
        if (adminFallback) return adminFallback;
      }
      // fallback للصفحة الرئيسية
      const mainFallback = await caches.match(OFFLINE_FALLBACK_PAGE);
      if (mainFallback) return mainFallback;
    }
    return new Response('', { status: 503, statusText: 'Service Unavailable' });
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
    return new Response('', { status: 503, statusText: 'Service Unavailable' });
  }
}

// Stale-While-Revalidate: رجّع الكاش فوراً، جدّد في الخلفية بدون انتظار
async function staleWhileRevalidate(request, cacheName) {
  const cache  = await caches.open(cacheName);
  const cached = await cache.match(request);

  // ابدأ التجديد في الخلفية بشكل متزامن (بدون await)
  const fetchPromise = fetch(request).then(response => {
    if (response && response.status === 200 && request.method === 'GET') {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => null);

  // لو في الكاش → رجّعه فوراً، لو مش في الكاش → استنى الشبكة
  return cached || fetchPromise;
}

// ══════════════════════════════════════════════════════════
//  رسائل من الـ App
// ══════════════════════════════════════════════════════════
self.addEventListener('message', event => {
  const { type, payload } = event.data || {};

  // ── تحديث الـ SW فوراً (يُستخدم من زرار "تحديث" في اللعبة) ──
  if (type === 'SKIP_WAITING') {
    console.log('[SW v2] Skip waiting requested');
    self.skipWaiting();
  }

  // ── مسح كل الكاشات (لو المستخدم اختار "مسح البيانات") ──
  if (type === 'CLEAR_CACHE') {
    caches.keys().then(names => {
      Promise.all(names.map(n => {
        console.log('[SW v2] 🗑️ Clearing cache:', n);
        return caches.delete(n);
      })).then(() => {
        console.log('[SW v2] ✅ All caches cleared');
        event.source?.postMessage({ type: 'CACHE_CLEARED' });
      });
    });
  }

  // ── Pre-cache أسئلة تصنيف معين (يُستخدم بعد تحميل الأسئلة) ──
  if (type === 'CACHE_QUESTIONS' && payload?.questions) {
    caches.open(QUESTIONS_CACHE).then(cache => {
      const key  = `questions_${payload.category}_${payload.subCategory}`;
      const resp = new Response(JSON.stringify(payload.questions), {
        headers: { 'Content-Type': 'application/json' }
      });
      cache.put(key, resp);
      console.log(`[SW v2] 📦 Cached questions: ${key}`);
    });
  }

  // ── جيب أسئلة مخزّنة (يُستخدم عند الأوفلاين) ──
  if (type === 'GET_CACHED_QUESTIONS') {
    const key = `questions_${payload?.category}_${payload?.subCategory}`;
    caches.open(QUESTIONS_CACHE).then(async cache => {
      const resp = await cache.match(key);
      const data = resp ? await resp.json() : null;
      event.source?.postMessage({ type: 'CACHED_QUESTIONS', questions: data, key });
    });
  }

  // ── طلب معلومات الكاش (للتشخيص) ──
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

// ══════════════════════════════════════════════════════════
//  Background Sync (لو الشبكة رجعت بعد فترة أوفلاين)
// ══════════════════════════════════════════════════════════
self.addEventListener('sync', event => {
  if (event.tag === 'sync-scores') {
    console.log('[SW v2] Background sync: syncing scores...');
    // هنا ممكن نعمل sync للبيانات اللي اتخزنت أوفلاين
    // الـ app.js بيعمل sync تلقائي لما الاتصال يرجع
  }
});

// ══════════════════════════════════════════════════════════
//  Push Notifications (من السيرفر لو اتفعّل)
// ══════════════════════════════════════════════════════════
self.addEventListener('push', event => {
  const data  = event.data?.json() || {};
  const title = data.title || 'شغل مخك 🧠';
  const body  = data.body  || 'تحدي اليوم ينتظرك!';
  const icon  = data.icon  || 'https://i.postimg.cc/qqTBP312/1000061201.png';
  const badge = data.badge || 'https://i.postimg.cc/qqTBP312/1000061201.png';
  const url   = data.url   || './index.html';

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge,
      dir:      'rtl',
      lang:     'ar',
      tag:      'shaghel-mokh-notif',
      renotify: true,
      vibrate:  [200, 100, 200],
      data:     { url },
      actions:  [
        { action: 'play',    title: '🎮 العب الآن' },
        { action: 'dismiss', title: 'لاحقاً'      }
      ]
    })
  );
});

// ── معالجة ضغط المستخدم على الإشعار ──
self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'dismiss') return;

  const url = event.notification.data?.url || './index.html';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      // لو التطبيق مفتوح → ركّز عليه بدل ما تفتح تبويب جديد
      for (const client of clientList) {
        if (client.url.includes('index.html') && 'focus' in client) {
          return client.focus();
        }
      }
      // لو مفيش نافذة مفتوحة → افتح جديدة
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

console.log('[SW v2] ✅ Service Worker v2.0 loaded — شغل مخك Ultra');

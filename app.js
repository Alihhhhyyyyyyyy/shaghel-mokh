import { collection, getDocs, addDoc, doc, setDoc, onSnapshot,
         query, orderBy, limit, where, deleteDoc, updateDoc, getDoc, deleteField }
  from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// ─── OFFLINE SAVE QUEUE ────────────────────────────────────────────
// لو الحفظ فشل أوفلاين، نخزّن في localStorage ونعمل sync لما الاتصال يرجع
const OFFLINE_QUEUE_KEY = 'shaghel_offline_queue';

function queueOfflineSave(data) {
  try {
    const queue = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
    queue.push({ data, ts: Date.now() });
    // خلّي الـ queue صغيرة — آخر 3 حفظات بس
    const trimmed = queue.slice(-3);
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(trimmed));
  } catch(e) {}
}

async function syncOfflineQueue() {
  if (!window.firebaseReady || !window.currentUser) return;
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    if (!raw) return;
    const queue = JSON.parse(raw);
    if (!queue.length) return;
    // خذ آخر حفظ فقط (الأحدث يلغي القديم)
    const last = queue[queue.length - 1];
    await setDoc(
      doc(window.db, 'artifacts', window.appId, 'users', window.currentUser.uid, 'profile', 'data'),
      last.data,
      { merge: true }
    );
    localStorage.removeItem(OFFLINE_QUEUE_KEY);
    console.log('[Offline] Synced queued save ✅');
  } catch(e) {
    console.warn('[Offline] Sync failed:', e);
  }
}

// Sync when coming back online
window.addEventListener('online', () => {
  setTimeout(syncOfflineQueue, 2000);
});


// ─── CONSTANTS ────────────────────────────────────────────────────
const GEMINI_KEY = '';

const ACCENT_COLORS = [
  {name:'ذهبي',    val:'#fbbf24', val2:'#f59e0b'},
  {name:'أزرق',    val:'#60a5fa', val2:'#3b82f6'},
  {name:'أخضر',    val:'#34d399', val2:'#10b981'},
  {name:'وردي',    val:'#f472b6', val2:'#ec4899'},
  {name:'بنفسجي',  val:'#a78bfa', val2:'#8b5cf6'},
  {name:'برتقالي', val:'#fb923c', val2:'#f97316'},
];

const AVATAR_FRAMES = [
  {id:'none',    name:'بلا إطار', price:0,    style:''},
  {id:'gold',    name:'ذهبي',     price:500,  style:'box-shadow:0 0 0 4px #fbbf24,0 0 20px rgba(251,191,36,.5)'},
  {id:'rainbow', name:'قوس قزح', price:1200, style:'box-shadow:0 0 0 4px transparent;background:linear-gradient(#ff0080,#7928ca,#0070f3) padding-box,linear-gradient(to right,#ff0080,#7928ca,#0070f3) border-box;border:3px solid transparent'},
  {id:'fire',    name:'نار 🔥',   price:800,  style:'box-shadow:0 0 0 4px #f97316,0 0 25px rgba(249,115,22,.6),0 0 50px rgba(239,68,68,.3)'},
  {id:'ice',     name:'جليد ❄️',  price:800,  style:'box-shadow:0 0 0 4px #93c5fd,0 0 25px rgba(147,197,253,.5)'},
  {id:'star',    name:'نجوم ⭐',  price:1500, style:'box-shadow:0 0 0 4px #fbbf24,0 0 20px #fbbf24,0 0 40px rgba(251,191,36,.4);animation:pulse 2s infinite'},
];

const categoryConfig = {
  islamic:{name:"إسلاميات",   icon:"🕌", subs:["قصص الأنبياء","القرآن الكريم","السيرة النبوية","الفقه الميسر"],  order:0},
  egypt:  {name:"تاريخ مصر",  icon:"🏺", subs:["الفراعنة","مصر الحديثة","آثار النوبة","ثورات مصر"],             order:1},
  tech:   {name:"تقنية",      icon:"💻", subs:["برمجة","ذكاء اصطناعي","أمن سيبراني","تاريخ الحواسيب"],         order:2},
  science:{name:"علوم وفضاء", icon:"🚀", subs:["الفضاء","جسم الإنسان","الكيمياء","الفيزياء الكمية"],           order:3},
  geo:    {name:"جغرافيا",    icon:"🌍", subs:["عواصم","أعلام","عجائب الدنيا","تضاريس الأرض"],                 order:4},
  sports: {name:"رياضة",      icon:"⚽", subs:["كرة قدم","أساطير","الأولمبياد","كأس العالم"],                   order:5},
  puzzles:{name:"ألغاز",      icon:"🧩", subs:["منطق","أحجيات","رياضيات","ذكاء بصري"],                         order:6},
  food:   {name:"طعام",       icon:"🍱", subs:["أطباق عالمية","حلويات","توابل","فواكه نادرة"],                  order:7},
};

const FALLBACK = [
  {t:"ما عاصمة مصر؟",                  a:["الإسكندرية","القاهرة","أسوان","الجيزة"],              c:1, x:"القاهرة عاصمة مصر وأكبر مدنها"},
  {t:"كم عدد أركان الإسلام؟",           a:["3","4","5","6"],                                      c:2, x:"أركان الإسلام الخمسة: الشهادتان، الصلاة، الزكاة، الصوم، الحج"},
  {t:"أكبر كوكب في المجموعة الشمسية؟",  a:["زحل","المشتري","أورانوس","نبتون"],                   c:1, x:"المشتري أكبر كوكب، حجمه أكثر من 1300 مرة حجم الأرض"},
  {t:"من اخترع الهاتف؟",                a:["إديسون","فاراداي","غراهام بيل","نيوتن"],               c:2, x:"اخترع غراهام بيل الهاتف عام 1876"},
  {t:"ما اختصار CPU؟",                  a:["Control Power Unit","Central Processing Unit","Computer Power Unit","Core Processing Unit"], c:1, x:"CPU هي وحدة المعالجة المركزية"},
  {t:"كم يوماً في السنة الكبيسة؟",      a:["364","365","366","367"],                              c:2, x:"السنة الكبيسة تحتوي 366 يوماً"},
  {t:"أعمق محيطات العالم؟",             a:["الهندي","الأطلسي","المتجمد الشمالي","الهادئ"],        c:3, x:"المحيط الهادئ هو الأكبر والأعمق"},
  {t:"من رسم الموناليزا؟",              a:["ميكيلانجيلو","رافاييل","ليوناردو دافينشي","بيكاسو"],  c:2, x:"رسمها ليوناردو دافينشي بين 1503-1519"},
  {t:"كم سورة في القرآن الكريم؟",       a:["110","112","114","116"],                              c:2, x:"القرآن الكريم يتكون من 114 سورة"},
  {t:"أطول نهر في العالم؟",             a:["الأمازون","النيل","المسيسيبي","الفولغا"],             c:1, x:"نهر النيل في أفريقيا هو الأطول بطول 6650 كم"},
];

// ─── STATE ────────────────────────────────────────────────────────
let currentQuestions  = [];
let currentIdx        = 0;
let selectedCategory  = '';
let selectedSub       = '';
let timerInterval     = null;
let timeLeft          = 15;
let quizCorrect       = 0;
let quizWrong         = 0;
let quizCoins         = 0;
let quizXP            = 0;
let lastFreeCoinsDate = '';
let isRoomGame        = false;
let isDailyChallenge  = false;
let currentRoomId     = null;
let roomUnsubscribe   = null;
let roomsUnsubscribe  = null;
let currentLbTab      = 'global';
let _msgDebounce      = null;
let _inputResolve     = null;

// ─── HELPERS ──────────────────────────────────────────────────────
const $   = id => document.getElementById(id);
const set = (id, v) => { const e = $(id); if (e) e.innerText = v; };

window.playSound = id => {
  if (window.gameData?.soundEnabled === false) return;
  try { const s = $(id); if (s) { s.currentTime = 0; s.play(); } } catch(e) {}
};

window.showToast = (msg, dur = 2800) => {
  const c = $('toast-container'); if (!c) return;
  const el = document.createElement('div');
  el.className = 'toast-msg';
  el.innerText = msg;
  c.appendChild(el);
  setTimeout(() => { el.classList.add('hide'); setTimeout(() => el.remove(), 350); }, dur);
};

// ─── MODAL HELPERS (единственное объявление) ──────────────────────
const openModal  = type => { $(`modal-${type}`)?.classList.add('active');    document.body.style.overflow = 'hidden'; };
const closeModalFn = type => { $(`modal-${type}`)?.classList.remove('active'); document.body.style.overflow = ''; };
window.closeModal = closeModalFn;

// ─── CUSTOM DIALOGS ───────────────────────────────────────────────
window.showConfirmDialog = opts => {
  $('cmod-ico').innerText  = opts.icon  || '⚠️';
  $('cmod-ttl').innerText  = opts.title || 'هل أنت متأكد؟';
  $('cmod-msg').innerText  = opts.msg   || '';
  const btn = $('cmod-yes');
  btn.innerText  = opts.okText  || 'تأكيد';
  btn.className  = `cmod-btn ${opts.okClass || 'danger'}`;
  btn.onclick    = () => { $('cmod-confirm').classList.remove('active'); opts.onOk && opts.onOk(); };
  $('cmod-confirm').classList.add('active');
};
window._cancelConfirm = () => $('cmod-confirm').classList.remove('active');

window.showInputDialog = (def = '') => new Promise(res => {
  _inputResolve = res;
  const f = $('cmod-inp-field');
  f.value = def;
  $('cmod-inp-hint').innerText = `${def.length} / 15 حرف`;
  $('cmod-input').classList.add('active');
  setTimeout(() => f.focus(), 350);
});
window._confirmInput = () => {
  const v = $('cmod-inp-field').value.trim();
  $('cmod-input').classList.remove('active');
  if (_inputResolve) { _inputResolve(v); _inputResolve = null; }
};
window._cancelInput = () => {
  $('cmod-input').classList.remove('active');
  if (_inputResolve) { _inputResolve(null); _inputResolve = null; }
};
window.confirmExit  = ()  => $('cmod-exit').classList.add('active');
window._confirmExit = ()  => { $('cmod-exit').classList.remove('active'); clearInterval(timerInterval); window.navTo('map'); };
window._cancelExit  = ()  => $('cmod-exit').classList.remove('active');

// expose openModal globally for HTML onclick attributes
window.openJoinRoomModal = () => openModal('join-room');

// ─── UPDATE UI ────────────────────────────────────────────────────
window.updateUI = () => {
  const d = window.gameData; if (!d) return;
  set('coin-count',    d.coins);
  set('top-lvl',       d.level);
  set('side-coins',    d.coins);
  set('side-lvl',      d.level);
  set('side-name',     d.username);
  set('side-rank',     d.rank);
  set('side-sections', d.stats?.completedSections || 0);
  set('side-xp-label', `${d.xp || 0} / ${(d.level || 1) * 1500}`);
  set('h-del',         d.inventory?.delete ?? 0);
  set('h-hint',        d.inventory?.hint   ?? 0);
  set('h-skip',        d.inventory?.skip   ?? 0);
  set('home-lvl-badge',`المستوى ${d.level}`);

  // XP bar
  const xpFill = $('side-xp-fill');
  if (xpFill) xpFill.style.width = Math.min(((d.xp || 0) / ((d.level || 1) * 1500)) * 100, 100) + '%';

  // Avatars
  const avatarSrc = d.avatar || 'https://i.postimg.cc/qqTBP312/1000061201.png';
  ['home-avatar', 'side-avatar'].forEach(id => { const img = $(id); if (img) img.src = avatarSrc; });

  // Avatar frame
  const frameData = AVATAR_FRAMES.find(f => f.id === (d.avatarFrame || 'none')) || AVATAR_FRAMES[0];
  ['home-avatar-frame', 'side-avatar-frame'].forEach(id => {
    const el = $(id); if (!el) return;
    el.style.cssText = frameData.style || '';
    el.style.borderRadius = id === 'home-avatar-frame' ? '44px' : '50%';
  });

  // Accent color
  if (d.accentColor) {
    const ac = ACCENT_COLORS.find(c => c.val === d.accentColor) || ACCENT_COLORS[0];
    document.documentElement.style.setProperty('--accent',  ac.val);
    document.documentElement.style.setProperty('--accent2', ac.val2);
    document.documentElement.style.setProperty('--grad',    `linear-gradient(135deg,${ac.val},${ac.val2})`);
  }

  // Theme
  const isDark = d.theme !== 'light';
  document.body.classList.toggle('light-mode', !isDark);
  const themeToggle = $('theme-toggle');
  if (themeToggle) themeToggle.classList.toggle('on', isDark);
  const themeIconSb  = $('theme-icon-sb');
  const themeLabelSb = $('theme-label-sb');
  if (themeIconSb)  themeIconSb.innerText  = isDark ? '🌙' : '☀️';
  if (themeLabelSb) themeLabelSb.innerText = isDark ? 'الوضع الليلي' : 'الوضع النهاري';

  // Sound
  const isSoundOn = d.soundEnabled !== false;
  const st = $('sound-toggle-sb');
  if (st) st.classList.toggle('on', isSoundOn);
  const si = $('sound-icon-sb');
  if (si) si.innerText = isSoundOn ? '🔊' : '🔇';

  // Helper empty state
  ['skip', 'hint', 'del'].forEach(t => {
    const inv = t === 'del' ? 'delete' : t;
    const btn = $(t === 'del' ? 'btn-del' : `btn-${t}`);
    if (btn) btn.classList.toggle('empty', (d.inventory?.[inv] ?? 0) <= 0);
  });

  // Quiz streak badge
  const streak = d.stats?.currentStreak || 0;
  const sb = $('quiz-streak-badge'); const sn = $('quiz-streak-num');
  if (sb && sn) { sn.innerText = streak; sb.style.display = streak >= 2 ? 'inline-flex' : 'none'; }

  updateDailyTeaser();

  // Message input
  const msgInp = $('my-message-input');
  if (msgInp && msgInp !== document.activeElement) msgInp.value = d.message || '';
};

function updateDailyTeaser() {
  const d = window.gameData; if (!d) return;
  const today = new Date().toDateString();
  const done  = d.dailyChallengeDate === today;
  const teaserStatus = $('daily-teaser-status');
  const dailyProg    = $('home-daily-prog');
  const dot          = $('daily-notif-dot');
  if (teaserStatus) teaserStatus.innerText = done ? `✅ نقطتك: ${d.dailyChallengeScore || 0}/10` : '👆 العب الآن!';
  if (dailyProg)    dailyProg.style.width  = done ? '100%' : '0%';
  if (dot)          dot.classList.toggle('show', !done);
}

// ─── NAVIGATION ───────────────────────────────────────────────────
window.navTo = id => {
  clearInterval(timerInterval);
  document.querySelectorAll('.screen').forEach(s  => s.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(n => n.classList.remove('active'));
  const scr = $(`screen-${id}`); if (scr) scr.classList.add('active');
  const nav = $(`n-${id}`);      if (nav) nav.classList.add('active');
  $('main-nav').style.display = ['quiz', 'result', 'lobby'].includes(id) ? 'none' : 'flex';
  if (id === 'map')         renderMap();
  if (id === 'leaderboard') window.renderLeaderboard(currentLbTab);
  if (id === 'daily')       renderDailyChallenge();
  if (id === 'rooms')       loadRooms();
  if (id === 'shop')        renderShop('helpers');
  if (id === 'stats')       renderStats();
};

// ─── SIDEBAR ──────────────────────────────────────────────────────
window.toggleSidebar = () => {
  const s = $('sidebar'), o = $('sb-overlay');
  const open = s.classList.toggle('open');
  o.style.display = open ? 'block' : 'none';
  if (open) { window.updateUI(); renderColorPicker(); }
};

window.toggleSettings = () => {
  const panel = $('settings-panel');
  const arrow = $('settings-arrow');
  const dot   = $('settings-dot');
  const open  = panel.classList.toggle('open');
  if (arrow) arrow.style.transform = open ? 'rotate(90deg)' : '';
  if (dot)   dot.style.opacity     = open ? '1' : '0';
};

window.toggleTheme = () => {
  window.gameData.theme = window.gameData.theme === 'dark' ? 'light' : 'dark';
  window.updateUI(); window.saveData();
};
window.toggleSound = () => {
  window.gameData.soundEnabled = !(window.gameData.soundEnabled !== false);
  window.updateUI(); window.saveData();
  window.showToast(window.gameData.soundEnabled ? '🔊 الصوت مفعّل' : '🔇 الصوت مكتوم');
};
window.changeUsername = async () => {
  const name = await window.showInputDialog(window.gameData.username);
  if (name === null) return;
  if (name.length >= 3 && name.length <= 15) {
    window.gameData.username = name;
    await window.saveData(); window.updateUI(); window.showToast('✅ تم تغيير الاسم!');
  } else if (name.length > 0) window.showToast('❌ الاسم يجب 3-15 حرفاً');
};
window.saveMessageDebounced = () => {
  clearTimeout(_msgDebounce);
  _msgDebounce = setTimeout(() => {
    window.gameData.message = $('my-message-input').value.trim();
    window.saveData();
  }, 800);
};

// ─── COLOR THEMES PICKER ──────────────────────────────────────────
function renderColorPicker() {
  const container = $('theme-color-picker'); if (!container) return;
  container.innerHTML = '';
  ACCENT_COLORS.forEach(c => {
    const btn = document.createElement('div');
    btn.className = 'theme-color-btn' + (window.gameData.accentColor === c.val ? ' active' : '');
    btn.style.background = c.val;
    btn.title = c.name;
    btn.onclick = () => {
      window.gameData.accentColor = c.val;
      window.updateUI(); window.saveData(); renderColorPicker();
      window.showToast(`🎨 تم تغيير اللون إلى ${c.name}`);
    };
    container.appendChild(btn);
  });
}

// ─── NOTIFICATIONS ────────────────────────────────────────────────
window.requestNotifPermission = async () => {
  if (!('Notification' in window)) { window.showToast('❌ المتصفح لا يدعم الإشعارات'); return; }
  const perm = await Notification.requestPermission();
  if (perm === 'granted') {
    window.showToast('🔔 تم تفعيل الإشعارات!');
    const nb = $('notif-btn');
    if (nb) { nb.innerText = '✅ الإشعارات مفعلة'; nb.style.background = 'rgba(34,197,94,.1)'; nb.style.color = '#22c55e'; }
    scheduleNotification();
  } else { window.showToast('❌ تم رفض الإشعارات'); }
};
function scheduleNotification() {
  if (Notification.permission !== 'granted') return;
  const now  = new Date();
  const next = new Date(now);
  next.setHours(20, 0, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  setTimeout(() => {
    new Notification('شغل مخك 🧠', { body: 'لسه معملتش تحدي اليوم! العب دلوقتي وخد مكافأتك 🎁', icon: 'https://i.postimg.cc/qqTBP312/1000061201.png' });
    setInterval(() => {
      new Notification('شغل مخك 🧠', { body: 'تحدي اليوم ينتظرك! لا تفوّت المكافأة 💰', icon: 'https://i.postimg.cc/qqTBP312/1000061201.png' });
    }, 24 * 60 * 60 * 1000);
  }, next - now);
}

// ─── MAP ──────────────────────────────────────────────────────────
function renderMap() {
  const grid = $('map-grid'); if (!grid) return;
  const unlocked = window.gameData.unlockedCategories || ['islamic'];
  const keys     = Object.keys(categoryConfig).sort((a, b) => categoryConfig[a].order - categoryConfig[b].order);
  const doneByKey = {};
  (window.gameData._mapProgress || []).forEach(k => doneByKey[k] = true);
  let totalUnlocked = 0;
  grid.innerHTML = '';
  keys.forEach((key, i) => {
    const cat       = categoryConfig[key];
    const isUnlocked = true;
    const isDone    = !!doneByKey[key];
    if (isUnlocked) totalUnlocked++;
    const subsCompleted = (window.gameData._subProgress || {})[key] || 0;
    const pct = Math.round((subsCompleted / cat.subs.length) * 100);
    const node = document.createElement('div');
    const catColors2 = {
      islamic:'#f59e0b',egypt:'#ef4444',tech:'#3b82f6',science:'#8b5cf6',
      geo:'#10b981',sports:'#f97316',puzzles:'#ec4899',food:'#84cc16'
    };
    const nodeColor = catColors2[key]||(window.gameData?.accentColor||'#fbbf24');
    node.className = `map-node ${isDone ? 'completed' : isUnlocked ? 'unlocked' : 'locked'}`;
    node.style.borderColor = isDone ? '#22c55e55' : nodeColor+'44';
    node.style.boxShadow = isDone ? '0 8px 30px rgba(34,197,94,.12)' : `0 8px 30px ${nodeColor}15`;
    const catColors = {
      islamic: ['#f59e0b','#d97706'], egypt: ['#ef4444','#dc2626'],
      tech:    ['#3b82f6','#2563eb'], science: ['#8b5cf6','#7c3aed'],
      geo:     ['#10b981','#059669'], sports:  ['#f97316','#ea580c'],
      puzzles: ['#ec4899','#db2777'], food:    ['#84cc16','#65a30d'],
    };
    const [c1,c2] = catColors[key]||['#fbbf24','#f59e0b'];
    node.innerHTML = `
      <div style="position:absolute;inset:0;border-radius:22px;background:linear-gradient(135deg,${c1}18,${c2}08);pointer-events:none"></div>
      ${isDone?'<div class="map-check">✓</div>':''}
      <div style="width:52px;height:52px;border-radius:18px;background:linear-gradient(135deg,${c1},${c2});display:flex;align-items:center;justify-content:center;font-size:26px;margin:0 auto 10px;box-shadow:0 6px 20px ${c1}44">${cat.icon}</div>
      <div class="map-name" style="color:#fff">${cat.name}</div>
      <div class="map-subs">${cat.subs.length} أقسام</div>
      <div class="map-progress-bar" style="margin-top:10px"><div class="map-progress-fill" style="width:${pct}%;background:linear-gradient(90deg,${c1},${c2})"></div></div>`;
    if (isUnlocked && !isDone) node.onclick = () => { selectedCategory = key; showSubsForMap(key); };
    grid.appendChild(node);
  });
  $('map-progress-badge').innerText = `${totalUnlocked}/8 مفتوح`;
}

function showSubsForMap(key) {
  const cat = categoryConfig[key];
  $('paths-header').innerHTML = `
    <button onclick="window.navTo('map')"
      style="color:var(--accent);font-weight:900;margin-bottom:18px;display:inline-flex;
      align-items:center;gap:8px;background:rgba(251,191,36,.07);padding:10px 16px;
      border-radius:14px;border:none;cursor:pointer;font-family:'Tajawal',sans-serif;font-size:14px">
      <i class="fas fa-arrow-right"></i> العودة للخريطة
    </button>
    <h2 style="font-size:24px;font-weight:900;margin-bottom:16px">${cat.icon} ${cat.name}</h2>`;
  const list = $('paths-list'); list.innerHTML = '';
  cat.subs.forEach(sub => {
    const div = document.createElement('div');
    div.style.cssText = 'background:var(--card);padding:18px 20px;border-radius:22px;border:1px solid rgba(255,255,255,.05);display:flex;justify-content:space-between;align-items:center;cursor:pointer;transition:.2s';
    div.innerHTML = `<div style="display:flex;align-items:center;gap:12px">
      <div style="width:8px;height:8px;border-radius:50%;background:var(--accent)"></div>
      <span style="font-weight:700;font-size:16px">${sub}</span>
    </div>
    <span style="background:var(--grad);color:#000;padding:8px 18px;border-radius:14px;font-weight:900;font-size:12px;border:none">ابدأ</span>`;
    div.onclick = () => window.startQuiz(cat.name, sub, false);
    list.appendChild(div);
  });
  window.navTo('paths');
}

// ─── OFFLINE CACHE ────────────────────────────────────────────────
function cacheQuestions(cat, sub, qs) {
  try { localStorage.setItem(`q_${cat}_${sub}`, JSON.stringify(qs.slice(0, 30))); } catch(e) {}
}
function getCachedQuestions(cat, sub) {
  try { const r = localStorage.getItem(`q_${cat}_${sub}`); return r ? JSON.parse(r) : []; } catch(e) { return []; }
}

// ─── QUESTION FETCH ───────────────────────────────────────────────
async function fetchQuestions(cat, sub) {
  let pool = [];

  // أولاً: حاول تجيب من الكاش المحلي
  const cached = getCachedQuestions(cat, sub);

  // لو أوفلاين — ارجع فوراً من الكاش
  if (!navigator.onLine) {
    if (cached.length >= 5) {
      window.showToast('📵 أوفلاين — أسئلة محفوظة مسبقاً');
      return cached;
    }
    window.showToast('📵 أوفلاين — أسئلة احتياطية');
    return FALLBACK.slice();
  }

  // أونلاين — جيب من Firebase
  if (window.firebaseReady && window.db) {
    try {
      const q = query(
        collection(window.db, 'artifacts', window.appId, 'public', 'data', 'questions'),
        where('category',    '==', cat),
        where('subCategory', '==', sub)
      );
      const snap = await getDocs(q);
      snap.forEach(d => pool.push({ id: d.id, ...d.data() }));

      if (pool.length >= 5) {
        // خزّن في الكاش للاستخدام أوفلاين
        cacheQuestions(cat, sub, pool);
        // أبلغ الـ Service Worker يخزّن الأسئلة برضو
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type:        'CACHE_QUESTIONS',
            questions:   pool,
            category:    cat,
            subCategory: sub,
          });
        }
      }
    } catch(e) {
      console.warn('Firestore fetch error:', e);
    }
  }

  if (pool.length < 5) {
    if (cached.length >= 5) {
      window.showToast('📦 أسئلة من الذاكرة المحلية');
      return cached;
    }
    pool = FALLBACK.slice();
    window.showToast('📶 أسئلة احتياطية — أضف أسئلة من الأدمن');
  }
  return pool;
}

async function generateAndSave(cat, sub) {
  if (!GEMINI_KEY) return await fetchQuestions(cat, sub);
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_KEY}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: `أنشئ 10 أسئلة MCQ عربية عن "${cat}-${sub}". JSON فقط: [{"t":"...","a":["...","...","...","..."],"c":0,"x":"..."}]` }] }] })
    });
    const data = await r.json();
    const raw  = data.candidates[0].content.parts[0].text.replace(/```json|```/g, '').trim();
    const qs   = JSON.parse(raw);
    if (window.firebaseReady && window.db) {
      const col = collection(window.db, 'artifacts', window.appId, 'public', 'data', 'questions');
      for (const q of qs) await addDoc(col, { ...q, category: cat, subCategory: sub, createdAt: Date.now() });
    }
    return qs;
  } catch(e) { return await fetchQuestions(cat, sub); }
}

// ─── QUIZ ─────────────────────────────────────────────────────────
window.startQuiz = async (cat, sub, isDaily = false, isRoom = false) => {
  selectedCategory = cat; selectedSub = sub;
  isDailyChallenge = isDaily; isRoomGame = isRoom;
  currentIdx = 0; quizCorrect = 0; quizWrong = 0; quizCoins = 0; quizXP = 0;
  window.navTo('quiz');
  $('q-text').innerText = 'جاري تحضير الأسئلة...';
  $('options-box').innerHTML = '';
  $('analysis-container').style.display = 'none';
  $('q-cat-badge').innerText = `${cat} • ${sub}`;
  let pool = await fetchQuestions(cat, sub);
  if (pool.length < 5) pool = await generateAndSave(cat, sub);
  if (!pool.length) { window.showToast('❌ لم يتم العثور على أسئلة'); window.navTo('map'); return; }
  currentQuestions = pool.sort(() => 0.5 - Math.random()).slice(0, 10);
  showQuestion();
};

function startTimer() {
  const TOTAL = 15; timeLeft = TOTAL;
  const tb = $('timer-box'), tf = $('timer-bar-fill');
  tb.innerText = timeLeft;
  tb.style.cssText = 'width:46px;height:46px;background:rgba(96,165,250,.1);color:#60a5fa;border-radius:18px;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:19px;border:1px solid rgba(96,165,250,.2)';
  if (tf) { tf.style.width = '100%'; tf.style.background = 'linear-gradient(90deg,#22c55e,#fbbf24)'; }
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    timeLeft--;
    tb.innerText = timeLeft;
    const pct = (timeLeft / TOTAL) * 100;
    if (tf) {
      tf.style.width = pct + '%';
      if (timeLeft <= 5)      tf.style.background = 'linear-gradient(90deg,#dc2626,#ef4444)';
      else if (timeLeft <= 9) tf.style.background = 'linear-gradient(90deg,#f59e0b,#fbbf24)';
    }
    if (timeLeft === 5) {
      window.playSound('snd-warn');
      tb.style.cssText = 'width:46px;height:46px;background:#ef4444;color:#fff;border-radius:18px;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:19px;border:3px solid rgba(255,255,255,.3);animation:pulse .5s infinite';
    }
    if (timeLeft <= 0) { clearInterval(timerInterval); window.playSound('snd-timeout'); autoWrong(); }
  }, 1000);
}

function autoWrong() {
  quizWrong++;
  const btns = document.querySelectorAll('.btn-option');
  btns.forEach(b => b.disabled = true);
  const q = currentQuestions[currentIdx];
  if (btns[q.c]) btns[q.c].classList.add('correct');
  $('analysis-text').innerText = 'انتهى الوقت! الإجابة الصحيحة بالأخضر.';
  $('analysis-container').style.display = 'block';
  window.gameData.stats.currentStreak = 0;
  window.updateUI();
}

function showQuestion() {
  if (currentIdx >= currentQuestions.length) { finishQuiz(); return; }
  startTimer();
  const q = currentQuestions[currentIdx];
  $('q-counter').innerText = `السؤال ${currentIdx + 1}/${currentQuestions.length}`;
  $('q-progress').style.width = ((currentIdx + 1) / currentQuestions.length) * 100 + '%';
  $('q-percent').innerText    = Math.round(((currentIdx + 1) / currentQuestions.length) * 100) + '%';
  $('q-text').innerText       = q.t;
  $('analysis-container').style.display = 'none';
  $('btn-analyze').style.display        = 'none';
  const box = $('options-box'); box.innerHTML = '';
  q.a.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className = 'btn-option';
    btn.innerText = opt;
    btn.onclick   = () => selectAnswer(i, btn);
    box.appendChild(btn);
  });
}

function selectAnswer(i, btn) {
  clearInterval(timerInterval);
  const tf = $('timer-bar-fill'); if (tf) { tf.style.width = '0%'; tf.style.transition = 'none'; }
  const q  = currentQuestions[currentIdx];
  document.querySelectorAll('.btn-option').forEach(b => b.disabled = true);
  if (i === q.c) {
    btn.classList.add('correct');
    window.playSound('snd-correct');
    const earned = 20 + (timeLeft * 2);
    quizCoins += earned; quizXP += 50; quizCorrect++;
    window.gameData.coins += earned; window.gameData.xp += 50;
    window.gameData.stats.correctAnswers++;
    window.gameData.stats.currentStreak++;
    window.gameData.stats.totalCoinsEarned = (window.gameData.stats.totalCoinsEarned || 0) + earned;
    if (window.gameData.stats.currentStreak > window.gameData.stats.maxStreak)
      window.gameData.stats.maxStreak = window.gameData.stats.currentStreak;
    updateDailyTask('win_5',  1);
    updateDailyTask('earn_500', earned);
    const s = window.gameData.stats.currentStreak;
    if (s === 3)  window.showToast('🔥 3 متتالية! رائع!');
    if (s === 5)  window.showToast('⚡ 5 متتالية! أنت في القمة!');
    if (s === 7)  window.showToast('💎 7 متتالية! خارق!');
    if (s === 10) window.showToast('👑 10 متتالية! أسطورة!');
    if (s === 15) window.showToast('🌟 15 متتالية! لا يُصدق!');
    try { confetti({ particleCount: 50, spread: 60, origin: { y: .7 }, colors: ['#fbbf24', '#f59e0b', '#fff'] }); } catch(e) {}
    if (isRoomGame && currentRoomId) syncRoomScore();
  } else {
    btn.classList.add('wrong');
    document.querySelectorAll('.btn-option')[q.c]?.classList.add('correct');
    window.playSound('snd-wrong');
    $('btn-analyze').style.display = '';
    quizWrong++;
    window.gameData.stats.currentStreak = 0;
  }
  $('analysis-text').innerText = q.x || 'معلومة قيمة تضاف لرصيدك!';
  $('analysis-container').style.display = 'block';
  checkLevel(); window.saveData(); window.updateUI();
}

window.askAIAnalysis = async () => {
  if (!GEMINI_KEY) { window.showToast('❌ الـ AI Analysis غير مفعل — أضف Gemini Key في app.js'); return; }
  const q   = currentQuestions[currentIdx];
  const btn = $('btn-analyze'); btn.disabled = true; btn.innerText = '⏳ تحليل...';
  try {
    const r    = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_KEY}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: `لماذا "${q.a[q.c]}" صحيحة في سؤال "${q.t}"؟ اشرح باختصار ممتع.` }] }] })
    });
    const data = await r.json();
    $('analysis-text').innerText = data.candidates[0].content.parts[0].text;
    btn.innerText = '✅ تم';
  } catch(e) { $('analysis-text').innerText = q.x || 'تعذر التحليل.'; btn.innerText = '❌'; }
};

window.nextQuestion = () => { currentIdx++; showQuestion(); };

async function finishQuiz() {
  clearInterval(timerInterval);
  window.gameData.stats.gamesPlayed++;
  const catKeys = Object.keys(categoryConfig).sort((a, b) => categoryConfig[a].order - categoryConfig[b].order);
  const curKey  = catKeys.find(k => categoryConfig[k].name === selectedCategory);
  if (curKey) {
    const idx = catKeys.indexOf(curKey);
    if (!window.gameData._mapProgress) window.gameData._mapProgress = [];
    if (!window.gameData._mapProgress.includes(curKey)) window.gameData._mapProgress.push(curKey);
    if (!window.gameData._subProgress) window.gameData._subProgress = {};
    window.gameData._subProgress[curKey] = (window.gameData._subProgress[curKey] || 0) + 1;
    window.gameData.stats.completedSections++;
    // all categories are unlocked by default
  }
  if (isDailyChallenge) {
    window.gameData.dailyChallengeDate  = new Date().toDateString();
    window.gameData.dailyChallengeScore = quizCorrect;
    window.gameData.stats.dailyChallengesWon = (window.gameData.stats.dailyChallengesWon || 0) + 1;
    updateDailyTask('daily_ch', 1);
    if (window.firebaseReady && window.currentUser) {
      await window.db_set(
        `artifacts/${window.appId}/public/data/daily_${new Date().toISOString().slice(0, 10)}/${window.currentUser.uid}`,
        { username: window.gameData.username, avatar: window.gameData.avatar, score: quizCorrect, uid: window.currentUser.uid, ts: Date.now() }, true
      );
    }
  }
  if (quizWrong === 0 && quizCorrect >= 10) {
    const p = window.gameData.achievements.find(a => a.id === 'perfect');
    if (p && !p.earned) { p.earned = true; window.showToast('⭐ إنجاز: 10/10 مثالي!'); }
  }
  if (isRoomGame) await finishRoomGame();
  window.saveData(); window.playSound('snd-win');
  const pct = Math.round((quizCorrect / currentQuestions.length) * 100);
  let emoji = '😊', title = 'أحسنت!';
  if (pct === 100)     { emoji = '🏆'; title = 'مثالي 100%!'; }
  else if (pct >= 80)  { emoji = '🌟'; title = 'ممتاز!'; }
  else if (pct >= 60)  { emoji = '😊'; title = 'جيد جداً!'; }
  else if (pct >= 40)  { emoji = '💪'; title = 'تحتاج تدريب!'; }
  else                 { emoji = '😅'; title = 'حاول مجدداً!'; }
  $('result-emoji').innerText    = emoji;
  $('result-title').innerText    = title;
  $('result-subtitle').innerText = `${pct}% إجابات صحيحة`;
  $('res-correct').innerText     = quizCorrect;
  $('res-wrong').innerText       = quizWrong;
  $('res-coins').innerText       = `+${quizCoins} 💰`;
  $('res-xp').innerText          = `+${quizXP} XP`;
  try { confetti({ particleCount: pct >= 60 ? 180 : 50, spread: 100, origin: { y: .5 } }); } catch(e) {}
  window.navTo('result');
}

// ─── DAILY TASKS ──────────────────────────────────────────────────
function updateDailyTask(id, amt) {
  const t = window.gameData.dailyTasks.find(x => x.id === id);
  if (t && !t.claimed) {
    t.current = Math.min(t.current + amt, t.goal);
    if (t.current >= t.goal) {
      window.gameData.coins += t.reward; t.claimed = true;
      window.showToast(`🎁 مهمة منجزة! +${t.reward} عملة`);
    }
  }
}

window.showDailyTasksModal = () => {
  const d = window.gameData; let html = '';
  d.dailyTasks.forEach(t => {
    const pct = Math.min((t.current / t.goal) * 100, 100);
    html += `<div class="task-card ${t.claimed ? 'done' : ''}">
      <div class="task-top">
        <span class="task-text">${t.text}</span>
        <span class="task-badge ${t.claimed ? 'done-b' : 'pend-b'}">${t.claimed ? '✅ منجزة' : `+${t.reward} 💰`}</span>
      </div>
      <div class="task-prog">
        <div class="task-bar"><div class="task-fill ${t.claimed ? 'done-f' : ''}" style="width:${pct}%"></div></div>
        <span class="task-cnt">${t.current}/${t.goal}</span>
      </div>
    </div>`;
  });
  $('tasks-body').innerHTML = html;
  openModal('tasks');
};

window.showAchievementsModal = () => {
  const d      = window.gameData;
  const earned = d.achievements.filter(a => a.earned).length;
  let html = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;padding:0 2px">
    <span style="font-size:13px;font-weight:700;color:var(--text2)">المفتوح</span>
    <span style="font-size:13px;font-weight:900;color:var(--accent)">${earned}/${d.achievements.length}</span>
  </div><div class="achv-grid">`;
  d.achievements.forEach(a => {
    html += `<div class="achv-card ${a.earned ? 'unlocked' : ''}">
      <div class="achv-icon ${a.earned ? 'earned' : 'locked'}">${a.earned ? a.icon : '🔒'}</div>
      <div><div class="achv-name">${a.text}</div>
      <div class="achv-status ${a.earned ? 'done' : 'locked'}">${a.earned ? '✦ مكتسب' : 'مغلق'}</div></div>
    </div>`;
  });
  $('achv-body').innerHTML = html + '</div>';
  openModal('achv');
};

// ─── LEADERBOARD ──────────────────────────────────────────────────
window.switchLeaderboard = tab => {
  currentLbTab = tab;
  document.querySelectorAll('.lb-tab').forEach(b => {
    const active = b.dataset.tab === tab;
    b.style.background   = active ? 'rgba(251,191,36,.12)' : 'rgba(255,255,255,.05)';
    b.style.color        = active ? 'var(--accent)' : 'var(--text2)';
    b.style.borderColor  = active ? 'rgba(251,191,36,.2)' : 'rgba(255,255,255,.07)';
  });
  window.renderLeaderboard(tab);
};

window.renderLeaderboard = async (tab = 'global') => {
  const list = $('leader-list'); if (!list) return;
  const sb   = $('lb-season-badge');
  list.innerHTML = '<div style="text-align:center;padding:40px;opacity:.4"><i class="fas fa-circle-notch fa-spin" style="font-size:28px;color:var(--accent)"></i></div>';
  let waited = 0;
  while (!window.firebaseReady && waited < 50) { await new Promise(r => setTimeout(r, 100)); waited++; }
  if (!window.firebaseReady) { list.innerHTML = '<p style="text-align:center;opacity:.4;padding:30px;font-weight:700">Firebase غير متاح</p>'; return; }
  const season = window.getCurrentSeason();
  if (sb) sb.innerText = tab === 'season' ? `موسم ${season}` : '';
  try {
    let leaders = [];
    if (tab === 'daily') {
      const today = new Date().toISOString().slice(0, 10);
      const snap  = await getDocs(collection(window.db, 'artifacts', window.appId, 'public', 'data', `daily_${today}`));
      snap.forEach(d => leaders.push(d.data()));
      leaders.sort((a, b) => b.score - a.score);
    } else {
      const snap = await getDocs(collection(window.db, 'artifacts', window.appId, 'public', 'data', 'rankings'));
      snap.forEach(d => leaders.push(d.data()));
      if (tab === 'season') leaders.sort((a, b) => ((b[`season_${season}`] || 0) - (a[`season_${season}`] || 0)));
      else                  leaders.sort((a, b) => (b.xp || 0) - (a.xp || 0));
    }
    leaders = leaders.slice(0, 20);
    if (!leaders.length) { list.innerHTML = '<p style="text-align:center;opacity:.4;padding:30px;font-weight:700">لا يوجد لاعبون بعد 🏆</p>'; return; }
    list.innerHTML = '';
    const medals  = ['🥇', '🥈', '🥉'];
    const topBg   = ['rgba(251,191,36,.1)', 'rgba(203,213,225,.08)', 'rgba(217,119,6,.08)'];
    const topBord = ['rgba(251,191,36,.3)', 'rgba(203,213,225,.2)',  'rgba(217,119,6,.2)'];
    leaders.forEach((u, i) => {
      const rank   = i + 1;
      const isMe   = u.uid === window.currentUser?.uid;
      const el     = document.createElement('div');
      el.className = `leader-item${isMe ? ' me' : ''}`;
      if (rank <= 3) { el.style.background = topBg[rank - 1]; el.style.borderColor = topBord[rank - 1]; }
      const score      = tab === 'season' ? (u[`season_${season}`] || 0) : tab === 'daily' ? `${u.score || 0}/10` : (u.xp || 0);
      const scoreLabel = tab === 'daily' ? 'نقطة' : 'XP';
      const accentCol  = u.accentColor || '#fbbf24';
      el.innerHTML = `
        <div class="rank-badge" style="background:${rank <= 3 ? 'transparent' : '#1e1e1e'};font-size:${rank <= 3 ? '22px' : '13px'};border:1px solid rgba(255,255,255,.07)">
          ${rank <= 3 ? medals[rank - 1] : rank}
        </div>
        <img src="${u.avatar || 'https://i.postimg.cc/qqTBP312/1000061201.png'}"
          style="width:44px;height:44px;border-radius:14px;object-fit:cover;border:2px solid ${isMe ? accentCol : 'rgba(255,255,255,.08)'};display:block;flex-shrink:0">
        <div style="flex:1;min-width:0">
          <div style="font-weight:900;font-size:13px;color:${isMe ? accentCol : '#fff'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
            ${u.username || 'لاعب'} ${isMe ? '(أنت)' : ''}
          </div>
          <div style="font-size:9px;opacity:.35;font-weight:700">${u.rank || 'باحث'} · مستوى ${u.level || 1}</div>
          ${u.message ? `<div class="leader-msg">"${u.message}"</div>` : ''}
        </div>
        <div style="text-align:left;flex-shrink:0">
          <div style="color:${accentCol};font-weight:900;font-size:14px">${typeof score === 'number' ? score.toLocaleString() : score}</div>
          <div style="font-size:9px;opacity:.3;font-weight:700">${scoreLabel}</div>
        </div>`;
      list.appendChild(el);
    });
  } catch(e) { list.innerHTML = '<p style="text-align:center;opacity:.4;padding:30px;font-weight:700">فشل التحميل ❌</p>'; }
};

// ─── DAILY CHALLENGE ──────────────────────────────────────────────
async function renderDailyChallenge() {
  // Auto-refresh countdown every second
  if (window._dailyCountdownInterval) clearInterval(window._dailyCountdownInterval);
  window._dailyCountdownInterval = setInterval(() => {
    const el = document.getElementById('daily-countdown-timer');
    if (!el) { clearInterval(window._dailyCountdownInterval); return; }
    const now2 = new Date(); const mid2 = new Date(now2); mid2.setHours(24,0,0,0);
    const d2 = mid2-now2;
    el.innerText = String(Math.floor(d2/3600000)).padStart(2,'0')+':'+
                   String(Math.floor((d2%3600000)/60000)).padStart(2,'0')+':'+
                   String(Math.floor((d2%60000)/1000)).padStart(2,'0');
  }, 1000);

  const today    = new Date().toDateString();
  const todayISO = new Date().toISOString().slice(0, 10);
  const d        = window.gameData;
  const done     = d.dailyChallengeDate === today;
  const now      = new Date(); const midnight = new Date(now); midnight.setHours(24, 0, 0, 0);
  const diff     = midnight - now;
  const hh = String(Math.floor(diff / 3600000)).padStart(2, '0');
  const mm = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');
  const ss = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
  const header = $('daily-header-card');
  if (header) {
    header.className = 'daily-header' + (done ? ' daily-completed' : '');
    header.innerHTML = done
      ? `<div class="daily-date">تحدي ${todayISO}</div>
         <div class="daily-score-display">✅ ${d.dailyChallengeScore}/10</div>
         <div class="daily-desc">أحسنت! لقد أكملت تحدي اليوم</div>
         <div class="daily-countdown" style="font-size:14px;color:var(--text2);margin-top:8px">التحدي القادم بعد ${hh}:${mm}:${ss}</div>`
      : `<div class="daily-date">تحدي ${todayISO}</div>
         <div class="daily-countdown" id="daily-countdown-timer">${hh}:${mm}:${ss}</div>
         <div class="daily-desc">نفس الأسئلة لجميع اللاعبين اليوم</div>
         <button onclick="window.startDailyChallenge()"
           style="margin-top:14px;background:var(--grad);color:#000;border:none;border-radius:18px;
           padding:13px 32px;font-weight:900;font-size:15px;cursor:pointer;
           font-family:'Tajawal',sans-serif;border-bottom:3px solid rgba(0,0,0,.2)">ابدأ التحدي 🎯</button>`;
  }
  const ldr = $('daily-leader-list');
  if (ldr) {
    ldr.innerHTML = '<div style="text-align:center;padding:20px;opacity:.4"><i class="fas fa-circle-notch fa-spin" style="color:var(--accent)"></i></div>';
    if (window.firebaseReady) {
      try {
        const snap = await getDocs(collection(window.db, 'artifacts', window.appId, 'public', 'data', `daily_${todayISO}`));
        let rows = []; snap.forEach(d => rows.push(d.data()));
        rows.sort((a, b) => b.score - a.score);
        if (!rows.length) { ldr.innerHTML = '<p style="text-align:center;opacity:.4;padding:20px;font-weight:700">لا يوجد لاعبون بعد — كن الأول!</p>'; return; }
        ldr.innerHTML = '';
        rows.slice(0, 10).forEach((u, i) => {
          const isMe = u.uid === window.currentUser?.uid;
          ldr.innerHTML += `<div class="leader-item${isMe ? ' me' : ''}">
            <div style="width:28px;height:28px;border-radius:9px;background:#1e1e1e;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:12px">${i + 1}</div>
            <img src="${u.avatar || 'https://i.postimg.cc/qqTBP312/1000061201.png'}" style="width:38px;height:38px;border-radius:12px;object-fit:cover;flex-shrink:0">
            <div style="flex:1"><div style="font-weight:900;font-size:13px;color:${isMe ? 'var(--accent)' : '#fff'}">${u.username}</div></div>
            <div style="color:var(--accent);font-weight:900;font-size:15px">${u.score}/10 ✅</div>
          </div>`;
        });
      } catch(e) { ldr.innerHTML = '<p style="text-align:center;opacity:.4;padding:20px;font-weight:700">فشل التحميل</p>'; }
    }
  }
}

window.startDailyChallenge = async () => {
  $('q-cat-badge').innerText = '📅 تحدي اليوم';
  let pool = [];
  if (window.firebaseReady) {
    // Load a small sample from each category for variety
    const cats = ['إسلاميات','تاريخ مصر','تقنية','علوم وفضاء','جغرافيا','رياضة','ألغاز','طعام'];
    const subs = {
      'إسلاميات':['قصص الأنبياء','القرآن الكريم','السيرة النبوية','الفقه الميسر'],
      'تاريخ مصر':['الفراعنة','مصر الحديثة','آثار النوبة','ثورات مصر'],
      'تقنية':['برمجة','ذكاء اصطناعي','أمن سيبراني','تاريخ الحواسيب'],
      'علوم وفضاء':['الفضاء','جسم الإنسان','الكيمياء','الفيزياء الكمية'],
      'جغرافيا':['عواصم','أعلام','عجائب الدنيا','تضاريس الأرض'],
      'رياضة':['كرة قدم','أساطير','الأولمبياد','كأس العالم'],
      'ألغاز':['منطق','أحجيات','رياضيات','ذكاء بصري'],
      'طعام':['أطباق عالمية','حلويات','توابل','فواكه نادرة'],
    };
    // Use today date as seed to pick same category/sub for all players
    const today2 = new Date().toISOString().slice(0,10);
    const seed2  = today2.split('-').reduce((a,b)=>a+parseInt(b),0);
    const pickedCat = cats[seed2 % cats.length];
    const pickedSub = subs[pickedCat][seed2 % subs[pickedCat].length];
    try {
      const q2 = query(
        collection(window.db,'artifacts',window.appId,'public','data','questions'),
        where('category','==',pickedCat), where('subCategory','==',pickedSub)
      );
      const snap2 = await getDocs(q2);
      snap2.forEach(d => pool.push(d.data()));
    } catch(e) { console.warn('Daily fetch:', e); }
  }
  if (!pool.length) pool = FALLBACK.slice();
  const today  = new Date().toISOString().slice(0, 10);
  const seed   = today.split('-').join('');
  // Seeded shuffle - same questions for everyone today
  const seeded = [...pool].sort((a,b) => {
    const ha = (parseInt(seed+a.t?.slice(0,2)||'0',36)||1) % 100;
    const hb = (parseInt(seed+b.t?.slice(0,2)||'0',36)||1) % 100;
    return ha - hb;
  }).slice(0, 10);
  currentQuestions = seeded;
  currentIdx = 0; quizCorrect = 0; quizWrong = 0; quizCoins = 0; quizXP = 0;
  isDailyChallenge = true; isRoomGame = false;
  selectedCategory = 'تحدي اليوم'; selectedSub = 'عام';
  window.navTo('quiz');
  showQuestion();
};

// ─── MULTIPLAYER ROOMS ────────────────────────────────────────────
// ─── ROOM CONSTANTS ──────────────────────────────────────────────
const ROOM_EXPIRY_MS  = 2 * 60 * 60 * 1000; // 2 hours - rooms auto-expire
const ROOM_MAX_PLAYERS = 8;

// ─── HELPERS ─────────────────────────────────────────────────────
function generateRoomCode() {
  return Math.random().toString(36).substr(2, 6).toUpperCase();
}

function getRoomRef(roomId) {
  return doc(window.db, 'artifacts', window.appId, 'public', 'data', 'rooms', roomId);
}

// Delete a room completely from Firebase
async function deleteRoom(roomId) {
  try {
    await deleteDoc(getRoomRef(roomId));
  } catch(e) {
    console.warn('deleteRoom:', e);
  }
}

// Clean up expired rooms from Firebase (called on loadRooms)
async function cleanupExpiredRooms() {
  if (!window.firebaseReady) return;
  try {
    const cutoff = Date.now() - ROOM_EXPIRY_MS;
    const snap = await getDocs(
      query(
        collection(window.db, 'artifacts', window.appId, 'public', 'data', 'rooms'),
        where('createdAt', '<', cutoff),
        limit(20)
      )
    );
    const deletes = [];
    snap.forEach(d => deletes.push(deleteDoc(d.ref)));
    await Promise.all(deletes);
    if (deletes.length > 0) {
      console.log(`🧹 حُذف ${deletes.length} غرفة منتهية الصلاحية`);
    }
  } catch(e) {
    console.warn('cleanupExpiredRooms:', e);
  }
}

// ─── CREATE ROOM ─────────────────────────────────────────────────
window.createRoom = () => {
  buildRoomCatSelect();
  openModal('create-room');
};

function buildRoomCatSelect() {
  const sel = $('room-cat-select'); if (!sel) return;
  sel.innerHTML = '';
  Object.keys(categoryConfig).forEach(k => {
    sel.innerHTML += `<option value="${k}">${categoryConfig[k].icon} ${categoryConfig[k].name}</option>`;
  });
}

window.confirmCreateRoom = async () => {
  if (!window.firebaseReady) { window.showToast('❌ يلزم اتصال بالإنترنت'); return; }
  const name   = $('room-name-input').value.trim() || `غرفة ${window.gameData.username}`;
  const catKey = $('room-cat-select').value;
  if (!catKey) { window.showToast('❌ اختر تصنيف الأسئلة'); return; }

  const code = generateRoomCode();
  const now  = Date.now();
  const roomData = {
    name,
    code,
    catKey,
    catName:   categoryConfig[catKey].name,
    host:      window.currentUser.uid,
    hostName:  window.gameData.username,
    status:    'waiting',
    createdAt: now,
    expiresAt: now + ROOM_EXPIRY_MS, // ← auto-expire after 2 hours
    players: {
      [window.currentUser.uid]: {
        uid:      window.currentUser.uid,
        username: window.gameData.username,
        avatar:   window.gameData.avatar,
        ready:    false,
        score:    0,
        joinedAt: now,
      }
    },
  };
  try {
    const ref = await addDoc(
      collection(window.db, 'artifacts', window.appId, 'public', 'data', 'rooms'),
      roomData
    );
    currentRoomId = ref.id;
    closeModalFn('create-room');
    window.showToast(`✅ غرفة "${name}" — كود: ${code}`);
    listenLobby(ref.id);
    window.navTo('lobby');
  } catch(e) {
    window.showToast('❌ خطأ: ' + e.message);
  }
};

// ─── JOIN ROOM ────────────────────────────────────────────────────
window.joinRoomByCode = async () => {
  const code = $('join-code-input').value.trim().toUpperCase();
  if (!code || code.length < 4) { window.showToast('❌ أدخل الكود الصحيح'); return; }
  if (!window.firebaseReady)    { window.showToast('❌ يلزم اتصال بالإنترنت'); return; }
  try {
    const snap = await getDocs(query(
      collection(window.db, 'artifacts', window.appId, 'public', 'data', 'rooms'),
      where('code',   '==', code),
      where('status', '==', 'waiting'),
      limit(1)
    ));
    if (snap.empty) {
      window.showToast('❌ غرفة غير موجودة أو اللعب بدأ بالفعل');
      return;
    }
    const roomDoc  = snap.docs[0];
    const roomData = roomDoc.data();
    // Check expiry
    if (roomData.expiresAt && Date.now() > roomData.expiresAt) {
      await deleteRoom(roomDoc.id);
      window.showToast('❌ هذه الغرفة منتهية الصلاحية');
      return;
    }
    // Check max players
    const playerCount = Object.keys(roomData.players || {}).length;
    if (playerCount >= ROOM_MAX_PLAYERS) {
      window.showToast('❌ الغرفة ممتلئة');
      return;
    }
    closeModalFn('join-room');
    window.joinRoomById(roomDoc.id);
  } catch(e) {
    window.showToast('❌ خطأ: ' + e.message);
  }
};

window.joinRoomById = async roomId => {
  if (!window.currentUser) return;
  currentRoomId = roomId;
  const roomRef = getRoomRef(roomId);
  try {
    await updateDoc(roomRef, {
      [`players.${window.currentUser.uid}`]: {
        uid:      window.currentUser.uid,
        username: window.gameData.username,
        avatar:   window.gameData.avatar,
        ready:    false,
        score:    0,
        joinedAt: Date.now(),
      }
    });
    listenLobby(roomId);
    window.navTo('lobby');
  } catch(e) {
    window.showToast('❌ تعذر الانضمام: ' + e.message);
  }
};

// ─── READY TOGGLE ─────────────────────────────────────────────────
window.toggleReady = async () => {
  if (!currentRoomId || !window.currentUser) return;
  const roomRef = getRoomRef(currentRoomId);
  try {
    const snap = await getDoc(roomRef);
    if (!snap.exists()) return;
    const currentReady = snap.data()?.players?.[window.currentUser.uid]?.ready || false;
    await updateDoc(roomRef, {
      [`players.${window.currentUser.uid}.ready`]: !currentReady
    });
  } catch(e) {
    console.warn('toggleReady:', e);
  }
};

// ─── LOBBY LISTENER ──────────────────────────────────────────────
function listenLobby(roomId) {
  if (roomUnsubscribe) roomUnsubscribe();
  const ref = getRoomRef(roomId);
  roomUnsubscribe = onSnapshot(ref, snap => {
    if (!snap.exists()) {
      // Room was deleted (host left or expired)
      window.showToast('⚠️ الغرفة أُغلقت من المضيف');
      window.navTo('rooms');
      return;
    }
    const room    = snap.data();
    const isHost  = room.host === window.currentUser.uid;
    const players = Object.values(room.players || {});
    const count   = players.length;

    // Update lobby header
    const lobbyName = $('lobby-room-name');
    const lobbyCode = $('lobby-room-code');
    if (lobbyName) lobbyName.innerText = room.name;
    if (lobbyCode) lobbyCode.innerText = `كود: ${room.code}`;

    renderLobbyPlayers(room, isHost);

    // Start/waiting buttons
    const startBtn = $('start-room-btn');
    const waitMsg  = $('waiting-msg');
    const readyBtn = $('ready-toggle-btn');

    if (isHost) {
      const allReady   = players.filter(p => p.uid !== room.host).every(p => p.ready);
      const canStart   = count >= 2;
      if (startBtn) {
        startBtn.style.display = canStart ? 'block' : 'none';
        startBtn.style.background = allReady
          ? 'linear-gradient(135deg,#22c55e,#16a34a)'
          : 'var(--grad)';
        startBtn.innerText = allReady ? '✅ كل اللاعبين جاهزون — ابدأ!' : 'ابدأ اللعبة 🎮';
      }
      if (waitMsg) waitMsg.style.display = canStart ? 'none' : 'block';
      if (readyBtn) readyBtn.style.display = 'none';
    } else {
      if (startBtn) startBtn.style.display = 'none';
      if (waitMsg)  waitMsg.style.display  = 'none';
      const myReady = room.players?.[window.currentUser.uid]?.ready || false;
      if (readyBtn) {
        readyBtn.style.display = 'block';
        readyBtn.innerText     = myReady ? '✅ أنا جاهز (اضغط للإلغاء)' : '👆 اضغط للاستعداد';
        readyBtn.style.background = myReady
          ? 'rgba(34,197,94,.15)'
          : 'rgba(255,255,255,.07)';
        readyBtn.style.color  = myReady ? '#22c55e' : 'var(--text2)';
        readyBtn.style.border = myReady ? '1px solid rgba(34,197,94,.3)' : '1px solid rgba(255,255,255,.1)';
      }
    }

    // If game started and this player is not host, join in
    if (room.status === 'playing') {
      if (!isHost) startRoomGameAsPlayer(room);
    }

    // Check expiry while in lobby
    if (room.expiresAt && Date.now() > room.expiresAt) {
      window.showToast('⏰ انتهت صلاحية الغرفة');
      if (isHost) deleteRoom(currentRoomId);
      window.leaveRoom();
    }
  }, err => {
    console.warn('listenLobby error:', err);
  });
}

// ─── RENDER LOBBY PLAYERS ─────────────────────────────────────────
function renderLobbyPlayers(room, isHost) {
  const container = $('waiting-players'); if (!container) return;
  container.innerHTML = '';
  const players = Object.values(room.players || {}).sort((a, b) => {
    // Host first
    if (a.uid === room.host) return -1;
    if (b.uid === room.host) return 1;
    return (a.joinedAt || 0) - (b.joinedAt || 0);
  });
  players.forEach(p => {
    const isMe  = p.uid === window.currentUser.uid;
    const isMod = p.uid === room.host;
    container.innerHTML += `
      <div class="waiting-player" style="${isMe ? 'background:rgba(251,191,36,.04);border-radius:14px;' : ''}">
        <img src="${p.avatar || 'https://i.postimg.cc/qqTBP312/1000061201.png'}"
             class="waiting-avatar"
             style="border:2px solid ${isMe ? 'var(--accent)' : isMod ? '#22c55e' : 'rgba(255,255,255,.1)'}">
        <div style="flex:1">
          <div class="waiting-name" style="color:${isMe ? 'var(--accent)' : '#fff'}">
            ${p.username}${isMe ? ' (أنت)' : ''}
          </div>
          <div style="font-size:11px;color:var(--text2);font-weight:700;margin-top:2px">
            ${isMod ? '👑 المضيف' : '🎮 لاعب'}
          </div>
        </div>
        ${isHost && p.uid !== room.host ? `
          <button onclick="window.kickPlayer('${p.uid}')"
            style="background:rgba(239,68,68,.1);color:#ef4444;border:none;border-radius:9px;
            padding:5px 10px;font-size:11px;font-weight:900;cursor:pointer;
            font-family:'Tajawal',sans-serif;margin-left:6px">طرد</button>
        ` : ''}
        <span class="waiting-ready ${p.ready ? 'yes' : 'no'}" style="margin-right:6px">
          ${p.ready ? '✅' : '⏳'}
        </span>
      </div>`;
  });
}

// ─── KICK PLAYER ─────────────────────────────────────────────────
window.kickPlayer = async (uid) => {
  if (!currentRoomId || !window.currentUser) return;
  try {
    const roomRef = getRoomRef(currentRoomId);
    await updateDoc(roomRef, { [`players.${uid}`]: deleteField() });
    window.showToast('👟 تم طرد اللاعب');
  } catch(e) {
    console.warn('kickPlayer:', e);
  }
};

// ─── START ROOM GAME ─────────────────────────────────────────────
window.startRoomGame = async () => {
  if (!currentRoomId) return;
  const btn = $('start-room-btn');
  if (btn) { btn.disabled = true; btn.innerText = '⏳ جاري التحضير...'; }

  try {
    // Get room data to know which category was selected
    const roomSnap = await getDoc(getRoomRef(currentRoomId));
    if (!roomSnap.exists()) { window.showToast('❌ الغرفة غير موجودة'); return; }
    const room    = roomSnap.data();
    const catKey  = room.catKey;
    const catName = room.catName || categoryConfig[catKey]?.name;
    const subs    = categoryConfig[catKey]?.subs || [];
    // Pick a random sub-category for this room game
    const subName = subs[Math.floor(Math.random() * subs.length)];

    window.showToast(`🎯 تصنيف: ${catName} — ${subName}`);

    // Fetch questions for the selected category
    let pool = await fetchQuestions(catName, subName);
    if (pool.length < 5) {
      // Try any sub from same category
      for (const s of subs) {
        if (s === subName) continue;
        const extra = await fetchQuestions(catName, s);
        pool = [...pool, ...extra];
        if (pool.length >= 10) break;
      }
    }
    if (!pool.length) {
      window.showToast('❌ لا توجد أسئلة في هذا التصنيف — أضف أسئلة من الأدمن');
      if (btn) { btn.disabled = false; btn.innerText = 'ابدأ اللعبة 🎮'; }
      return;
    }

    const qs = pool.sort(() => 0.5 - Math.random()).slice(0, 10);
    const ref = getRoomRef(currentRoomId);
    await updateDoc(ref, {
      status:     'playing',
      questions:  qs,
      startedAt:  Date.now(),
      catName,
      subName,
    });

    currentQuestions = qs;
    currentIdx = 0; quizCorrect = 0; quizWrong = 0; quizCoins = 0; quizXP = 0;
    isRoomGame = true; isDailyChallenge = false;
    selectedCategory = catName; selectedSub = subName;
    window.navTo('quiz');
    showQuestion();
  } catch(e) {
    window.showToast('❌ ' + e.message);
    if (btn) { btn.disabled = false; btn.innerText = 'ابدأ اللعبة 🎮'; }
  }
};

function startRoomGameAsPlayer(room) {
  if (!room.questions || room.questions.length === 0) return;
  // Prevent double-start
  if (window._roomGameStarted) return;
  window._roomGameStarted = true;
  currentQuestions = room.questions;
  currentIdx = 0; quizCorrect = 0; quizWrong = 0; quizCoins = 0; quizXP = 0;
  isRoomGame = true; isDailyChallenge = false;
  selectedCategory = room.catName || 'غرفة';
  selectedSub      = room.subName || '';
  window.showToast('🎮 اللعبة بدأت!');
  window.navTo('quiz');
  showQuestion();
}

// ─── SYNC SCORE ───────────────────────────────────────────────────
async function syncRoomScore() {
  if (!currentRoomId || !window.currentUser) return;
  try {
    await updateDoc(getRoomRef(currentRoomId), {
      [`players.${window.currentUser.uid}.score`]: quizCorrect,
      [`players.${window.currentUser.uid}.done`]:  true,
    });
  } catch(e) {
    console.warn('syncRoomScore:', e);
  }
}

// ─── FINISH ROOM GAME ─────────────────────────────────────────────
async function finishRoomGame() {
  if (!currentRoomId || !window.currentUser) return;
  await syncRoomScore();
  window._roomGameStarted = false;

  // Achievement check
  const achv = window.gameData.achievements.find(a => a.id === 'social');
  if (achv && !achv.earned) {
    achv.earned = true;
    window.showToast('👥 إنجاز: لعبت في غرفة جماعية!');
  }

  // Show room results after a delay
  setTimeout(async () => {
    try {
      const snap = await getDoc(getRoomRef(currentRoomId));
      if (!snap.exists()) return;
      const room    = snap.data();
      const players = Object.values(room.players || {}).sort((a, b) => (b.score || 0) - (a.score || 0));
      const myRank  = players.findIndex(p => p.uid === window.currentUser.uid) + 1;
      if      (myRank === 1) window.showToast('🏆 أنت الأول في الغرفة!', 4000);
      else if (myRank === 2) window.showToast('🥈 المركز الثاني — أحسنت!', 3500);
      else if (myRank === 3) window.showToast('🥉 المركز الثالث!', 3000);
    } catch(e) {}

    // If host, mark room as finished (don't delete immediately — show results)
    if (window.currentUser.uid) {
      try {
        const snap2 = await getDoc(getRoomRef(currentRoomId));
        if (snap2.exists() && snap2.data().host === window.currentUser.uid) {
          await updateDoc(getRoomRef(currentRoomId), { status: 'finished', finishedAt: Date.now() });
          // Delete room after 5 minutes
          setTimeout(() => deleteRoom(currentRoomId), 5 * 60 * 1000);
        }
      } catch(e) {}
    }
    if (roomUnsubscribe) roomUnsubscribe();
  }, 2000);
}

// ─── LEAVE ROOM ───────────────────────────────────────────────────
window.leaveRoom = async () => {
  if (roomUnsubscribe) { roomUnsubscribe(); roomUnsubscribe = null; }
  window._roomGameStarted = false;

  if (currentRoomId && window.currentUser) {
    try {
      const snap = await getDoc(getRoomRef(currentRoomId));
      if (snap.exists()) {
        const room    = snap.data();
        const isHost  = room.host === window.currentUser.uid;
        const players = Object.keys(room.players || {});

        if (isHost) {
          if (players.length <= 1) {
            // Host is alone — delete the room
            await deleteRoom(currentRoomId);
            window.showToast('🗑️ تم إغلاق الغرفة');
          } else {
            // Transfer host to next player
            const newHost = players.find(uid => uid !== window.currentUser.uid);
            await updateDoc(getRoomRef(currentRoomId), {
              host: newHost,
              [`players.${window.currentUser.uid}`]: deleteField(),
            });
            window.showToast('👑 تم نقل قيادة الغرفة للاعب آخر');
          }
        } else {
          // Regular player leaves
          await updateDoc(getRoomRef(currentRoomId), {
            [`players.${window.currentUser.uid}`]: deleteField(),
          });
        }
      }
    } catch(e) {
      console.warn('leaveRoom error:', e);
    }
  }
  currentRoomId = null;
  window.navTo('rooms');
};

// ─── LOAD ROOMS ───────────────────────────────────────────────────
function loadRooms() {
  const list = $('rooms-list'); if (!list) return;
  if (roomsUnsubscribe) roomsUnsubscribe();

  if (!window.firebaseReady) {
    list.innerHTML = `<div style="text-align:center;padding:40px;opacity:.4;font-weight:700">
      <div style="font-size:36px;margin-bottom:12px">🌐</div>يلزم اتصال بالإنترنت
    </div>`;
    return;
  }

  // Clean up expired rooms in background
  cleanupExpiredRooms();

  list.innerHTML = `<div style="text-align:center;padding:30px;opacity:.4">
    <i class="fas fa-circle-notch fa-spin" style="font-size:24px;color:var(--accent)"></i>
  </div>`;

  const now = Date.now();
  roomsUnsubscribe = onSnapshot(
    query(
      collection(window.db, 'artifacts', window.appId, 'public', 'data', 'rooms'),
      where('status',    '==', 'waiting'),
      where('expiresAt', '>',  now),
      orderBy('expiresAt', 'asc'),
      orderBy('createdAt', 'desc'),
      limit(10)
    ),
    snap => {
      list.innerHTML = '';
      if (snap.empty) {
        list.innerHTML = `<div style="text-align:center;padding:40px;opacity:.4;font-weight:700">
          <div style="font-size:40px;margin-bottom:14px">🎮</div>
          لا توجد غرف نشطة الآن<br>
          <span style="font-size:13px;opacity:.7">أنشئ غرفة وادعُ أصحابك!</span>
        </div>`;
        return;
      }
      const nowTime = Date.now();
      snap.forEach(d => {
        const r   = d.data();
        const pc  = Object.keys(r.players || {}).length;
        const age = nowTime - (r.createdAt || nowTime);
        const ageStr = age < 60000 ? 'الآن'
                     : age < 3600000 ? `منذ ${Math.floor(age/60000)} دقيقة`
                     : `منذ ${Math.floor(age/3600000)} ساعة`;
        const timeLeft    = r.expiresAt - nowTime;
        const timeLeftStr = `تنتهي بعد ${Math.ceil(timeLeft/3600000)} ساعة`;
        const isFull = pc >= ROOM_MAX_PLAYERS;

        const el = document.createElement('div');
        el.className = 'room-card';
        el.innerHTML = `
          <div style="flex:1">
            <div class="room-name" style="display:flex;align-items:center;gap:8px">
              ${r.name || 'غرفة'}
              ${isFull ? '<span style="font-size:10px;background:rgba(239,68,68,.1);color:#ef4444;padding:2px 8px;border-radius:8px;font-weight:900">ممتلئة</span>' : ''}
            </div>
            <div class="room-meta" style="margin-top:3px">
              ${r.catName || 'عام'} · ${pc}/${ROOM_MAX_PLAYERS} لاعبين · ${ageStr}
            </div>
            <div style="font-size:11px;font-weight:900;color:var(--accent);margin-top:4px">
              🔑 ${r.code} · <span style="color:var(--text2);font-weight:700">${timeLeftStr}</span>
            </div>
          </div>
          <button onclick="window.joinRoomById('${d.id}')"
            ${isFull ? 'disabled' : ''}
            style="background:${isFull ? 'rgba(255,255,255,.05)' : 'var(--grad)'};
            color:${isFull ? 'var(--text2)' : '#000'};
            border:none;border-radius:14px;padding:10px 18px;
            font-weight:900;font-size:13px;cursor:${isFull ? 'not-allowed' : 'pointer'};
            font-family:'Tajawal',sans-serif;white-space:nowrap;
            border-bottom:${isFull ? 'none' : '2px solid rgba(0,0,0,.2)'}">
            ${isFull ? 'ممتلئة' : 'انضمام'}
          </button>`;
        list.appendChild(el);
      });

      // Join by code button at bottom
      list.innerHTML += `
        <button onclick="window.openJoinRoomModal()"
          style="width:100%;margin-top:10px;padding:14px;
          background:rgba(255,255,255,.04);color:var(--text2);
          border:1px solid rgba(255,255,255,.07);border-radius:18px;
          font-weight:900;font-size:13px;cursor:pointer;
          font-family:'Tajawal',sans-serif;
          display:flex;align-items:center;justify-content:center;gap:8px">
          🔑 انضمام برمز الغرفة
        </button>`;
    },
    err => {
      console.error('loadRooms snapshot error:', err);
      // Fallback query without expiresAt filter if index doesn't exist yet
      list.innerHTML = `<div style="text-align:center;padding:20px;opacity:.5;font-weight:700">
        ⚠️ يحتاج Firebase Index — راجع الـ Console
      </div>`;
    }
  );
}

// ─── SHOP ─────────────────────────────────────────────────────────
window.showShopTab = tab => {
  document.querySelectorAll('.shop-tab').forEach(b => {
    const active = b.dataset.stab === tab;
    b.style.background  = active ? 'rgba(251,191,36,.12)' : 'rgba(255,255,255,.05)';
    b.style.color       = active ? 'var(--accent)' : 'var(--text2)';
    b.style.borderColor = active ? 'rgba(251,191,36,.2)' : 'rgba(255,255,255,.07)';
  });
  renderShop(tab);
};

function renderShop(tab) {
  const c = $('shop-content'); if (!c) return;
  if (tab === 'helpers') c.innerHTML = shopItem('📦', 'حزمة المساعدات', '3 من كل نوع', 300, 'window.buyHelper(300)') + shopItem('💎', 'حزمة الخبير', '10 من كل نوع', 800, 'window.buyHelper(800)') + freeCoinsItem();
  else if (tab === 'frames')  renderFramesShop(c);
  else if (tab === 'themes')  renderThemesShop(c);
}

function shopItem(icon, name, sub, price, fn) {
  return `<div style="background:rgba(24,24,27,.5);padding:20px;border-radius:28px;border:1px solid rgba(255,255,255,.06);display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
    <div style="display:flex;align-items:center;gap:14px">
      <div style="width:52px;height:52px;background:rgba(251,191,36,.1);border-radius:18px;display:flex;align-items:center;justify-content:center;font-size:26px">${icon}</div>
      <div><h4 style="font-weight:900;font-size:16px;margin-bottom:2px">${name}</h4>
      <p style="font-size:10px;opacity:.4;font-weight:700;text-transform:uppercase;letter-spacing:.1em">${sub}</p></div>
    </div>
    <button onclick="${fn}" style="background:var(--grad);color:#000;padding:10px 18px;border-radius:14px;font-weight:900;border:none;border-bottom:3px solid rgba(0,0,0,.2);cursor:pointer;font-family:'Tajawal',sans-serif;font-size:13px;white-space:nowrap">${price} 💰</button>
  </div>`;
}

function freeCoinsItem() {
  return `<div style="background:rgba(24,24,27,.5);padding:20px;border-radius:28px;border:1px solid rgba(255,255,255,.06);display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
    <div style="display:flex;align-items:center;gap:14px">
      <div style="width:52px;height:52px;background:rgba(34,197,94,.1);border-radius:18px;display:flex;align-items:center;justify-content:center;font-size:26px">🎁</div>
      <div><h4 style="font-weight:900;font-size:16px;margin-bottom:2px">مكافأة مجانية</h4>
      <p style="font-size:10px;opacity:.4;font-weight:700;text-transform:uppercase;letter-spacing:.1em">+200 عملة يومياً</p></div>
    </div>
    <button onclick="window.claimFreeCoins()" id="btn-free-coins"
      style="background:#22c55e;color:#fff;padding:10px 18px;border-radius:14px;font-weight:900;border:none;border-bottom:3px solid #16a34a;cursor:pointer;font-family:'Tajawal',sans-serif;font-size:13px;white-space:nowrap">احصل 🎁</button>
  </div>`;
}

function renderFramesShop(c) {
  c.innerHTML = '';
  const grid = document.createElement('div'); grid.className = 'frames-grid';
  AVATAR_FRAMES.forEach(frame => {
    const owned  = frame.id === 'none' || (window.gameData.ownedFrames || []).includes(frame.id);
    const active = window.gameData.avatarFrame === frame.id;
    const el     = document.createElement('div');
    el.className = `frame-item${active ? ' active' : ''}`;
    el.innerHTML = `
      <div class="frame-preview"><img src="${window.gameData.avatar}" style="width:54px;height:54px;border-radius:50%;object-fit:cover;${frame.style || ''}"></div>
      <div class="frame-name">${frame.name}</div>
      ${owned ? `<div class="frame-owned">${active ? '✅ مفعّل' : 'اضغط للتفعيل'}</div>` : `<div class="frame-price">${frame.price} 💰</div>`}`;
    el.onclick = () => window.handleFrameClick(frame);
    grid.appendChild(el);
  });
  c.appendChild(grid);
}

window.handleFrameClick = frame => {
  const owned = frame.id === 'none' || (window.gameData.ownedFrames || []).includes(frame.id);
  if (owned) {
    window.gameData.avatarFrame = frame.id;
    window.updateUI(); window.saveData(); renderFramesShop($('shop-content'));
    window.showToast(`✅ تم تفعيل إطار: ${frame.name}`);
  } else {
    if (window.gameData.coins < frame.price) { window.showToast('❌ رصيدك غير كافٍ'); return; }
    window.showConfirmDialog({
      icon: '🖼️', title: 'شراء الإطار', msg: `${frame.name}\nالسعر: ${frame.price} 💰`,
      okText: 'شراء', okClass: 'ok',
      onOk: () => {
        window.gameData.coins -= frame.price;
        if (!window.gameData.ownedFrames) window.gameData.ownedFrames = [];
        window.gameData.ownedFrames.push(frame.id);
        window.gameData.avatarFrame = frame.id;
        window.playSound('snd-buy');
        try { confetti({ particleCount: 40, spread: 50 }); } catch(e) {}
        window.updateUI(); window.saveData(); renderFramesShop($('shop-content'));
        window.showToast(`✅ تم شراء وتفعيل: ${frame.name}`);
      }
    });
  }
};

function renderThemesShop(c) {
  const ACCENT_COLORS_LOCAL = window._ACCENT_COLORS || ACCENT_COLORS;
  c.innerHTML = `<div style="margin-bottom:16px">
    <h3 style="font-size:13px;font-weight:900;color:var(--text2);text-transform:uppercase;letter-spacing:.08em;margin-bottom:12px">ألوان التطبيق (مجانية)</h3>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">
      ${ACCENT_COLORS_LOCAL.map(c => `
        <div onclick="window.gameData.accentColor='${c.val}';window.updateUI();window.saveData();window.showToast('🎨 ${c.name}')"
          style="background:linear-gradient(135deg,${c.val},${c.val2});border-radius:18px;padding:20px 12px;text-align:center;cursor:pointer;transition:.2s;border:3px solid ${window.gameData.accentColor === c.val ? '#fff' : 'transparent'}"
          onmousedown="this.style.transform='scale(.95)'" onmouseup="this.style.transform=''">
          <div style="font-size:22px;margin-bottom:6px">🎨</div>
          <div style="font-size:12px;font-weight:900;color:#000">${c.name}</div>
        </div>`).join('')}
    </div>
  </div>
  <div>
    <h3 style="font-size:13px;font-weight:900;color:var(--text2);text-transform:uppercase;letter-spacing:.08em;margin-bottom:12px">وضع العرض</h3>
    <div style="background:var(--card);border:1px solid rgba(255,255,255,.06);border-radius:20px;padding:16px 20px;display:flex;justify-content:space-between;align-items:center">
      <span style="font-weight:700;font-size:15px" id="theme-display-label">${window.gameData.theme === 'light' ? '☀️ نهاري' : '🌙 ليلي'}</span>
      <div class="toggle ${window.gameData.theme !== 'light' ? 'on' : ''}" onclick="window.toggleTheme();document.getElementById('theme-display-label').innerText=window.gameData.theme==='light'?'☀️ نهاري':'🌙 ليلي'"><div class="toggle-knob"></div></div>
    </div>
  </div>`;
}

// ─── PLAYER CARD ──────────────────────────────────────────────────
window.showPlayerCard = () => {
  const d      = window.gameData;
  const season = window.getCurrentSeason();
  const frame  = AVATAR_FRAMES.find(f => f.id === (d.avatarFrame || 'none')) || AVATAR_FRAMES[0];
  $('player-card-content').innerHTML = `
    <div class="player-card">
      <div class="card-bg-glow"></div>
      <img src="${d.avatar}" class="card-avatar" style="${frame.style || ''}">
      <div class="card-name">${d.username}</div>
      <div style="text-align:center;margin-bottom:14px"><span class="card-rank">${d.rank}</span></div>
      <div class="card-stats">
        <div class="card-stat"><span class="card-stat-val">${d.level}</span><span class="card-stat-lbl">المستوى</span></div>
        <div class="card-stat"><span class="card-stat-val">${d.stats?.correctAnswers || 0}</span><span class="card-stat-lbl">صحيحة</span></div>
        <div class="card-stat"><span class="card-stat-val">${d.stats?.maxStreak || 0}</span><span class="card-stat-lbl">أعلى سلسلة</span></div>
      </div>
      <div class="card-season">
        <span class="card-season-label">🏅 موسم ${season}</span>
        <span class="card-season-val">${d.xp || 0} XP</span>
      </div>
      <div style="text-align:center;margin-top:12px;font-size:11px;font-weight:700;color:rgba(255,255,255,.3)">شغل مخك · Ultra 4.0</div>
    </div>`;
  openModal('card');
};

window.sharePlayerCard = async () => {
  const d    = window.gameData;
  const text = `🧠 شغل مخك\n👤 ${d.username} · المستوى ${d.level}\n🏆 ${d.rank}\n⭐ ${d.xp} XP\n✅ ${d.stats?.correctAnswers || 0} إجابة صحيحة\n🔥 أعلى سلسلة: ${d.stats?.maxStreak || 0}`;
  if (navigator.share) { try { await navigator.share({ title: 'بطاقتي في شغل مخك', text }); } catch(e) {} }
  else { await navigator.clipboard.writeText(text).catch(() => {}); window.showToast('📋 تم نسخ البطاقة!'); }
};

// ─── STATS ────────────────────────────────────────────────────────
function renderStats() {
  const d = window.gameData;
  set('st-games',     d.stats?.gamesPlayed        || 0);
  set('st-correct',   d.stats?.correctAnswers      || 0);
  set('st-maxstreak', d.stats?.maxStreak           || 0);
  set('st-daily',     d.stats?.dailyChallengesWon  || 0);
  set('st-coins',     d.coins                      || 0);
  set('st-xp',        d.xp                        || 0);
  const grid = $('stats-achv-grid'); if (!grid) return;
  grid.innerHTML = '';
  (d.achievements || []).forEach(a => {
    grid.innerHTML += `<div class="achv-card ${a.earned ? 'unlocked' : ''}">
      <div class="achv-icon ${a.earned ? 'earned' : 'locked'}">${a.earned ? a.icon : '🔒'}</div>
      <div><div class="achv-name">${a.text}</div>
      <div class="achv-status ${a.earned ? 'done' : 'locked'}">${a.earned ? '✦ مكتسب' : 'مغلق'}</div></div>
    </div>`;
  });
}

// ─── SHOP HELPERS ─────────────────────────────────────────────────
window.buyHelper = p => {
  if (window.gameData.coins < p) { window.showToast('❌ رصيدك غير كافٍ'); return; }
  window.gameData.coins -= p;
  const a = p >= 800 ? 10 : 3;
  window.gameData.inventory.delete += a; window.gameData.inventory.hint += a; window.gameData.inventory.skip += a;
  window.playSound('snd-buy');
  try { confetti({ particleCount: 40, spread: 50 }); } catch(e) {}
  window.updateUI(); window.saveData(); window.showToast(`✅ تم الشراء! +${a} لكل وسيلة`);
};

window.useHelper = type => {
  const inv = type === 'del' ? 'delete' : type;
  if ((window.gameData.inventory[inv] ?? 0) <= 0) { window.showToast('❌ لا يوجد رصيد - اشترِ من المتجر'); return; }
  const q = currentQuestions[currentIdx]; if (!q) return;
  if ($('analysis-container').style.display !== 'none' && type !== 'skip') { window.showToast('تم الإجابة بالفعل!'); return; }
  if (type === 'delete') {
    const btns = document.querySelectorAll('.btn-option'); let rm = 0;
    btns.forEach((b, i) => { if (i !== q.c && !b.disabled && !b.classList.contains('eliminated') && rm < 2) { b.classList.add('eliminated'); b.disabled = true; rm++; } });
    if (!rm) { window.showToast('لا خيارات للحذف'); return; }
    window.showToast('✂️ تم حذف خيارَين');
  } else if (type === 'skip') {
    clearInterval(timerInterval);
    window.gameData.inventory[inv]--;
    updateDailyTask('use_helper', 1);
    window.updateUI(); window.saveData();
    currentIdx++; showQuestion(); window.showToast('⏩ تم التخطي'); return;
  } else { openModal('hint'); $('hint-text').innerText = q.x || 'ركز في السؤال جيداً!'; }
  window.gameData.inventory[inv]--;
  updateDailyTask('use_helper', 1);
  window.updateUI(); window.saveData();
};

window.claimFreeCoins = () => {
  const today = new Date().toDateString();
  if (lastFreeCoinsDate === today) { window.showToast('⏰ عُد غداً!'); return; }
  lastFreeCoinsDate = today;
  window.gameData.coins += 200;
  const btn = $('btn-free-coins');
  if (btn) { btn.innerText = '✅ تم اليوم'; btn.disabled = true; }
  window.playSound('snd-buy');
  try { confetti({ particleCount: 80, spread: 60 }); } catch(e) {}
  window.updateUI(); window.saveData(); window.showToast('🎁 +200 عملة مجانية!');
};

// ─── LEVEL & ACHIEVEMENTS ─────────────────────────────────────────
function checkLevel() {
  const d = window.gameData;
  while (d.xp >= (d.level || 1) * 1500) {
    d.level++;
    d.coins += 500;
    window.playSound('snd-level');
    try { confetti({ particleCount: 200, spread: 120, origin: { y: .6 } }); } catch(e) {}
    if      (d.level >= 50) d.rank = '🌟 أسطورة الأساطير';
    else if (d.level >= 30) d.rank = '👑 إمبراطور المعرفة';
    else if (d.level >= 20) d.rank = '💎 أسطورة المعرفة';
    else if (d.level >= 15) d.rank = '🔮 مفكر عالمي';
    else if (d.level >= 10) d.rank = '🎓 باحث متفوق';
    else if (d.level >= 5)  d.rank = '📚 قارئ نهم';
    else                    d.rank = '🔍 باحث عن المعرفة';
    setTimeout(() => window.showToast(`🎉 المستوى ${d.level}! +500 عملة`), 100);
  }
  const unlk = (id, msg) => { const a = d.achievements.find(x => x.id === id); if (a && !a.earned) { a.earned = true; setTimeout(() => window.showToast(msg), 600); } };
  if (d.level >= 5)                      unlk('lvl_5',     '🏆 إنجاز: المستوى 5!');
  if (d.level >= 10)                     unlk('lvl_10',    '👑 إنجاز: المستوى 10!');
  if (d.stats?.maxStreak >= 5)           unlk('streak_5',  '⚡ إنجاز: سلسلة 5!');
  if (d.stats?.maxStreak >= 10)          unlk('streak_10', '🔥 إنجاز: سلسلة 10!');
  if (d.coins >= 2000)                   unlk('rich',      '💰 إنجاز: 2000 عملة!');
  if (d.stats?.gamesPlayed >= 10)        unlk('veteran',   '🎖️ إنجاز: 10 جولات!');
  if (d.stats?.correctAnswers >= 50)     unlk('master_50', '🧠 إنجاز: 50 إجابة!');
  if (d.stats?.completedSections >= 5)  unlk('explorer',  '🗺️ إنجاز: 5 أقسام!');
  if (d.stats?.dailyChallengesWon >= 3)  unlk('daily_3',   '📅 إنجاز: 3 تحديات يومية!');
  // bonus coins on every 5 levels
  if (d.level % 5 === 0 && d.level > 0) {
    const bonus = d.level * 100;
    d.coins += bonus;
    setTimeout(() => window.showToast(`🎁 مكافأة المستوى ${d.level}: +${bonus} عملة!`, 4000), 200);
  }
}

// ─── RESET ────────────────────────────────────────────────────────
window.resetGame = () => {
  window.showConfirmDialog({
    icon: '🗑️', title: 'مسح البيانات', msg: 'سيتم تصفير كل شيء نهائياً\nهل أنت متأكد؟',
    okText: 'امسح كل شيء', okClass: 'danger',
    onOk: async () => {
      if (window.currentUser && window.db && window.firebaseReady) {
        try {
          await setDoc(
            doc(window.db, 'artifacts', window.appId, 'users', window.currentUser.uid, 'profile', 'data'),
            { coins: 500, xp: 0, level: 1 }
          );
        } catch(e) { console.error(e); }
      }
      location.reload();
    }
  });
};

// ─── INIT ─────────────────────────────────────────────────────────
window.navTo('home');
window.updateUI();

setTimeout(() => {
  buildRoomCatSelect();
  renderColorPicker();
  if (Notification.permission === 'granted') {
    const nb = $('notif-btn');
    if (nb) { nb.innerText = '✅ الإشعارات مفعلة'; nb.style.background = 'rgba(34,197,94,.1)'; nb.style.color = '#22c55e'; }
  }
}, 500);

document.addEventListener('keydown', e => {
  if (e.key === 'Escape')
    document.querySelectorAll('.m-overlay.active,.cmod-overlay.active').forEach(m => m.classList.remove('active'));
});

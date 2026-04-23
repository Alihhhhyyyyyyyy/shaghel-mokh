
// js/ui.js
import { ACCENT_COLORS, AVATAR_FRAMES, categoryConfig, getSeasonRank, getSeasonProgress } from './data.js';
import { showToast, playSound, openModal, closeModal, showConfirmDialog } from './helpers.js';
import { saveData } from './data.js';
import { db, APP_ID, getCurrentSeason, getWeekId } from './firebase.js';
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  where,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// متغيرات عامة للوحة المتصدرين
let currentLbTab = 'global';
window.currentLbTab = currentLbTab;

// ══════════════════════════════════════════════════════════════════
// تحديث واجهة المستخدم الرئيسية (coin, level, avatar, theme...)
// ══════════════════════════════════════════════════════════════════
export function updateUI() {
  const d = window.gameData;
  if (!d) return;

  const setText = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };

  setText('coin-count', d.coins);
  setText('top-lvl', d.level);
  setText('side-coins', d.coins);
  setText('side-lvl', d.level);
  setText('side-name', d.username);
  setText('side-rank', d.rank);
  setText('side-sections', d.stats?.completedSections || 0);
  setText('side-xp-label', `${d.xp || 0} / ${(d.level || 1) * 1500}`);
  setText('h-del', d.inventory?.delete ?? 0);
  setText('h-hint', d.inventory?.hint ?? 0);
  setText('h-skip', d.inventory?.skip ?? 0);
  setText('home-lvl-badge', `المستوى ${d.level}`);

  const xpFill = document.getElementById('side-xp-fill');
  if (xpFill) xpFill.style.width = Math.min(((d.xp || 0) / ((d.level || 1) * 1500)) * 100, 100) + '%';

  const avatarSrc = d.avatar || 'https://i.postimg.cc/qqTBP312/1000061201.png';
  ['home-avatar', 'side-avatar'].forEach(id => {
    const img = document.getElementById(id);
    if (img) img.src = avatarSrc;
  });

  const frameData = AVATAR_FRAMES.find(f => f.id === (d.avatarFrame || 'none')) || AVATAR_FRAMES[0];
  ['home-avatar-frame', 'side-avatar-frame'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.cssText = frameData.style || '';
    el.style.borderRadius = id === 'home-avatar-frame' ? '44px' : '50%';
  });

  if (d.accentColor) {
    const ac = ACCENT_COLORS.find(c => c.val === d.accentColor) || ACCENT_COLORS[0];
    document.documentElement.style.setProperty('--accent', ac.val);
    document.documentElement.style.setProperty('--accent2', ac.val2);
    document.documentElement.style.setProperty('--grad', `linear-gradient(135deg,${ac.val},${ac.val2})`);
  }

  const isDark = d.theme !== 'light';
  document.body.classList.toggle('light-mode', !isDark);
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) themeToggle.classList.toggle('on', isDark);
  const themeIconSb = document.getElementById('theme-icon-sb');
  const themeLabelSb = document.getElementById('theme-label-sb');
  if (themeIconSb) themeIconSb.innerText = isDark ? '🌙' : '☀️';
  if (themeLabelSb) themeLabelSb.innerText = isDark ? 'الوضع الليلي' : 'الوضع النهاري';

  const isSoundOn = d.soundEnabled !== false;
  const st = document.getElementById('sound-toggle-sb');
  if (st) st.classList.toggle('on', isSoundOn);
  const si = document.getElementById('sound-icon-sb');
  if (si) si.innerText = isSoundOn ? '🔊' : '🔇';

  ['skip', 'hint', 'del'].forEach(t => {
    const inv = t === 'del' ? 'delete' : t;
    const btn = document.getElementById(t === 'del' ? 'btn-del' : `btn-${t}`);
    if (btn) btn.classList.toggle('empty', (d.inventory?.[inv] ?? 0) <= 0);
  });

  const streak = d.stats?.currentStreak || 0;
  const sb = document.getElementById('quiz-streak-badge');
  const sn = document.getElementById('quiz-streak-num');
  if (sb && sn) {
    sn.innerText = streak;
    sb.style.display = streak >= 2 ? 'inline-flex' : 'none';
  }

  updateDailyTeaser();
  updateHomeStreak();
  checkFriendRivalry();
}
window.updateUI = updateUI;

function updateDailyTeaser() {
  const d = window.gameData;
  if (!d) return;
  const today = new Date().toDateString();
  const done = d.dailyChallengeDate === today;
  const teaserStatus = document.getElementById('daily-teaser-status');
  const dailyProg = document.getElementById('home-daily-prog');
  const dot = document.getElementById('daily-notif-dot');
  if (teaserStatus) teaserStatus.innerText = done ? `✅ نقطتك: ${d.dailyChallengeScore || 0}/10` : '👆 العب الآن!';
  if (dailyProg) dailyProg.style.width = done ? '100%' : '0%';
  if (dot) dot.classList.toggle('show', !done);
}

function updateHomeStreak() {
  const d = window.gameData;
  if (!d) return;
  const ls = d.loginStreak || {};
  const cnt = ls.count || 0;
  const el = document.getElementById('home-streak-badge');
  if (!el) return;
  if (cnt < 2) { el.style.display = 'none'; return; }
  el.style.display = 'flex';
  let bg, border, glow;
  if (cnt >= 30) { bg = 'rgba(251,191,36,.18)'; border = 'rgba(251,191,36,.5)'; glow = '#fbbf24'; }
  else if (cnt >= 14) { bg = 'rgba(239,68,68,.15)'; border = 'rgba(239,68,68,.4)'; glow = '#ef4444'; }
  else if (cnt >= 7) { bg = 'rgba(249,115,22,.13)'; border = 'rgba(249,115,22,.35)'; glow = '#f97316'; }
  else { bg = 'rgba(251,191,36,.09)'; border = 'rgba(251,191,36,.22)'; glow = '#fbbf24'; }
  el.style.background = bg;
  el.style.borderColor = border;
  el.style.boxShadow = `0 0 18px ${glow}44`;
  const numEl = document.getElementById('home-streak-num');
  const lblEl = document.getElementById('home-streak-lbl');
  if (numEl) numEl.innerText = cnt;
  if (lblEl) {
    if (cnt >= 30) lblEl.innerText = 'يوم 🏆';
    else if (cnt >= 14) lblEl.innerText = 'يوم محترف 💎';
    else if (cnt >= 7) lblEl.innerText = 'يوم نار 🔥';
    else lblEl.innerText = 'يوم متتالي';
  }
  const warnEl = document.getElementById('home-streak-warn');
  if (warnEl) {
    const hour = new Date().getHours();
    const showWarn = cnt >= 3 && hour >= 20;
    warnEl.style.display = showWarn ? 'block' : 'none';
    if (showWarn) warnEl.innerHTML = `<span style="font-size:13px">⚠️</span> سلسلتك ${cnt} يوم في خطر — العب تحدي اليوم الآن!`;
  }
}

async function checkFriendRivalry() {
  const d = window.gameData;
  if (!d || !window.firebaseReady || !window.currentUser) return;
  const friends = d.friends || [];
  if (!friends.length) return;
  const knownXP = d._friendsLastXP || {};
  const myXP = d.xp || 0;
  try {
    const snap = await getDocs(collection(db, 'artifacts', APP_ID, 'public', 'data', 'rankings'));
    const liveData = {};
    snap.forEach(doc => { const u = doc.data(); if (u.uid) liveData[u.uid] = u; });
    let biggestRival = null, biggestDiff = 0;
    for (const f of friends) {
      const live = liveData[f.uid];
      if (!live) continue;
      const liveXP = live.xp || 0;
      const prevXP = knownXP[f.uid] ?? liveXP;
      if (liveXP > myXP) {
        const diff = liveXP - myXP;
        if (diff > biggestDiff) {
          biggestDiff = diff;
          biggestRival = { name: live.username || f.username, xp: liveXP, diff };
        }
      }
      knownXP[f.uid] = liveXP;
    }
    d._friendsLastXP = knownXP;
    const rivalEl = document.getElementById('home-rival-banner');
    if (rivalEl) {
      if (biggestRival && biggestRival.diff > 0) {
        rivalEl.style.display = 'flex';
        document.getElementById('rival-name').innerText = biggestRival.name;
        document.getElementById('rival-diff').innerText = `+${biggestRival.diff.toLocaleString()} XP`;
      } else {
        rivalEl.style.display = 'none';
      }
    }
  } catch (e) {}
}

// ══════════════════════════════════════════════════════════════════
// التنقل بين الشاشات
// ══════════════════════════════════════════════════════════════════
export function navTo(id) {
  if (window.timerInterval) clearInterval(window.timerInterval);
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(n => n.classList.remove('active'));
  const scr = document.getElementById(`screen-${id}`);
  if (scr) scr.classList.add('active');
  const nav = document.getElementById(`n-${id}`);
  if (nav) nav.classList.add('active');
  document.getElementById('main-nav').style.display = ['quiz', 'result', 'lobby'].includes(id) ? 'none' : 'flex';
  if (id === 'map') renderMap();
  if (id === 'leaderboard') window.renderLeaderboard(window.currentLbTab || 'global');
  if (id === 'daily') window.renderDailyChallenge();
  if (id === 'rooms') window.loadRooms();
  if (id === 'shop') renderShop('helpers');
  if (id === 'stats') { renderStats(); window.switchStatsTab('overview'); }
  if (id === 'weekly') window.renderWeeklyChallenge();
}
window.navTo = navTo;

// ══════════════════════════════════════════════════════════════════
// عرض الخريطة
// ══════════════════════════════════════════════════════════════════
export function renderMap() {
  const grid = document.getElementById('map-grid');
  if (!grid) return;
  const unlocked = window.gameData.unlockedCategories || ['islamic'];
  const keys = Object.keys(categoryConfig).sort((a, b) => categoryConfig[a].order - categoryConfig[b].order);
  const doneByKey = {};
  (window.gameData._mapProgress || []).forEach(k => doneByKey[k] = true);
  let totalUnlocked = 0;
  grid.innerHTML = '';
  keys.forEach((key) => {
    const cat = categoryConfig[key];
    const isUnlocked = true;
    const isDone = !!doneByKey[key];
    if (isUnlocked) totalUnlocked++;
    const subsCompleted = (window.gameData._subProgress || {})[key] || 0;
    const pct = Math.round((subsCompleted / cat.subs.length) * 100);
    const node = document.createElement('div');
    const catColors2 = {
      islamic: '#f59e0b', egypt: '#ef4444', tech: '#3b82f6', science: '#8b5cf6',
      geo: '#10b981', sports: '#f97316', puzzles: '#ec4899', food: '#84cc16',
      cairo: '#06b6d4', words: '#a855f7', music: '#f43f5e', cinema: '#eab308',
    };
    const nodeColor = catColors2[key] || (window.gameData?.accentColor || '#fbbf24');
    node.className = `map-node ${isDone ? 'completed' : isUnlocked ? 'unlocked' : 'locked'}`;
    node.style.borderColor = isDone ? '#22c55e55' : nodeColor + '44';
    node.style.boxShadow = isDone ? '0 8px 30px rgba(34,197,94,.12)' : `0 8px 30px ${nodeColor}15`;
    const catColors = {
      islamic: ['#f59e0b', '#d97706'], egypt: ['#ef4444', '#dc2626'],
      tech: ['#3b82f6', '#2563eb'], science: ['#8b5cf6', '#7c3aed'],
      geo: ['#10b981', '#059669'], sports: ['#f97316', '#ea580c'],
      puzzles: ['#ec4899', '#db2777'], food: ['#84cc16', '#65a30d'],
      cairo: ['#06b6d4', '#0891b2'], words: ['#a855f7', '#9333ea'],
      music: ['#f43f5e', '#e11d48'], cinema: ['#eab308', '#ca8a04'],
    };
    const [c1, c2] = catColors[key] || ['#fbbf24', '#f59e0b'];
    node.innerHTML = `
      <div style="position:absolute;inset:0;border-radius:22px;background:linear-gradient(135deg,${c1}18,${c2}08);pointer-events:none"></div>
      ${isDone ? '<div class="map-check">✓</div>' : ''}
      <div style="width:52px;height:52px;border-radius:18px;background:linear-gradient(135deg,${c1},${c2});display:flex;align-items:center;justify-content:center;font-size:26px;margin:0 auto 10px;box-shadow:0 6px 20px ${c1}44">${cat.icon}</div>
      <div class="map-name" style="color:#fff">${cat.name}</div>
      <div class="map-subs">${cat.subs.length} أقسام</div>
      <div class="map-progress-bar" style="margin-top:10px"><div class="map-progress-fill" style="width:${pct}%;background:linear-gradient(90deg,${c1},${c2})"></div></div>`;
    if (isUnlocked && !isDone) node.onclick = () => { window.selectedCategory = key; showSubsForMap(key); };
    grid.appendChild(node);
  });
  document.getElementById('map-progress-badge').innerText = `${totalUnlocked}/${Object.keys(categoryConfig).length} مفتوح`;
}
window.renderMap = renderMap;

function showSubsForMap(key) {
  const cat = categoryConfig[key];
  document.getElementById('paths-header').innerHTML = `
    <button onclick="window.navTo('map')"
      style="color:var(--accent);font-weight:900;margin-bottom:18px;display:inline-flex;
      align-items:center;gap:8px;background:rgba(251,191,36,.07);padding:10px 16px;
      border-radius:14px;border:none;cursor:pointer;font-family:'Tajawal',sans-serif;font-size:14px">
      <i class="fas fa-arrow-right"></i> العودة للخريطة
    </button>
    <h2 style="font-size:24px;font-weight:900;margin-bottom:16px">${cat.icon} ${cat.name}</h2>`;
  const list = document.getElementById('paths-list');
  list.innerHTML = '';
  cat.subs.forEach(sub => {
    const div = document.createElement('div');
    div.style.cssText = 'background:var(--card);padding:18px 20px;border-radius:22px;border:1px solid rgba(255,255,255,.05);display:flex;justify-content:space-between;align-items:center;cursor:pointer;transition:.2s';
    div.innerHTML = `<div style="display:flex;align-items:center;gap:12px">
      <div style="width:8px;height:8px;border-radius:50%;background:var(--accent)"></div>
      <span style="font-weight:700;font-size:16px">${sub}</span>
    </div>
    <span style="background:var(--grad);color:#000;padding:8px 18px;border-radius:14px;font-weight:900;font-size:12px;border:none">ابدأ</span>`;
    div.onclick = () => window.openGameMode(cat.name, sub, cat.icon);
    list.appendChild(div);
  });
  window.navTo('paths');
}

// ══════════════════════════════════════════════════════════════════
// المتجر
// ══════════════════════════════════════════════════════════════════
export function renderShop(tab) {
  const c = document.getElementById('shop-content');
  if (!c) return;
  if (tab === 'helpers') {
    c.innerHTML = shopItem('📦', 'حزمة المساعدات', '3 من كل نوع', 300, 'window.buyHelper(300)') +
                  shopItem('💎', 'حزمة الخبير', '10 من كل نوع', 800, 'window.buyHelper(800)') +
                  freeCoinsItem();
  } else if (tab === 'frames') {
    renderFramesShop(c);
  } else if (tab === 'themes') {
    renderThemesShop(c);
  }
}
window.renderShop = renderShop;

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
  const grid = document.createElement('div');
  grid.className = 'frames-grid';
  AVATAR_FRAMES.forEach(frame => {
    const owned = frame.id === 'none' || (window.gameData.ownedFrames || []).includes(frame.id);
    const active = window.gameData.avatarFrame === frame.id;
    const el = document.createElement('div');
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
    updateUI(); saveData(); renderShop('frames');
    showToast(`✅ تم تفعيل إطار: ${frame.name}`);
  } else {
    if (window.gameData.coins < frame.price) { showToast('❌ رصيدك غير كافٍ'); return; }
    showConfirmDialog({
      icon: '🖼️', title: 'شراء الإطار', msg: `${frame.name}\nالسعر: ${frame.price} 💰`,
      okText: 'شراء', okClass: 'ok',
      onOk: () => {
        window.gameData.coins -= frame.price;
        if (!window.gameData.ownedFrames) window.gameData.ownedFrames = [];
        window.gameData.ownedFrames.push(frame.id);
        window.gameData.avatarFrame = frame.id;
        playSound('snd-buy');
        try { confetti({ particleCount: 40, spread: 50 }); } catch(e) {}
        updateUI(); saveData(); renderShop('frames');
        showToast(`✅ تم شراء وتفعيل: ${frame.name}`);
      }
    });
  }
};

function renderThemesShop(c) {
  c.innerHTML = `
    <div style="margin-bottom:16px">
      <h3 style="font-size:13px;font-weight:900;color:var(--text2);text-transform:uppercase;letter-spacing:.08em;margin-bottom:12px">ألوان التطبيق (مجانية)</h3>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">
        ${ACCENT_COLORS.map(col => `
          <div onclick="window.gameData.accentColor='${col.val}';window.updateUI();window.saveData();window.showToast('🎨 ${col.name}')"
            style="background:linear-gradient(135deg,${col.val},${col.val2});border-radius:18px;padding:20px 12px;text-align:center;cursor:pointer;transition:.2s;border:3px solid ${window.gameData.accentColor === col.val ? '#fff' : 'transparent'}"
            onmousedown="this.style.transform='scale(.95)'" onmouseup="this.style.transform=''">
            <div style="font-size:22px;margin-bottom:6px">🎨</div>
            <div style="font-size:12px;font-weight:900;color:#000">${col.name}</div>
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

// ══════════════════════════════════════════════════════════════════
// لوحة المتصدرين
// ══════════════════════════════════════════════════════════════════
window.switchLeaderboard = tab => {
  currentLbTab = tab;
  window.currentLbTab = tab;
  document.querySelectorAll('.lb-tab').forEach(b => {
    const active = b.dataset.tab === tab;
    b.style.background = active ? 'rgba(251,191,36,.12)' : 'rgba(255,255,255,.05)';
    b.style.color = active ? 'var(--accent)' : 'var(--text2)';
    b.style.borderColor = active ? 'rgba(251,191,36,.2)' : 'rgba(255,255,255,.07)';
  });
  window.renderLeaderboard(tab);
};

export async function renderLeaderboard(tab = 'global') {
  const list = document.getElementById('leader-list');
  if (!list) return;
  const sb = document.getElementById('lb-season-badge');
  list.innerHTML = '<div style="text-align:center;padding:40px;opacity:.4"><i class="fas fa-circle-notch fa-spin" style="font-size:28px;color:var(--accent)"></i></div>';
  let waited = 0;
  while (!window.firebaseReady && waited < 50) { await new Promise(r => setTimeout(r, 100)); waited++; }
  if (!window.firebaseReady) { list.innerHTML = '<p style="text-align:center;opacity:.4;padding:30px;font-weight:700">Firebase غير متاح</p>'; return; }
  const season = getCurrentSeason();
  if (sb) sb.innerText = tab === 'season' ? `موسم ${season}` : '';
  try {
    let leaders = [];
    if (tab === 'daily') {
      const today = new Date().toISOString().slice(0, 10);
      const snap = await getDocs(collection(db, 'artifacts', APP_ID, 'public', 'data', `daily_${today}`));
      snap.forEach(d => leaders.push(d.data()));
      leaders.sort((a, b) => b.score - a.score);
    } else {
      const snap = await getDocs(collection(db, 'artifacts', APP_ID, 'public', 'data', 'rankings'));
      snap.forEach(d => leaders.push(d.data()));
      if (tab === 'season') leaders.sort((a, b) => ((b[`season_${season}`] || 0) - (a[`season_${season}`] || 0)));
      else leaders.sort((a, b) => (b.xp || 0) - (a.xp || 0));
    }
    leaders = leaders.slice(0, 20);
    if (!leaders.length) { list.innerHTML = '<p style="text-align:center;opacity:.4;padding:30px;font-weight:700">لا يوجد لاعبون بعد 🏆</p>'; return; }
    list.innerHTML = '';
    const medals = ['🥇', '🥈', '🥉'];
    const topBg = ['rgba(251,191,36,.1)', 'rgba(203,213,225,.08)', 'rgba(217,119,6,.08)'];
    const topBord = ['rgba(251,191,36,.3)', 'rgba(203,213,225,.2)', 'rgba(217,119,6,.2)'];
    leaders.forEach((u, i) => {
      const rank = i + 1;
      const isMe = u.uid === window.currentUser?.uid;
      const el = document.createElement('div');
      el.className = `leader-item${isMe ? ' me' : ''}`;
      if (rank <= 3) { el.style.background = topBg[rank - 1]; el.style.borderColor = topBord[rank - 1]; }
      const score = tab === 'season' ? (u[`season_${season}`] || 0) : tab === 'daily' ? `${u.score || 0}/10` : (u.xp || 0);
      const scoreLabel = tab === 'daily' ? 'نقطة' : 'XP';
      const accentCol = u.accentColor || '#fbbf24';
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
}
window.renderLeaderboard = renderLeaderboard;

// ══════════════════════════════════════════════════════════════════
// تحدي اليوم
// ══════════════════════════════════════════════════════════════════
export async function renderDailyChallenge() {
  if (window._dailyCountdownInterval) clearInterval(window._dailyCountdownInterval);
  window._dailyCountdownInterval = setInterval(() => {
    const el = document.getElementById('daily-countdown-timer');
    if (!el) { clearInterval(window._dailyCountdownInterval); return; }
    const now = new Date(); const mid = new Date(now); mid.setHours(24, 0, 0, 0);
    const diff = mid - now;
    el.innerText = String(Math.floor(diff / 3600000)).padStart(2, '0') + ':' +
                   String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0') + ':' +
                   String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
  }, 1000);

  const today = new Date().toDateString();
  const todayISO = new Date().toISOString().slice(0, 10);
  const d = window.gameData;
  const done = d.dailyChallengeDate === today;
  const now = new Date(); const midnight = new Date(now); midnight.setHours(24, 0, 0, 0);
  const diff = midnight - now;
  const hh = String(Math.floor(diff / 3600000)).padStart(2, '0');
  const mm = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');
  const ss = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
  const header = document.getElementById('daily-header-card');
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
  const ldr = document.getElementById('daily-leader-list');
  if (ldr) {
    ldr.innerHTML = '<div style="text-align:center;padding:20px;opacity:.4"><i class="fas fa-circle-notch fa-spin" style="color:var(--accent)"></i></div>';
    if (window.firebaseReady) {
      try {
        const snap = await getDocs(collection(db, 'artifacts', APP_ID, 'public', 'data', `daily_${todayISO}`));
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
window.renderDailyChallenge = renderDailyChallenge;

// ══════════════════════════════════════════════════════════════════
// الإحصائيات
// ══════════════════════════════════════════════════════════════════
export function renderStats() {
  const d = window.gameData;
  const ds = d.detailedStats || {};
  const ls = d.loginStreak || {};
  const setText = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
  setText('st-games', d.stats?.gamesPlayed || 0);
  setText('st-correct', d.stats?.correctAnswers || 0);
  setText('st-maxstreak', d.stats?.maxStreak || 0);
  setText('st-daily', d.stats?.dailyChallengesWon || 0);
  setText('st-coins', d.coins || 0);
  setText('st-xp', d.xp || 0);
  setText('st-speed', ds.speedAnswers || 0);
  setText('st-nohint', ds.noHintGames || 0);
  setText('st-avgtime', (ds.avgAnswerTime || 0) + ' ث');
  setText('st-login-streak', (ls.count || 0) + ' يوم');
  const maxEl = document.getElementById('st-login-max');
  if (maxEl) maxEl.innerText = `أعلى: ${ls.maxCount || 0} يوم`;
  const dotsEl = document.getElementById('login-streak-dots');
  if (dotsEl) {
    dotsEl.innerHTML = '';
    for (let i = 6; i >= 0; i--) {
      const active = i < (ls.count || 0);
      dotsEl.innerHTML += `<div style="
        width:28px;height:28px;border-radius:9px;
        background:${active ? '#22c55e' : 'rgba(255,255,255,.07)'};
        border:2px solid ${active ? '#22c55e' : 'rgba(255,255,255,.08)'};
        display:flex;align-items:center;justify-content:center;
        font-size:13px;transition:.3s">
        ${active ? '✓' : ''}
      </div>`;
    }
  }
}
window.renderStats = renderStats;

export function switchStatsTab(tab) {
  ['overview', 'charts', 'achievements'].forEach(t => {
    const el = document.getElementById(`stats-tab-${t}`);
    const btn = document.querySelector(`[data-stab="${t}"]`);
    if (el) el.style.display = t === tab ? 'block' : 'none';
    if (btn) {
      btn.style.background = t === tab ? 'rgba(251,191,36,.12)' : 'rgba(255,255,255,.05)';
      btn.style.color = t === tab ? 'var(--accent)' : 'var(--text2)';
      btn.style.borderColor = t === tab ? 'rgba(251,191,36,.2)' : 'rgba(255,255,255,.07)';
    }
  });
  if (tab === 'charts') renderStatsCharts();
  if (tab === 'achievements') renderStatsAchievements();
}
window.switchStatsTab = switchStatsTab;

function renderStatsCharts() {
  const d = window.gameData;
  const st = d.stats || {};
  const ds = d.detailedStats || {};
  const total = (st.correctAnswers || 0) + (st.gamesPlayed || 1);
  const acc = total > 0 ? Math.round(((st.correctAnswers || 0) / Math.max(total, 1)) * 100) : 0;
  const avgScore = st.gamesPlayed > 0 ? ((st.correctAnswers || 0) / st.gamesPlayed).toFixed(1) : 0;
  const accEl = document.getElementById('chart-accuracy');
  const avgEl = document.getElementById('chart-avg-score');
  if (accEl) accEl.innerText = acc + '%';
  if (avgEl) avgEl.innerText = avgScore;
  const chartCats = document.getElementById('chart-categories');
  if (!chartCats) return;
  const catColors = {
    'إسلاميات': '#f59e0b', 'تاريخ مصر': '#ef4444', 'تقنية': '#3b82f6',
    'علوم وفضاء': '#8b5cf6', 'جغرافيا': '#10b981', 'رياضة': '#f97316',
    'ألغاز': '#ec4899', 'طعام': '#84cc16'
  };
  const played = ds.categoriesPlayed || [];
  chartCats.innerHTML = '';
  Object.keys(catColors).forEach(cat => {
    const isPlayed = played.includes(cat);
    const pct = isPlayed ? Math.min(100, Math.floor((st.correctAnswers || 0) / Math.max(st.gamesPlayed || 1, 1) * 10)) : 0;
    chartCats.innerHTML += `<div style="display:flex;align-items:center;gap:10px">
      <div style="font-size:12px;font-weight:700;color:var(--text2);min-width:80px;text-align:right">${cat}</div>
      <div style="flex:1;height:8px;background:rgba(255,255,255,.07);border-radius:10px;overflow:hidden">
        <div style="height:100%;width:${pct}%;background:${catColors[cat]};border-radius:10px;transition:width .8s"></div>
      </div>
      <div style="font-size:11px;font-weight:900;color:${isPlayed ? catColors[cat] : 'var(--text3)'};min-width:36px">
        ${isPlayed ? pct + '%' : '—'}</div>
    </div>`;
  });
}

function renderStatsAchievements() {
  const d = window.gameData;
  const achvs = d.achievements || [];
  const earned = achvs.filter(a => a.earned).length;
  const pct = achvs.length > 0 ? Math.round((earned / achvs.length) * 100) : 0;
  const progTxt = document.getElementById('achv-progress-text');
  const progBar = document.getElementById('achv-progress-bar');
  if (progTxt) progTxt.innerText = `${earned}/${achvs.length}`;
  if (progBar) progBar.style.width = pct + '%';
  const grid = document.getElementById('stats-achv-grid');
  if (!grid) return;
  grid.innerHTML = '';
  achvs.forEach(a => {
    grid.innerHTML += `<div class="achv-card ${a.earned ? 'unlocked' : ''}">
      <div class="achv-icon ${a.earned ? 'earned' : 'locked'}">${a.earned ? a.icon : '🔒'}</div>
      <div><div class="achv-name">${a.text}</div>
      <div class="achv-status ${a.earned ? 'done' : 'locked'}">${a.earned ? '✦ مكتسب' : 'مغلق'}</div></div>
    </div>`;
  });
}

// ══════════════════════════════════════════════════════════════════
// Sidebar & Settings
// ══════════════════════════════════════════════════════════════════
window.toggleSidebar = () => {
  const s = document.getElementById('sidebar');
  const o = document.getElementById('sb-overlay');
  const open = s.classList.toggle('open');
  o.style.display = open ? 'block' : 'none';
  if (open) { updateUI(); renderColorPicker(); }
};

window.toggleSettings = () => {
  const panel = document.getElementById('settings-panel');
  const arrow = document.getElementById('settings-arrow');
  const dot = document.getElementById('settings-dot');
  const open = panel.classList.toggle('open');
  if (arrow) arrow.style.transform = open ? 'rotate(90deg)' : '';
  if (dot) dot.style.opacity = open ? '1' : '0';
};

window.toggleTheme = () => {
  window.gameData.theme = window.gameData.theme === 'dark' ? 'light' : 'dark';
  updateUI(); saveData();
};

window.toggleSound = () => {
  window.gameData.soundEnabled = !(window.gameData.soundEnabled !== false);
  updateUI(); saveData();
  showToast(window.gameData.soundEnabled ? '🔊 الصوت مفعّل' : '🔇 الصوت مكتوم');
};

window.changeUsername = async () => {
  const name = await window.showInputDialog(window.gameData.username);
  if (name === null) return;
  if (name.length >= 3 && name.length <= 15) {
    window.gameData.username = name;
    await saveData(); updateUI();
    showToast('✅ تم تغيير الاسم!');
  } else if (name.length > 0) showToast('❌ الاسم يجب 3-15 حرفاً');
};

window.saveMessageDebounced = () => {
  clearTimeout(window._msgDebounce);
  window._msgDebounce = setTimeout(() => {
    window.gameData.message = document.getElementById('my-message-input').value.trim();
    saveData();
  }, 800);
};

export function renderColorPicker() {
  const container = document.getElementById('theme-color-picker');
  if (!container) return;
  container.innerHTML = '';
  ACCENT_COLORS.forEach(c => {
    const btn = document.createElement('div');
    btn.className = 'theme-color-btn' + (window.gameData.accentColor === c.val ? ' active' : '');
    btn.style.background = c.val;
    btn.title = c.name;
    btn.onclick = () => {
      window.gameData.accentColor = c.val;
      updateUI(); saveData(); renderColorPicker();
      showToast(`🎨 تم تغيير اللون إلى ${c.name}`);
    };
    container.appendChild(btn);
  });
}
window.renderColorPicker = renderColorPicker;

// ══════════════════════════════════════════════════════════════════
// تبويبات المتجر — showShopTab
// ══════════════════════════════════════════════════════════════════
export function showShopTab(tab) {
  document.querySelectorAll('.shop-tab').forEach(b => {
    const active = b.dataset.stab === tab;
    b.style.background  = active ? 'rgba(251,191,36,.12)' : 'rgba(255,255,255,.05)';
    b.style.color       = active ? 'var(--accent)'        : 'var(--text2)';
    b.style.borderColor = active ? 'rgba(251,191,36,.2)'  : 'rgba(255,255,255,.07)';
  });
  renderShop(tab);
}
window.showShopTab = showShopTab;
window.showDailyTasksModal = () => {
  const d = window.gameData;
  let html = '';
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
  document.getElementById('tasks-body').innerHTML = html;
  openModal('tasks');
};

window.showAchievementsModal = () => {
  const d = window.gameData;
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
  document.getElementById('achv-body').innerHTML = html + '</div>';
  openModal('achv');
};

window.showPlayerCard = () => {
  const d = window.gameData;
  const season = getCurrentSeason();
  const frame = AVATAR_FRAMES.find(f => f.id === (d.avatarFrame || 'none')) || AVATAR_FRAMES[0];
  document.getElementById('player-card-content').innerHTML = `
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
  const d = window.gameData;
  const text = `🧠 شغل مخك\n👤 ${d.username} · المستوى ${d.level}\n🏆 ${d.rank}\n⭐ ${d.xp} XP\n✅ ${d.stats?.correctAnswers || 0} إجابة صحيحة\n🔥 أعلى سلسلة: ${d.stats?.maxStreak || 0}`;
  if (navigator.share) {
    try { await navigator.share({ title: 'بطاقتي في شغل مخك', text }); } catch(e) {}
  } else {
    await navigator.clipboard.writeText(text).catch(() => {});
    showToast('📋 تم نسخ البطاقة!');
  }
};

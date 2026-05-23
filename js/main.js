// js/main.js
import './firebase.js';                // تهيئة Firebase والمتغيرات العامة
import { initAuth, listenToUserData } from './auth.js';
import {
  updateUI,
  navTo,
  renderMap,
  renderShop,
  renderLeaderboard,
  renderDailyChallenge,
  renderStats,
  switchStatsTab,
  renderColorPicker,
  showShopTab
} from './ui.js';
import {
  showToast,
  playSound,
  openModal,
  closeModal,
  showConfirmDialog,
  showInputDialog,
  confirmInput,
  cancelInput,
  confirmExit,
  _confirmExit,
  _cancelExit
} from './helpers.js';
import {
  saveData,
  updateDailyTask,
  updateWeeklyTask,
  addSeasonXP,
  checkLevel,
  updateLoginStreak,
  AVATAR_FRAMES,
  ACCENT_COLORS,
  categoryConfig
} from './data.js';
import {
  startQuiz,
  showQuestion,
  selectAnswer,
  nextQuestion,
  useHelper,
  askAIAnalysis
} from './quiz.js';
import {
  createRoom,
  joinRoomByCode,
  joinRoomById,
  confirmCreateRoom,
  toggleReady,
  startRoomGame,
  leaveRoom,
  sendLobbyMessage,
  kickPlayer,
  loadRooms
} from './rooms.js';
import {
  startDailyChallenge,
  renderWeeklyChallenge,
  renderSeasonTab,
  switchChallengeTab,
  claimWeeklyTask,
  startWeeklyChallenge
} from './challenges.js';
import {
  showFriendsModal,
  copyFriendCode,
  addFriendByCode,
  removeFriend
} from './friends.js';

// ══════════════════════════════════════════════════════════════════
// تعيين الدوال والكائنات العامة على window (للاستخدام في HTML onclick)
// ══════════════════════════════════════════════════════════════════

// UI والتنقل
window.navTo = navTo;
window.updateUI = updateUI;
window.renderMap = renderMap;
window.renderShop = renderShop;
window.renderLeaderboard = renderLeaderboard;
window.renderDailyChallenge = renderDailyChallenge;
window.renderWeeklyChallenge = renderWeeklyChallenge;
window.renderSeasonTab = renderSeasonTab;
window.renderStats = renderStats;
window.switchStatsTab = switchStatsTab;
window.switchChallengeTab = switchChallengeTab;
window.switchLeaderboard = (tab) => renderLeaderboard(tab);
window.showShopTab = showShopTab;               // ← ضروري لتبويبات المتجر
window.renderColorPicker = renderColorPicker;   // ← ضروري للسايدبار

// المساعدات العامة
window.showToast = showToast;
window.playSound = playSound;
window.openModal = openModal;
window.closeModal = closeModal;
window.showConfirmDialog = showConfirmDialog;
window.showInputDialog = showInputDialog;
window._confirmInput = confirmInput;
window._cancelInput = cancelInput;
window._cancelConfirm = () => document.getElementById('cmod-confirm')?.classList.remove('active');
window.confirmExit = confirmExit;
window._confirmExit = _confirmExit;
window._cancelExit = _cancelExit;

// البيانات والحفظ
window.saveData = saveData;
window.updateDailyTask = updateDailyTask;
window.updateWeeklyTask = updateWeeklyTask;
window.addSeasonXP = addSeasonXP;
window.checkLevel = checkLevel;
window.updateLoginStreak = updateLoginStreak;

// كائنات البيانات (تُستخدم في دوال مثل showPlayerCard و handleFrameClick)
window.AVATAR_FRAMES = AVATAR_FRAMES;
window.ACCENT_COLORS = ACCENT_COLORS;
window.categoryConfig = categoryConfig;

// الاختبار والأسئلة
window.startQuiz = startQuiz;
window.showQuestion = showQuestion;
window.selectAnswer = selectAnswer;
window.nextQuestion = nextQuestion;
window.useHelper = useHelper;
window.askAIAnalysis = askAIAnalysis;

// الغرف والدردشة
window.createRoom = createRoom;
window.joinRoomByCode = joinRoomByCode;
window.joinRoomById = joinRoomById;
window.confirmCreateRoom = confirmCreateRoom;
window.toggleReady = toggleReady;
window.startRoomGame = startRoomGame;
window.leaveRoom = leaveRoom;
window.sendLobbyMessage = sendLobbyMessage;
window.kickPlayer = kickPlayer;
window.loadRooms = loadRooms;
window.openJoinRoomModal = () => openModal('join-room');

// التحديات
window.startDailyChallenge = startDailyChallenge;
window.startWeeklyChallenge = startWeeklyChallenge;
window.claimWeeklyTask = claimWeeklyTask;

// الأصدقاء
window.showFriendsModal = showFriendsModal;
window.copyFriendCode = copyFriendCode;
window.addFriendByCode = addFriendByCode;
window.removeFriend = removeFriend;

// دوال إضافية من المتجر والإعدادات
window.toggleSidebar = () => {
  const s = document.getElementById('sidebar');
  const o = document.getElementById('sb-overlay');
  const open = s.classList.toggle('open');
  o.style.display = open ? 'block' : 'none';
  if (open) {
    updateUI();
    if (typeof renderColorPicker === 'function') renderColorPicker();
  }
};

window.toggleSettings = () => {
  const panel = document.getElementById('settings-panel');
  const icon  = document.getElementById('settings-gear-icon');
  const open  = panel?.classList.toggle('open');
  if (icon) {
    icon.style.transform  = open ? 'rotate(90deg)' : '';
    icon.style.color      = open ? '#f97316' : '';
    icon.style.transition = 'all .3s';
  }
};

window.toggleTheme = () => {
  window.gameData.theme = 'dark';
  saveData();
};

window.toggleSound = () => {
  window.gameData.soundEnabled = !(window.gameData.soundEnabled !== false);
  updateUI();
  saveData();
  showToast(window.gameData.soundEnabled ? '🔊 الصوت مفعّل' : '🔇 الصوت مكتوم');
};

window.changeUsername = async () => {
  const name = await showInputDialog(window.gameData.username);
  if (name === null) return;
  if (name.length >= 3 && name.length <= 15) {
    window.gameData.username = name;
    await saveData();
    updateUI();
    showToast('✅ تم تغيير الاسم!');
  } else if (name.length > 0) {
    showToast('❌ الاسم يجب 3-15 حرفاً');
  }
};

window.saveMessageDebounced = () => {
  clearTimeout(window._msgDebounce);
  window._msgDebounce = setTimeout(() => {
    window.gameData.message = document.getElementById('my-message-input')?.value.trim() || '';
    saveData();
  }, 800);
};

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
  const season = window.getCurrentSeason?.() || '';
  const frame = (AVATAR_FRAMES || []).find(f => f.id === (d.avatarFrame || 'none')) || { style: '' };
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
    try { await navigator.share({ title: 'بطاقتي في شغل مخك', text }); } catch (e) {}
  } else {
    await navigator.clipboard.writeText(text).catch(() => {});
    showToast('📋 تم نسخ البطاقة!');
  }
};

window.buyHelper = (price) => {
  if (window.gameData.coins < price) {
    showToast('❌ رصيدك غير كافٍ');
    return;
  }
  window.gameData.coins -= price;
  const amount = price >= 800 ? 10 : 3;
  window.gameData.inventory.delete += amount;
  window.gameData.inventory.hint += amount;
  window.gameData.inventory.skip += amount;
  playSound('snd-buy');
  try { confetti({ particleCount: 40, spread: 50 }); } catch (e) {}
  updateUI();
  saveData();
  showToast(`✅ تم الشراء! +${amount} لكل وسيلة`);
};

window.claimFreeCoins = () => {
  const today = new Date().toDateString();
  if (window.lastFreeCoinsDate === today) {
    showToast('⏰ عُد غداً!');
    return;
  }
  window.lastFreeCoinsDate = today;
  window.gameData.coins += 200;
  const btn = document.getElementById('btn-free-coins');
  if (btn) { btn.innerText = '✅ تم اليوم'; btn.disabled = true; }
  playSound('snd-buy');
  try { confetti({ particleCount: 80, spread: 60 }); } catch (e) {}
  updateUI();
  saveData();
  showToast('🎁 +200 عملة مجانية!');
};

window.handleFrameClick = (frame) => {
  const owned = frame.id === 'none' || (window.gameData.ownedFrames || []).includes(frame.id);
  if (owned) {
    window.gameData.avatarFrame = frame.id;
    updateUI();
    saveData();
    renderShop('frames');
    showToast(`✅ تم تفعيل إطار: ${frame.name}`);
  } else {
    if (window.gameData.coins < frame.price) {
      showToast('❌ رصيدك غير كافٍ');
      return;
    }
    showConfirmDialog({
      icon: '🖼️', title: 'شراء الإطار', msg: `${frame.name}\nالسعر: ${frame.price} 💰`,
      okText: 'شراء', okClass: 'ok',
      onOk: () => {
        window.gameData.coins -= frame.price;
        if (!window.gameData.ownedFrames) window.gameData.ownedFrames = [];
        window.gameData.ownedFrames.push(frame.id);
        window.gameData.avatarFrame = frame.id;
        playSound('snd-buy');
        try { confetti({ particleCount: 40, spread: 50 }); } catch (e) {}
        updateUI();
        saveData();
        renderShop('frames');
        showToast(`✅ تم شراء وتفعيل: ${frame.name}`);
      }
    });
  }
};

window.resetGame = () => {
  showConfirmDialog({
    icon: '🗑️', title: 'مسح البيانات', msg: 'سيتم تصفير كل شيء نهائياً\nهل أنت متأكد؟',
    okText: 'امسح كل شيء', okClass: 'danger',
    onOk: async () => {
      if (window.currentUser && window.db && window.firebaseReady) {
        try {
          await window.db_set(
            `artifacts/${window.appId}/users/${window.currentUser.uid}/profile/data`,
            { coins: 500, xp: 0, level: 1 }
          );
        } catch (e) { console.error(e); }
      }
      location.reload();
    }
  });
};

// دالة requestNotifPermission
window.requestNotifPermission = async () => {
  if (!("Notification" in window)) {
    showToast("❌ المتصفح لا يدعم الإشعارات");
    return;
  }
  const perm = await Notification.requestPermission();
  if (perm === "granted") {
    showToast("🔔 تم تفعيل الإشعارات!");
    const nb = document.getElementById("notif-btn");
    if (nb) {
      nb.innerText = "✅ الإشعارات مفعلة";
      nb.style.background = "rgba(34,197,94,.1)";
      nb.style.color = "#22c55e";
    }
    initSmartNotifications();
  } else {
    showToast("❌ تم رفض الإشعارات");
  }
};

// ══════════════════════════════════════════════════════════════════
//  SMART NOTIFICATIONS SYSTEM
//  نظام إشعارات ذكي — يراعي حالة اللاعب قبل ما يبعت أي إشعار
// ══════════════════════════════════════════════════════════════════

const NOTIF_ICON = "https://i.postimg.cc/qqTBP312/1000061201.png";

function sendNotification(title, body, tag = "general") {
  if (Notification.permission !== "granted") return;
  try {
    if (navigator.serviceWorker?.controller) {
      navigator.serviceWorker.ready.then(reg => {
        reg.showNotification(title, {
          body, icon: NOTIF_ICON, badge: NOTIF_ICON,
          dir: "rtl", lang: "ar",
          tag, renotify: true,
          vibrate: [150, 80, 150],
        }).catch(() => new Notification(title, { body, icon: NOTIF_ICON, tag }));
      });
    } else {
      new Notification(title, { body, icon: NOTIF_ICON, tag });
    }
  } catch (e) { console.warn("[Notif]", e); }
}

function getNextTime(hour, minute) {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  if (d <= new Date()) d.setDate(d.getDate() + 1);
  return d;
}

function getNextWeeklyTime(dayOfWeek, hour, minute) {
  const d    = new Date();
  const diff = (dayOfWeek - d.getDay() + 7) % 7 || 7;
  d.setDate(d.getDate() + diff);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function scheduleSmartNotifications() {
  const now    = new Date();
  const timers = window._notifTimers || [];

  // 1. تحدي اليوم — 8 مساءً
  timers.push(setTimeout(() => {
    const d    = window.gameData;
    const done = d?.dailyChallengeDate === new Date().toDateString();
    if (!done) {
      const streak = d?.loginStreak?.count || 0;
      const body = streak >= 3
        ? `🔥 سلسلتك ${streak} أيام! لا تكسرها — العب الآن!`
        : "📅 تحدي اليوم ينتظرك! العب وخد مكافأتك 🎁";
      sendNotification("شغل مخك 🧠", body, "daily-challenge");
    }
    timers.push(setTimeout(scheduleSmartNotifications, 24 * 60 * 60 * 1000));
  }, getNextTime(20, 0) - now));

  // 2. تحذير السلسلة — 10 مساءً
  timers.push(setTimeout(() => {
    const d      = window.gameData;
    const streak = d?.loginStreak?.count || 0;
    const done   = d?.dailyChallengeDate === new Date().toDateString();
    if (streak >= 3 && !done) {
      sendNotification(
        `⚡ سلسلتك ${streak} أيام في خطر!`,
        "عندك أقل من ساعتين — اللعب يستغرق دقيقتين فقط 🎮",
        "streak-warning"
      );
    }
  }, getNextTime(22, 0) - now));

  // 3. التحدي الأسبوعي — الجمعة 7 مساءً
  timers.push(setTimeout(() => {
    const wc    = window.gameData?.weeklyChallenge || {};
    const weekId = window.getWeekId?.() || "";
    if (!wc.completed || wc.weekId !== weekId) {
      sendNotification(
        "🏆 التحدي الأسبوعي ينتهي قريباً!",
        "تبقّى يومان فقط. العب وتنافس مع اللاعبين 💪",
        "weekly-challenge"
      );
    }
  }, getNextWeeklyTime(5, 19, 0) - now));

  // 4. عودة اللاعب بعد 48 ساعة غياب
  timers.push(setTimeout(() => {
    const last = window.gameData?.lastLoginDate;
    if (last) {
      const days = (Date.now() - new Date(last).getTime()) / 86400000;
      if (days >= 2) {
        const coins = window.gameData?.coins || 0;
        sendNotification(
          "مشتاقين ليك! 😢",
          `${coins} عملة بتنتظرك، وتحدي اليوم فاتك ${Math.floor(days)} أيام!`,
          "comeback"
        );
      }
    }
  }, 48 * 60 * 60 * 1000));

  window._notifTimers = timers;
}

function initSmartNotifications() {
  if (Notification.permission !== "granted") return;
  if (window._notifTimers) window._notifTimers.forEach(t => clearTimeout(t));
  window._notifTimers = [];
  scheduleSmartNotifications();
}
// backward compat
function scheduleNotification() { initSmartNotifications(); }

// ══════════════════════════════════════════════════════════════════
//  SAVE GAME SESSION — حفظ واستكمال الجولة
// ══════════════════════════════════════════════════════════════════

const SAVED_SESSION_KEY = "shaghel_saved_session_v1";

export function saveGameSession() {
  // لا تحفظ لو مش في جولة عادية
  if (window.isDailyChallenge || window.isRoomGame || window.isWeeklyChallenge) return;
  if (!window.currentQuestions?.length || window.currentIdx === 0) return;

  const session = {
    questions:  window.currentQuestions,
    idx:        window.currentIdx,
    correct:    window.quizCorrect    || 0,
    wrong:      window.quizWrong      || 0,
    coins:      window.quizCoins      || 0,
    xp:         window.quizXP         || 0,
    category:   window.selectedCategory || "",
    sub:        window.selectedSub    || "",
    savedAt:    Date.now(),
    uid:        window.currentUser?.uid || "anon",
  };
  try {
    localStorage.setItem(SAVED_SESSION_KEY, JSON.stringify(session));
  } catch (e) {}
}
window.saveGameSession = saveGameSession;

export function clearGameSession() {
  try { localStorage.removeItem(SAVED_SESSION_KEY); } catch (e) {}
}
window.clearGameSession = clearGameSession;

export function getSavedSession() {
  try {
    const raw = localStorage.getItem(SAVED_SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s.savedAt || Date.now() - s.savedAt > 24 * 60 * 60 * 1000) {
      clearGameSession();
      return null;
    }
    if (s.uid !== (window.currentUser?.uid || "anon")) {
      clearGameSession();
      return null;
    }
    if (!s.questions?.length || s.idx >= s.questions.length) {
      clearGameSession();
      return null;
    }
    return s;
  } catch (e) { return null; }
}

window.checkAndOfferResume = () => {
  const s = getSavedSession();
  if (!s) return;
  showConfirmDialog({
    icon:    "▶️",
    title:   "جولة محفوظة!",
    msg:     `${s.category} — ${s.sub}\nالسؤال ${s.idx + 1}/10\n✅ ${s.correct} | ❌ ${s.wrong}`,
    okText:  "استكمل",
    okClass: "ok",
    onOk: () => {
      // استرجاع الحالة
      window.currentQuestions   = s.questions;
      window.currentIdx         = s.idx;
      window.quizCorrect        = s.correct;
      window.quizWrong          = s.wrong;
      window.quizCoins          = s.coins;
      window.quizXP             = s.xp;
      window.selectedCategory   = s.category;
      window.selectedSub        = s.sub;
      window.isDailyChallenge   = false;
      window.isRoomGame         = false;
      window.isWeeklyChallenge  = false;
      clearGameSession();
      navTo("quiz");
      document.getElementById("q-cat-badge").innerText = `${s.category} • ${s.sub}`;
      showToast(`▶️ استكمال الجولة — السؤال ${s.idx + 1}/10`, 3000);
      window.showQuestion?.();
    },
  });
};

// ══════════════════════════════════════════════════════════════════
//  FRIEND RIVALRY — "صاحبك فاق عليك"
// ══════════════════════════════════════════════════════════════════

async function checkFriendRivalry() {
  const d = window.gameData;
  if (!d || !window.firebaseReady || !d.friends?.length) return;

  const knownXP = d._friendsLastXP || {};
  const myXP    = d.xp || 0;

  try {
    const { collection, getDocs } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js");
    const snap = await getDocs(
      collection(window.db, "artifacts", window.appId, "public", "data", "rankings")
    );
    const live = {};
    snap.forEach(doc => { const u = doc.data(); if (u.uid) live[u.uid] = u; });

    let biggestRival = null;
    let biggestDiff  = 0;

    for (const f of d.friends) {
      const u = live[f.uid];
      if (!u) continue;
      const liveXP = u.xp || 0;
      const prevXP = knownXP[f.uid] ?? liveXP;

      if (liveXP > myXP) {
        const diff = liveXP - myXP;
        if (diff > biggestDiff) {
          biggestDiff  = diff;
          biggestRival = { name: u.username || f.username, xp: liveXP, diff };
        }
      }

      // تجاوز جديد — كان خلفك وبقى قدامك
      const wasAhead = prevXP > myXP;
      const nowAhead = liveXP > myXP;
      if (!wasAhead && nowAhead && liveXP - myXP > 50) {
        const key       = `rival_notif_${f.uid}`;
        const lastShown = parseInt(localStorage.getItem(key) || "0");
        if (Date.now() - lastShown > 3 * 60 * 60 * 1000) {
          localStorage.setItem(key, String(Date.now()));
          setTimeout(() => {
            showToast(`😤 ${u.username || f.username} فاق عليك بـ ${liveXP - myXP} XP — رد عليه!`, 5000);
          }, 3000);
        }
      }
      knownXP[f.uid] = liveXP;
    }

    d._friendsLastXP = knownXP;

    // تحديث بانر المنافسة في الـ home
    const rivalEl = document.getElementById("home-rival-banner");
    if (rivalEl) {
      if (biggestRival) {
        rivalEl.style.display = "flex";
        const nameEl = document.getElementById("rival-name");
        const diffEl = document.getElementById("rival-diff");
        if (nameEl) nameEl.innerText = biggestRival.name;
        if (diffEl) diffEl.innerText = `+${biggestRival.diff.toLocaleString()} XP`;
      } else {
        rivalEl.style.display = "none";
      }
    }
  } catch (e) { /* silent */ }
}

// ══════════════════════════════════════════════════════════════════
// بدء التطبيق
// ══════════════════════════════════════════════════════════════════
(async () => {
  // ── PWA Shortcut Deep Links ──────────────────────────────────────
  // لما المستخدم يفتح من shortcut على الهاتف مثلاً ?shortcut=daily
  const params   = new URLSearchParams(window.location.search);
  const shortcut = params.get("shortcut");
  if (shortcut) {
    const screenMap = { daily: "daily", weekly: "weekly", map: "map", rooms: "rooms", stats: "stats" };
    const target = screenMap[shortcut];
    if (target) {
      // انتظر حتى يصبح navTo جاهزاً بعد init
      const tryNav = setInterval(() => {
        if (typeof window.navTo === "function") {
          clearInterval(tryNav);
          setTimeout(() => window.navTo(target), 1500);
        }
      }, 200);
      setTimeout(() => clearInterval(tryNav), 8000);
    }
  }

  await initAuth();
  listenToUserData();
  navTo("home");

  // بعد تحميل البيانات — تحقق من الإشعارات والمنافسة
  setTimeout(() => {
    if (Notification.permission === "granted") {
      initSmartNotifications();
      const nb = document.getElementById("notif-btn");
      if (nb) {
        nb.innerText = "✅ الإشعارات مفعلة";
        nb.style.background = "rgba(34,197,94,.1)";
        nb.style.color = "#22c55e";
      }
    }
    // فحص المنافسة مع الأصدقاء
    if (window.firebaseReady && window.gameData?.friends?.length) {
      checkFriendRivalry();
    }
  }, 3000);
})();

window.addEventListener("load", () => {
  console.log("🚀 شغل مخك Ultra 4.0");

  // ── Loading Screen ──────────────────────────────
  const ls = document.getElementById("loading-screen");
  if (ls) {
    const hide = () => { ls.style.opacity='0'; ls.style.pointerEvents='none'; setTimeout(()=>ls.style.display='none',520); };
    const t = setTimeout(hide, 2500);
    const c = setInterval(() => { if (window.firebaseReady||window.gameData){ clearInterval(c); clearTimeout(t); setTimeout(hide,600); } }, 100);
  }
});

// ══════════════════════════════════════════════════════
//  GAME MODES — أوضاع اللعب الـ 12
// ══════════════════════════════════════════════════════
const GAME_MODES = {
  popular: [
    { id:'classic',  title:'كلاسيكي',     desc:'10 أسئلة · 15 ثانية', icon:'fa-play',           color:'gm-blue',
      info:'الوضع الأساسي — 10 أسئلة، 15 ثانية لكل سؤال. مناسب لكل المستويات.' },
    { id:'blitz',    title:'البرق ⚡',     desc:'10 أسئلة · 7 ثواني',  icon:'fa-bolt',           color:'gm-orange',
      info:'الوقت 7 ثواني فقط! للاعب السريع الذي يثق بنفسه.' },
    { id:'hearts',   title:'القلوب ❤️',   desc:'3 أخطاء = انتهى',     icon:'fa-heart',          color:'gm-red',
      info:'3 قلوب فقط. كل خطأ يأخذ قلباً. انتهت القلوب = انتهت اللعبة!' },
    { id:'endless',  title:'لا نهاية ∞',  desc:'أسئلة بلا توقف',     icon:'fa-infinity',       color:'gm-green',
      info:'العب حتى تخطئ! الأسئلة تتجدد باستمرار.' },
  ],
  challenge: [
    { id:'perfect',   title:'الكمال ✨',   desc:'صفر أخطاء',           icon:'fa-crosshairs',     color:'gm-purple',
      info:'لا يُسمح بأي خطأ واحد! كل الأسئلة صح وإلا انتهت اللعبة فوراً.' },
    { id:'ascending', title:'التصاعد 📈', desc:'صعوبة تزيد',          icon:'fa-arrow-trend-up', color:'gm-yellow',
      info:'كل 3 صح تزيد الصعوبة والوقت يقل. المكافأة تتضاعف!' },
    { id:'sudden',    title:'ضربة واحدة', desc:'خياران فقط',          icon:'fa-scale-balanced', color:'gm-orange',
      info:'كل سؤال بخيارين فقط: صح أو خطأ! يبدو سهلاً؟ جرّب.' },
    { id:'memory',    title:'الذاكرة 🧠', desc:'تذكّر إجاباتك',       icon:'fa-brain',          color:'gm-blue',
      info:'إجاباتك السابقة تظهر كتلميح. اللاعب الذكي يستخدمها.' },
  ],
  custom: [
    { id:'easy',     title:'سهل 🌱',       desc:'5 أسئلة · 20 ثانية',  icon:'fa-seedling',            color:'gm-green',
      info:'للمبتدئين — 5 أسئلة بوقت أكثر.' },
    { id:'hard',     title:'صعب 🔥',       desc:'15 سؤالاً · 10 ثواني', icon:'fa-fire-flame-curved',   color:'gm-red',
      info:'15 سؤالاً بوقت أقل — للمحترف فقط!' },
    { id:'study',    title:'مذاكرة 📖',    desc:'مع شرح كل إجابة',     icon:'fa-book',                color:'gm-purple',
      info:'بعد كل إجابة يظهر شرح. للتعلم الحقيقي.' },
    { id:'marathon', title:'ماراثون 🏃',   desc:'20 سؤالاً متواصلاً',  icon:'fa-person-running',      color:'gm-yellow',
      info:'20 سؤالاً بدون توقف. مكافأة ضخمة في النهاية!' },
  ],
};

let _gmCat='', _gmSub='', _gmIcon='', _gmSelected=null;

window.openGameMode = (cat, sub, icon) => {
  _gmCat=cat; _gmSub=sub; _gmIcon=icon||'🎯'; _gmSelected=null;
  const s = id => document.getElementById(id);
  s('gm-cat-icon').innerText = _gmIcon;
  s('gm-cat-name').innerText = cat;
  s('gm-sub-name').innerText = sub;
  s('gm-info-box').style.display = 'none';
  s('gm-start-label').innerText = 'اختر وضعًا';
  s('gm-start-btn').style.cssText = 'opacity:.45;pointer-events:none';
  window.switchGameModeTab('popular');
  s('modal-gamemode').style.display = 'flex';
  document.body.style.overflow = 'hidden';
};

window.closeGameMode = () => {
  document.getElementById('modal-gamemode').style.display = 'none';
  document.body.style.overflow = '';
  _gmSelected = null;
};

window.switchGameModeTab = (tab) => {
  _gmSelected = null;
  document.getElementById('gm-info-box').style.display = 'none';
  document.getElementById('gm-start-label').innerText = 'اختر وضعًا';
  const btn = document.getElementById('gm-start-btn');
  btn.style.opacity = '.45'; btn.style.pointerEvents = 'none';

  document.querySelectorAll('.gm-tab').forEach(b => {
    const on = b.dataset.gmtab === tab;
    b.style.background  = on ? 'rgba(251,191,36,.14)' : 'rgba(255,255,255,.05)';
    b.style.color       = on ? 'var(--accent)'        : 'var(--text2)';
    b.style.borderColor = on ? 'rgba(251,191,36,.28)' : 'rgba(255,255,255,.08)';
  });

  const grid = document.getElementById('gm-modes-grid');
  grid.innerHTML = '';
  (GAME_MODES[tab]||[]).forEach(mode => {
    const c = document.createElement('div');
    c.className = `gm-card ${mode.color}`;
    c.dataset.modeId = mode.id;
    c.innerHTML = `<div class="gm-card-icon"><i class="fas ${mode.icon}"></i></div>
      <div class="gm-card-title">${mode.title}</div>
      <div class="gm-card-desc">${mode.desc}</div>`;
    c.onclick = () => _selectMode(mode);
    grid.appendChild(c);
  });
};

function _selectMode(mode) {
  _gmSelected = mode;
  document.querySelectorAll('.gm-card').forEach(c =>
    c.classList.toggle('selected', c.dataset.modeId === mode.id));
  document.getElementById('gm-info-text').innerText = mode.info;
  document.getElementById('gm-info-box').style.display = 'block';
  document.getElementById('gm-start-label').innerText = `ابدأ · ${mode.title}`;
  const btn = document.getElementById('gm-start-btn');
  btn.style.opacity='1'; btn.style.pointerEvents='auto';
}

window.launchSelectedMode = () => {
  if (!_gmSelected) return;
  const mode = _gmSelected;
  window.closeGameMode();

  // reset all flags
  window._gameModeId    = mode.id;
  window._modeBlitz     = mode.id === 'blitz';
  window._modeHearts    = mode.id === 'hearts'    ? 3   : null;
  window._modeEndless   = mode.id === 'endless';
  window._modePerfect   = mode.id === 'perfect';
  window._modeAscending = mode.id === 'ascending';
  window._modeSudden    = mode.id === 'sudden';
  window._modeMemory    = mode.id === 'memory';
  window._modeStudy     = mode.id === 'study';
  window._modeCustom    = mode.id === 'easy'      ? {questions:5,  time:20}
                        : mode.id === 'hard'      ? {questions:15, time:10}
                        : mode.id === 'marathon'  ? {questions:20, time:15}
                        : null;

  const badge = document.getElementById('q-mode-badge');
  if (badge) { badge.innerText=mode.title; badge.style.display='inline-flex'; }

  window.startQuiz(_gmCat, _gmSub, false);
};

// ══════════════════════════════════════════════════════
//  🎊 MINI CONFETTI — بدون library
// ══════════════════════════════════════════════════════
window._miniConfetti = () => {
  const canvas = document.getElementById('confetti-canvas');
  if (!canvas) return;
  canvas.style.display = 'block';
  const ctx = canvas.getContext('2d');
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  const colors  = ['#f97316','#fbbf24','#22c55e','#38bdf8','#a78bfa','#f43f5e'];
  const particles = Array.from({ length: 80 }, () => ({
    x    : Math.random() * canvas.width,
    y    : -10,
    r    : Math.random() * 6 + 3,
    color: colors[Math.floor(Math.random() * colors.length)],
    vx   : Math.random() * 4 - 2,
    vy   : Math.random() * 3 + 2,
    tilt : 0,
    tiltSpeed: Math.random() * .1 + .05,
    tiltAngle: 0,
  }));
  let frame = 0;
  const animate = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.tiltAngle += p.tiltSpeed;
      p.x += p.vx + Math.sin(p.tiltAngle) * .5;
      p.y += p.vy;
      p.tilt = Math.sin(p.tiltAngle) * 12;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, p.r, p.r * .4, p.tilt * Math.PI / 180, 0, 2 * Math.PI);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, 1 - frame / 120);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
    frame++;
    if (frame < 130) requestAnimationFrame(animate);
    else { canvas.style.display = 'none'; }
  };
  requestAnimationFrame(animate);
};

// ══════════════════════════════════════════════════════
//  ✨ FLOATING STARS — نجوم متحركة في الهوم
// ══════════════════════════════════════════════════════
function addFloatingStars() {
  const home  = document.getElementById('screen-home');
  if (!home) return;
  // Remove old stars first
  home.querySelectorAll('.floating-star').forEach(s => s.remove());
  const chars = ['✦','✧','⭑','⭒','★','✶'];
  for (let i = 0; i < 8; i++) {
    const s    = document.createElement('div');
    s.className = 'floating-star';
    s.innerText = chars[Math.floor(Math.random() * chars.length)];
    s.style.cssText = `
      left:${Math.random() * 90}%;
      top:${Math.random() * 80}%;
      animation-delay:${Math.random() * 3}s;
      animation-duration:${2.5 + Math.random() * 2}s;
      font-size:${8 + Math.random() * 8}px;
      color:rgba(249,115,22,${0.15 + Math.random() * 0.25});
      z-index:0;
    `;
    home.style.position = 'relative';
    home.insertBefore(s, home.firstChild);
  }
}

// ══════════════════════════════════════════════════════
//  📱 SWIPE NAVIGATION — سحب للتنقل بين الشاشات
// ══════════════════════════════════════════════════════
function initSwipeNavigation() {
  const navScreens = ['home', 'map', 'stats', 'daily', 'weekly'];
  let touchStartX  = 0;
  let touchStartY  = 0;

  document.addEventListener('touchstart', e => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  document.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = Math.abs(e.changedTouches[0].clientY - touchStartY);
    // Only horizontal swipes >= 80px, not too vertical
    if (Math.abs(dx) < 80 || dy > 60) return;
    // Don't interfere with open modals or sidebar
    if (document.querySelector('.m-overlay.open, .sidebar.open')) return;
    const activeEl  = document.querySelector('.screen.active');
    const activeId  = activeEl?.id?.replace('screen-', '');
    const idx       = navScreens.indexOf(activeId);
    if (idx === -1) return;
    if (dx < 0 && idx < navScreens.length - 1) window.navTo(navScreens[idx + 1]);
    if (dx > 0 && idx > 0)                      window.navTo(navScreens[idx - 1]);
  }, { passive: true });
}

// ══════════════════════════════════════════════════════
//  💥 RIPPLE EFFECT — موجة عند الضغط
// ══════════════════════════════════════════════════════
function initRippleEffect() {
  document.addEventListener('click', e => {
    const target = e.target.closest(
      '.btn-option, .btn-primary, .btn-secondary, .nav-link, .sb-nav-item, .sb-item'
    );
    if (!target) return;
    const ripple   = document.createElement('div');
    ripple.className = 'tap-ripple';
    const rect     = target.getBoundingClientRect();
    ripple.style.cssText = `left:${e.clientX - rect.left - 20}px;top:${e.clientY - rect.top - 20}px;`;
    target.style.position = target.style.position || 'relative';
    target.style.overflow  = 'hidden';
    target.appendChild(ripple);
    setTimeout(() => ripple.remove(), 420);
  });
}

// ══════════════════════════════════════════════════════
//  🏆 RANK BADGES — شارات الرتب
// ══════════════════════════════════════════════════════
window.getRankBadgeHTML = (rank) => {
  const rankMap = {
    'باحث عن المعرفة': { cls: 'rank-bronze',  icon: '🥉' },
    'متعلم نشيط':      { cls: 'rank-bronze',  icon: '🥉' },
    'مثقف':            { cls: 'rank-silver',  icon: '🥈' },
    'خبير':            { cls: 'rank-gold',    icon: '🥇' },
    'أستاذ':           { cls: 'rank-gold',    icon: '🏆' },
    'عبقري':           { cls: 'rank-plat',    icon: '💎' },
    'أسطورة':          { cls: 'rank-diamond', icon: '👑' },
  };
  const r = rankMap[rank] || { cls: 'rank-bronze', icon: '🎯' };
  return `<span class="rank-badge-pill ${r.cls}">${r.icon} ${rank || 'باحث'}</span>`;
};

// ══════════════════════════════════════════════════════
//  🎡 SPIN WHEEL — عجلة الحظ اليومية
// ══════════════════════════════════════════════════════
const SPIN_PRIZES = [
  { label: '+50 عملة',  coins: 50,  color: '#f97316' },
  { label: '+100 عملة', coins: 100, color: '#fbbf24' },
  { label: '+200 عملة', coins: 200, color: '#22c55e' },
  { label: '+500 عملة', coins: 500, color: '#38bdf8' },
  { label: '+20 عملة',  coins: 20,  color: '#a78bfa' },
  { label: '+150 عملة', coins: 150, color: '#f43f5e' },
  { label: '+300 عملة', coins: 300, color: '#f97316' },
  { label: '+75 عملة',  coins: 75,  color: '#fbbf24' },
];
let _spinRotation = 0;
let _spinning     = false;

function drawWheel(rotation = 0) {
  const canvas = document.getElementById('spin-canvas');
  if (!canvas) return;
  const ctx  = canvas.getContext('2d');
  const cx   = 130;
  const cy   = 130;
  const r    = 124;
  const arc  = (2 * Math.PI) / SPIN_PRIZES.length;
  ctx.clearRect(0, 0, 260, 260);
  SPIN_PRIZES.forEach((p, i) => {
    const start = rotation + i * arc - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, start, start + arc);
    ctx.closePath();
    ctx.fillStyle = i % 2 === 0 ? p.color + 'cc' : p.color + '88';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.12)';
    ctx.lineWidth   = 2;
    ctx.stroke();
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(start + arc / 2);
    ctx.fillStyle = '#fff';
    ctx.font      = 'bold 12px Tajawal,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(p.label, r * .65, 5);
    ctx.restore();
  });
  // Center circle
  ctx.beginPath();
  ctx.arc(cx, cy, 26, 0, 2 * Math.PI);
  ctx.fillStyle   = '#0e0e14';
  ctx.fill();
  ctx.strokeStyle = '#f97316';
  ctx.lineWidth   = 3;
  ctx.stroke();
}

window.openSpinWheel = () => {
  const lastSpin = parseInt(localStorage.getItem('shaghel_lastSpin') || '0');
  const now      = Date.now();
  const cooldown = document.getElementById('spin-cooldown');
  const btn      = document.getElementById('spin-btn');
  if (now - lastSpin < 24 * 60 * 60 * 1000) {
    const hrs = Math.ceil((24 * 60 * 60 * 1000 - (now - lastSpin)) / 3600000);
    if (cooldown) cooldown.innerText = `تعود الدورة بعد ${hrs} ساعة`;
    if (btn) { btn.disabled = true; btn.style.opacity = '.4'; }
  } else {
    if (cooldown) cooldown.innerText = '✨ دورة مجانية متاحة!';
    if (btn)      { btn.disabled = false; btn.style.opacity = '1'; }
  }
  openModal('spin');
  setTimeout(() => drawWheel(_spinRotation), 120);
};

window.spinWheel = () => {
  const lastSpin = parseInt(localStorage.getItem('shaghel_lastSpin') || '0');
  if (_spinning || Date.now() - lastSpin < 24 * 60 * 60 * 1000) return;
  _spinning = true;
  const btn      = document.getElementById('spin-btn');
  const resEl    = document.getElementById('spin-result');
  if (btn)   { btn.disabled = true; btn.style.opacity = '.5'; }
  if (resEl) resEl.innerText = '🎡 جاري الدوران...';

  const prizeIdx    = Math.floor(Math.random() * SPIN_PRIZES.length);
  const arc         = (2 * Math.PI) / SPIN_PRIZES.length;
  const targetAngle = (_spinRotation + 4 * Math.PI * 2) + (2 * Math.PI - prizeIdx * arc);
  const startRot    = _spinRotation;
  const duration    = 4000;
  const startTime   = Date.now();

  const animate = () => {
    const elapsed  = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const ease     = 1 - Math.pow(1 - progress, 4);
    _spinRotation  = startRot + (targetAngle - startRot) * ease;
    drawWheel(_spinRotation);
    if (progress < 1) { requestAnimationFrame(animate); return; }
    // Done
    const prize = SPIN_PRIZES[prizeIdx];
    _spinning   = false;
    localStorage.setItem('shaghel_lastSpin', Date.now().toString());
    window.gameData.coins = (window.gameData.coins || 0) + prize.coins;
    saveData();
    updateUI();
    if (resEl) resEl.innerText = `🎉 ربحت ${prize.label}!`;
    if (btn)   { btn.disabled = true; btn.style.opacity = '.4'; }
    const cooldown = document.getElementById('spin-cooldown');
    if (cooldown)  cooldown.innerText = 'تعود الدورة غداً!';
    showToast(`🎡 ربحت ${prize.label}!`, 3000);
    playSound?.('snd-win');
    window._miniConfetti?.();
  };
  requestAnimationFrame(animate);
};

// ══════════════════════════════════════════════════════
//  📊 PROGRESS CHART — رسم بياني للتقدم الأسبوعي
// ══════════════════════════════════════════════════════
window.openProgressChart = () => {
  openModal('progress');
  setTimeout(() => {
    const canvas = document.getElementById('progress-chart');
    if (!canvas) return;
    const ctx     = canvas.getContext('2d');
    const d       = window.gameData;
    const history = d?.detailedStats?.weeklyHistory || [0, 0, 0, 0, 0, 0, 0];
    const days    = ['سبت', 'أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة'];
    const W = canvas.width;
    const H = canvas.height;
    const pad = 32;
    const max = Math.max(...history, 1);

    ctx.clearRect(0, 0, W, H);

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,.06)';
    ctx.lineWidth   = 1;
    for (let i = 0; i <= 4; i++) {
      const y = pad + (H - 2 * pad) * i / 4;
      ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(W - pad, y); ctx.stroke();
    }

    // Data points
    const pts = history.map((v, i) => ({
      x: pad + (W - 2 * pad) * i / (history.length - 1),
      y: pad + (H - 2 * pad) * (1 - v / max),
    }));

    // Fill area
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    pts.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.lineTo(pts[pts.length - 1].x, H - pad);
    ctx.lineTo(pts[0].x, H - pad);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, pad, 0, H - pad);
    grad.addColorStop(0, 'rgba(249,115,22,.3)');
    grad.addColorStop(1, 'rgba(249,115,22,.0)');
    ctx.fillStyle = grad;
    ctx.fill();

    // Line
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    pts.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth   = 2.5;
    ctx.stroke();

    // Points + labels
    pts.forEach((p, i) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, 2 * Math.PI);
      ctx.fillStyle = '#f97316';
      ctx.fill();
      ctx.fillStyle   = 'rgba(255,255,255,.4)';
      ctx.font        = '9px Tajawal,sans-serif';
      ctx.textAlign   = 'center';
      ctx.fillText(days[i], p.x, H - 8);
      if (history[i] > 0) {
        ctx.fillStyle = '#fff';
        ctx.fillText(history[i], p.x, p.y - 10);
      }
    });

    // Stats below chart
    const statsEl = document.getElementById('progress-stats');
    if (statsEl) {
      const total = history.reduce((a, b) => a + b, 0);
      const best  = Math.max(...history);
      const avg   = Math.round(total / 7);
      statsEl.innerHTML = `
        <div style="background:rgba(249,115,22,.08);border:1px solid rgba(249,115,22,.2);
          border-radius:12px;padding:10px;text-align:center">
          <div style="font-size:20px;font-weight:900;color:#f97316">${total}</div>
          <div style="font-size:9px;color:rgba(255,255,255,.4)">مجموع الأسبوع</div>
        </div>
        <div style="background:rgba(34,197,94,.08);border:1px solid rgba(34,197,94,.2);
          border-radius:12px;padding:10px;text-align:center">
          <div style="font-size:20px;font-weight:900;color:#22c55e">${best}</div>
          <div style="font-size:9px;color:rgba(255,255,255,.4)">أفضل يوم</div>
        </div>
        <div style="background:rgba(56,189,248,.08);border:1px solid rgba(56,189,248,.2);
          border-radius:12px;padding:10px;text-align:center">
          <div style="font-size:20px;font-weight:900;color:#38bdf8">${avg}</div>
          <div style="font-size:9px;color:rgba(255,255,255,.4)">المعدل اليومي</div>
        </div>`;
    }
  }, 250);
};

// ══════════════════════════════════════════════════════
//  ⚔️ 1v1 CHALLENGE — تحدي صاحبك
// ══════════════════════════════════════════════════════
window.openFriendChallenge = () => {
  const list    = document.getElementById('friends-challenge-list');
  const friends = window.gameData?.friends || [];
  if (list) {
    if (!friends.length) {
      list.innerHTML = `<div style="text-align:center;color:rgba(255,255,255,.35);
        font-size:13px;padding:24px">أضف أصدقاء أولاً من خلال لوحة الصدارة</div>`;
    } else {
      list.innerHTML = friends.map(f => `
        <div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06);
          border-radius:14px;padding:12px 14px;display:flex;justify-content:space-between;
          align-items:center;margin-bottom:8px">
          <div>
            <div style="font-weight:900;font-size:14px;color:#fff">${f.username || 'لاعب'}</div>
            <div style="font-size:10px;color:rgba(255,255,255,.4)">مستوى ${f.level || 1}</div>
          </div>
          <button onclick="window.sendChallenge('${f.uid}')"
            style="background:linear-gradient(135deg,#f97316,#ea580c);color:#fff;border:none;
            border-radius:10px;padding:8px 14px;font-weight:900;font-size:12px;cursor:pointer;
            font-family:'Tajawal',sans-serif">
            <i class="fas fa-swords"></i> تحدي
          </button>
        </div>`).join('');
    }
  }
  openModal('challenge-friend');
};

window.sendChallenge = async (friendUid) => {
  const code = Math.random().toString(36).slice(2, 8).toUpperCase();
  try {
    await window.db_setDoc(
      `artifacts/${window.appId}/public/challenges/${code}`,
      { from: window.currentUser?.uid, fromName: window.gameData?.username || 'لاعب',
        to: friendUid, code, ts: Date.now(), status: 'pending' }
    );
    showToast(`✅ الكود: ${code} — تم النسخ!`, 4000);
    navigator.clipboard?.writeText(code).catch(() => {});
  } catch (e) {
    showToast('❌ فشل الإرسال', 2000);
  }
};

window.joinChallenge = async () => {
  const inp  = document.getElementById('challenge-code-input');
  const code = inp?.value?.trim().toUpperCase();
  if (!code) { showToast('أدخل الكود أولاً', 1500); return; }
  try {
    const snap = await window.db_get(`artifacts/${window.appId}/public/challenges/${code}`);
    if (!snap?.exists()) { showToast('❌ كود غير صحيح', 2000); return; }
    const data = snap.data();
    if (data.status !== 'pending') { showToast('⏰ التحدي منتهي', 2000); return; }
    closeModal('challenge-friend');
    showToast(`⚔️ تحدي مع ${data.fromName}!`, 2500);
    setTimeout(() => window.navTo('map'), 1500);
  } catch (e) {
    showToast('❌ خطأ في الاتصال', 2000);
  }
};

// ══════════════════════════════════════════════════════
//  📤 SHARE RESULT
// ══════════════════════════════════════════════════════
window.shareResult = async () => {
  const correct  = document.getElementById('res-correct')?.innerText || '0';
  const titleEl  = document.getElementById('result-title')?.innerText  || 'أحسنت!';
  const shareText = `🧠 شغل مخك!
أجبت ${correct} سؤال صح!
${titleEl}
العب معي: https://devmokh.github.io/shaghel-mokh/`;
  try {
    if (navigator.share) {
      await navigator.share({ title: 'شغل مخك 🧠', text: shareText });
    } else {
      await navigator.clipboard.writeText(shareText);
      showToast('✅ تم نسخ النتيجة!', 2000);
    }
  } catch (e) {}
};

// ══════════════════════════════════════════════════════
//  Init all design features on load
// ══════════════════════════════════════════════════════
window.addEventListener('load', () => {
  setTimeout(() => {
    addFloatingStars();
    initSwipeNavigation();
    initRippleEffect();
    console.log('[شغل مخك] Design features initialized ✅');
  }, 1800);
});

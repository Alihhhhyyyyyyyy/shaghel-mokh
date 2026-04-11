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
  const arrow = document.getElementById('settings-arrow');
  const dot = document.getElementById('settings-dot');
  const open = panel.classList.toggle('open');
  if (arrow) arrow.style.transform = open ? 'rotate(90deg)' : '';
  if (dot) dot.style.opacity = open ? '1' : '0';
};

window.toggleTheme = () => {
  window.gameData.theme = window.gameData.theme === 'dark' ? 'light' : 'dark';
  updateUI();
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
  console.log("🚀 شغل مخك Ultra 4.0 — تم تحميل التطبيق");
});

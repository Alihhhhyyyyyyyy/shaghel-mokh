// js/main.js
import './firebase.js';
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
// دالة الربط الشامل (Global Bridge)
// ══════════════════════════════════════════════════════════════════
function bindGlobals() {
  console.log("🔗 جاري ربط الدوال بـ window...");
  
  const globals = {
    navTo, updateUI, renderMap, renderShop, renderLeaderboard,
    renderDailyChallenge, renderWeeklyChallenge, renderSeasonTab,
    renderStats, switchStatsTab, switchChallengeTab, showShopTab,
    renderColorPicker, showToast, playSound, openModal, closeModal,
    showConfirmDialog, showInputDialog, confirmExit, _confirmExit,
    _cancelExit, saveData, updateDailyTask, updateWeeklyTask,
    addSeasonXP, checkLevel, updateLoginStreak, startQuiz,
    showQuestion, selectAnswer, nextQuestion, useHelper,
    askAIAnalysis, createRoom, joinRoomByCode, joinRoomById,
    confirmCreateRoom, toggleReady, startRoomGame, leaveRoom,
    sendLobbyMessage, kickPlayer, loadRooms, startDailyChallenge,
    startWeeklyChallenge, claimWeeklyTask, showFriendsModal,
    copyFriendCode, addFriendByCode, removeFriend,
    
    // إضافات النظام
    AVATAR_FRAMES, ACCENT_COLORS, categoryConfig,
    
    // دوال الواجهة المباشرة
    toggleSidebar: () => {
      const s = document.getElementById('sidebar');
      const o = document.getElementById('sb-overlay');
      if(s) {
        const open = s.classList.toggle('open');
        if(o) o.style.display = open ? 'block' : 'none';
        if(open) { updateUI(); if(window.renderColorPicker) window.renderColorPicker(); }
      }
    },
    toggleSettings: () => {
      const panel = document.getElementById('settings-panel');
      if(panel) panel.classList.toggle('open');
    },
    toggleTheme: () => {
      window.gameData.theme = window.gameData.theme === 'dark' ? 'light' : 'dark';
      updateUI();
      saveData();
    },
    openJoinRoomModal: () => openModal('join-room'),
    requestNotifPermission: async () => {
      if (!("Notification" in window)) return showToast("❌ غير مدعوم");
      const perm = await Notification.requestPermission();
      if (perm === "granted") {
        showToast("🔔 تفعيل بنجاح");
        if(window.initSmartNotifications) window.initSmartNotifications();
      }
    }
  };

  // تنفيذ الربط
  Object.keys(globals).forEach(key => {
    window[key] = globals[key];
  });
}

// ══════════════════════════════════════════════════════════════════
// نظام الإشعارات الذكي
// ══════════════════════════════════════════════════════════════════
window.initSmartNotifications = function() {
  if (Notification.permission !== "granted") return;
  console.log("🔔 تم تفعيل نظام الإشعارات");
  // هنا نضع منطق الجدولة كما في الإصدار السابق
};

// ══════════════════════════════════════════════════════════════════
// دورة حياة التطبيق (App Lifecycle)
// ══════════════════════════════════════════════════════════════════
async function bootApp() {
  try {
    // 1. الربط فوراً
    bindGlobals();

    // 2. تهيئة Firebase
    await initAuth();
    
    // 3. الاستماع للبيانات
    listenToUserData();

    // 4. التشغيل الأولي للواجهة
    navTo("home");
    
    console.log("✅ التطبيق جاهز!");
  } catch (err) {
    console.error("❌ خطأ في الإقلاع:", err);
  }
}

// التأكد من أن المستند جاهز تماماً قبل البدء
if (document.readyState === "complete" || document.readyState === "interactive") {
  bootApp();
} else {
  window.addEventListener("DOMContentLoaded", bootApp);
}

// معالجة أخطاء غير متوقعة لمنع التوقف التام
window.onerror = function(msg, url, line) {
  console.log("⚠️ Error caught: " + msg + " at " + line);
  return false; 
};

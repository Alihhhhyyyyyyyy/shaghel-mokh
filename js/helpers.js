// js/helpers.js
import { getCurrentSeason } from "./firebase.js";

// ─── TOAST (إشعارات منبثقة) ────────────────────────────────────────
export function showToast(msg, dur = 2800) {
  const c = document.getElementById("toast-container");
  if (!c) return;
  const el = document.createElement("div");
  el.className = "toast-msg";
  el.innerText = msg;
  c.appendChild(el);
  setTimeout(() => {
    el.classList.add("hide");
    setTimeout(() => el.remove(), 350);
  }, dur);
}
window.showToast = showToast;

// ══════════════════════════════════════════════════════════════════
//  SOUND ENGINE — Web Audio API
//  بيولّد الأصوات برمجياً بدون أي ملفات خارجية
//  المميزات: لا lag، يشتغل أوفلاين 100%، لا CORS، صوت نظيف ومختلف
// ══════════════════════════════════════════════════════════════════

let _audioCtx = null;

// نولّد الـ AudioContext بعد أول interaction عشان Chrome لا يكتمه
function getAudioCtx() {
  if (!_audioCtx) {
    try {
      _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      return null;
    }
  }
  // لو الـ context suspended (Chrome policy) — نعمله resume
  if (_audioCtx.state === "suspended") {
    _audioCtx.resume();
  }
  return _audioCtx;
}

/**
 * playTone — يعزف نغمة محددة بـ Web Audio API
 * @param {number} freq        - التردد بالـ Hz
 * @param {number} duration    - المدة بالثواني
 * @param {string} type        - نوع الموجة: sine / square / sawtooth / triangle
 * @param {number} gainStart   - مستوى الصوت الابتدائي (0-1)
 * @param {number} gainEnd     - مستوى الصوت النهائي (0-1) للـ fade out
 * @param {number} delay       - تأخير البداية بالثواني
 */
function playTone(freq, duration, type = "sine", gainStart = 0.4, gainEnd = 0, delay = 0) {
  const ctx = getAudioCtx();
  if (!ctx) return;

  const oscillator = ctx.createOscillator();
  const gainNode   = ctx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(freq, ctx.currentTime + delay);

  gainNode.gain.setValueAtTime(gainStart, ctx.currentTime + delay);
  gainNode.gain.exponentialRampToValueAtTime(
    Math.max(gainEnd, 0.001),
    ctx.currentTime + delay + duration
  );

  oscillator.start(ctx.currentTime + delay);
  oscillator.stop(ctx.currentTime + delay + duration);
}

// ── تعريف كل الأصوات ─────────────────────────────────────────────

const SOUNDS = {

  // ✅ صح — 3 نغمات تصاعدية مبهجة (Do-Mi-Sol) + shimmer خفيف
  // واضح 100% إنه إيجابي ومختلف تماماً عن الخطأ
  "snd-correct": () => {
    playTone(523.25, 0.10, "sine", 0.35, 0.10, 0.00);  // C5
    playTone(659.25, 0.10, "sine", 0.35, 0.10, 0.08);  // E5
    playTone(783.99, 0.18, "sine", 0.40, 0.00, 0.16);  // G5
    playTone(1046.5, 0.12, "sine", 0.15, 0.00, 0.16);  // C6 shimmer خفيف
  },

  // ❌ غلط — buzz مزدوج هابط واضح + thud أرضي
  // مستحيل يتشابه مع صوت الصح
  "snd-wrong": () => {
    playTone(220, 0.08, "square", 0.30, 0.05, 0.00);
    playTone(180, 0.08, "square", 0.30, 0.05, 0.06);
    playTone(140, 0.15, "square", 0.25, 0.00, 0.12);
    playTone(80,  0.20, "sine",   0.20, 0.00, 0.10);  // thud أرضي
  },

  // 🏆 فوز — fanfare احتفالي كامل بطبقتين
  "snd-win": () => {
    playTone(523.25, 0.12, "sine",     0.35, 0.10, 0.00);   // C5
    playTone(659.25, 0.12, "sine",     0.35, 0.10, 0.10);   // E5
    playTone(783.99, 0.12, "sine",     0.35, 0.10, 0.20);   // G5
    playTone(1046.5, 0.25, "sine",     0.40, 0.00, 0.30);   // C6
    playTone(261.63, 0.40, "triangle", 0.20, 0.00, 0.30);   // C4 depth
    playTone(1318.5, 0.30, "sine",     0.25, 0.00, 0.50);   // E6 finale
  },

  // ⬆️ ارتفاع مستوى — نشيد تصاعدي G→B→D→F→A + نغمة نهائية
  "snd-level": () => {
    const notes = [392, 494, 587, 698, 880];
    notes.forEach((freq, i) => {
      playTone(freq, 0.14, "sine", 0.30, 0.05, i * 0.09);
    });
    playTone(1174.66, 0.40, "sine",     0.35, 0.00, 0.45);
    playTone(587.33,  0.40, "triangle", 0.15, 0.00, 0.45);
  },

  // ⏰ انتهى الوقت — 3 نبضات سريعة هابطة + صدى
  "snd-timeout": () => {
    playTone(440, 0.08, "square", 0.35, 0.05, 0.00);
    playTone(370, 0.08, "square", 0.35, 0.05, 0.10);
    playTone(311, 0.20, "square", 0.30, 0.00, 0.20);
    playTone(220, 0.30, "sine",   0.15, 0.00, 0.20);
  },

  // 💰 شراء — نغمة عملة ثلاثية صاعدة سريعة
  "snd-buy": () => {
    playTone(1046.5, 0.06, "sine", 0.30, 0.05, 0.00);
    playTone(1318.5, 0.06, "sine", 0.30, 0.05, 0.06);
    playTone(1568.0, 0.15, "sine", 0.30, 0.00, 0.12);
  },

  // ⚠️ تحذير — 3 نبضات تحذيرية A5
  "snd-warn": () => {
    [0, 0.18, 0.36].forEach(delay => {
      playTone(880, 0.10, "sine", 0.28, 0.02, delay);
    });
  },

};

/**
 * playSound — الدالة العامة المستخدمة في كل مكان في الكود
 * تحافظ على نفس الـ interface القديم (playSound('snd-correct'))
 */
export function playSound(id) {
  if (window.gameData?.soundEnabled === false) return;
  const soundFn = SOUNDS[id];
  if (!soundFn) {
    console.warn("[Sound] Unknown sound ID:", id);
    return;
  }
  try {
    soundFn();
  } catch (e) {
    console.warn("[Sound] Error playing:", id, e);
  }
}
window.playSound = playSound;

// ─── MODALS (النوافذ المنبثقة) ────────────────────────────────────────
export function openModal(type) {
  const modal = document.getElementById(`modal-${type}`);
  if (modal) {
    modal.classList.add("active");
    document.body.style.overflow = "hidden";
  }
}
window.openModal = openModal;

export function closeModal(type) {
  const modal = document.getElementById(`modal-${type}`);
  if (modal) {
    modal.classList.remove("active");
    document.body.style.overflow = "";
  }
}
window.closeModal = closeModal;

// ─── CONFIRM DIALOG (حوار التأكيد) ────────────────────────────────────────────────
let _confirmResolve = null;
export function showConfirmDialog(opts) {
  const modal = document.getElementById("cmod-confirm");
  document.getElementById("cmod-ico").innerText = opts.icon || "⚠️";
  document.getElementById("cmod-ttl").innerText = opts.title || "هل أنت متأكد؟";
  document.getElementById("cmod-msg").innerText = opts.msg || "";
  const btn = document.getElementById("cmod-yes");
  btn.innerText = opts.okText || "تأكيد";
  btn.className = `cmod-btn ${opts.okClass || "danger"}`;
  btn.onclick = () => {
    modal.classList.remove("active");
    if (opts.onOk) opts.onOk();
  };
  modal.classList.add("active");
}
window.showConfirmDialog = showConfirmDialog;

export function cancelConfirm() {
  document.getElementById("cmod-confirm")?.classList.remove("active");
}
window._cancelConfirm = cancelConfirm;

// ─── INPUT DIALOG (حوار إدخال النص) ──────────────────────────────────────────────────
let _inputResolve = null;
export function showInputDialog(def = "") {
  return new Promise((resolve) => {
    _inputResolve = resolve;
    const modal = document.getElementById("cmod-input");
    const field = document.getElementById("cmod-inp-field");
    const hint = document.getElementById("cmod-inp-hint");
    field.value = def;
    hint.innerText = `${def.length} / 15 حرف`;
    modal.classList.add("active");
    setTimeout(() => field.focus(), 350);
  });
}
window.showInputDialog = showInputDialog;

export function confirmInput() {
  const field = document.getElementById("cmod-inp-field");
  const val = field.value.trim();
  document.getElementById("cmod-input").classList.remove("active");
  if (_inputResolve) {
    _inputResolve(val);
    _inputResolve = null;
  }
}
window._confirmInput = confirmInput;

export function cancelInput() {
  document.getElementById("cmod-input").classList.remove("active");
  if (_inputResolve) {
    _inputResolve(null);
    _inputResolve = null;
  }
}
window._cancelInput = cancelInput;

// ─── EXIT CONFIRM (تأكيد الخروج من الجولة) ──────────────────────────────────────────────────
export function confirmExit() {
  document.getElementById("cmod-exit").classList.add("active");
}
window.confirmExit = confirmExit;

export function _confirmExit() {
  document.getElementById("cmod-exit").classList.remove("active");
  if (window.timerInterval) clearInterval(window.timerInterval);
  window.navTo("map");
}
window._confirmExit = _confirmExit;

export function _cancelExit() {
  document.getElementById("cmod-exit").classList.remove("active");
}
window._cancelExit = _cancelExit;

// ─── ESCAPE HTML (للأمان في الدردشة) ───────────────────────────────────────────────────
export function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// ─── OFFLINE SAVE QUEUE (حفظ البيانات في حالة الأوفلاين) ────────────────────────────────────────────
const OFFLINE_QUEUE_KEY = "shaghel_offline_queue";

export function queueOfflineSave(data) {
  try {
    const queue = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || "[]");
    queue.push({ data, ts: Date.now() });
    const trimmed = queue.slice(-3);
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(trimmed));
  } catch (e) {}
}
window.queueOfflineSave = queueOfflineSave;

export async function syncOfflineQueue() {
  if (!window.firebaseReady || !window.currentUser) return;
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    if (!raw) return;
    const queue = JSON.parse(raw);
    if (!queue.length) return;
    const last = queue[queue.length - 1];
    await window.db_set(
      `artifacts/${window.appId}/users/${window.currentUser.uid}/profile/data`,
      last.data,
      { merge: true }
    );
    localStorage.removeItem(OFFLINE_QUEUE_KEY);
    console.log("[Offline] Synced queued save ✅");
  } catch (e) {
    console.warn("[Offline] Sync failed:", e);
  }
}
window.syncOfflineQueue = syncOfflineQueue;

window.addEventListener("online", () => {
  setTimeout(syncOfflineQueue, 2000);
});


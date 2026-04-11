// js/friends.js
import { showToast, playSound } from './helpers.js';
import { saveData, checkLevel } from './data.js';
import { updateUI } from './ui.js';
import { db, APP_ID } from './firebase.js';
import {
  collection,
  getDocs,
  query,
  where,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// ══════════════════════════════════════════════════════════════════
// توليد كود الصديق من معرف المستخدم
// ══════════════════════════════════════════════════════════════════
function generateFriendCode(uid) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[uid.charCodeAt(i % uid.length) % chars.length];
  }
  return code;
}

// ══════════════════════════════════════════════════════════════════
// عرض نافذة الأصدقاء
// ══════════════════════════════════════════════════════════════════
export function showFriendsModal() {
  const uid = window.currentUser?.uid;
  if (!uid) {
    showToast('❌ يلزم تسجيل الدخول');
    return;
  }
  const code = generateFriendCode(uid);
  window.gameData.friendCode = code;

  const codeEl = document.getElementById('my-friend-code');
  if (codeEl) codeEl.innerText = code;

  renderFriendsList();
  document.getElementById('modal-friends')?.classList.add('active');
  document.body.style.overflow = 'hidden';
}
window.showFriendsModal = showFriendsModal;

// ══════════════════════════════════════════════════════════════════
// مشاركة كود الصديق — Web Share API أو نسخ للـ clipboard
// ══════════════════════════════════════════════════════════════════
export async function copyFriendCode() {
  const code = window.gameData.friendCode || generateFriendCode(window.currentUser?.uid || 'x');
  const shareText = `📲 تعال العب معي في شغل مخك!\nكودي: ${code}\n🧠 انضم الآن وتنافس!`;

  if (navigator.share) {
    try {
      await navigator.share({ title: 'شغل مخك 🧠', text: shareText });
      return;
    } catch (e) {
      // المستخدم ألغى — نرجع للـ clipboard
    }
  }

  try {
    await navigator.clipboard.writeText(shareText);
    showToast('📋 تم نسخ الكود: ' + code);
  } catch (e) {
    showToast('كودك: ' + code, 5000);
  }
}
window.copyFriendCode = copyFriendCode;

// ══════════════════════════════════════════════════════════════════
// إضافة صديق عن طريق الكود
// ══════════════════════════════════════════════════════════════════
export async function addFriendByCode() {
  const inputEl = document.getElementById('friend-code-input');
  const inputCode = inputEl?.value.trim().toUpperCase();

  if (!inputCode || inputCode.length < 6) {
    showToast('❌ أدخل الكود الصحيح (6 أحرف)');
    return;
  }
  if (!window.firebaseReady) {
    showToast('❌ يلزم اتصال بالإنترنت');
    return;
  }

  const myCode = generateFriendCode(window.currentUser.uid);
  if (inputCode === myCode) {
    showToast('😄 ده كودك أنت!');
    return;
  }

  // أظهر حالة التحميل
  const addBtn = document.getElementById('btn-add-friend');
  if (addBtn) { addBtn.disabled = true; addBtn.innerText = '⏳'; }

  try {
    const snap = await getDocs(
      collection(db, 'artifacts', APP_ID, 'public', 'data', 'rankings')
    );
    let found = null;
    snap.forEach(d => {
      const u = d.data();
      if (generateFriendCode(u.uid || d.id) === inputCode) {
        found = { ...u, uid: u.uid || d.id };
      }
    });

    if (!found) {
      showToast('❌ لم يتم العثور على هذا اللاعب');
      return;
    }

    if (!window.gameData.friends) window.gameData.friends = [];
    const already = window.gameData.friends.some(f => f.uid === found.uid);
    if (already) {
      showToast('👥 هذا الشخص صديقك بالفعل!');
      return;
    }

    window.gameData.friends.push({
      uid:      found.uid,
      username: found.username,
      level:    found.level    || 1,
      xp:       found.xp       || 0,
      avatar:   found.avatar   || '',
      addedAt:  Date.now(),
    });

    // ── فحص إنجاز إضافة 3 أصدقاء ──
    const friendsCount = window.gameData.friends.length;
    if (friendsCount >= 3) {
      const ach = window.gameData.achievements?.find(a => a.id === 'friend_3');
      if (ach && !ach.earned) {
        ach.earned = true;
        setTimeout(() => showToast('🤝 إنجاز: 3 أصدقاء!', 4000), 600);
      }
    }

    saveData();
    renderFriendsList();
    if (inputEl) inputEl.value = '';
    showToast(`✅ أضفت ${found.username} كصديق! 🎉`);
    try { confetti({ particleCount: 50, spread: 60 }); } catch (e) {}

  } catch (e) {
    showToast('❌ خطأ: ' + e.message);
  } finally {
    if (addBtn) { addBtn.disabled = false; addBtn.innerText = 'إضافة'; }
  }
}
window.addFriendByCode = addFriendByCode;

// ══════════════════════════════════════════════════════════════════
// رسم قائمة الأصدقاء مع المقارنة بـ XP
// ══════════════════════════════════════════════════════════════════
async function renderFriendsList() {
  const list = document.getElementById('friends-list');
  if (!list) return;

  const friends = window.gameData.friends || [];
  if (!friends.length) {
    list.innerHTML = `<div style="text-align:center;padding:28px 16px;color:var(--text2)">
      <div style="font-size:44px;margin-bottom:12px">👥</div>
      <div style="font-weight:900;font-size:14px;margin-bottom:6px">لا يوجد أصدقاء بعد</div>
      <div style="font-size:12px;opacity:.6">شارك كودك مع أصحابك وابدأ التنافس!</div>
    </div>`;
    return;
  }

  // اعرض القائمة الأساسية أولاً بسرعة
  _renderFriendsBasic(list, friends);

  // ثم حدّث البيانات الحية من Firebase في الخلفية
  if (!window.firebaseReady) return;
  try {
    const snap = await getDocs(
      collection(db, 'artifacts', APP_ID, 'public', 'data', 'rankings')
    );
    const liveData = {};
    snap.forEach(d => { const u = d.data(); if (u.uid) liveData[u.uid] = u; });

    let changed = false;
    window.gameData.friends.forEach(f => {
      const live = liveData[f.uid];
      if (live) {
        if (live.xp !== f.xp || live.level !== f.level) {
          f.xp     = live.xp     || f.xp;
          f.level  = live.level  || f.level;
          f.avatar = live.avatar || f.avatar;
          changed  = true;
        }
      }
    });

    if (changed) {
      saveData();
      _renderFriendsBasic(list, window.gameData.friends);
    }
  } catch (e) { /* silent */ }
}

function _renderFriendsBasic(list, friends) {
  const myXP  = window.gameData.xp || 0;
  const sorted = [...friends].sort((a, b) => (b.xp || 0) - (a.xp || 0));

  list.innerHTML = sorted.map((f, i) => {
    const fXP    = f.xp || 0;
    const isAhead = fXP > myXP;
    const diff    = Math.abs(fXP - myXP);

    const diffBadge = isAhead
      ? `<span style="color:#ef4444;font-size:10px;font-weight:900">↑ ${diff.toLocaleString()} XP أمامك</span>`
      : diff > 0
        ? `<span style="color:#22c55e;font-size:10px;font-weight:900">↓ ${diff.toLocaleString()} XP خلفك</span>`
        : `<span style="color:var(--accent);font-size:10px;font-weight:900">🤝 متعادلان</span>`;

    const initials = (f.username || '؟').slice(0, 2);

    return `<div style="background:var(--card);border:1px solid rgba(255,255,255,.06);
      border-radius:18px;padding:13px 15px;margin-bottom:8px;
      display:flex;align-items:center;gap:11px">
      <!-- رقم الترتيب -->
      <div style="width:22px;font-size:11px;font-weight:900;
        color:var(--accent);text-align:center;flex-shrink:0">${i + 1}</div>
      <!-- أفاتار -->
      <div style="width:42px;height:42px;border-radius:13px;flex-shrink:0;
        background:rgba(251,191,36,.08);border:2px solid rgba(251,191,36,.2);
        display:flex;align-items:center;justify-content:center;
        font-size:15px;font-weight:900;color:var(--accent);
        font-family:'Tajawal',sans-serif">${initials}</div>
      <!-- بيانات -->
      <div style="flex:1;min-width:0">
        <div style="font-weight:900;font-size:13px;color:#fff;
          white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
          ${f.username || 'لاعب'}
        </div>
        <div style="display:flex;align-items:center;gap:6px;margin-top:2px">
          <span style="font-size:10px;font-weight:700;color:var(--text2)">
            مستوى ${f.level || 1}
          </span>
          <span style="color:rgba(255,255,255,.15);font-size:10px">·</span>
          ${diffBadge}
        </div>
      </div>
      <!-- زر الإزالة -->
      <button onclick="window.removeFriend('${f.uid}')"
        style="background:rgba(239,68,68,.07);color:#ef4444;
        border:1px solid rgba(239,68,68,.15);border-radius:10px;
        padding:6px 11px;font-size:11px;font-weight:900;cursor:pointer;
        font-family:'Tajawal',sans-serif;flex-shrink:0">✕</button>
    </div>`;
  }).join('');
}

// ══════════════════════════════════════════════════════════════════
// إزالة صديق
// ══════════════════════════════════════════════════════════════════
export function removeFriend(uid) {
  window.gameData.friends = (window.gameData.friends || []).filter(f => f.uid !== uid);
  saveData();
  renderFriendsList();
  showToast('تم إزالة الصديق');
}
window.removeFriend = removeFriend;


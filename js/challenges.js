
// js/challenges.js
import { showToast, playSound } from './helpers.js';
import { startQuiz } from './quiz.js';
import { navTo, updateUI } from './ui.js';
import { db, APP_ID, getCurrentSeason, getWeekId } from './firebase.js';
import { saveData, getSeasonRank, getSeasonProgress, addSeasonXP } from './data.js';
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  setDoc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// ── تصنيفات اللعبة الكاملة — يشمل الـ 4 المحلية الجديدة ──────────
// ملاحظة: يُستخدم محلياً هنا فقط للـ seed، البيانات الحقيقية في data.js
const categoryConfig = {
  islamic: { name: "إسلاميات",        subs: ["قصص الأنبياء", "القرآن الكريم", "السيرة النبوية", "الفقه الميسر"] },
  egypt:   { name: "تاريخ مصر",       subs: ["الفراعنة", "مصر الحديثة", "آثار النوبة", "ثورات مصر"] },
  tech:    { name: "تقنية",           subs: ["برمجة", "ذكاء اصطناعي", "أمن سيبراني", "تاريخ الحواسيب"] },
  science: { name: "علوم وفضاء",      subs: ["الفضاء", "جسم الإنسان", "الكيمياء", "الفيزياء الكمية"] },
  geo:     { name: "جغرافيا",         subs: ["عواصم", "أعلام", "عجائب الدنيا", "تضاريس الأرض"] },
  sports:  { name: "رياضة",           subs: ["كرة قدم", "أساطير", "الأولمبياد", "كأس العالم"] },
  puzzles: { name: "ألغاز",           subs: ["منطق", "أحجيات", "رياضيات", "ذكاء بصري"] },
  food:    { name: "طعام",            subs: ["أطباق عالمية", "حلويات", "توابل", "فواكه نادرة"] },
  // ── التصنيفات المحلية الجديدة ──────────────────────────────────
  cairo:   { name: "أحياء القاهرة",   subs: ["وسط البلد", "المعادي والزمالك", "الإسكندرية", "مدن جديدة"] },
  words:   { name: "كلمات مصرية",     subs: ["أمثال شعبية", "كلمات قبطية", "عامية قديمة", "ألقاب ومسميات"] },
  music:   { name: "موسيقى وأغاني",   subs: ["أغاني الزمن الجميل", "فيروز وأم كلثوم", "نجوم الـ 80s", "مهرجانات"] },
  cinema:  { name: "سينما وتليفزيون", subs: ["أفلام الـ 90s", "نجوم الشاشة", "مسلسلات رمضان", "كلاكيت زمان"] },
};

// قائمة التصنيفات والأقسام الكاملة — بتُستخدم في الـ seed للاختيار اليومي والأسبوعي
const ALL_CATS      = Object.keys(categoryConfig);
const ALL_CATS_SUBS = Object.fromEntries(
  ALL_CATS.map(key => [categoryConfig[key].name, categoryConfig[key].subs])
);

// أسئلة احتياطية عامة
const FALLBACK = [
  { t: "ما عاصمة مصر؟", a: ["الإسكندرية", "القاهرة", "أسوان", "الجيزة"], c: 1, x: "القاهرة عاصمة مصر وأكبر مدنها" },
  { t: "كم عدد أركان الإسلام؟", a: ["3", "4", "5", "6"], c: 2, x: "أركان الإسلام الخمسة: الشهادتان، الصلاة، الزكاة، الصوم، الحج" },
  { t: "أكبر كوكب في المجموعة الشمسية؟", a: ["زحل", "المشتري", "أورانوس", "نبتون"], c: 1, x: "المشتري أكبر كوكب، حجمه أكثر من 1300 مرة حجم الأرض" },
  { t: "من اخترع الهاتف؟", a: ["إديسون", "فاراداي", "غراهام بيل", "نيوتن"], c: 2, x: "اخترع غراهام بيل الهاتف عام 1876" },
  { t: "ما اختصار CPU؟", a: ["Control Power Unit", "Central Processing Unit", "Computer Power Unit", "Core Processing Unit"], c: 1, x: "CPU هي وحدة المعالجة المركزية" },
  { t: "كم يوماً في السنة الكبيسة؟", a: ["364", "365", "366", "367"], c: 2, x: "السنة الكبيسة تحتوي 366 يوماً" },
  { t: "أعمق محيطات العالم؟", a: ["الهندي", "الأطلسي", "المتجمد الشمالي", "الهادئ"], c: 3, x: "المحيط الهادئ هو الأكبر والأعمق" },
  { t: "من رسم الموناليزا؟", a: ["ميكيلانجيلو", "رافاييل", "ليوناردو دافينشي", "بيكاسو"], c: 2, x: "رسمها ليوناردو دافينشي بين 1503-1519" },
  { t: "كم سورة في القرآن الكريم؟", a: ["110", "112", "114", "116"], c: 2, x: "القرآن الكريم يتكون من 114 سورة" },
  { t: "أطول نهر في العالم؟", a: ["الأمازون", "النيل", "المسيسيبي", "الفولغا"], c: 1, x: "نهر النيل في أفريقيا هو الأطول بطول 6650 كم" },
];

// ══════════════════════════════════════════════════════════════════
// تحدي اليوم
// ══════════════════════════════════════════════════════════════════
export async function startDailyChallenge() {
  document.getElementById('q-cat-badge').innerText = '📅 تحدي اليوم';
  let pool = [];

  if (window.firebaseReady) {
    // ── seed بناءً على اليوم — نفس الاختيار لكل اللاعبين ──
    const today    = new Date().toISOString().slice(0, 10);
    const seed     = today.split('-').reduce((a, b) => a + parseInt(b), 0);
    const catKeys  = ALL_CATS;
    const pickedKey  = catKeys[seed % catKeys.length];
    const pickedName = categoryConfig[pickedKey].name;
    const pickedSubs = categoryConfig[pickedKey].subs;
    const pickedSub  = pickedSubs[seed % pickedSubs.length];

    try {
      const q = query(
        collection(db, 'artifacts', APP_ID, 'public', 'data', 'questions'),
        where('category',    '==', pickedName),
        where('subCategory', '==', pickedSub)
      );
      const snap = await getDocs(q);
      snap.forEach(d => pool.push(d.data()));
    } catch (e) {
      console.warn('Daily fetch:', e);
    }
  }

  if (!pool.length) pool = FALLBACK.slice();
  const today = new Date().toISOString().slice(0, 10);
  const seed = today.split('-').join('');
  const seeded = [...pool].sort((a, b) => {
    const ha = (parseInt(seed + a.t?.slice(0, 2) || '0', 36) || 1) % 100;
    const hb = (parseInt(seed + b.t?.slice(0, 2) || '0', 36) || 1) % 100;
    return ha - hb;
  }).slice(0, 10);
  window.currentQuestions = seeded;
  window.currentIdx = 0;
  window.quizCorrect = 0;
  window.quizWrong = 0;
  window.quizCoins = 0;
  window.quizXP = 0;
  window.isDailyChallenge = true;
  window.isRoomGame = false;
  window.selectedCategory = 'تحدي اليوم';
  window.selectedSub = 'عام';
  navTo('quiz');
  window.showQuestion();
}
window.startDailyChallenge = startDailyChallenge;

export async function renderDailyChallenge() {
  if (window._dailyCountdownInterval) clearInterval(window._dailyCountdownInterval);
  window._dailyCountdownInterval = setInterval(() => {
    const el = document.getElementById('daily-countdown-timer');
    if (!el) {
      clearInterval(window._dailyCountdownInterval);
      return;
    }
    const now = new Date();
    const mid = new Date(now);
    mid.setHours(24, 0, 0, 0);
    const diff = mid - now;
    el.innerText = String(Math.floor(diff / 3600000)).padStart(2, '0') + ':' +
                   String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0') + ':' +
                   String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
  }, 1000);

  const today = new Date().toDateString();
  const todayISO = new Date().toISOString().slice(0, 10);
  const d = window.gameData;
  const done = d.dailyChallengeDate === today;
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
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
        let rows = [];
        snap.forEach(d => rows.push(d.data()));
        rows.sort((a, b) => b.score - a.score);
        if (!rows.length) {
          ldr.innerHTML = '<p style="text-align:center;opacity:.4;padding:20px;font-weight:700">لا يوجد لاعبون بعد — كن الأول!</p>';
          return;
        }
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
      } catch (e) {
        ldr.innerHTML = '<p style="text-align:center;opacity:.4;padding:20px;font-weight:700">فشل التحميل</p>';
      }
    }
  }
}
window.renderDailyChallenge = renderDailyChallenge;

// ══════════════════════════════════════════════════════════════════
// التحدي الأسبوعي
// ══════════════════════════════════════════════════════════════════
export async function startWeeklyChallenge() {
  const weekId = getWeekId();
  document.getElementById('q-cat-badge').innerText = `🏆 أسبوع ${weekId}`;
  let pool = [];

  if (window.firebaseReady) {
    // ── seed بناءً على رقم الأسبوع — نفس الاختيار لكل اللاعبين ──
    const seed       = weekId.split('-').reduce((a, b) => a + (parseInt(b) || 0), 0);
    const catKeys    = ALL_CATS;
    const pickedKey  = catKeys[seed % catKeys.length];
    const pickedName = categoryConfig[pickedKey].name;
    const pickedSubs = categoryConfig[pickedKey].subs;
    const pickedSub  = pickedSubs[seed % pickedSubs.length];

    try {
      const q = query(
        collection(db, 'artifacts', APP_ID, 'public', 'data', 'questions'),
        where('category',    '==', pickedName),
        where('subCategory', '==', pickedSub)
      );
      const snap = await getDocs(q);
      snap.forEach(d => pool.push(d.data()));
    } catch (e) {
      console.warn('Weekly fetch:', e);
    }
  }

  if (!pool.length) pool = FALLBACK.slice();
  const weekSeed = getWeekId().split('-').join('');
  const seeded = [...pool].sort((a, b) => {
    const ha = (parseInt(weekSeed + a.t?.slice(0, 2) || '0', 36) || 1) % 100;
    const hb = (parseInt(weekSeed + b.t?.slice(0, 2) || '0', 36) || 1) % 100;
    return ha - hb;
  }).slice(0, 10);
  window.currentQuestions = seeded;
  window.currentIdx = 0;
  window.quizCorrect = 0;
  window.quizWrong = 0;
  window.quizCoins = 0;
  window.quizXP = 0;
  window.isWeeklyChallenge = true;
  window.isDailyChallenge = false;
  window.isRoomGame = false;
  window.selectedCategory = 'التحدي الأسبوعي';
  window.selectedSub = 'عام';
  navTo('quiz');
  window.showQuestion();
}
window.startWeeklyChallenge = startWeeklyChallenge;

export async function renderWeeklyChallenge() {
  window.switchChallengeTab('weekly');
  const weekId = getWeekId();
  const d = window.gameData;
  const wc = d.weeklyChallenge || {};
  const done = wc.weekId === weekId && wc.completed;

  const now = new Date();
  const sunday = new Date(now);
  sunday.setDate(now.getDate() + (7 - now.getDay()) % 7 || 7);
  sunday.setHours(0, 0, 0, 0);
  const diff = sunday - now;
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);

  const header = document.getElementById('weekly-header-card');
  if (header) {
    if (done) {
      header.style.background = 'linear-gradient(135deg,rgba(34,197,94,.1),rgba(16,163,74,.05))';
      header.style.borderColor = 'rgba(34,197,94,.3)';
      header.innerHTML = `
        <div style="font-size:11px;font-weight:900;color:#22c55e;letter-spacing:.07em;text-transform:uppercase;margin-bottom:8px">✅ أسبوع ${weekId} — مكتمل!</div>
        <div style="font-size:48px;font-weight:900;color:#22c55e;line-height:1;margin:8px 0">
          ${wc.score || 0}<span style="font-size:20px;opacity:.6">/10</span>
        </div>
        <div style="font-size:13px;font-weight:700;color:rgba(255,255,255,.7);margin-bottom:6px">
          🎉 ربحت ${(wc.reward || 1000).toLocaleString()} عملة!
        </div>
        <div style="font-size:11px;font-weight:700;color:var(--text2)">
          الأسبوع القادم بعد ${days} يوم و ${hours} ساعة
        </div>`;
    } else {
      header.style.background = 'linear-gradient(135deg,rgba(251,191,36,.1),rgba(245,158,11,.05))';
      header.style.borderColor = 'rgba(251,191,36,.25)';
      const seasonXP = (d.seasonData?.xp || 0);
      const rankData = getSeasonRank(seasonXP);
      const baseReward = 1000;
      const rankBonus = ['برونز', 'فضي', 'ذهبي', 'بلاتيني', 'ألماسي'].indexOf(rankData.name) * 200;
      const totalReward = baseReward + rankBonus;
      header.innerHTML = `
        <div style="display:flex;justify-content:center;align-items:center;gap:6px;margin-bottom:10px">
          <div style="font-size:11px;font-weight:900;color:var(--accent);letter-spacing:.07em;text-transform:uppercase">
            أسبوع ${weekId}
          </div>
        </div>
        <div style="font-size:22px;font-weight:900;color:#fff;margin-bottom:6px">
          ⏳ ${days > 0 ? days + ' يوم و ' : ''}${hours} ساعة و ${mins} دقيقة
        </div>
        <div style="font-size:12px;font-weight:700;color:var(--text2);margin-bottom:14px">
          نفس الأسئلة لجميع اللاعبين — ابدأ الآن!
        </div>
        <div style="display:flex;gap:8px;justify-content:center;margin-bottom:14px;flex-wrap:wrap">
          <div style="background:rgba(251,191,36,.1);border:1px solid rgba(251,191,36,.2);border-radius:12px;padding:8px 14px;font-size:12px;font-weight:900;color:var(--accent)">
            💰 ${totalReward.toLocaleString()} عملة
          </div>
          <div style="background:rgba(96,165,250,.1);border:1px solid rgba(96,165,250,.2);border-radius:12px;padding:8px 14px;font-size:12px;font-weight:900;color:#60a5fa">
            ⭐ +200 XP موسمي
          </div>
          <div style="background:rgba(139,92,246,.1);border:1px solid rgba(139,92,246,.2);border-radius:12px;padding:8px 14px;font-size:12px;font-weight:900;color:#a78bfa">
            🏆 إنجاز خاص
          </div>
        </div>
        <button onclick="window.startWeeklyChallenge()"
          style="background:var(--grad);color:#000;border:none;border-radius:18px;
          padding:14px 36px;font-weight:900;font-size:15px;cursor:pointer;
          font-family:'Tajawal',sans-serif;border-bottom:3px solid rgba(0,0,0,.2);
          box-shadow:0 8px 24px rgba(251,191,36,.3);transition:.12s"
          onmousedown="this.style.transform='scale(.96)'" onmouseup="this.style.transform=''">
          ابدأ التحدي الأسبوعي 🏆
        </button>`;
    }
  }

  const ldr = document.getElementById('weekly-leader-list');
  if (ldr) {
    ldr.innerHTML = '<div style="text-align:center;padding:20px;opacity:.4"><i class="fas fa-circle-notch fa-spin" style="color:var(--accent)"></i></div>';
    if (window.firebaseReady) {
      try {
        const snap = await getDocs(collection(db, 'artifacts', APP_ID, 'public', 'data', `weekly_${weekId}`));
        let rows = [];
        snap.forEach(d => rows.push(d.data()));
        rows.sort((a, b) => (b.score - a.score) || (a.ts - b.ts));
        if (!rows.length) {
          ldr.innerHTML = `<div style="text-align:center;padding:30px;opacity:.4;font-weight:700">
            <div style="font-size:36px;margin-bottom:8px">🏆</div>
            لا يوجد مشاركون بعد — كن الأول!
          </div>`;
          return;
        }
        const medals = ['🥇', '🥈', '🥉'];
        const topBg = ['rgba(255,215,0,.08)', 'rgba(192,192,192,.06)', 'rgba(205,127,50,.07)'];
        ldr.innerHTML = '';
        rows.slice(0, 20).forEach((u, i) => {
          const isMe = u.uid === window.currentUser?.uid;
          const rank = i + 1;
          const isTop = rank <= 3;
          ldr.innerHTML += `
            <div style="
              background:${isMe ? 'rgba(251,191,36,.07)' : isTop ? topBg[i] : 'var(--card)'};
              border:1px solid ${isMe ? 'rgba(251,191,36,.25)' : isTop ? 'rgba(255,255,255,.1)' : 'rgba(255,255,255,.05)'};
              border-radius:18px;padding:13px 16px;margin-bottom:8px;
              display:flex;align-items:center;gap:12px">
              <div style="width:36px;height:36px;border-radius:11px;flex-shrink:0;
                background:${isTop ? 'transparent' : '#1a1a1a'};
                display:flex;align-items:center;justify-content:center;
                font-size:${isTop ? '22px' : '13px'};font-weight:900;
                border:1px solid ${isTop ? 'transparent' : 'rgba(255,255,255,.07)'}">
                ${isTop ? medals[i] : rank}
              </div>
              <div style="width:38px;height:38px;border-radius:12px;flex-shrink:0;
                background:${isMe ? 'rgba(251,191,36,.12)' : 'rgba(255,255,255,.04)'};
                border:2px solid ${isMe ? 'var(--accent)' : 'rgba(255,255,255,.07)'};
                display:flex;align-items:center;justify-content:center;
                font-size:14px;font-weight:900;
                color:${isMe ? 'var(--accent)' : 'rgba(255,255,255,.5)'};
                font-family:'Tajawal',sans-serif;">
                ${(u.username || '؟').slice(0, 2)}
              </div>
              <div style="flex:1;min-width:0">
                <div style="font-weight:900;font-size:13px;
                  color:${isMe ? 'var(--accent)' : '#fff'};
                  white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
                  ${u.username || 'لاعب'}${isMe ? ' (أنت)' : ''}
                </div>
                <div style="font-size:10px;font-weight:700;color:var(--text2);margin-top:2px">
                  مستوى ${u.level || 1}
                </div>
              </div>
              <div style="text-align:left;flex-shrink:0">
                <div style="color:${isMe ? 'var(--accent)' : isTop ? '#fbbf24' : '#fff'};
                  font-weight:900;font-size:16px">${u.score}/10</div>
                <div style="font-size:9px;color:var(--text2);font-weight:700">نقطة</div>
              </div>
            </div>`;
        });
      } catch (e) {
        ldr.innerHTML = '<div style="text-align:center;padding:20px;opacity:.4;font-weight:700">تعذر التحميل ❌</div>';
      }
    } else {
      ldr.innerHTML = '<div style="text-align:center;padding:20px;opacity:.4;font-weight:700">يلزم اتصال بالإنترنت</div>';
    }
  }

  const dot = document.getElementById('weekly-notif-dot');
  if (dot) dot.classList.toggle('show', !done);
}
window.renderWeeklyChallenge = renderWeeklyChallenge;

// ══════════════════════════════════════════════════════════════════
// الموسم
// ══════════════════════════════════════════════════════════════════
export async function renderSeasonTab() {
  const d = window.gameData;
  const season = getCurrentSeason();
  const sd = d.seasonData || {};
  const seasonXP = sd.xp || 0;
  const prog = getSeasonProgress(seasonXP);

  const card = document.getElementById('season-card');
  if (card) {
    card.style.background = `linear-gradient(135deg,${prog.rank.color}18,${prog.rank.color}08)`;
    card.style.border = `1px solid ${prog.rank.color}40`;
    card.innerHTML = `
      <div style="font-size:11px;font-weight:900;color:${prog.rank.color};text-transform:uppercase;letter-spacing:.07em;margin-bottom:6px">
        موسم ${season}
      </div>
      <div style="font-size:52px;line-height:1;margin-bottom:8px">${prog.rank.emoji}</div>
      <div style="font-size:22px;font-weight:900;color:#fff;margin-bottom:4px">
        ${prog.rank.name}
      </div>
      <div style="font-size:13px;font-weight:700;color:${prog.rank.color};margin-bottom:14px">
        ${seasonXP.toLocaleString()} XP موسمي
      </div>
      ${prog.next ? `
        <div style="font-size:11px;font-weight:700;color:var(--text2);margin-bottom:8px">
          ${prog.toNext.toLocaleString()} XP للوصول إلى ${prog.next.name} ${prog.next.emoji}
        </div>
        <div style="height:8px;background:rgba(255,255,255,.08);border-radius:20px;overflow:hidden;margin:0 auto;max-width:280px">
          <div style="height:100%;width:${prog.pct}%;background:linear-gradient(90deg,${prog.rank.color},${prog.next?.color || prog.rank.color});
            border-radius:20px;transition:width .8s cubic-bezier(.34,1.56,.64,1)"></div>
        </div>
        <div style="font-size:10px;font-weight:700;color:var(--text2);margin-top:5px">${prog.pct}%</div>
      ` : `<div style="font-size:13px;font-weight:900;color:#fbbf24">🏆 الرتبة القصوى!</div>`}
      <div style="display:flex;gap:8px;justify-content:center;margin-top:14px;flex-wrap:wrap">
        <div style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:8px 14px;font-size:11px;font-weight:700;color:var(--text2)">
          🎮 ${sd.gamesPlayed || 0} جولة
        </div>
        <div style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:8px 14px;font-size:11px;font-weight:700;color:var(--text2)">
          📅 ${sd.challengesDone || 0} تحدي يومي
        </div>
        <div style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:8px 14px;font-size:11px;font-weight:700;color:var(--text2)">
          🏆 ${sd.weeklyDone || 0} أسبوعي
        </div>
      </div>`;
  }

  const ranksBar = document.getElementById('season-ranks-bar');
  if (ranksBar) {
    const ranks = [
      { name: 'برونز',    minXP: 0,    color: '#cd7f32', emoji: '🥉' },
      { name: 'فضي',      minXP: 500,  color: '#c0c0c0', emoji: '🥈' },
      { name: 'ذهبي',     minXP: 1500, color: '#ffd700', emoji: '🥇' },
      { name: 'بلاتيني',  minXP: 3000, color: '#e5e4e2', emoji: '💎' },
      { name: 'ألماسي',   minXP: 6000, color: '#b9f2ff', emoji: '👑' },
    ];
    ranksBar.innerHTML = `
      <div style="font-size:11px;font-weight:900;color:var(--text2);text-transform:uppercase;letter-spacing:.07em;margin-bottom:12px">رتب الموسم</div>
      <div style="display:flex;gap:0;width:100%;height:10px;border-radius:20px;overflow:hidden;margin-bottom:12px">
        ${ranks.map((r, i) => {
          const nextMin = ranks[i + 1]?.minXP || r.minXP + 3000;
          const width = Math.round(((nextMin - r.minXP) / 9000) * 100);
          return `<div style="flex:${width};height:100%;background:${r.color};opacity:${seasonXP >= r.minXP ? '1' : '.25'}"></div>`;
        }).join('')}
      </div>
      <div style="display:flex;justify-content:space-between">
        ${ranks.map(r => `
          <div style="text-align:center;flex:1">
            <div style="font-size:16px">${r.emoji}</div>
            <div style="font-size:9px;font-weight:900;color:${seasonXP >= r.minXP ? r.color : 'var(--text3)'}">
              ${r.name}
            </div>
          </div>`).join('')}
      </div>
      <div style="margin-top:12px;background:rgba(255,255,255,.04);border-radius:12px;padding:11px 14px;display:flex;justify-content:space-between;align-items:center">
        <div style="font-size:12px;font-weight:700;color:var(--text2)">مكافأة نهاية الموسم</div>
        <div style="font-size:14px;font-weight:900;color:var(--accent)">
          💰 ${prog.rank.reward.toLocaleString()} عملة
        </div>
      </div>`;
  }

  const ldr = document.getElementById('season-leader-list');
  if (ldr) {
    ldr.innerHTML = '<div style="text-align:center;padding:16px;opacity:.4"><i class="fas fa-circle-notch fa-spin" style="color:var(--accent)"></i></div>';
    if (window.firebaseReady) {
      try {
        const snap = await getDocs(collection(db, 'artifacts', APP_ID, 'public', 'data', 'rankings'));
        let leaders = [];
        snap.forEach(doc => leaders.push(doc.data()));
        leaders.sort((a, b) => ((b[`season_${season}`] || 0) - (a[`season_${season}`] || 0)));
        leaders = leaders.slice(0, 15);
        if (!leaders.length) {
          ldr.innerHTML = '<div style="text-align:center;padding:20px;opacity:.4;font-weight:700">لا يوجد لاعبون بعد 🌟</div>';
          return;
        }
        const medals = ['🥇', '🥈', '🥉'];
        ldr.innerHTML = '';
        leaders.forEach((u, i) => {
          const isMe = u.uid === window.currentUser?.uid;
          const sXP = u[`season_${season}`] || 0;
          const uRank = getSeasonRank(sXP);
          const rank = i + 1;
          const isTop = rank <= 3;
          ldr.innerHTML += `
            <div style="
              background:${isMe ? 'rgba(251,191,36,.07)' : 'var(--card)'};
              border:1px solid ${isMe ? 'rgba(251,191,36,.25)' : 'rgba(255,255,255,.05)'};
              border-radius:16px;padding:12px 15px;margin-bottom:7px;
              display:flex;align-items:center;gap:11px">
              <div style="width:34px;height:34px;border-radius:10px;flex-shrink:0;
                display:flex;align-items:center;justify-content:center;
                background:${isTop ? 'transparent' : '#1a1a1a'};
                font-size:${isTop ? '20px' : '12px'};font-weight:900;
                border:1px solid rgba(255,255,255,.07)">
                ${isTop ? medals[i] : rank}
              </div>
              <div style="font-size:18px;flex-shrink:0">${uRank.emoji}</div>
              <div style="flex:1;min-width:0">
                <div style="font-weight:900;font-size:13px;color:${isMe ? 'var(--accent)' : '#fff'};
                  white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
                  ${u.username || 'لاعب'}${isMe ? ' (أنت)' : ''}
                </div>
                <div style="font-size:10px;font-weight:700;color:${uRank.color}">
                  ${uRank.name} · مستوى ${u.level || 1}
                </div>
              </div>
              <div style="text-align:left;flex-shrink:0">
                <div style="color:${isMe ? 'var(--accent)' : uRank.color};font-weight:900;font-size:14px">
                  ${sXP.toLocaleString()}
                </div>
                <div style="font-size:9px;color:var(--text2);font-weight:700">XP</div>
              </div>
            </div>`;
        });
      } catch (e) {
        ldr.innerHTML = '<div style="text-align:center;padding:16px;opacity:.4;font-weight:700">تعذر التحميل ❌</div>';
      }
    }
  }
}
window.renderSeasonTab = renderSeasonTab;

// ══════════════════════════════════════════════════════════════════
// المهام الأسبوعية
// ══════════════════════════════════════════════════════════════════
export function renderWeeklyTasksTab() {
  const d = window.gameData;
  const weekId = getWeekId();
  const ls = d.loginStreak || {};

  if (!d.weeklyTasks) d.weeklyTasks = [];
  d.weeklyTasks.forEach(t => {
    if (t.weekId !== weekId) {
      t.weekId = weekId;
      t.current = 0;
      t.claimed = false;
    }
  });

  const tasksList = document.getElementById('weekly-tasks-list');
  if (tasksList) {
    tasksList.innerHTML = '';
    (d.weeklyTasks || []).forEach(t => {
      const pct = Math.min((t.current / t.goal) * 100, 100);
      const isDone = t.claimed;
      tasksList.innerHTML += `
        <div style="background:${isDone ? 'rgba(34,197,94,.04)' : 'var(--card)'};
          border:1px solid ${isDone ? 'rgba(34,197,94,.2)' : 'rgba(255,255,255,.06)'};
          border-radius:18px;padding:14px 16px;margin-bottom:10px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
            <span style="font-size:13px;font-weight:700;color:#fff;flex:1;margin-left:10px">${t.text}</span>
            ${isDone
              ? `<span style="font-size:11px;font-weight:900;padding:4px 12px;border-radius:20px;
                  background:rgba(34,197,94,.12);color:#22c55e;white-space:nowrap">✅ منجزة</span>`
              : `<button onclick="window.claimWeeklyTask('${t.id}')" ${t.current < t.goal ? 'disabled' : ''}
                  style="font-size:11px;font-weight:900;padding:5px 13px;border-radius:14px;
                  background:${t.current >= t.goal ? 'var(--grad)' : 'rgba(255,255,255,.06)'};
                  color:${t.current >= t.goal ? '#000' : 'var(--text2)'};
                  border:none;cursor:${t.current >= t.goal ? 'pointer' : 'default'};
                  font-family:'Tajawal',sans-serif;white-space:nowrap">
                  +${t.reward} 💰
                </button>`
            }
          </div>
          <div style="display:flex;align-items:center;gap:10px">
            <div style="flex:1;height:6px;background:rgba(255,255,255,.07);border-radius:10px;overflow:hidden">
              <div style="height:100%;width:${pct}%;border-radius:10px;
                background:${isDone ? 'linear-gradient(90deg,#22c55e,#16a34a)' : 'var(--grad)'};
                transition:width .6s cubic-bezier(.34,1.56,.64,1)"></div>
            </div>
            <span style="font-size:11px;font-weight:900;color:var(--text2);white-space:nowrap">
              ${t.current}/${t.goal}
            </span>
          </div>
        </div>`;
    });
  }

  const streakGrid = document.getElementById('streak-reward-grid');
  const streakNext = document.getElementById('streak-next-reward');
  if (streakGrid) {
    const STREAK_REWARDS = [
      { day: 1, emoji: '🎁', reward: 50 },
      { day: 2, emoji: '💰', reward: 100 },
      { day: 3, emoji: '⚡', reward: 150 },
      { day: 4, emoji: '💎', reward: 200 },
      { day: 5, emoji: '🔥', reward: 300 },
      { day: 6, emoji: '⭐', reward: 400 },
      { day: 7, emoji: '👑', reward: 700 },
    ];
    const curCount = ls.count || 0;
    streakGrid.innerHTML = '';
    STREAK_REWARDS.forEach(sr => {
      const reached = curCount >= sr.day;
      const isCurrent = curCount + 1 === sr.day;
      streakGrid.innerHTML += `
        <div style="
          background:${reached ? 'rgba(34,197,94,.1)' : isCurrent ? 'rgba(251,191,36,.07)' : 'rgba(255,255,255,.04)'};
          border:2px solid ${reached ? 'rgba(34,197,94,.3)' : isCurrent ? 'rgba(251,191,36,.3)' : 'rgba(255,255,255,.07)'};
          border-radius:12px;padding:8px 4px;text-align:center;
          position:relative;transition:.2s">
          ${reached ? `<div style="position:absolute;top:-6px;right:-6px;width:16px;height:16px;
            background:#22c55e;border-radius:50%;font-size:9px;display:flex;align-items:center;justify-content:center">✓</div>` : ''}
          <div style="font-size:20px;line-height:1;margin-bottom:3px">${sr.emoji}</div>
          <div style="font-size:9px;font-weight:900;color:${reached ? '#22c55e' : isCurrent ? 'var(--accent)' : 'var(--text2)'}">
            +${sr.reward}
          </div>
          <div style="font-size:8px;font-weight:700;color:var(--text3)">يوم ${sr.day}</div>
        </div>`;
    });
    if (streakNext) {
      const nextDay = STREAK_REWARDS.find(sr => curCount < sr.day);
      if (nextDay) {
        streakNext.innerHTML = `
          <span style="color:var(--text2)">ادخل غداً للحصول على </span>
          <span style="color:var(--accent);font-weight:900">${nextDay.emoji} +${nextDay.reward} عملة</span>
          <span style="color:var(--text2)"> (اليوم ${nextDay.day})</span>`;
      } else {
        streakNext.innerHTML = '<span style="color:#22c55e;font-weight:900">🏆 أكملت دورة 7 أيام كاملة!</span>';
      }
    }
  }
}
window.renderWeeklyTasksTab = renderWeeklyTasksTab;

export function claimWeeklyTask(id) {
  const t = (window.gameData.weeklyTasks || []).find(x => x.id === id);
  if (!t || t.claimed) return;
  if (t.current < t.goal) {
    showToast('❌ لم تكمل المهمة بعد');
    return;
  }
  t.claimed = true;
  window.gameData.coins += t.reward;
  playSound('snd-buy');
  try {
    confetti({ particleCount: 60, spread: 70, colors: ['#fbbf24', '#a78bfa', '#22c55e'] });
  } catch (e) {}
  saveData();
  updateUI();
  showToast(`🎉 +${t.reward} عملة مكافأة أسبوعية!`);
  renderWeeklyTasksTab();
}
window.claimWeeklyTask = claimWeeklyTask;

// ══════════════════════════════════════════════════════════════════
// تبديل تبويبات التحديات
// ══════════════════════════════════════════════════════════════════
export function switchChallengeTab(tab) {
  ['weekly', 'season', 'wtasks'].forEach(t => {
    const el = document.getElementById(`ch-tab-${t}`);
    const btn = document.querySelector(`[data-ctab="${t}"]`);
    if (el) el.style.display = t === tab ? (t === 'weekly' ? 'flex' : 'block') : 'none';
    if (btn) {
      const active = t === tab;
      btn.style.background = active ? 'rgba(251,191,36,.12)' : 'rgba(255,255,255,.05)';
      btn.style.color = active ? 'var(--accent)' : 'var(--text2)';
      btn.style.borderColor = active ? 'rgba(251,191,36,.2)' : 'rgba(255,255,255,.07)';
    }
  });
  if (tab === 'season') renderSeasonTab();
  if (tab === 'wtasks') renderWeeklyTasksTab();
}
window.switchChallengeTab = switchChallengeTab;

// js/quiz.js
import { showToast, playSound } from './helpers.js';
import { updateDailyTask, updateWeeklyTask, addSeasonXP, checkLevel, saveData } from './data.js';
import { updateUI, navTo } from './ui.js';
import { db, APP_ID } from './firebase.js';
import { collection, getDocs, query, where, addDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// الأسئلة الاحتياطية العامة
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

// أسئلة احتياطية للتصنيفات المحلية
const FALLBACK_LOCAL = [
  { t: "ما اسم الحي المعروف بـ 'باريس الشرق' في القاهرة؟", a: ["مصر الجديدة", "الزمالك", "وسط البلد", "المعادي"], c: 2, x: "وسط البلد يُلقَّب بباريس الشرق لمعمارها الأوروبي الكلاسيكي", category: "أحياء القاهرة" },
  { t: "في أي حي يقع برج القاهرة؟", a: ["المعادي", "الزمالك", "مصر الجديدة", "المقطم"], c: 1, x: "برج القاهرة يقع في جزيرة الزمالك على النيل" },
  { t: "ما أقدم أحياء القاهرة الإسلامية؟", a: ["مصر الجديدة", "الفسطاط", "حدائق الأهرام", "الرحاب"], c: 1, x: "الفسطاط هي أول عاصمة إسلامية في مصر أسسها عمرو بن العاص" },
  { t: "في أي منطقة يقع سوق خان الخليلي؟", a: ["الدقي", "مدينة نصر", "الحسين", "المهندسين"], c: 2, x: "خان الخليلي في منطقة الحسين بالقاهرة الفاطمية" },
  { t: "ما المسافة التقريبية بين القاهرة والإسكندرية؟", a: ["100 كم", "150 كم", "220 كم", "300 كم"], c: 2, x: "المسافة بين القاهرة والإسكندرية نحو 220 كيلومتر" },
  { t: "ما معنى كلمة 'فسحة' بالعربية الفصحى؟", a: ["تعب", "راحة ونزهة", "شجار", "طعام"], c: 1, x: "الفسحة بالعامية المصرية تعني النزهة والترفيه" },
  { t: "ما أصل كلمة 'أوضة' المصرية؟", a: ["فرنسية", "تركية", "إيطالية", "فارسية"], c: 1, x: "أوضة من التركية 'oda' وتعني غرفة" },
  { t: "ما معنى مثل 'إللي اتبنى على الباطل هيبقى باطل'؟", a: ["البناء مهم", "الأساس الغلط ما يجيبش نتيجة", "الصبر مفتاح الفرج", "التعاون قوة"], c: 1, x: "المثل يعني إن أي شيء قايم على أساس خاطئ مصيره الفشل" },
  { t: "من أي لغة دخلت كلمة 'طبق' للعربية المصرية؟", a: ["يونانية", "فارسية", "تركية", "نوبية"], c: 0, x: "طبق مشتقة من اليونانية 'tabaka' وتعني طبقة مسطحة" },
  { t: "ما معنى كلمة 'شاطر' في الأصل القبطي؟", a: ["ذكي", "سريع", "شجاع", "كسول"], c: 0, x: "شاطر في القبطية تعني الذكي والحاذق" },
  { t: "من غنّى 'أنا مش عارف أقولك بحبك'؟", a: ["محمد فوزي", "عبد الحليم حافظ", "فريد الأطرش", "كاظم الساهر"], c: 1, x: "عبد الحليم حافظ صاحب هذه الأغنية الشهيرة" },
  { t: "في أي مدينة ولدت أم كلثوم؟", a: ["القاهرة", "طنطا", "دمياط", "السنبلاوين في الدقهلية"], c: 3, x: "ولدت أم كلثوم في قرية طماي الزهايرة بمحافظة الدقهلية" },
  { t: "ما اسم أشهر أغنية لمحمد عبد الوهاب ملحناً لأم كلثوم؟", a: ["أنت عمري", "أروح لمين", "الأطلال", "فات الميعاد"], c: 0, x: "أنت عمري 1964 — التعاون التاريخي بين عبد الوهاب وأم كلثوم" },
  { t: "من لقّب بـ 'موسيقار الأجيال'؟", a: ["فيروز", "عبد الحليم حافظ", "محمد عبد الوهاب", "سيد مكاوي"], c: 2, x: "محمد عبد الوهاب هو موسيقار الأجيال" },
  { t: "ما أول أغنية غنّتها أحلام على مستوى الخليج؟", a: ["يا ويلي", "مبتسمة", "الليالي", "هلا بالمحبة"], c: 0, x: "يا ويلي كانت بداية انطلاقة أحلام الكبرى" },
  { t: "من بطل فيلم 'اللمبي' 2002؟", a: ["عادل إمام", "محمد سعد", "أحمد حلمي", "كريم عبد العزيز"], c: 1, x: "محمد سعد قدّم شخصية اللمبي في 2002 ونجح الفيلم نجاحاً كبيراً" },
  { t: "ما اسم الفيلم الذي جسّد فيه أحمد زكي دور عبد الناصر؟", a: ["ناصر 56", "ضربة معلم", "البريء", "أرض الخوف"], c: 0, x: "ناصر 56 (1996) — أحمد زكي في دور الرئيس جمال عبد الناصر" },
  { t: "في أي عام عُرض مسلسل 'رأفت الهجان'؟", a: ["1985", "1988", "1992", "1995"], c: 1, x: "رأفت الهجان عُرض عام 1988 وبطولة محمود عبد العزيز" },
  { t: "من مخرج فيلم 'الإرهابي' 1994؟", a: ["يوسف شاهين", "نادر جلال", "محمد فاضل", "سمير سيف"], c: 1, x: "الإرهابي من إخراج نادر جلال وبطولة عادل إمام" },
  { t: "ما اسم كوميديان مصري اشتهر بمسرحية 'مدرسة المشاغبين'؟", a: ["عادل إمام", "سعيد صالح", "يونس شلبي", "الثلاثة معاً"], c: 3, x: "مدرسة المشاغبين (1973) بطولة عادل إمام وسعيد صالح ويونس شلبي" },
];

// تصنيفات اللعبة (للتحقق من صحة البيانات)
const categoryConfig = {
  islamic: { name: "إسلاميات" },
  egypt:   { name: "تاريخ مصر" },
  tech:    { name: "تقنية" },
  science: { name: "علوم وفضاء" },
  geo:     { name: "جغرافيا" },
  sports:  { name: "رياضة" },
  puzzles: { name: "ألغاز" },
  food:    { name: "طعام" },
  cairo:   { name: "أحياء القاهرة" },
  words:   { name: "كلمات مصرية" },
  music:   { name: "موسيقى وأغاني" },
  cinema:  { name: "سينما وتليفزيون" },
};

export let currentQuestions = [];
export let currentIdx = 0;
export let quizCorrect = 0;
export let quizWrong = 0;
export let quizCoins = 0;
export let quizXP = 0;
export let isDailyChallenge = false;
export let isRoomGame = false;
export let isWeeklyChallenge = false;
export let selectedCategory = '';
export let selectedSub = '';
export let timerInterval = null;
export let timeLeft = 15;

// دالة جلب الأسئلة من Firestore
async function fetchQuestions(cat, sub) {
  let pool = [];
  const cached = getCachedQuestions(cat, sub);
  if (!navigator.onLine) {
    if (cached.length >= 5) {
      showToast('📵 أوفلاين — أسئلة محفوظة مسبقاً');
      return cached;
    }
    showToast('📵 أوفلاين — أسئلة احتياطية');
    return FALLBACK.slice();
  }
  if (window.firebaseReady && db) {
    try {
      const q = query(
        collection(db, 'artifacts', APP_ID, 'public', 'data', 'questions'),
        where('category', '==', cat),
        where('subCategory', '==', sub)
      );
      const snap = await getDocs(q);
      snap.forEach(d => pool.push({ id: d.id, ...d.data() }));
      if (pool.length >= 5) {
        cacheQuestions(cat, sub, pool);
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: 'CACHE_QUESTIONS',
            questions: pool,
            category: cat,
            subCategory: sub,
          });
        }
      }
    } catch (e) {
      console.warn('Firestore fetch error:', e);
    }
  }
  if (pool.length < 5) {
    if (cached.length >= 5) {
      showToast('📦 أسئلة من الذاكرة المحلية');
      return cached;
    }
    const LOCAL_CATS = ['أحياء القاهرة', 'كلمات مصرية', 'موسيقى وأغاني', 'سينما وتليفزيون'];
    const isLocalCat = LOCAL_CATS.some(lc => cat.includes(lc) || sub.includes(lc) ||
      ['cairo', 'words', 'music', 'cinema'].some(k => categoryConfig[k]?.name === cat));
    if (isLocalCat) {
      const localPool = FALLBACK_LOCAL.filter(q =>
        !q.category || q.category === sub || LOCAL_CATS.some(lc => cat.includes(lc))
      );
      if (localPool.length >= 5) {
        showToast('📦 أسئلة مصرية احتياطية');
        return localPool.sort(() => 0.5 - Math.random());
      }
    }
    pool = FALLBACK.slice();
    showToast('📶 أسئلة احتياطية — أضف أسئلة من الأدمن');
  }
  return pool;
}

function cacheQuestions(cat, sub, qs) {
  try { localStorage.setItem(`q_${cat}_${sub}`, JSON.stringify(qs.slice(0, 30))); } catch (e) {}
}
function getCachedQuestions(cat, sub) {
  try { const r = localStorage.getItem(`q_${cat}_${sub}`); return r ? JSON.parse(r) : []; } catch (e) { return []; }
}

// دالة بدء الاختبار
export async function startQuiz(cat, sub, isDaily = false, isRoom = false, isWeekly = false) {
  selectedCategory = cat; selectedSub = sub;
  isDailyChallenge = isDaily; isRoomGame = isRoom; isWeeklyChallenge = isWeekly;
  currentIdx = 0; quizCorrect = 0; quizWrong = 0; quizCoins = 0; quizXP = 0;

  // reset mode state
  window._modeHeartsLeft = window._modeHearts || null;
  window._modeLevel = 1;

  navTo('quiz');
  document.getElementById('q-text').innerText = 'جاري تحضير الأسئلة...';
  document.getElementById('options-box').innerHTML = '';
  document.getElementById('analysis-container').style.display = 'none';
  document.getElementById('q-cat-badge').innerText = `${cat} • ${sub}`;

  // hearts bar
  const hb = document.getElementById('hearts-bar');
  if (hb) {
    if (window._modeHearts) {
      hb.style.display = 'flex';
      hb.innerHTML = Array.from({length:window._modeHearts}, (_,i) =>
        `<span style="font-size:20px">❤️</span>`).join('');
    } else { hb.style.display = 'none'; }
  }

  let pool = await fetchQuestions(cat, sub);
  if (!pool.length) { showToast('❌ لم يتم العثور على أسئلة'); navTo('map'); return; }

  const count = window._modeCustom?.questions || (window._modeEndless ? 50 : 10);
  if (window._modeEndless) {
    const rep = []; while(rep.length < 50) rep.push(...pool);
    currentQuestions = rep.sort(() => 0.5 - Math.random()).slice(0, 50);
  } else {
    currentQuestions = pool.sort(() => 0.5 - Math.random()).slice(0, Math.min(count, pool.length));
  }
  showQuestion();
}
window.startQuiz = startQuiz;

export function showQuestion() {
  if (currentIdx >= currentQuestions.length) {
    finishQuiz();
    return;
  }
  startTimer();
  const q = currentQuestions[currentIdx];
  document.getElementById('q-counter').innerText = `السؤال ${currentIdx + 1}/${currentQuestions.length}`;
  document.getElementById('q-progress').style.width = ((currentIdx + 1) / currentQuestions.length) * 100 + '%';
  document.getElementById('q-percent').innerText = Math.round(((currentIdx + 1) / currentQuestions.length) * 100) + '%';
  document.getElementById('q-text').innerText = q.t;
  document.getElementById('analysis-container').style.display = 'none';
  document.getElementById('btn-analyze').style.display = 'none';
  const box = document.getElementById('options-box');
  box.innerHTML = '';
  q.a.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className = 'btn-option';
    btn.innerText = opt;
    btn.onclick = () => selectAnswer(i, btn);
    box.appendChild(btn);
  });
}
window.showQuestion = showQuestion;

function startTimer() {
  const TOTAL = window._modeBlitz      ? 7
              : window._modeCustom?.time
              || (window._modeAscending ? Math.max(5, 15 - ((window._modeLevel||1)-1)*2) : 15);
  timeLeft = TOTAL;
  const tb = document.getElementById('timer-box');
  const tf = document.getElementById('timer-bar-fill');
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
      if (timeLeft <= 5) tf.style.background = 'linear-gradient(90deg,#dc2626,#ef4444)';
      else if (timeLeft <= 9) tf.style.background = 'linear-gradient(90deg,#f59e0b,#fbbf24)';
    }
    if (timeLeft === 5) {
      playSound('snd-warn');
      tb.style.cssText = 'width:46px;height:46px;background:#ef4444;color:#fff;border-radius:18px;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:19px;border:3px solid rgba(255,255,255,.3);animation:pulse .5s infinite';
    }
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      playSound('snd-timeout');
      autoWrong();
    }
  }, 1000);
}

function autoWrong() {
  quizWrong++;
  const btns = document.querySelectorAll('.btn-option');
  btns.forEach(b => b.disabled = true);
  const q = currentQuestions[currentIdx];
  if (btns[q.c]) btns[q.c].classList.add('correct');
  document.getElementById('analysis-text').innerText = 'انتهى الوقت! الإجابة الصحيحة بالأخضر.';
  document.getElementById('analysis-container').style.display = 'block';
  window.gameData.stats.currentStreak = 0;
  updateUI();
}

export function selectAnswer(i, btn) {
  clearInterval(timerInterval);
  const tf = document.getElementById('timer-bar-fill');
  if (tf) { tf.style.width = '0%'; tf.style.transition = 'none'; }
  const q = currentQuestions[currentIdx];
  document.querySelectorAll('.btn-option').forEach(b => b.disabled = true);
  if (i === q.c) {
    btn.classList.add('correct');
    playSound('snd-correct');
    const earned = 20 + (timeLeft * 2);
    quizCoins += earned; quizXP += 50; quizCorrect++;
    window.gameData.coins += earned; window.gameData.xp += 50;
    window.gameData.stats.correctAnswers++;
    window.gameData.stats.currentStreak++;
    window.gameData.stats.totalCoinsEarned = (window.gameData.stats.totalCoinsEarned || 0) + earned;
    if (window.gameData.stats.currentStreak > window.gameData.stats.maxStreak)
      window.gameData.stats.maxStreak = window.gameData.stats.currentStreak;
    updateDailyTask('win_5', 1);
    updateDailyTask('earn_500', earned);
    updateWeeklyTask('w_correct_30', 1);
    // ── إصلاح: w_streak_10 — نحدّثها فقط لما السلسلة تبلغ 10 بالضبط
    // المشكلة القديمة: كانت بتبعت 0 في كل إجابة وبتعمل reset للتقدم
    if (window.gameData.stats.currentStreak === 10) {
      updateWeeklyTask('w_streak_10', 10);
    }
    addSeasonXP(10);
    if (window.gameData.stats.currentStreak >= 3) updateDailyTask('streak_3', 3);
    if (!window.gameData.detailedStats) window.gameData.detailedStats = {};
    const ds = window.gameData.detailedStats;
    if (timeLeft >= 12) ds.speedAnswers = (ds.speedAnswers || 0) + 1;
    const answerTime = 15 - timeLeft;
    ds.totalAnswerTime = (ds.totalAnswerTime || 0) + answerTime;
    ds.totalAnswers = (ds.totalAnswers || 0) + 1;
    ds.avgAnswerTime = parseFloat((ds.totalAnswerTime / ds.totalAnswers).toFixed(1));
    if (!ds.categoriesPlayed) ds.categoriesPlayed = [];
    if (selectedCategory && !ds.categoriesPlayed.includes(selectedCategory))
      ds.categoriesPlayed.push(selectedCategory);
    const s = window.gameData.stats.currentStreak;
    if (s === 3) showToast('🔥 3 متتالية! رائع!');
    if (s === 5) showToast('⚡ 5 متتالية! أنت في القمة!');
    if (s === 7) showToast('💎 7 متتالية! خارق!');
    if (s === 10) showToast('👑 10 متتالية! أسطورة!');
    if (s === 15) showToast('🌟 15 متتالية! لا يُصدق!');
    try { confetti({ particleCount: 50, spread: 60, origin: { y: .7 }, colors: ['#fbbf24', '#f59e0b', '#fff'] }); } catch (e) {}
    if (isRoomGame && window.currentRoomId) window.syncRoomScore?.();
    if (window._modeAscending && quizCorrect>0 && quizCorrect%3===0) {
      window._modeLevel=(window._modeLevel||1)+1;
      showToast(`📈 مستوى ${window._modeLevel}! الوقت أقل`,1800);
    }
  } else {
    btn.classList.add('wrong');
    document.querySelectorAll('.btn-option')[q.c]?.classList.add('correct');
    playSound('snd-wrong');
    document.getElementById('btn-analyze').style.display = '';
    quizWrong++;
    window.gameData.stats.currentStreak = 0;
    if (quizWrong >= 3) window._hadBadStreak = true;
    // وضع الكمال
    if (window._modePerfect) {
      showToast('💥 الكمال انكسر!', 2500);
      setTimeout(()=>{clearInterval(timerInterval);finishQuiz();},1200);
      document.getElementById('analysis-container').style.display='block';
      checkLevel();saveData();updateUI();return;
    }
    // وضع القلوب
    if (window._modeHearts) {
      window._modeHeartsLeft=(window._modeHeartsLeft||window._modeHearts)-1;
      const hb=document.getElementById('hearts-bar');
      if(hb){hb.innerHTML=Array.from({length:window._modeHearts},(_,i)=>`<span style="font-size:20px;filter:${i<window._modeHeartsLeft?'':'grayscale(1) opacity(.3)'}">❤️</span>`).join('');}
      if(window._modeHeartsLeft<=0){showToast('💔 انتهت القلوب!',2500);setTimeout(()=>{clearInterval(timerInterval);finishQuiz();},1200);document.getElementById('analysis-container').style.display='block';checkLevel();saveData();updateUI();return;}
      else{showToast(`❤️ تبقى ${window._modeHeartsLeft} قلب`,1500);}
    }
    // وضع لا نهاية
    if (window._modeEndless) { setTimeout(()=>{clearInterval(timerInterval);finishQuiz();},1500); }
  }
  document.getElementById('analysis-text').innerText = q.x || 'معلومة قيمة تضاف لرصيدك!';
  document.getElementById('analysis-container').style.display = 'block';
  checkLevel(); saveData(); updateUI();
  // ── حفظ تقدم الجولة للاستكمال لاحقاً ──
  if (typeof window.saveGameSession === 'function') window.saveGameSession();
}
window.selectAnswer = selectAnswer;

export function nextQuestion() {
  currentIdx++;
  showQuestion();
}
window.nextQuestion = nextQuestion;

export function useHelper(type) {
  const inv = type === 'del' ? 'delete' : type;
  if ((window.gameData.inventory[inv] ?? 0) <= 0) {
    showToast('❌ لا يوجد رصيد - اشترِ من المتجر');
    return;
  }
  window._usedHelperThisGame = true;
  const q = currentQuestions[currentIdx];
  if (!q) return;
  if (document.getElementById('analysis-container').style.display !== 'none' && type !== 'skip') {
    showToast('تم الإجابة بالفعل!');
    return;
  }
  if (type === 'delete') {
    const btns = document.querySelectorAll('.btn-option');
    let rm = 0;
    btns.forEach((b, i) => {
      if (i !== q.c && !b.disabled && !b.classList.contains('eliminated') && rm < 2) {
        b.classList.add('eliminated');
        b.disabled = true;
        rm++;
      }
    });
    if (!rm) { showToast('لا خيارات للحذف'); return; }
    showToast('✂️ تم حذف خيارَين');
  } else if (type === 'skip') {
    clearInterval(timerInterval);
    window.gameData.inventory[inv]--;
    updateDailyTask('use_helper', 1);
    updateUI(); saveData();
    currentIdx++; showQuestion();
    showToast('⏩ تم التخطي');
    return;
  } else {
    window.openModal?.('hint');
    document.getElementById('hint-text').innerText = q.x || 'ركز في السؤال جيداً!';
  }
  window.gameData.inventory[inv]--;
  updateDailyTask('use_helper', 1);
  updateUI(); saveData();
}
window.useHelper = useHelper;

async function finishQuiz() {
  clearInterval(timerInterval);
  window.gameData.stats.gamesPlayed++;
  addSeasonXP(50);
  if (window.gameData.seasonData) window.gameData.seasonData.gamesPlayed = (window.gameData.seasonData.gamesPlayed || 0) + 1;
  updateWeeklyTask('w_games_5', 1);
  if (selectedCategory && selectedCategory !== 'التحدي الأسبوعي' && selectedCategory !== 'تحدي اليوم') {
    const catsToday = window.gameData._catsToday || [];
    if (!catsToday.includes(selectedCategory)) {
      catsToday.push(selectedCategory);
      window.gameData._catsToday = catsToday;
      updateDailyTask('play_cats', catsToday.length);
    }
  }
  const catKeys = Object.keys(categoryConfig).sort((a, b) => categoryConfig[a].order - categoryConfig[b].order);
  const curKey = catKeys.find(k => categoryConfig[k].name === selectedCategory);
  if (curKey) {
    if (!window.gameData._mapProgress) window.gameData._mapProgress = [];
    if (!window.gameData._mapProgress.includes(curKey)) window.gameData._mapProgress.push(curKey);
    if (!window.gameData._subProgress) window.gameData._subProgress = {};
    window.gameData._subProgress[curKey] = (window.gameData._subProgress[curKey] || 0) + 1;
    window.gameData.stats.completedSections++;
  }
  if (isDailyChallenge) {
    window.gameData.dailyChallengeDate = new Date().toDateString();
    window.gameData.dailyChallengeScore = quizCorrect;
    window.gameData.stats.dailyChallengesWon = (window.gameData.stats.dailyChallengesWon || 0) + 1;
    updateDailyTask('daily_ch', 1);
    updateWeeklyTask('w_daily_3', 1);
    addSeasonXP(100);
    if (window.gameData.seasonData) window.gameData.seasonData.challengesDone = (window.gameData.seasonData.challengesDone || 0) + 1;
    if (window.firebaseReady && window.currentUser) {
      await window.db_set(
        `artifacts/${APP_ID}/public/data/daily_${new Date().toISOString().slice(0, 10)}/${window.currentUser.uid}`,
        { username: window.gameData.username, avatar: window.gameData.avatar, score: quizCorrect, uid: window.currentUser.uid, ts: Date.now() },
        true
      );
    }
  }
  if (isWeeklyChallenge) {
    const weekId = window.getWeekId?.() || '';
    const reward = 1000 + (quizCorrect * 50);
    window.gameData.weeklyChallenge = { weekId, score: quizCorrect, completed: true, reward };
    window.gameData.coins += reward;
    addSeasonXP(200);
    if (window.gameData.seasonData) window.gameData.seasonData.weeklyDone = (window.gameData.seasonData.weeklyDone || 0) + 1;
    showToast(`🏆 أنهيت التحدي الأسبوعي! +${reward} عملة!`, 5000);
    if (window.firebaseReady && window.currentUser) {
      try {
        await window.db_set(
          `artifacts/${APP_ID}/public/data/weekly_${weekId}/${window.currentUser.uid}`,
          { username: window.gameData.username, score: quizCorrect, level: window.gameData.level, uid: window.currentUser.uid, ts: Date.now() },
          true
        );
      } catch (e) {}
    }
    const wAchv = window.gameData.achievements.find(a => a.id === 'weekly_win');
    if (wAchv && !wAchv.earned) { wAchv.earned = true; showToast('🏆 إنجاز: فاز بتحدي أسبوعي!', 4000); }
    isWeeklyChallenge = false;
  }
  if (quizWrong === 0 && quizCorrect >= 10) {
    const p = window.gameData.achievements.find(a => a.id === 'perfect');
    if (p && !p.earned) { p.earned = true; showToast('⭐ إنجاز: 10/10 مثالي!'); }
  }
  if (!window._usedHelperThisGame) {
    if (!window.gameData.detailedStats) window.gameData.detailedStats = {};
    window.gameData.detailedStats.noHintGames = (window.gameData.detailedStats.noHintGames || 0) + 1;
  }
  if (window._hadBadStreak && quizCorrect >= 7) {
    if (!window.gameData.detailedStats) window.gameData.detailedStats = {};
    window.gameData.detailedStats.comebackWins = (window.gameData.detailedStats.comebackWins || 0) + 1;
    showToast('💪 Comeback! إنجاز رائع!');
  }
  window._usedHelperThisGame = false;
  window._hadBadStreak = false;
  if (isRoomGame) await window.finishRoomGame?.();
  // مسح الجولة المحفوظة — الجولة انتهت
  if (typeof window.clearGameSession === 'function') window.clearGameSession();
  saveData(); playSound('snd-win');
  const pct = Math.round((quizCorrect / currentQuestions.length) * 100);
  let emoji = '😊', title = 'أحسنت!';
  if (pct === 100) { emoji = '🏆'; title = 'مثالي 100%!'; }
  else if (pct >= 80) { emoji = '🌟'; title = 'ممتاز!'; }
  else if (pct >= 60) { emoji = '😊'; title = 'جيد جداً!'; }
  else if (pct >= 40) { emoji = '💪'; title = 'تحتاج تدريب!'; }
  else { emoji = '😅'; title = 'حاول مجدداً!'; }
  document.getElementById('result-emoji').innerText = emoji;
  document.getElementById('result-title').innerText = title;
  document.getElementById('result-subtitle').innerText = `${pct}% إجابات صحيحة`;
  document.getElementById('res-correct').innerText = quizCorrect;
  document.getElementById('res-wrong').innerText = quizWrong;
  document.getElementById('res-coins').innerText = `+${quizCoins} 💰`;
  document.getElementById('res-xp').innerText = `+${quizXP} XP`;
  try { confetti({ particleCount: pct >= 60 ? 180 : 50, spread: 100, origin: { y: .5 } }); } catch (e) {}
  navTo('result');
}

export async function askAIAnalysis() {
  // تحتاج GEMINI_KEY
  showToast('❌ الـ AI Analysis غير مفعل');
}
window.askAIAnalysis = askAIAnalysis;


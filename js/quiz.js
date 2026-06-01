// js/quiz.js
import { showToast, playSound } from './helpers.js';
import { updateDailyTask, updateWeeklyTask, addSeasonXP, checkLevel, saveData } from './data.js';
import { updateUI, navTo } from './ui.js';
import { db, APP_ID } from './firebase.js';
import { collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// ── Fallback عام ────────────────────────────────────────────────
const FALLBACK = [
  { t:"ما عاصمة مصر؟",               a:["الإسكندرية","القاهرة","أسوان","الجيزة"],                          c:1, x:"القاهرة عاصمة مصر وأكبر مدنها" },
  { t:"كم عدد أركان الإسلام؟",       a:["3","4","5","6"],                                                   c:2, x:"أركان الإسلام الخمسة: الشهادتان، الصلاة، الزكاة، الصوم، الحج" },
  { t:"أكبر كوكب في المجموعة الشمسية؟", a:["زحل","المشتري","أورانوس","نبتون"],                             c:1, x:"المشتري أكبر كوكب، حجمه أكثر من 1300 مرة حجم الأرض" },
  { t:"من اخترع الهاتف؟",             a:["إديسون","فاراداي","غراهام بيل","نيوتن"],                          c:2, x:"اخترع غراهام بيل الهاتف عام 1876" },
  { t:"ما اختصار CPU؟",              a:["Control Power Unit","Central Processing Unit","Computer Power Unit","Core Processing Unit"], c:1, x:"CPU هي وحدة المعالجة المركزية" },
  { t:"كم يوماً في السنة الكبيسة؟",  a:["364","365","366","367"],                                           c:2, x:"السنة الكبيسة تحتوي 366 يوماً" },
  { t:"أعمق محيطات العالم؟",          a:["الهندي","الأطلسي","المتجمد الشمالي","الهادئ"],                   c:3, x:"المحيط الهادئ هو الأكبر والأعمق" },
  { t:"من رسم الموناليزا؟",           a:["ميكيلانجيلو","رافاييل","ليوناردو دافينشي","بيكاسو"],              c:2, x:"رسمها ليوناردو دافينشي بين 1503-1519" },
  { t:"كم سورة في القرآن الكريم؟",   a:["110","112","114","116"],                                          c:2, x:"القرآن الكريم يتكون من 114 سورة" },
  { t:"أطول نهر في العالم؟",          a:["الأمازون","النيل","المسيسيبي","الفولغا"],                         c:1, x:"نهر النيل في أفريقيا هو الأطول بطول 6650 كم" },
];

// ── Fallback محلي ───────────────────────────────────────────────
const FALLBACK_LOCAL = [
  { t:"ما اسم الحي المعروف بـ 'باريس الشرق'؟",  a:["مصر الجديدة","الزمالك","وسط البلد","المعادي"],        c:2, x:"وسط البلد يُلقَّب بباريس الشرق لمعمارها الأوروبي", category:"أحياء القاهرة" },
  { t:"في أي حي يقع برج القاهرة؟",              a:["المعادي","الزمالك","مصر الجديدة","المقطم"],            c:1, x:"برج القاهرة يقع في جزيرة الزمالك على النيل" },
  { t:"ما أقدم أحياء القاهرة الإسلامية؟",        a:["مصر الجديدة","الفسطاط","حدائق الأهرام","الرحاب"],     c:1, x:"الفسطاط هي أول عاصمة إسلامية في مصر" },
  { t:"في أي منطقة يقع خان الخليلي؟",           a:["الدقي","مدينة نصر","الحسين","المهندسين"],              c:2, x:"خان الخليلي في منطقة الحسين بالقاهرة الفاطمية" },
  { t:"المسافة التقريبية بين القاهرة والإسكندرية؟", a:["100 كم","150 كم","220 كم","300 كم"],              c:2, x:"المسافة نحو 220 كيلومتر" },
  { t:"من غنّى 'أنا مش عارف أقولك بحبك'؟",     a:["محمد فوزي","عبد الحليم حافظ","فريد الأطرش","كاظم الساهر"], c:1, x:"عبد الحليم حافظ صاحب هذه الأغنية" },
  { t:"من لقّب بـ 'موسيقار الأجيال'؟",          a:["فيروز","عبد الحليم","محمد عبد الوهاب","سيد مكاوي"],     c:2, x:"محمد عبد الوهاب هو موسيقار الأجيال" },
  { t:"من بطل فيلم 'اللمبي' 2002؟",             a:["عادل إمام","محمد سعد","أحمد حلمي","كريم عبد العزيز"],  c:1, x:"محمد سعد قدّم شخصية اللمبي بنجاح كبير" },
  { t:"من مخرج فيلم 'الإرهابي' 1994؟",          a:["يوسف شاهين","نادر جلال","محمد فاضل","سمير سيف"],       c:1, x:"الإرهابي من إخراج نادر جلال وبطولة عادل إمام" },
  { t:"ما معنى كلمة 'أوضة' المصرية أصلاً؟",     a:["فرنسية","تركية","إيطالية","فارسية"],                   c:1, x:"أوضة من التركية 'oda' وتعني غرفة" },
];

const categoryConfig = {
  islamic:{name:"إسلاميات"}, egypt:{name:"تاريخ مصر"}, tech:{name:"تقنية"},
  science:{name:"علوم وفضاء"}, geo:{name:"جغرافيا"}, sports:{name:"رياضة"},
  puzzles:{name:"ألغاز"}, food:{name:"طعام"}, cairo:{name:"أحياء القاهرة"},
  words:{name:"كلمات مصرية"}, music:{name:"موسيقى وأغاني"}, cinema:{name:"سينما وتليفزيون"},
};

// ── حالة الكويز ────────────────────────────────────────────────
export let currentQuestions  = [];
export let currentIdx        = 0;
export let quizCorrect       = 0;
export let quizWrong         = 0;
export let quizCoins         = 0;
export let quizXP            = 0;
export let isDailyChallenge  = false;
export let isRoomGame        = false;
export let isWeeklyChallenge = false;
export let selectedCategory  = '';
export let selectedSub       = '';
export let timerInterval     = null;
export let timeLeft          = 15;
let _TOTAL_TIME              = 15;

// ══════════════════════════════════════════════
// جلب الأسئلة من Firestore
// ══════════════════════════════════════════════
async function fetchQuestions(cat, sub) {
  let pool = [];
  const cached = getCachedQuestions(cat, sub);

  if (!navigator.onLine) {
    if (cached.length >= 5) { showToast('📵 أوفلاين — أسئلة محفوظة'); return cached; }
    showToast('📵 أوفلاين — أسئلة احتياطية');
    return FALLBACK.slice();
  }

  if (window.firebaseReady && db) {
    try {
      const q = query(
        collection(db, 'artifacts', (window.appId || APP_ID), 'public', 'data', 'questions'),
        where('category', '==', cat),
        where('subCategory', '==', sub)
      );
      const snap = await getDocs(q);
      snap.forEach(d => pool.push({ id: d.id, ...d.data() }));
      if (pool.length >= 5) {
        cacheQuestions(cat, sub, pool);
        navigator.serviceWorker?.controller?.postMessage({ type:'CACHE_QUESTIONS', questions:pool, category:cat, subCategory:sub });
      }
    } catch(e) { console.warn('Firestore fetch:', e); }
  }

  if (pool.length < 5) {
    if (cached.length >= 5) { showToast('📦 أسئلة من الذاكرة المحلية'); return cached; }
    const LOCAL_CATS = ['أحياء القاهرة','كلمات مصرية','موسيقى وأغاني','سينما وتليفزيون'];
    const isLocal = LOCAL_CATS.some(lc => cat.includes(lc) || sub.includes(lc));
    if (isLocal) {
      const lp = FALLBACK_LOCAL.sort(() => 0.5 - Math.random());
      if (lp.length >= 5) { showToast('📦 أسئلة مصرية احتياطية'); return lp; }
    }
    pool = FALLBACK.slice();
    showToast('📶 أسئلة احتياطية — أضف أسئلة من الأدمن');
  }
  return pool;
}

function cacheQuestions(cat, sub, qs) {
  try { localStorage.setItem(`q_${cat}_${sub}`, JSON.stringify(qs.slice(0,30))); } catch(e) {}
}
function getCachedQuestions(cat, sub) {
  try { const r = localStorage.getItem(`q_${cat}_${sub}`); return r ? JSON.parse(r) : []; } catch(e) { return []; }
}

// ══════════════════════════════════════════════
// بدء الكويز
// ══════════════════════════════════════════════
export async function startQuiz(cat, sub, isDaily=false, isRoom=false, isWeekly=false) {
  selectedCategory=cat; selectedSub=sub;
  isDailyChallenge=isDaily; isRoomGame=isRoom; isWeeklyChallenge=isWeekly;
  currentIdx=0; quizCorrect=0; quizWrong=0; quizCoins=0; quizXP=0;

  window._modeHeartsLeft = window._modeHearts || null;
  window._modeLevel = 1;

  navTo('quiz');

  // إعادة تعيين عناصر الشاشة
  const qText = document.getElementById('q-text');
  const optBox = document.getElementById('options-box');
  const anaBox = document.getElementById('analysis-container');
  const catBadge = document.getElementById('q-cat-badge');
  if (qText)    qText.innerText = 'جاري تحضير الأسئلة...';
  if (optBox)   optBox.innerHTML = '';
  if (anaBox)   anaBox.style.display = 'none';
  if (catBadge) catBadge.innerText = `${cat} • ${sub}`;

  // شريط القلوب
  const hb = document.getElementById('hearts-bar');
  if (hb) {
    if (window._modeHearts) {
      hb.style.display = 'flex';
      hb.innerHTML = Array.from({length: window._modeHearts}, (_,i) =>
        `<span class="heart-icon" id="heart-${i}">❤️</span>`).join('');
    } else {
      hb.style.display = 'none';
    }
  }

  // مؤشر وضع اللعب
  const modeBadge = document.getElementById('q-mode-badge');
  if (modeBadge && window._gameModeId) {
    const modeNames = {
      classic:'كلاسيكي', blitz:'برق⚡', hearts:'قلوب❤️', endless:'لا نهاية∞',
      perfect:'الكمال✨', ascending:'تصاعد📈', sudden:'ضربة واحدة', memory:'ذاكرة🧠',
      easy:'سهل🌱', hard:'صعب🔥', study:'مذاكرة📖', marathon:'ماراثون🏃',
    };
    modeBadge.innerText = modeNames[window._gameModeId] || '';
    modeBadge.style.display = modeBadge.innerText ? 'inline-flex' : 'none';
  }

  // جلب الأسئلة
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

// ══════════════════════════════════════════════
// عرض السؤال مع Skeleton
// ══════════════════════════════════════════════
export function showQuestion() {
  // haptic
  if (navigator.vibrate) navigator.vibrate(8);

  const sk  = document.getElementById('skeleton-loading');
  const ob  = document.getElementById('options-box');
  const ana = document.getElementById('analysis-container');

  // أظهر الـ skeleton وأخفِ الخيارات
  if (sk)  { sk.style.display  = 'flex'; sk.style.flexDirection = 'column'; sk.style.gap = '10px'; }
  if (ob)  { ob.style.display  = 'none'; ob.innerHTML = ''; }
  if (ana) ana.style.display   = 'none';

  setTimeout(() => {
    if (sk) sk.style.display = 'none';
    if (ob) ob.style.display = 'block';
    _renderQuestion();
  }, 320);
}
window.showQuestion = showQuestion;

// ══════════════════════════════════════════════
// رندر السؤال الفعلي
// ══════════════════════════════════════════════
function _renderQuestion() {
  if (currentIdx >= currentQuestions.length) { finishQuiz(); return; }
  startTimer();

  const q = currentQuestions[currentIdx];
  const total = currentQuestions.length;

  document.getElementById('q-counter').innerText  = `السؤال ${currentIdx+1}/${total}`;
  document.getElementById('q-progress').style.width = ((currentIdx+1)/total*100) + '%';
  document.getElementById('q-percent').innerText  = Math.round((currentIdx+1)/total*100) + '%';
  document.getElementById('q-text').innerText     = q.t;
  document.getElementById('analysis-container').style.display = 'none';
  document.getElementById('btn-analyze').style.display = 'none';

  const box     = document.getElementById('options-box');
  box.innerHTML = '';
  const LETTERS = ['A','B','C','D'];

  (q.a || []).forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className = 'btn-option';
    btn.style.cssText = 'display:flex;align-items:center;gap:12px;width:100%;text-align:right;margin-bottom:10px;';

    // حرف A/B/C/D
    const letter = document.createElement('span');
    letter.className  = 'option-letter';
    letter.innerText  = LETTERS[i] || String(i+1);

    // نص الخيار
    const text = document.createElement('span');
    text.style.cssText = 'flex:1;text-align:right;font-size:clamp(13px,3.5vw,15px);font-weight:700;line-height:1.5;';
    text.innerText = opt;

    btn.appendChild(letter);
    btn.appendChild(text);
    btn.onclick = () => selectAnswer(i, btn);
    box.appendChild(btn);

    // ظهور تدريجي (staggered)
    btn.style.opacity   = '0';
    btn.style.transform = 'translateY(10px)';
    btn.style.transition = `opacity .25s ${i*0.06}s, transform .25s ${i*0.06}s`;
    requestAnimationFrame(() => {
      btn.style.opacity   = '1';
      btn.style.transform = 'translateY(0)';
    });
  });
}

// ══════════════════════════════════════════════
// التايمر مع حلقة SVG
// ══════════════════════════════════════════════
function startTimer() {
  _TOTAL_TIME = window._modeBlitz      ? 7
              : window._modeCustom?.time
              || (window._modeAscending ? Math.max(5, 15-((window._modeLevel||1)-1)*2) : 15);
  timeLeft = _TOTAL_TIME;

  const tb   = document.getElementById('timer-box');
  const tf   = document.getElementById('timer-bar-fill');
  const ring = document.getElementById('timer-ring-fill');
  const CIRCUMFERENCE = 138; // 2π×22

  // إعادة التعيين
  if (tb)   { tb.innerText = timeLeft; tb.classList.remove('warning'); tb.style.color = '#60a5fa'; }
  if (tf)   { tf.style.transition='none'; tf.style.width='100%'; tf.style.background='linear-gradient(90deg,#22c55e,#fbbf24)'; }
  if (ring) { ring.style.strokeDashoffset='0'; ring.style.stroke='#f97316'; }

  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    timeLeft--;
    const pct = timeLeft / _TOTAL_TIME;

    if (tb) {
      tb.innerText = timeLeft;
      if (timeLeft <= 5) {
        tb.classList.add('warning');
        tb.style.color = '#ef4444';
      }
    }

    // حلقة SVG
    if (ring) {
      ring.style.strokeDashoffset = String(CIRCUMFERENCE * (1 - pct));
      ring.style.stroke = timeLeft <= 5 ? '#ef4444'
                        : timeLeft <= Math.floor(_TOTAL_TIME*.4) ? '#fbbf24'
                        : '#f97316';
    }

    // شريط الوقت
    if (tf) {
      tf.style.transition = 'width .9s linear';
      tf.style.width      = (pct * 100) + '%';
      if (timeLeft <= 5)                   tf.style.background = 'linear-gradient(90deg,#dc2626,#ef4444)';
      else if (timeLeft <= Math.floor(_TOTAL_TIME*.5)) tf.style.background = 'linear-gradient(90deg,#f59e0b,#fbbf24)';
    }

    if (timeLeft === 5) playSound('snd-warn');

    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      playSound('snd-timeout');
      if (navigator.vibrate) navigator.vibrate([80,40,80]);
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

  // إيقاف حلقة التايمر بصريًا
  const ring = document.getElementById('timer-ring-fill');
  if (ring) { ring.style.strokeDashoffset = '138'; ring.style.stroke = '#ef4444'; }

  document.getElementById('analysis-text').innerText = '⏰ انتهى الوقت! الإجابة الصحيحة بالأخضر.';
  document.getElementById('analysis-container').style.display = 'block';
  window.gameData.stats.currentStreak = 0;

  // ── Hearts mode ──
  _loseHeart();
  updateUI();
}

// ── خسارة قلب (hearts mode) ──
function _loseHeart() {
  if (!window._modeHearts) return;
  window._modeHeartsLeft = (window._modeHeartsLeft ?? window._modeHearts) - 1;
  const lost = window._modeHearts - window._modeHeartsLeft;
  const heartEl = document.getElementById(`heart-${window._modeHearts - lost}`);
  if (heartEl) heartEl.classList.add('lost');
  if (window._modeHeartsLeft <= 0) {
    setTimeout(() => { showToast('💔 نفدت القلوب!'); finishQuiz(); }, 900);
  }
}

// ══════════════════════════════════════════════
// اختيار الإجابة
// ══════════════════════════════════════════════
export function selectAnswer(i, btn) {
  clearInterval(timerInterval);

  const tf   = document.getElementById('timer-bar-fill');
  const ring = document.getElementById('timer-ring-fill');
  if (tf)   { tf.style.transition='none'; tf.style.width='0%'; }
  if (ring) { ring.style.strokeDashoffset='138'; }

  const q = currentQuestions[currentIdx];
  document.querySelectorAll('.btn-option').forEach(b => b.disabled = true);

  if (i === q.c) {
    // ── إجابة صحيحة ──
    btn.classList.add('correct');

    // Haptic نبضتين قصيرتين = "صح"
    if (navigator.vibrate) navigator.vibrate([12, 8, 12]);

    // Confetti صغير
    _miniConfetti();

    playSound('snd-correct');

    const earned = 20 + (timeLeft * 2);
    quizCoins += earned; quizXP += 50; quizCorrect++;
    window.gameData.coins      += earned;
    window.gameData.xp         += 50;
    window.gameData.stats.correctAnswers++;
    window.gameData.stats.currentStreak++;
    window.gameData.stats.totalCoinsEarned = (window.gameData.stats.totalCoinsEarned||0) + earned;

    if (window.gameData.stats.currentStreak > window.gameData.stats.maxStreak)
      window.gameData.stats.maxStreak = window.gameData.stats.currentStreak;

    updateDailyTask('win_5',   1);
    updateDailyTask('earn_500', earned);
    updateWeeklyTask('w_correct_30', 1);
    if (window.gameData.stats.currentStreak === 10) updateWeeklyTask('w_streak_10', 10);
    addSeasonXP(10);
    if (window.gameData.stats.currentStreak >= 3) updateDailyTask('streak_3', 3);

    // تفاصيل إضافية
    if (!window.gameData.detailedStats) window.gameData.detailedStats = {};
    const ds = window.gameData.detailedStats;
    if (timeLeft >= 12) ds.speedAnswers = (ds.speedAnswers||0)+1;
    const answerTime = _TOTAL_TIME - timeLeft;
    ds.totalAnswerTime = (ds.totalAnswerTime||0) + answerTime;
    ds.totalAnswers    = (ds.totalAnswers||0) + 1;
    ds.avgAnswerTime   = parseFloat((ds.totalAnswerTime/ds.totalAnswers).toFixed(1));
    if (!ds.categoriesPlayed) ds.categoriesPlayed = [];
    if (selectedCategory && !ds.categoriesPlayed.includes(selectedCategory))
      ds.categoriesPlayed.push(selectedCategory);

    // Toast سلاسل
    const s = window.gameData.stats.currentStreak;
    if (s===3)  showToast('🔥 3 متتالية! رائع!');
    if (s===5)  showToast('⚡ 5 متتالية! أنت في القمة!');
    if (s===7)  showToast('💎 7 متتالية! خارق!');
    if (s===10) showToast('👑 10 متتالية! أسطورة!', 4000);
    if (s===15) showToast('🌟 15 متتالية! لا يُصدق!', 4000);

    if (isRoomGame && window.currentRoomId) window.syncRoomScore?.();

  } else {
    // ── إجابة خاطئة ──
    btn.classList.add('wrong');

    // Haptic نبضة طويلة = "خطأ"
    if (navigator.vibrate) navigator.vibrate([60, 30, 60]);

    window._wrongAnswers = window._wrongAnswers || [];
    window._wrongAnswers.push({ q:q.t, correct:q.a[q.c], explanation:q.x||'' });

    document.querySelectorAll('.btn-option')[q.c]?.classList.add('correct');
    playSound('snd-wrong');
    document.getElementById('btn-analyze').style.display = '';
    quizWrong++;
    window.gameData.stats.currentStreak = 0;
    if (quizWrong >= 3) window._hadBadStreak = true;

    _loseHeart();
  }

  document.getElementById('analysis-text').innerText = q.x || 'معلومة قيمة تضاف لرصيدك!';
  document.getElementById('analysis-container').style.display = 'block';

  // تسجيل التاريخ الأسبوعي
  const tod = new Date().getDay();
  if (!window.gameData.detailedStats)              window.gameData.detailedStats = {};
  if (!window.gameData.detailedStats.weeklyHistory) window.gameData.detailedStats.weeklyHistory = [0,0,0,0,0,0,0];
  window.gameData.detailedStats.weeklyHistory[tod] = (window.gameData.detailedStats.weeklyHistory[tod]||0) + (i===q.c ? 1 : 0);

  checkLevel(); saveData(); updateUI();
  if (typeof window.saveGameSession === 'function') window.saveGameSession();
}
window.selectAnswer = selectAnswer;

// ══════════════════════════════════════════════
// Confetti صغير (بدون CDN fallback)
// ══════════════════════════════════════════════
function _miniConfetti() {
  if (typeof confetti !== 'undefined') {
    confetti({ particleCount:55, spread:65, origin:{y:.82}, colors:['#f97316','#fbbf24','#22c55e','#a78bfa'] });
  } else {
    // fallback: إنشاء جزيئات CSS بسيطة
    for (let k=0; k<10; k++) {
      const dot = document.createElement('div');
      dot.style.cssText = `position:fixed;z-index:9998;pointer-events:none;
        width:7px;height:7px;border-radius:50%;
        background:${['#fbbf24','#f97316','#22c55e','#60a5fa'][k%4]};
        left:${30+Math.random()*40}vw;top:60vh;
        animation:confettiDot .9s forwards ease-out;
        --dx:${(Math.random()-.5)*120}px;--dy:${-80-Math.random()*80}px`;
      document.body.appendChild(dot);
      setTimeout(() => dot.remove(), 900);
    }
  }
}
window._miniConfetti = _miniConfetti;

// ══════════════════════════════════════════════
// السؤال التالي
// ══════════════════════════════════════════════
export function nextQuestion() {
  currentIdx++;
  showQuestion();
}
window.nextQuestion = nextQuestion;

// ══════════════════════════════════════════════
// وسائل المساعدة
// ══════════════════════════════════════════════
export function useHelper(type) {
  const inv = type === 'del' ? 'delete' : type;
  if ((window.gameData.inventory[inv] ?? 0) <= 0) {
    showToast('❌ لا يوجد رصيد — اشترِ من المتجر');
    return;
  }
  window._usedHelperThisGame = true;
  const q = currentQuestions[currentIdx];
  if (!q) return;

  if (document.getElementById('analysis-container').style.display !== 'none' && type !== 'skip') {
    showToast('تم الإجابة بالفعل!'); return;
  }

  if (type === 'delete') {
    const btns = document.querySelectorAll('.btn-option');
    let rm = 0;
    btns.forEach((b, i) => {
      if (i !== q.c && !b.disabled && !b.classList.contains('eliminated') && rm < 2) {
        b.classList.add('eliminated'); b.disabled = true; rm++;
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

// ══════════════════════════════════════════════
// إنهاء الكويز
// ══════════════════════════════════════════════
async function finishQuiz() {
  clearInterval(timerInterval);

  window.gameData.stats.gamesPlayed++;
  addSeasonXP(50);
  updateWeeklyTask('w_games_5', 1);

  // تتبع التصنيفات
  if (selectedCategory && selectedCategory !== 'التحدي الأسبوعي' && selectedCategory !== 'تحدي اليوم') {
    const catsToday = window.gameData._catsToday || [];
    if (!catsToday.includes(selectedCategory)) {
      catsToday.push(selectedCategory);
      window.gameData._catsToday = catsToday;
      updateDailyTask('play_cats', catsToday.length);
    }
  }

  // تقدم الخريطة
  const catKeys = Object.keys(categoryConfig);
  const curKey  = catKeys.find(k => categoryConfig[k].name === selectedCategory);
  if (curKey) {
    if (!window.gameData._mapProgress) window.gameData._mapProgress = [];
    if (!window.gameData._mapProgress.includes(curKey)) window.gameData._mapProgress.push(curKey);
    if (!window.gameData._subProgress) window.gameData._subProgress = {};
    window.gameData._subProgress[curKey] = (window.gameData._subProgress[curKey]||0) + 1;
    window.gameData.stats.completedSections++;
  }

  // تحدي اليوم
  if (isDailyChallenge) {
    window.gameData.dailyChallengeDate  = new Date().toDateString();
    window.gameData.dailyChallengeScore = quizCorrect;
    window.gameData.stats.dailyChallengesWon = (window.gameData.stats.dailyChallengesWon||0)+1;
    updateDailyTask('daily_ch', 1);
    updateWeeklyTask('w_daily_3', 1);
    addSeasonXP(100);
    if (window.gameData.seasonData) window.gameData.seasonData.challengesDone = (window.gameData.seasonData.challengesDone||0)+1;
    if (window.firebaseReady && window.currentUser) {
      try {
        await window.db_set(
          `artifacts/${APP_ID}/public/data/daily_${new Date().toISOString().slice(0,10)}/${window.currentUser.uid}`,
          { username:window.gameData.username, avatar:window.gameData.avatar, score:quizCorrect, uid:window.currentUser.uid, ts:Date.now() },
          true
        );
      } catch(e) {}
    }
  }

  // تحدي أسبوعي
  if (isWeeklyChallenge) {
    const weekId = window.getWeekId?.() || '';
    const reward = 1000 + (quizCorrect * 50);
    window.gameData.weeklyChallenge = { weekId, score:quizCorrect, completed:true, reward };
    window.gameData.coins += reward;
    addSeasonXP(200);
    if (window.gameData.seasonData) window.gameData.seasonData.weeklyDone = (window.gameData.seasonData.weeklyDone||0)+1;
    showToast(`🏆 أنهيت التحدي الأسبوعي! +${reward} عملة!`, 5000);
    if (window.firebaseReady && window.currentUser) {
      try {
        await window.db_set(
          `artifacts/${APP_ID}/public/data/weekly_${weekId}/${window.currentUser.uid}`,
          { username:window.gameData.username, score:quizCorrect, level:window.gameData.level, uid:window.currentUser.uid, ts:Date.now() },
          true
        );
      } catch(e) {}
    }
    const wAchv = window.gameData.achievements?.find(a => a.id==='weekly_win');
    if (wAchv && !wAchv.earned) { wAchv.earned=true; showToast('🏆 إنجاز: فاز بتحدي أسبوعي!',4000); }
    isWeeklyChallenge = false;
  }

  // إنجازات
  if (quizWrong===0 && quizCorrect>=10) {
    const p = window.gameData.achievements?.find(a => a.id==='perfect');
    if (p && !p.earned) { p.earned=true; showToast('⭐ إنجاز: 10/10 مثالي!'); }
  }
  if (!window._usedHelperThisGame) {
    if (!window.gameData.detailedStats) window.gameData.detailedStats = {};
    window.gameData.detailedStats.noHintGames = (window.gameData.detailedStats.noHintGames||0)+1;
  }
  if (window._hadBadStreak && quizCorrect>=7) {
    if (!window.gameData.detailedStats) window.gameData.detailedStats = {};
    window.gameData.detailedStats.comebackWins = (window.gameData.detailedStats.comebackWins||0)+1;
    showToast('💪 Comeback! إنجاز رائع!');
  }

  window._usedHelperThisGame = false;
  window._hadBadStreak       = false;

  if (isRoomGame) await window.finishRoomGame?.();
  if (typeof window.clearGameSession === 'function') window.clearGameSession();

  saveData();
  playSound('snd-win');

  // Confetti النهاية
  const pct = Math.round((quizCorrect / currentQuestions.length) * 100);
  if (typeof confetti !== 'undefined' && pct >= 40) {
    confetti({ particleCount: pct>=80?200:100, spread:110, origin:{y:.5}, colors:['#fbbf24','#f59e0b','#fff','#22c55e'] });
  }
  if (navigator.vibrate) navigator.vibrate(pct>=80 ? [50,30,50,30,100] : [80]);

  // شاشة النتيجة
  let emoji='😊', title='أحسنت!';
  if (pct===100) { emoji='🏆'; title='مثالي 100%!'; }
  else if (pct>=80) { emoji='🌟'; title='ممتاز!'; }
  else if (pct>=60) { emoji='😊'; title='جيد جداً!'; }
  else if (pct>=40) { emoji='💪'; title='تحتاج تدريب!'; }
  else              { emoji='😅'; title='حاول مجدداً!'; }

  document.getElementById('result-emoji').innerText     = emoji;
  document.getElementById('result-title').innerText     = title;
  document.getElementById('result-subtitle').innerText  = `${pct}% إجابات صحيحة`;
  document.getElementById('res-correct').innerText      = quizCorrect;
  document.getElementById('res-wrong').innerText        = quizWrong;
  document.getElementById('res-coins').innerText        = `+${quizCoins} 💰`;
  document.getElementById('res-xp').innerText           = `+${quizXP} XP`;

  navTo('result');
}

// ══════════════════════════════════════════════
// تحليل ذكي (AI)
// ══════════════════════════════════════════════
export async function askAIAnalysis() {
  showToast('❌ الـ AI Analysis غير مفعّل حالياً');
}
window.askAIAnalysis = askAIAnalysis;

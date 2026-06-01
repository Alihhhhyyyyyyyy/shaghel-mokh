// js/modes.js — أوضاع اللعب الجديدة: روليت + بطاقات + 1vs1
import { db, APP_ID } from './firebase.js';
import { showToast, playSound } from './helpers.js';
import { navTo } from './ui.js';

const categoryConfig = {
  islamic: { name:'إسلاميات',     icon:'🕌', subs:['فقه وعبادات','سيرة نبوية','قرآن كريم','أحاديث شريفة'] },
  egypt:   { name:'تاريخ مصر',    icon:'🏛️', subs:['فراعنة','العصر الإسلامي','مصر الحديثة','ثورات مصر'] },
  tech:    { name:'تقنية',         icon:'💻', subs:['برمجة','ذكاء اصطناعي','شبكات','أجهزة'] },
  science: { name:'علوم وفضاء',   icon:'🔬', subs:['فيزياء','كيمياء','أحياء','فلك'] },
  geo:     { name:'جغرافيا',       icon:'🌍', subs:['عواصم','أنهار وجبال','دول العالم','خرائط'] },
  sports:  { name:'رياضة',         icon:'⚽', subs:['كرة قدم','كرة سلة','رياضات أخرى','أبطال'] },
  puzzles: { name:'ألغاز',         icon:'🧩', subs:['ألغاز منطقية','رياضيات','معادلات','ألغاز لغوية'] },
  food:    { name:'طعام',          icon:'🍽️', subs:['مطبخ مصري','مطبخ عربي','مطبخ عالمي','مشروبات'] },
  cairo:   { name:'أحياء القاهرة', icon:'🏙️', subs:['القاهرة القديمة','القاهرة الحديثة','ضواحي','شوارع'] },
  words:   { name:'كلمات مصرية',  icon:'💬', subs:['أصول الكلمات','أمثال شعبية','لهجات','معاني'] },
  music:   { name:'موسيقى وأغاني',icon:'🎵', subs:['كلاسيكيات','أغاني حديثة','موسيقيون','فرق'] },
  cinema:  { name:'سينما وتليفزيون',icon:'🎬', subs:['أفلام مصرية','مسلسلات','ممثلون','مخرجون'] },
};

const COLORS = ['#f97316','#fbbf24','#22c55e','#60a5fa','#a78bfa','#f472b6',
                '#34d399','#fb923c','#818cf8','#38bdf8','#4ade80','#e879f9'];

// ════════════════════════════════════════════════
//  1.  R O U L E T T E
// ════════════════════════════════════════════════
let _spinning = false;
let _rResult  = null;
let _rotDeg   = 0; // current wheel rotation (persists across spins)

export function openRoulette() {
  _spinning = false; _rResult = null;
  const m = document.getElementById('modal-roulette');
  if (!m) return;
  _resetRouletteUI();
  m.style.display = 'flex';
  drawWheel(_rotDeg);
}
window.openRoulette = openRoulette;

export function closeRoulette() {
  const m = document.getElementById('modal-roulette');
  if (m) m.style.display = 'none';
}
window.closeRoulette = closeRoulette;

function _resetRouletteUI() {
  const btn   = document.getElementById('roulette-spin-btn');
  const start = document.getElementById('roulette-start-btn');
  const lbl   = document.getElementById('roulette-result-lbl');
  if (btn)   { btn.disabled = false; btn.style.opacity = '1'; btn.innerText = 'دوّر 🎰'; }
  if (start) start.style.display = 'none';
  if (lbl)   lbl.innerText = 'دوّر العجلة واكتشف تصنيفك!';
}

function drawWheel(rotDeg) {
  const canvas = document.getElementById('roulette-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const R   = canvas.width / 2;
  const cats = Object.values(categoryConfig);
  const n   = cats.length;
  const arc = (2 * Math.PI) / n;
  const rot = (rotDeg * Math.PI) / 180;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(R, R);
  ctx.rotate(rot);
  ctx.translate(-R, -R);

  cats.forEach((cat, i) => {
    const sa = i * arc, ea = sa + arc;
    ctx.beginPath(); ctx.moveTo(R, R);
    ctx.arc(R, R, R - 3, sa, ea); ctx.closePath();
    ctx.fillStyle = COLORS[i % COLORS.length]; ctx.fill();
    ctx.strokeStyle = '#111'; ctx.lineWidth = 1.5; ctx.stroke();

    ctx.save();
    ctx.translate(R, R); ctx.rotate(sa + arc / 2);
    ctx.textAlign = 'right';
    ctx.font = 'bold 10px Tajawal,sans-serif'; ctx.fillStyle = 'rgba(0,0,0,.85)';
    ctx.fillText(cat.icon + ' ' + cat.name, R - 10, 3.5);
    ctx.restore();
  });

  // center
  ctx.restore();
  ctx.beginPath(); ctx.arc(R, R, 20, 0, 2 * Math.PI);
  ctx.fillStyle = '#0d0d0d'; ctx.fill();
  ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 3; ctx.stroke();
  ctx.fillStyle = '#fbbf24'; ctx.font = 'bold 13px Tajawal,sans-serif';
  ctx.textAlign = 'center'; ctx.fillText('▶', R + 1, R + 5);
}

export function spinRoulette() {
  if (_spinning) return;
  _spinning = true;
  const btn = document.getElementById('roulette-spin-btn');
  if (btn) { btn.disabled = true; btn.style.opacity = '.4'; }
  if (navigator.vibrate) navigator.vibrate([30, 20, 30]);

  const cats  = Object.values(categoryConfig);
  const n     = cats.length;
  const arc   = 360 / n;
  const idx   = Math.floor(Math.random() * n);
  const extra = 5 * 360 + (360 - idx * arc - arc / 2);

  const startDeg = _rotDeg;
  const endDeg   = startDeg + extra;
  const duration = 3600;
  const t0       = performance.now();

  const frame = (now) => {
    const pct = Math.min((now - t0) / duration, 1);
    const ease = 1 - Math.pow(1 - pct, 4);
    _rotDeg = startDeg + ease * (endDeg - startDeg);
    drawWheel(_rotDeg);

    if (pct < 1) { requestAnimationFrame(frame); return; }

    // Done
    _rotDeg = _rotDeg % 360;
    _rResult = cats[idx];
    _spinning = false;

    const lbl   = document.getElementById('roulette-result-lbl');
    const start = document.getElementById('roulette-start-btn');
    if (lbl)   lbl.innerText = `${_rResult.icon}  ${_rResult.name}!`;
    if (start) { start.style.display = 'flex'; start.innerText = `ابدأ في ${_rResult.name} 🎮`; }
    if (btn)   { btn.innerText = 'دوّر تاني 🔄'; btn.disabled = false; btn.style.opacity = '1'; }

    if (navigator.vibrate) navigator.vibrate([50, 30, 100]);
    if (typeof confetti !== 'undefined')
      confetti({ particleCount:90, spread:70, origin:{y:.5},
                 colors:[COLORS[idx % COLORS.length],'#fbbf24','#fff'] });
  };
  requestAnimationFrame(frame);
}
window.spinRoulette = spinRoulette;

export function startRouletteGame() {
  if (!_rResult) return;
  closeRoulette();
  const sub = _rResult.subs[Math.floor(Math.random() * _rResult.subs.length)];
  window.openGameMode?.(_rResult.name, sub, _rResult.icon);
}
window.startRouletteGame = startRouletteGame;


// ════════════════════════════════════════════════
//  2.  F L A S H C A R D S
// ════════════════════════════════════════════════
let _fcCards = [], _fcIdx = 0;
let _fcKnown = new Set(), _fcReview = new Set();
let _fcFlipped = false, _fcCat = '', _fcSub = '';
const FALLBACK_Q = [
  {t:'ما عاصمة مصر؟',              a:['القاهرة','الإسكندرية','أسوان','الجيزة'], c:0, x:'القاهرة عاصمة مصر وأكبر مدنها'},
  {t:'كم عدد أركان الإسلام؟',     a:['3','4','5','6'],                          c:2, x:'الشهادتان الصلاة الزكاة الصوم الحج'},
  {t:'أكبر كوكب في المجموعة الشمسية؟', a:['زحل','المشتري','أورانوس','نبتون'],  c:1, x:'المشتري أكبر من الأرض بـ 1300 مرة'},
  {t:'من اخترع الهاتف؟',           a:['إديسون','فاراداي','غراهام بيل','نيوتن'], c:2, x:'غراهام بيل اخترع الهاتف 1876'},
  {t:'كم يوماً في السنة الكبيسة؟', a:['364','365','366','367'],                 c:2, x:'السنة الكبيسة 366 يوماً'},
];

export async function openFlashcards(cat, sub) {
  _fcCat = cat; _fcSub = sub;
  _fcKnown.clear(); _fcReview.clear();
  _fcIdx = 0; _fcFlipped = false;
  navTo('flashcards');

  // skeleton while loading
  const front = document.getElementById('fc-front');
  if (front) front.innerHTML = `
    <div class="skeleton-opt" style="height:60px;margin-bottom:10px"></div>
    <div class="skeleton-opt" style="height:20px;width:60%;margin:0 auto"></div>`;

  let pool = [];
  try {
    if (window.firebaseReady && db) {
      const { getDocs, collection, query, where } = await import(
        'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js');
      const snap = await getDocs(query(
        collection(db,'artifacts',APP_ID,'public','data','questions'),
        where('category','==',cat), where('subCategory','==',sub)));
      snap.forEach(d => pool.push({id:d.id,...d.data()}));
    }
  } catch(e) {}

  _fcCards = (pool.length >= 3 ? pool : FALLBACK_Q)
              .sort(() => .5 - Math.random());
  renderFC();
}
window.openFlashcards = openFlashcards;

export function renderFC() {
  const inner   = document.getElementById('fc-inner');
  const front   = document.getElementById('fc-front');
  const back    = document.getElementById('fc-back');
  const counter = document.getElementById('fc-counter');
  const prog    = document.getElementById('fc-progress');
  const kCnt    = document.getElementById('fc-known-cnt');
  const rCnt    = document.getElementById('fc-review-cnt');
  const knownBtn  = document.getElementById('fc-known-btn');
  const reviewBtn = document.getElementById('fc-review-btn');
  const flipBtn   = document.getElementById('fc-flip-btn');
  const restartBtn= document.getElementById('fc-restart-btn');

  _fcFlipped = false;
  if (inner)     inner.style.transform = 'rotateY(0deg)';
  if (knownBtn)  knownBtn.style.display  = 'none';
  if (reviewBtn) reviewBtn.style.display = 'none';
  if (flipBtn)   flipBtn.style.display   = 'flex';
  if (restartBtn)restartBtn.style.display= 'none';

  const tot = _fcCards.length;
  const done= _fcKnown.size + _fcReview.size;
  if (prog)  prog.style.width  = (done / tot * 100) + '%';
  if (kCnt)  kCnt.innerText   = `✅ ${_fcKnown.size}`;
  if (rCnt)  rCnt.innerText   = `🔁 ${_fcReview.size}`;

  if (_fcIdx >= tot) {
    if (front) front.innerHTML = `
      <div style="text-align:center;padding:10px">
        <div style="font-size:64px;margin-bottom:12px">🎉</div>
        <h3 style="font-size:22px;font-weight:900;color:#fff;margin-bottom:8px">انتهيت!</h3>
        <p style="color:var(--text2);font-size:13px">✅ ${_fcKnown.size} عارفها &nbsp;•&nbsp; 🔁 ${_fcReview.size} للمراجعة</p>
      </div>`;
    if (back) back.innerHTML = '';
    if (flipBtn)    flipBtn.style.display    = 'none';
    if (restartBtn) restartBtn.style.display = 'flex';
    if (counter)    counter.innerText = `${tot}/${tot}`;
    return;
  }

  const q = _fcCards[_fcIdx];
  const L = ['A','B','C','D'];
  if (counter) counter.innerText = `${_fcIdx+1} / ${tot}`;

  if (front) front.innerHTML = `
    <div style="font-size:10px;font-weight:900;color:var(--accent);letter-spacing:.08em;margin-bottom:14px">
      ${_fcCat} • ${_fcSub}</div>
    <p style="font-size:18px;font-weight:700;color:#fff;line-height:1.65;text-align:center">${q.t}</p>
    <div style="margin-top:18px;font-size:11px;font-weight:700;color:var(--text2)">👆 اضغط للقلب</div>`;

  if (back) back.innerHTML = `
    <div style="font-size:10px;font-weight:900;color:#22c55e;letter-spacing:.08em;margin-bottom:12px">✅ الإجابة الصحيحة</div>
    <div style="background:rgba(34,197,94,.12);border:1.5px solid rgba(34,197,94,.3);border-radius:16px;
                padding:12px 16px;margin-bottom:14px;display:flex;align-items:center;gap:10px">
      <span style="background:#22c55e;color:#000;font-weight:900;font-size:11px;
                   padding:3px 9px;border-radius:8px">${L[q.c]}</span>
      <span style="font-size:16px;font-weight:900;color:#fff">${q.a[q.c]}</span>
    </div>
    ${q.x ? `<div style="background:rgba(251,191,36,.07);border:1px solid rgba(251,191,36,.15);
                border-radius:14px;padding:12px 14px">
               <p style="font-size:12px;font-weight:700;color:#cbd5e1;line-height:1.75">${q.x}</p>
             </div>` : ''}`;
}
window.renderFC = renderFC;

export function flipFC() {
  const inner = document.getElementById('fc-inner');
  if (!inner) return;
  _fcFlipped = !_fcFlipped;
  inner.style.transform = _fcFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)';
  if (navigator.vibrate) navigator.vibrate(12);

  document.getElementById('fc-known-btn').style.display  = _fcFlipped ? 'flex'  : 'none';
  document.getElementById('fc-review-btn').style.display = _fcFlipped ? 'flex'  : 'none';
  document.getElementById('fc-flip-btn').style.display   = _fcFlipped ? 'none'  : 'flex';
}
window.flipFC = flipFC;

export function markFC(known) {
  if (known) { _fcKnown.add(_fcIdx); _fcReview.delete(_fcIdx); if(navigator.vibrate) navigator.vibrate([12,8,12]); }
  else       { _fcReview.add(_fcIdx); _fcKnown.delete(_fcIdx); if(navigator.vibrate) navigator.vibrate(60); }

  const outer = document.getElementById('fc-outer');
  if (outer) {
    outer.style.transition = 'transform .25s, opacity .25s';
    outer.style.transform  = known ? 'translateX(110px)' : 'translateX(-110px)';
    outer.style.opacity    = '0';
    setTimeout(() => {
      outer.style.transition = 'none';
      outer.style.transform  = '';
      outer.style.opacity    = '1';
      requestAnimationFrame(() => { outer.style.transition = 'transform .25s, opacity .25s'; _fcIdx++; renderFC(); });
    }, 250);
  } else { _fcIdx++; renderFC(); }
}
window.markFC = markFC;

export function restartFC() {
  _fcIdx = 0; _fcKnown.clear(); _fcReview.clear();
  _fcCards = [..._fcCards].sort(() => .5 - Math.random());
  renderFC();
}
window.restartFC = restartFC;


// ════════════════════════════════════════════════
//  3.  1 v s 1  DIRECT CHALLENGE
// ════════════════════════════════════════════════
let _cvListener = null;
let _cvId   = null;
let _cvRole = null;   // 'host' | 'guest'
let _cvQs   = [];
let _cvIdx  = 0;
let _cvMyScore    = 0;
let _cvTheirScore = 0;

export function open1v1(cat, sub) {
  const m = document.getElementById('modal-1v1');
  if (!m) return;
  document.getElementById('1v1-cat-lbl').innerText = `${cat} • ${sub}`;
  m.dataset.cat = cat; m.dataset.sub = sub;
  m.style.display = 'flex';
}
window.open1v1 = open1v1;

export function close1v1() {
  const m = document.getElementById('modal-1v1');
  if (m) m.style.display = 'none';
}
window.close1v1 = close1v1;

export async function create1v1() {
  if (!window.currentUser) { showToast('❌ يجب تسجيل الدخول'); return; }
  const m   = document.getElementById('modal-1v1');
  const cat = m.dataset.cat, sub = m.dataset.sub;

  let pool = await _fetchPool(cat, sub);
  _cvQs   = pool.sort(() => .5 - Math.random()).slice(0, 10);
  _cvId   = Math.random().toString(36).slice(2,8).toUpperCase();
  _cvRole = 'host';

  try {
    await window.db_set(`artifacts/${APP_ID}/public/data/challenges/${_cvId}`, {
      cat, sub, questions: _cvQs,
      host:  { uid: window.currentUser.uid, username: window.gameData?.username||'أنت', score:0, done:false },
      guest: null, status:'waiting', ts: Date.now()
    }, false);
  } catch(e) { showToast('❌ فشل إنشاء التحدي'); return; }

  close1v1();
  _listen1v1(_cvId);
  _show1v1Waiting(_cvId);
}
window.create1v1 = create1v1;

export async function join1v1() {
  const code = document.getElementById('1v1-join-input')?.value?.trim().toUpperCase();
  if (!code) { showToast('❌ أدخل الكود'); return; }
  if (!window.currentUser) { showToast('❌ يجب تسجيل الدخول'); return; }

  try {
    const snap = await window.db_get(`artifacts/${APP_ID}/public/data/challenges/${code}`);
    if (!snap || !snap.exists()) { showToast('❌ كود غير موجود'); return; }
    const d = snap.data();
    if (d.status !== 'waiting') { showToast('❌ التحدي بدأ بالفعل'); return; }

    _cvId = code; _cvRole = 'guest'; _cvQs = d.questions;

    await window.db_set(`artifacts/${APP_ID}/public/data/challenges/${code}`, {
      guest: { uid: window.currentUser.uid, username: window.gameData?.username||'ضيف', score:0, done:false },
      status:'ready'
    }, true);

    close1v1();
    _listen1v1(code);
    _start1v1();
  } catch(e) { showToast('❌ خطأ في الانضمام'); }
}
window.join1v1 = join1v1;

function _listen1v1(code) {
  if (_cvListener) { _cvListener(); _cvListener = null; }
  _cvListener = window.db_snap(`artifacts/${APP_ID}/public/data/challenges/${code}`, snap => {
    if (!snap?.exists()) return;
    const d = snap.data();
    const myK    = _cvRole === 'host' ? 'host' : 'guest';
    const theirK = _cvRole === 'host' ? 'guest' : 'host';

    if (d.status === 'ready' && _cvRole === 'host') {
      showToast(`⚔️ ${d.guest?.username} انضم! ابدأ الآن`);
      _cvQs = d.questions;
      _start1v1();
    }

    const theirScore = d[theirK]?.score ?? 0;
    if (_cvTheirScore !== theirScore) {
      _cvTheirScore = theirScore;
      const el = document.getElementById('1v1-their-score');
      if (el) { el.innerText = theirScore; _pop(el); }
    }

    if (d[myK]?.done && d[theirK]?.done) _finish1v1(d);
  });
}

function _show1v1Waiting(code) {
  navTo('1v1');
  const s = document.getElementById('screen-1v1');
  if (!s) return;
  s.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;
                height:100%;gap:18px;text-align:center">
      <div style="font-size:56px">⚔️</div>
      <h2 style="font-size:22px;font-weight:900;color:#fff">في انتظار المنافس</h2>
      <div style="background:rgba(251,191,36,.08);border:2px dashed rgba(251,191,36,.3);
                  border-radius:22px;padding:22px 44px">
        <div style="font-size:11px;font-weight:700;color:var(--text2);margin-bottom:10px">كود التحدي</div>
        <div style="font-size:38px;font-weight:900;color:var(--accent);letter-spacing:.22em">${code}</div>
      </div>
      <button onclick="navigator.clipboard.writeText('${code}').then(()=>window.showToast('📋 تم النسخ!'))"
        style="background:rgba(251,191,36,.1);color:var(--accent);border:1px solid rgba(251,191,36,.2);
               border-radius:14px;padding:12px 26px;font-weight:900;font-size:13px;cursor:pointer;font-family:'Tajawal',sans-serif">
        📋 انسخ الكود</button>
      <div style="display:flex;gap:8px;align-items:center;color:var(--text2);font-size:12px;font-weight:700">
        <i class="fas fa-circle-notch fa-spin" style="color:var(--accent)"></i> ننتظر صاحبك...
      </div>
    </div>`;
}

function _start1v1() {
  _cvIdx = 0; _cvMyScore = 0; _cvTheirScore = 0;
  navTo('1v1');
  const s = document.getElementById('screen-1v1');
  if (!s) return;
  s.innerHTML = `
    <div style="display:flex;flex-direction:column;height:100%;gap:12px">
      <div style="display:flex;justify-content:space-between;align-items:center;
                  background:var(--card);border-radius:20px;padding:14px 20px;
                  border:1px solid rgba(255,255,255,.06);flex-shrink:0">
        <div style="text-align:center;flex:1">
          <div style="font-size:10px;font-weight:700;color:var(--text2);margin-bottom:4px">أنت</div>
          <div id="1v1-my-score" style="font-size:30px;font-weight:900;color:var(--accent)">0</div>
        </div>
        <div style="font-size:20px;color:rgba(255,255,255,.18)">⚔️</div>
        <div style="text-align:center;flex:1">
          <div style="font-size:10px;font-weight:700;color:var(--text2);margin-bottom:4px">المنافس</div>
          <div id="1v1-their-score" style="font-size:30px;font-weight:900;color:#ef4444">0</div>
        </div>
      </div>
      <div id="1v1-q-area" style="flex:1;overflow-y:auto"></div>
    </div>`;
  _show1v1Q();
}

function _show1v1Q() {
  const area = document.getElementById('1v1-q-area');
  if (!area) return;
  if (_cvIdx >= _cvQs.length) { _submitDone(); return; }
  const q = _cvQs[_cvIdx];
  const L = ['A','B','C','D'];
  area.innerHTML = `
    <div style="background:var(--card);padding:20px;border-radius:22px;
                border:1px solid rgba(255,255,255,.05);text-align:center;margin-bottom:12px">
      <div style="font-size:10px;font-weight:900;color:var(--text2);margin-bottom:8px">
        ${_cvIdx+1} / ${_cvQs.length}</div>
      <p style="font-size:17px;font-weight:700;color:#fff;line-height:1.55">${q.t}</p>
    </div>
    <div id="1v1-opts">
      ${(q.a||[]).map((opt,i) => `
        <button onclick="window._1v1Answer(${i})" class="btn-option"
          style="display:flex;align-items:center;gap:12px;width:100%;text-align:right;margin-bottom:10px">
          <span class="option-letter">${L[i]}</span>
          <span style="flex:1;font-size:14px;font-weight:700">${opt}</span>
        </button>`).join('')}
    </div>`;
}

export function _1v1Answer(i) {
  const q = _cvQs[_cvIdx];
  if (!q) return;
  document.querySelectorAll('#1v1-opts .btn-option').forEach(b => b.disabled = true);

  if (i === q.c) {
    document.querySelectorAll('#1v1-opts .btn-option')[i]?.classList.add('correct');
    _cvMyScore++;
    if (navigator.vibrate) navigator.vibrate([12,8,12]);
    const myK = _cvRole === 'host' ? 'host' : 'guest';
    window.db_set(`artifacts/${APP_ID}/public/data/challenges/${_cvId}`,
      {[`${myK}.score`]: _cvMyScore}, true).catch(()=>{});
    const el = document.getElementById('1v1-my-score');
    if (el) { el.innerText = _cvMyScore; _pop(el); }
  } else {
    document.querySelectorAll('#1v1-opts .btn-option')[i]?.classList.add('wrong');
    document.querySelectorAll('#1v1-opts .btn-option')[q.c]?.classList.add('correct');
    if (navigator.vibrate) navigator.vibrate(60);
  }
  setTimeout(() => { _cvIdx++; _show1v1Q(); }, 900);
}
window._1v1Answer = _1v1Answer;

async function _submitDone() {
  const myK = _cvRole === 'host' ? 'host' : 'guest';
  await window.db_set(`artifacts/${APP_ID}/public/data/challenges/${_cvId}`,
    {[`${myK}.done`]:true,[`${myK}.score`]:_cvMyScore}, true).catch(()=>{});
  const area = document.getElementById('1v1-q-area');
  if (area) area.innerHTML = `
    <div style="text-align:center;padding:40px 20px;color:var(--text2);font-weight:700">
      <i class="fas fa-circle-notch fa-spin" style="font-size:26px;color:var(--accent);margin-bottom:14px;display:block"></i>
      في انتظار نتيجة المنافس...</div>`;
}

function _finish1v1(data) {
  if (_cvListener) { _cvListener(); _cvListener = null; }
  const myK    = _cvRole === 'host' ? 'host' : 'guest';
  const theirK = _cvRole === 'host' ? 'guest' : 'host';
  const mySc   = data[myK]?.score   || 0;
  const thSc   = data[theirK]?.score || 0;
  const thName = data[theirK]?.username || 'المنافس';
  const won  = mySc > thSc, tied = mySc === thSc;

  if (won) {
    if (typeof confetti !== 'undefined') confetti({particleCount:160,spread:110,origin:{y:.5}});
    if (navigator.vibrate) navigator.vibrate([50,30,100]);
    if (window.gameData) { window.gameData.coins = (window.gameData.coins||0) + 200; window.saveData?.(); }
  }

  const s = document.getElementById('screen-1v1');
  if (!s) return;
  s.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;
                height:100%;text-align:center;gap:16px">
      <div style="font-size:72px">${won?'🏆':tied?'🤝':'😔'}</div>
      <h2 style="font-size:30px;font-weight:900;color:#fff">${won?'فزت!':tied?'تعادل!':'خسرت!'}</h2>
      <div style="display:flex;gap:24px;align-items:center;background:var(--card);
                  border-radius:24px;padding:20px 32px;border:1px solid rgba(255,255,255,.07)">
        <div style="text-align:center">
          <div style="font-size:10px;font-weight:700;color:var(--text2);margin-bottom:6px">أنت</div>
          <div style="font-size:38px;font-weight:900;color:var(--accent)">${mySc}</div>
        </div>
        <div style="font-size:20px;color:rgba(255,255,255,.18)">vs</div>
        <div style="text-align:center">
          <div style="font-size:10px;font-weight:700;color:var(--text2);margin-bottom:6px">${thName}</div>
          <div style="font-size:38px;font-weight:900;color:#ef4444">${thSc}</div>
        </div>
      </div>
      ${won?`<div style="font-size:13px;font-weight:700;color:#fbbf24">🎁 +200 عملة مكافأة!</div>`:''}
      <button onclick="window.navTo('map')"
        style="width:240px;padding:16px;background:var(--grad);color:#000;font-weight:900;
               border-radius:24px;font-size:15px;border:none;border-bottom:4px solid rgba(0,0,0,.2);
               cursor:pointer;font-family:'Tajawal',sans-serif">العب مجدداً 🎮</button>
      <button onclick="window.navTo('home')"
        style="width:240px;padding:12px;background:rgba(255,255,255,.05);color:var(--text2);
               font-weight:700;border-radius:18px;font-size:13px;
               border:1px solid rgba(255,255,255,.08);cursor:pointer;font-family:'Tajawal',sans-serif">
        الرئيسية 🏠</button>
    </div>`;
}

async function _fetchPool(cat, sub) {
  let pool = [];
  try {
    if (window.firebaseReady && db) {
      const { getDocs, collection, query, where } = await import(
        'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js');
      const snap = await getDocs(query(
        collection(db,'artifacts',APP_ID,'public','data','questions'),
        where('category','==',cat), where('subCategory','==',sub)));
      snap.forEach(d => pool.push({id:d.id,...d.data()}));
    }
  } catch(e) {}
  return pool.length >= 5 ? pool : FALLBACK_Q;
}

function _pop(el) {
  el.style.animation = '';
  requestAnimationFrame(() => { el.style.animation = 'scorePopup .4s cubic-bezier(.34,1.56,.64,1)'; });
  setTimeout(() => { el.style.animation = ''; }, 400);
}


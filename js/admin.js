// js/admin.js
import { db, APP_ID } from './firebase.js';
import { showToast } from './helpers.js';
import { categoryConfig } from './data.js';
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  where,
  writeBatch,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// ══════════════════════════════════════════════════════════════════
// تهيئة Firebase (خاص بلوحة التحكم)
// ══════════════════════════════════════════════════════════════════
const AID = 'shaghel-mokh-ultra-full';
const QCOL = () => collection(db, 'artifacts', AID, 'public', 'data', 'questions');

// التصنيفات والأقسام (كما في admin.html الأصلي)
const SUBS = {
  'إسلاميات':       ['قصص الأنبياء', 'القرآن الكريم', 'السيرة النبوية', 'الفقه الميسر'],
  'تاريخ مصر':      ['الفراعنة', 'مصر الحديثة', 'آثار النوبة', 'ثورات مصر'],
  'تقنية':          ['برمجة', 'ذكاء اصطناعي', 'أمن سيبراني', 'تاريخ الحواسيب'],
  'علوم وفضاء':     ['الفضاء', 'جسم الإنسان', 'الكيمياء', 'الفيزياء الكمية'],
  'جغرافيا':        ['عواصم', 'أعلام', 'عجائب الدنيا', 'تضاريس الأرض'],
  'رياضة':          ['كرة قدم', 'أساطير', 'الأولمبياد', 'كأس العالم'],
  'ألغاز':          ['منطق', 'أحجيات', 'رياضيات', 'ذكاء بصري'],
  'طعام':           ['أطباق عالمية', 'حلويات', 'توابل', 'فواكه نادرة'],
  'أحياء القاهرة':  ['وسط البلد', 'المعادي والزمالك', 'الإسكندرية', 'مدن جديدة'],
  'كلمات مصرية':    ['أمثال شعبية', 'كلمات قبطية', 'عامية قديمة', 'ألقاب ومسميات'],
  'موسيقى وأغاني':  ['أغاني الزمن الجميل', 'فيروز وأم كلثوم', 'نجوم الـ 80s', 'مهرجانات'],
  'سينما وتليفزيون':['أفلام الـ 90s', 'نجوم الشاشة', 'مسلسلات رمضان', 'كلاكيت زمان'],
};
const CATS = Object.keys(SUBS);

const cleanCat = v => v.replace(/^[^\s]+\s/, '').trim();
const $ = id => document.getElementById(id);

// حالة لوحة التحكم
let allQs = [];
let filteredQs = [];
let aiQs = [];
let prevIdx = 0;
let fileQs = [];
let stop500 = false;
window.stop500 = false;

// ══════════════════════════════════════════════════════════════════
// Toast (باستخدام الدالة المستوردة من helpers مع تغليف)
// ══════════════════════════════════════════════════════════════════
window.toast = (msg, type = 'ok', dur = 3000) => {
  showToast(msg, dur);
  // يمكن تخصيص النوع لاحقاً
};

// ══════════════════════════════════════════════════════════════════
// تحميل الأسئلة من Firestore
// ══════════════════════════════════════════════════════════════════
window.loadQs = async () => {
  const ql = $('ql');
  ql.innerHTML = `<div class="state"><span class="state-e"><i class="fas fa-circle-notch spin" style="color:var(--accent)"></i></span><div class="state-t">جاري التحميل...</div></div>`;
  try {
    const snap = await getDocs(query(QCOL(), orderBy('createdAt', 'desc')));
    allQs = [];
    snap.forEach(d => allQs.push({ id: d.id, ...d.data() }));
    updateStats();
    applyFilter();
    window.toast(`✅ ${allQs.length} سؤال`);
  } catch (e) {
    $('ql').innerHTML = `<div class="state"><span class="state-e">❌</span><div class="state-t">${e.message}</div></div>`;
    window.toast('❌ ' + e.message, 'err');
  }
};
window.loadQuestions = window.loadQs;

// ══════════════════════════════════════════════════════════════════
// تحديث الإحصائيات
// ══════════════════════════════════════════════════════════════════
function updateStats() {
  $('st0').innerText = allQs.length;
  $('st1').innerText = allQs.filter(q => q.category === 'إسلاميات').length;
  $('st2').innerText = allQs.filter(q => q.category === 'تقنية').length;
  $('st3').innerText = allQs.filter(q => q.category === 'تاريخ مصر').length;
  $('st4').innerText = allQs.filter(q => q.category === 'أحياء القاهرة').length;
  $('st5').innerText = allQs.filter(q => q.category === 'موسيقى وأغاني').length;
  $('st6').innerText = allQs.filter(q => q.category === 'سينما وتليفزيون').length;
  $('st7').innerText = allQs.filter(q => q.category === 'كلمات مصرية').length;
}

// ══════════════════════════════════════════════════════════════════
// تصفية الأسئلة وعرضها
// ══════════════════════════════════════════════════════════════════
window.applyFilter = () => {
  const cat = cleanCat($('fcat').value).toLowerCase();
  const sub = $('fsub').value.trim().toLowerCase();
  const s = $('sinp').value.trim().toLowerCase();
  filteredQs = allQs.filter(q => {
    const mc = !cat || (q.category || '').toLowerCase().includes(cat);
    const ms = !sub || (q.subCategory || '').toLowerCase().includes(sub);
    const mt = !s || (q.t || '').toLowerCase().includes(s) || (q.a || []).some(o => o.toLowerCase().includes(s));
    return mc && ms && mt;
  });
  $('lcnt').innerText = filteredQs.length + ' سؤال';
  $('bdelall').style.display = filteredQs.length ? 'inline-flex' : 'none';
  renderList();
};

function renderList() {
  const ql = $('ql');
  if (!filteredQs.length) {
    ql.innerHTML = `<div class="state"><span class="state-e">🔍</span><div class="state-t">لا نتائج</div></div>`;
    return;
  }
  ql.innerHTML = '';
  filteredQs.forEach(q => {
    const el = document.createElement('div');
    el.className = 'qi';
    const opts = (q.a || []).map((o, i) => `<div class="qo ${i === q.c ? 'ok' : ''}">${i === q.c ? '✓ ' : ''}${o}</div>`).join('');
    el.innerHTML = `
      <div class="qi-top">
        <div class="qi-txt">${q.t || '—'}</div>
        <button class="btn btn-icon btn-sm" onclick="window.askDel('${q.id}',\`${(q.t || '').replace(/`/g, "'").slice(0, 50)}\`)">
          <i class="fas fa-trash-alt" style="font-size:10px;color:var(--red)"></i>
        </button>
      </div>
      <div class="qi-chips">
        <span class="chip cn">#${allQs.indexOf(q) + 1}</span>
        <span class="chip cc">${q.category || '—'}</span>
        <span class="chip cs">${q.subCategory || '—'}</span>
      </div>
      <div class="qi-opts">${opts}</div>
      ${q.x ? `<div class="qi-exp">💡 ${q.x}</div>` : ''}`;
    ql.appendChild(el);
  });
}

// ══════════════════════════════════════════════════════════════════
// مزامنة الأقسام الفرعية
// ══════════════════════════════════════════════════════════════════
window.ss = (cid, sid) => {
  const cat = cleanCat($(cid)?.value || '');
  const sel = $(sid);
  if (!sel) return;
  sel.innerHTML = '<option value="">-- القسم --</option>';
  (SUBS[cat] || []).forEach(s => sel.innerHTML += `<option value="${s}">${s}</option>`);
};

window.syncFsub = () => {
  const cat = cleanCat($('fcat')?.value || '');
  const sel = $('fsub');
  sel.innerHTML = '<option value="">كل الأقسام</option>';
  (SUBS[cat] || []).forEach(s => sel.innerHTML += `<option value="${s}">${s}</option>`);
};

// ══════════════════════════════════════════════════════════════════
// تبديل التبويبات
// ══════════════════════════════════════════════════════════════════
window.sw = tab => {
  ['manual', 'ai', 'ai500', 'file', 'bulk'].forEach(t => {
    $(`tab-${t}`).style.display = t === tab ? 'block' : 'none';
    $(`t-${t}`).classList.toggle('active', t === tab);
  });
};

// ══════════════════════════════════════════════════════════════════
// توزيع 500 سؤال (شبكة التوزيع)
// ══════════════════════════════════════════════════════════════════
function updateDistGrid() {
  const total = parseInt($('total500')?.value) || 500;
  const totalSubs = CATS.length * 4;
  const perSub = Math.ceil(total / totalSubs);
  if ($('dist-per-sub')) $('dist-per-sub').innerText = '~' + perSub;
  if ($('req-count')) $('req-count').innerText = totalSubs;
  const grid = $('dist-grid');
  if (!grid) return;
  grid.innerHTML = '';
  CATS.forEach(cat => {
    const perCat = perSub * 4;
    grid.innerHTML += `<div class="dist-item">
      <span class="dist-cat">${SUBS[cat] ? '' : ''} ${cat}</span>
      <span class="dist-num">${perCat} سؤال</span>
    </div>`;
  });
}
window.updateDistGrid = updateDistGrid;
updateDistGrid();

// ══════════════════════════════════════════════════════════════════
// بناء شبكة الخيارات للإدخال اليدوي
// ══════════════════════════════════════════════════════════════════
function buildOpts(gid = 'mopts', rn = 'mr', pfx = 'mo') {
  const g = $(gid);
  if (!g) return;
  g.innerHTML = '';
  ['أ', 'ب', 'ج', 'د'].forEach((l, i) => {
    g.innerHTML += `<div class="opt-item">
      <span class="opt-letter">${l}</span>
      <input class="opt-in" id="${pfx}${i}" type="text" placeholder="خيار ${l}" oninput="window.hl('${rn}','${pfx}')" autocomplete="off">
      <label class="cr"><input type="radio" name="${rn}" value="${i}" ${i === 0 ? 'checked' : ''} onchange="window.hl('${rn}','${pfx}')"><span>✓ صحيح</span></label>
    </div>`;
  });
  window.hl(rn, pfx);
}
window.hl = (rn, pfx) => {
  const chk = document.querySelector(`input[name="${rn}"]:checked`);
  const idx = chk ? +chk.value : -1;
  [0, 1, 2, 3].forEach(i => {
    const e = $(pfx + i);
    if (e) e.className = 'opt-in' + (i === idx ? ' ok' : '');
  });
};
buildOpts();

// ══════════════════════════════════════════════════════════════════
// إضافة سؤال يدوي
// ══════════════════════════════════════════════════════════════════
window.addManual = async () => {
  const cat = cleanCat($('mc').value.trim());
  const sub = $('ms').value.trim();
  const qt = $('mq').value.trim();
  const exp = $('mexp').value.trim();
  const opts = [0, 1, 2, 3].map(i => ($('mo' + i)?.value || '').trim());
  const chk = document.querySelector('input[name="mr"]:checked');
  const ci = chk ? +chk.value : -1;
  if (!cat) return window.toast('❌ اختر التصنيف', 'err');
  if (!sub) return window.toast('❌ اختر القسم', 'err');
  if (!qt) return window.toast('❌ اكتب السؤال', 'err');
  if (opts.some(o => !o)) return window.toast('❌ أكمل الخيارات', 'err');
  if (ci < 0) return window.toast('❌ حدد الإجابة الصحيحة', 'err');
  try {
    await addDoc(QCOL(), { t: qt, a: opts, c: ci, x: exp, category: cat, subCategory: sub, createdAt: Date.now() });
    window.toast('✅ تمت الإضافة!');
    $('mq').value = '';
    $('mexp').value = '';
    [0, 1, 2, 3].forEach(i => { const e = $('mo' + i); if (e) e.value = ''; });
    buildOpts();
    window.loadQs();
  } catch (e) {
    window.toast('❌ ' + e.message, 'err');
  }
};

// ══════════════════════════════════════════════════════════════════
// مفاتيح API (Gemini)
// ══════════════════════════════════════════════════════════════════
window.toggleKey = (inpId, eyeId) => {
  const i = $(inpId);
  const e = $(eyeId);
  if (i.type === 'password') {
    i.type = 'text';
    e.className = 'fas fa-eye-slash';
  } else {
    i.type = 'password';
    e.className = 'fas fa-eye';
  }
};
const sk = localStorage.getItem('gkey');
if (sk) {
  if ($('akey')) $('akey').value = sk;
  if ($('akey500')) $('akey500').value = sk;
}

// ══════════════════════════════════════════════════════════════════
// استدعاء Gemini API
// ══════════════════════════════════════════════════════════════════
async function callGemini(key, prompt) {
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.85, maxOutputTokens: 4096 }
      })
    }
  );
  const data = await r.json();
  if (data.error) throw new Error(data.error.message);
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const clean = raw.replace(/```json|```/g, '').trim();
  const match = clean.match(/\[[\s\S]*\]/);
  if (!match) throw new Error('لم يتم العثور على JSON');
  return JSON.parse(match[0]);
}

// ══════════════════════════════════════════════════════════════════
// توليد أسئلة بتصنيف واحد (AI)
// ══════════════════════════════════════════════════════════════════
window.generateAI = async () => {
  const key = $('akey').value.trim();
  const cat = cleanCat($('ac').value.trim());
  const sub = $('as').value.trim();
  const cnt = Math.min(Math.max(parseInt($('acnt').value) || 10, 1), 50);
  const diff = $('adiff').value;
  const extra = $('aextra').value.trim();
  if (!key) return window.toast('❌ أدخل API Key', 'err');
  if (!cat) return window.toast('❌ اختر التصنيف', 'err');
  if (!sub) return window.toast('❌ اختر القسم', 'err');
  localStorage.setItem('gkey', key);
  if ($('akey500')) $('akey500').value = key;
  const btn = $('btngen');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-circle-notch spin"></i> جاري...';
  $('aprog').style.display = 'block';
  const bar = $('apbar'), lbl = $('aplbl'), pct = $('appct');
  bar.style.width = '0%';
  let fp = 0;
  const fi = setInterval(() => {
    fp = Math.min(fp + Math.random() * 8, 82);
    bar.style.width = fp + '%';
    pct.innerText = Math.round(fp) + '%';
  }, 300);
  const prompt = `أنشئ ${cnt} أسئلة اختيار من متعدد باللغة العربية عن "${cat} - ${sub}".${diff ? ` الصعوبة: ${diff}.` : ''}${extra ? ` توجيهات: ${extra}` : ''}
القواعد: 4 خيارات مختلفة لكل سؤال، لا تكرار، شرح تعليمي.
JSON فقط بدون markdown: [{"t":"سؤال","a":["خ1","خ2","خ3","خ4"],"c":0,"x":"شرح"}]`;
  try {
    const qs = await callGemini(key, prompt);
    const valid = qs.filter(q => q.t && Array.isArray(q.a) && q.a.length >= 2 && q.c !== undefined);
    if (!valid.length) throw new Error('لا أسئلة صالحة');
    clearInterval(fi);
    bar.style.width = '100%';
    pct.innerText = '100%';
    lbl.innerText = `✅ ${valid.length} سؤال`;
    aiQs = valid;
    prevIdx = 0;
    showPrev();
    window.toast(`✨ ${valid.length} سؤال جاهز!`);
  } catch (e) {
    clearInterval(fi);
    bar.style.width = '0%';
    lbl.innerText = '❌ فشل';
    window.toast('❌ ' + e.message, 'err', 5000);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<div class="ai-spark"></div><i class="fas fa-wand-magic-sparkles"></i> توليد بالذكاء الاصطناعي';
  }
};

function showPrev() {
  if (!aiQs.length) return;
  $('aiprev').classList.add('show');
  $('prevcnt').innerText = aiQs.length + ' سؤال';
  $('prevtxt').innerText = `${prevIdx + 1}/${aiQs.length}`;
  const q = aiQs[prevIdx];
  const opts = (q.a || []).map((o, i) => `<div class="prev-opt ${i === q.c ? 'c' : ''}">${i === q.c ? '✓ ' : ''}${o}</div>`).join('');
  $('prevcard').innerHTML = `<div class="prev-q">${q.t}</div><div class="prev-opts">${opts}</div>${q.x ? `<div class="prev-exp">💡 ${q.x}</div>` : ''}`;
}
window.nextP = () => { prevIdx = (prevIdx + 1) % aiQs.length; showPrev(); };
window.prevP = () => { prevIdx = (prevIdx - 1 + aiQs.length) % aiQs.length; showPrev(); };

window.saveAI = async () => {
  if (!aiQs.length) return;
  const cat = cleanCat($('ac').value.trim());
  const sub = $('as').value.trim();
  if (!cat || !sub) return window.toast('❌ اختر التصنيف والقسم', 'err');
  const btn = document.querySelector('.btn-gold');
  btn.disabled = true;
  let done = 0;
  try {
    for (const q of aiQs) {
      await addDoc(QCOL(), { t: q.t, a: q.a, c: q.c, x: q.x || '', category: cat, subCategory: sub, createdAt: Date.now() });
      done++;
      btn.innerHTML = `<i class="fas fa-circle-notch spin"></i> ${done}/${aiQs.length}`;
    }
    window.toast(`✅ تم حفظ ${done} سؤال!`);
    aiQs = [];
    $('aiprev').classList.remove('show');
    $('aprog').style.display = 'none';
    window.loadQs();
  } catch (e) {
    window.toast('❌ ' + e.message, 'err');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> حفظ في Firebase';
  }
};

// ══════════════════════════════════════════════════════════════════
// توليد 500 سؤال موزعة
// ══════════════════════════════════════════════════════════════════
window.generate500 = async () => {
  const key = $('akey500').value.trim();
  if (!key) return window.toast('❌ أدخل API Key', 'err');
  localStorage.setItem('gkey', key);
  if ($('akey')) $('akey').value = key;

  const total = parseInt($('total500').value) || 500;
  const diff = $('diff500').value;
  const totalSubs = CATS.length * SUBS[CATS[0]].length;
  const perSub = Math.ceil(total / totalSubs);

  const btn = $('btn500');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-circle-notch spin"></i> جاري التوليد...';
  $('prog500-wrap').style.display = 'block';
  stop500 = false;
  window.stop500 = false;

  const bar = $('prog500-bar'), lbl = $('prog500-lbl'), pct = $('prog500-pct'), cur = $('prog500-current');

  let done = 0, totalDone = 0, errors = 0;
  const tasks = [];
  CATS.forEach(cat => SUBS[cat].forEach(sub => tasks.push({ cat, sub })));

  for (const { cat, sub } of tasks) {
    if (stop500 || window.stop500) {
      window.toast('⏹️ تم الإيقاف', 'inf');
      break;
    }
    cur.innerText = `⏳ ${cat} — ${sub}`;
    const prompt = `أنشئ ${perSub} أسئلة اختيار من متعدد باللغة العربية عن "${cat} - ${sub}".${diff ? ` الصعوبة: ${diff}.` : ''}
أسئلة متنوعة ومختلفة، لا تكرار، شرح مفيد.
JSON فقط: [{"t":"سؤال","a":["خ1","خ2","خ3","خ4"],"c":0,"x":"شرح"}]`;
    try {
      const qs = await callGemini(key, prompt);
      const valid = qs.filter(q => q.t && Array.isArray(q.a) && q.a.length >= 2 && q.c !== undefined);
      for (const q of valid) {
        await addDoc(QCOL(), { t: q.t, a: q.a, c: q.c || 0, x: q.x || '', category: cat, subCategory: sub, createdAt: Date.now() });
        totalDone++;
      }
      done++;
      const prog = Math.round((done / tasks.length) * 100);
      bar.style.width = prog + '%';
      pct.innerText = prog + '%';
      lbl.innerText = `✅ ${done}/${tasks.length} قسم — ${totalDone} سؤال`;
      cur.innerText = `✅ ${cat} — ${sub} (${valid.length} سؤال)`;
      await new Promise(r => setTimeout(r, 800));
    } catch (e) {
      errors++;
      cur.innerText = `❌ خطأ: ${cat} — ${sub}: ${e.message}`;
      window.toast(`⚠️ خطأ في "${sub}": ${e.message.slice(0, 40)}...`, 'err', 4000);
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  btn.disabled = false;
  btn.innerHTML = '<i class="fas fa-rocket"></i> ابدأ التوليد الكامل';
  window.toast(`🎉 انتهى! ${totalDone} سؤال — ${errors} خطأ`, 'ok', 5000);
  window.loadQs();
};

// ══════════════════════════════════════════════════════════════════
// رفع ملف (JSON / CSV)
// ══════════════════════════════════════════════════════════════════
const dz = $('dropz');
dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('over'); });
dz.addEventListener('dragleave', () => dz.classList.remove('over'));
dz.addEventListener('drop', e => {
  e.preventDefault();
  dz.classList.remove('over');
  const f = e.dataTransfer.files[0];
  if (f) procFile(f);
});
window.onFile = e => {
  const f = e.target.files[0];
  if (f) procFile(f);
};

function procFile(file) {
  if (file.size > 10 * 1024 * 1024) return window.toast('❌ الملف أكبر من 10MB', 'err');
  const r = new FileReader();
  r.onload = ev => {
    const txt = ev.target.result;
    let qs = [];
    try {
      if (file.name.endsWith('.json')) {
        const raw = JSON.parse(txt.replace(/```json|```/g, '').trim());
        qs = Array.isArray(raw) ? raw : [];
      } else {
        const lines = txt.split('\n').filter(l => l.trim());
        const st = lines[0].toLowerCase().includes('سؤال') || lines[0].startsWith('t,') ? 1 : 0;
        qs = lines.slice(st).map(line => {
          const c = line.split(',').map(x => x.trim().replace(/^"|"$/g, ''));
          if (c.length < 6) return null;
          return {
            t: c[0],
            a: [c[1], c[2], c[3], c[4]],
            c: parseInt(c[5]) || 0,
            x: c[6] || '',
            category: c[7] || '',
            subCategory: c[8] || ''
          };
        }).filter(Boolean);
      }
    } catch (e) {
      return window.toast('❌ ملف غير صالح: ' + e.message, 'err');
    }

    const valid = qs.filter(q => q.t && Array.isArray(q.a) && q.a.length >= 2);
    if (!valid.length) return window.toast('❌ لا أسئلة صالحة', 'err');
    fileQs = valid;

    const bycat = {};
    valid.forEach(q => {
      const cat = q.category || 'غير محدد';
      if (!bycat[cat]) bycat[cat] = 0;
      bycat[cat]++;
    });
    const breakdown = Object.entries(bycat).map(([c, n]) => `${c}: ${n} سؤال`).join(' · ');
    $('file-breakdown').innerHTML = `<b style="color:var(--text)">${valid.length} سؤال</b><br>${breakdown}`;
    $('fname').innerText = `${file.name} (${valid.length})`;
    $('fbadge').style.display = 'inline-flex';
    $('file-stats').style.display = 'block';
    $('btnuf').disabled = false;
    window.toast(`📂 ${valid.length} سؤال جاهز`, 'inf');
  };
  r.readAsText(file, 'UTF-8');
}

window.clearFile = () => {
  fileQs = [];
  $('finp').value = '';
  $('fbadge').style.display = 'none';
  $('file-stats').style.display = 'none';
  $('btnuf').disabled = true;
};

window.uploadFile = async () => {
  if (!fileQs.length) return;
  const autoDetect = $('auto-detect').checked;
  const cat = autoDetect ? null : cleanCat($('fc2').value.trim());
  const sub = autoDetect ? null : $('fs2').value.trim();
  if (!autoDetect && !cat) return window.toast('❌ اختر التصنيف', 'err');
  if (!autoDetect && !sub) return window.toast('❌ اختر القسم', 'err');

  const btn = $('btnuf');
  btn.disabled = true;
  $('prog-file-wrap').style.display = 'block';
  const bar = $('prog-file-bar'), lbl = $('prog-file-lbl'), pct = $('prog-file-pct');

  let done = 0;
  try {
    for (const q of fileQs) {
      const qCat = autoDetect ? (q.category || 'غير محدد') : cat;
      const qSub = autoDetect ? (q.subCategory || 'عام') : sub;
      await addDoc(QCOL(), { t: q.t, a: q.a, c: q.c || 0, x: q.x || '', category: qCat, subCategory: qSub, createdAt: Date.now() });
      done++;
      const p = Math.round((done / fileQs.length) * 100);
      bar.style.width = p + '%';
      pct.innerText = p + '%';
      lbl.innerText = `${done}/${fileQs.length}`;
    }
    window.toast(`✅ تم رفع ${done} سؤال!`);
    clearFile();
    $('prog-file-wrap').style.display = 'none';
    window.loadQs();
  } catch (e) {
    window.toast('❌ ' + e.message, 'err');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> رفع الأسئلة إلى Firebase';
  }
};

// ══════════════════════════════════════════════════════════════════
// رفع JSON مباشر (Bulk)
// ══════════════════════════════════════════════════════════════════
window.bulkUp = async () => {
  const autoMode = $('bulk-auto').checked;
  const cat = autoMode ? null : cleanCat($('bc').value.trim());
  const sub = autoMode ? null : $('bs').value.trim();
  const raw = $('bjson').value.trim();
  if (!autoMode && !cat) return window.toast('❌ اختر التصنيف', 'err');
  if (!autoMode && !sub) return window.toast('❌ اختر القسم', 'err');
  if (!raw) return window.toast('❌ الصق JSON', 'err');
  let qs;
  try {
    qs = JSON.parse(raw);
  } catch (e) {
    return window.toast('❌ JSON غير صالح', 'err');
  }
  if (!Array.isArray(qs) || !qs.length) return window.toast('❌ مصفوفة فارغة', 'err');

  $('bulk-prog-wrap').style.display = 'block';
  const bar = $('bulk-prog-bar'), lbl = $('bulk-prog-lbl'), pct = $('bulk-prog-pct');
  const btn = document.querySelector('#tab-bulk .btn-primary');
  btn.disabled = true;
  let done = 0;
  try {
    for (const q of qs) {
      if (!q.t || !q.a) continue;
      const qCat = autoMode ? (q.category || 'غير محدد') : cat;
      const qSub = autoMode ? (q.subCategory || 'عام') : sub;
      await addDoc(QCOL(), { t: q.t, a: q.a, c: q.c || 0, x: q.x || '', category: qCat, subCategory: qSub, createdAt: Date.now() });
      done++;
      const p = Math.round((done / qs.length) * 100);
      bar.style.width = p + '%';
      pct.innerText = p + '%';
      lbl.innerText = `${done}/${qs.length}`;
    }
    window.toast(`✅ تم رفع ${done} سؤال!`);
    $('bjson').value = '';
    window.loadQs();
  } catch (e) {
    window.toast('❌ ' + e.message, 'err');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-upload"></i> رفع الأسئلة';
    $('bulk-prog-wrap').style.display = 'none';
  }
};

// ══════════════════════════════════════════════════════════════════
// حذف وتصدير
// ══════════════════════════════════════════════════════════════════
window.askDel = (id, txt) => {
  $('mico').innerText = '🗑️';
  $('mttl').innerText = 'حذف السؤال؟';
  $('mmsg').innerHTML = `"${txt}..."<br><small style="color:var(--t3)">لا يمكن التراجع</small>`;
  $('mok').onclick = async () => {
    try {
      await deleteDoc(doc(db, 'artifacts', AID, 'public', 'data', 'questions', id));
      closeMod();
      window.toast('🗑️ تم الحذف');
      window.loadQs();
    } catch (e) {
      window.toast('❌ ' + e.message, 'err');
    }
  };
  $('modw').classList.add('show');
};

window.closeMod = () => $('modw').classList.remove('show');

window.delAllFiltered = () => {
  $('mico').innerText = '⚠️';
  $('mttl').innerText = `حذف ${filteredQs.length} سؤال؟`;
  $('mmsg').innerHTML = 'سيتم حذف كل الأسئلة المعروضة.<br><small style="color:var(--t3)">لا رجعة!</small>';
  $('mok').onclick = async () => {
    const btn = $('mok');
    btn.disabled = true;
    btn.innerText = 'جاري...';
    try {
      for (const q of filteredQs) {
        await deleteDoc(doc(db, 'artifacts', AID, 'public', 'data', 'questions', q.id));
      }
      closeMod();
      window.toast(`🗑️ حذف ${filteredQs.length} سؤال`);
      window.loadQs();
    } catch (e) {
      window.toast('❌ ' + e.message, 'err');
    } finally {
      btn.disabled = false;
      btn.innerText = 'تأكيد';
    }
  };
  $('modw').classList.add('show');
};

window.clearAllConfirm = () => {
  $('mico').innerText = '🔥';
  $('mttl').innerText = `مسح كل ${allQs.length} سؤال؟`;
  $('mmsg').innerHTML = 'سيتم حذف كل الأسئلة من Firebase.<br><b style="color:var(--red)">لا يمكن التراجع!</b>';
  $('mok').onclick = async () => {
    const btn = $('mok');
    btn.disabled = true;
    btn.innerText = 'جاري المسح...';
    try {
      for (const q of allQs) {
        await deleteDoc(doc(db, 'artifacts', AID, 'public', 'data', 'questions', q.id));
      }
      closeMod();
      window.toast(`🔥 تم مسح كل الأسئلة`);
      window.loadQs();
    } catch (e) {
      window.toast('❌ ' + e.message, 'err');
    } finally {
      btn.disabled = false;
      btn.innerText = 'تأكيد';
    }
  };
  $('modw').classList.add('show');
};

window.exportAll = () => {
  if (!allQs.length) return window.toast('لا أسئلة', 'inf');
  download(allQs.map(({ id, createdAt, ...q }) => q), `questions_all_${Date.now()}.json`);
  window.toast(`📥 تصدير ${allQs.length} سؤال`);
};

window.exportFiltered = () => {
  if (!filteredQs.length) return window.toast('لا أسئلة', 'inf');
  download(filteredQs.map(({ id, createdAt, ...q }) => q), `questions_filtered_${Date.now()}.json`);
  window.toast(`📥 تصدير ${filteredQs.length} سؤال`);
};

function download(data, name) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
}

// ══════════════════════════════════════════════════════════════════
// تهيئة الصفحة
// ══════════════════════════════════════════════════════════════════
$('auto-detect').addEventListener('change', e => {
  $('manual-cat-wrap').style.display = e.target.checked ? 'none' : 'block';
});
$('bulk-auto').addEventListener('change', e => {
  $('bulk-manual-wrap').style.display = e.target.checked ? 'none' : 'block';
});

// تحميل الأسئلة عند فتح الصفحة
window.loadQs();


// js/data.js
import { getCurrentSeason } from './firebase.js';
import { showToast, playSound } from './helpers.js';

// ══════════════════════════════════════════════════════════════════
// تصنيفات اللعبة الكاملة (كما في الأصل)
// ══════════════════════════════════════════════════════════════════
export const categoryConfig = {
  islamic: { name: "إسلاميات", icon: "🕌", subs: ["قصص الأنبياء", "القرآن الكريم", "السيرة النبوية", "الفقه الميسر"], order: 0 },
  egypt:   { name: "تاريخ مصر", icon: "🏺", subs: ["الفراعنة", "مصر الحديثة", "آثار النوبة", "ثورات مصر"], order: 1 },
  tech:    { name: "تقنية", icon: "💻", subs: ["برمجة", "ذكاء اصطناعي", "أمن سيبراني", "تاريخ الحواسيب"], order: 2 },
  science: { name: "علوم وفضاء", icon: "🚀", subs: ["الفضاء", "جسم الإنسان", "الكيمياء", "الفيزياء الكمية"], order: 3 },
  geo:     { name: "جغرافيا", icon: "🌍", subs: ["عواصم", "أعلام", "عجائب الدنيا", "تضاريس الأرض"], order: 4 },
  sports:  { name: "رياضة", icon: "⚽", subs: ["كرة قدم", "أساطير", "الأولمبياد", "كأس العالم"], order: 5 },
  puzzles: { name: "ألغاز", icon: "🧩", subs: ["منطق", "أحجيات", "رياضيات", "ذكاء بصري"], order: 6 },
  food:    { name: "طعام", icon: "🍱", subs: ["أطباق عالمية", "حلويات", "توابل", "فواكه نادرة"], order: 7 },
  cairo:   { name: "أحياء القاهرة", icon: "🏙️", subs: ["وسط البلد", "المعادي والزمالك", "الإسكندرية", "مدن جديدة"], order: 8 },
  words:   { name: "كلمات مصرية", icon: "💬", subs: ["أمثال شعبية", "كلمات قبطية", "عامية قديمة", "ألقاب ومسميات"], order: 9 },
  music:   { name: "موسيقى وأغاني", icon: "🎵", subs: ["أغاني الزمن الجميل", "فيروز وأم كلثوم", "نجوم الـ 80s", "مهرجانات"], order: 10 },
  cinema:  { name: "سينما وتليفزيون", icon: "🎬", subs: ["أفلام الـ 90s", "نجوم الشاشة", "مسلسلات رمضان", "كلاكيت زمان"], order: 11 },
};

export const AVATAR_FRAMES = [
  { id: 'none',    name: 'بلا إطار', price: 0,    style: '' },
  { id: 'gold',    name: 'ذهبي',     price: 500,  style: 'box-shadow:0 0 0 4px #fbbf24,0 0 20px rgba(251,191,36,.5)' },
  { id: 'rainbow', name: 'قوس قزح', price: 1200, style: 'box-shadow:0 0 0 4px transparent;background:linear-gradient(#ff0080,#7928ca,#0070f3) padding-box,linear-gradient(to right,#ff0080,#7928ca,#0070f3) border-box;border:3px solid transparent' },
  { id: 'fire',    name: 'نار 🔥',   price: 800,  style: 'box-shadow:0 0 0 4px #f97316,0 0 25px rgba(249,115,22,.6),0 0 50px rgba(239,68,68,.3)' },
  { id: 'ice',     name: 'جليد ❄️',  price: 800,  style: 'box-shadow:0 0 0 4px #93c5fd,0 0 25px rgba(147,197,253,.5)' },
  { id: 'star',    name: 'نجوم ⭐',  price: 1500, style: 'box-shadow:0 0 0 4px #fbbf24,0 0 20px #fbbf24,0 0 40px rgba(251,191,36,.4);animation:pulse 2s infinite' },
];

export const ACCENT_COLORS = [
  { name: 'ذهبي',    val: '#fbbf24', val2: '#f59e0b' },
  { name: 'أزرق',    val: '#60a5fa', val2: '#3b82f6' },
  { name: 'أخضر',    val: '#34d399', val2: '#10b981' },
  { name: 'وردي',    val: '#f472b6', val2: '#ec4899' },
  { name: 'بنفسجي',  val: '#a78bfa', val2: '#8b5cf6' },
  { name: 'برتقالي', val: '#fb923c', val2: '#f97316' },
];

// ══════════════════════════════════════════════════════════════════
// البيانات الافتراضية للاعب (تُستخدم عند إنشاء ملف جديد)
// ══════════════════════════════════════════════════════════════════
export function getDefaultData() {
  const season = getCurrentSeason();
  return {
    coins: 500, xp: 0, level: 1,
    username: "العبقري المجهول",
    avatar: "https://i.postimg.cc/qqTBP312/1000061201.png",
    avatarFrame: "none",
    accentColor: "#fbbf24",
    message: "",
    inventory: { delete: 5, skip: 5, hint: 5 },
    stats: {
      gamesPlayed: 0, completedSections: 0, correctAnswers: 0,
      currentStreak: 0, maxStreak: 0, totalCoinsEarned: 0, dailyChallengesWon: 0
    },
    unlockedCategories: ["islamic", "egypt", "tech", "science", "geo", "sports", "puzzles", "food", "cairo", "words", "music", "cinema"],
    rank: "باحث عن المعرفة",
    theme: "dark", soundEnabled: true,
    lastDailyUpdate: new Date().toDateString(),
    lastLoginDate: "",
    dailyChallengeDate: "",
    dailyChallengeScore: 0,
    currentSeason: season,
    seasonScores: {},
    seasonData: {
      seasonId: season,
      xp: 0,
      rank: 'برونز',
      gamesPlayed: 0,
      challengesDone: 0,
      weeklyDone: 0,
      rewardClaimed: false,
    },
    dailyTasks: [
      { id: "win_5",       text: "أجب على 5 أسئلة صحيحة",     goal: 5,   current: 0, reward: 100, claimed: false },
      { id: "use_helper",  text: "استخدم وسيلة مساعدة",        goal: 1,   current: 0, reward: 50,  claimed: false },
      { id: "earn_500",    text: "اجمع 500 عملة إضافية",       goal: 500, current: 0, reward: 200, claimed: false },
      { id: "daily_ch",    text: "أكمل تحدي اليوم",            goal: 1,   current: 0, reward: 300, claimed: false },
      { id: "play_cats",   text: "العب في تصنيفين مختلفين",    goal: 2,   current: 0, reward: 150, claimed: false },
      { id: "streak_3",    text: "أجب 3 متتالية بدون خطأ",     goal: 3,   current: 0, reward: 80,  claimed: false }
    ],
    weeklyTasks: [
      { id: "w_games_5",   text: "العب 5 جولات هذا الأسبوع",  goal: 5,  current: 0, reward: 500,  claimed: false, weekId: "" },
      { id: "w_daily_3",   text: "أكمل 3 تحديات يومية",       goal: 3,  current: 0, reward: 700,  claimed: false, weekId: "" },
      { id: "w_correct_30",text: "أجب 30 سؤالاً صحيحاً",      goal: 30, current: 0, reward: 800,  claimed: false, weekId: "" },
      { id: "w_streak_10", text: "حقق سلسلة 10 في جولة",      goal: 10, current: 0, reward: 1000, claimed: false, weekId: "" }
    ],
    achievements: [
      { id: "lvl_5",     text: "الوصول للمستوى 5",       earned: false, icon: "🏆" },
      { id: "streak_10", text: "سلسلة 10 إجابات",         earned: false, icon: "🔥" },
      { id: "rich",      text: "جمع 2000 عملة",           earned: false, icon: "💰" },
      { id: "veteran",   text: "10 جولات كاملة",           earned: false, icon: "🎖️" },
      { id: "master_50", text: "50 إجابة صحيحة",          earned: false, icon: "🧠" },
      { id: "lvl_10",    text: "الوصول للمستوى 10",       earned: false, icon: "👑" },
      { id: "explorer",  text: "إكمال 5 أقسام",           earned: false, icon: "🗺️" },
      { id: "perfect",   text: "10/10 في جولة",           earned: false, icon: "⭐" },
      { id: "streak_5",  text: "سلسلة 5 إجابات",          earned: false, icon: "⚡" },
      { id: "daily_3",   text: "3 تحديات يومية متتالية",  earned: false, icon: "📅" },
      { id: "social",    text: "فاز في غرفة جماعية",        earned: false, icon: "👥" },
      { id: "speed_5",   text: "أجب خلال 3 ثواني 5 مرات",  earned: false, icon: "⚡" },
      { id: "no_hint",   text: "أكمل جولة بدون مساعدات",   earned: false, icon: "🎯" },
      { id: "comeback",  text: "فاز بعد 3 إجابات خاطئة",   earned: false, icon: "💪" },
      { id: "daily_7",   text: "7 تحديات يومية متتالية",   earned: false, icon: "🔥" },
      { id: "rich_5k",   text: "جمع 5000 عملة",             earned: false, icon: "💎" },
      { id: "lvl_20",    text: "الوصول للمستوى 20",         earned: false, icon: "🌟" },
      { id: "master_200",text: "200 إجابة صحيحة",           earned: false, icon: "🏅" },
      { id: "all_cats",  text: "لعب في كل التصنيفات الـ 8", earned: false, icon: "🌍" },
      { id: "weekly_win",text: "فاز بتحدي أسبوعي",          earned: false, icon: "🏆" },
      { id: "friend_3",  text: "أضف 3 أصدقاء",              earned: false, icon: "🤝" },
      { id: "host_5",    text: "استضف 5 غرف لعب",           earned: false, icon: "🏰" },
      { id: "chatty",    text: "أرسل 20 رسالة في الغرف",    earned: false, icon: "💬" }
    ],
    weeklyChallenge: { weekId: "", score: 0, completed: false, reward: 1000 },
    loginStreak: { count: 0, lastDate: "", maxCount: 0 },
    detailedStats: {
      speedAnswers: 0, noHintGames: 0, comebackWins: 0,
      categoriesPlayed: [], avgAnswerTime: 0, totalAnswerTime: 0, totalAnswers: 0,
      messagesSent: 0, hostedRooms: 0
    },
    friendRequests: [],
    friends: [],
    friendCodes: "",
    _mapProgress: [],
    _subProgress: {},
    _catsToday: [],
    _friendsLastXP: {}
  };
}

// ══════════════════════════════════════════════════════════════════
// حفظ البيانات في Firestore و localStorage
// ══════════════════════════════════════════════════════════════════
export async function saveData() {
  if (!window.gameData) return;
  try {
    localStorage.setItem('shaghel_gamedata_backup', JSON.stringify(window.gameData));
  } catch (e) {}

  if (!navigator.onLine) {
    window.queueOfflineSave?.(window.gameData);
    return;
  }

  if (!window.currentUser || !window.db || !window.firebaseReady) return;

  const uid = window.currentUser.uid;
  const d = window.gameData;
  try {
    await window.db_set(`artifacts/${window.appId}/users/${uid}/profile/data`, d, true);
    const season = getCurrentSeason();
    await window.db_set(`artifacts/${window.appId}/public/data/rankings/${uid}`, {
      username: d.username, xp: d.xp, level: d.level, avatar: d.avatar,
      avatarFrame: d.avatarFrame || "none", accentColor: d.accentColor || "#fbbf24",
      message: d.message || "", rank: d.rank, uid,
      updatedAt: Date.now(),
      [`season_${season}`]: d.xp
    }, true);
  } catch (e) {
    console.error("Save error:", e);
    window.queueOfflineSave?.(d);
  }
}
window.saveData = saveData;

// ══════════════════════════════════════════════════════════════════
// تحديث المهام اليومية
// ══════════════════════════════════════════════════════════════════
export function updateDailyTask(id, amt) {
  const d = window.gameData;
  const task = d.dailyTasks.find(t => t.id === id);
  if (task && !task.claimed) {
    task.current = Math.min(task.current + amt, task.goal);
    if (task.current >= task.goal) {
      d.coins += task.reward;
      task.claimed = true;
      showToast(`🎁 مهمة منجزة! +${task.reward} عملة`);
    }
  }
}
window.updateDailyTask = updateDailyTask;

// ══════════════════════════════════════════════════════════════════
// تحديث المهام الأسبوعية
// ══════════════════════════════════════════════════════════════════
export function updateWeeklyTask(id, amt) {
  if (amt <= 0) return; // ← تجاهل القيم الصفرية أو السالبة (إصلاح bug قديم)

  const d = window.gameData;
  if (!d) return;

  // ── إصلاح: نستخدم getWeekId للأسبوع وليس getCurrentSeason للشهر ──
  // المشكلة القديمة: كانت تستخدم getCurrentSeason (شهري) بدل getWeekId (أسبوعي)
  // فكانت المهام الأسبوعية تتمسح كل شهر مش كل أسبوع
  const weekId = window.getWeekId?.() || getCurrentSeason();

  // ── إصلاح: لو weeklyTasks مش موجودة أو فاضية — نعملها init من الـ defaults ──
  if (!d.weeklyTasks || !d.weeklyTasks.length) {
    d.weeklyTasks = [
      { id: "w_games_5",   text: "العب 5 جولات هذا الأسبوع",  goal: 5,  current: 0, reward: 500,  claimed: false, weekId: "" },
      { id: "w_daily_3",   text: "أكمل 3 تحديات يومية",       goal: 3,  current: 0, reward: 700,  claimed: false, weekId: "" },
      { id: "w_correct_30",text: "أجب 30 سؤالاً صحيحاً",     goal: 30, current: 0, reward: 800,  claimed: false, weekId: "" },
      { id: "w_streak_10", text: "حقق سلسلة 10 في جولة",     goal: 10, current: 0, reward: 1000, claimed: false, weekId: "" },
    ];
  }

  const task = d.weeklyTasks.find(t => t.id === id);
  if (!task || task.claimed) return;

  // إعادة تعيين لو أسبوع جديد
  if (task.weekId !== weekId) {
    task.weekId  = weekId;
    task.current = 0;
    task.claimed = false;
  }

  task.current = Math.min(task.current + amt, task.goal);
  if (task.current >= task.goal && !task.claimed) {
    showToast(`📋 مهمة أسبوعية جاهزة للاستلام! +${task.reward} عملة`);
  }
}
window.updateWeeklyTask = updateWeeklyTask;

// ══════════════════════════════════════════════════════════════════
// إضافة XP موسمي
// ══════════════════════════════════════════════════════════════════
export function addSeasonXP(amt) {
  const d = window.gameData;
  const season = getCurrentSeason();
  if (!d.seasonData) d.seasonData = { seasonId: season, xp: 0, rank: 'برونز', gamesPlayed: 0, challengesDone: 0, weeklyDone: 0, rewardClaimed: false };
  if (d.seasonData.seasonId !== season) {
    d.seasonData = { seasonId: season, xp: 0, rank: 'برونز', gamesPlayed: 0, challengesDone: 0, weeklyDone: 0, rewardClaimed: false };
  }
  d.seasonData.xp += amt;
}
window.addSeasonXP = addSeasonXP;

// ══════════════════════════════════════════════════════════════════
// فحص المستوى وتحديث الرتبة والإنجازات
// ══════════════════════════════════════════════════════════════════
export function checkLevel() {
  const d = window.gameData;
  if (!d) return;

  // ── رفع المستوى ──
  while (d.xp >= (d.level || 1) * 1500) {
    d.level++;
    d.coins += 500;
    playSound("snd-level");
    try { confetti({ particleCount: 200, spread: 120, origin: { y: 0.6 } }); } catch (e) {}
    if      (d.level >= 50) d.rank = "🌟 أسطورة الأساطير";
    else if (d.level >= 30) d.rank = "👑 إمبراطور المعرفة";
    else if (d.level >= 20) d.rank = "💎 أسطورة المعرفة";
    else if (d.level >= 15) d.rank = "🔮 مفكر عالمي";
    else if (d.level >= 10) d.rank = "🎓 باحث متفوق";
    else if (d.level >= 5)  d.rank = "📚 قارئ نهم";
    else                    d.rank = "🔍 باحث عن المعرفة";
    showToast(`🎉 المستوى ${d.level}! +500 عملة`);
    // مكافأة إضافية كل 5 مستويات
    if (d.level % 5 === 0) {
      const bonus = d.level * 100;
      d.coins += bonus;
      setTimeout(() => showToast(`🎁 مكافأة المستوى ${d.level}: +${bonus} عملة!`, 4000), 300);
    }
  }

  // ── فتح الإنجازات ──
  const unlk = (id, msg) => {
    const a = d.achievements?.find(x => x.id === id);
    if (a && !a.earned) {
      a.earned = true;
      setTimeout(() => showToast(msg), 600);
    }
  };

  if (d.level >= 5)                      unlk("lvl_5",     "🏆 إنجاز: المستوى 5!");
  if (d.level >= 10)                     unlk("lvl_10",    "👑 إنجاز: المستوى 10!");
  if (d.level >= 20)                     unlk("lvl_20",    "🌟 إنجاز: المستوى 20!");
  if (d.stats?.maxStreak >= 5)           unlk("streak_5",  "⚡ إنجاز: سلسلة 5!");
  if (d.stats?.maxStreak >= 10)          unlk("streak_10", "🔥 إنجاز: سلسلة 10!");
  if (d.coins >= 2000)                   unlk("rich",      "💰 إنجاز: 2000 عملة!");
  if (d.coins >= 5000)                   unlk("rich_5k",   "💎 إنجاز: 5000 عملة!");
  if (d.stats?.gamesPlayed >= 10)        unlk("veteran",   "🎖️ إنجاز: 10 جولات!");
  if (d.stats?.correctAnswers >= 50)     unlk("master_50", "🧠 إنجاز: 50 إجابة!");
  if (d.stats?.correctAnswers >= 200)    unlk("master_200","🏅 إنجاز: 200 إجابة صحيحة!");
  if (d.stats?.completedSections >= 5)   unlk("explorer",  "🗺️ إنجاز: 5 أقسام!");
  if (d.stats?.dailyChallengesWon >= 3)  unlk("daily_3",   "📅 إنجاز: 3 تحديات يومية!");
  if (d.stats?.dailyChallengesWon >= 7)  unlk("daily_7",   "🔥 إنجاز: 7 تحديات يومية!");
  if (d.detailedStats?.speedAnswers >= 5) unlk("speed_5",  "⚡ إنجاز: 5 إجابات سريعة!");
  if (d.detailedStats?.noHintGames >= 1)  unlk("no_hint",  "🎯 إنجاز: جولة بدون مساعدات!");
  if ((d.friends?.length || 0) >= 3)      unlk("friend_3", "🤝 إنجاز: 3 أصدقاء!");

  // ── إصلاح: all_cats يستخدم categoryConfig الديناميكي بدل list ثابتة ──
  // المشكلة القديمة: كانت list ثابتة بـ 8 تصنيفات قديمة وما بتشملش التصنيفات الجديدة
  const played  = d.detailedStats?.categoriesPlayed || [];
  const allCats = Object.values(categoryConfig).map(c => c.name);
  if (allCats.length > 0 && allCats.every(c => played.includes(c))) {
    unlk("all_cats", "🌍 إنجاز: لعبت في كل التصنيفات!");
  }
}
window.checkLevel = checkLevel;

// ══════════════════════════════════════════════════════════════════
// تحديث سلسلة الدخول اليومي
// ══════════════════════════════════════════════════════════════════
export function updateLoginStreak() {
  const d = window.gameData;
  if (!d.loginStreak) d.loginStreak = { count: 0, lastDate: '', maxCount: 0 };
  const today = new Date().toDateString();
  const ls = d.loginStreak;
  const yesterday = new Date(Date.now() - 86400000).toDateString();

  if (ls.lastDate === today) return;

  if (ls.lastDate === yesterday) {
    ls.count++;
    ls.lastDate = today;
    if (ls.count > ls.maxCount) ls.maxCount = ls.count;
    const dayInCycle = ((ls.count - 1) % 7) + 1;
    const rewards = [0, 50, 100, 150, 200, 300, 400, 700];
    const reward = rewards[dayInCycle] || 50;
    d.coins += reward;
    addSeasonXP(20 * dayInCycle);
    showToast(`🔥 يوم ${ls.count}! +${reward} عملة`, 3500);
  } else {
    if (ls.count >= 3) showToast(`😢 انكسرت سلسلتك (${ls.count} يوم)`, 3000);
    ls.count = 1;
    ls.lastDate = today;
    d.coins += 50;
    showToast(`🎁 يوم جديد! +50 عملة`, 3500);
  }
}
window.updateLoginStreak = updateLoginStreak;

// ══════════════════════════════════════════════════════════════════
// دوال مساعدة للبيانات (تستخدم في UI)
// ══════════════════════════════════════════════════════════════════
export function getSeasonRank(xp) {
  const ranks = [
    { name: 'برونز',    minXP: 0,    color: '#cd7f32', emoji: '🥉', reward: 500 },
    { name: 'فضي',      minXP: 500,  color: '#c0c0c0', emoji: '🥈', reward: 1000 },
    { name: 'ذهبي',     minXP: 1500, color: '#ffd700', emoji: '🥇', reward: 2000 },
    { name: 'بلاتيني',  minXP: 3000, color: '#e5e4e2', emoji: '💎', reward: 3500 },
    { name: 'ألماسي',   minXP: 6000, color: '#b9f2ff', emoji: '👑', reward: 5000 },
  ];
  let rank = ranks[0];
  for (const r of ranks) if (xp >= r.minXP) rank = r;
  return rank;
}

export function getSeasonProgress(xp) {
  const ranks = [
    { name: 'برونز',    minXP: 0,    color: '#cd7f32', emoji: '🥉' },
    { name: 'فضي',      minXP: 500,  color: '#c0c0c0', emoji: '🥈' },
    { name: 'ذهبي',     minXP: 1500, color: '#ffd700', emoji: '🥇' },
    { name: 'بلاتيني',  minXP: 3000, color: '#e5e4e2', emoji: '💎' },
    { name: 'ألماسي',   minXP: 6000, color: '#b9f2ff', emoji: '👑' },
  ];
  const idx = ranks.findIndex(r => xp < r.minXP);
  if (idx === -1) return { rank: ranks[ranks.length - 1], pct: 100, nextXP: 0, toNext: 0 };
  const curr = ranks[idx - 1] || ranks[0];
  const next = ranks[idx];
  const pct = Math.round(((xp - curr.minXP) / (next.minXP - curr.minXP)) * 100);
  return { rank: curr, next, pct: Math.min(pct, 100), nextXP: next.minXP, toNext: next.minXP - xp };
}


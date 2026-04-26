
// js/firebase.js
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  updateDoc,
  query,
  orderBy,
  limit,
  where,
  serverTimestamp,
  deleteField,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// إعدادات Firebase الخاصة بمشروعك
const firebaseConfig = {
  apiKey: "AIzaSyBKQFpuzt92Uk_mJrSWuIYaVgqpc2g8stA",
  authDomain: "shaghel-mokh-ultra.firebaseapp.com",
  projectId: "shaghel-mokh-ultra",
  storageBucket: "shaghel-mokh-ultra.firebasestorage.app",
  messagingSenderId: "167435076773",
  appId: "1:167435076773:web:ce058e3d064707bb7cf94c",
  measurementId: "G-EPJ1MGWBQW",
};

// تهيئة Firebase
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const APP_ID = "shaghel-mokh-ultra-full";

// تعيين متغيرات عامة على window لتستخدمها دوال HTML القديمة
window.db = db;
window.auth = auth;
window.appId = APP_ID;
window.firebaseReady = false;
window.currentUser = null;

// دوال مساعدة لـ Firestore (لتسهيل الاستخدام في أي مكان)
window.db_doc = (path) => doc(db, ...path.split("/"));
window.db_col = (path) => collection(db, ...path.split("/"));
window.db_set = async (path, data, merge = true) =>
  setDoc(doc(db, ...path.split("/")), data, { merge });
window.db_get = (path) => getDoc(doc(db, ...path.split("/")));
window.db_add = (path, data) => addDoc(collection(db, ...path.split("/")), data);
window.db_delete = (path) => deleteDoc(doc(db, ...path.split("/")));
window.db_snap = (path, cb, err) =>
  onSnapshot(doc(db, ...path.split("/")), cb, err);
window.db_colsnap = (path, cb, err) =>
  onSnapshot(collection(db, ...path.split("/")), cb, err);
window.db_getDocs = (path) => getDocs(collection(db, ...path.split("/")));
window.db_query = (path, ...constraints) =>
  getDocs(query(collection(db, ...path.split("/")), ...constraints));
window.dbOrderBy = orderBy;
window.dbLimit = limit;
window.dbWhere = where;
window.dbServerTs = serverTimestamp;
window.dbDeleteField = deleteField;

// دالة للحصول على الموسم الحالي (تُستخدم في أماكن كثيرة)
export function getCurrentSeason() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
window.getCurrentSeason = getCurrentSeason;

// دالة للحصول على معرف الأسبوع (تُستخدم في التحديات الأسبوعية)
export function getWeekId() {
  const d = new Date();
  const year = d.getFullYear();
  const start = new Date(year, 0, 1);
  const week = Math.ceil(((d - start) / 86400000 + start.getDay() + 1) / 7);
  return `${year}-W${String(week).padStart(2, "0")}`;
}
window.getWeekId = getWeekId;

// تصدير الكائنات الأساسية لاستخدامها في باقي الوحدات
export { db, auth, APP_ID };


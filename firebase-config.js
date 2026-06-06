// ============================================
// Firebase Configuration for Leduc Islamic Association
// ============================================
// INSTRUCTIONS:
// 1. Go to https://console.firebase.google.com
// 2. Create a new project (or use existing)
// 3. Go to Project Settings > General > Your apps > Add web app
// 4. Copy the firebaseConfig object and paste below
// 5. Enable Authentication: Build > Authentication > Email/Password
// 6. Enable Firestore: Build > Firestore Database > Create database (Start in production mode)
// 7. Set Firestore rules (see firestore-rules.txt)
// ============================================

const firebaseConfig = {
  apiKey: "AIzaSyCR5U3j4YcgBMj1UQc3zZ6lCbps33IGK1U",
  authDomain: "leduc-islamic-association.firebaseapp.com",
  projectId: "leduc-islamic-association",
  storageBucket: "leduc-islamic-association.firebasestorage.app",
  messagingSenderId: "404843757601",
  appId: "1:404843757601:web:45889ac785c3017eed6360",
  measurementId: "G-B21HKYRQDT"
};

// ============================================
// Firebase Initialization (Do not edit below)
// ============================================
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut, createUserWithEmailAndPassword }
  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc }
  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ============================================
// Auth Helpers
// ============================================
async function firebaseLogin(email, password) {
  return await signInWithEmailAndPassword(auth, email, password);
}

async function firebaseSignup(email, password) {
  return await createUserWithEmailAndPassword(auth, email, password);
}

async function firebaseLogout() {
  return await signOut(auth);
}

function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

function getCurrentUser() {
  return auth.currentUser;
}

// ============================================
// Firestore Settings Helpers
// ============================================
async function saveSettings(collection, data) {
  await setDoc(doc(db, 'settings', collection), data);
}

async function loadSettings(collection) {
  const snapshot = await getDoc(doc(db, 'settings', collection));
  return snapshot.exists() ? snapshot.data() : null;
}

// Convenience methods
async function savePaymentSettings(data) {
  await saveSettings('payment', data);
}

async function loadPaymentSettings() {
  return await loadSettings('payment');
}

async function saveOrgSettings(data) {
  await saveSettings('organization', data);
}

async function loadOrgSettings() {
  return await loadSettings('organization');
}

async function saveJumahSettings(data) {
  await saveSettings('jumah', data);
}

async function loadJumahSettings() {
  return await loadSettings('jumah');
}

// Public settings loader (for non-admin pages)
async function loadPublicSettings() {
  try {
    const [jumah, payment, org] = await Promise.all([
      loadSettings('jumah'),
      loadSettings('payment'),
      loadSettings('organization'),
    ]);
    return { jumah, payment, org };
  } catch {
    return { jumah: null, payment: null, org: null };
  }
}

// ============================================
// Check if Firebase is configured
// ============================================
function isFirebaseConfigured() {
  return firebaseConfig.apiKey !== 'YOUR_API_KEY' && firebaseConfig.apiKey.length > 10;
}

// Export everything
export {
  auth, db,
  firebaseLogin, firebaseSignup, firebaseLogout,
  onAuthChange, getCurrentUser,
  saveSettings, loadSettings,
  savePaymentSettings, loadPaymentSettings,
  saveOrgSettings, loadOrgSettings,
  saveJumahSettings, loadJumahSettings,
  loadPublicSettings,
  isFirebaseConfigured
};

// ============================================================
// LANGKAH SETUP (lakukan 1x saja):
// 1. Buka https://console.firebase.google.com
// 2. Klik "Add project" → beri nama → Create
// 3. Di sidebar kiri, klik "Firestore Database" → Create database → Start in test mode
// 4. Kembali ke Project Overview → klik ikon "</>" (Web) → daftarkan app
// 5. Copy nilai-nilai di bawah dari konfigurasi Firebase Anda
// ============================================================

const firebaseConfig = {
  apiKey:            "AIzaSyA_JNuK6wjKw1W6Rcs0nufL6HR2TBAIe4c",
  authDomain:        "drinkwater-d2844.firebaseapp.com",
  projectId:         "drinkwater-d2844",
  storageBucket:     "drinkwater-d2844.firebasestorage.app",
  messagingSenderId: "473245332825",
  appId:             "1:473245332825:web:57d68e24a6bdd569298848"
};

// ============================================================
// PIN OWNER — ganti dengan PIN rahasia Anda
// PIN ini digunakan untuk masuk ke halaman Owner (index.html)
// ============================================================
const OWNER_PIN = "1234";

// ============================================================
// NAMA APLIKASI — tampil di browser tab & PWA
// ============================================================
const APP_NAME = "DRINKWATTEAAH";

// ============================================================
// user.js — Logic untuk halaman User (user.html?id=USERID)
// ============================================================

// --- Inisialisasi Firebase ---
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const usersCol = db.collection("users");

// --- State global ---
let currentUserId = null;
let currentUserData = null;
let allUsersListener = null;

// ============================================================
// INISIALISASI — Jalankan saat halaman dibuka
// ============================================================
window.onload = async function () {
  // 1. Ambil ID dari URL: user.html?id=USERID
  const params = new URLSearchParams(window.location.search);
  let idFromUrl = params.get("id");

  // Jika ada ID di URL, simpan ke memori HP (localStorage) agar diingat
  if (idFromUrl) {
    localStorage.setItem("hydrotrack_user_id", idFromUrl);
    currentUserId = idFromUrl;
  } else {
    // Jika tidak ada di URL (misal: dibuka dari ikon PWA di Home Screen),
    // coba ambil dari memori HP
    currentUserId = localStorage.getItem("hydrotrack_user_id");
  }

  // Jika masih tidak ada ID sama sekali, berarti link tidak valid
  if (!currentUserId) {
    showError();
    return;
  }

  // 2. Dengarkan perubahan realtime untuk user ini
  usersCol.doc(currentUserId).onSnapshot(async (doc) => {
    if (!doc.exists) {
      showError();
      return;
    }

    currentUserData = { id: doc.id, ...doc.data() };

    // 3. Cek apakah perlu reset harian
    await checkAndResetIfNewDay(currentUserData);

    // 4. Tampilkan halaman
    renderUserPage(currentUserData);

    // 5. Isi target input dengan nilai saat ini
    document.getElementById("target-input").value = currentUserData.targetMl;
  });
};

// ============================================================
// CEK & RESET HARIAN (otomatis jam 00.00)
// ============================================================
async function checkAndResetIfNewDay(userData) {
  const today = getTodayString();
  if (userData.lastResetDate !== today) {
    // Hari baru! Reset progress
    await usersCol.doc(currentUserId).update({
      todayMl:       0,
      logs:          [],
      lastResetDate: today,
    });
    // Data akan di-update via onSnapshot, tidak perlu return apapun
  }
}

// ============================================================
// RENDER HALAMAN USER
// ============================================================
function renderUserPage(userData) {
  document.getElementById("loading-screen").style.display = "none";
  document.getElementById("user-page").style.display = "block";

  // Nama & tanggal
  document.getElementById("user-name-display").textContent = userData.name;
  document.getElementById("today-date").textContent = formatDateDisplay(getTodayString());
  document.title = `H2O Flow — ${userData.name}`;

  // Progress calculations
  const todayMl  = userData.todayMl  || 0;
  const targetMl = userData.targetMl || 2000;
  let percent  = Math.round((todayMl / targetMl) * 100);
  if (percent > 100) percent = 100; // Cap at 100% for the circle

  // Update Circular Progress Bar
  const circle = document.getElementById("circular-progress");
  const degrees = Math.round((percent / 100) * 360);
  circle.style.background = `conic-gradient(#fff ${degrees}deg, rgba(255,255,255,0.15) ${degrees}deg)`;

  // Texts
  document.getElementById("my-progress-text").innerHTML = `${todayMl}<span style="font-size:1rem">ml</span>`;
  document.getElementById("goal-status-text").textContent = `of ${targetMl} ml Goal`;

  // Riwayat log
  renderLogs(userData.logs || []);

  // Lihat user lain (jika punya akses)
  if (userData.canSeeOthers) {
    document.getElementById("others-section").style.display = "block";
    listenToOthers();
  } else {
    document.getElementById("others-section").style.display = "none";
    if (allUsersListener) {
      allUsersListener(); // Berhenti mendengarkan jika akses dicabut
      allUsersListener = null;
    }
  }
}

// ============================================================
// RENDER LOG RIWAYAT
// ============================================================
function renderLogs(logs) {
  const list  = document.getElementById("log-list");
  const noMsg = document.getElementById("no-log-msg");

  if (!logs || logs.length === 0) {
    list.innerHTML = "";
    noMsg.style.display = "block";
    return;
  }

  noMsg.style.display = "none";
  // Tampilkan dari yang terbaru (reverse)
  const reversed = [...logs].reverse();
  list.innerHTML = reversed.map(log =>
    `<li class="log-item"><span class="log-time">${log.time}</span> <span class="log-amount">+${log.amount} ml</span></li>`
  ).join("");
}

// ============================================================
// TAMBAH MINUM
// ============================================================
async function addDrink() {
  const amountInput = document.getElementById("drink-amount");
  const amount = parseInt(amountInput.value);
  const btn = document.getElementById("drink-btn");

  if (!amount || amount < 1) {
    alert("Masukkan jumlah minum yang valid (minimal 1 ml).");
    return;
  }

  btn.disabled = true;
  btn.textContent = "Menambahkan...";

  try {
    const now = new Date();
    const timeStr = now.toTimeString().slice(0, 5); // "HH:MM"

    const newLog = { amount, time: timeStr };
    const newTodayMl = (currentUserData.todayMl || 0) + amount;
    const newLogs = [...(currentUserData.logs || []), newLog];

    await usersCol.doc(currentUserId).update({
      todayMl: newTodayMl,
      logs:    newLogs,
    });

    amountInput.value = ""; // Reset input
  } catch (err) {
    alert("Gagal menambah data: " + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = "+ Tambah";
  }
}

// Shortcut tombol cepat
function quickAdd(amount) {
  document.getElementById("drink-amount").value = amount;
  addDrink();
}

// Izinkan tekan Enter untuk tambah minum
document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("drink-amount");
  if (input) {
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") addDrink();
    });
  }
});

// ============================================================
// SIMPAN TARGET BARU
// ============================================================
async function saveTarget() {
  const newTarget = parseInt(document.getElementById("target-input").value);
  const statusEl = document.getElementById("target-status");

  if (!newTarget || newTarget < 100) {
    statusEl.textContent = "❌ Target minimal 100 ml.";
    return;
  }

  const btn = document.getElementById("save-target-btn");
  btn.disabled = true;

  try {
    await usersCol.doc(currentUserId).update({ targetMl: newTarget });
    statusEl.textContent = `✅ Target diubah menjadi ${newTarget} ml.`;
    setTimeout(() => { statusEl.textContent = ""; }, 3000);
  } catch (err) {
    statusEl.textContent = "❌ Gagal menyimpan: " + err.message;
  } finally {
    btn.disabled = false;
  }
}

// ============================================================
// LIHAT PROGRESS USER LAIN (realtime)
// ============================================================
function listenToOthers() {
  if (allUsersListener) return; // Sudah mendengarkan, jangan dobel

  allUsersListener = usersCol.orderBy("name").onSnapshot((snapshot) => {
    const container = document.getElementById("others-list");
    container.innerHTML = "";

    snapshot.forEach((doc) => {
      if (doc.id === currentUserId) return; // Skip diri sendiri

      const user = doc.data();
      const todayMl  = user.todayMl  || 0;
      const targetMl = user.targetMl || 2000;
      const percent  = Math.min(Math.round((todayMl / targetMl) * 100), 100);

      const card = document.createElement("div");
      card.className = "other-user-card";
      card.innerHTML = `
        <div class="other-name-row">
          <span>${escapeHtml(user.name)}</span>
          <span>${todayMl}/${targetMl} ml</span>
        </div>
        <div class="linear-track">
          <div class="linear-fill" style="width: ${percent}%;"></div>
        </div>
      `;
      container.appendChild(card);
    });

    if (container.innerHTML === "") {
      container.innerHTML = "<p>Belum ada teman lain yang terdaftar.</p>";
    }
  });
}

// ============================================================
// ERROR SCREEN
// ============================================================
function showError() {
  document.getElementById("loading-screen").style.display = "none";
  document.getElementById("error-screen").style.display = "block";
}

// ============================================================
// HELPER
// ============================================================
function getTodayString() {
  return new Date().toISOString().split("T")[0]; // "YYYY-MM-DD"
}

function formatDateDisplay(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("id-ID", {
    weekday: "long",
    year:    "numeric",
    month:   "long",
    day:     "numeric",
  });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

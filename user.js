// ============================================================
// user.js — Logic untuk halaman User (user.html?id=USERID)
// ============================================================

// --- Inisialisasi Firebase ---
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const usersCol = db.collection("users");

// --- State global ---
let currentUserId   = null;
let currentUserData = null;
let allUsersListener = null;
let previousTodayMl          = null; // nilai todayMl dari render sebelumnya
let congratsShownThisSession = false; // sudah tampil congrats di sesi ini?
let _drPopupResolve = null;           // resolver untuk daily report popup

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

  // Preload semua gambar popup agar tidak loading saat ditampilkan
  preloadAllImages();

  // 2. Dengarkan perubahan realtime untuk user ini
  usersCol.doc(currentUserId).onSnapshot(async (doc) => {
    if (!doc.exists) {
      showError();
      return;
    }

    const isFirstLoad = (currentUserData === null);
    currentUserData = { id: doc.id, ...doc.data() };

    const today = getTodayString();
    const needsReset = currentUserData.lastResetDate !== today;

    if (needsReset) {
      // Render halaman dengan data kemarin dulu (agar animasi drain bisa berjalan)
      renderUserPage(currentUserData, true); // true = skip congrats untuk data lama
      document.getElementById("target-input").value = currentUserData.targetMl;
      // Beri waktu render selesai, lalu jalankan flow reset
      await new Promise(r => setTimeout(r, 150));
      await performDayReset(currentUserData);
      // Firestore update di performDayReset akan trigger onSnapshot lagi dengan data 0ml
      return;
    }

    // Render normal
    renderUserPage(currentUserData);
    document.getElementById("target-input").value = currentUserData.targetMl;

    // Meme popup — tampil 1x saat pertama buka
    if (isFirstLoad) {
      setTimeout(showMemePopup, 300);
    }
  });
};

// ============================================================
// RESET HARIAN — simpan history, tampil popup, animasi drain
// ============================================================
async function performDayReset(userData) {
  const today = getTodayString();

  // 1. Siapkan record kemarin (hanya jika ada tanggal sebelumnya)
  const hadRealDay = userData.lastResetDate && userData.lastResetDate !== today;
  let yesterdayRecord = null;
  if (hadRealDay) {
    yesterdayRecord = {
      date:      userData.lastResetDate,
      totalMl:   userData.todayMl   || 0,
      targetMl:  userData.targetMl  || 2000,
      achieved:  (userData.todayMl || 0) >= (userData.targetMl || 2000),
    };
  }

  // 2. Tampilkan daily report popup jika ada data kemarin
  if (yesterdayRecord && yesterdayRecord.totalMl > 0) {
    showDailyReportPopup(yesterdayRecord);
    // Tunggu user tutup popup atau 7 detik otomatis
    await new Promise(resolve => {
      _drPopupResolve = resolve;
      setTimeout(resolve, 7000);
    });
    closeDailyReport();
    await new Promise(r => setTimeout(r, 400)); // tunggu animasi close
  }

  // 3. Animasi air surut
  await animateWaterDrain();

  // 4. Reset state
  previousTodayMl          = null;
  congratsShownThisSession = false;

  // 5. Simpan history ke Firestore & reset data harian
  const newHistory = [...(userData.history || [])];
  if (yesterdayRecord) newHistory.push(yesterdayRecord);

  await usersCol.doc(currentUserId).update({
    todayMl:       0,
    logs:          [],
    lastResetDate: today,
    history:       newHistory,
  });
}

// ============================================================
// ANIMASI AIR SURUT (saat pergantian hari)
// ============================================================
async function animateWaterDrain() {
  return new Promise((resolve) => {
    const waterGroup = document.getElementById('water-group');
    const duckGroup  = document.getElementById('duck-group');
    // Animasi surut: air turun ke posisi kosong (y=312) dalam 2.5 detik
    if (waterGroup) {
      waterGroup.style.transition = 'transform 2.5s ease-in';
      waterGroup.style.transform  = 'translate(0px, 312px)';
    }
    if (duckGroup) {
      duckGroup.style.transition = 'transform 2.5s ease-in';
      duckGroup.style.transform  = 'translate(0px, 312px)';
    }
    // Setelah animasi selesai, kembalikan transition ke normal
    setTimeout(() => {
      if (waterGroup) waterGroup.style.transition = 'transform 1s cubic-bezier(0.4, 0, 0.2, 1)';
      if (duckGroup)  duckGroup.style.transition  = 'transform 1s cubic-bezier(0.4, 0, 0.2, 1)';
      resolve();
    }, 2700);
  });
}

// ============================================================
// RENDER HALAMAN USER
// ============================================================
function renderUserPage(userData, skipCongrats = false) {
  document.getElementById("loading-screen").style.display = "none";
  document.getElementById("user-page").style.display = "block";

  // Nama & tanggal
  document.getElementById("user-name-display").textContent = userData.name;
  document.getElementById("today-date").textContent = formatDateDisplay(getTodayString());
  document.title = `DRINKWATTEAAH — ${userData.name}`;

  // Progress calculations
  const todayMl  = userData.todayMl  || 0;
  const targetMl = userData.targetMl || 2000;
  let percent = Math.round((todayMl / targetMl) * 100);
  if (percent > 100) percent = 100;

  // Move the SVG water level using style.transform (so CSS transition works)
  const waterY = 312 - (290 * percent / 100);
  const waterGroup = document.getElementById('water-group');
  if (waterGroup) waterGroup.style.transform = `translate(0px, ${waterY}px)`;

  // Bebek ikut naik-turun bersama permukaan air
  const duckGroup = document.getElementById('duck-group');
  if (duckGroup) {
    // Sync with water level exactly
    duckGroup.style.transform = `translate(0px, ${waterY}px)`;
  }

  // Update SVG text labels
  const amountEl = document.getElementById('svg-amount');
  const goalEl   = document.getElementById('svg-goal');
  const pctEl    = document.getElementById('svg-percent');
  if (amountEl) amountEl.textContent = `${todayMl}ml`;
  if (goalEl)   goalEl.textContent   = `of ${targetMl} ml Goal`;
  if (pctEl)    pctEl.textContent    = `${percent}%`;

  // -------------------------------------------------------
  // CONGRATS LOGIC:
  // Tampilkan congrats ketika:
  //   a) User baru melewati threshold (crossing dari bawah ke atas), ATAU
  //   b) User buka app dan sudah di atas target (first load)
  // Tapi hanya 1x per sesi (per buka-tutup app)
  // -------------------------------------------------------
  const isFirstRender  = (previousTodayMl === null);
  const justCrossed    = !isFirstRender && previousTodayMl < targetMl && todayMl >= targetMl;
  const alreadyAtGoal  = isFirstRender && todayMl >= targetMl;

  if ((justCrossed || alreadyAtGoal) && !congratsShownThisSession) {
    congratsShownThisSession = true;
    setTimeout(showCongratsPopup, 800);
  }
  previousTodayMl = todayMl;

  // Riwayat log hari ini
  renderLogs(userData.logs || []);

  // Riwayat semua hari
  renderHistory(userData.history || []);

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

// ============================================================
// DAILY REPORT POPUP
// ============================================================
function showDailyReportPopup(record) {
  const overlay = document.getElementById('daily-report-overlay');
  if (!overlay) return;

  const percent  = Math.min(Math.round((record.totalMl / record.targetMl) * 100), 100);
  const achieved = record.achieved;

  document.getElementById('dr-emoji').textContent     = achieved ? '🏆' : '💧';
  document.getElementById('dr-title').textContent     = achieved ? 'Target Tercapai!' : 'Hampir Sampai!';
  document.getElementById('dr-date').textContent      = formatDateDisplay(record.date);
  document.getElementById('dr-amount').textContent    = `${record.totalMl} ml`;
  document.getElementById('dr-target-text').textContent = `dari target ${record.targetMl} ml`;
  document.getElementById('dr-percent').textContent   = `${percent}%`;
  document.getElementById('dr-message').textContent   = achieved
    ? '🎉 Luar biasa! Pertahankan hari ini ya!'
    : '💪 Yuk kejar target hari ini, pasti bisa!';

  // Progress bar
  const fill = document.getElementById('dr-bar-fill');
  if (fill) fill.style.width = percent + '%';

  // Tampilkan overlay + animasi card masuk
  overlay.style.display = 'flex';
  const card = overlay.querySelector('.daily-report-card');
  if (card) {
    card.style.transform = 'scale(0.5)';
    card.style.opacity   = '0';
    requestAnimationFrame(() => {
      card.style.transition = 'transform 0.45s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.35s ease';
      card.style.transform  = 'scale(1)';
      card.style.opacity    = '1';
    });
  }
}

function closeDailyReport() {
  const overlay = document.getElementById('daily-report-overlay');
  const card    = overlay?.querySelector('.daily-report-card');
  if (card) {
    card.style.transition = 'transform 0.3s ease-in, opacity 0.3s ease-in';
    card.style.transform  = 'scale(0.5)';
    card.style.opacity    = '0';
  }
  setTimeout(() => {
    if (overlay) overlay.style.display = 'none';
    if (_drPopupResolve) { _drPopupResolve(); _drPopupResolve = null; }
  }, 350);
}

// ============================================================
// RENDER RIWAYAT HARIAN (history selamanya)
// ============================================================
function renderHistory(history) {
  const section = document.getElementById('history-section');
  const list    = document.getElementById('history-list');
  if (!section || !list) return;

  if (!history || history.length === 0) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';

  // Urutkan dari yang terbaru
  const sorted = [...history].sort((a, b) => b.date.localeCompare(a.date));

  list.innerHTML = sorted.map(record => {
    const percent  = Math.min(Math.round((record.totalMl / record.targetMl) * 100), 100);
    const achieved = record.achieved;
    return `
      <div class="history-item">
        <div class="history-item-header">
          <span class="history-date">${escapeHtml(formatDateDisplay(record.date))}</span>
          <span class="history-badge ${achieved ? 'badge-hit' : 'badge-miss'}">${achieved ? '✅' : '❌'}</span>
        </div>
        <div class="history-ml">${record.totalMl} / ${record.targetMl} ml</div>
        <div class="history-track">
          <div class="history-fill" style="width: ${percent}%;"></div>
        </div>
      </div>
    `;
  }).join('');
}


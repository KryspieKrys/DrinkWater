// ============================================================
// owner.js — Logic untuk halaman Owner (index.html)
// ============================================================

// --- Inisialisasi Firebase ---
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const usersCol = db.collection("users");

// --- Cek apakah sudah login sebagai owner (simpan di sessionStorage) ---
window.onload = function () {
  if (sessionStorage.getItem("ownerLoggedIn") === "true") {
    showDashboard();
  }
};

// ============================================================
// PIN — Fungsi masuk
// ============================================================
function submitPin() {
  const input = document.getElementById("pin-input").value.trim();
  if (input === OWNER_PIN) {
    sessionStorage.setItem("ownerLoggedIn", "true");
    showDashboard();
  } else {
    document.getElementById("pin-error").style.display = "block";
  }
}

// Izinkan tekan Enter untuk submit PIN
document.getElementById("pin-input").addEventListener("keydown", function (e) {
  if (e.key === "Enter") submitPin();
});

function showDashboard() {
  document.getElementById("pin-screen").style.display = "none";
  document.getElementById("dashboard").style.display = "block";
  listenToUsers(); // Mulai dengarkan perubahan realtime dari Firestore
}

// ============================================================
// REALTIME LISTENER — Update tabel otomatis saat ada perubahan
// ============================================================
function listenToUsers() {
  usersCol.orderBy("name").onSnapshot((snapshot) => {
    const loading = document.getElementById("loading-users");
    const table = document.getElementById("users-table");
    const noMsg = document.getElementById("no-users-msg");
    const tbody = document.getElementById("users-tbody");

    loading.style.display = "none";

    if (snapshot.empty) {
      table.style.display = "none";
      noMsg.style.display = "block";
      return;
    }

    noMsg.style.display = "none";
    table.style.display = "table";
    tbody.innerHTML = ""; // Reset tabel

    snapshot.forEach((doc) => {
      const user = doc.data();
      const userId = doc.id;
      const percent = Math.min(Math.round((user.todayMl / user.targetMl) * 100), 100);
      const link = `${window.location.origin}${window.location.pathname.replace("index.html", "")}user.html?id=${userId}`;

      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${escapeHtml(user.name)}</td>
        <td>
          <div class="progress-bar-container">
            <div class="progress-bar-fill" style="width: ${percent}%;"></div>
          </div>
          <span class="progress-label">${user.todayMl || 0} / ${user.targetMl} ml (${percent}%)</span>
        </td>
        <td>${user.targetMl} ml</td>
        <td>
          <input 
            type="checkbox" 
            ${user.canSeeOthers ? "checked" : ""} 
            onchange="toggleCanSeeOthers('${userId}', this.checked)"
            title="Toggle izin lihat progress user lain"
          />
        </td>
        <td>
          <button onclick="copyLink('${link}', this)">Salin Link</button>
        </td>
        <td>
          <button onclick="deleteUser('${userId}', '${escapeHtml(user.name)}')">Hapus</button>
        </td>
      `;
      tbody.appendChild(row);
    });
  });
}

// ============================================================
// TAMBAH USER BARU
// ============================================================
async function addUser() {
  const name     = document.getElementById("new-name").value.trim();
  const targetMl = parseInt(document.getElementById("new-target").value);
  const canSee   = document.getElementById("new-can-see").checked;
  const errEl    = document.getElementById("add-user-error");

  // Validasi
  errEl.style.display = "none";
  if (!name) {
    errEl.textContent = "Nama tidak boleh kosong.";
    errEl.style.display = "block";
    return;
  }
  if (!targetMl || targetMl < 100) {
    errEl.textContent = "Target minimal 100 ml.";
    errEl.style.display = "block";
    return;
  }

  const btn = document.getElementById("add-user-btn");
  btn.disabled = true;
  btn.textContent = "Menambahkan...";

  try {
    await usersCol.add({
      name:          name,
      targetMl:      targetMl,
      canSeeOthers:  canSee,
      todayMl:       0,
      lastResetDate: getTodayString(),
      logs:          [],
    });

    // Reset form
    document.getElementById("new-name").value    = "";
    document.getElementById("new-target").value  = "";
    document.getElementById("new-can-see").checked = true;
  } catch (err) {
    errEl.textContent = "Gagal menambah user: " + err.message;
    errEl.style.display = "block";
  } finally {
    btn.disabled = false;
    btn.textContent = "+ Tambah User";
  }
}

// ============================================================
// TOGGLE canSeeOthers
// ============================================================
async function toggleCanSeeOthers(userId, value) {
  try {
    await usersCol.doc(userId).update({ canSeeOthers: value });
  } catch (err) {
    alert("Gagal mengubah izin: " + err.message);
  }
}

// ============================================================
// HAPUS USER
// ============================================================
async function deleteUser(userId, name) {
  if (!confirm(`Yakin hapus user "${name}"? Data progressnya akan hilang.`)) return;
  try {
    await usersCol.doc(userId).delete();
  } catch (err) {
    alert("Gagal menghapus user: " + err.message);
  }
}

// ============================================================
// SALIN LINK KE CLIPBOARD
// ============================================================
function copyLink(link, btn) {
  navigator.clipboard.writeText(link).then(() => {
    const original = btn.textContent;
    btn.textContent = "✅ Tersalin!";
    setTimeout(() => { btn.textContent = original; }, 2000);
  }).catch(() => {
    // Fallback untuk browser lama
    prompt("Salin link ini:", link);
  });
}

// ============================================================
// HELPER — Utilitas
// ============================================================
function getTodayString() {
  return new Date().toISOString().split("T")[0]; // "YYYY-MM-DD"
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

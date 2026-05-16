// ============================================================
// POPUP.JS — Meme popup & Congratulations popup
// ============================================================

// Daftar semua gambar meme (urutan di-random saat app dibuka)
const MEME_IMAGES = [
  "memes/1.jpeg", "memes/2.png", "memes/3.png", "memes/4.png",
  "memes/5.jpeg", "memes/6.jpeg", "memes/7.jpeg", "memes/8.jpeg",
  "memes/9.jpeg", "memes/10.jpeg"
];

// Daftar gambar congratulations
const CONGRATS_IMAGES = [
  "congrats/1.png", "congrats/2.png", "congrats/3.png", "congrats/4.png"
];

// Kunci untuk menyimpan state ke localStorage
const MEME_TODAY_KEY    = "drinkwat_meme_shown_date";
const CONGRATS_TODAY_KEY = "drinkwat_congrats_shown_date";

// Ambil string tanggal hari ini (YYYY-MM-DD)
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// Pilih item random dari array
function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ============================================================
// MEME POPUP — muncul 1x per hari saat buka app
// ============================================================
function showMemePopup() {
  // Cek apakah hari ini sudah ditampilkan
  // if (localStorage.getItem(MEME_TODAY_KEY) === todayStr()) return;

  const overlay = document.getElementById("meme-overlay");
  const img     = document.getElementById("meme-img");

  img.src = pickRandom(MEME_IMAGES);
  img.className = "popup-img"; // reset class
  overlay.style.display = "flex";

  // Fase 1: Pop-in (0.45s)
  img.classList.add("meme-popin");

  // Fase 2: Shake (mulai setelah pop-in selesai, 0.45s)
  setTimeout(() => {
    img.className = "popup-img meme-shake";
  }, 450);

  // Fase 3: Biarkan diam sebentar (total ~2 detik dari awal)
  // Fase 4: Pop-out (mulai di ~1.8s)
  setTimeout(() => {
    img.className = "popup-img meme-popout";
  }, 1800);

  // Sembunyikan overlay setelah animasi pop-out selesai
  setTimeout(() => {
    overlay.style.display = "none";
    img.src = "";
  }, 2200);

  // Tandai hari ini sudah ditampilkan
  localStorage.setItem(MEME_TODAY_KEY, todayStr());
}

// ============================================================
// CONGRATS POPUP — muncul 1x per hari saat target terpenuhi
// ============================================================
let congratsShownToday = false; // Flag in-memory agar tidak muncul dobel

function showCongratsPopup() {
  // Cek apakah congrats hari ini sudah muncul
  if (localStorage.getItem(CONGRATS_TODAY_KEY) === todayStr()) return;
  if (congratsShownToday) return;
  congratsShownToday = true;

  const overlay = document.getElementById("congrats-overlay");
  const img     = document.getElementById("congrats-img");
  const canvas  = document.getElementById("confetti-canvas");

  img.src = pickRandom(CONGRATS_IMAGES);
  img.className = "popup-img";
  overlay.style.display = "flex";

  // Mulai animasi confetti
  startConfetti(canvas);

  // Pop-in image
  setTimeout(() => { img.classList.add("congrats-popin"); }, 50);

  // Pop-out setelah 3 detik
  setTimeout(() => {
    img.className = "popup-img congrats-popout";
    stopConfetti();
  }, 3000);

  // Sembunyikan overlay
  setTimeout(() => {
    overlay.style.display = "none";
    img.src = "";
  }, 3500);

  // Tandai hari ini sudah tampil
  localStorage.setItem(CONGRATS_TODAY_KEY, todayStr());
}

// ============================================================
// CONFETTI ENGINE — canvas-based, lightweight
// ============================================================
let confettiAnimId = null;
const COLORS = ["#ff6b6b","#ffd93d","#6bcb77","#4d96ff","#ff922b","#cc5de8","#f06595","#74ebd5"];

function startConfetti(canvas) {
  canvas.width  = canvas.parentElement.clientWidth;
  canvas.height = canvas.parentElement.clientHeight;
  const ctx = canvas.getContext("2d");

  // Buat 120 partikel confetti
  const particles = Array.from({ length: 120 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height - canvas.height,
    w: Math.random() * 10 + 6,
    h: Math.random() * 5 + 3,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    rot: Math.random() * Math.PI * 2,
    vy: Math.random() * 3 + 2,
    vx: (Math.random() - 0.5) * 2,
    vr: (Math.random() - 0.5) * 0.15,
    opacity: 1
  }));

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.y  += p.vy;
      p.x  += p.vx;
      p.rot += p.vr;
      if (p.y > canvas.height) { p.y = -10; p.x = Math.random() * canvas.width; }

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = p.opacity;
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    });
    confettiAnimId = requestAnimationFrame(draw);
  }
  draw();
}

function stopConfetti() {
  if (confettiAnimId) {
    cancelAnimationFrame(confettiAnimId);
    confettiAnimId = null;
  }
  const canvas = document.getElementById("confetti-canvas");
  if (canvas) canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
}

// ============================================================
// POPUP.JS — Meme popup & Congratulations popup
// ============================================================

// Daftar semua gambar meme
const MEME_IMAGES = [
  "memes/1.jpeg", "memes/2.png", "memes/3.png", "memes/4.png",
  "memes/5.jpeg", "memes/6.jpeg", "memes/7.jpeg", "memes/8.jpeg",
  "memes/9.jpeg", "memes/10.jpeg"
];

// Daftar gambar congratulations
const CONGRATS_IMAGES = [
  "congrats/1.png", "congrats/2.png", "congrats/3.png", "congrats/4.png"
];

// Kunci localStorage
const MEME_TODAY_KEY     = "drinkwat_meme_shown_date";
const CONGRATS_TODAY_KEY = "drinkwat_congrats_shown_date";

// Cache gambar yang sudah di-preload (src → Image object)
const _preloadedImages = {};
let _preloadDone = false;

// ============================================================
// PRELOAD — panggil sekali saat halaman pertama kali dibuka
// ============================================================
function preloadAllImages() {
  if (_preloadDone) return;
  _preloadDone = true;

  const allImages = [...MEME_IMAGES, ...CONGRATS_IMAGES];
  allImages.forEach(src => {
    const img = new Image();
    img.src = src;
    _preloadedImages[src] = img;
  });
}

// Ambil tanggal hari ini (YYYY-MM-DD)
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// Pilih item random dari array
function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ============================================================
// MEME POPUP — total tampil 4 detik
// Fase: pop-in (0.45s) → shake (0.35s) → diam → pop-out (0.35s)
// ============================================================
function showMemePopup() {
  const overlay = document.getElementById("meme-overlay");
  const img     = document.getElementById("meme-img");

  const chosenSrc = pickRandom(MEME_IMAGES);

  // Pakai gambar yang sudah di-preload agar instant (tidak loading lagi)
  if (_preloadedImages[chosenSrc] && _preloadedImages[chosenSrc].complete) {
    img.src = _preloadedImages[chosenSrc].src;
  } else {
    img.src = chosenSrc;
  }

  img.className   = "popup-img";
  overlay.style.display = "flex";

  // Fase 1: Pop-in
  requestAnimationFrame(() => img.classList.add("meme-popin"));

  // Fase 2: Shake (setelah pop-in)
  setTimeout(() => { img.className = "popup-img meme-shake"; }, 500);

  // Fase 3: Diam sampai ~3.65s, lalu pop-out
  // (total: 0.45 popin + 0.35 shake + ~2.85 diam + 0.35 popout = 4s)
  setTimeout(() => { img.className = "popup-img meme-popout"; }, 3650);

  // Sembunyikan overlay total setelah 4 detik
  setTimeout(() => {
    overlay.style.display = "none";
    img.src = "";
  }, 4050);

  // Tandai hari ini sudah tampil
  localStorage.setItem(MEME_TODAY_KEY, todayStr());
}

// ============================================================
// CONGRATS POPUP — total tampil 6 detik + confetti
// ============================================================
let congratsShownToday = false;

function showCongratsPopup() {
  if (localStorage.getItem(CONGRATS_TODAY_KEY) === todayStr()) return;
  if (congratsShownToday) return;
  congratsShownToday = true;

  const overlay = document.getElementById("congrats-overlay");
  const img     = document.getElementById("congrats-img");
  const canvas  = document.getElementById("confetti-canvas");

  const chosenSrc = pickRandom(CONGRATS_IMAGES);
  if (_preloadedImages[chosenSrc] && _preloadedImages[chosenSrc].complete) {
    img.src = _preloadedImages[chosenSrc].src;
  } else {
    img.src = chosenSrc;
  }

  img.className = "popup-img";
  overlay.style.display = "flex";

  // Mulai confetti
  startConfetti(canvas);

  // Pop-in
  setTimeout(() => { img.classList.add("congrats-popin"); }, 50);

  // Pop-out setelah 5.6s, sembunyi di 6s
  setTimeout(() => {
    img.className = "popup-img congrats-popout";
    stopConfetti();
  }, 5600);

  setTimeout(() => {
    overlay.style.display = "none";
    img.src = "";
  }, 6050);

  localStorage.setItem(CONGRATS_TODAY_KEY, todayStr());
}

// ============================================================
// CONFETTI ENGINE — canvas-based
// ============================================================
let confettiAnimId = null;
const COLORS = ["#ff6b6b","#ffd93d","#6bcb77","#4d96ff","#ff922b","#cc5de8","#f06595","#74ebd5"];

function startConfetti(canvas) {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  const ctx = canvas.getContext("2d");

  const particles = Array.from({ length: 140 }, () => ({
    x:   Math.random() * canvas.width,
    y:   Math.random() * canvas.height - canvas.height,
    w:   Math.random() * 11 + 6,
    h:   Math.random() * 6 + 3,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    rot: Math.random() * Math.PI * 2,
    vy:  Math.random() * 4 + 2,
    vx:  (Math.random() - 0.5) * 2.5,
    vr:  (Math.random() - 0.5) * 0.18,
  }));

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.y += p.vy; p.x += p.vx; p.rot += p.vr;
      if (p.y > canvas.height) { p.y = -12; p.x = Math.random() * canvas.width; }
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    });
    confettiAnimId = requestAnimationFrame(draw);
  }
  draw();
}

function stopConfetti() {
  if (confettiAnimId) { cancelAnimationFrame(confettiAnimId); confettiAnimId = null; }
  const c = document.getElementById("confetti-canvas");
  if (c) c.getContext("2d").clearRect(0, 0, c.width, c.height);
}

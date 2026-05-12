// ============================================================
// sw.js — Service Worker untuk PWA
// Memungkinkan app di-install ke Home Screen HP
// ============================================================

const CACHE_NAME = "hydrotrack-v2";
const ASSETS_TO_CACHE = [
  "./user.html",
  "./user.js",
  "./firebase-config.js",
  "./style.css",
  "./manifest.json",
];

// Install: simpan file ke cache
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate: hapus cache lama
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch: gunakan cache jika ada, kalau tidak ambil dari network
// Catatan: Firestore (Firebase) selalu diambil dari network (tidak di-cache)
self.addEventListener("fetch", (event) => {
  // Jangan cache request Firebase
  if (event.request.url.includes("firestore") || event.request.url.includes("firebase")) {
    return; // Biarkan browser handle seperti biasa
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request);
    })
  );
});

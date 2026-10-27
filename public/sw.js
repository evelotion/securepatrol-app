/* SecurePatrol service worker — cache shell statis & fallback offline.

   F1-2: halaman login-only (dashboard, absensi + selfie base64) TIDAK boleh
   masuk cache. Yang disimpan hanya /offline + aset build /_next/static.
   Versi cache dinaikkan ke v2 supaya cache v1 lama dibersihkan saat activate. */
const CACHE_VERSION = "v2";
const STATIC_CACHE = `securepatrol-static-${CACHE_VERSION}`;
const KEEP_CACHES = [STATIC_CACHE];
const SHELL = ["/offline", "/icons/icon-192.png"];

function hapusCacheLama() {
  return caches
    .keys()
    .then((keys) =>
      Promise.all(
        keys.filter((k) => !KEEP_CACHES.includes(k)).map((k) => caches.delete(k)),
      ),
    );
}

function isiShell(cache) {
  return cache.addAll(SHELL);
}

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then(isiShell).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(hapusCacheLama().then(() => self.clients.claim()));
});

/* Logout: client kirim {type:"CLEAR"} -> hapus SEMUA cache (termasuk aset),
   lalu isi ulang shell /offline supaya mode pesawat tetap punya halaman offline. */
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "CLEAR") {
    event.waitUntil(
      caches
        .keys()
        .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
        .then(() => caches.open(STATIC_CACHE).then(isiShell)),
    );
  }
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Aset build Next.js di-hash — aman disimpan cache-first.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const hit = await cache.match(request);
        if (hit) return hit;
        const res = await fetch(request);
        if (res.ok) cache.put(request, res.clone());
        return res;
      }),
    );
    return;
  }

  // Navigasi: network-first, TIDAK pernah disimpan ke cache (bisa berisi data
  // user). Gagal jaringan -> hanya halaman /offline dari shell statis.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const offline = await caches.match("/offline");
        return offline ?? Response.error();
      }),
    );
  }
});
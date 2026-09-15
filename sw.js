// Service worker de EduAvisos.
//
// index.html carga css/js con un query string de cache-busting distinto en
// cada visita (?v=<timestamp>) para forzar siempre la última versión durante
// el desarrollo. Por eso el fetch handler usa network-first (para no romper
// ese comportamiento estando online) y, al mirar en caché, ignora el query
// string (`ignoreSearch`) para que el fallback offline sí encuentre el
// recurso precacheado.
//
// Sube el valor en sw-version.js (p. ej. "eduavisos-v2") si necesitas que los
// usuarios que están offline reciban un cambio importante en cuanto vuelvan a
// tener red; los que están online ya reciben la última versión en cada carga.
importScripts("sw-version.js");
const CACHE_NAME = EDUAVISOS_SW_VERSION;

const PRECACHE_URLS = [
  "./",
  "index.html",
  "manifest.json",
  "sw-version.js",
  "css/styles.css",
  "js/i18n.js",
  "js/app.js",
  "vendor/pdf.min.js",
  "vendor/pdf.worker.min.js",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-512-maskable.png",
  "icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Se cachea y se busca por la URL sin el query string de cache-busting
  // (?v=...), así una misma carpeta/archivo tiene siempre una única entrada
  // en caché en vez de acumular una por cada carga.
  const cacheKey = url.origin + url.pathname;

  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(cacheKey, copy));
        return response;
      })
      .catch(() =>
        caches
          .match(cacheKey)
          .then((cached) => cached || caches.match("index.html"))
      )
  );
});

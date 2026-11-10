// =====================================================================
// service-worker.js  -  PWA offline support
// ---------------------------------------------------------------------
// 1. On install: save ("precache") the app files so they can load offline.
// 2. On activate: delete older cache versions.
// 3. On fetch: try the network first; if the device is offline, serve the
//    saved copy from the cache ("network falling back to cache").
// To force new files after a big change, increase the version in CACHE_NAME.
// =====================================================================

const CACHE_NAME = "ctu-service-requests-v1";

const APP_SHELL = [
  "./",
  "./index.html",
  "./css/styles.css",
  "./js/app.js",
  "./js/config.js",
  "./js/ui.js",
  "./js/requestService.js",
  "./js/dataStore.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  if (new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)); // refresh the saved copy
        return response;
      })
      .catch(() =>
        caches.match(request, { ignoreSearch: true }).then((cached) => {
          if (cached) return cached;
          if (request.mode === "navigate") return caches.match("./index.html"); // offline page load
          return new Response("Offline and not cached.", { status: 503, statusText: "Offline" });
        })
      )
  );
});

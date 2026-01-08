const CACHE = "m_hub-pwa-v2.1";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) =>
      c.addAll([
        "/",
        "/index.html",
        "/app.js",
        "/api.js",
        "/ui.js",
        "/config.js",
        "/pwa.js",
        "/admin.html",
        "/assets/admin/admin.js",
        "/assets/admin/admin.css",
        "/manifest.webmanifest"
      ])
    )
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k !== CACHE ? caches.delete(k) : Promise.resolve())))
    )
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if (req.method !== "GET") return;

  if (url.origin === location.origin) {
    event.respondWith(
      caches.match(req).then((cached) => cached || fetch(req).catch(() => cached))
    );
  }
});

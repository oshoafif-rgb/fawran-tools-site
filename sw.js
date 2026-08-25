const CACHE = "fawran-v4";
const CORE = [
  "/", "/index.html", "/en/index.html",
  "/assets/style.css", "/assets/main.js",
  "/favicon.svg", "/manifest.webmanifest", "/404.html"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(CORE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return;

  const isNavigation = event.request.mode === "navigate" ||
    event.request.destination === "document" ||
    url.pathname.endsWith(".html") || url.pathname === "/";

  if (isNavigation) {
    // Fresh HTML first so Netlify deploys are visible immediately; cached HTML is offline fallback.
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then(cache => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => caches.match(event.request).then(cached => cached || caches.match("/404.html")))
    );
    return;
  }

  // Static assets: cache-first for fast repeat visits.
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(event.request, copy));
        }
        return response;
      });
    })
  );
});

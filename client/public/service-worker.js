const CACHE_NAME = "leaf-v2";

// Asset list injected during build by Vite
const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./404.html",
  "./manifest.webmanifest",
  "./nasirpintu.jpg",
  "./icons/leaf.svg",
  "./icons/leaf-192.png",
  "./icons/leaf-512.png",
  "./icons/apple-touch-icon.png"
  /* __BUILD_ASSETS__ */
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      const scopeBase = new URL("./", self.registration.scope);
      const requests = PRECACHE_URLS.map((url) => new URL(url, scopeBase).toString());
      return Promise.allSettled(
        requests.map((req) =>
          fetch(req, { cache: "no-cache" }).then((res) => {
            if (res.ok) return cache.put(req, res);
          })
        )
      );
    })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const scopeBase = new URL("./", self.registration.scope);

  // Only handle requests within this application's scope
  if (url.origin !== scopeBase.origin || !url.pathname.startsWith(scopeBase.pathname)) {
    return;
  }

  // Handle SPA navigation requests
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        // Cache first for instant offline startup
        const cached = await caches.match(new URL("./index.html", scopeBase).toString())
          || await caches.match(new URL("./", scopeBase).toString())
          || await caches.match(request);

        if (cached) {
          // Revalidate in background when online
          fetch(request)
            .then((res) => {
              if (res.ok) {
                caches.open(CACHE_NAME).then((cache) => cache.put(request, res));
              }
            })
            .catch(() => { /* offline - use cached version */ });
          return cached;
        }

        // If not in cache, fetch from network and cache
        try {
          const networkRes = await fetch(request);
          if (networkRes.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkRes.clone());
            cache.put(new URL("./index.html", scopeBase).toString(), networkRes.clone());
          }
          return networkRes;
        } catch {
          const fallback = await caches.match(new URL("./index.html", scopeBase).toString())
            || await caches.match(new URL("./", scopeBase).toString());
          if (fallback) return fallback;
          return new Response("Leaf is offline.", { status: 200, headers: { "Content-Type": "text/html" } });
        }
      })()
    );
    return;
  }

  // Handle static assets (JS, CSS, images, fonts, PDF worker) -> Cache First
  event.respondWith(
    (async () => {
      const cached = await caches.match(request);
      if (cached) return cached;

      try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok && networkResponse.type === "basic") {
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, networkResponse.clone());
        }
        return networkResponse;
      } catch (err) {
        if (request.destination === "document") {
          const fallback = await caches.match(new URL("./index.html", scopeBase).toString());
          if (fallback) return fallback;
        }
        return new Response("Offline resource unavailable", { status: 503, statusText: "Offline" });
      }
    })()
  );
});

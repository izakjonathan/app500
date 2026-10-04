const CACHE_NAME = "rummy500-v53";
const ASSETS = ["/", "/manifest.webmanifest", "/bg.jpg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  // Leave cloud/API requests to the network; never return app HTML for them.
  if (url.origin !== self.location.origin) return;
  const isNavigation = event.request.mode === "navigate";
  if (!isNavigation && !ASSETS.includes(url.pathname)) return;

  event.respondWith(
    fetch(event.request).catch(async () => {
      const cached = await caches.match(event.request);
      if (cached) return cached;
      if (isNavigation) {
        const page = await caches.match("/");
        if (page) return page;
      }
      return Response.error();
    })
  );
});

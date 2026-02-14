const CACHE_NAME = `smthmind-v4`;
const urlsToCache = [
  "/",
  "/index.html",
  "/css/variables.css",
  "/css/main.css",
  "/css/newItem.css",
  "/css/list.css",
  "/css/empty.css",
  "/css/animations.css",
  "/js/main.js",
  "/js/shortcuts.js",
  "/js/dexie.min.js",
  "/js/dexie-export-import.js",
  "/assets/angry.png",
  "/assets/sad.png",
  "/assets/neutral.png",
  "/assets/good.png",
  "/assets/happy.png",
  "/assets/icon512.png",
  "/assets/icon.svg",
  "/assets/apple-touch-icon.png",
  "/manifest.webmanifest",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              return caches.delete(cacheName);
            }
          }),
        );
      })
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        return response;
      }

      const fetchRequest = event.request.clone();

      return fetch(fetchRequest).then((response) => {
        if (!response || response.status !== 200 || response.type === "error") {
          return response;
        }

        const responseToCache = response.clone();

        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return response;
      });
    }),
  );
});

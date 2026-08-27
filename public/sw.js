const CACHE = "murlan-v5-android-install";
const cardRanks = ["3","4","5","6","7","8","9","10","jack","queen","king","ace","2"];
const cardSuits = ["hearts","diamonds","clubs","spades"];
const CARD_ASSETS = cardSuits.flatMap((suit) => cardRanks.map((rank) => `/cards/${rank}_of_${suit}.svg`)).concat(["/cards/joker_black_v4.webp","/cards/joker_red_v4.webp"]);
const APP_SHELL = ["/", "/offline.html", "/manifest.webmanifest", "/favicon.ico", "/murlan-icon-32.png", "/murlan-icon-192.png", "/murlan-icon-512.png", "/murlan-icon-maskable-512.png", "/murlan-apple-touch-icon.png", ...CARD_ASSETS];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put("/", copy));
          return response;
        })
        .catch(async () => (await caches.match("/")) || caches.match("/offline.html")),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(request, copy));
      }
      return response;
    })),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((client) => client.url.startsWith(self.location.origin));
      if (existing) {
        existing.navigate(targetUrl);
        return existing.focus();
      }
      return self.clients.openWindow(targetUrl);
    }),
  );
});

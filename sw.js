const CACHE_NAME = "tiantian-checkin-v1.2.18";
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css?v=1.2.18",
  "./app.js?v=1.2.18",
  "./core.mjs?v=1.2.18",
  "./manifest.webmanifest",
  "./assets/fonts/PuHui-Regular.ttf",
  "./assets/fonts/PuHui-Medium.ttf",
  "./assets/fonts/PuHui-SemiBold.ttf",
  "./assets/fonts/PuHui-Bold.ttf",
  "./assets/fonts/PuHui-ExtraBold.ttf",
  "./assets/figma/add.svg",
  "./assets/figma/back.svg",
  "./assets/figma/bolt.svg",
  "./assets/figma/calendar.svg",
  "./assets/figma/check.svg",
  "./assets/figma/checkin-success.svg",
  "./assets/figma/chevron.svg",
  "./assets/figma/close.svg",
  "./assets/figma/confetti.svg",
  "./assets/figma/confetti-blue.svg",
  "./assets/figma/confetti-orange.svg",
  "./assets/figma/confetti-mint.svg",
  "./assets/figma/confetti-pink.svg",
  "./assets/figma/confetti-yellow.svg",
  "./assets/figma/confetti-star.svg",
  "./assets/figma/day-lion.svg",
  "./assets/figma/down.svg",
  "./assets/figma/modal-success.svg",
  "./assets/figma/edit-name.svg",
  "./assets/figma/gift.svg",
  "./assets/figma/home-wave.svg",
  "./assets/figma/nav-badge-active.svg",
  "./assets/figma/nav-badge-inactive.svg",
  "./assets/figma/nav-home-active.svg",
  "./assets/figma/nav-home-inactive.svg",
  "./assets/figma/nav-publish-active.svg",
  "./assets/figma/nav-publish-inactive.svg",
  "./assets/figma/reward-success.svg",
  "./assets/figma/share.svg",
  "./assets/figma/share-success.svg",
  "./assets/figma/spark-dot-lg.svg",
  "./assets/figma/spark-dot-sm.svg",
  "./assets/figma/spark-star-lg.svg",
  "./assets/figma/spark-star-sm.svg",
  "./assets/figma/status-battery-border.svg",
  "./assets/figma/status-battery-cap.svg",
  "./assets/figma/status-signal-1.svg",
  "./assets/figma/status-signal-2.svg",
  "./assets/figma/status-signal-3.svg",
  "./assets/figma/status-signal-4.svg",
  "./assets/figma/status-wifi-1.svg",
  "./assets/figma/status-wifi-2.svg",
  "./assets/figma/status-wifi-3.svg",
  "./assets/figma/success-stat-streak.svg",
  "./assets/figma/success-stat-target.svg",
  "./assets/figma/success-stat-week.svg",
  "./assets/figma/success.svg",
  "./assets/figma/success-inner-ring.svg",
  "./assets/figma/success-outer-ring.svg",
  "./assets/figma/target.svg",
  "./assets/figma/undo.svg",
  "./assets/figma/lion-badges.png",
  "./assets/figma/lion-empty.png",
  "./assets/figma/lion-home.png",
  "./assets/figma/lion-publish.png",
  "./assets/figma/lion-success.png?v=1.2.18",
  "./assets/figma/modal-lion.png",
  "./assets/figma/revoke.svg",
  "./assets/figma/makeup.svg",
  "./assets/figma/poster-lion.png?v=1.2.18",
  "./assets/figma/poster-save.svg",
  "./assets/figma/poster-wood-knot.svg",
  "./assets/figma/poster-wood-long.svg",
  "./assets/figma/poster-wood-short.svg",
  "./assets/figma/poster-wood-vertical.svg",
  "./assets/figma/poster-footer-knot-small.svg",
  "./assets/figma/poster-footer-knot-large.svg",
  "./assets/figma/poster-footer-grain-left.svg",
  "./assets/figma/poster-footer-grain-right.svg",
  "./assets/figma/poster-medal-ring.svg",
  "./assets/figma/poster-plant-left.svg",
  "./assets/figma/poster-plant-right.svg",
  "./assets/figma/profile-avatar.png?v=1.2.18",
  "./assets/figma/qr-code.png",
  "./assets/figma/app-icon-192.png",
  "./assets/figma/app-icon-512.png",
  "./assets/figma/medal-rookie-color.png",
  "./assets/figma/medal-rookie-gray.png",
  "./assets/figma/medal-skilled-color.png",
  "./assets/figma/medal-skilled-gray.png",
  "./assets/figma/medal-expert-color.png",
  "./assets/figma/medal-expert-gray.png",
  "./assets/figma/medal-master-color.png",
  "./assets/figma/medal-master-gray.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const requestUrl = new URL(event.request.url);
  const isCode = requestUrl.pathname.endsWith(".js") || requestUrl.pathname.endsWith(".mjs") || requestUrl.pathname.endsWith(".css") || requestUrl.pathname.endsWith(".html") || requestUrl.pathname.endsWith("/");
  if (isCode) {
    event.respondWith(fetch(event.request).then((response) => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
      return response;
    }).catch(() => caches.match(event.request).then((cached) => cached || caches.match("./index.html"))));
    return;
  }
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
    const copy = response.clone();
    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
    return response;
  })));
});

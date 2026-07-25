const CACHE_NAME = "tiantian-checkin-v1.2.2";
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css?v=1.2.2",
  "./app.js?v=1.2.2",
  "./core.mjs?v=1.2.2",
  "./manifest.webmanifest",
  "./assets/fonts/PuHui-Regular.ttf",
  "./assets/fonts/PuHui-Medium.ttf",
  "./assets/fonts/PuHui-SemiBold.ttf",
  "./assets/fonts/PuHui-Bold.ttf",
  "./assets/fonts/PuHui-ExtraBold.ttf",
  "./assets/figma/add.svg",
  "./assets/figma/back.svg",
  "./assets/figma/calendar.svg",
  "./assets/figma/check.svg",
  "./assets/figma/chevron.svg",
  "./assets/figma/close.svg",
  "./assets/figma/confetti.svg",
  "./assets/figma/day-lion.svg",
  "./assets/figma/down.svg",
  "./assets/figma/edit-name.svg",
  "./assets/figma/gift.svg",
  "./assets/figma/nav-badge.svg",
  "./assets/figma/nav-home.svg",
  "./assets/figma/nav-publish.svg",
  "./assets/figma/reward-success.svg",
  "./assets/figma/share.svg",
  "./assets/figma/success.svg",
  "./assets/figma/target.svg",
  "./assets/figma/undo.svg",
  "./assets/figma/lion-badges.png",
  "./assets/figma/lion-empty.png",
  "./assets/figma/lion-home.png",
  "./assets/figma/lion-publish.png",
  "./assets/figma/poster-lion.png",
  "./assets/figma/profile-avatar.png",
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

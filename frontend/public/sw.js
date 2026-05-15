// TiffinFlow service worker — offline cache + push notifications
const CACHE = "tf-v1";
const PRECACHE = ["/", "/manifest.json"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Stale-while-revalidate for menu API + same-origin GETs
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const isMenuApi = url.pathname.includes("/api/menu/");
  const sameOrigin = url.origin === self.location.origin;
  if (!isMenuApi && !sameOrigin) return;

  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(req);
      const fetchPromise = fetch(req)
        .then((resp) => {
          if (resp && resp.status === 200) cache.put(req, resp.clone());
          return resp;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});

// Web Push
self.addEventListener("push", (event) => {
  let payload = { title: "TiffinFlow", body: "You have an update" };
  try { if (event.data) payload = event.data.json(); } catch (e) {}
  const options = {
    body: payload.body,
    icon: "/app-icon.svg",
    badge: "/app-icon.svg",
    data: payload.data || {},
    vibrate: [80, 40, 80],
  };
  event.waitUntil(self.registration.showNotification(payload.title || "TiffinFlow", options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.order_id)
    ? `/track/${event.notification.data.order_id}`
    : "/home";
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((cls) => {
      for (const c of cls) {
        if ("focus" in c) { c.navigate(target); return c.focus(); }
      }
      return clients.openWindow(target);
    })
  );
});

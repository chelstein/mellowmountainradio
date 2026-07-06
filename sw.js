/* KAZM Mellow Mountain Radio — service worker
   Strategy:
   - Same-origin PAGES + DATA (.json): network-first so live news, weather,
     fire level, and any EAS/alert data are always fresh online; fall back to
     cache (then the offline shell) when the network is gone.
   - Same-origin IMAGES/FONTS: cache-first with background revalidate (fast, safe
     to be a revision behind).
   - CROSS-ORIGIN (the live audio stream, Open-Meteo, USGS, NOAA, ADOT tiles,
     Google fonts, AzuraCast now-playing): NOT intercepted — straight to network,
     so streaming and live APIs are never touched by the cache.
*/
var VERSION = "kazm-v83";
var CORE = [
  "/", "/index.html", "/styles.css", "/main.js", "/manifest.webmanifest",
  "/offline.html", "/icon-192.png", "/icon-512.png",
  "/Color%20logo%20-%20no%20background.svg",
  "/news.html", "/events.html", "/vibe.html", "/shows.html", "/schedule.html",
  "/concerts.html", "/movies.html", "/podcasts.html", "/archives.html",
  "/staff.html", "/about.html", "/contact.html", "/library.html",
  "/music.html", "/sports.html", "/contests.html", "/advertising.html", "/wildlife.html",
  "/horoscope.html", "/chakras.html", "/soundhealing.html", "/photography.html", "/roads.html", "/weather.html", "/jeeptrails.html", "/firstpeoples.html", "/rewind.html", "/timemachine.html"
];

self.addEventListener("install", function (e) {
  e.waitUntil((async function () {
    var c = await caches.open(VERSION);
    // resilient precache: one bad URL won't abort the whole install
    await Promise.allSettled(CORE.map(function (u) { return c.add(new Request(u, { cache: "reload" })); }));
    self.skipWaiting();
  })());
});

self.addEventListener("activate", function (e) {
  e.waitUntil((async function () {
    var keys = await caches.keys();
    var hadOld = keys.some(function (k) { return k !== VERSION; });
    await Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
    await self.clients.claim();
    // On an UPDATE (not first install), force every open tab to reload so a
    // fresh deploy shows immediately — no manual hard-refresh needed.
    if (hadOld) {
      var cs = await self.clients.matchAll({ type: "window" });
      cs.forEach(function (c) { try { c.navigate(c.url); } catch (e) {} });
    }
  })());
});

// let the page tell a waiting SW to take over immediately
self.addEventListener("message", function (e) { if (e.data === "skipWaiting") self.skipWaiting(); });

function putCache(req, res) {
  if (res && res.ok && res.type === "basic") { var cp = res.clone(); caches.open(VERSION).then(function (c) { c.put(req, cp); }); }
  return res;
}

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // stream + live APIs go straight to network

  var isAsset = /\.(png|jpe?g|svg|webp|gif|ico|woff2?|ttf)$/i.test(url.pathname);
  if (isAsset) {
    e.respondWith(caches.match(req, { ignoreSearch: true }).then(function (cached) {
      var net = fetch(req).then(function (r) { return putCache(req, r); }).catch(function () { return cached; });
      return cached || net;
    }));
    return;
  }

  // pages, css, js, json, everything else same-origin: network-first, and
  // bypass the HTTP cache entirely (cache: "reload") so a fresh deploy is
  // always picked up — never a stale page/script.
  var fresh; try { fresh = new Request(req, { cache: "reload" }); } catch (e) { fresh = req; }
  e.respondWith(
    fetch(fresh).then(function (r) { return putCache(req, r); }).catch(function () {
      return caches.match(req, { ignoreSearch: true }).then(function (c) {
        if (c) return c;
        if (req.mode === "navigate") return caches.match("/offline.html").then(function (o) { return o || caches.match("/index.html"); });
        return Response.error();
      });
    })
  );
});

/* ---------------------------------------------------------------------------
   FUTURE: EAS / fire / severe-weather PUSH NOTIFICATIONS
   ---------------------------------------------------------------------------
   Intentionally NOT wired up yet — real push needs a backend to hold VAPID
   keys and store subscriptions (n8n at n8n.mellowmountainradio.com could send
   them). buoyIQ already delivers EAS today, so this stays a clean hook until
   we stand up web-push. When ready:
     1. Generate a VAPID keypair; expose the public key to the client.
     2. Client: navigator.serviceWorker.ready -> pushManager.subscribe({
          userVisibleOnly: true, applicationServerKey: <VAPID public> })
        then POST the subscription to the backend.
     3. Backend sends a Web Push payload on a new fire-level / severe alert.
   Uncomment and implement against the real backend — do NOT ship fake pushes.

self.addEventListener("push", function (e) {
  var data = {};
  try { data = e.data ? e.data.json() : {}; } catch (err) {}
  e.waitUntil(self.registration.showNotification(data.title || "KAZM Alert", {
    body: data.body || "", icon: "/icon-192.png", badge: "/icon-192.png",
    tag: data.tag || "kazm-alert", data: { url: data.url || "/news.html#weather" }
  }));
});
self.addEventListener("notificationclick", function (e) {
  e.notification.close();
  e.waitUntil(self.clients.openWindow((e.notification.data && e.notification.data.url) || "/"));
});
--------------------------------------------------------------------------- */

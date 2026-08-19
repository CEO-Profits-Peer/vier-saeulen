/* Vier Säulen — Service Worker.
 *
 * Die App ist local-first: alle Daten liegen ohnehin in localStorage. Der
 * Service Worker sorgt nur dafür, dass die Hülle auch ohne Netz startet.
 *
 * VERSION bei jedem Release hochzählen — davon hängt ab, ob alte Caches
 * beim Aktivieren weggeräumt werden.
 */
const VERSION = "v2";
const SHELL = `viersaeulen-shell-${VERSION}`;
const ASSETS = `viersaeulen-assets-${VERSION}`;

/* Die Routen der App. Schlägt eine davon beim Installieren fehl, soll nicht
   die ganze Installation scheitern — deshalb einzeln statt addAll. */
const ROUTES = ["/", "/flow", "/system", "/goals", "/stats", "/account"];
const EXTRAS = ["/manifest.webmanifest", "/icon-192.png", "/icon-512.png"];

/* Content-adressierte Dateien: der Hash im Namen garantiert, dass sich der
   Inhalt unter einer URL nie ändert. Nur die dürfen cache-first laufen. */
const isImmutable = (pathname) =>
  pathname.startsWith("/_next/static/") || pathname.startsWith("/icon") || pathname === "/apple-touch-icon.png";

/* Deckel für den Asset-Cache. Ohne den wächst er über Releases hinweg endlos. */
const ASSET_LIMIT = 120;

async function cacheEach(cacheName, urls) {
  const cache = await caches.open(cacheName);
  await Promise.all(
    urls.map((url) =>
      fetch(url, { cache: "reload" })
        .then((res) => (res.ok ? cache.put(url, res) : undefined))
        .catch(() => undefined),
    ),
  );
}

async function trim(cacheName, limit) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= limit) return;
  await Promise.all(keys.slice(0, keys.length - limit).map((k) => cache.delete(k)));
}

self.addEventListener("install", (event) => {
  event.waitUntil(cacheEach(SHELL, [...ROUTES, ...EXTRAS]));
  /* Bewusst kein skipWaiting: die laufende Seite behält ihre passenden
     Chunks, bis sie selbst neu lädt. Den Wechsel stößt die App per
     Nachricht an, sobald die Person zustimmt. */
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      if (self.registration.navigationPreload) {
        await self.registration.navigationPreload.enable().catch(() => undefined);
      }
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== SHELL && k !== ASSETS).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  /* Fremde Herkunft — vor allem Supabase — geht den Service Worker nichts an.
     Auth- und Sync-Aufrufe dürfen nie aus einem Cache beantwortet werden. */
  if (url.origin !== self.location.origin) return;

  /* Navigation: erst Netz, damit neue Deployments ankommen; dann Cache. */
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const preload = await event.preloadResponse;
          const response = preload || (await fetch(request));
          const cache = await caches.open(SHELL);
          cache.put(request, response.clone()).catch(() => undefined);
          return response;
        } catch {
          /* Offline: exakte Route, sonst irgendeine bekannte Hülle. Die App
             rendert clientseitig, die Daten kommen aus localStorage. */
          const exact = await caches.match(request);
          if (exact) return exact;
          const root = await caches.match("/");
          if (root) return root;
          return new Response(
            "<!doctype html><meta charset=utf-8><title>Offline</title>" +
              '<body style="font:17px system-ui;padding:40px;text-align:center">' +
              "<h1>Offline</h1><p>Die App war auf diesem Gerät noch nie online. " +
              "Einmal mit Netz öffnen, danach läuft sie auch ohne.</p>",
            { headers: { "Content-Type": "text/html; charset=utf-8" }, status: 503 },
          );
        }
      })(),
    );
    return;
  }

  /* Gehashte Dateien: cache-first, ihr Inhalt ändert sich unter der URL nie. */
  if (isImmutable(url.pathname)) {
    event.respondWith(
      (async () => {
        const hit = await caches.match(request);
        if (hit) return hit;
        const response = await fetch(request);
        if (response.ok) {
          const cache = await caches.open(ASSETS);
          await cache.put(request, response.clone());
          void trim(ASSETS, ASSET_LIMIT);
        }
        return response;
      })(),
    );
    return;
  }

  /* Alles andere: Netz, Cache nur als Notnagel. */
  event.respondWith(
    fetch(request).catch(async () => {
      const hit = await caches.match(request);
      return hit || Response.error();
    }),
  );
});

// Version is injected at build time from src/lib/version.ts (see vite.config.ts).
// Tying the cache name to the build means every new β-build gets a fresh cache
// and the old one is dropped on activate — no stale PWA.
const VERSION = '__APP_VERSION__';
const BUILD = '__APP_BUILD__';
const CACHE_NAME = `bushka-v${VERSION}-b${BUILD}`;

const SCOPE = self.registration.scope;
const PRECACHE = [
  SCOPE,
  `${SCOPE}manifest.webmanifest`,
  `${SCOPE}icons/icon-192.png`,
  `${SCOPE}icons/icon-512.png`,
  `${SCOPE}icons/icon.svg`,
  `${SCOPE}icons/maskable-icon.svg`
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE))
      .catch(() => undefined)
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

// Navigations: cache-first for an instant start, even on slow / VPN networks —
// serve the cached shell at once, refresh it in the background for next launch.
// The freshness guard (version.json in main.tsx) force-reloads when a newer
// build is live, so cache-first never traps anyone on an old version.
async function handleNavigation(request) {
  const cached = await caches.match(SCOPE);
  const network = fetch(request)
    .then(response => {
      if (response && response.ok) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(SCOPE, copy));
      }
      return response;
    })
    .catch(() => undefined);
  if (cached) return cached;
  return (await network) || (await caches.match(request)) || fetch(request);
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // version.json must always come fresh from network — it's the freshness probe.
  if (url.pathname.endsWith('/version.json')) return;

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request));
    return;
  }

  // Same-origin assets (hashed + immutable): serve from cache, refresh in background.
  event.respondWith(
    caches.match(request).then(cached => {
      const network = fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});

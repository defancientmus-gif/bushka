// Version is injected at build time from src/lib/version.ts (see vite.config.ts).
// Tying the cache name to the build means every new β-build gets a fresh cache
// and the old one is dropped on activate — no stale PWA.
const VERSION = '__APP_VERSION__';
const BUILD = '__APP_BUILD__';
const CACHE_NAME = `bushka-v${VERSION}-b${BUILD}`;
const NETWORK_TIMEOUT = 3500;

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

function timeout(ms) {
  return new Promise(resolve => setTimeout(() => resolve(undefined), ms));
}

// Navigations: fresh-first, but never hang — if the network is slow we fall
// back to the cached shell after NETWORK_TIMEOUT so the PWA opens instantly.
async function handleNavigation(request) {
  try {
    const response = await Promise.race([fetch(request), timeout(NETWORK_TIMEOUT)]);
    if (response) {
      const copy = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(SCOPE, copy));
      return response;
    }
  } catch {
    // offline — fall through to cache
  }
  const cached = await caches.match(SCOPE);
  return cached || caches.match(request) || fetch(request);
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

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

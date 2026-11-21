const CACHE_PREFIX = 'studora-static-';
const CACHE_NAME = `${CACHE_PREFIX}v3`;
const APP_SHELL = [
  '/offline.html',
  '/manifest.webmanifest',
  '/icons/studora-192.png',
  '/icons/studora-512.png',
  '/icons/studora-maskable-512.png',
  '/icons/apple-touch-icon.png',
  '/icons/favicon-32.png',
  '/icons/studora-app.svg',
  '/icons/studora-favicon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_SHELL);
    // First install can activate immediately; updates wait for the user.
    if (!self.registration.active) await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter((key) => (key.startsWith(CACHE_PREFIX) || key.startsWith('studora-shell-')) && key !== CACHE_NAME)
      .map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never cache API, auth, storage, realtime, payment, or user-specific data.
  if (/^\/(api|auth|rest\/v1|storage\/v1|functions\/v1|realtime\/v1)(\/|$)/.test(url.pathname)) return;

  if (request.mode === 'navigate') {
    // Bypass the browser's HTTP cache so an offline reload cannot masquerade
    // as an online navigation with an old index document.
    event.respondWith(fetch(request, { cache: 'no-store' }).catch(async () => {
      const cache = await caches.open(CACHE_NAME);
      return (await cache.match('/offline.html')) || Response.error();
    }));
    return;
  }

  const isHashedBuildAsset = url.pathname.startsWith('/assets/');
  const isStaticPublicAsset = url.pathname.startsWith('/icons/') || url.pathname.startsWith('/fonts/') ||
    url.pathname.startsWith('/campus-background');
  if (!isHashedBuildAsset && !isStaticPublicAsset) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) return cached;

    const response = await fetch(request);
    if (response.ok && response.type === 'basic') {
      await cache.put(request, response.clone());
    }
    return response;
  })());
});

/**
 * Service worker source. NOT shipped as-is: astro.config.mjs stamps __CACHE__
 * and __SHELL__ at build time and writes the result to dist/sw.js.
 *
 * The cache-invalidation contract, which is the only part that really matters:
 *
 *  - CACHE is named after a hash of the entire build output, so any real change
 *    to the site — a page, a style, one word of copy — gives it a new name.
 *  - activate deletes every cache that is not the current one. There is never
 *    more than one generation of this site on a device.
 *  - HTML is NETWORK-FIRST, and that fetch skips the browser's HTTP cache. A
 *    returning player with any connection gets the new build on the very next
 *    page load. Cache is the fallback, not the source of truth.
 *  - Hashed assets are cache-first, which is safe precisely because their names
 *    change when their contents do.
 */
const CACHE = '__CACHE__';
const SHELL = __SHELL__;
const OFFLINE_PAGE = '/offline/';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      // `cache: 'reload'` on every precache request: GitHub Pages serves HTML
      // with max-age=600, and without this a brand new worker would happily
      // precache the PREVIOUS build out of the browser's HTTP cache.
      .then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: 'reload' }))))
      // Take over straight away: waiting for every tab to close is how a stale
      // build survives a deploy for days.
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/** A picture we do not have and cannot fetch. Say so, in Gujarati. */
function missingPicture() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" role="img" aria-label="ચિત્ર સાચવ્યું નથી">
  <rect width="200" height="200" fill="#f4f1ea"/>
  <g fill="none" stroke="#3d4b47" stroke-width="5" stroke-linecap="round">
    <rect x="52" y="58" width="96" height="74" rx="8"/>
    <path d="M60 118 84 94l18 16 16-12 22 20"/>
    <path d="M56 62l88 66"/>
  </g>
  <text x="100" y="158" text-anchor="middle" font-size="19" font-weight="600" fill="#3d4b47" font-family="sans-serif">ચિત્ર નથી</text>
  <text x="100" y="178" text-anchor="middle" font-size="14" fill="#3d4b47" font-family="sans-serif">ઑફલાઇન</text>
</svg>`;
  return new Response(svg, {
    status: 200,
    headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'no-store' },
  });
}

async function cacheFirst(request, fallback) {
  const hit = await caches.match(request);
  if (hit) return hit;
  try {
    const res = await fetch(request);
    // Opaque (cross-origin font) responses have status 0 but are still usable.
    if (res.ok || res.type === 'opaque') {
      const cache = await caches.open(CACHE);
      cache.put(request, res.clone());
    }
    return res;
  } catch {
    return fallback ? fallback() : Response.error();
  }
}

async function networkFirst(request) {
  try {
    // Same reason: go past the HTTP cache, or "network-first" quietly means
    // "up to ten minutes stale" on Pages and the redeploy does not land.
    const res = await fetch(request, { cache: 'reload' });
    if (res.ok) {
      const cache = await caches.open(CACHE);
      cache.put(request, res.clone());
    }
    return res;
  } catch {
    return (
      (await caches.match(request)) ||
      (await caches.match(OFFLINE_PAGE)) ||
      new Response('', { status: 504 })
    );
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;

  // Pages: always try the network, so a redeploy lands immediately.
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }

  // The level's own pictures: cache-first, and an honest placeholder if we
  // have neither a copy nor a connection.
  if (sameOrigin && url.pathname.startsWith('/images/')) {
    event.respondWith(cacheFirst(request, missingPicture));
    return;
  }

  // Hashed build assets, icons, manifest, and the Gujarati webfonts.
  if (sameOrigin || url.hostname.endsWith('gstatic.com') || url.hostname.endsWith('googleapis.com')) {
    event.respondWith(cacheFirst(request));
  }
});

const CACHE = 'daa-v10.2';
const ASSETS = [
  '/dynamic_asset_allocation_simulator/',
  '/dynamic_asset_allocation_simulator/index.html',
  '/dynamic_asset_allocation_simulator/manifest.json',
  '/dynamic_asset_allocation_simulator/icon.svg',
  '/dynamic_asset_allocation_simulator/icon-192.png',
  '/dynamic_asset_allocation_simulator/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Cache-first for local assets; network-first for CDN (Tabler Icons)
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.hostname === 'cdn.jsdelivr.net') {
    e.respondWith(
      fetch(e.request)
        .then(r => {
          const clone = r.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return r;
        })
        .catch(() => caches.match(e.request))
    );
  } else {
    e.respondWith(
      caches.match(e.request).then(r => r || fetch(e.request))
    );
  }
});

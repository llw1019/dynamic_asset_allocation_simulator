const CACHE = 'daa-12.2';
const BASE = '/dynamic_asset_allocation_simulator/';
const ASSETS = [
  BASE,
  BASE + 'index.html',
  BASE + 'manifest.json',
  BASE + 'icon.svg',
  BASE + 'icon-192.png',
  BASE + 'icon-512.png',
  BASE + 'css/tokens.css',
  BASE + 'css/base.css',
  BASE + 'css/parameters.css',
  BASE + 'css/regime.css',
  BASE + 'css/allocation.css',
  BASE + 'css/io-status.css',
  BASE + 'css/buy-score.css',
  BASE + 'css/sell-advisor.css',
  BASE + 'js/state.js',
  BASE + 'js/config.js',
  BASE + 'js/format.js',
  BASE + 'js/regime-presenter.js',
  BASE + 'js/portfolio-base.js',
  BASE + 'js/market-ui.js',
  BASE + 'js/storage.js',
  BASE + 'js/regime-logic.js',
  BASE + 'js/input-handlers.js',
  BASE + 'js/render.js',
  BASE + 'js/holdings.js',
  BASE + 'js/portfolio-metrics.js',
  BASE + 'js/buy-score.js',
  BASE + 'js/import-export.js',
  BASE + 'js/fugle.js',
  BASE + 'js/sell-advisor.js',
  BASE + 'js/bootstrap.js'
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

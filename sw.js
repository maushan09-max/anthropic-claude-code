// Offline support: network-first, falling back to the cached copy.
const CACHE = 'lifeos-v5';
const ASSETS = ['./', './index.html', './styles.css', './js/icons.js', './js/core.js', './js/planner.js', './js/roster-ai.js', './js/vendor/anthropic-sdk.mjs', './js/life.js', './js/money.js', './js/travel.js', './js/more.js', './js/study.js', './js/main.js', './manifest.json', './icon.svg'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match('./index.html')))
  );
});

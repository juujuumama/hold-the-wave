// offline support. bump VERSION whenever app files change so phones pick up the update.
const VERSION = 'htw-v13';
const SHELL = [
  './', 'index.html', 'css/style.css', 'manifest.webmanifest',
  'js/app.js', 'js/store.js', 'js/cycle.js', 'js/content.js', 'js/wave.js', 'js/calendar.js', 'js/icons.js', 'art/art.js',
  'art/cover.jpg', 'art/big-wave.jpg', 'art/lighthouse-1.jpg', 'art/kitchen-flood.jpg', 'icons/icon.svg', 'icons/icon-192.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// app files: network first, skipping the browser's 10-minute cache, falling back to cache when offline.
// art + fonts: cache first, saved the first time they're seen.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const isArtOrFont = url.pathname.includes('/art/') && url.pathname.endsWith('.jpg')
    || url.host.includes('fonts.g');
  if (isArtOrFont) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); return res;
    })));
  } else if (url.origin === location.origin) {
    // no-cache: always ask the server for the newest copy, so new and old files never mix
    e.respondWith(fetch(req, { cache: 'no-cache' }).then((res) => {
      const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); return res;
    }).catch(() => caches.match(req).then((hit) => hit || caches.match('index.html'))));
  }
});

// Bei Änderungen an den Dateien die Versionsnummer erhöhen (gleiche Nummer wie APP_VERSION in game.js
// und <meta name="app-version"> in index.html).
const CACHE = 'stadtaufbau-v31';
const ASSETS = [
  './',
  'index.html',
  'style.css',
  'game.js',
  'manifest.json',
  'icon.svg',
  'icon-192.png',
  'icon-512.png',
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Netzwerk zuerst (immer aktuelle Version), offline aus dem Cache.
// cache: 'no-cache' zwingt den Browser, beim Server nachzufragen – sonst kann er alte Dateien
// aus seinem HTTP-Cache mit neuen mischen.
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  event.respondWith(
    fetch(req, { cache: 'no-cache' })
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(cache => cache.put(req, copy));
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }))
  );
});

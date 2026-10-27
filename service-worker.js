// Bei Änderungen an den Dateien die Versionsnummer erhöhen (gleiche Nummer wie APP_VERSION in game.js
// und <meta name="app-version"> in index.html).
const CACHE = 'stadtaufbau-v60';
const ASSETS = [
  './',
  'index.html',
  'style.css',
  'game.js',
  'manifest.json',
  'icon.svg',
  'icon-192.png',
  'icon-512.png',
  'bilder/1-hut.webp',
  'bilder/1-gatherer.webp',
  'bilder/1-hunter.webp',
  'bilder/1-woodcutter.webp',
  'bilder/1-stonecutter.webp',
  'bilder/1-fireplace.webp',
  'bilder/1-painter.webp',
  'bilder/1-watertrough.webp',
  'bilder/2-house.webp',
  'bilder/2-farm.webp',
  'bilder/2-sawmill.webp',
  'bilder/2-market.webp',
  'bilder/4-coalmine.webp',
  'bilder/4-steelworks.webp',
  'bilder/4-factory.webp',
  'bilder/4-tenement.webp',
  'bilder/4-station.webp',
  'bilder/4-police.webp',
  'bilder/4-clocktower.webp',
  'bilder/5-powerplant.webp',
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

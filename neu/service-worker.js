// Epochia – offline spielen. Bei Änderungen die Versionsnummer erhöhen (gleiche Nummer wie
// APP_VERSION in js/daten.js und <meta name="app-version"> in index.html).
const CACHE = 'epochia-v10';
const ASSETS = [
  './',
  'index.html',
  'style.css',
  'manifest.json',
  'fonts/fredoka.woff2',
  'js/daten.js',
  'js/welt.js',
  'js/logik.js',
  'js/speicher.js',
  'js/zeichnen.js',
  'js/bedienung.js',
  'js/oberflaeche.js',
  'js/einstieg.js',
  'js/start.js',
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
      .then(keys => Promise.all(keys.filter(k => k.startsWith('epochia-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Netzwerk zuerst (immer aktuelle Version), offline aus dem Cache – Bilder kommen beim ersten Laden dazu.
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  event.respondWith(
    fetch(req, { cache: 'no-cache' })
      .then(res => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(cache => cache.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }))
  );
});

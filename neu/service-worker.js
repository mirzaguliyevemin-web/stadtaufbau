// Epochia – offline spielen. Bei Änderungen die Versionsnummer erhöhen (gleiche Nummer wie
// APP_VERSION in js/daten.js und <meta name="app-version"> in index.html).
const CACHE = 'v238';
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
  'js/leben.js',
  'js/wetter.js',
  'js/klang.js',
  'js/bedienung.js',
  'js/oberflaeche.js',
  'js/funde.js',
  'js/wunder.js',
  'js/shop.js',
  'js/lager.js',
  'js/einstieg.js',
  'js/konto.js',
  'js/start.js',
  'icon-192.png',
  'icon-512.png',
];

self.addEventListener('install', event => {
  // cache: 'reload' – am HTTP-Zwischenspeicher vorbei, sonst kann offline eine Mischung aus alten und neuen Dateien liegen
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS.map(u => new Request(u, { cache: 'reload' })))));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      // ältere Epochia-Fassungen löschen: seit V61 hießen sie 'vNN' und blieben liegen – über 100 Kopien aller Bilder (V207).
      // Nur eigene Namen: andere Seiten unter derselben github.io-Adresse teilen sich den Speicher.
      .then(keys => Promise.all(keys.filter(k => k !== CACHE && (/^v\d+$/.test(k) || k.startsWith('epochia-'))).map(k => caches.delete(k))))
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
        if (res.status === 200) {   // 206 (Musik in Stücken) lässt sich nicht ablegen
          const copy = res.clone();
          caches.open(CACHE).then(cache => cache.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }))
  );
});

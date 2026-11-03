// Das alte Spiel liegt jetzt in archiv/altes-spiel/. Dieser Service Worker löst den alten am Handy ab:
// Er löscht nur dessen Zwischenspeicher (stadtaufbau-…), meldet sich ab und lädt offene Seiten neu. Spielstände bleiben unberührt.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('stadtaufbau-')).map(k => caches.delete(k)));
    await self.registration.unregister();
    const list = await self.clients.matchAll({ type: 'window' });
    for (const c of list) c.navigate(c.url).catch(() => {});
  })());
});

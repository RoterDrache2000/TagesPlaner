// Offline-Unterstützung: erst Netz, bei Fehler aus dem Cache.
// Nach einer Änderung an den Dateien die Versionsnummer erhöhen.
const CACHE = 'tag-v1';
const FILES = ['./', 'index.html', 'style.css', 'store.js', 'ui.js', 'today.js', 'plan.js', 'habits.js', 'review.js', 'app.js', 'manifest.json', 'icon-180.png', 'icon-192.png', 'icon-512.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).then((r) => { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); return r; })
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});

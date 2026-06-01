const CACHE = 'leno-costos-v4';

// Solo cachear assets estáticos (logo, íconos)
const STATIC = ['/logo.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

// HTML y CSS siempre desde la red — assets estáticos desde caché
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  // Firebase siempre directo a la red
  if (e.request.url.includes('firestore.googleapis.com') ||
      e.request.url.includes('firebase') ||
      e.request.url.includes('googleapis.com')) return;

  const url = new URL(e.request.url);
  const ext = url.pathname.split('.').pop().toLowerCase();

  // HTML y CSS: siempre red, sin caché
  if (!ext || ext === 'html' || ext === 'css' || ext === 'js') {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    );
    return;
  }

  // Imágenes y otros assets: caché primero
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        caches.open(CACHE).then(c => c.put(e.request, res.clone()));
        return res;
      });
    })
  );
});

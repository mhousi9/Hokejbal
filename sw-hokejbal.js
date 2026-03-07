// ── Hokejbal Service Worker ──
const CACHE = 'hokejbal-v2';

const PRECACHE = ['./', './index.html'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.allSettled(PRECACHE.map(url => c.add(url).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;

  if (url.pathname.endsWith('.html') || url.pathname.endsWith('/')) {
    // Network first pro hlavní stránku
    e.respondWith(
      fetch(e.request)
        .then(resp => {
          if (resp && resp.status === 200) {
            caches.open(CACHE).then(c => c.put(e.request, resp.clone()));
          }
          return resp;
        })
        .catch(() => caches.match(e.request).then(r => r || caches.match('./')))
    );
  } else {
    // Cache first pro ostatní (fonty, ikony apod.)
    e.respondWith(
      caches.match(e.request).then(r => {
        if (r) return r;
        return fetch(e.request).then(resp => {
          if (resp && resp.status === 200 && resp.type !== 'opaque') {
            caches.open(CACHE).then(c => c.put(e.request, resp.clone()));
          }
          return resp;
        }).catch(() => new Response('', { status: 408 }));
      })
    );
  }
});

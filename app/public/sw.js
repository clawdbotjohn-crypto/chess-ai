const CACHE = 'chess-ai-v2';

self.addEventListener('install', e => {
  // Skip waiting so the new SW activates immediately
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  // Delete all old caches (including chess-ai-v1 with stale HTML)
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);

  // Navigation requests (HTML pages): network-first with offline fallback
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Hashed assets (e.g. index-DThFjdqV.js, style-abc123.css): cache-first
  // These are immutable — filename changes on rebuild
  const isHashedAsset = /\.[a-f0-9]{8,}\.(js|css|woff2?|ttf|eot)(\?|$)/i.test(url.pathname)
    || /[-\.][A-Za-z0-9]{6,}\.(js|css)(\?|$)/.test(url.pathname);

  if (isHashedAsset) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
          return res;
        });
      })
    );
    return;
  }

  // Everything else (images, manifest, etc.): network-first
  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});

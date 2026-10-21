// TinyNudge service worker — offline fallback + Web Push notifications

const CACHE_VERSION = 'tinynudge-v3';
// Firebase Hosting redirects /offline.html to /offline (clean URLs). A redirected response
// can't be served for a page navigation, so cache the final address directly.
const OFFLINE_URL = '/offline';
const PRECACHE_URLS = [OFFLINE_URL, '/icons/icon-192.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(PRECACHE_URLS.map((url) => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // Never touch API calls or cross-origin requests (Firebase, checkout, etc.)
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    // Network-first for pages; show the offline page only when the network fails
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(OFFLINE_URL, { cacheName: CACHE_VERSION }).then(
          (cached) => cached || new Response('You are offline.', { status: 503, headers: { 'Content-Type': 'text/plain' } })
        )
      )
    );
    return;
  }

  // Serve precached assets (offline page icon) from cache; everything else goes to the network untouched
  if (PRECACHE_URLS.includes(url.pathname)) {
    event.respondWith(
      caches.match(request, { cacheName: CACHE_VERSION }).then((cached) => cached || fetch(request))
    );
  }
});

self.addEventListener('push', (event) => {
  if (!event.data) return;
  let data = {};
  try { data = event.data.json(); } catch { data = { title: 'TinyNudge', body: event.data.text() }; }

  const title = data.title || 'TinyNudge 💕';
  const options = {
    body: data.body || "Tonight's nudge is ready.",
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: data.tag || 'tinynudge-nudge',
    renotify: true,
    data: { url: data.url || '/' },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || '/', self.location.origin);
  // Only ever open our own site.
  const url = target.origin === self.location.origin ? target.href : self.location.origin + '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Reuse any open TinyNudge window (it already knows whether it runs inside
      // the Android app), rather than opening a fresh one without that context.
      for (const client of clientList) {
        if (new URL(client.url).origin === self.location.origin && 'focus' in client) return client.focus();
      }
      // The server adds ?source=twa to links for subscriptions made in the Android app.
      return clients.openWindow(url);
    })
  );
});

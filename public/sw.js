// TinyNudge service worker — handles Web Push notifications

self.addEventListener('push', (event) => {
  if (!event.data) return;
  let data = {};
  try { data = event.data.json(); } catch { data = { title: 'TinyNudge', body: event.data.text() }; }

  const title = data.title || 'TinyNudge 💕';
  const options = {
    body: data.body || "Tonight's nudge is ready.",
    icon: '/heart-favicon.svg',
    badge: '/heart-favicon.svg',
    tag: data.tag || 'tinynudge-nudge',
    renotify: true,
    data: { url: data.url || '/' },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) return client.focus();
      }
      return clients.openWindow(url);
    })
  );
});

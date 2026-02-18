/* Service Worker for web push notifications */

self.addEventListener('push', (event) => {
  let data = { title: 'Finance Tracker', body: '' };
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch {
    data.body = event.data ? event.data.text() : '';
  }

  const options = {
    body: data.body || '',
    icon: data.icon || '/assets/icon.png',
    badge: '/assets/favicon.png',
    vibrate: [200, 100, 200],
    data: { url: '/' },
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        return clients.openWindow(urlToOpen);
      }),
  );
});

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

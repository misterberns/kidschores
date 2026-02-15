/**
 * Service Worker for KidsChores Push Notifications
 */

// eslint-disable-next-line no-restricted-globals
const sw = self;

// Install event
sw.addEventListener('install', (event) => {
  console.log('[SW] Service Worker installing...');
  // Skip waiting to activate immediately
  sw.skipWaiting();
});

// Activate event
sw.addEventListener('activate', (event) => {
  console.log('[SW] Service Worker activated');
  // Claim all clients immediately
  event.waitUntil(sw.clients.claim());
});

// Push event - handle incoming push notifications
sw.addEventListener('push', (event) => {
  console.log('[SW] Push received:', event);

  let data = {
    title: 'KidsChores',
    body: 'You have a new notification!',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: 'default',
    data: {},
    url: '/',
  };

  // Parse push data if available
  if (event.data) {
    try {
      const payload = event.data.json();
      data = { ...data, ...payload };
    } catch (e) {
      console.error('[SW] Error parsing push data:', e);
    }
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    tag: data.tag,
    data: {
      ...data.data,
      url: data.url,
    },
    vibrate: [100, 50, 100],
    requireInteraction: false,
    actions: [
      {
        action: 'open',
        title: 'Open',
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
      },
    ],
  };

  event.waitUntil(
    sw.registration.showNotification(data.title, options)
  );
});

// Notification click event
sw.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event);

  event.notification.close();

  const url = event.notification.data?.url || '/';

  // Handle action buttons
  if (event.action === 'dismiss') {
    return;
  }

  // Open or focus the app
  event.waitUntil(
    sw.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        // Check if app is already open
        for (const client of clients) {
          if (client.url.includes(sw.location.origin) && 'focus' in client) {
            // Navigate to the URL and focus
            client.navigate(url);
            return client.focus();
          }
        }

        // Open new window if app not open
        if (sw.clients.openWindow) {
          return sw.clients.openWindow(url);
        }
      })
  );
});

// Notification close event
sw.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed:', event);
});

// Background sync (for offline capabilities - future enhancement)
sw.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
});

// Message event - for communication with main thread
sw.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);

  if (event.data.type === 'SKIP_WAITING') {
    sw.skipWaiting();
  }
});

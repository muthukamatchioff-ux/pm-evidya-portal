// PM e-Vidya Portal - Service Worker
// Package: in.nimi.pmevidya
// Architecture: Network-First Internet-Only Operation with FCM Push Notifications

const CACHE_NAME = 'pmevidya-v1';
const STATIC_ASSETS = [
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/icon-maskable-512x512.png',
  '/pm-evidya-logo.png',
  '/nimi-logo.png'
];

// Install: Cache core static assets & immediately activate
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Non-blocking asset cache warning:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate: Clean up older cache versions and take immediate control
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Strict Network-First Strategy (Internet-Only Operation)
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Ignore non-GET requests (Server Actions, POST/PUT/DELETE mutations)
  // Per strict requirement: No offline write queues are permitted
  if (request.method !== 'GET') {
    return;
  }

  // Allow browser/extensions schemes
  if (!request.url.startsWith('http')) {
    return;
  }

  // API endpoints and health checks are strictly network-only
  if (request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        // Cache successful static asset responses
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          (request.url.includes('/icons/') || request.url.includes('/_next/static/'))
        ) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
        }
        return networkResponse;
      })
      .catch(async () => {
        // If offline and request is HTML navigation, serve cached home or fallback
        if (request.mode === 'navigate') {
          const cachedResponse = await caches.match(request);
          if (cachedResponse) return cachedResponse;
          const homeResponse = await caches.match('/');
          if (homeResponse) return homeResponse;
        }

        // Return cached asset if available
        const matched = await caches.match(request);
        if (matched) return matched;

        // Structured offline response for network failures
        return new Response(
          '<!DOCTYPE html><html><head><meta charset="utf-8"><title>PM e-Vidya - Offline</title>' +
          '<meta name="viewport" content="width=device-width, initial-scale=1">' +
          '<style>body{font-family:sans-serif;text-align:center;padding:40px;background:#f8fafc;color:#1e293b}' +
          '.box{max-width:400px;margin:auto;background:white;padding:30px;border-radius:12px;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1)}' +
          'h2{color:#1e3a8a;margin-top:0}button{background:#1e3a8a;color:white;border:none;padding:10px 20px;border-radius:6px;cursor:pointer;margin-top:16px}' +
          '</style></head><body><div class="box"><h2>No Internet Connection</h2>' +
          '<p>PM e-Vidya operates in internet-only mode to safeguard financial and production data integrity. Please reconnect to continue.</p>' +
          '<button onclick="window.location.reload()">Retry Connection</button></div></body></html>',
          {
            status: 503,
            statusText: 'Service Unavailable (Offline)',
            headers: { 'Content-Type': 'text/html' }
          }
        );
      })
  );
});

// Push Notifications: Firebase Cloud Messaging / Web Push Event Listener
self.addEventListener('push', (event) => {
  let data = {
    title: 'PM e-Vidya Notification',
    body: 'You have a new workflow update.',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    data: { url: '/dashboard' }
  };

  try {
    if (event.data) {
      const payload = event.data.json();
      data.title = payload.title || payload.notification?.title || data.title;
      data.body = payload.body || payload.notification?.body || data.body;
      if (payload.data?.url) {
        data.data.url = payload.data.url;
      }
    }
  } catch (_) {
    if (event.data) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    data: data.data,
    vibrate: [100, 50, 100],
    requireInteraction: false
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Notification Click: Navigate to target URL
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

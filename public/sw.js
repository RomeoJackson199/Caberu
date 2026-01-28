const CACHE_NAME = 'denti-scheduler-v4';

// Core assets to pre-cache immediately
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo.png',
  '/badge.png',
  '/favicon.ico'
];

// Critical asset patterns to cache on first load
const CRITICAL_ASSET_PATTERNS = [
  /\/assets\/.*\.(js|css)$/,
  /\/assets\/.*\.(woff2?|ttf|otf)$/,
  /\/assets\/.*\.(png|jpg|jpeg|svg|webp|ico)$/
];

// Install - pre-cache core assets and activate immediately
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

// Activate - cleanup old caches and take control
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      )
    )
  );
  clients.claim();
});

// Support skip waiting message from the app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  // Test notification from the app
  if (event.data && event.data.type === 'TEST_NOTIFICATION') {
    self.registration.showNotification('Test Notification', {
      body: 'This is a test notification from Caberu',
      icon: '/logo.png',
      badge: '/badge.png',
      tag: 'test-notification',
      data: {
        url: '/'
      }
    });
  }
});

// Push event - handle incoming push notifications
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push event received', event);

  let notificationData = {
    title: 'Caberu Notification',
    body: 'You have a new notification',
    icon: '/logo.png',
    badge: '/badge.png',
    data: {}
  };

  // Parse the push payload
  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        title: data.title || notificationData.title,
        body: data.message || data.body || notificationData.body,
        icon: data.icon || notificationData.icon,
        badge: data.badge || notificationData.badge,
        tag: data.tag || 'notification',
        requireInteraction: data.requireInteraction || false,
        actions: data.actions || [],
        data: {
          url: data.url || '/',
          notification_id: data.notification_id,
          type: data.type,
          ...data.data
        }
      };
    } catch (error) {
      console.error('Service Worker: Failed to parse push data', error);
    }
  }

  // Show the notification
  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      requireInteraction: notificationData.requireInteraction,
      actions: notificationData.actions,
      data: notificationData.data,
      vibrate: [200, 100, 200],
      timestamp: Date.now()
    })
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked', event);

  event.notification.close();

  // Handle action button clicks
  if (event.action) {
    console.log('Service Worker: Action clicked', event.action);
  }

  // Get the URL from the notification data
  const urlToOpen = event.notification.data?.url || '/';

  // Open the app or focus existing window
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((clientList) => {
      // Check if there's already a window open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus().then(() => {
            // Navigate to the URL if needed
            if (client.navigate && urlToOpen !== '/') {
              return client.navigate(urlToOpen);
            }
            return client;
          });
        }
      }

      // If no window is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Notification close event
self.addEventListener('notificationclose', (event) => {
  console.log('Service Worker: Notification closed', event);
});

// Sync event - for background sync
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Sync event', event.tag);

  if (event.tag === 'sync-notifications') {
    event.waitUntil(
      fetch('/api/notifications/sync', {
        method: 'POST'
      }).catch((error) => {
        console.error('Service Worker: Failed to sync notifications', error);
      })
    );
  }
});

// Check if URL matches critical asset patterns
function isCriticalAsset(url) {
  return CRITICAL_ASSET_PATTERNS.some(pattern => pattern.test(url.pathname));
}

// Fetch handling with enhanced caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // Skip external requests (APIs, CDNs not under our control)
  if (url.origin !== self.location.origin) return;

  // Navigate requests: network-first, fallback to cached index.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', copy));
          return response;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Vite hashed assets under /assets/: cache-first (immutable)
  // These have content hashes so they're safe to cache indefinitely
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) {
          return cached;
        }
        return fetch(request).then((response) => {
          // Only cache successful responses
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        });
      })
    );
    return;
  }

  // Static files (logo, icons, manifest): stale-while-revalidate
  if (url.pathname.match(/\.(png|jpg|jpeg|svg|webp|ico|json)$/)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request).then((response) => {
          if (response.ok) {
            caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
          }
          return response;
        }).catch(() => cached);

        return cached || fetchPromise;
      })
    );
    return;
  }

  // Default: try cache, then network
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request))
  );
});
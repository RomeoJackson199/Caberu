const CACHE_NAME = 'denti-scheduler-v5';
const API_CACHE_NAME = 'denti-api-v1';

// Core assets to pre-cache immediately
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
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

// Supabase API patterns worth caching for offline access
const CACHEABLE_API_PATTERNS = [
  /\/rest\/v1\/profiles/,
  /\/rest\/v1\/appointments/,
  /\/rest\/v1\/patients/,
  /\/rest\/v1\/practices/,
  /\/rest\/v1\/services/,
  /\/rest\/v1\/notifications/,
];

// Max age for cached API responses (5 minutes)
const API_CACHE_MAX_AGE = 5 * 60 * 1000;

// Max number of entries in the API cache
const API_CACHE_MAX_ENTRIES = 50;

// Install - pre-cache core assets and activate immediately
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

// Activate - cleanup old caches and take control
self.addEventListener('activate', (event) => {
  const allowedCaches = [CACHE_NAME, API_CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((cacheName) => {
          if (!allowedCaches.includes(cacheName)) {
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

  // Clear API cache on demand (e.g., after logout)
  if (event.data && event.data.type === 'CLEAR_API_CACHE') {
    caches.delete(API_CACHE_NAME);
  }

  // Precache specific routes the user has visited
  if (event.data && event.data.type === 'PRECACHE_ROUTE') {
    const url = event.data.url;
    if (url) {
      caches.open(CACHE_NAME).then((cache) => {
        cache.match(url).then((existing) => {
          if (!existing) {
            fetch(url).then((response) => {
              if (response.ok) {
                cache.put(url, response);
              }
            }).catch(() => {});
          }
        });
      });
    }
  }
});

// Push event - handle incoming push notifications
self.addEventListener('push', (event) => {
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
  event.notification.close();

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
self.addEventListener('notificationclose', () => {});

// Sync event - for background sync of queued operations
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-notifications') {
    event.waitUntil(
      fetch('/api/notifications/sync', {
        method: 'POST'
      }).catch((error) => {
        console.error('Service Worker: Failed to sync notifications', error);
      })
    );
  }

  // Sync queued offline operations
  if (event.tag === 'sync-offline-queue') {
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then((windowClients) => {
        windowClients.forEach((client) => {
          client.postMessage({ type: 'PROCESS_OFFLINE_QUEUE' });
        });
      })
    );
  }
});

// Check if URL matches critical asset patterns
function isCriticalAsset(url) {
  return CRITICAL_ASSET_PATTERNS.some(pattern => pattern.test(url.pathname));
}

// Check if a request is a cacheable API call
function isCacheableApiRequest(url) {
  return CACHEABLE_API_PATTERNS.some(pattern => pattern.test(url.pathname));
}

// Trim API cache to max entries (LRU-style by removing oldest)
async function trimApiCache() {
  const cache = await caches.open(API_CACHE_NAME);
  const keys = await cache.keys();
  if (keys.length > API_CACHE_MAX_ENTRIES) {
    const toDelete = keys.slice(0, keys.length - API_CACHE_MAX_ENTRIES);
    await Promise.all(toDelete.map((key) => cache.delete(key)));
  }
}

// Add timestamp header to cached response for expiry checks
function addTimestampToResponse(response) {
  const headers = new Headers(response.headers);
  headers.set('sw-cache-timestamp', Date.now().toString());
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: headers
  });
}

// Check if a cached API response is still fresh
function isApiCacheFresh(response) {
  const timestamp = response.headers.get('sw-cache-timestamp');
  if (!timestamp) return false;
  return (Date.now() - parseInt(timestamp, 10)) < API_CACHE_MAX_AGE;
}

// Fetch handling with enhanced caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // Handle Supabase API requests: network-first with cache fallback
  if (isCacheableApiRequest(url) && request.method === 'GET') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(API_CACHE_NAME).then((cache) => {
              cache.put(request, addTimestampToResponse(copy));
              trimApiCache();
            });
          }
          return response;
        })
        .catch(() =>
          caches.open(API_CACHE_NAME).then((cache) =>
            cache.match(request).then((cached) => {
              if (cached) {
                return cached;
              }
              // Return an empty JSON array as fallback for list endpoints
              return new Response(JSON.stringify([]), {
                status: 200,
                headers: { 'Content-Type': 'application/json', 'X-Offline-Fallback': 'true' }
              });
            })
          )
        )
    );
    return;
  }

  // Skip other external requests
  if (url.origin !== self.location.origin) return;

  // Navigate requests: network-first, fallback to cached index.html, then offline page
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', copy));
          return response;
        })
        .catch(() =>
          caches.match('/index.html').then((cached) => {
            if (cached) return cached;
            return caches.match('/offline.html');
          })
        )
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
  if (url.pathname.match(/\.(png|jpg|jpeg|svg|webp|ico|json|woff2?)$/)) {
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

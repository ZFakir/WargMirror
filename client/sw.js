/* global importScripts */
importScripts('scripts/db.js');

// Bump this version whenever cached assets change. Browsers only detect a
// service-worker update when sw.js itself differs, and activate() deletes
// older caches — without a bump, returning users keep stale JS/CSS forever.
const CACHE_NAME = 'warg-cache-v15';
const MEDIA_CACHE_NAME = 'warg-media-v1';
const MAX_MEDIA_CACHE_ENTRIES = 200;

const STATIC_ASSETS = [
  './',
  'index.html',
  'home.html',
  'game.html',
  'catalogue.html',
  'styles/tokens.css',
  'styles/home.css',
  'styles/game.css',
  'assets/topo-pattern.svg',
  'assets/topo-pattern-light.svg',
  'scripts/config.js',
  'scripts/db.js',
  'scripts/api.js',
  'scripts/home.js',
  'scripts/game.js',
  'scripts/sensors.js',
  'scripts/components/CameraCapture.js',
  'scripts/components/ConfirmModal.js',
  'scripts/components/FlagModal.js',
  'scripts/components/GameCard.js',
  'scripts/components/MapModal.js',
  'scripts/components/PlayModal.js',
  'scripts/components/minigame-handlers.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  const keepCaches = new Set([CACHE_NAME, MEDIA_CACHE_NAME]);
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => !keepCaches.has(name))
          .map(name => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

async function trimCache(cacheName, maxEntries) {
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    if (keys.length > maxEntries) {
      const excess = keys.length - maxEntries;
      for (let i = 0; i < excess; i++) {
        await cache.delete(keys[i]);
      }
    }
  } catch { /* ignore */ }
}

// Strategy 1: Network First (fresh data with offline cache fallback)
async function networkFirstStrategy(request, cacheName = CACHE_NAME) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    console.warn('Network fetch failed, falling back to cache:', err);
    let cachedResponse = await caches.match(request, { ignoreVary: true });

    // Fallback for HTML pages with query params
    if (!cachedResponse) {
      const reqUrl = new URL(request.url);
      if (reqUrl.pathname.endsWith('.html') || reqUrl.pathname === '/') {
        cachedResponse = await caches.match(request, { ignoreVary: true, ignoreSearch: true });
      }
    }

    return cachedResponse || Response.error();
  }
}

// Strategy 2: Stale-While-Revalidate (Fast UI + background refresh)
async function staleWhileRevalidateStrategy(request, cacheName = CACHE_NAME) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request, { ignoreVary: true });

  const fetchPromise = fetch(request)
    .then(networkResponse => {
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch(err => {
      console.warn('SWR network failure', err);
      return Response.error();
    });

  // Return cache immediately if available, otherwise wait for network (or error response)
  return cachedResponse || fetchPromise;
}

// Strategy 3: Cache First (Instant load for static media & map tiles)
async function cacheFirstStrategy(request, cacheName = MEDIA_CACHE_NAME) {
  const cache = await caches.open(cacheName);
  let cachedResponse = await cache.match(request, { ignoreVary: true });

  // Fallback for HTML query params
  if (!cachedResponse && request.mode === 'navigate') {
    cachedResponse = await cache.match(request, { ignoreVary: true, ignoreSearch: true });
  }

  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone()).then(() => {
        if (cacheName === MEDIA_CACHE_NAME) {
          trimCache(MEDIA_CACHE_NAME, MAX_MEDIA_CACHE_ENTRIES);
        }
      });
    }
    return networkResponse;
  } catch (err) {
    console.warn('Network fetch failed:', err);
    return Response.error();
  }
}

self.addEventListener('fetch', event => {
  // Only cache GET requests and HTTP/HTTPS schemes (ignore chrome-extension://)
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) return;

  const url = new URL(event.request.url);

  // Bypass SW for authentication, session, demo config, and admin endpoints
  if (url.pathname.startsWith('/auth/') || url.pathname.startsWith('/api/demo') || url.pathname.startsWith('/api/admin')) return;

  // 1. CACHE-FIRST (Media Bucket): ARG cover images, minigame reference images, map tiles, avatars
  if (
    /^\/api\/args\/\d+\/cover-image/.test(url.pathname) ||
    /^\/api\/minigames\/\d+\/reference\/image/.test(url.pathname) ||
    url.hostname.includes('tile.openstreetmap.org') ||
    url.hostname.includes('server.arcgisonline.com') ||
    url.hostname.includes('dicebear.com')
  ) {
    event.respondWith(cacheFirstStrategy(event.request, MEDIA_CACHE_NAME));
    return;
  }

  // 2. NETWORK-FIRST: Highly dynamic routes (Sessions, user profile/search, live game state, comments, admin)
  const networkFirstRoutes = [
    '/api/sessions',
    '/api/users/profile',
    '/api/users/search',
    '/api/game/',
    '/api/comments/',
    '/api/admin/'
  ];
  if (networkFirstRoutes.some(path => url.pathname.startsWith(path))) {
    event.respondWith(networkFirstStrategy(event.request, CACHE_NAME));
    return;
  }

  // 3. STALE-WHILE-REVALIDATE: Catalogue, Game Data, Badges, Library
  const swrRoutes = ['/api/args', '/api/minigames', '/api/badges', '/api/users/'];
  if (swrRoutes.some(path => url.pathname.startsWith(path)) || url.pathname.includes('/library')) {
    event.respondWith(staleWhileRevalidateStrategy(event.request, CACHE_NAME));
    return;
  }

  // 4. SAME-ORIGIN STATIC ASSETS: Stale-While-Revalidate for CSS/JS/images/fonts
  //    NETWORK-FIRST for HTML navigations so deploys take effect immediately.
  if (url.hostname === location.hostname) {
    const isStaticAsset = /\.(css|js|mjs|svg|png|jpg|jpeg|webp|ico|woff2?)$/i.test(url.pathname);
    if (isStaticAsset) {
      event.respondWith(staleWhileRevalidateStrategy(event.request, CACHE_NAME));
    } else {
      event.respondWith(networkFirstStrategy(event.request, CACHE_NAME));
    }
    return;
  }

  // Default to Network First for anything else
  event.respondWith(networkFirstStrategy(event.request, CACHE_NAME));
});

// Background Sync
self.addEventListener('sync', event => {
  if (event.tag === 'sync-attempts') {
    event.waitUntil(syncAttempts());
  }
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'MANUAL_SYNC') {
    event.waitUntil(syncAttempts());
  }
});

async function syncAttempts() {
  if (!self.offlineDB) {
    console.error('Offline DB wrapper not found in SW');
    return;
  }

  const attempts = await self.offlineDB.getPendingAttempts();

  for (const attempt of attempts) {
    try {
      const formData = new FormData();
      formData.append('image', attempt.imageBlob, 'attempt.jpg');

      const response = await fetch(attempt.apiUrl, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      if (response.ok) {
        const result = await response.json();
        await self.offlineDB.clearPendingAttempt(attempt.id);
        console.log(`Successfully synced attempt ${attempt.id}`);

        // Notify open windows/clients via BroadcastChannel (bypass control state issues)
        const bc = new BroadcastChannel('warg_sync_channel');
        bc.postMessage({
          type: 'SYNC_RESULT',
          success: true,
          gameId: attempt.gameId,
          result: result
        });
        bc.close();

        // Check for open clients; if none, show notification
        const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        if (clients.length === 0) {
          self.registration.showNotification('WARG Offline Sync', {
            body: result.passed ? `Offline attempt passed! +${result.points_awarded} pts` : 'Offline attempt analyzed: Not Quite...'
          });
        }
      } else {
        console.error(`Failed to sync attempt ${attempt.id}: Server returned ${response.status}`);

        // Let's clear the pending attempt if it's a 4xx/5xx error so it doesn't infinitely loop forever
        if (response.status >= 400) {
          await self.offlineDB.clearPendingAttempt(attempt.id);
        }

        const bc = new BroadcastChannel('warg_sync_channel');
        bc.postMessage({
          type: 'SYNC_RESULT',
          success: false,
          gameId: attempt.gameId,
          error: `Server returned ${response.status}`
        });
        bc.close();

        const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        if (clients.length === 0 && response.status >= 400) {
          self.registration.showNotification('WARG Offline Sync', {
            body: 'Offline sync failed: ' + response.status
          });
        }
      }
    } catch (err) {
      console.error(`Error syncing attempt ${attempt.id}:`, err);
      // We throw to retry later if network still fails
      throw err;
    }
  }
}

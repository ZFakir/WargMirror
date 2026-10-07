importScripts('scripts/db.js');

const CACHE_NAME = 'warg-cache-v4';
const STATIC_ASSETS = [
  './',
  'index.html',
  'home.html',
  'game.html',
  'catalogue.html',
  'styles/tokens.css',
  'styles/home.css',
  'styles/game.css',
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
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Strategy 1: Network First (Current implementation)
async function networkFirstStrategy(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
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

// Strategy 2: Stale-While-Revalidate (Fast UI, background update)
async function staleWhileRevalidateStrategy(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request, { ignoreVary: true });
  
  const fetchPromise = fetch(request).then(networkResponse => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch(err => console.warn('SWR network failure', err));

  // Return cache immediately if available, otherwise wait for network
  return cachedResponse || fetchPromise;
}

// Strategy 3: Cache First (Instant load for static files)
async function cacheFirstStrategy(request) {
  const cache = await caches.open(CACHE_NAME);
  let cachedResponse = await cache.match(request, { ignoreVary: true });
  
  // Fallback for HTML query params
  if (!cachedResponse && request.mode === 'navigate') {
    cachedResponse = await cache.match(request, { ignoreVary: true, ignoreSearch: true });
  }

  if (cachedResponse) return cachedResponse;

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (err) {
    return Response.error();
  }
}

self.addEventListener('fetch', event => {
  // Only cache GET requests and HTTP/HTTPS schemes (ignore chrome-extension://)
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) return;

  const url = new URL(event.request.url);

  // 1. NETWORK-FIRST: Highly dynamic routes (Sessions, Auth, user profile)
  const networkFirstRoutes = ['/api/sessions', '/auth/me', '/api/users/profile', '/api/users/search'];
  if (networkFirstRoutes.some(path => url.pathname.startsWith(path))) {
    event.respondWith(networkFirstStrategy(event.request));
    return;
  }

  // 2. STALE-WHILE-REVALIDATE: Catalogue, Game Data, Library
  const swrRoutes = ['/api/minigames', '/api/users/']; // Assuming catalogue includes these
  // Wait, the artifact said '/api/args', but I need to make sure I use the right endpoints.
  // We'll use '/api/args' if it's an ARG platform, or '/api/minigames', '/api/users/'.
  // Let's use the ones mentioned.
  if (url.pathname.startsWith('/api/args') || url.pathname.startsWith('/api/minigames') || url.pathname.includes('/library')) {
    event.respondWith(staleWhileRevalidateStrategy(event.request));
    return;
  }

  // 3. CACHE-FIRST: Static assets, Map Tiles, Avatars, local images
  if (
    url.hostname === location.hostname || // Local HTML/CSS/JS (if it didn't match API routes above)
    url.hostname.includes('tile.openstreetmap.org') || // Map tiles
    url.hostname.includes('dicebear.com') // Avatars
  ) {
    event.respondWith(cacheFirstStrategy(event.request));
    return;
  }
  
  // Default to Network First for anything else
  event.respondWith(networkFirstStrategy(event.request));
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
        
        // Let's clear the pending attempt if it's a 500 error so it doesn't infinitely loop forever
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

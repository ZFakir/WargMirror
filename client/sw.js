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

self.addEventListener('fetch', event => {
  // Only cache GET requests and HTTP/HTTPS schemes (ignore chrome-extension://)
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) return;

  // Network first, fallback to cache
  event.respondWith(
    fetch(event.request).then(response => {
      // Allow caching of any successful response (200-299), ignoring strict type checks
      // as some APIs might return unexpected types. 
      if (!response || !response.ok) {
        return response;
      }
      const responseToCache = response.clone();
      caches.open(CACHE_NAME).then(cache => {
        cache.put(event.request, responseToCache);
      });
      return response;
    }).catch(async () => {
      // Use ignoreVary to prevent strict header mismatches from breaking the cache lookup
      const cachedResponse = await caches.match(event.request, { ignoreVary: true });
      if (cachedResponse) {
        return cachedResponse;
      }
      // If not in cache and network fails, return an error response
      return Response.error();
    })
  );
});

// Background Sync
self.addEventListener('sync', event => {
  if (event.tag === 'sync-attempts') {
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
      }
    } catch (err) {
      console.error(`Error syncing attempt ${attempt.id}:`, err);
      // We throw to retry later if network still fails
      throw err;
    }
  }
}

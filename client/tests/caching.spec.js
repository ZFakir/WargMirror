const { test, expect } = require('./fixtures.js');

// Must match CACHE_NAME in sw.js — the service worker only reads/writes this cache
const CACHE_NAME = 'warg-cache-v7';

test.describe('Tiered Caching Strategies & Cache Busting', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to home.html where api.js is loaded and SW is registered
    await page.goto('/home.html');
    
    // Wait for service worker to activate
    await page.waitForFunction(async () => {
      const registration = await navigator.serviceWorker.ready;
      return registration.active !== null;
    });
  });

  test('api.clearGameCache should remove specific game routes from cache', async ({ page }) => {
    await page.evaluate(async (cacheName) => {
      const cache = await caches.open(cacheName);
      // Use the exact API_BASE that api.js will use
      const base = 'http://localhost:3000';
      await cache.put(new Request(base + '/api/args'), new Response(JSON.stringify([{ id: 1 }])));
      await cache.put(new Request(base + '/api/args/5'), new Response(JSON.stringify({ id: 5 })));
      await cache.put(new Request(base + '/api/minigames'), new Response(JSON.stringify([{ id: 1 }])));
      await cache.put(new Request(base + '/api/other'), new Response(JSON.stringify({ keep: true })));
    }, CACHE_NAME);

    // Call the function
    await page.evaluate(async () => {
      await window.api.clearGameCache(5);
    });

    // Verify caches were deleted correctly
    const cacheStatus = await page.evaluate(async (cacheName) => {
      const cache = await caches.open(cacheName);
      const base = 'http://localhost:3000';
      const argsMatch = await cache.match(base + '/api/args');
      const arg5Match = await cache.match(base + '/api/args/5');
      const minigamesMatch = await cache.match(base + '/api/minigames');
      const otherMatch = await cache.match(base + '/api/other');

      return {
        argsDeleted: !argsMatch,
        arg5Deleted: !arg5Match,
        minigamesDeleted: !minigamesMatch,
        otherKept: !!otherMatch
      };
    }, CACHE_NAME);

    expect(cacheStatus.argsDeleted).toBe(true);
    expect(cacheStatus.arg5Deleted).toBe(true);
    expect(cacheStatus.minigamesDeleted).toBe(true);
    expect(cacheStatus.otherKept).toBe(true);
  });

  test('Stale-While-Revalidate should serve cache first', async ({ page }) => {
    // 1. Seed the cache with 'Old Title'
    await page.evaluate(async (cacheName) => {
      const cache = await caches.open(cacheName);
      const base = 'http://localhost:3000';
      await cache.put(new Request(base + '/api/args'), new Response(JSON.stringify([{ id: 1, title: 'Old Title' }])));
    }, CACHE_NAME);
    
    // 2. Fetch the data - because of SWR, it should INSTANTLY return 'Old Title' from cache
    const firstRes = await page.evaluate(async () => {
      const base = 'http://localhost:3000';
      const r = await fetch(base + '/api/args');
      return r.json();
    });
    
    expect(firstRes[0].title).toBe('Old Title');
  });

  test('Network-First should fallback to cache if network fails', async ({ page, context }) => {
    // Seed the cache with 'old'
    await page.evaluate(async (cacheName) => {
      const cache = await caches.open(cacheName);
      const base = 'http://localhost:3000';
      await cache.put(new Request(base + '/api/sessions'), new Response(JSON.stringify([{ session_id: 1, state: 'old' }])));
    }, CACHE_NAME);

    // Abort the network request to simulate a network failure.
    // This is more reliable than context.setOffline(true) in WebKit.
    await context.route('**/api/sessions', route => route.abort());

    // Request should fallback to cache
    const res = await page.evaluate(async () => {
      const base = 'http://localhost:3000';
      const r = await fetch(base + '/api/sessions');
      return r.json();
    });
    
    expect(res[0].state).toBe('old');
  });

});

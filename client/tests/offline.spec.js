const { test, expect } = require('./fixtures.js');

test.describe('Offline caching and sync mechanism', () => {
  test('should queue attempt when offline and sync when online', async ({ page }) => {
    // 1. Mock user session
    await page.route('**/api/users/profile', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ user: { username: 'test', id: 1, role: 'player' } })
      });
    });

    // 2. Mock waypoint loading since game.html fetches waypoints
    await page.route('**/api/sessions/*/waypoints', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });

    // Load game page with an ID to prevent redirect
    await page.goto('/game.html?id=1');

    // Basic assertion that page loaded
    const body = page.locator('body');
    await expect(body).toBeVisible();

    // Wait for the ES modules to finish loading and attach offlineDB to the window BEFORE going offline!
    await page.waitForFunction(() => typeof window.offlineDB !== 'undefined');

    // 3. Set offline mode
    await page.context().setOffline(true);

    // 4. Simulate saving an offline attempt via offlineDB
    await page.evaluate(async () => {
      // Simulate saving an attempt as if the SW intercepted it or the fallback fired
      await window.offlineDB.addPendingAttempt({ gameId: 1, imageBlob: new Blob(['test image data']), apiUrl: 'https://wargmirror.onrender.com/api/minigames/1/attempt' });
    });

    // Verify it is in the IndexedDB queue
    const pendingCount = await page.evaluate(async () => {
      const attempts = await window.offlineDB.getPendingAttempts();
      return attempts.length;
    });
    expect(pendingCount).toBe(1);

    // 5. Go back online
    await page.context().setOffline(false);

    // Fire an 'online' event explicitly to trigger UI updates
    await page.evaluate(() => {
      window.dispatchEvent(new Event('online'));
    });

    // 6. Simulate the Service Worker processing the sync and sending a BroadcastChannel message
    // Note: Playwright test environments might not fully support Background Sync API out of the box,
    // so we mock the BroadcastChannel message that the SW would send upon successful sync.
    await page.evaluate(() => {
      const bc = new BroadcastChannel('warg_sync_channel');
      bc.postMessage({
        type: 'SYNC_RESULT',
        success: true,
        gameId: 1,
        result: { passed: true, confidence_score: 0.99, points_awarded: 50, message: 'Perfect Match!' }
      });
      bc.close();
    });

    // 7. Verify the Toast notification appears in the UI
    const toast = page.locator('.toast.show').first();
    await expect(toast).toBeVisible();
    await expect(toast).toContainText('Offline attempt passed!');
    await expect(toast).toContainText('+50 pts');

    // 8. Simulate a failed sync (e.g., 500 error from server)
    await page.evaluate(() => {
      const bc = new BroadcastChannel('warg_sync_channel');
      bc.postMessage({
        type: 'SYNC_RESULT',
        success: false,
        gameId: 1,
        error: 'Server returned 500'
      });
      bc.close();
    });

    // Verify the failure toast notification appears
    const failureToast = page.locator('.toast.show').last();
    await expect(failureToast).toBeVisible();
    await expect(failureToast).toContainText('Offline sync failed: Server returned 500');
  });
});

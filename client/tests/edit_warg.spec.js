const { test, expect } = require('./fixtures.js');

test.describe('edit_warg page logic', () => {
  test('should load and initialize properly', async ({ page }) => {
    // Mock user session so pages don't redirect
    await page.route('**/api/users/profile', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ user: { username: 'test', id: 1, role: 'admin' } })
      });
    });

    await page.goto('/edit_warg.html');
    
    // basic assertion that page didn't crash
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('should allow opening and closing the barcode game modal', async ({ page }) => {
    // Mock user session so pages don't redirect
    await page.route('**/api/users/profile', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ user: { username: 'test', id: 1, role: 'admin' } })
      });
    });

    await page.goto('/edit_warg.html');
    
    // Wait for script to finish initializing by waiting for Leaflet map container
    await page.waitForSelector('.leaflet-container', { state: 'attached' });

    // The script initializes asynchronously. The event listener on btn-add-game 
    // is attached at the end of the script. We poll the click until the modal opens.
    const selectorModal = page.locator('#game-selector-modal-overlay');
    await expect(async () => {
      await page.evaluate(() => {
        const btn = document.getElementById('btn-add-game');
        if (btn) btn.click();
      });
      await expect(selectorModal).toHaveAttribute('aria-hidden', 'false', { timeout: 1000 });
    }).toPass({ timeout: 10000 });
    
    await expect(selectorModal).toHaveAttribute('aria-hidden', 'false');

    // Click Barcode game
    await page.click('button[data-game-type="barcode"]');
    
    // Verify Barcode modal opens
    const barcodeModal = page.locator('#barcode-modal-overlay');
    await expect(barcodeModal).toHaveAttribute('aria-hidden', 'false');

    // Enter barcode
    await page.fill('#barcode-value', '123456');
    
    // Click Cancel to just test it closes
    await page.click('#btn-cancel-barcode');
    await expect(barcodeModal).toHaveAttribute('aria-hidden', 'true');
  });
});

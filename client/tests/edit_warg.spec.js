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
    
    // Simulate selecting a node to enable the add game button
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('warg:node-selected', { detail: { id: 'wp1' } }));
    });
    
    // Open game selector (dispatch click directly to bypass playwright visibility checks)
    await page.evaluate(() => {
      document.getElementById('btn-add-game').click();
    });
    
    const selectorModal = page.locator('#game-selector-modal-overlay');
    await expect(selectorModal).toHaveAttribute('aria-hidden', 'false');

    // Click QR Code game
    await page.click('button[data-game-type="qr"]');
    
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

const { test, expect } = require('./fixtures.js');

test.describe('catalogue page logic', () => {
  test('should load and initialize properly', async ({ page }) => {
    // Mock user session so pages don't redirect
    await page.route('**/api/users/profile', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ user: { username: 'test', id: 1, role: 'admin' } })
      });
    });

    await page.goto('/catalogue.html');
    
    // basic assertion that page didn't crash
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
});

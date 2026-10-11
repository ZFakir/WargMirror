const { test, expect } = require('./fixtures.js');

test.describe('Global config (config.js)', () => {
  test.beforeEach(async ({ page }) => {
    // home.html loads config.js itself, so the real wiring is under test.
    await page.goto('/home.html');
  });

  test('resolves the API base URL to localhost during local development', async ({ page }) => {
    const urls = await page.evaluate(() => ({
      apiBaseUrl: window.API_BASE_URL,
      apiBase: window.API_BASE,
    }));
    expect(urls.apiBaseUrl).toBe('http://localhost:3000');
    expect(urls.apiBase).toBe('http://localhost:3000');
  });

  test('focusing the search input widens the search bar and blur restores it', async ({ page }) => {
    await page.locator('#search-input').focus();
    let width = await page.evaluate(() =>
      document.querySelector('.topbar__search').style.getPropertyValue('max-inline-size'));
    expect(width).toBe('560px');

    await page.evaluate(() => document.getElementById('search-input').blur());
    width = await page.evaluate(() =>
      document.querySelector('.topbar__search').style.getPropertyValue('max-inline-size'));
    expect(width).toBe('');
  });

  test("'/' shortcut focuses the search input", async ({ page }) => {
    await page.locator('body').click({ position: { x: 5, y: 200 } });
    await page.keyboard.press('/');
    await expect(page.locator('#search-input')).toBeFocused();
  });

  test('Enter in the search input navigates to the catalogue with the query', async ({ page }) => {
    // Serve a stub catalogue page so the assertion is not affected by later redirects.
    await page.route('**/catalogue.html*', (route) => route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: '<html><body>catalogue stub</body></html>',
    }));

    await page.fill('#search-input', 'campus');
    await page.press('#search-input', 'Enter');
    await page.waitForURL('**/catalogue.html?search=campus');
    expect(page.url()).toContain('catalogue.html?search=campus');
  });
});

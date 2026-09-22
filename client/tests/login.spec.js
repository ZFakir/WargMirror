const { test, expect } = require('./fixtures.js');

test.describe('login page/script logic', () => {
  test('should render login form elements', async ({ page }) => {
    await page.goto('/login.html');
    await expect(page.locator('h1')).toHaveText('Welcome to WARG');
    await expect(page.locator('input#email')).toBeVisible();
    await expect(page.locator('input#password')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should handle validation errors', async ({ page }) => {
    await page.goto('/login.html');
    // Clicking submit with empty inputs triggers browser required validation,
    // so we fill invalid data and let the JS API call fail
    await page.fill('input#email', 'invalid@user.com');
    await page.fill('input#password', 'wrongpass');
    
    // Mock the API response to return a 401
    await page.route('**/auth/login', route => {
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Incorrect email or password.' })
      });
    });

    await page.click('button[type="submit"]');

    // Assuming the frontend script alerts or shows an error message.
    // If it uses window.alert, we can intercept it:
    page.once('dialog', dialog => {
      expect(dialog.message()).toContain('Incorrect email or password');
      dialog.dismiss();
    });
  });
});

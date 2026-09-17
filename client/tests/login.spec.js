const { test, expect } = require('@playwright/test');

test('user can navigate to login and see the form', async ({ page }) => {
  // Navigate to the login page (via the local webServer configured in playwright.config.js)
  await page.goto('/login.html');

  // Verify the page title
  await expect(page).toHaveTitle(/Login/);

  // Verify the header is visible
  const header = page.locator('h1', { hasText: 'Welcome to WARG' });
  await expect(header).toBeVisible();

  // Verify the email and password inputs exist
  const emailInput = page.locator('input[type="email"]');
  const passwordInput = page.locator('input[type="password"]');
  await expect(emailInput).toBeVisible();
  await expect(passwordInput).toBeVisible();

  // Note: we don't submit the form here because this is a purely frontend UI test 
  // without a mocked backend, so submitting it might redirect to an error or require a real API.
  // In a full E2E test, we would intercept network requests or spin up the real backend.
});

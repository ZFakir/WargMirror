const { test, expect } = require('./fixtures.js');

test.describe('signup page/script logic', () => {
  test('should render signup form elements', async ({ page }) => {
    await page.goto('/signup.html');
    await expect(page.locator('h1')).toHaveText('Create an Account');
    await expect(page.locator('input#username')).toBeVisible();
    await expect(page.locator('input#email')).toBeVisible();
    await expect(page.locator('input#password')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should mock successful signup', async ({ page }) => {
    await page.goto('/signup.html');
    await page.fill('input#username', 'testuser');
    await page.fill('input#email', 'test@user.com');
    await page.fill('input#password', 'password123');
    
    // Mock successful signup API response
    await page.route('**/auth/signup', route => {
      route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'User created successfully' })
      });
    });

    // Mock successful login API response after signup
    await page.route('**/auth/login', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ token: 'mock-token', user: { id: 1 } })
      });
    });

    await page.click('button[type="submit"]');
    // It should redirect to home.html or similar
    await page.waitForURL('**/home.html');
    expect(page.url()).toContain('home.html');
  });
});

const { test, expect } = require('./fixtures.js');

test.describe('home page/script logic', () => {
  test('should render home page navigation and layout', async ({ page }) => {
    // Mock the session check API call to simulate a logged-in user
    await page.route('**/api/users/profile', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: { username: 'testuser', id: 1, role: 'player' },
          stats: { arqs_completed: 10, total_score: 500 }
        })
      });
    });

    await page.goto('/home.html');
    await expect(page.locator('header.top-nav')).toBeVisible();
    await expect(page.locator('nav.bottom-nav')).toBeVisible();
  });

  test('should load and render nearby ARGs', async ({ page }) => {
    // Mock the API response for ARGs
    await page.route('**/api/args*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 101, title: 'Mystery at Origins', description: 'Find the hidden truth.', status: 'active', author: { username: 'creator1' } }
        ])
      });
    });

    // We also need to mock the profile so the page doesn't redirect to login
    await page.route('**/api/users/profile', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ user: { username: 'testuser', id: 1 } })
      });
    });

    await page.goto('/home.html');
    
    // Check if the mock ARG is rendered in the DOM
    const argTitle = page.locator('h3', { hasText: 'Mystery at Origins' });
    await expect(argTitle).toBeVisible();
  });
});

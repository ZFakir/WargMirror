const { test, expect } = require('./fixtures.js');

test.describe('game page logic', () => {
  test('should load and initialize properly', async ({ page }) => {
    // Mock user session so pages don't redirect
    await page.route('**/api/users/profile', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ user: { username: 'test', id: 1, role: 'admin' } })
      });
    });

    await page.goto('/game.html');
    
    // basic assertion that page didn't crash
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('should render Point Domination map nodes with a skull emoji and pd-node class', async ({ page }) => {
    await page.route('**/api/users/profile', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ user: { username: 'test', id: 1, role: 'admin' } })
      });
    });

    await page.route('**/api/game/*/start', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: "Session started" })
      });
    });

    await page.route('**/api/game/*/state', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          waypoints: [
            {
              waypoint_id: 1,
              title: "PD Node",
              location: { type: "Point", coordinates: [0, 0] },
              validation_radius_m: 50,
              Minigames: [
                { type: "point_domination", gamemode: "Point Domination" }
              ]
            }
          ],
          progress: [
            { waypoint_id: 1, status: "unlocked" }
          ]
        })
      });
    });

    await page.route('**/api/args/*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 1,
          title: "Test ARG",
          like_count: 0,
          dislike_count: 0
        })
      });
    });

    await page.goto('/game.html?id=1');
    
    // Check if the node marker has pd-node class and contains skull emoji
    const nodeMarker = page.locator('.node-marker.pd-node');
    await expect(nodeMarker).toBeVisible();

    const core = nodeMarker.locator('.node-marker__core');
    await expect(core).toContainText('☠️');
  });
});


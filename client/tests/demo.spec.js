const { test, expect } = require('./fixtures.js');

test.describe('Demo Game & Admin Configuration', () => {
  test('login page displays Play Demo button when a demo game is configured', async ({ page }) => {
    await page.route('**/api/demo', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          demo: {
            arg_id: 7,
            title: 'Wits Innovation Trail',
            caption: 'Showcase quest',
            mode: 'solo',
            status: 'published',
            Creator: { username: 'wits_admin' }
          }
        })
      });
    });

    await page.goto('/login.html');

    const demoBtn = page.locator('#btn-play-demo');
    await expect(demoBtn).toBeVisible();
    await expect(demoBtn).toHaveAttribute('href', 'game.html?id=7&demo=1');
    await expect(page.locator('#demo-game-subtitle')).toContainText('Wits Innovation Trail');
  });

  test('login page hides Play Demo section when no demo game is configured', async ({ page }) => {
    await page.route('**/api/demo', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ demo: null })
      });
    });

    await page.goto('/login.html');
    await expect(page.locator('#demo-game-section')).toBeHidden();
  });

  test('home page shows Play Demo banner for unauthenticated guests', async ({ page }) => {
    await page.route('**/auth/me', route => {
      route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'Not authenticated' }) });
    });

    await page.route('**/api/args', route => {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });

    await page.route('**/api/demo', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          demo: {
            arg_id: 1,
            title: 'The Wits Heritage Trail',
            caption: 'Explore iconic campus landmarks.',
            mode: 'solo',
            status: 'published',
            Creator: { username: 'luc_creates' }
          }
        })
      });
    });

    await page.goto('/home.html');

    const banner = page.locator('#demo-banner');
    await expect(banner).toBeVisible();
    await expect(page.locator('#demo-banner-title')).toHaveText('The Wits Heritage Trail');
    await expect(page.locator('#btn-home-play-demo')).toHaveAttribute('href', 'game.html?id=1&demo=1');
  });

  test('game page renders Demo Mode banner and map nodes for guests', async ({ page }) => {
    await page.route('**/auth/me', route => {
      route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'Not authenticated' }) });
    });

    await page.route('**/api/demo', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ demo: { arg_id: 1, title: 'Heritage Demo', mode: 'solo' } })
      });
    });

    await page.route('**/api/game/1/start', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ arg_id: 1, status: 'active', is_demo: true })
      });
    });

    await page.route('**/api/game/1/state', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          is_demo: true,
          session: { arg_id: 1, status: 'active', is_demo: true },
          waypoints: [
            {
              waypoint_id: 11,
              title: 'Demo Start',
              description: 'Welcome!',
              location: { type: 'Point', coordinates: [28.0305, -26.1929] },
              validation_radius_m: 30,
              Minigames: [{ game_id: 50, game_type: 'text_answer', config_json: { hint: 'Type 1922' } }]
            }
          ],
          progress: [{ waypoint_id: 11, status: 'unlocked' }],
          attempts: [],
          edges: []
        })
      });
    });

    await page.route('**/api/args/1', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ arg_id: 1, title: 'Heritage Demo', like_count: 0, dislike_count: 0 })
      });
    });

    await page.route('**/api/comments/arg/1', route => {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });

    await page.goto('/game.html?demo=1');

    const demoBanner = page.locator('#demo-mode-banner');
    await expect(demoBanner).toBeVisible();
    await expect(demoBanner).toContainText('DEMO MODE');
    await expect(page.locator('#btn-reset-demo')).toBeVisible();
  });

  test('admin dashboard allows selecting and updating the demo game', async ({ page }) => {
    await page.route('**/auth/me', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ user_id: 1, username: 'wits_admin', role: 'admin' })
      });
    });

    await page.route('**/api/admin/metrics', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ total_users: 5, published_args: 2, open_flags: 0, active_sessions: 1, completed_sessions: 3 })
      });
    });

    await page.route('**/api/admin/flags', route => {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });

    await page.route('**/api/admin/users*', route => {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });

    await page.route('**/api/admin/games', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          demo_arg_id: 1,
          games: [
            { arg_id: 1, title: 'The Wits Heritage Trail', mode: 'solo', status: 'published', Creator: { username: 'luc_creates' } },
            { arg_id: 2, title: 'Chemistry Cipher', mode: 'solo', status: 'published', Creator: { username: 'luc_creates' } }
          ]
        })
      });
    });

    let putPayload = null;
    await page.route('**/api/admin/demo-game', async route => {
      if (route.request().method() === 'PUT') {
        putPayload = route.request().postDataJSON();
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            message: 'Demo game updated successfully',
            demo_arg_id: putPayload.arg_id,
            game: putPayload.arg_id ? { arg_id: putPayload.arg_id, title: 'Chemistry Cipher' } : null
          })
        });
      } else {
        await route.fallback();
      }
    });

    await page.goto('/admin.html');

    await expect(page.locator('#demo-current-status')).toContainText('Active Demo: The Wits Heritage Trail');
    await page.selectOption('#select-demo-game', '2');
    await page.click('#btn-save-demo-game');

    await expect.poll(() => putPayload).toEqual({ arg_id: 2 });
    await expect(page.locator('#demo-current-status')).toContainText('Active Demo: Chemistry Cipher');
  });
});

// Tests for UI fixes: spoiler theming and reveals, nav badge removal, admin skeletons.
const { test, expect } = require('@playwright/test');

test('spoiler box is theme-aware, labelled, and reveals on click', async ({ page }) => {
  await page.goto('/catalogue.html', { waitUntil: 'domcontentloaded' });
  await page.setContent(`
    <link rel="stylesheet" href="http://localhost:8080/styles/tokens.css">
    <link rel="stylesheet" href="http://localhost:8080/styles/game.css">
    <p class="comment-item__content"><span id="sp" class="spoiler-text" tabindex="0" role="button">secret body</span></p>
    <script>
      const sp = document.getElementById('sp');
      sp.addEventListener('click', () => sp.classList.add('is-revealed'), { once: true });
    </script>
  `);
  const sp = page.locator('#sp');
  // Chromium may report computed colors as rgba with a ~1 alpha; compare RGB channels only
  const rgb = (c) => {
    const m = c.match(/rgba?\(([^)]+)\)/);
    return m ? m[1].split(',').slice(0, 3).map(s => s.trim()).join(', ') : c;
  };

  // Dark mode (default): near-white box, dark label
  expect(rgb(await sp.evaluate(el => getComputedStyle(el).backgroundColor))).toBe('241, 243, 245');
  expect(await sp.evaluate(el => getComputedStyle(el, '::before').content)).toContain('Spoiler');
  expect(rgb(await sp.evaluate(el => getComputedStyle(el, '::before').color))).toBe('18, 16, 14');

  // Light mode: near-black box, light label (wait out the 0.2s bg transition)
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
  await page.waitForTimeout(300);
  expect(rgb(await sp.evaluate(el => getComputedStyle(el).backgroundColor))).toBe('18, 16, 14');
  expect(rgb(await sp.evaluate(el => getComputedStyle(el, '::before').color))).toBe('241, 243, 245');

  // Click reveals: label disappears, background clears
  await sp.click();
  await expect(sp).toHaveClass(/is-revealed/);
  await page.waitForTimeout(300);
  expect(await sp.evaluate(el => getComputedStyle(el).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
  expect(await sp.evaluate(el => getComputedStyle(el, '::before').content)).toBe('none');
});

test('no badge number next to Catalogue on any page nav', async ({ page }) => {
  const pages = ['home.html', 'catalogue.html', 'studio.html', 'game.html?id=1', 'edit_warg.html', 'analytics.html', 'admin.html', 'user-profile.html', 'settings.html'];
  for (const p of pages) {
    await page.goto('/' + p, { waitUntil: 'domcontentloaded' });
    expect(await page.locator('.sidebar__nav .nav-item__badge').count(), p).toBe(0);
  }
});

test('admin page shows skeletons while loading, then real content', async ({ page }) => {
  await page.route('**/auth/me', route => route.fulfill({ json: { user_id: 1, username: 'admin', role: 'admin' } }));

  let releaseFlags, releaseMetrics, releaseUsers;
  const flagsGate = new Promise(r => { releaseFlags = r; });
  const metricsGate = new Promise(r => { releaseMetrics = r; });
  const usersGate = new Promise(r => { releaseUsers = r; });
  await page.route('**/api/admin/flags', async route => { await flagsGate; route.fulfill({ json: [] }); });
  await page.route('**/api/admin/metrics', async route => { await metricsGate; route.fulfill({ json: { total_users: 10, published_args: 5, open_flags: 0, active_sessions: 2, completed_sessions: 7 } }); });
  await page.route('**/api/admin/users', async route => { await usersGate; route.fulfill({ json: [] }); });

  await page.goto('/admin.html');

  // Skeletons visible while requests are in flight
  await expect(page.locator('#admin-metrics .skeleton-line')).toHaveCount(10); // 5 tiles x 2 lines
  await expect(page.locator('#row-flagged-games .game-card--skeleton')).toHaveCount(3);
  await expect(page.locator('#admin-flags-list .flag-item')).toHaveCount(3);

  releaseFlags(); releaseMetrics(); releaseUsers();

  await expect(page.locator('#admin-flags-list')).toContainText('No recent flags.');
  await expect(page.locator('#row-flagged-games')).toBeEmpty();
  await expect(page.locator('#admin-metrics')).toContainText('Total Users');
  await expect(page.locator('#admin-metrics')).toContainText('10');

  // renderRow targets the correct container id (regression: was 'flagged-games-row')
  await page.evaluate(() => {
    window.GameCard.renderRow('row-flagged-games', [{
      id: 1, title: 'Stub Game', caption: 'd', image: '', emoji: '\u{1F3AE}',
      likes: 0, dislikes: 0, author: { initials: 'CR', name: 'Creator' }
    }], { hideProgress: true });
  });
  await expect(page.locator('#row-flagged-games .game-card')).toHaveCount(1);
  await expect(page.locator('#row-flagged-games')).toContainText('Stub Game');
});

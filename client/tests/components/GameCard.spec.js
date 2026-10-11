const { test, expect } = require('../fixtures.js');

const GAME = {
  id: 7,
  title: 'Campus Hunt',
  caption: 'Find the landmarks.',
  mode: 'solo',
  author: { name: 'ZFakir', initials: 'Z' },
  likes: 12,
  dislikes: 1,
  progress: 40,
  progressLabel: '2 / 5 waypoints',
};

test.describe('GameCard component (GameCard.js)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login.html');
    await page.addScriptTag({ url: '/scripts/components/GameCard.js' });
    await page.waitForFunction(() => typeof window.GameCard === 'object');
  });

  test('exposes its public API', async ({ page }) => {
    const api = await page.evaluate(() => ({
      create: typeof window.GameCard.create,
      renderRow: typeof window.GameCard.renderRow,
      renderSkeletons: typeof window.GameCard.renderSkeletons,
    }));
    expect(api).toEqual({ create: 'function', renderRow: 'function', renderSkeletons: 'function' });
  });

  test('create() builds an accessible card with title, author, badge and game id', async ({ page }) => {
    const info = await page.evaluate((game) => {
      const card = window.GameCard.create(game);
      document.body.appendChild(card);
      return {
        tag: card.tagName,
        className: card.className,
        gameId: card.dataset.gameId,
        role: card.getAttribute('role'),
        ariaLabel: card.getAttribute('aria-label'),
      };
    }, GAME);

    expect(info.tag).toBe('ARTICLE');
    expect(info.className).toContain('game-card');
    expect(info.gameId).toBe('7');
    expect(info.role).toBe('listitem');
    expect(info.ariaLabel).toBe('Campus Hunt — Solo game');
    await expect(page.locator('.gc-title')).toHaveText('Campus Hunt');
    await expect(page.locator('.gc-author__name')).toHaveText('ZFakir');
    await expect(page.locator('.gc-cover__badge')).toHaveText('Solo');
    await expect(page.locator('.gc-progress__fill')).toHaveAttribute('style', 'width:40%');
  });

  test('renderRow() renders one card per game', async ({ page }) => {
    await page.evaluate((game) => {
      const row = document.createElement('div');
      row.id = 'games-row';
      document.body.appendChild(row);
      window.GameCard.renderRow('games-row', [game, { ...game, id: 8, title: 'Second Hunt' }]);
    }, GAME);

    await expect(page.locator('#games-row .game-card')).toHaveCount(2);
    await expect(page.locator('#games-row .gc-title').nth(1)).toHaveText('Second Hunt');
  });

  test('renderSkeletons() fills the container with skeleton cards', async ({ page }) => {
    await page.evaluate(() => {
      const row = document.createElement('div');
      row.id = 'skeleton-row';
      document.body.appendChild(row);
      window.GameCard.renderSkeletons('skeleton-row', 3);
    });

    await expect(page.locator('#skeleton-row .game-card--skeleton')).toHaveCount(3);
  });

  test('flag button opens the flag modal with the game id', async ({ page }) => {
    await page.evaluate((game) => {
      window._flagCalls = [];
      window.FlagModal = class { open(id, title) { window._flagCalls.push([id, title]); } };
      document.body.appendChild(window.GameCard.create(game));
      document.querySelector('[data-action="flag"]').click();
    }, GAME);

    const calls = await page.evaluate(() => window._flagCalls);
    expect(calls).toEqual([['7', 'Report Game']]);
  });

  test('remove menu opens the remove modal when showRemove is set', async ({ page }) => {
    await page.evaluate((game) => {
      window._removeCalls = [];
      window.RemoveModal = class { open(id, title) { window._removeCalls.push([id, title]); } };
      document.body.appendChild(window.GameCard.create(game, { showRemove: true }));
      document.querySelector('[data-action="remove-menu"]').click();
      document.querySelector('[data-action="remove-recent"]').click();
    }, GAME);

    const calls = await page.evaluate(() => window._removeCalls);
    expect(calls).toEqual([['7', 'Campus Hunt']]);
  });

  test('publish button dispatches warg:publish with the game info', async ({ page }) => {
    const detail = await page.evaluate((game) => new Promise((resolve) => {
      const card = window.GameCard.create(game, { showPublish: true });
      document.body.appendChild(card);
      card.addEventListener('warg:publish', (e) => resolve(e.detail));
      card.querySelector('[data-action="publish"]').click();
    }), GAME);

    expect(detail).toEqual({ gameId: '7', gameTitle: 'Campus Hunt' });
  });

  test('like button updates optimistically then syncs with the API response', async ({ page }) => {
    await page.evaluate((game) => {
      window._votes = [];
      window.api = {
        voteArg: (id, action) => {
          window._votes.push([id, action]);
          return Promise.resolve({ success: true, like_count: 42, dislike_count: 3 });
        },
      };
      document.body.appendChild(window.GameCard.create(game));
      document.querySelector('[data-action="like"]').click();
    }, GAME);

    await expect(page.locator('[data-action="like"]')).toHaveAttribute('aria-pressed', 'true');
    // The server response overwrites the optimistic count.
    await expect(page.locator('[data-action="like"] .gc-action__count')).toHaveText('42');
    const votes = await page.evaluate(() => window._votes);
    expect(votes).toEqual([['7', 'like']]);
  });
});

const path = require('path');
const { test, expect } = require('./fixtures.js');

test.describe('GameCard cover layout', () => {
  test('reserves the 3:2 cover ratio before a lazy-loaded image resolves', async ({ page }) => {
    await page.setContent('<!doctype html><title>GameCard test</title>');
    await page.addScriptTag({ path: path.join(__dirname, '../scripts/components/GameCard.js') });

    await page.evaluate(() => {
      document.body.appendChild(GameCard.create({
        id: 1,
        title: 'Test ARG',
        caption: 'Test caption',
        mode: 'solo',
        image: '/assets/test-cover.jpg',
        author: { initials: 'TA', name: 'Test Author' },
        likes: 0,
        dislikes: 0
      }));
    });

    const cover = page.locator('.gc-cover');
    const image = cover.locator('img');
    await expect(image).toHaveAttribute('width', '3');
    await expect(image).toHaveAttribute('height', '2');
    await expect(image).toHaveAttribute('loading', 'lazy');
    await expect(image).toHaveAttribute('decoding', 'async');
  });
});

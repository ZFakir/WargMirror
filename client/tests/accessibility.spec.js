const { test, expect } = require('./fixtures.js');

test.describe('Keyboard accessibility', () => {
  test('skip link is the first tab stop and focuses main content', async ({ page }) => {
    await page.goto('/login.html');

    await page.keyboard.press('Tab');
    await expect(page.locator('.skip-link')).toBeFocused();

    await page.keyboard.press('Enter');
    await expect(page.locator('#main-content')).toBeFocused();
  });

  test('ConfirmModal traps focus and restores it after Escape', async ({ page }) => {
    await page.goto('/login.html');
    await page.evaluate(() => {
      const trigger = document.createElement('button');
      trigger.id = 'confirm-trigger';
      trigger.textContent = 'Open confirmation';
      document.body.appendChild(trigger);
      trigger.focus();
    });
    await page.addScriptTag({ url: '/scripts/components/ConfirmModal.js' });

    await page.evaluate(() => window.confirmModal.open({ title: 'Delete game' }));
    await expect(page.locator('#btn-generic-confirm-close')).toBeFocused();

    await page.keyboard.press('Shift+Tab');
    await expect(page.locator('#btn-generic-confirm-submit')).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(page.locator('#generic-confirm-modal-overlay')).toHaveAttribute('aria-hidden', 'true');
    await expect(page.locator('#confirm-trigger')).toBeFocused();
  });
});

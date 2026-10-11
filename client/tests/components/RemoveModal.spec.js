const { test, expect } = require('../fixtures.js');

test.describe('RemoveModal component', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login.html');
    await page.evaluate(async () => {
      const mod = await import('/scripts/components/RemoveModal.js');
      window.RemoveModalClass = mod.RemoveModal;
      window.removeModal = new mod.RemoveModal();
    });
  });

  test('exposes a global for non-module scripts and injects the dialog', async ({ page }) => {
    const info = await page.evaluate(() => {
      const overlay = document.getElementById('remove-modal-overlay');
      return {
        global: window.RemoveModal === window.RemoveModalClass,
        hidden: overlay.getAttribute('aria-hidden'),
        modal: overlay.querySelector('[role="dialog"]').getAttribute('aria-modal'),
        hasCss: !!document.querySelector('link[href*="remove-modal.css"]'),
      };
    });
    expect(info.global).toBe(true);
    expect(info.hidden).toBe('true');
    expect(info.modal).toBe('true');
    expect(info.hasCss).toBe(true);
  });

  test('open() shows the game title and close() hides the modal', async ({ page }) => {
    await page.evaluate(() => window.removeModal.open(5, 'Campus Hunt'));
    await expect(page.locator('#remove-modal-overlay')).toHaveAttribute('aria-hidden', 'false');
    await expect(page.locator('#remove-game-title')).toHaveText('Campus Hunt');

    await page.click('#btn-remove-cancel');
    await expect(page.locator('#remove-modal-overlay')).toHaveAttribute('aria-hidden', 'true');
  });

  test('confirming removes the recent arg and dispatches warg:removed-recent', async ({ page }) => {
    await page.evaluate(() => {
      window._removed = [];
      window._removedEvent = null;
      window.api = {
        removeRecentArg: (argId) => {
          window._removed.push(argId);
          return Promise.resolve();
        },
      };
      document.addEventListener('warg:removed-recent', (e) => { window._removedEvent = e.detail; });
      window.removeModal.open(5, 'Campus Hunt');
    });

    await page.click('#btn-remove-submit');

    await page.waitForFunction(() => window._removed.length === 1);
    const state = await page.evaluate(() => ({ removed: window._removed, event: window._removedEvent }));
    expect(state.removed).toEqual([5]);
    expect(state.event).toEqual({ argId: 5 });
    await expect(page.locator('#remove-modal-overlay')).toHaveAttribute('aria-hidden', 'true');
  });
});

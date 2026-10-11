const { test, expect } = require('../fixtures.js');

test.describe('FlagModal component', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login.html');
    await page.evaluate(async () => {
      const mod = await import('/scripts/components/FlagModal.js');
      window.FlagModalClass = mod.FlagModal;
      window.flagModal = new mod.FlagModal();
    });
  });

  test('exposes a global for non-module scripts and injects an accessible dialog', async ({ page }) => {
    const info = await page.evaluate(() => {
      const overlay = document.getElementById('flag-modal-overlay');
      return {
        global: window.FlagModal === window.FlagModalClass,
        hidden: overlay.getAttribute('aria-hidden'),
        modal: overlay.querySelector('[role="dialog"]').getAttribute('aria-modal'),
        hasCss: !!document.querySelector('link[href*="flag-modal.css"]'),
      };
    });
    expect(info.global).toBe(true);
    expect(info.hidden).toBe('true');
    expect(info.modal).toBe('true');
    expect(info.hasCss).toBe(true);
  });

  test('open() shows the modal with the given title and close() hides it', async ({ page }) => {
    await page.evaluate(() => window.flagModal.open(42, 'Report Game'));
    await expect(page.locator('#flag-modal-overlay')).toHaveAttribute('aria-hidden', 'false');
    await expect(page.locator('#flag-modal-title')).toContainText('Report Game');
    await expect(page.locator('#flag-reason')).toHaveValue('inappropriate_content');

    await page.click('#btn-flag-cancel');
    await expect(page.locator('#flag-modal-overlay')).toHaveAttribute('aria-hidden', 'true');
  });

  test('submitting reports the flag through the api with the argId and entered reason', async ({ page }) => {
    await page.evaluate(() => {
      window._flagCalls = [];
      window.api = {
        flagArg: (argId, reason, description) => {
          window._flagCalls.push([argId, reason, description]);
          return Promise.resolve({});
        },
      };
      window.flagModal.open(7, 'Report Game');
    });

    await page.selectOption('#flag-reason', 'spam');
    await page.fill('#flag-description', 'Looks like advertising');
    await page.click('#btn-flag-submit');

    await page.waitForFunction(() => window._flagCalls.length === 1);
    const calls = await page.evaluate(() => window._flagCalls);
    expect(calls).toEqual([[7, 'spam', 'Looks like advertising']]);
    await expect(page.locator('#btn-flag-submit')).toContainText('Reported!');
  });
});

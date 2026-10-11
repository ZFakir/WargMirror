const { test, expect } = require('../fixtures.js');

test.describe('PublishModal component', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login.html');
    await page.evaluate(async () => {
      window.API_BASE_URL = window.location.origin;
      const mod = await import('/scripts/components/PublishModal.js');
      window.PublishModalClass = mod.PublishModal;
      window.publishModal = new mod.PublishModal();
    });
  });

  test('injects an accessible dialog', async ({ page }) => {
    const info = await page.evaluate(() => {
      const overlay = document.getElementById('publish-modal-overlay');
      return {
        hidden: overlay.getAttribute('aria-hidden'),
        modal: overlay.querySelector('[role="dialog"]').getAttribute('aria-modal'),
        hasCss: !!document.querySelector('link[href*="publish-modal.css"]'),
      };
    });
    expect(info.hidden).toBe('true');
    expect(info.modal).toBe('true');
    expect(info.hasCss).toBe(true);
  });

  test('open() configures publish mode', async ({ page }) => {
    await page.evaluate(() => window.publishModal.open(9, 'Campus Hunt'));
    await expect(page.locator('#publish-modal-overlay')).toHaveAttribute('aria-hidden', 'false');
    await expect(page.locator('#publish-game-title')).toHaveText('Campus Hunt');
    await expect(page.locator('#publish-modal-title')).toContainText('Publish WARG');
    await expect(page.locator('#btn-publish-submit')).toHaveText('Publish');
  });

  test('open() with unpublish action swaps the copy', async ({ page }) => {
    await page.evaluate(() => window.publishModal.open(9, 'Campus Hunt', 'unpublish'));
    await expect(page.locator('#publish-modal-title')).toContainText('Unpublish WARG');
    await expect(page.locator('#btn-publish-submit')).toHaveText('Unpublish');
  });

  test('submitting publishes via PATCH and shows the success state', async ({ page }) => {
    await page.evaluate(() => window.publishModal.open(9, 'Campus Hunt'));
    await page.route('**/api/args/9/status', (route) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    }));

    const requestPromise = page.waitForRequest((r) => r.url().includes('/api/args/9/status'));
    await page.click('#btn-publish-submit');
    const request = await requestPromise;

    expect(request.method()).toBe('PATCH');
    expect(request.postDataJSON()).toEqual({ status: 'published' });
    await expect(page.locator('.publish-modal__body')).toContainText('Success');
  });

  test('unpublish submits status=unpublished', async ({ page }) => {
    await page.evaluate(() => window.publishModal.open(9, 'Campus Hunt', 'unpublish'));
    await page.route('**/api/args/9/status', (route) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    }));

    const requestPromise = page.waitForRequest((r) => r.url().includes('/api/args/9/status'));
    await page.click('#btn-publish-submit');
    const request = await requestPromise;

    expect(request.postDataJSON()).toEqual({ status: 'unpublished' });
    await expect(page.locator('.publish-modal__body')).toContainText('unpublished');
  });
});

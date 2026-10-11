const { test, expect } = require('../fixtures.js');

test.describe('CameraCapture component', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login.html');
    await page.evaluate(async () => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = '/styles/game.css';
      document.head.appendChild(link);

      const mod = await import('/scripts/components/CameraCapture.js');
      window.CameraCapture = mod.CameraCapture;
      const c = document.createElement('div');
      c.id = 'camera-container-test';
      c.className = 'camera-container';
      document.body.appendChild(c);
      window.testContainer = c;
    });
  });

  test('initializes elements without displaying a spinner initially', async ({ page }) => {
    const hasSpinner = await page.evaluate(() => {
      const camera = new window.CameraCapture(window.testContainer, 'shape_match', null);
      return !!window.testContainer.querySelector('.camera-spinner-overlay');
    });
    expect(hasSpinner).toBe(false);
  });

  test('showSpinner creates spinner overlay with message and spinner elements', async ({ page }) => {
    await page.evaluate(() => {
      const camera = new window.CameraCapture(window.testContainer, 'shape_match', null);
      window.activeCamera = camera;
      camera.showSpinner('Analyzing capture...');
    });

    const overlay = page.locator('#camera-container-test .camera-spinner-overlay');
    await expect(overlay).toBeVisible();

    const spinner = page.locator('#camera-container-test .camera-spinner');
    await expect(spinner).toBeVisible();

    const text = page.locator('#camera-container-test .camera-spinner-text');
    await expect(text).toHaveText('Analyzing capture...');
  });

  test('showSpinner updates text on subsequent calls without duplicating overlay', async ({ page }) => {
    await page.evaluate(() => {
      const camera = new window.CameraCapture(window.testContainer, 'shape_match', null);
      window.activeCamera = camera;
      camera.showSpinner('Analyzing...');
      camera.showSpinner('Processing image...');
    });

    const overlays = page.locator('#camera-container-test .camera-spinner-overlay');
    await expect(overlays).toHaveCount(1);

    const text = page.locator('#camera-container-test .camera-spinner-text');
    await expect(text).toHaveText('Processing image...');
  });

  test('hideSpinner removes the spinner overlay from container', async ({ page }) => {
    await page.evaluate(() => {
      const camera = new window.CameraCapture(window.testContainer, 'shape_match', null);
      camera.showSpinner('Analyzing...');
      camera.hideSpinner();
    });

    const overlays = page.locator('#camera-container-test .camera-spinner-overlay');
    await expect(overlays).toHaveCount(0);
  });

  test('stop() automatically removes the spinner overlay', async ({ page }) => {
    await page.evaluate(() => {
      const camera = new window.CameraCapture(window.testContainer, 'shape_match', null);
      camera.showSpinner('Analyzing...');
      camera.stop();
    });

    const overlays = page.locator('#camera-container-test .camera-spinner-overlay');
    await expect(overlays).toHaveCount(0);
  });
});

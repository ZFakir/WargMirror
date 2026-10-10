const { test, expect } = require('../fixtures.js');

// Mirrors the play-modal markup in game.html so the singleton binds correctly.
const PLAY_MODAL_MARKUP = `
  <div class="modal-overlay" id="play-modal-overlay" aria-hidden="true">
    <div class="play-modal" role="dialog" aria-modal="true" aria-labelledby="play-modal-title">
      <div class="play-modal__header">
        <h2 class="play-modal__title" id="play-modal-title">Waypoint Name</h2>
        <button class="play-modal__close-btn" id="btn-play-modal-close" aria-label="Close Play Menu">close</button>
      </div>
      <div class="play-modal__body">
        <div class="play-modal__description-wrapper">
          <p class="play-modal__description" id="play-modal-description"></p>
          <button class="play-modal__read-more" id="btn-read-more" hidden>Read more</button>
        </div>
        <div class="play-modal__canvas-wrapper">
          <canvas id="play-canvas"></canvas>
        </div>
        <div class="play-modal__controls" id="play-modal-controls"></div>
      </div>
    </div>
  </div>
`;

test.describe('PlayModal component', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login.html');
    await page.evaluate((markup) => {
      document.body.insertAdjacentHTML('beforeend', markup);
    }, PLAY_MODAL_MARKUP);
    await page.evaluate(async () => {
      const mod = await import('/scripts/components/PlayModal.js');
      window.PlayModalClass = mod.PlayModal;
      window.playModal = mod.default;
    });
  });

  test('singleton binds to the page markup and open() fills the waypoint content', async ({ page }) => {
    const ok = await page.evaluate(() => window.playModal instanceof window.PlayModalClass);
    expect(ok).toBe(true);

    await page.evaluate(() => window.playModal.open('Great Hall', 'Solve the cipher.'));
    await expect(page.locator('#play-modal-overlay')).toHaveAttribute('aria-hidden', 'false');
    await expect(page.locator('#play-modal-title')).toHaveText('Great Hall');
    await expect(page.locator('#play-modal-description')).toHaveText('Solve the cipher.');
  });

  test('close button hides the modal', async ({ page }) => {
    await page.evaluate(() => window.playModal.open('Great Hall', 'Solve the cipher.'));
    await page.click('#btn-play-modal-close');
    await expect(page.locator('#play-modal-overlay')).toHaveAttribute('aria-hidden', 'true');
  });

  test('setControls() and clearControls() manage the controls area', async ({ page }) => {
    await page.evaluate(() => {
      window.playModal.open('Great Hall', 'Solve the cipher.');
      window.playModal.setControls('<button id="ctrl-a">Do it</button>');
    });
    await expect(page.locator('#play-modal-controls #ctrl-a')).toHaveCount(1);

    await page.evaluate(() => window.playModal.clearControls());
    await expect(page.locator('#play-modal-controls')).toBeEmpty();
  });

  test('showFeedback() renders a pass toast and removes it after the animation', async ({ page }) => {
    await page.evaluate(() => {
      window.playModal.open('Great Hall', 'Solve the cipher.');
      window.playModal.showFeedback('pass', false);
    });
    const feedback = page.locator('#play-modal-controls .minigame-feedback-container');
    await expect(feedback).toHaveCount(1);
    await expect(feedback).toContainText('Success!');
    await expect(feedback).toHaveCount(0, { timeout: 4000 });
  });

  test('toggleReadMore() expands and collapses the description', async ({ page }) => {
    await page.evaluate(() => {
      window.playModal.open('Great Hall', 'Solve the cipher.');
      window.playModal.toggleReadMore();
    });
    await expect(page.locator('#play-modal-description')).toHaveClass(/is-expanded/);

    await page.evaluate(() => window.playModal.toggleReadMore());
    await expect(page.locator('#play-modal-description')).not.toHaveClass(/is-expanded/);
  });

  test('getCanvas() reveals the canvas wrapper and returns the canvas', async ({ page }) => {
    const result = await page.evaluate(() => {
      window.playModal.open('Great Hall', 'Solve the cipher.');
      const canvas = window.playModal.getCanvas();
      return { id: canvas && canvas.id, display: canvas.parentElement.style.display };
    });
    expect(result.id).toBe('play-canvas');
    expect(result.display).toBe('flex');
  });
});

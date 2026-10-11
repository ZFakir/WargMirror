const { test, expect } = require('../fixtures.js');

test.describe('Minigame handlers registry', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login.html');
    await page.evaluate(async () => {
      const mod = await import('/scripts/components/minigame-handlers.js');
      window.getMinigameHandler = mod.getMinigameHandler;
      window.gameplay = document.createElement('div');
      window.gameplay.id = 'gameplay-container';
      document.body.appendChild(window.gameplay);
    });
  });

  test('gps_proximity submits immediately (geofence already verified)', async ({ page }) => {
    const result = await page.evaluate(() => new Promise((resolve) => {
      const handler = window.getMinigameHandler('gps_proximity');
      if (!handler) {
        resolve({ missing: true });
        return;
      }
      handler.render(window.gameplay, {}, (payload) => resolve({ payload }));
      setTimeout(() => resolve({ missing: 'no submit' }), 1000);
    }));
    expect(result).toEqual({ payload: {} });
  });

  test('text_answer MCQ renders radios and submits the selected index', async ({ page }) => {
    await page.evaluate(() => {
      window._answer = null;
      const handler = window.getMinigameHandler('text_answer');
      handler.render(
        window.gameplay,
        { is_mcq: true, options: ['Alpha', 'Beta', 'Gamma'], question: 'Pick one' },
        (value) => { window._answer = value; },
      );
      document.querySelectorAll('input[name="mcq-option"]')[1].click();
      document.getElementById('btn-submit-answer').click();
    });

    await expect(page.locator('input[name="mcq-option"]')).toHaveCount(3);
    const answer = await page.evaluate(() => window._answer);
    expect(answer).toBe('1');
  });

  test('text_answer free text submits the typed value', async ({ page }) => {
    await page.evaluate(() => {
      window._answer = null;
      const handler = window.getMinigameHandler('text_answer');
      handler.render(window.gameplay, { hint: 'Enter the motto' }, (value) => { window._answer = value; });
    });

    await page.fill('#text-answer-input', 'Wits');
    await page.click('#btn-submit-answer');
    const answer = await page.evaluate(() => window._answer);
    expect(answer).toBe('Wits');
  });

  test('qr_barcode manual entry submits the code', async ({ page }) => {
    await page.evaluate(() => {
      window._answer = null;
      const handler = window.getMinigameHandler('qr_barcode');
      handler.render(window.gameplay, {}, (value) => { window._answer = value; });
    });

    await page.click('#link-manual-entry');
    await expect(page.locator('#manual-entry-container')).toBeVisible();
    await page.fill('#qr-override', 'ABC-123');
    await page.click('#btn-submit-manual');
    const answer = await page.evaluate(() => window._answer);
    expect(answer).toBe('ABC-123');
  });

  test('plaque_scan renders the photo capture UI', async ({ page }) => {
    const ui = await page.evaluate(() => {
      const handler = window.getMinigameHandler('plaque_scan');
      handler.render(window.gameplay, {}, () => {});
      return {
        takePhoto: !!document.getElementById('btn-take-photo'),
        submit: !!document.getElementById('btn-submit-photo'),
      };
    });
    expect(ui.takePhoto).toBe(true);
    expect(ui.submit).toBe(true);
  });

  test('point_domination renders the start UI', async ({ page }) => {
    const text = await page.evaluate(() => {
      const handler = window.getMinigameHandler('point_domination');
      handler.render(window.gameplay, { arg_id: 1, waypoint_id: 2, game_id: 3 });
      return window.gameplay.textContent;
    });
    expect(text).toContain('Point Domination');
    expect(text).toContain('Start Dominating');
  });

  test('unknown game types fall back to a "mark complete" handler', async ({ page }) => {
    const result = await page.evaluate(() => {
      let submitted = null;
      const handler = window.getMinigameHandler('does_not_exist');
      handler.render(window.gameplay, {}, (payload) => { submitted = payload; });
      const message = window.gameplay.textContent;
      document.getElementById('btn-fallback-submit').click();
      return { message, submitted };
    });
    expect(result.message).toContain('does_not_exist');
    expect(result.message).toContain('not fully implemented');
    expect(result.submitted).toEqual({});
  });
});

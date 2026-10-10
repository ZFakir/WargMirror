const { test, expect } = require('../fixtures.js');

test.describe('MapModal component', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login.html');
    await page.evaluate(async () => {
      const mod = await import('/scripts/components/MapModal.js');
      window.MapModalClass = mod.MapModal;
      window.mapModal = mod.default;
    });
  });

  test('exports a singleton instance of the class', async ({ page }) => {
    const ok = await page.evaluate(() => window.mapModal instanceof window.MapModalClass);
    expect(ok).toBe(true);
  });

  test('exposes the campus map configuration', async ({ page }) => {
    const config = await page.evaluate(() => window.MapModalClass.MAP_CONFIG);
    expect(config.center).toEqual([-26.1918, 28.0299]);
    expect(config.minZoom).toBe(14);
    expect(config.maxZoom).toBe(19);
    expect(config.bubbleRadiusMeters).toBe(2000);
  });

  test('campus node data is well-formed', async ({ page }) => {
    const nodes = await page.evaluate(() => window.mapModal.NODES);
    expect(nodes.length).toBeGreaterThan(0);
    for (const node of nodes) {
      expect(typeof node.id).toBe('string');
      expect(typeof node.name).toBe('string');
      expect(typeof node.lat).toBe('number');
      expect(typeof node.lng).toBe('number');
    }
    expect(nodes.some((n) => n.id === 'great-hall')).toBe(true);
  });

  test('can be instantiated standalone (editor mode used by create/edit pages)', async ({ page }) => {
    const info = await page.evaluate(() => {
      const instance = new window.MapModalClass();
      return { initialized: instance.isInitialized, nodeCount: instance.NODES.length };
    });
    expect(info.initialized).toBe(false);
    expect(info.nodeCount).toBeGreaterThan(0);
  });
});

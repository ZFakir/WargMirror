const { test: base, expect } = require('@playwright/test');
const { addCoverageReport } = require('monocart-reporter');

const test = base.extend({
  page: async ({ page, browserName }, use, testInfo) => {
    // Start coverage only on Chromium
    if (browserName === 'chromium') {
      await page.coverage.startJSCoverage({ resetOnNavigation: false });
    }
    
    await use(page);
    
    // Stop coverage only on Chromium
    if (browserName === 'chromium') {
      const coverage = await page.coverage.stopJSCoverage();
      if (coverage.length) {
        await addCoverageReport(coverage, testInfo);
      }
    }
  }
});

module.exports = { test, expect };

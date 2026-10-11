const { test: base, expect } = require('@playwright/test');
const { addCoverageReport } = require('monocart-reporter');

const test = base.extend({
  page: async ({ page, browserName }, use, testInfo) => {
    // Coverage is opt-in so ordinary UI runs remain fast and stable.
    if (process.env.COVERAGE === '1' && browserName === 'chromium') {
      await page.coverage.startJSCoverage({ resetOnNavigation: false });
    }
    
    await use(page);
    
    if (process.env.COVERAGE === '1' && browserName === 'chromium') {
      const coverage = await page.coverage.stopJSCoverage();
      if (coverage.length) {
        await addCoverageReport(coverage, testInfo);
      }
    }
  }
});

module.exports = { test, expect };

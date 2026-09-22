const { test: base, expect } = require('@playwright/test');
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

const test = base.extend({
  page: async ({ page, browserName }, use) => {
    // Start coverage
    if (browserName === 'chromium') {
      await page.coverage.startJSCoverage({ resetOnNavigation: false });
    }
    
    await use(page);
    
    // Stop coverage
    if (browserName === 'chromium') {
      const coverage = await page.coverage.stopJSCoverage();
      
      const v8dir = path.join(process.cwd(), '.v8-coverage');
      if (!fs.existsSync(v8dir)) {
        fs.mkdirSync(v8dir, { recursive: true });
      }
      
      fs.writeFileSync(
        path.join(v8dir, `coverage-${crypto.randomUUID()}.json`),
        JSON.stringify({ result: coverage })
      );
    }
  }
});

module.exports = { test, expect };

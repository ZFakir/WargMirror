const { test, expect } = require('./fixtures.js');

test.describe('Shared API client (api.js)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login.html');
    // Point the client at the test origin, then load it.
    await page.addScriptTag({ content: 'window.API_BASE_URL = window.location.origin;' });
    await page.addScriptTag({ url: '/scripts/api.js' });
    await page.waitForFunction(() => typeof window.api === 'object');
  });

  test('flagArg sends only reason/description — the server attributes the reporter', async ({ page }) => {
    let captured = null;
    await page.route('**/api/args/7/flag', async (route) => {
      captured = route.request().postDataJSON();
      await route.fulfill({ status: 201, contentType: 'application/json', body: '{"flag_id":1}' });
    });

    const result = await page.evaluate(() => window.api.flagArg('7', 'spam', 'Details here'));

    expect(result).toEqual({ flag_id: 1 });
    expect(captured).toEqual({ reason: 'spam', description: 'Details here' });
    expect(captured.reporter_id).toBeUndefined();
  });

  test('logout issues a POST request', async ({ page }) => {
    let method = null;
    await page.route('**/auth/logout', async (route) => {
      method = route.request().method();
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"message":"Logged out successfully"}' });
    });

    await page.evaluate(() => window.api.logout());

    expect(method).toBe('POST');
  });

  test('updateAccount surfaces the server error message', async ({ page }) => {
    let captured = null;
    await page.route('**/auth/account', async (route) => {
      captured = route.request().postDataJSON();
      await route.fulfill({ status: 401, contentType: 'application/json', body: '{"error":"Current password is incorrect."}' });
    });

    const error = await page.evaluate(async () => {
      try {
        await window.api.updateAccount({ password: 'newpass', current_password: 'wrong' });
        return null;
      } catch (e) {
        return e.message;
      }
    });

    expect(captured).toEqual({ password: 'newpass', current_password: 'wrong' });
    expect(error).toBe('Current password is incorrect.');
  });

  test('forgotPassword posts the email and surfaces the server error', async ({ page }) => {
    let captured = null;
    await page.route('**/auth/forgot', async (route) => {
      captured = route.request().postDataJSON();
      await route.fulfill({ status: 400, contentType: 'application/json', body: '{"error":"Email is required."}' });
    });

    const error = await page.evaluate(async () => {
      try {
        await window.api.forgotPassword('');
        return null;
      } catch (e) {
        return e.message;
      }
    });

    expect(captured).toEqual({ email: '' });
    expect(error).toBe('Email is required.');
  });

  test('resetPassword posts the token and new password', async ({ page }) => {
    let captured = null;
    await page.route('**/auth/reset', async (route) => {
      captured = route.request().postDataJSON();
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"message":"Password reset successful. You can now log in."}' });
    });

    const result = await page.evaluate(() => window.api.resetPassword('tok123', 'newpassword'));

    expect(captured).toEqual({ token: 'tok123', password: 'newpassword' });
    expect(result.message).toMatch(/reset successful/i);
  });

  test('removeRecentArg resolves the session user before deleting', async ({ page }) => {
    const calls = [];
    await page.route('**/auth/me', async (route) => {
      calls.push('GET /auth/me');
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"user_id":42,"username":"tester"}' });
    });
    await page.route('**/api/sessions/**', async (route) => {
      calls.push(route.request().method() + ' ' + new URL(route.request().url()).pathname);
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"message":"Session removed from recent"}' });
    });

    await page.evaluate(() => window.api.removeRecentArg('9'));

    expect(calls).toEqual(['GET /auth/me', 'DELETE /api/sessions/42/arg/9']);
  });
});

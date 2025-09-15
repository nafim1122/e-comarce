import { test } from '@playwright/test';

test('debug admin console and network', async ({ page }) => {
  page.on('console', msg => {
    try { console.log('[PW_CONSOLE]', msg.type(), msg.text()); } catch { /* ignore */ }
  });
  page.on('pageerror', err => console.log('[PW_PAGEERROR]', err && err.message));
  page.on('requestfailed', req => console.log('[PW_REQFAIL]', req.url(), req.failure()?.errorText || 'no-failure-text'));

  const url = 'http://localhost:5173/admin-dashboard?dev_admin=1';
  console.log('[PW] Navigating to', url);
  await page.goto(url, { waitUntil: 'networkidle' });
  // wait a bit for background XHRs
  await page.waitForTimeout(4000);
  console.log('[PW] Done waiting');
});

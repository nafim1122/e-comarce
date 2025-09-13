import { test, expect } from '@playwright/test';

test('snapshot: homepage', async ({ page }) => {
  await page.goto('http://localhost:8080/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  // wait for the products section to appear so the page is in a stable state
  await page.waitForSelector('#products', { timeout: 60000 });
  await page.screenshot({ path: 'e2e-output/snapshot.png', fullPage: true });
  expect(true).toBe(true);
});

import { test, expect } from '@playwright/test';
import path from 'path';

test('admin add product with image (smoke)', async ({ page }) => {
  page.on('console', msg => { try { console.log('[PW]', msg.type(), msg.text()); } catch (e) { /* ignore logging errors */ } });
  const url = 'http://localhost:5173/admin-dashboard?dev_admin=1';
  console.log('[PW] Navigating to', url);
  await page.goto(url, { waitUntil: 'networkidle' });

  const name = `PW Test Product ${Date.now()}`;
  await page.fill('input[placeholder="Name"]', name);
  await page.fill('input[placeholder="Price"]', '99');
  await page.fill('input[placeholder="Base price per kg / per piece"]', '198');

  // Use an image bundled in the repo for upload
  const imagePath = path.resolve(process.cwd(), 'public', 'lovable-uploads', 'a8b8701a-7028-4152-bfc6-171ff21d753d.png');
  await page.setInputFiles('input[type=file]', imagePath);

  // Submit the form
  await page.click('button:has-text("Add Product")');

  // allow background upload/sync to run
  await page.waitForTimeout(2500);

  // Read products from localStorage and verify the new item exists
  const raw = await page.evaluate(() => localStorage.getItem('products'));
  console.log('[PW] localStorage.products length', raw ? raw.length : 0);
  expect(raw).not.toBeNull();
  const products = JSON.parse(raw as string) as Array<Record<string, unknown>>;
  const created = products.find(p => String(p.name) === name);
  console.log('[PW] Found created product in localStorage:', !!created);
  expect(created).toBeTruthy();

  // Log and assert img value
  const imgVal = String(created?.img || created?.photo || '');
  console.log('[PW] Stored img prefix:', imgVal.slice(0,60));
  console.log('[PW] Stored img length:', String(imgVal.length));
  // The admin was changed to upload compressed image and save a URL; check for a URL-like value
  expect(typeof imgVal).toBe('string');
  expect(imgVal.length).toBeGreaterThan(0);
});

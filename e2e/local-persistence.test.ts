import { test, expect } from '@playwright/test';

const BASE = process.env.E2E_BASE || 'http://localhost:8080';

test('localStorage add persists and no demo items reappear on reload', async ({ page, context }) => {
  const main = page;
  await main.goto(BASE);

  const admin = await context.newPage();
  await admin.goto(`${BASE}/admin-dashboard`);

  const testName = `E2E_LOCAL_${Date.now()}`;

  // Add product directly to localStorage from admin page context
  const createdId = await admin.evaluate((name) => {
    const id = `local-e2e-${Date.now()}`;
    const product = {
      id,
      name,
      price: 999,
      oldPrice: 0,
      img: '',
      description: '',
      category: 'e2e',
      inStock: true,
      basePricePerKg: 0,
      unit: 'kg'
    };
    try {
      const raw = localStorage.getItem('products');
      const list = raw ? JSON.parse(raw) : [];
      const next = [product, ...list];
      localStorage.setItem('products', JSON.stringify(next));
      window.dispatchEvent(new Event('products-local-update'));
      return id;
    } catch (e) {
      return null;
    }
  }, testName);

  // wait for main page to pick up
  await main.waitForTimeout(800);
  const found = await main.locator(`text=${testName}`).first().count();
  expect(found).toBeGreaterThan(0);

  // Reload the main page to ensure persistence and that no demo items reappear
  await main.reload();
  await main.waitForTimeout(600);

  const stillFound = await main.locator(`text=${testName}`).count();
  expect(stillFound).toBeGreaterThan(0);

  // Assert there are no demo items by checking for a known demo product title that used to be bundled
  const demoHit = await main.locator('text=Qurbani Combo-1').count();
  expect(demoHit).toBe(0);
});

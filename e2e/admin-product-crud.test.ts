import { test, expect } from '@playwright/test';

const BASE = process.env.E2E_BASE || 'http://localhost:8080';

// Simulate admin add/edit/delete by writing to localStorage and dispatching products-local-update events.
test('admin add/edit/delete product updates main page and localStorage', async ({ context }) => {
  const page = await context.newPage();
  await page.goto(BASE);
  await page.waitForTimeout(400);

  const id = `local-e2e-${Date.now()}`;
  const name = `E2E_ADMIN_${Date.now()}`;
  const price = 123;

  const product = { id, name, price, basePricePerKg: price, unit: 'kg', img: '', inStock: true } as Record<string, unknown>;

  // ADMIN: add product -> write to localStorage and dispatch update
  await page.evaluate((p) => {
    const raw = localStorage.getItem('products');
    const list = raw ? JSON.parse(raw) : [];
    localStorage.setItem('products', JSON.stringify([p, ...list]));
    window.dispatchEvent(new Event('products-local-update'));
  }, product);

  // MAIN: reload to ensure app picks up change and show product
  await page.reload();
  await page.waitForTimeout(400);
  const found = page.locator(`text=${name}`).first();
  expect(await found.count()).toBeGreaterThan(0);

  // Verify localStorage contains the product
  const storedStr = await page.evaluate(() => localStorage.getItem('products'));
  expect(storedStr).toBeTruthy();
  const stored = JSON.parse(storedStr as string) as unknown[];
  expect(stored.find(p => (p as Record<string, unknown>).id === id)).toBeTruthy();

  // ADMIN: edit product -> change name and price
  const newName = `${name}_EDITED`;
  const newPrice = 321;
  await page.evaluate((payload: { prodId: string; n: string; p: number }) => {
    const { prodId, n, p } = payload;
    try {
      const raw = localStorage.getItem('products');
      const list = raw ? JSON.parse(raw) : [];
      const next = (list as unknown[]).map(it => {
        const itObj = it as Record<string, unknown>;
        if (String(itObj.id) === String(prodId)) {
          return { ...itObj, name: n, price: p, basePricePerKg: p } as Record<string, unknown>;
        }
        return itObj;
      });
      localStorage.setItem('products', JSON.stringify(next));
      window.dispatchEvent(new Event('products-local-update'));
    } catch (e) { /* ignore */ }
  }, { prodId: id, n: newName, p: newPrice });

  // MAIN: reload and verify edited name appears
  await page.reload();
  await page.waitForTimeout(400);
  const edited = page.locator(`text=${newName}`).first();
  expect(await edited.count()).toBeGreaterThan(0);

  // ADMIN: delete product -> remove from localStorage and dispatch update
  await page.evaluate((payload: { prodId: string }) => {
    const { prodId } = payload;
    try {
      const raw = localStorage.getItem('products');
      const list = raw ? JSON.parse(raw) : [];
      const next = (list as unknown[]).filter(it => {
        const itObj = it as Record<string, unknown>;
        return String(itObj.id) !== String(prodId);
      });
      localStorage.setItem('products', JSON.stringify(next));
      window.dispatchEvent(new Event('products-local-update'));
    } catch (e) { /* ignore */ }
  }, { prodId: id });

  // MAIN: reload and verify product no longer present
  await page.reload();
  await page.waitForTimeout(400);
  const gone = page.locator(`text=${newName}`).first();
  expect(await gone.count()).toBe(0);

});

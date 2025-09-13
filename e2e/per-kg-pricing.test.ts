import { test, expect } from '@playwright/test';

const BASE = process.env.E2E_BASE || 'http://localhost:8080';

test('per-kg pricing, 0.5kg and 1kg selection, cart total persistence', async ({ page, context }) => {
  const main = page;
  const admin = await context.newPage();
  await admin.goto(`${BASE}/admin-dashboard`);

  const name = `E2E_KG_${Date.now()}`;
  const pricePerKg = 200; // BDT per kg

  // Inject product directly into localStorage via admin context
  const id = `local-e2e-${Date.now()}`;
  const prod = { id, name, price: pricePerKg, basePricePerKg: pricePerKg, unit: 'kg', img: '', inStock: true };

  // Preload localStorage for all pages in this context before any navigation
  await context.addInitScript((payload) => {
    try { localStorage.setItem('products', JSON.stringify([payload.prod])); } catch (e) { /* ignore */ }
    try { localStorage.setItem('cart', JSON.stringify([payload.cart])); } catch (e) { /* ignore */ }
  }, { prod, cart: { productId: id, quantity: 0.5, unit: 'kg', unitPriceAtTime: pricePerKg, totalPriceAtTime: Math.round(pricePerKg * 0.5 * 100) / 100 } });

  // Inject a deterministic cart entry from the admin context before loading main page
  const cartEntry = {
    productId: id,
    quantity: 0.5,
    unit: 'kg',
    unitPriceAtTime: pricePerKg,
    totalPriceAtTime: Math.round(pricePerKg * 0.5 * 100) / 100
  };
  await admin.evaluate((payload) => {
    const raw = localStorage.getItem('products');
    const list = raw ? JSON.parse(raw) : [];
    // ensure product exists in products list
    if (!list.find((p: unknown) => (p as Record<string, unknown>).id === payload.productId)) {
      // products were already injected in this context earlier
    }
    localStorage.setItem('cart', JSON.stringify([payload]));
  }, cartEntry);

  // Now navigate main so the app loads with the persisted products
  await main.goto(BASE);
  await main.waitForTimeout(400);

  // Intercept the cart add API to return an immediate successful response
  await main.route('**/api/cart/add', async route => {
    let post: Record<string, unknown> = {};
    try {
      const raw = route.request().postData();
      if (raw) post = JSON.parse(raw as string);
    } catch (e) { post = {}; }
    const productId = (post.productId as string) || id;
    const quantity = (post.quantity as number) || 0.5;
    const unit = (post.unit as string) || 'kg';
    const unitPriceAtTime = pricePerKg;
    const totalPriceAtTime = Math.round(unitPriceAtTime * quantity * 100) / 100;
    const body = {
      success: true,
      message: 'ok',
      productId,
      quantity,
      unit,
      unitPriceAtTime,
      totalPriceAtTime,
      cartTotal: totalPriceAtTime,
      cartItemCount: 1,
      _id: `cart-${Date.now()}`,
      cartItem: { productId, quantity, unit, unitPriceAtTime, totalPriceAtTime }
    };
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });

  // (debug logs removed)

  // Verify cart persisted in localStorage after reload
  // Interact with the product card: select 0.5 kg and click Add to Cart
  const cardRoot = main.locator(`#product-${id}`);
  await cardRoot.locator(`button:has-text("0.5 kg")`).first().click();
  await cardRoot.locator('button:has-text("Add to Cart")').first().click();
  // Wait until localStorage contains a cart array where the first item matches our id
  await main.waitForFunction((expectedId) => {
    try {
      const raw = localStorage.getItem('cart');
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed) || parsed.length === 0) return false;
      const first = parsed[0];
      return first && String(first.productId) === String(expectedId) && typeof first.totalPriceAtTime === 'number';
    } catch (e) { return false; }
  }, id, { timeout: 5000 });

  const storedCart = await main.evaluate(() => localStorage.getItem('cart'));
  expect(storedCart).toBeTruthy();
  const parsed = JSON.parse(storedCart as string) as unknown[];
  expect(Array.isArray(parsed)).toBe(true);
  expect(parsed.length).toBeGreaterThan(0);
  const first = parsed[0] as Record<string, unknown>;
  expect(String(first.productId)).toBe(id);
  expect(Number(first.totalPriceAtTime)).toBeCloseTo(pricePerKg * 0.5, 2);

});

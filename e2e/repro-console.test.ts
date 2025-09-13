import { test, expect } from '@playwright/test';

// This test reproduces the admin add/delete flow and captures console messages
// and localStorage for debugging. It runs against the running dev server.

test('repro: capture console + localStorage during admin add/delete', async ({ page }) => {
  const messages: string[] = [];
  page.on('console', msg => {
    try { messages.push(`${msg.type()}: ${msg.text()}`); } catch { messages.push(String(msg)); }
  });
  page.on('pageerror', err => messages.push(`pageerror: ${err.message}`));

  await page.goto('http://localhost:8080/');
  await page.waitForTimeout(500);

  // Try to open admin panel via keyboard shortcut (Alt+Shift+A) which Index listens for
  await page.keyboard.down('Alt');
  await page.keyboard.down('Shift');
  await page.keyboard.press('A');
  await page.keyboard.up('Shift');
  await page.keyboard.up('Alt');

  // If admin panel didn't open, try clicking an element that opens it (fallback)
  // Many dev setups put an admin button; attempt to click by title
  try {
    const adminBtn = await page.locator('button[title="Open admin panel"]').first();
    if (await adminBtn.count() > 0) await adminBtn.click();
  } catch (e) { /* ignore */ }

  // Wait a bit for panel
  await page.waitForTimeout(1000);

  // Capture localStorage before actions
  const before = await page.evaluate(() => ({
    products: (() => { try { return JSON.parse(localStorage.getItem('products')||'null'); } catch(e) { return 'parse-error'; } })(),
    tombstones: (() => { try { return JSON.parse(localStorage.getItem('products:deleted:tombstone')||'null'); } catch(e) { return 'parse-error'; } })()
  }));

  // Attempt to add a minimal product via admin UI if present
  try {
    const nameInput = page.locator('input[placeholder="Product name"]').first();
    if (await nameInput.count() > 0) {
      await nameInput.fill('Playwright repro product ' + Date.now());
      const priceInput = page.locator('input[type="number"]').first();
      if (await priceInput.count() > 0) await priceInput.fill('9.99');
      const saveBtn = page.locator('button:has-text("Save"), button:has-text("Add Product"), button:has-text("Create")').first();
      if (await saveBtn.count() > 0) await saveBtn.click();
      await page.waitForTimeout(1200);
    }
  } catch (e) { messages.push('add-failed: ' + String(e)); }

  // Attempt to delete a local tmp- product from localStorage (cleanup)
  const localSnapshot = await page.evaluate(() => {
    try {
      const raw = localStorage.getItem('products');
      const arr = raw ? JSON.parse(raw) : null;
      return arr;
    } catch (e) { return 'parse-error'; }
  });

  // Try to delete first tmp- or local- product via AdminPanel delete button
  try {
    const deleteBtn = page.locator('button[title="Delete product"]').first();
    if (await deleteBtn.count() > 0) {
      await deleteBtn.click();
      // confirm dialog
      await page.waitForTimeout(200);
      await page.on('dialog', async dialog => { await dialog.accept(); });
      await page.waitForTimeout(800);
    }
  } catch (e) { messages.push('delete-failed: ' + String(e)); }

  // Capture after state
  const after = await page.evaluate(() => ({
    products: (() => { try { return JSON.parse(localStorage.getItem('products')||'null'); } catch(e) { return 'parse-error'; } })(),
    tombstones: (() => { try { return JSON.parse(localStorage.getItem('products:deleted:tombstone')||'null'); } catch(e) { return 'parse-error'; } })()
  }));

  // Print debugging info to the test output
  console.log('\n--- PLAYWRIGHT CONSOLE MESSAGES ---');
  for (const m of messages) console.log(m);
  console.log('--- BEFORE localStorage ---');
  console.log(JSON.stringify(before, null, 2));
  console.log('--- AFTER localStorage ---');
  console.log(JSON.stringify(after, null, 2));

  // Always pass, this is a diagnostic test
  expect(true).toBe(true);
});

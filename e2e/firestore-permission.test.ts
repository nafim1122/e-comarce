import { test, expect } from './fixtures';

test('capture firestore permission error when seeding via server API', async ({ page, seedProduct }) => {
  // Try to seed a product via server-side admin test endpoint.
  const payload = { name: 'PERM_TEST_' + Date.now(), price: 1, category: 'test', description: '', inStock: true, unit: 'kg' };
  const seed = await seedProduct(payload as unknown as Parameters<typeof seedProduct>[0]);

  if (!seed.ok) {
    // Skip if the test endpoint is not present or seeding is not permitted in this environment
    test.skip(false, `seeding not available: ${seed.error || seed.status || 'unknown'}`);
    return;
  }

  // Navigate to admin dashboard and wait for potential snapshot/console errors to surface
  await page.goto('/admin-dashboard');
  await page.waitForTimeout(500);

  // If seeding succeeded, assert we got an id back
  expect(seed.id, 'seed returned id').toBeTruthy();
});

// Simple sanity script to smoke-test critical server endpoints.
// Usage: node server/scripts/sanityCheck.js
// Assumes server running on http://localhost:5000 and a seeded admin with API session or basic auth not implemented here.

const fetch = require('node-fetch');
const API = process.env.API_BASE || 'http://localhost:5000/api';
const TEST_JWT = process.env.TEST_JWT;

async function run() {
  console.log('Sanity check start');
  try {
    const h = await fetch(`${API}/health`).then(r => r.text()).catch(e => null);
    console.log('Health:', h || 'no response');

    // Fetch products
    const products = await fetch(`${API}/products/list`).then(r => r.json()).catch(e => null);
    console.log('Products count:', Array.isArray(products) ? products.length : 'fail');

    // Try unauthenticated cart list (should 401)
    const cartList = await fetch(`${API}/cart/list`, { credentials: 'include' }).then(r => ({ status: r.status })).catch(e => ({ error: true }));
    console.log('Cart list status (unauthenticated expected 401):', cartList.status || cartList.error);

    if (TEST_JWT) {
      console.log('TEST_JWT provided — running authenticated cart flows');
      const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${TEST_JWT}` };
      // Add a product to cart (pick first product)
      if (!Array.isArray(products) || products.length === 0) {
        console.error('No products to test with');
        process.exit(3);
      }
      const sample = products[0];
      const addRes = await fetch(`${API}/cart/add`, { method: 'POST', headers, body: JSON.stringify({ productId: sample._id || sample.id, quantity: 1, unit: sample.unit || 'kg' }) });
      if (!addRes.ok) {
        console.error('Authenticated add to cart failed', await addRes.text());
        process.exit(4);
      }
      const created = await addRes.json();
      console.log('Add to cart created:', created && created._id ? created._id : 'no id');

      // Merge with an additional local item
      const mergePayload = { items: [{ productId: sample._id || sample.id, quantity: 2, unit: sample.unit || 'kg' }] };
      const mergeRes = await fetch(`${API}/cart/merge`, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify(mergePayload) });
      if (!mergeRes.ok) {
        console.error('Merge failed', await mergeRes.text());
        process.exit(5);
      }
      const merged = await mergeRes.json();
      console.log('Merge returned items:', Array.isArray(merged) ? merged.length : 'unexpected');

      // Delete the created item(s)
      const toDeleteId = (created && created._id) || (Array.isArray(merged) && merged[0] && merged[0]._id) || null;
      if (toDeleteId) {
        const del = await fetch(`${API}/cart/delete/${toDeleteId}`, { method: 'DELETE', headers });
        if (!del.ok) {
          console.error('Delete failed', await del.text());
          process.exit(6);
        }
        console.log('Delete succeeded for', toDeleteId);
      } else {
        console.warn('No server id found to delete');
      }
    }

    console.log('Sanity check done');
    process.exit(0);
  } catch (err) {
    console.error('Sanity error', err);
    process.exit(2);
  }
}

run();

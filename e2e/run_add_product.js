const path = require('path');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  page.on('console', m => console.log('[PAGE]', m.type(), m.text()));

  const url = 'http://localhost:5173/admin-dashboard?dev_admin=1';
  console.log('Navigating to', url);
  await page.goto(url, { waitUntil: 'networkidle' });

  const name = `NodeScript Test Product ${Date.now()}`;
  await page.fill('input[placeholder="Name"]', name);
  await page.fill('input[placeholder="Price"]', '55');
  await page.fill('input[placeholder="Base price per kg / per piece"]', '110');

  const imagePath = path.resolve(__dirname, '..', 'public', 'lovable-uploads', 'a8b8701a-7028-4152-bfc6-171ff21d753d.png');
  console.log('Using image:', imagePath);
  const input = await page.$('input[type=file]');
  if (!input) {
    console.error('File input not found');
    await browser.close();
    process.exit(2);
  }
  await input.setInputFiles(imagePath);
  // submit
  await page.click('button:has-text("Add Product")');
  await page.waitForTimeout(2500);

  const raw = await page.evaluate(() => localStorage.getItem('products'));
  console.log('localStorage.products length:', raw ? raw.length : 0);
  const products = JSON.parse(raw || '[]');
  const created = products.find(p => p.name === name);
  console.log('Created found:', !!created);
  const imgVal = String((created && (created.img || created.photo)) || '');
  console.log('Stored img prefix:', imgVal.slice(0, 80));
  console.log('Stored img length:', imgVal.length);

  await browser.close();
  if (!created) process.exit(3);
  process.exit(0);
})();

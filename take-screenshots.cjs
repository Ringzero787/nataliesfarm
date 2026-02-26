const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);

  // Play button center at game coords (640, ~596)
  await page.mouse.click(640, 596);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'screenshot-barn-icons.png' });

  console.log('Screenshot saved');
  await browser.close();
})();

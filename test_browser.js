import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  page.on('console', msg => {
    console.log(`[Browser Console] ${msg.type().toUpperCase()}: ${msg.text()}`);
  });

  page.on('pageerror', err => {
    console.log(`[Browser Error]: ${err.message}`);
  });

  console.log("Navigating to local dev server...");
  try {
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    console.log("Page loaded. Waiting a moment...");
    await page.waitForTimeout(2000);

    console.log("Clicking blueprint tab...");
    await page.click('button:has-text("blueprint")');
    await page.waitForTimeout(3000);

    console.log("Done checking.");
  } catch (e) {
    console.error("Script error:", e);
  } finally {
    await browser.close();
  }
})();
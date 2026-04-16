import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const br = await chromium.launch();
const ctx = await br.newContext({ viewport: { width: 375, height: 812 } });
const p = await ctx.newPage();
await p.goto('http://127.0.0.1:4175/valtoris-international/', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(4000);
await p.evaluate(() => window.scrollTo(0, 712));
await p.waitForTimeout(400);
mkdirSync('/tmp', { recursive: true });
// Get pixel data via canvas
const px = await p.evaluate(() => {
  return new Promise((resolve) => {
    // Build a small canvas, draw the document into a snapshot via html2canvas approximation
    // Easier: just read from a temp screenshot via fetch
    resolve(null);
  });
});
// Take snapshot then convert to base64 to inspect
const buf = await p.screenshot({ fullPage: false, clip: { x: 100, y: 50, width: 50, height: 50 } });
// Parse as base64 PNG
import('node:fs').then(fs => fs.writeFileSync('/tmp/gray-sample.png', buf));
console.log('saved /tmp/gray-sample.png — sample 50x50 from x=100 y=50');
await br.close();

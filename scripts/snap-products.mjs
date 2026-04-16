import { chromium } from 'playwright';
const br = await chromium.launch();
const ctx = await br.newContext({ viewport: { width: 375, height: 812 } });
const p = await ctx.newPage();
await p.goto('http://127.0.0.1:4175/valtoris-international/', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(5000);
const tile = await p.evaluate(() => {
  const t = document.querySelector('.my-icon-sec');
  const img = t.querySelector('img');
  const r = t.getBoundingClientRect();
  const ir = img?.getBoundingClientRect();
  return { tileY: r.y, tileH: r.height, tileW: r.width, imgW: ir?.width, imgH: ir?.height };
});
console.log(JSON.stringify(tile, null, 2));
await p.evaluate((y) => window.scrollTo(0, y - 50), tile.tileY);
await p.waitForTimeout(500);
await p.screenshot({ path: '/tmp/snap-products.png', fullPage: false, clip: { x: 0, y: 0, width: 375, height: 600 } });
await br.close();
console.log('saved');

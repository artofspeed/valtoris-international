import { chromium } from 'playwright';
const br = await chromium.launch();
const ctx = await br.newContext({ viewport: { width: 375, height: 1500 } });
const p = await ctx.newPage();
await p.goto('http://127.0.0.1:4175/valtoris-international/', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(4000);
const info = await p.evaluate(() => {
  const v = document.querySelector('.hero-slider-one__video');
  const r = v.getBoundingClientRect();
  const cs = getComputedStyle(v);
  return { y: r.y, h: r.height, b: r.bottom, w: r.width,
    pos: cs.position, w_css: cs.width, h_css: cs.height,
    objectFit: cs.objectFit, t: cs.top, l: cs.left, r2: cs.right, b2: cs.bottom };
});
console.log(JSON.stringify(info, null, 2));
await br.close();

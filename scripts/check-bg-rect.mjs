import { chromium } from 'playwright';
const br = await chromium.launch();
const ctx = await br.newContext({ viewport: { width: 375, height: 1500 } });
const p = await ctx.newPage();
await p.goto('http://127.0.0.1:4175/valtoris-international/', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(4000);
const info = await p.evaluate(() => {
  // get every .hero-slider-one__bg
  const list = Array.from(document.querySelectorAll('.hero-slider-one__bg'));
  return list.map((el, i) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      i,
      y: r.y, b: r.bottom, h: r.height, w: r.width,
      pos: cs.position,
      offsetParent: el.offsetParent ? el.offsetParent.className.slice(0, 50) : null,
      style: el.getAttribute('style')?.slice(0, 200),
    };
  });
});
console.log(JSON.stringify(info, null, 2));
await br.close();

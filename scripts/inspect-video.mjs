import { chromium } from 'playwright';
const br = await chromium.launch();
const ctx = await br.newContext({ viewport: { width: 375, height: 812 } });
const p = await ctx.newPage();
await p.goto('http://127.0.0.1:4175/valtoris-international/', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(4000);
const info = await p.evaluate(() => {
  const v = document.querySelector('.hero-slider-one__video');
  if (!v) return 'no video';
  const r = v.getBoundingClientRect();
  const cs = getComputedStyle(v);
  return {
    pos: cs.position,
    bg: cs.backgroundColor,
    poster: v.getAttribute('poster'),
    src: v.querySelector('source')?.getAttribute('src'),
    w: r.width, h: r.height, x: r.x, y: r.y,
    readyState: v.readyState,
    paused: v.paused,
    networkState: v.networkState,
  };
});
console.log(JSON.stringify(info, null, 2));
await br.close();

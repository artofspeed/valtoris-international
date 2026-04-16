import { chromium } from 'playwright';
const br = await chromium.launch();
const ctx = await br.newContext({ viewport: { width: 375, height: 812 } });
const p = await ctx.newPage();
await p.goto('http://127.0.0.1:4175/valtoris-international/', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(4000);
const info = await p.evaluate(() => {
  const item = document.querySelector('.hero-slider-one__item');
  const bg = document.querySelector('.hero-slider-one__bg');
  const itemCs = getComputedStyle(item);
  const bgCs = getComputedStyle(bg);
  const itemR = item.getBoundingClientRect();
  const bgR = bg.getBoundingClientRect();
  // Find offset parent
  let p = bg.offsetParent;
  return {
    itemRect: { y: itemR.y, h: itemR.height },
    itemPos: itemCs.position,
    bgRect: { y: bgR.y, h: bgR.height },
    bgPos: bgCs.position,
    bgInset: { t: bgCs.top, l: bgCs.left, r: bgCs.right, b: bgCs.bottom },
    bgOffsetParent: p ? { tag: p.tagName, cls: typeof p.className === 'string' ? p.className : '' } : null,
  };
});
console.log(JSON.stringify(info, null, 2));
await br.close();

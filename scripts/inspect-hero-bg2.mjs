import { chromium } from 'playwright';
const br = await chromium.launch();
const ctx = await br.newContext({ viewport: { width: 375, height: 812 } });
const p = await ctx.newPage();
await p.goto('http://127.0.0.1:4175/valtoris-international/', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(4000);
const info = await p.evaluate(() => {
  const item = document.querySelector('.hero-slider-one__item.active') || document.querySelector('.hero-slider-one__item');
  // dump children
  const dump = (el, depth=0) => {
    if (!el || depth > 4) return null;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      tag: el.tagName,
      cls: typeof el.className === 'string' ? el.className.slice(0, 80) : '',
      h: Math.round(r.height),
      bgi: cs.backgroundImage?.slice(0, 100),
      hasImg: el.querySelector('img') ? el.querySelector('img').src.slice(-60) : null,
      style: el.getAttribute('style')?.slice(0, 120),
      kids: Array.from(el.children).slice(0, 5).map((c) => dump(c, depth+1)),
    };
  };
  return dump(item);
});
console.log(JSON.stringify(info, null, 2));
await br.close();

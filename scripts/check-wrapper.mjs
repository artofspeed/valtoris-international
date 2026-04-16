import { chromium } from 'playwright';
const br = await chromium.launch();
const ctx = await br.newContext({ viewport: { width: 375, height: 1500 } });
const p = await ctx.newPage();
await p.goto('http://127.0.0.1:4175/valtoris-international/', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(4000);
const info = await p.evaluate(() => {
  const w = document.querySelector('.mobile-nav__wrapper');
  if (!w) return 'no wrapper';
  const dump = (el, depth=0) => {
    if (!el || depth > 6) return null;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      tag: el.tagName,
      cls: typeof el.className === 'string' ? el.className.slice(0, 80) : '',
      bg: cs.backgroundColor,
      bgi: cs.backgroundImage?.slice(0, 40),
      vis: cs.visibility,
      disp: cs.display,
      op: cs.opacity,
      y: Math.round(r.y), h: Math.round(r.height), w: Math.round(r.width),
      kids: Array.from(el.children).slice(0, 5).map(c => dump(c, depth+1)),
    };
  };
  return dump(w);
});
console.log(JSON.stringify(info, null, 2));
await br.close();

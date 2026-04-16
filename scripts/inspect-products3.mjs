import { chromium } from 'playwright';
const br = await chromium.launch();
const ctx = await br.newContext({ viewport: { width: 375, height: 812 } });
const p = await ctx.newPage();
await p.goto('http://127.0.0.1:4175/valtoris-international/', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(4000);

const info = await p.evaluate(() => {
  const t = document.querySelector('.my-icon-sec');
  // dump full inner HTML structure
  const tree = (el, depth=0) => {
    if (!el || depth > 6) return null;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      tag: el.tagName,
      cls: typeof el.className === 'string' ? el.className.slice(0, 80) : '',
      width: Math.round(r.width),
      height: Math.round(r.height),
      bg: cs.backgroundImage?.slice(0, 50),
      hasImg: el.tagName === 'IMG',
      children: Array.from(el.children).slice(0, 4).map((c) => tree(c, depth + 1)),
    };
  };
  return tree(t);
});
console.log(JSON.stringify(info, null, 2));
await br.close();

import { chromium } from 'playwright';
const br = await chromium.launch();
const ctx = await br.newContext({ viewport: { width: 375, height: 1500 } });
const p = await ctx.newPage();
await p.goto('http://127.0.0.1:4175/valtoris-international/', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(4000);
const info = await p.evaluate(() => {
  const el = document.querySelector('.elementor-element-fda9124');
  if (!el) return 'not found';
  const r = el.getBoundingClientRect();
  const cs = getComputedStyle(el);
  // Check children
  const children = Array.from(el.children).map(c => {
    const cr = c.getBoundingClientRect();
    const ccs = getComputedStyle(c);
    return {
      tag: c.tagName,
      cls: (typeof c.className === 'string' ? c.className : '').slice(0, 80),
      y: Math.round(cr.y), h: Math.round(cr.height), w: Math.round(cr.width),
      bg: ccs.backgroundColor,
      bgi: ccs.backgroundImage?.slice(0, 80),
    };
  });
  return {
    self: { y: Math.round(r.y), h: Math.round(r.height), w: Math.round(r.width), bg: cs.backgroundColor, bgi: cs.backgroundImage?.slice(0, 80) },
    children,
  };
});
console.log(JSON.stringify(info, null, 2));
await br.close();

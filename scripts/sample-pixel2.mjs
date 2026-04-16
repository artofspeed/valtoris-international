import { chromium } from 'playwright';
const br = await chromium.launch();
const ctx = await br.newContext({ viewport: { width: 375, height: 1500 } });
const p = await ctx.newPage();
await p.goto('http://127.0.0.1:4175/valtoris-international/', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(4000);

// Use canvas to read pixel at specific positions
const px = await p.evaluate(async () => {
  // Use html2canvas-like trick: just check what's rendered at (187, 750) using elementFromPoint and document overlay
  // Instead, draw a 1px sample via fetch from screenshot won't work in browser. 
  // Use a CSS hack: place a transparent div at position and sample via getComputedStyle? No.
  // Let's just inspect ALL elements that intersect doc y=750
  const out = [];
  const all = Array.from(document.querySelectorAll('body *'));
  for (const el of all) {
    const r = el.getBoundingClientRect();
    const top = r.y;
    const bot = r.y + r.height;
    if (top <= 750 && bot >= 750) {
      const cs = getComputedStyle(el);
      out.push({
        tag: el.tagName,
        cls: (typeof el.className === 'string' ? el.className : '').slice(0, 80),
        top: Math.round(top), bot: Math.round(bot), w: Math.round(r.width),
        bg: cs.backgroundColor,
        bgi: cs.backgroundImage?.slice(0, 50),
        pos: cs.position,
        z: cs.zIndex,
        op: cs.opacity,
        vis: cs.visibility,
        disp: cs.display,
      });
    }
  }
  return out.filter(x => x.disp !== 'none' && x.vis !== 'hidden').slice(0, 25);
});
console.log(JSON.stringify(px, null, 2));
await br.close();

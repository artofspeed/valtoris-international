import { chromium } from 'playwright';
const br = await chromium.launch();
const ctx = await br.newContext({ viewport: { width: 375, height: 1500 } });
const p = await ctx.newPage();
await p.goto('http://127.0.0.1:4175/valtoris-international/', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(4000);
// Sample at doc y=750, x=187 — find the actual rendered element via paint-finder approach
const info = await p.evaluate(() => {
  // Add a temp positioned div to get the element below it
  const probe = document.createElement('div');
  probe.style.cssText = 'position:absolute; left:187px; top:750px; width:1px; height:1px; pointer-events:none; z-index:99999;';
  document.body.appendChild(probe);
  const els = document.elementsFromPoint(187, 750);
  probe.remove();
  // ALSO check ALL elements with bg containing 127 somewhere
  const all = Array.from(document.querySelectorAll('*'));
  const grayBg = [];
  for (const el of all) {
    const cs = getComputedStyle(el);
    const bg = cs.backgroundColor;
    if (bg.includes('127') || bg.includes('#7f7f') || bg.includes('rgb(120') || bg.includes('rgb(128') || bg.includes('rgb(126')) {
      const r = el.getBoundingClientRect();
      grayBg.push({
        tag: el.tagName,
        cls: (typeof el.className === 'string' ? el.className : '').slice(0, 80),
        bg, y: Math.round(r.y), h: Math.round(r.height), w: Math.round(r.width),
      });
    }
  }
  return {
    elsAt750: els.slice(0, 8).map(el => ({
      tag: el.tagName,
      cls: (typeof el.className === 'string' ? el.className : '').slice(0, 80),
      bg: getComputedStyle(el).backgroundColor,
    })),
    grayBg: grayBg.slice(0, 10),
  };
});
console.log(JSON.stringify(info, null, 2));
await br.close();

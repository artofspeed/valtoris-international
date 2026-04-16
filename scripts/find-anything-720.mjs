import { chromium } from 'playwright';
const br = await chromium.launch();
const ctx = await br.newContext({ viewport: { width: 375, height: 1500 } });
const p = await ctx.newPage();
await p.goto('http://127.0.0.1:4175/valtoris-international/', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(4000);
const info = await p.evaluate(() => {
  // ANY element (incl. canvas, video, object, svg) that has a non-transparent rendering at doc y=750
  const all = Array.from(document.querySelectorAll('*'));
  const hits = [];
  for (const el of all) {
    if (!el.getBoundingClientRect) continue;
    const r = el.getBoundingClientRect();
    if (r.y > 800 || r.y + r.height < 720) continue;
    if (r.width === 0 || r.height === 0) continue;
    if (r.height > 1000) continue;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    // Skip elements with no own paint
    const hasOwn = cs.backgroundColor !== 'rgba(0, 0, 0, 0)' || cs.backgroundImage !== 'none' || ['VIDEO','CANVAS','IMG','IFRAME','OBJECT','EMBED','SVG','svg','HR'].includes(el.tagName);
    if (!hasOwn) continue;
    hits.push({
      tag: el.tagName,
      cls: (typeof el.className === 'string' ? el.className : (el.className?.baseVal || '')).slice(0, 80),
      y: Math.round(r.y), h: Math.round(r.height), w: Math.round(r.width),
      bg: cs.backgroundColor,
      bgi: cs.backgroundImage?.slice(0, 60),
    });
  }
  return hits.slice(0, 30);
});
console.log(JSON.stringify(info, null, 2));
await br.close();

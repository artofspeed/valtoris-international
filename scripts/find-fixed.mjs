import { chromium } from 'playwright';
const br = await chromium.launch();
const ctx = await br.newContext({ viewport: { width: 375, height: 812 } });
const p = await ctx.newPage();
await p.goto('http://127.0.0.1:4175/valtoris-international/', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(4000);
await p.evaluate(() => window.scrollTo(0, 712));
await p.waitForTimeout(400);
// Find ALL visible fixed/sticky elements that have a non-transparent background
const info = await p.evaluate(() => {
  const all = Array.from(document.querySelectorAll('body *'));
  const hits = [];
  for (const el of all) {
    const cs = getComputedStyle(el);
    if (cs.position !== 'fixed' && cs.position !== 'sticky') continue;
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const r = el.getBoundingClientRect();
    if (r.height < 30 || r.width < 100) continue;
    if (r.bottom < 0 || r.top > 812) continue;
    hits.push({
      tag: el.tagName,
      cls: (typeof el.className === 'string' ? el.className : '').slice(0, 80),
      pos: cs.position,
      bg: cs.backgroundColor,
      y: Math.round(r.y), h: Math.round(r.height), w: Math.round(r.width),
      z: cs.zIndex,
    });
  }
  return hits.slice(0, 15);
});
console.log(JSON.stringify(info, null, 2));
await br.close();

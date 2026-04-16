import { chromium } from 'playwright';
const br = await chromium.launch();
const ctx = await br.newContext({ viewport: { width: 375, height: 812 } });
const p = await ctx.newPage();
await p.goto('http://127.0.0.1:4175/valtoris-international/', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(4000);
await p.evaluate(() => window.scrollTo(0, 712));
await p.waitForTimeout(400);
// Find any element with a non-transparent gray-ish bg, or solid bg, that intersects viewport y=0-100
const info = await p.evaluate(() => {
  const all = Array.from(document.querySelectorAll('body *'));
  const hits = [];
  for (const el of all) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const bg = cs.backgroundColor;
    if (!bg || bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent') continue;
    const r = el.getBoundingClientRect();
    if (r.bottom < 0 || r.top > 100) continue;
    if (r.width < 200) continue;
    hits.push({
      tag: el.tagName,
      cls: (typeof el.className === 'string' ? el.className : '').slice(0, 80),
      pos: cs.position,
      bg, y: Math.round(r.y), h: Math.round(r.height), w: Math.round(r.width), z: cs.zIndex,
    });
  }
  return hits.slice(0, 20);
});
console.log(JSON.stringify(info, null, 2));
await br.close();

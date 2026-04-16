import { chromium } from 'playwright';
const br = await chromium.launch();
const ctx = await br.newContext({ viewport: { width: 375, height: 1500 } });
const p = await ctx.newPage();
await p.goto('http://127.0.0.1:4175/valtoris-international/', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(4000);
const info = await p.evaluate(() => {
  const all = Array.from(document.querySelectorAll('*'));
  const hits = [];
  for (const el of all) {
    if (!el.getBoundingClientRect) continue;
    const r = el.getBoundingClientRect();
    if (r.y > 800 || r.y + r.height < 720) continue;
    if (r.width < 100) continue;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const interesting = cs.filter !== 'none' || cs.mixBlendMode !== 'normal' || cs.backdropFilter !== 'none';
    if (interesting) {
      hits.push({
        tag: el.tagName,
        cls: (typeof el.className === 'string' ? el.className : '').slice(0, 80),
        filter: cs.filter,
        blend: cs.mixBlendMode,
        backdrop: cs.backdropFilter,
        y: Math.round(r.y), h: Math.round(r.height), w: Math.round(r.width),
      });
    }
  }
  return hits.slice(0, 15);
});
console.log(JSON.stringify(info, null, 2));
await br.close();

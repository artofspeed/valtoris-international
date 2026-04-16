import { chromium } from 'playwright';
const br = await chromium.launch();
const ctx = await br.newContext({ viewport: { width: 375, height: 1500 } });
const p = await ctx.newPage();
await p.goto('http://127.0.0.1:4175/valtoris-international/', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(4000);
const info = await p.evaluate(() => {
  // Find any element with semi-transparent dark overlay that intersects doc y=750
  const all = Array.from(document.querySelectorAll('*'));
  const hits = [];
  for (const el of all) {
    if (!el.getBoundingClientRect) continue;
    const r = el.getBoundingClientRect();
    if (r.y > 800 || r.y + r.height < 720) continue;
    if (r.width < 100) continue;
    const cs = getComputedStyle(el);
    if (cs.display === 'none') continue;
    const bg = cs.backgroundColor;
    const op = parseFloat(cs.opacity);
    // Match either: bg with alpha < 1, or opacity < 1 with any solid bg
    if ((bg.startsWith('rgba(') && !bg.endsWith(', 0)')) || op < 1) {
      hits.push({
        tag: el.tagName,
        cls: (typeof el.className === 'string' ? el.className : '').slice(0, 80),
        bg, op,
        y: Math.round(r.y), h: Math.round(r.height), w: Math.round(r.width),
        pos: cs.position, z: cs.zIndex,
        vis: cs.visibility, disp: cs.display,
      });
    }
  }
  return hits.slice(0, 25);
});
console.log(JSON.stringify(info, null, 2));
await br.close();

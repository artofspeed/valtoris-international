import { chromium } from 'playwright';
const br = await chromium.launch();
const ctx = await br.newContext({ viewport: { width: 375, height: 812 } });
const p = await ctx.newPage();
await p.goto('http://127.0.0.1:4175/valtoris-international/', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(4000);
// Scroll to ~700, then inspect what's at viewport y=200 (which is doc y~900)
await p.evaluate(() => window.scrollTo(0, 800));
await p.waitForTimeout(500);
const info = await p.evaluate(() => {
  // sample at viewport (180, 100) — should be the gray
  const samples = [50, 100, 150, 200];
  const out = [];
  for (const y of samples) {
    const el = document.elementFromPoint(187, y);
    if (!el) { out.push({ y, none: true }); continue; }
    const chain = [];
    let n = el;
    for (let i = 0; i < 6 && n && n.tagName !== 'BODY'; i++) {
      const cs = getComputedStyle(n);
      const r = n.getBoundingClientRect();
      chain.push({
        tag: n.tagName,
        cls: (typeof n.className === 'string' ? n.className : '').slice(0, 80),
        h: Math.round(r.height),
        w: Math.round(r.width),
        bg: cs.backgroundColor,
        bgi: cs.backgroundImage?.slice(0, 50),
      });
      n = n.parentElement;
    }
    out.push({ y, chain });
  }
  return out;
});
console.log(JSON.stringify(info, null, 2));
await br.close();

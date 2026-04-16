import { chromium } from 'playwright';
const br = await chromium.launch();
const ctx = await br.newContext({ viewport: { width: 375, height: 812 } });
const p = await ctx.newPage();
await p.goto('http://127.0.0.1:4175/valtoris-international/', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(4000);
await p.evaluate(() => window.scrollTo(0, 712));
await p.waitForTimeout(400);
await p.screenshot({ path: '/tmp/gap.png', fullPage: false, clip: {x: 0, y: 0, width: 375, height: 200} });
const info = await p.evaluate(() => {
  const samples = [10, 30, 50, 80];
  return samples.map(y => {
    const el = document.elementFromPoint(187, y);
    if (!el) return { y, none: true };
    const chain = [];
    let n = el;
    for (let i = 0; i < 4 && n && n.tagName !== 'BODY'; i++) {
      const cs = getComputedStyle(n);
      const r = n.getBoundingClientRect();
      chain.push({ tag: n.tagName, cls: (typeof n.className === 'string' ? n.className : '').slice(0, 80), h: Math.round(r.height), bg: cs.backgroundColor, vis: cs.visibility, disp: cs.display });
      n = n.parentElement;
    }
    return { y, chain };
  });
});
console.log(JSON.stringify(info, null, 2));
await br.close();

import { chromium } from 'playwright';
const br = await chromium.launch();
const ctx = await br.newContext({ viewport: { width: 375, height: 1500 } });
const p = await ctx.newPage();
await p.goto('http://127.0.0.1:4175/valtoris-international/', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(4000);
// Take a tall screenshot and scan for gray bands using elementsFromPoint
await p.screenshot({ path: '/tmp/full-tall.png', fullPage: false });

// Doc height was ~14500. Let's find what's at every doc y from 600 to 1000
const data = await p.evaluate(() => {
  const out = [];
  for (let y = 700; y <= 850; y += 10) {
    const els = document.elementsFromPoint(187, y);
    const top = els[0];
    const cs = getComputedStyle(top);
    out.push({
      y,
      tag: top.tagName,
      cls: (typeof top.className === 'string' ? top.className : '').slice(0, 60),
      bg: cs.backgroundColor,
    });
  }
  return out;
});
console.log(JSON.stringify(data, null, 2));
await br.close();

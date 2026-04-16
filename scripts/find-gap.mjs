import { chromium } from 'playwright';
const br = await chromium.launch();
const ctx = await br.newContext({ viewport: { width: 375, height: 812 } });
const p = await ctx.newPage();
await p.goto('http://127.0.0.1:4175/valtoris-international/', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(4000);
// Doc y=750 is in the gap. Scroll so it's visible at viewport y=300
await p.evaluate(() => window.scrollTo(0, 450));
await p.waitForTimeout(400);
const info = await p.evaluate(() => {
  // Get all elements between doc y=700 and 820
  const all = Array.from(document.querySelectorAll('body *'));
  const hits = [];
  for (const el of all) {
    const r = el.getBoundingClientRect();
    const docY = r.y + window.scrollY;
    const docB = docY + r.height;
    // Only elements that fully span the gap or include it
    if (docY <= 720 && docB >= 800) {
      const cs = getComputedStyle(el);
      hits.push({
        tag: el.tagName,
        cls: (typeof el.className === 'string' ? el.className : '').slice(0, 80),
        docY: Math.round(docY), docB: Math.round(docB), height: Math.round(r.height),
        bg: cs.backgroundColor,
        padTop: cs.paddingTop,
        padBot: cs.paddingBottom,
      });
    }
  }
  return hits.slice(0, 20);
});
console.log(JSON.stringify(info, null, 2));
await br.close();

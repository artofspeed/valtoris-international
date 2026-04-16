import { chromium } from 'playwright';
const br = await chromium.launch();
const ctx = await br.newContext({ viewport: { width: 375, height: 1500 } });
const p = await ctx.newPage();
await p.goto('http://127.0.0.1:4175/valtoris-international/', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(4000);
// Hide everything between doc y=720 and 810 progressively
const results = await p.evaluate(() => {
  const tested = [];
  const all = Array.from(document.querySelectorAll('body *'));
  for (const el of all) {
    const r = el.getBoundingClientRect();
    if (r.y > 800 || r.y + r.height < 720) continue;
    if (r.width < 200) continue;
    tested.push({
      tag: el.tagName,
      cls: (typeof el.className === 'string' ? el.className : '').slice(0, 100),
      y: Math.round(r.y), h: Math.round(r.height), w: Math.round(r.width),
      bg: getComputedStyle(el).backgroundColor,
      bgi: getComputedStyle(el).backgroundImage?.slice(0, 80),
      pos: getComputedStyle(el).position,
    });
  }
  return tested.slice(0, 30);
});
console.log(JSON.stringify(results, null, 2));
await br.close();

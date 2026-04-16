import { chromium } from 'playwright';
const br = await chromium.launch();
const ctx = await br.newContext({ viewport: { width: 375, height: 1500 } });
const p = await ctx.newPage();
await p.goto('http://127.0.0.1:4175/valtoris-international/', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(4000);
const info = await p.evaluate(() => {
  const all = Array.from(document.querySelectorAll('*'));
  // Find ANY element with bg color containing 127, 128, 7f, 808080
  const grayBg = [];
  for (const el of all) {
    const cs = getComputedStyle(el);
    const bg = cs.backgroundColor;
    const m = bg.match(/rgb\((\d+),\s*(\d+),\s*(\d+)/);
    if (!m) continue;
    const [_, r, g, b] = m.map(Number);
    if (r === g && g === b && r >= 100 && r <= 160) {
      const rect = el.getBoundingClientRect();
      grayBg.push({
        tag: el.tagName,
        cls: typeof el.className === 'string' ? el.className.slice(0, 60) : (el.className?.baseVal || ''),
        bg, y: Math.round(rect.y), h: Math.round(rect.height), w: Math.round(rect.width),
        pos: cs.position, vis: cs.visibility, disp: cs.display,
      });
    }
  }
  return grayBg.slice(0, 20);
});
console.log(JSON.stringify(info, null, 2));
await br.close();

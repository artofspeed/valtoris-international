#!/usr/bin/env node
import { chromium } from 'playwright';
const br = await chromium.launch();
const ctx = await br.newContext({ viewport: { width: 375, height: 812 } });
const p = await ctx.newPage();
await p.goto('http://127.0.0.1:4175/valtoris-international/', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(3500);

// Look at everything between document y 700-1000
const info = await p.evaluate(() => {
  const out = [];
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect();
    if (r.y < 700 || r.y > 1050) continue;
    if (r.height < 50) continue;
    if (r.width < 100) continue;
    const cs = getComputedStyle(el);
    out.push({
      tag: el.tagName,
      cls: (typeof el.className === 'string' ? el.className : '').slice(0, 120),
      y: Math.round(r.y), height: Math.round(r.height), width: Math.round(r.width),
      bg: cs.backgroundColor,
      bgi: cs.backgroundImage?.slice(0, 60),
      display: cs.display,
    });
  }
  return out.slice(0, 25);
});

console.log(JSON.stringify(info, null, 2));
await br.close();

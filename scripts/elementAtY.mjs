#!/usr/bin/env node
import { chromium } from 'playwright';
const br = await chromium.launch();
const ctx = await br.newContext({ viewport: { width: 375, height: 812 } });
const p = await ctx.newPage();
await p.goto('http://127.0.0.1:4175/valtoris-international/', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(3500);

// Scroll so the gray band is in view. Target scroll position ~700 (gray appears around 750-950)
await p.evaluate(() => window.scrollTo(0, 700));
await p.waitForTimeout(500);

// Capture element at (187, 300) in viewport coords (would be ~y=1000 in doc)
const info = await p.evaluate(() => {
  const checkY = [100, 200, 300, 400]; // viewport y
  const out = [];
  for (const y of checkY) {
    const el = document.elementFromPoint(187, y);
    if (!el) { out.push({ y, el: null }); continue; }
    const chain = [];
    let n = el;
    for (let i = 0; i < 5 && n && n.tagName !== 'BODY'; i++) {
      const cs = getComputedStyle(n);
      const r = n.getBoundingClientRect();
      chain.push({
        tag: n.tagName,
        cls: (typeof n.className === 'string' ? n.className : '').slice(0, 100),
        width: Math.round(r.width), height: Math.round(r.height), y: Math.round(r.y),
        bg: cs.backgroundColor, bgi: cs.backgroundImage?.slice(0, 40),
      });
      n = n.parentElement;
    }
    out.push({ viewportY: y, docY: y + 700, chain });
  }
  return out;
});

console.log(JSON.stringify(info, null, 2));
await br.close();

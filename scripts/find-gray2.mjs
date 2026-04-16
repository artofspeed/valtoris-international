#!/usr/bin/env node
import { chromium } from 'playwright';
const br = await chromium.launch();
const ctx = await br.newContext({ viewport: { width: 375, height: 812 } });
const p = await ctx.newPage();
await p.goto('http://127.0.0.1:4175/valtoris-international/', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(4000);

// At doc y=~760, sample elementsFromPoint(187, 760 - scroll). Don't scroll — use full page.
// Actually: scroll to 600 so viewport y=160 corresponds to doc y=760.
await p.evaluate(() => window.scrollTo(0, 600));
await p.waitForTimeout(500);

const info = await p.evaluate(() => {
  const out = [];
  // Viewport y samples: 120, 160, 200 => doc y 720, 760, 800
  for (const vy of [80, 120, 160, 200]) {
    const els = document.elementsFromPoint(187, vy);
    const layers = els.slice(0, 10).map((el) => {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        tag: el.tagName,
        cls: (typeof el.className === 'string' ? el.className : '').slice(0, 80),
        bg: cs.backgroundColor,
        bgi: cs.backgroundImage.slice(0, 50),
        op: cs.opacity,
        pos: cs.position,
        z: cs.zIndex,
        h: Math.round(r.height),
        w: Math.round(r.width),
        docTop: Math.round(r.top + window.scrollY),
      };
    });
    out.push({ viewportY: vy, docY: vy + 600, layers });
  }
  return out;
});
console.log(JSON.stringify(info, null, 2));
await br.close();

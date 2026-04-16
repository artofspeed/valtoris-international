#!/usr/bin/env node
import { chromium } from 'playwright';
const br = await chromium.launch();
const ctx = await br.newContext({ viewport: { width: 375, height: 812 } });
const p = await ctx.newPage();
await p.goto('http://127.0.0.1:4175/valtoris-international/', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(4000);

// Paint html and body red with important — observe if gray survives.
await p.addStyleTag({ content: `
  html { background: red !important; }
  body { background: lime !important; }
  .site, .page-wrapper, #page { background: aqua !important; }
  .elementor { background: yellow !important; }
` });
await p.waitForTimeout(300);
await p.evaluate(() => window.scrollTo(0, 600));
await p.waitForTimeout(500);
await p.screenshot({ path: '/tmp/paint-red.png', clip: { x: 0, y: 0, width: 375, height: 400 } });
console.log('saved /tmp/paint-red.png');

// Then grab pixel value at position (187, 200) in viewport (doc y=800 gray area)
const pix = await p.evaluate(() => {
  // can't read pixel from page; just report element chain
  const els = document.elementsFromPoint(187, 200);
  return els.slice(0, 10).map(el => {
    const cs = getComputedStyle(el);
    return { tag: el.tagName, cls: (typeof el.className === 'string' ? el.className : '').slice(0, 60), bg: cs.backgroundColor };
  });
});
console.log(JSON.stringify(pix, null, 2));
await br.close();

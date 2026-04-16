#!/usr/bin/env node
import { chromium } from 'playwright';
const br = await chromium.launch();
const ctx = await br.newContext({ viewport: { width: 375, height: 812 } });
const p = await ctx.newPage();
await p.goto('http://127.0.0.1:4175/valtoris-international/beef-tenderloin/', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(3000);

// Scroll to beef cuts overview body text area
await p.evaluate(() => window.scrollTo(0, 900));
await p.waitForTimeout(400);

// Find the "Chuck Roll" body paragraph, walk up to its containing column.
const info = await p.evaluate(() => {
  const h = [...document.querySelectorAll('h3, h4, strong, b')].find(el => /chuck roll/i.test(el.textContent || ''));
  if (!h) return { found: false };
  let n = h.parentElement;
  const chain = [];
  for (let i = 0; i < 10 && n && n.tagName !== 'BODY'; i++) {
    const cs = getComputedStyle(n);
    const r = n.getBoundingClientRect();
    chain.push({
      tag: n.tagName,
      cls: (typeof n.className === 'string' ? n.className : '').slice(0, 120),
      width: Math.round(r.width),
      display: cs.display,
      flexDir: cs.flexDirection,
      flexBasis: cs.flexBasis,
      maxWidth: cs.maxWidth,
      padding: cs.padding,
    });
    n = n.parentElement;
  }
  return { found: true, chain };
});
console.log(JSON.stringify(info, null, 2));

// Also get class of the page body
const body = await p.evaluate(() => document.body.className);
console.log('body.className:', body);

await br.close();

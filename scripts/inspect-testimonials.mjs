#!/usr/bin/env node
import { chromium } from 'playwright';
const br = await chromium.launch();
const ctx = await br.newContext({ viewport: { width: 375, height: 812 } });
const p = await ctx.newPage();
await p.goto('http://127.0.0.1:4175/valtoris-international/', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(3500);

// Find testimonial text — find any text that says "Procurement Manager" or a star rating
const info = await p.evaluate(() => {
  // Find text "Whitney" (a testimonial author name)
  const author = Array.from(document.querySelectorAll('*'))
    .filter((el) => el.children.length === 0 && /Whitney/i.test(el.textContent || ''))[0];
  if (!author) return 'not found';
  const chain = [];
  let node = author;
  for (let i = 0; i < 10 && node; i++) {
    const r = node.getBoundingClientRect();
    const cs = getComputedStyle(node);
    chain.push({
      level: i,
      tag: node.tagName,
      cls: (typeof node.className === 'string' ? node.className : '').slice(0, 150),
      width: Math.round(r.width),
      display: cs.display,
      flexDir: cs.flexDirection,
      gridCols: cs.gridTemplateColumns,
      flex: cs.flex,
      childCount: node.children.length,
    });
    node = node.parentElement;
  }
  return chain;
});

console.log(JSON.stringify(info, null, 2));
await br.close();

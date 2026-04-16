#!/usr/bin/env node
import { chromium } from 'playwright';
const br = await chromium.launch();
const ctx = await br.newContext({ viewport: { width: 375, height: 812 } });
const p = await ctx.newPage();
await p.goto('http://127.0.0.1:4175/valtoris-international/', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(3500);

const info = await p.evaluate(() => {
  // Find any text node containing just "BEEF" (allowing whitespace).
  const all = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, div, a'));
  const beefs = all.filter((el) => {
    const t = (el.textContent || '').trim();
    return t === 'BEEF' || t === 'Beef' || t === 'beef';
  });
  if (!beefs.length) return 'BEEF not found';
  // Pick the one in the product nav row
  const beef = beefs.find((el) => {
    // Not a header/nav menu link (those are in site header at top)
    const r = el.getBoundingClientRect();
    return r.y > 500 && r.y < 2500;
  }) || beefs[0];
  const chain = [];
  let node = beef;
  for (let i = 0; i < 10 && node; i++) {
    const r = node.getBoundingClientRect();
    const cs = getComputedStyle(node);
    chain.push({
      level: i,
      tag: node.tagName,
      cls: (typeof node.className === 'string' ? node.className : '').slice(0, 140),
      id: node.id,
      width: Math.round(r.width),
      height: Math.round(r.height),
      x: Math.round(r.x),
      y: Math.round(r.y),
      display: cs.display,
      flexDir: cs.flexDirection,
      gridCols: cs.gridTemplateColumns,
      childCount: node.children.length,
      padding: cs.padding,
    });
    node = node.parentElement;
  }
  return chain;
});

console.log(JSON.stringify(info, null, 2));
await br.close();

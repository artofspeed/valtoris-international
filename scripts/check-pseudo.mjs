#!/usr/bin/env node
import { chromium } from 'playwright';
const br = await chromium.launch();
const ctx = await br.newContext({ viewport: { width: 375, height: 812 } });
const p = await ctx.newPage();
await p.goto('http://127.0.0.1:4175/valtoris-international/', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(4000);

// For each element whose bounds include doc y=720-810, list its pseudo elements
const info = await p.evaluate(() => {
  const results = [];
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect();
    const top = r.top + window.scrollY;
    const bot = top + r.height;
    if (bot < 720 || top > 810) continue;
    if (r.width < 100) continue;
    const before = getComputedStyle(el, '::before');
    const after = getComputedStyle(el, '::after');
    const relevant = (cs) => cs.content !== 'none' && cs.content !== 'normal' ||
      cs.backgroundColor !== 'rgba(0, 0, 0, 0)' ||
      cs.backgroundImage !== 'none';
    const pseudos = [];
    if (relevant(before)) pseudos.push({ which: '::before', content: before.content, bg: before.backgroundColor, bgi: before.backgroundImage.slice(0, 80), w: before.width, h: before.height, pos: before.position, top: before.top, left: before.left, display: before.display });
    if (relevant(after)) pseudos.push({ which: '::after', content: after.content, bg: after.backgroundColor, bgi: after.backgroundImage.slice(0, 80), w: after.width, h: after.height, pos: after.position, top: after.top, left: after.left, display: after.display });
    if (pseudos.length) {
      const cls = (typeof el.className === 'string' ? el.className : '').slice(0, 100);
      results.push({ tag: el.tagName, cls, top: Math.round(top), bot: Math.round(bot), pseudos });
    }
  }
  return results;
});
console.log(JSON.stringify(info, null, 2));
await br.close();

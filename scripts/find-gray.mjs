#!/usr/bin/env node
import { chromium } from 'playwright';
const br = await chromium.launch();
const ctx = await br.newContext({ viewport: { width: 375, height: 812 } });
const p = await ctx.newPage();
await p.goto('http://127.0.0.1:4175/valtoris-international/', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(4000);

// For every element whose bounds cross doc y=720-810, gather details.
const info = await p.evaluate(() => {
  const out = [];
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect();
    const top = r.top + window.scrollY;
    const bot = top + r.height;
    // Element crosses 720-810 band
    if (bot < 720 || top > 810) continue;
    if (r.width < 100) continue;
    const cs = getComputedStyle(el);
    const id = el.id || '';
    const cls = typeof el.className === 'string' ? el.className : (el.className?.baseVal || '');
    out.push({
      tag: el.tagName,
      id,
      cls: cls.slice(0, 140),
      top: Math.round(top),
      bot: Math.round(bot),
      w: Math.round(r.width),
      h: Math.round(r.height),
      bg: cs.backgroundColor,
      bgi: cs.backgroundImage.slice(0, 80),
      opacity: cs.opacity,
      display: cs.display,
      position: cs.position,
      zIndex: cs.zIndex,
      visibility: cs.visibility,
    });
  }
  return out;
});

console.log(JSON.stringify(info, null, 2));
await br.close();

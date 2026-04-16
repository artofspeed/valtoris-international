#!/usr/bin/env node
import { chromium } from 'playwright';
const br = await chromium.launch();
const ctx = await br.newContext({ viewport: { width: 375, height: 812 } });
const p = await ctx.newPage();
await p.goto('http://127.0.0.1:4175/valtoris-international/', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(3500);

// Find all visible images on the entire page, sort by docTop, find small (logo-sized) ones
const info = await p.evaluate(() => {
  const imgs = [...document.querySelectorAll('img')].map(img => {
    const r = img.getBoundingClientRect();
    return {
      src: img.src.slice(-80),
      parentCls: (img.parentElement?.className || '').slice(0, 80),
      gparentCls: (img.parentElement?.parentElement?.className || '').slice(0, 80),
      top: Math.round(r.top + window.scrollY), w: Math.round(r.width), h: Math.round(r.height),
    };
  }).filter(i => i.w > 30 && i.w < 100 && i.h > 30 && i.h < 100);
  return imgs;
});
console.log(JSON.stringify(info, null, 2));
await br.close();

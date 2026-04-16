#!/usr/bin/env node
import { chromium } from 'playwright';
const br = await chromium.launch();
const ctx = await br.newContext({ viewport: { width: 375, height: 812 } });
const p = await ctx.newPage();
await p.goto('http://127.0.0.1:4175/valtoris-international/', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(3500);

// Find the barbecue logo images by image src
const info = await p.evaluate(() => {
  // Find images containing brand/barbecue/client-logo/partner
  const imgs = [...document.querySelectorAll('img')].filter(img => {
    const src = img.src || '';
    return /brand|logo|client|partner|barbecue/i.test(src) && !/testimonial|gallery|footer/i.test(img.className || '') && !/testimonial|gallery|footer/i.test(img.parentElement?.className || '');
  });
  return imgs.slice(0, 4).map(img => {
    const r = img.getBoundingClientRect();
    const info = {
      src: img.src.slice(-60),
      top: Math.round(r.top + window.scrollY),
      w: Math.round(r.width), h: Math.round(r.height),
      chain: [],
    };
    let n = img;
    for (let i = 0; i < 10 && n && n.tagName !== 'BODY'; i++) {
      const cs = getComputedStyle(n);
      info.chain.push({
        tag: n.tagName,
        cls: (typeof n.className === 'string' ? n.className : (n.className?.baseVal || '')).slice(0, 140),
        display: cs.display, flexDir: cs.flexDirection,
        width: Math.round(n.getBoundingClientRect().width),
        height: Math.round(n.getBoundingClientRect().height),
      });
      n = n.parentElement;
    }
    return info;
  });
});
console.log(JSON.stringify(info, null, 2));
await br.close();

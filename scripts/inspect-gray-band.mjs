#!/usr/bin/env node
import { chromium } from 'playwright';
const br = await chromium.launch();
const ctx = await br.newContext({ viewport: { width: 375, height: 812 } });
const p = await ctx.newPage();
await p.goto('http://127.0.0.1:4175/valtoris-international/', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(3500);

// Based on earlier screenshot, the gray band appears around y=700-1000 px.
// Find elements whose computed background is a gray-ish color in that range.
const info = await p.evaluate(() => {
  const out = [];
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect();
    if (r.y < 500 || r.y > 1500 || r.height < 100 || r.height > 800) continue;
    const cs = getComputedStyle(el);
    const bg = cs.backgroundColor;
    // Only gray-ish / not transparent
    if (!bg || bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent') continue;
    out.push({
      tag: el.tagName,
      cls: (typeof el.className === 'string' ? el.className : '').slice(0, 120),
      y: Math.round(r.y), height: Math.round(r.height),
      bg,
    });
  }
  return out.slice(0, 15);
});

console.log('Backgrounds in y=500-1500 range:\n' + JSON.stringify(info, null, 2));

// Also check the hero / banner section boundary
const heroEnd = await p.evaluate(() => {
  const main = document.querySelector('.main-slider, .main-banner, .banner-one, .hero, .slider-banner');
  if (!main) return null;
  const r = main.getBoundingClientRect();
  return { cls: main.className, y: Math.round(r.y), height: Math.round(r.height), bottom: Math.round(r.y + r.height) };
});
console.log('\nHero/main banner:', JSON.stringify(heroEnd, null, 2));

await br.close();

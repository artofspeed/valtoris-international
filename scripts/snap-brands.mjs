#!/usr/bin/env node
import { chromium } from 'playwright';
const br = await chromium.launch();
const ctx = await br.newContext({ viewport: { width: 375, height: 812 } });
const p = await ctx.newPage();
await p.goto('http://127.0.0.1:4175/valtoris-international/', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(3500);
// Get current position of brand carousel
const pos = await p.evaluate(() => {
  const el = document.querySelector('.client-carousel__one');
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { top: r.top + window.scrollY, h: r.height };
});
console.log('brand carousel pos:', pos);
if (pos) {
  await p.evaluate((y) => window.scrollTo(0, y - 100), pos.top);
  await p.waitForTimeout(700);
  await p.screenshot({ path: '/tmp/brands.png', fullPage: false });
} else {
  await p.screenshot({ path: '/tmp/brands.png', fullPage: false });
}
console.log('saved /tmp/brands.png');
await br.close();

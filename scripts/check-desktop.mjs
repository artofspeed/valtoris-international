#!/usr/bin/env node
import { chromium } from 'playwright';
const br = await chromium.launch();
const ctx = await br.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();
await p.goto('http://127.0.0.1:4175/valtoris-international/', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(4000);

// Check hero-slider-one__bg::after on desktop
const info = await p.evaluate(() => {
  const out = {};
  const el = document.querySelector('.hero-slider-one__bg');
  if (el) {
    const cs = getComputedStyle(el, '::after');
    const r = el.getBoundingClientRect();
    out.heroAfter = {
      bg: cs.backgroundColor, opacity: cs.opacity, bottom: cs.bottom, height: cs.height,
      top: cs.top, position: cs.position, display: cs.display,
      parentRect: { top: Math.round(r.top + window.scrollY), h: Math.round(r.height) }
    };
  }
  // Sample icon strip y
  const icons = document.querySelector('.my-icon-sec');
  if (icons) {
    const r = icons.getBoundingClientRect();
    out.iconRect = { top: Math.round(r.top + window.scrollY), h: Math.round(r.height) };
  }
  // Check parent container bg
  const iconParent = icons?.parentElement;
  if (iconParent) {
    const cs = getComputedStyle(iconParent);
    out.iconParentBg = cs.backgroundColor;
    out.iconParentBgi = cs.backgroundImage.slice(0, 80);
    out.iconParentCls = (typeof iconParent.className === 'string' ? iconParent.className : '').slice(0, 120);
  }
  return out;
});
console.log(JSON.stringify(info, null, 2));

// Screenshot at a narrower clip spanning the hero/icons area
await p.screenshot({ path: '/tmp/desktop-transition.png', clip: { x: 0, y: 400, width: 1440, height: 400 } });
console.log('saved /tmp/desktop-transition.png');
await br.close();

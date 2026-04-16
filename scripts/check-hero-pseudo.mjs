#!/usr/bin/env node
import { chromium } from 'playwright';
const br = await chromium.launch();
const ctx = await br.newContext({ viewport: { width: 375, height: 812 } });
const p = await ctx.newPage();
await p.goto('http://127.0.0.1:4175/valtoris-international/', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(4000);

const info = await p.evaluate(() => {
  const targets = [
    '.hero-slider-one',
    '.hero-slider-one__item',
    '.hero-slider-one__bg',
    '.hero-slider-one__carousel',
    '.hero-main-slider',
    '.elementor-element-b5ffa27',
    '.elementor-element-14f13cf',
    '.elementor-element-fda9124',
    '.elementor-element-aa38394',
    '.e-con-inner',
    '.elementor-166',
  ];
  const out = [];
  for (const sel of targets) {
    const els = document.querySelectorAll(sel);
    for (const el of els) {
      const r = el.getBoundingClientRect();
      if (r.width === 0) continue;
      for (const pseudo of ['::before', '::after']) {
        const cs = getComputedStyle(el, pseudo);
        const hasContent = cs.content && cs.content !== 'none' && cs.content !== 'normal';
        const hasBg = cs.backgroundColor !== 'rgba(0, 0, 0, 0)' || cs.backgroundImage !== 'none';
        if (hasContent || hasBg) {
          out.push({
            sel, pseudo,
            content: cs.content, bg: cs.backgroundColor, bgi: cs.backgroundImage.slice(0, 80),
            width: cs.width, height: cs.height,
            top: cs.top, left: cs.left, right: cs.right, bottom: cs.bottom,
            pos: cs.position, display: cs.display, zIndex: cs.zIndex,
            opacity: cs.opacity,
            parentRect: { top: Math.round(r.top + window.scrollY), h: Math.round(r.height), w: Math.round(r.width) },
          });
        }
      }
    }
  }
  return out;
});
console.log(JSON.stringify(info, null, 2));
await br.close();

#!/usr/bin/env node
/** Inspect DOM for the specific glitch elements so we can target them with CSS. */
import { chromium } from 'playwright';
const BASE = 'http://127.0.0.1:4175/valtoris-international';
const br = await chromium.launch();
const ctx = await br.newContext({ viewport: { width: 375, height: 812 } });
const p = await ctx.newPage();
await p.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(3000);

// 1. scroll-to-top button
console.log('\n=== SCROLL-TO-TOP ===');
console.log(await p.evaluate(() => {
  const el = document.querySelector('.scroll-to-top');
  if (!el) return 'NOT FOUND';
  const cs = getComputedStyle(el);
  const r = el.getBoundingClientRect();
  return JSON.stringify({
    classes: el.className,
    html: el.outerHTML.slice(0, 300),
    position: cs.position, display: cs.display, visibility: cs.visibility, opacity: cs.opacity,
    right: cs.right, bottom: cs.bottom, transform: cs.transform,
    rect: { x: r.x, y: r.y, w: r.width, h: r.height },
  }, null, 2);
}));

// 2. product icon grid on home
console.log('\n=== PRODUCT ICONS CONTAINER ===');
console.log(await p.evaluate(() => {
  // Find the container wrapping the Beef/Pork/Chicken icons
  const icons = Array.from(document.querySelectorAll('img, svg, i')).filter((e) => {
    const txt = (e.closest('div')?.textContent || '').trim();
    return /^BEEF$|^PORK$|^CHICKEN$/i.test(txt);
  });
  const parent = icons.length ? icons[0].closest('.container, .row, section') : null;
  return parent ? {
    tag: parent.tagName,
    cls: parent.className,
    childCount: parent.children.length,
    html: parent.outerHTML.slice(0, 400),
  } : 'NOT FOUND';
}));

// 3. Testimonials — find the section where every word is on its own line
console.log('\n=== TESTIMONIAL SECTION ===');
console.log(await p.evaluate(() => {
  const all = Array.from(document.querySelectorAll('section, div'));
  for (const el of all) {
    const txt = (el.textContent || '').trim();
    if (txt.includes('Procurement Manager') || txt.includes('Whitney R')) {
      const r = el.getBoundingClientRect();
      if (r.height > 100 && r.height < 2000) {
        return {
          tag: el.tagName,
          cls: el.className.slice(0, 120),
          width: r.width,
          html: el.outerHTML.slice(0, 400),
        };
      }
    }
  }
  return 'NOT FOUND';
}));

// 4. Horizontal overflow sources
console.log('\n=== HORIZONTAL OVERFLOW ELEMENTS ===');
console.log(await p.evaluate(() => {
  const vw = window.innerWidth;
  const out = [];
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect();
    if (r.right > vw + 2 && r.width > 200) {
      out.push({
        tag: el.tagName,
        cls: (typeof el.className === 'string' ? el.className : '').slice(0, 80),
        rightEdge: Math.round(r.right),
        width: Math.round(r.width),
      });
    }
  }
  // Dedupe by class
  const seen = new Set();
  return out.filter((x) => { const k = x.cls; if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 20);
}, null, 2));

await br.close();

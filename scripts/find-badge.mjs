#!/usr/bin/env node
import { chromium } from 'playwright';
const br = await chromium.launch();
const ctx = await br.newContext({ viewport: { width: 375, height: 812 } });
const p = await ctx.newPage();
await p.goto('http://127.0.0.1:4175/valtoris-international/about-us/', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(3000);

// Find the "natural organic meat" text path (likely SVG or split spans)
const info = await p.evaluate(() => {
  // Search for the delivery guy section with a circle
  const guys = [...document.querySelectorAll('img')].filter(img => /delivery|guy|man|portrait/i.test(img.src + (img.alt || '')));
  const circles = [...document.querySelectorAll('svg')].filter(svg => {
    const cs = getComputedStyle(svg);
    const r = svg.getBoundingClientRect();
    return r.width > 50 && r.width < 300;
  }).slice(0, 8);
  const circleInfo = circles.map(svg => {
    const r = svg.getBoundingClientRect();
    return {
      cls: (typeof svg.className === 'object' ? svg.className.baseVal : svg.className) || '',
      parent: svg.parentElement?.className?.slice(0, 80),
      gparent: svg.parentElement?.parentElement?.className?.slice(0, 80),
      top: Math.round(r.top + window.scrollY), w: Math.round(r.width), h: Math.round(r.height),
      innerHTML: svg.innerHTML.slice(0, 100),
    };
  });
  // All images with large width (potential delivery guy image)
  const imgs = [...document.querySelectorAll('img')].filter(img => {
    const r = img.getBoundingClientRect();
    return r.width > 200 && r.height > 200 && (r.top + window.scrollY) > 3000 && (r.top + window.scrollY) < 5500;
  }).slice(0, 5);
  const imgInfo = imgs.map(img => ({
    src: img.src.slice(-80), cls: img.className,
    parent: img.parentElement?.className?.slice(0, 80),
    top: Math.round(img.getBoundingClientRect().top + window.scrollY),
  }));
  // Find any .circle or .rotate classes in the DOM
  const circleEls = [...document.querySelectorAll('[class*="circle"], [class*="rotat"], [class*="organic"], [class*="natural"], [class*="badge"]')].slice(0, 15);
  return {
    circles: circleInfo,
    images: imgInfo,
    circleClassed: circleEls.map(el => ({
      tag: el.tagName, cls: (typeof el.className === 'string' ? el.className : (el.className?.baseVal || '')).slice(0, 100),
      text: (el.textContent || '').slice(0, 40).trim(),
    })),
  };
});
console.log(JSON.stringify(info, null, 2));
await br.close();

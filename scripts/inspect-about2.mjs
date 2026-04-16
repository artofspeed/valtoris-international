#!/usr/bin/env node
import { chromium } from 'playwright';
const br = await chromium.launch();
const ctx = await br.newContext({ viewport: { width: 375, height: 812 } });
const p = await ctx.newPage();
p.on('response', (r) => { if (r.status() >= 400 && /counter|funfact|about/i.test(r.url())) console.log('[404]', r.url().slice(0, 150)); });
await p.goto('http://127.0.0.1:4175/valtoris-international/about-us/', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(3000);

// Find the counter section's ACTUAL gray, walk up from a counter value
const info = await p.evaluate(() => {
  const out = {};
  // The "25+" block for years of experience - find it
  const counters = [...document.querySelectorAll('*')].filter(el => /^25\+$/.test((el.textContent || '').trim()));
  if (counters.length) {
    const el = counters[0];
    const chain = [];
    let n = el;
    for (let i = 0; i < 12 && n && n.tagName !== 'BODY'; i++) {
      const cs = getComputedStyle(n);
      const r = n.getBoundingClientRect();
      chain.push({
        tag: n.tagName,
        cls: (typeof n.className === 'string' ? n.className : '').slice(0, 120),
        bg: cs.backgroundColor,
        bgi: cs.backgroundImage.slice(0, 80),
        writingMode: cs.writingMode,
        transform: cs.transform,
        height: Math.round(r.height), width: Math.round(r.width),
      });
      n = n.parentElement;
    }
    out.twentyFivePlusChain = chain;
  }
  // Find the "Years of Experience" rotated sibling
  const yoex = [...document.querySelectorAll('*')].filter(el => /years?\s*of\s*experience/i.test(el.textContent || '')).slice(0, 10);
  out.yoe = yoex.map(el => ({
    tag: el.tagName, cls: (typeof el.className === 'string' ? el.className : '').slice(0, 120),
    wm: getComputedStyle(el).writingMode,
    tf: getComputedStyle(el).transform,
    text: (el.textContent || '').slice(0, 50).trim(),
  }));
  // Find the counter-one section children
  const counterSection = document.querySelector('.counter-one, .fact-counter-one, [class*="counter-one"]');
  if (counterSection) {
    const r = counterSection.getBoundingClientRect();
    out.counterSection = {
      tag: counterSection.tagName, cls: (counterSection.className || '').slice(0, 160),
      bg: getComputedStyle(counterSection).backgroundColor,
      bgi: getComputedStyle(counterSection).backgroundImage.slice(0, 100),
      top: Math.round(r.top + window.scrollY), h: Math.round(r.height),
    };
    // Children with bg image
    const kids = [...counterSection.querySelectorAll('*')].filter(el => {
      const bgi = getComputedStyle(el).backgroundImage;
      return bgi && bgi !== 'none';
    }).slice(0, 5);
    out.counterBgKids = kids.map(el => ({
      cls: (el.className || '').slice(0, 120),
      bgi: getComputedStyle(el).backgroundImage.slice(0, 120),
      bg: getComputedStyle(el).backgroundColor,
    }));
  }
  // "natural organic meat" rotated text — look for .circle, .circle-text, or SVG
  const rotated = [...document.querySelectorAll('*')].filter(el => {
    const tf = getComputedStyle(el).transform;
    const wm = getComputedStyle(el).writingMode;
    return (tf && tf !== 'none' && /rotate|matrix\(0/i.test(tf)) || wm !== 'horizontal-tb';
  }).slice(0, 12);
  out.rotatedElements = rotated.map(el => ({
    tag: el.tagName, cls: (typeof el.className === 'string' ? el.className : '').slice(0, 100),
    text: (el.textContent || '').slice(0, 40).replace(/\s+/g, ' ').trim(),
    wm: getComputedStyle(el).writingMode,
    tf: getComputedStyle(el).transform.slice(0, 50),
    display: getComputedStyle(el).display,
  }));
  return out;
});
console.log(JSON.stringify(info, null, 2));
await br.close();

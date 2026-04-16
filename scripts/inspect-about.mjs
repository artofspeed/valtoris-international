#!/usr/bin/env node
import { chromium } from 'playwright';
const br = await chromium.launch();
const ctx = await br.newContext({ viewport: { width: 375, height: 812 } });
const p = await ctx.newPage();
await p.goto('http://127.0.0.1:4175/valtoris-international/about-us/', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(3000);

const info = await p.evaluate(() => {
  const out = {};
  // Find "YEARS OF EXPERIENCE" text
  const allText = [...document.querySelectorAll('*')].filter(el => el.childNodes.length === 1 && el.childNodes[0].nodeType === 3 && /years of experience/i.test(el.textContent || ''));
  out.yearsElements = allText.map(el => ({
    tag: el.tagName,
    cls: (typeof el.className === 'string' ? el.className : '').slice(0, 120),
    writingMode: getComputedStyle(el).writingMode,
    transform: getComputedStyle(el).transform,
    parentCls: el.parentElement?.className?.slice(0, 120),
  }));
  // Find "natural organic meat" text (rotated circle)
  const circleTexts = [...document.querySelectorAll('*')].filter(el => /natural.organic.meat/i.test(el.textContent || '') && el.children.length <= 3);
  out.circleTexts = circleTexts.slice(0, 5).map(el => ({
    tag: el.tagName,
    cls: (typeof el.className === 'string' ? el.className : '').slice(0, 120),
    parentCls: el.parentElement?.className?.slice(0, 120),
    rect: (() => { const r = el.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top + window.scrollY) }; })(),
  }));
  // Find the gray counter section
  const grayBgs = [...document.querySelectorAll('section, div')].filter(el => {
    const r = el.getBoundingClientRect();
    if (r.width < 300 || r.height < 300) return false;
    const cs = getComputedStyle(el);
    return /funfact|counter|fact-counter/i.test(el.className || '') ||
           cs.backgroundImage.includes('url(');
  }).filter(el => {
    const r = el.getBoundingClientRect();
    const top = r.top + window.scrollY;
    return top > 1700 && top < 3500;
  });
  out.counterSection = grayBgs.slice(0, 5).map(el => {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return {
      tag: el.tagName, cls: (el.className || '').slice(0, 120),
      bg: cs.backgroundColor, bgi: cs.backgroundImage.slice(0, 100),
      top: Math.round(r.top + window.scrollY), h: Math.round(r.height),
    };
  });
  // Find "5%" / "QUALITY OF MEAT" progress bars
  const progressBars = [...document.querySelectorAll('*')].filter(el => /quality of meat|FRESH PRODUCE|SAFETY.{0,5}$/i.test(el.textContent || '') && el.children.length <= 5);
  out.progressBars = progressBars.slice(0, 5).map(el => ({
    tag: el.tagName,
    cls: (typeof el.className === 'string' ? el.className : '').slice(0, 120),
    parentCls: (typeof el.parentElement?.className === 'string' ? el.parentElement.className : '').slice(0, 120),
  }));
  return out;
});
console.log(JSON.stringify(info, null, 2));
await br.close();

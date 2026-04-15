#!/usr/bin/env node
/** Measure absolute positions and heights of hero + icons sections on clone. */
import { chromium } from 'playwright';

async function probe(url, label) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, ignoreHTTPSErrors: true });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);

  const data = await page.evaluate(() => {
    const probe = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return { sel, found: false };
      // Get offsetTop from document root
      let top = 0;
      let n = el;
      while (n) { top += n.offsetTop; n = n.offsetParent; }
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        sel,
        found: true,
        absTop: top,
        rectY: r.y|0,
        height: r.height|0,
        bottomAbs: top + r.height,
        bg: cs.backgroundColor,
        bgImg: cs.backgroundImage.slice(0, 60),
        position: cs.position,
      };
    };
    return {
      hero: probe('.hero-slider-one'),
      heroItem0: probe('.hero-main-slider > .hero-slider-one__carousel > .item:nth-child(1)'),
      heroItemInner: probe('.hero-main-slider > .hero-slider-one__carousel > .item:nth-child(1) > .hero-slider-one__item'),
      heroBg: probe('.hero-slider-one__bg'),
      iconsSection: probe('.elementor-element-fda9124'),
      aboutSection: probe('.elementor-element-aa38394'),
      docHeight: document.documentElement.scrollHeight,
    };
  });

  await browser.close();
  console.log(`\n=== ${label} ===`);
  console.log(JSON.stringify(data, null, 2));
  return data;
}

await probe('http://127.0.0.1:4175/valtoris-international/', 'CLONE');
await probe('https://valtorisinternational.com/', 'ORIG');

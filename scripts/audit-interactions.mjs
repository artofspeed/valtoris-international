#!/usr/bin/env node
/**
 * Deep audit: click every interactive element on live vs orig,
 * capture what happens, identify broken/missing behaviors.
 */
import { chromium } from 'playwright';

const CLONE = 'http://127.0.0.1:4175/valtoris-international/';
const ORIG = 'https://valtorisinternational.com/';

async function audit(url, label, viewport) {
  const br = await chromium.launch();
  const ctx = await br.newContext({ viewport, ignoreHTTPSErrors: true });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log(`  ERROR[${label}]: ${e.message}`));
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1500);

  // Enumerate interactive elements
  const elements = await page.evaluate(() => {
    const sel = [
      '.mobile-nav__toggler',
      '.mobile-nav__wrapper',
      '.mobile-nav__close',
      '.search-toggler',
      '.main-menu__list > li.dropdown',
      '.video-popup',
      '.boskery-accordion .accordion-title',
      '.scroll-to-top',
      '.sticky-header',
      '.preloader',
      '.vi-video-bg',
    ];
    const out = {};
    for (const s of sel) {
      const els = Array.from(document.querySelectorAll(s));
      out[s] = els.slice(0, 3).map(el => {
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return {
          cls: el.className.toString().slice(0, 80),
          display: cs.display,
          visibility: cs.visibility,
          opacity: cs.opacity,
          transform: cs.transform.slice(0, 40),
          zIndex: cs.zIndex,
          pos: cs.position,
          rect: { w: Math.round(r.width), h: Math.round(r.height), t: Math.round(r.top), l: Math.round(r.left) },
        };
      });
    }
    return out;
  });
  console.log(`\n=== ${label} @ ${viewport.width}x${viewport.height} ===`);
  for (const [sel, items] of Object.entries(elements)) {
    if (!items.length) { console.log(`  ${sel}: none`); continue; }
    console.log(`  ${sel}:`);
    for (const it of items) console.log(`    ${JSON.stringify(it)}`);
  }
  await br.close();
}

const mobile = { width: 375, height: 812 };
const desk = { width: 1440, height: 900 };

await audit(ORIG, 'ORIG-mobile', mobile);
await audit(CLONE, 'CLONE-mobile', mobile);
await audit(ORIG, 'ORIG-desk', desk);
await audit(CLONE, 'CLONE-desk', desk);

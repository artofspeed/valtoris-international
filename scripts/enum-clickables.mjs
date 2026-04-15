#!/usr/bin/env node
/** Enumerate every clickable element on every route of the clone.
 *  Emits a JSON catalog with: route, tag, text, href, classes, target, rect.
 *  We'll use this as the input to the click-and-verify suite. */
import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const BASE = 'http://127.0.0.1:4175/valtoris-international';
const routes = [
  '/',
  '/about-us/',
  '/beef-tenderloin/',
  '/pork/',
  '/chicken/',
  '/greens/',
  '/sugar/',
  '/papers/',
  '/news/',
  '/contact-us/',
  '/login/',
  '/valtoris-attends-canadian-meat-council-annual-conference-2025/',
];

const br = await chromium.launch();
const catalog = {};

for (const route of routes) {
  const url = BASE + route;
  const ctx = await br.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  await p.goto(url, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(3000);

  const items = await p.evaluate(() => {
    const host = document.querySelector('[data-vi-static-page]');
    if (!host) return [];
    const els = Array.from(host.querySelectorAll(
      'a, button, input[type="submit"], input[type="button"], [onclick], [role="button"]'
    ));
    // Deduplicate: if the same href appears multiple times, keep first occurrence.
    const seen = new Set();
    const out = [];
    for (const el of els) {
      const cs = getComputedStyle(el);
      // Skip invisible
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      const tag = el.tagName;
      const href = el.getAttribute('href') || null;
      const target = el.getAttribute('target') || null;
      const type = el.getAttribute('type') || null;
      // Text label
      let text = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 80);
      if (!text) {
        const img = el.querySelector('img');
        if (img) text = '[img alt=' + (img.getAttribute('alt') || '') + ']';
        const icon = el.querySelector('i, span[class*="icon"]');
        if (icon && !text) text = '[icon ' + (icon.className || '') + ']';
        if (!text) text = '[empty]';
      }
      const cls = el.className && typeof el.className === 'string' ? el.className.slice(0, 120) : '';
      const rect = el.getBoundingClientRect();
      const key = tag + '|' + href + '|' + text.slice(0, 30) + '|' + cls.slice(0, 40);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        tag, href, target, type, text, cls,
        rect: { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height) },
        inHeader: !!el.closest('.main-header'),
        inFooter: !!el.closest('.main-footer, footer'),
        inNav: !!el.closest('.main-menu'),
      });
    }
    return out;
  });

  catalog[route] = items;
  console.log(`${route}: ${items.length} clickable`);
  await ctx.close();
}

await br.close();
writeFileSync('/tmp/clickable-catalog.json', JSON.stringify(catalog, null, 2));
const total = Object.values(catalog).reduce((a, b) => a + b.length, 0);
console.log(`\nTotal: ${total} clickable elements across ${routes.length} routes`);
console.log('Saved /tmp/clickable-catalog.json');

#!/usr/bin/env node
/**
 * Debug why the viewport screenshot of the clone is black.
 * Takes a sequence of snapshots and dumps the top-level DOM structure.
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'debug-viewport');
mkdirSync(OUT, { recursive: true });

const URL = process.argv[2] || 'https://artofspeed.github.io/valtoris-international/';

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, ignoreHTTPSErrors: true });
const page = await ctx.newPage();

page.on('console', (m) => console.log('[browser]', m.type(), m.text()));
page.on('pageerror', (e) => console.log('[page-err]', e.message));

await page.goto(URL, { waitUntil: 'domcontentloaded' });
await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

await page.screenshot({ path: join(OUT, '0-initial.png'), fullPage: false });

const info = await page.evaluate(() => {
  const body = document.body;
  const topEls = [];
  for (const el of document.body.children) {
    const cs = window.getComputedStyle(el);
    const r = el.getBoundingClientRect();
    topEls.push({
      tag: el.tagName, id: el.id, cls: el.className.slice(0, 120),
      pos: cs.position, z: cs.zIndex, display: cs.display, vis: cs.visibility,
      bg: cs.backgroundColor, bgImg: cs.backgroundImage.slice(0, 80),
      rect: { x: r.x|0, y: r.y|0, w: r.width|0, h: r.height|0 },
    });
  }
  const fixed = [...document.querySelectorAll('body *')].filter(e => {
    const cs = window.getComputedStyle(e);
    return cs.position === 'fixed' && parseInt(cs.zIndex||'0',10) > 0;
  }).slice(0, 10).map(e => {
    const cs = window.getComputedStyle(e);
    const r = e.getBoundingClientRect();
    return { tag: e.tagName, id: e.id, cls: e.className.slice(0,120), z: cs.zIndex, rect: { x: r.x|0, y: r.y|0, w: r.width|0, h: r.height|0 }, bg: cs.backgroundColor };
  });
  return { title: document.title, bodyBg: window.getComputedStyle(body).backgroundColor, topEls, fixed };
});

console.log(JSON.stringify(info, null, 2));

// Pixel check: read the color at x=720, y=450
const color = await page.evaluate(() => {
  const el = document.elementFromPoint(720, 450);
  if (!el) return 'null';
  const cs = window.getComputedStyle(el);
  return { tag: el.tagName, id: el.id, cls: el.className.slice(0,80), bg: cs.backgroundColor, bgImg: cs.backgroundImage.slice(0,80), pos: cs.position, z: cs.zIndex };
});
console.log('element at (720,450):', JSON.stringify(color, null, 2));

await browser.close();

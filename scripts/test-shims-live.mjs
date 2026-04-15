#!/usr/bin/env node
/** Same as test-shims.mjs but targets the live Pages deploy. */
import { chromium } from 'playwright';

const BASE = 'https://artofspeed.github.io/valtoris-international/';
const br = await chromium.launch();
let failures = 0;
const ok = (label) => console.log(`  [OK] ${label}`);
const fail = (label, info) => { failures++; console.log(`  [FAIL] ${label} :: ${info}`); };

async function test(viewport, fn) {
  const ctx = await br.newContext({ viewport, ignoreHTTPSErrors: true });
  const p = await ctx.newPage();
  try { await fn(p); } finally { await ctx.close(); }
}

console.log('\n=== MOBILE NAV TOGGLE (375) ===');
await test({ width: 375, height: 812 }, async (p) => {
  await p.goto(BASE, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(4000);
  const before = await p.evaluate(() => document.querySelector('.mobile-nav__wrapper')?.className);
  await p.click('.mobile-nav__toggler:visible');
  await p.waitForTimeout(600);
  const after = await p.evaluate(() => document.querySelector('.mobile-nav__wrapper')?.className);
  if (after?.includes('expanded') && !before?.includes('expanded')) ok('hamburger opens panel');
  else fail('hamburger opens panel', `before="${before}" after="${after}"`);

  await p.evaluate(() => {
    const btn = document.querySelector('.mobile-nav__container .menu-item-has-children button');
    if (btn) btn.click();
  });
  await p.waitForTimeout(400);
  const dropAfter = await p.evaluate(() => {
    const li = document.querySelector('.mobile-nav__container .menu-item-has-children');
    const sub = li?.querySelector(':scope > ul');
    return sub ? getComputedStyle(sub).display : null;
  });
  if (dropAfter === 'block') ok('dropdown submenu expands on click');
  else fail('dropdown submenu expands', `after=${dropAfter}`);
});

console.log('\n=== SEARCH POPUP (1440) ===');
await test({ width: 1440, height: 900 }, async (p) => {
  await p.goto(BASE, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(4000);
  const debugInfo = await p.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('.search-toggler'));
    const trigger = btns.find(b => !b.closest('.search-popup'));
    if (!trigger) return 'no trigger found';
    trigger.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    return document.querySelector('.search-popup')?.className;
  });
  if (debugInfo?.includes('active')) ok('search-toggler opens popup');
  else fail('search-toggler opens popup', JSON.stringify(debugInfo));
});

console.log('\n=== SUPPLIERS BUTTON (target=_blank) ===');
await test({ width: 1440, height: 900 }, async (p) => {
  await p.goto(BASE, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(3000);
  const href = await p.evaluate(() => {
    const candidates = Array.from(document.querySelectorAll('a.boskery-btn'));
    for (const a of candidates) {
      const t = a.querySelector('.boskery-btn__text')?.textContent?.trim().toLowerCase();
      if (t === 'suppliers') return { href: a.getAttribute('href'), target: a.getAttribute('target') };
    }
    return null;
  });
  if (href?.href?.startsWith('/valtoris-international/contact-us')) ok(`Suppliers href: ${href.href}`);
  else fail('Suppliers href rewritten', JSON.stringify(href));
});

console.log('\n=== VIDEO POPUP ===');
await test({ width: 1440, height: 900 }, async (p) => {
  await p.goto(BASE, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(3000);
  await p.evaluate(() => document.querySelector('a.video-popup, a.video-button')?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })));
  await p.waitForTimeout(500);
  const overlay = await p.evaluate(() => !!document.querySelector('.vi-video-lightbox'));
  if (overlay) ok('video-popup opens lightbox');
  else fail('video-popup opens lightbox', 'overlay not found');
});

await br.close();
if (failures > 0) { console.log(`\n${failures} FAILURES`); process.exit(1); }
else console.log('\nALL PASS');

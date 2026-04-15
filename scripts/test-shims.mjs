#!/usr/bin/env node
/** Verify mobile-nav, search, dropdown, video-popup, and link rewriting
 *  against the local preview. Exits non-zero on any failure. */
import { chromium } from 'playwright';

const BASE = 'http://127.0.0.1:4175/valtoris-international/';
const br = await chromium.launch();
let failures = 0;
const ok = (label) => console.log(`  [OK] ${label}`);
const fail = (label, info) => { failures++; console.log(`  [FAIL] ${label} :: ${info}`); };

async function test(viewport, fn) {
  const ctx = await br.newContext({ viewport });
  const p = await ctx.newPage();
  try { await fn(p); } finally { await ctx.close(); }
}

// 1. Mobile nav toggle
console.log('\n=== MOBILE NAV TOGGLE (375) ===');
await test({ width: 375, height: 812 }, async (p) => {
  await p.goto(BASE, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(3000);
  const before = await p.evaluate(() => document.querySelector('.mobile-nav__wrapper')?.className);
  await p.click('.mobile-nav__toggler:visible');
  await p.waitForTimeout(600);
  const after = await p.evaluate(() => document.querySelector('.mobile-nav__wrapper')?.className);
  if (after?.includes('expanded') && !before?.includes('expanded')) ok('hamburger opens panel');
  else fail('hamburger opens panel', `before="${before}" after="${after}"`);

  // Close via .mobile-nav__close
  await p.click('.mobile-nav__wrapper .mobile-nav__close').catch(() => {});
  await p.waitForTimeout(600);
  const closed = await p.evaluate(() => document.querySelector('.mobile-nav__wrapper')?.className);
  if (!closed?.includes('expanded')) ok('close icon closes panel');
  else fail('close icon closes panel', closed);

  // Test mobile dropdown
  await p.click('.mobile-nav__toggler:visible');
  await p.waitForTimeout(600);
  const dropBefore = await p.evaluate(() => {
    const li = document.querySelector('.mobile-nav__container .menu-item-has-children');
    const sub = li?.querySelector(':scope > ul');
    return sub ? getComputedStyle(sub).display : null;
  });
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
  if (dropBefore === 'none' && dropAfter === 'block') ok('dropdown submenu expands on click');
  else fail('dropdown submenu expands', `before=${dropBefore} after=${dropAfter}`);
});

// 2. Search popup (desktop)
console.log('\n=== SEARCH POPUP (1440) ===');
await test({ width: 1440, height: 900 }, async (p) => {
  await p.goto(BASE, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(3000);
  const before = await p.evaluate(() => document.querySelector('.search-popup')?.className);
  // Click the first .search-toggler that's NOT inside the popup (that's the overlay)
  const debugInfo = await p.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('.search-toggler'));
    const trigger = btns.find(b => !b.closest('.search-popup'));
    if (!trigger) return 'no trigger found';
    const popupBefore = document.querySelector('.search-popup')?.className;
    trigger.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    const popupAfter = document.querySelector('.search-popup')?.className;
    return { togglerCount: btns.length, triggerCls: trigger.className, popupBefore, popupAfter };
  });
  console.log('  [DEBUG]', JSON.stringify(debugInfo));
  await p.waitForTimeout(500);
  const after = await p.evaluate(() => document.querySelector('.search-popup')?.className);
  if (after?.includes('active') && !before?.includes('active')) ok('search-toggler opens popup');
  else fail('search-toggler opens popup', `before="${before}" after="${after}"`);

  // Close via overlay (search-toggler inside popup)
  await p.evaluate(() => {
    const overlay = document.querySelector('.search-popup .search-popup__overlay');
    if (overlay) overlay.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  });
  await p.waitForTimeout(400);
  const closed = await p.evaluate(() => document.querySelector('.search-popup')?.className);
  if (!closed?.includes('active')) ok('overlay closes popup');
  else fail('overlay closes popup', closed);
});

// 3. Internal link BASE-prefixing — Suppliers button
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
  if (!href) fail('find Suppliers button', 'not found');
  else if (href.href?.startsWith('/valtoris-international/contact-us')) ok(`Suppliers href rewritten: ${href.href} target=${href.target}`);
  else fail('Suppliers href rewritten', JSON.stringify(href));
});

// 4. Video popup lightbox
console.log('\n=== VIDEO POPUP ===');
await test({ width: 1440, height: 900 }, async (p) => {
  await p.goto(BASE, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(3000);
  const hasBtn = await p.evaluate(() => !!document.querySelector('a.video-popup, a.video-button'));
  if (!hasBtn) { ok('no video-popup button on home (skip)'); return; }
  await p.evaluate(() => document.querySelector('a.video-popup, a.video-button')?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })));
  await p.waitForTimeout(500);
  const overlay = await p.evaluate(() => !!document.querySelector('.vi-video-lightbox'));
  if (overlay) ok('video-popup opens lightbox');
  else fail('video-popup opens lightbox', 'overlay not found');
  await p.keyboard.press('Escape');
  await p.waitForTimeout(400);
  const gone = await p.evaluate(() => !document.querySelector('.vi-video-lightbox'));
  if (gone) ok('Escape closes lightbox');
  else fail('Escape closes lightbox', 'still present');
});

// 5. All nav links resolve to pages that load
console.log('\n=== NAV LINK ROUTES ===');
await test({ width: 1440, height: 900 }, async (p) => {
  await p.goto(BASE, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1000);
  const links = await p.evaluate(() =>
    Array.from(document.querySelectorAll('a[href^="/valtoris-international/"]'))
      .map(a => a.getAttribute('href'))
      .filter((h, i, arr) => h && arr.indexOf(h) === i)
      .slice(0, 20)
  );
  const seen = new Map();
  for (const h of links) {
    const u = new URL(h, BASE).toString();
    try {
      const r = await fetch(u);
      seen.set(h, r.status);
    } catch (e) { seen.set(h, 'ERR ' + e.message); }
  }
  for (const [h, s] of seen) console.log(`    ${s} ${h}`);
  if ([...seen.values()].every(s => s === 200)) ok('all nav links return 200');
  else fail('all nav links return 200', JSON.stringify([...seen.entries()]));
});

await br.close();
if (failures > 0) { console.log(`\n${failures} FAILURES`); process.exit(1); }
else console.log('\nALL PASS');

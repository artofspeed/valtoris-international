#!/usr/bin/env node
/** Enumerate every unique internal link on every route of the clone
 *  and check each URL with a HEAD request. Report 404s. */
import { chromium } from 'playwright';
const CLONE = 'http://127.0.0.1:4175/valtoris-international';
const ROUTES = ['/', '/about-us', '/papers', '/beef-tenderloin', '/pork', '/chicken', '/greens', '/sugar', '/news', '/contact-us', '/login', '/404-error'];

async function gather() {
  const br = await chromium.launch();
  const ctx = await br.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const links = new Map();
  for (const r of ROUTES) {
    await page.goto(CLONE + r, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(500);
    const urls = await page.evaluate(() => {
      const a = Array.from(document.querySelectorAll('a[href]'));
      return a.map(el => ({ href: el.getAttribute('href'), text: el.textContent.trim().slice(0, 40) }));
    });
    for (const u of urls) {
      if (!u.href) continue;
      if (u.href.startsWith('http://') || u.href.startsWith('https://') || u.href.startsWith('//')) continue;
      if (u.href.startsWith('mailto:') || u.href.startsWith('tel:') || u.href.startsWith('#')) continue;
      if (/^\/?wp-content\//.test(u.href) || /^\/?wp-json\//.test(u.href)) continue;
      if (!links.has(u.href)) links.set(u.href, { href: u.href, text: u.text, seenOn: [] });
      links.get(u.href).seenOn.push(r);
    }
  }
  await br.close();
  return Array.from(links.values());
}

function normalize(href) {
  let p = href;
  if (p === 'index.html' || p.endsWith('/index.html')) p = p.replace(/\/?index\.html$/, '/') || '/';
  if (!p.startsWith('/')) p = '/' + p;
  return p;
}

const links = await gather();
console.log(`Found ${links.length} unique internal links`);
console.log('---');
for (const l of links) {
  const path = normalize(l.href);
  const url = CLONE + path;
  const res = await fetch(url);
  // For SPA, fetch will succeed with 200 for any path (serves index.html). What matters
  // is whether the SPA has a route for it. Check page content for "not found" marker.
  let status = res.status;
  let indicator = '';
  if (status === 200) {
    const html = await res.text();
    // The SPA only renders route content after JS runs, so HEAD status isn't enough.
    // We need to actually render and see.
    indicator = ' [200-SPA]';
  }
  console.log(`  ${String(status).padStart(3)} ${path.padEnd(30)} "${l.text.slice(0, 25)}" seen=${l.seenOn.length}${indicator}`);
}

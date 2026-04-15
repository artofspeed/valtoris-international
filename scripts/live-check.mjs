#!/usr/bin/env node
/**
 * Live-site smoke test: drives a real headless Chromium against the deployed
 * GitHub Pages URL, visits every route, waits for the SPA to mount, and
 * verifies meaningful text is present. Also asserts no JS errors fired.
 */
import { chromium } from 'playwright';

const BASE = process.env.LIVE_BASE || 'https://artofspeed.github.io/valtoris-international';

const ROUTES = [
  { slug: 'home',        route: '/',                   mustContain: ['valtoris'] },
  { slug: 'about',       route: '/about-us',           mustContain: ['valtoris'] },
  { slug: 'papers',      route: '/papers',             mustContain: ['papers'] },
  { slug: 'beef',        route: '/beef-tenderloin',    mustContain: ['beef'] },
  { slug: 'pork',        route: '/pork',               mustContain: ['pork'] },
  { slug: 'chicken',     route: '/chicken',            mustContain: ['chicken'] },
  { slug: 'greens',      route: '/greens',             mustContain: ['greens'] },
  { slug: 'sugar',       route: '/sugar',              mustContain: ['sugar'] },
  { slug: 'news',        route: '/news',               mustContain: ['news'] },
  { slug: 'contact',     route: '/contact-us',         mustContain: ['contact'] },
  { slug: 'login',       route: '/login',              mustContain: [] },
  { slug: 'notFound',    route: '/404-error',          mustContain: [] },
  { slug: 'newsCmc2025', route: '/valtoris-attends-canadian-meat-council-annual-conference-2025', mustContain: ['canadian', 'meat'] },
];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, ignoreHTTPSErrors: true });
let failed = 0;
for (const { slug, route, mustContain } of ROUTES) {
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  try {
    await page.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('[data-vi-static-page]', { timeout: 15000 });
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    const text = (await page.textContent('body')).toLowerCase();
    const missing = mustContain.filter((w) => !text.includes(w.toLowerCase()));
    const ok = missing.length === 0 && errors.length === 0;
    const finalUrl = page.url();
    console.log(`  ${ok ? 'OK  ' : 'FAIL'} ${slug.padEnd(14)} ${route.padEnd(70)} final=${finalUrl.replace(BASE, '')}`);
    if (missing.length) console.log('       missing keywords:', missing);
    if (errors.length) console.log('       page errors:', errors);
    if (!ok) failed++;
  } catch (err) {
    console.log(`  FAIL ${slug.padEnd(14)} ${route}  ERROR ${err.message}`);
    failed++;
  }
  await page.close();
}
await browser.close();
console.log(`\n${failed === 0 ? 'All' : failed + ' of ' + ROUTES.length} route(s) failed.`);
process.exit(failed === 0 ? 0 : 1);

#!/usr/bin/env node
/** Take full-page screenshots of every route at mobile (375) and desktop (1440)
 *  widths. Writes into /tmp/audit-shots/{viewport}/{route}.png. */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

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
const viewports = [
  { w: 375, h: 812, label: 'mobile' },
  { w: 1440, h: 900, label: 'desktop' },
];

for (const vp of viewports) {
  mkdirSync(`/tmp/audit-shots/${vp.label}`, { recursive: true });
  const ctx = await br.newContext({ viewport: { width: vp.w, height: vp.h } });
  const p = await ctx.newPage();
  for (const route of routes) {
    await p.goto(BASE + route, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(3500);
    const slug = route === '/' ? 'home' : route.replace(/\/$/, '').replace(/^\//, '').replace(/\//g, '_');
    const path = `/tmp/audit-shots/${vp.label}/${slug}.png`;
    await p.screenshot({ path, fullPage: true });
    console.log(`${vp.label} ${route} -> ${path}`);
  }
  await ctx.close();
}
await br.close();
console.log('\nDone.');

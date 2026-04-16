#!/usr/bin/env node
/** Screenshot each route in viewport-sized chunks (scroll through) so each
 *  section is legible at Claude's display resolution. */
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

for (const vp of [{ w: 375, h: 812, label: 'mobile' }, { w: 1440, h: 900, label: 'desktop' }]) {
  mkdirSync(`/tmp/audit-chunks/${vp.label}`, { recursive: true });
  const ctx = await br.newContext({ viewport: { width: vp.w, height: vp.h } });
  const p = await ctx.newPage();
  for (const route of routes) {
    await p.goto(BASE + route, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(3000);
    const slug = route === '/' ? 'home' : route.replace(/\/$/, '').replace(/^\//, '').replace(/\//g, '_');
    const totalH = await p.evaluate(() => document.documentElement.scrollHeight);
    const step = vp.h - 100; // overlap by 100px between chunks
    let idx = 0;
    for (let y = 0; y < totalH; y += step) {
      await p.evaluate((sy) => window.scrollTo(0, sy), y);
      await p.waitForTimeout(400);
      const path = `/tmp/audit-chunks/${vp.label}/${slug}__${String(idx).padStart(2, '0')}.png`;
      await p.screenshot({ path, fullPage: false });
      idx++;
    }
    console.log(`${vp.label} ${route}: ${idx} chunks (total ${totalH}px)`);
  }
  await ctx.close();
}
await br.close();
console.log('Done.');

#!/usr/bin/env node
import { chromium } from 'playwright';

async function probe(url) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, ignoreHTTPSErrors: true });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
  // Force-scroll to load everything
  const h0 = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let yy = 0; yy < h0; yy += 400) {
    await page.evaluate((y2) => window.scrollTo(0, y2), yy);
    await page.waitForTimeout(60);
  }
  await page.evaluate(() => window.scrollTo(0, 900));
  await page.waitForTimeout(500);
  const info = await page.evaluate(() => {
    const hs = document.querySelectorAll('header');
    const out = [];
    for (const h of hs) {
      const cs = getComputedStyle(h);
      const r = h.getBoundingClientRect();
      out.push({
        cls: h.className,
        pos: cs.position, top: cs.top, zIndex: cs.zIndex,
        rect: { top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height) },
        vis: cs.visibility, transform: cs.transform,
      });
    }
    return out;
  });
  console.log(url);
  console.log(JSON.stringify(info, null, 2));
  await browser.close();
}

await probe('https://valtorisinternational.com/');
console.log('\n=====\n');
await probe('http://127.0.0.1:4175/valtoris-international/');

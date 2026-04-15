#!/usr/bin/env node
/** Snap a specific content band on both orig and clone. */
import { chromium } from 'playwright';

async function snap(url, out, selector) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, ignoreHTTPSErrors: true });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let yy = 0; yy < h; yy += 400) {
    await page.evaluate((y2) => window.scrollTo(0, y2), yy);
    await page.waitForTimeout(70);
  }
  const info = await page.evaluate((s) => {
    const e = document.querySelector(s);
    if (!e) return null;
    e.scrollIntoView({ block: 'start', behavior: 'instant' });
    const r = e.getBoundingClientRect();
    return { top: r.top, height: r.height };
  }, selector);
  if (!info) { console.log(`${out}: selector not found ${selector}`); await browser.close(); return; }
  // Nudge scroll up so element top sits ~40px below viewport top (gives a little padding)
  await page.evaluate(() => window.scrollBy(0, -40));
  await page.waitForTimeout(500);
  const finalTop = await page.evaluate((s) => {
    const r = document.querySelector(s).getBoundingClientRect();
    return r.top;
  }, selector);
  const viewY = Math.max(0, Math.floor(finalTop - 5));
  const clipH = Math.max(50, Math.min(895 - viewY, Math.floor(info.height + 10)));
  await page.screenshot({ path: out, clip: { x: 0, y: viewY, width: 1440, height: clipH } });
  console.log(`${out}  finalTop=${Math.round(finalTop)} height=${Math.round(info.height)} clipH=${clipH}`);
  await browser.close();
}

const target = process.argv[2] || 'why';
const TARGETS = {
  why: '.why-choose-one',
  news: '.blog-one',
  testimonials: '.testimonials-one',
  recycled: '.elementor-element-763efd6',
  products: '.products-carousel',
  clients: '.client-carousel__one',
  hero: '.hero-slider-one',
};
const sel = TARGETS[target] || target;
await snap('https://valtorisinternational.com/', `/tmp/${target}-orig.png`, sel);
await snap('http://127.0.0.1:4175/valtoris-international/', `/tmp/${target}-clone.png`, sel);

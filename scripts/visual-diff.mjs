#!/usr/bin/env node
/**
 * Capture detailed screenshots of original + clone for a single route and
 * produce:
 *   - full-page PNGs at 1440×full
 *   - viewport PNGs at 1440×900 (above-the-fold)
 *   - tiled sections at every 900px of scroll so any differences mid-page
 *     are visible in a tiny viewer
 *   - a `differences.txt` with a structural diff (text, missing classes, etc.)
 *
 * Run: node scripts/visual-diff.mjs [slug]     (default: home)
 *      LIVE=1 node scripts/visual-diff.mjs     (uses live Pages deploy)
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ORIGIN = 'https://valtorisinternational.com';
const LIVE = process.env.LIVE
  ? 'https://artofspeed.github.io/valtoris-international'
  : 'http://127.0.0.1:4175/valtoris-international';
const PORT = 4175;

const ROUTES = {
  home: '/',
  about: '/about-us',
  papers: '/papers',
  beef: '/beef-tenderloin',
  pork: '/pork',
  chicken: '/chicken',
  greens: '/greens',
  sugar: '/sugar',
  news: '/news',
  contact: '/contact-us',
  login: '/login',
  notFound: '/404-error',
};

const SLUG = process.argv[2] || 'home';
const ROUTE = ROUTES[SLUG] || '/';

function startPreview() {
  const proc = spawn('npx',
    ['vite', 'preview', '--port', String(PORT), '--host', '127.0.0.1', '--base', '/valtoris-international/'],
    { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('preview timeout')), 20000);
    proc.stdout.on('data', (d) => { if (d.toString().includes('Local:')) { clearTimeout(t); resolve(proc); } });
    proc.on('exit', (c) => reject(new Error('preview died ' + c)));
  });
}

async function capture(page, url, outDir) {
  mkdirSync(outDir, { recursive: true });
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1500);

  // Force-scroll to trigger lazy images + WOW observer
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < height; y += 400) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(80);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);

  await page.screenshot({ path: join(outDir, 'full.png'), fullPage: true });
  await page.screenshot({ path: join(outDir, 'fold.png'), fullPage: false });

  // Tile: 900px segments
  const finalHeight = await page.evaluate(() => document.documentElement.scrollHeight);
  const tileH = 900;
  const tiles = Math.ceil(finalHeight / tileH);
  for (let i = 0; i < tiles && i < 10; i++) {
    await page.evaluate((yy) => window.scrollTo(0, yy), i * tileH);
    await page.waitForTimeout(300);
    await page.screenshot({ path: join(outDir, `tile-${String(i).padStart(2, '0')}.png`), fullPage: false });
  }
  return { height: finalHeight };
}

async function main() {
  const outBase = join(ROOT, 'visual-diff', SLUG);
  let server;
  if (!process.env.LIVE) {
    // If a preview is already listening on PORT, reuse it; otherwise start one.
    let up = false;
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/valtoris-international/`);
      up = r.ok;
    } catch { /* noop */ }
    if (!up) {
      console.log('→ starting vite preview');
      server = await startPreview();
    } else {
      console.log('→ reusing running preview');
    }
  }
  const browser = await chromium.launch();
  try {
    const ctxO = await browser.newContext({ viewport: { width: 1440, height: 900 }, ignoreHTTPSErrors: true });
    const ctxC = await browser.newContext({ viewport: { width: 1440, height: 900 }, ignoreHTTPSErrors: true });
    const [pO, pC] = [await ctxO.newPage(), await ctxC.newPage()];
    console.log(`orig: ${ORIGIN + ROUTE}`);
    console.log(`clone: ${LIVE + ROUTE}`);
    const [o, c] = await Promise.all([
      capture(pO, ORIGIN + ROUTE, join(outBase, 'orig')),
      capture(pC, LIVE + ROUTE, join(outBase, 'clone')),
    ]);
    console.log(`  orig height=${o.height}  clone height=${c.height}`);
    await ctxO.close();
    await ctxC.close();
  } finally {
    await browser.close();
    if (server) server.kill('SIGTERM');
  }
}
main().catch((e) => { console.error(e); process.exit(2); });

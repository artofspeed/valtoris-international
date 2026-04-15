#!/usr/bin/env node
/**
 * Side-by-side fidelity comparison.
 *
 * For each route:
 *   1. Open the ORIGINAL page (https://valtorisinternational.com/...)
 *   2. Open the CLONE page (local Vite preview by default, or LIVE_BASE)
 *   3. Measure:
 *      - images that actually loaded (naturalWidth > 0)
 *      - 404/failed network responses (same-origin)
 *      - visible text word overlap
 *      - DOM element count
 *   4. Save full-page screenshots to ./compare-screens/<route>-{orig,clone}.png
 *
 * Run:
 *   node scripts/side-by-side.mjs                 # clone=http://127.0.0.1:4175/valtoris-international
 *   LIVE_BASE=https://artofspeed.github.io/valtoris-international \
 *     node scripts/side-by-side.mjs
 *   ONLY=home,beef node scripts/side-by-side.mjs  # run a subset
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT = join(ROOT, 'compare-screens');
mkdirSync(OUT, { recursive: true });

const ORIGIN = 'https://valtorisinternational.com';
const CLONE = process.env.LIVE_BASE || 'http://127.0.0.1:4175/valtoris-international';
const PORT = 4175;
const USE_LOCAL = !process.env.LIVE_BASE;
const ONLY = (process.env.ONLY || '').split(',').filter(Boolean);

const ROUTES = [
  { slug: 'home',        route: '/' },
  { slug: 'about',       route: '/about-us' },
  { slug: 'papers',      route: '/papers' },
  { slug: 'beef',        route: '/beef-tenderloin' },
  { slug: 'pork',        route: '/pork' },
  { slug: 'chicken',     route: '/chicken' },
  { slug: 'greens',      route: '/greens' },
  { slug: 'sugar',       route: '/sugar' },
  { slug: 'news',        route: '/news' },
  { slug: 'contact',     route: '/contact-us' },
  { slug: 'login',       route: '/login' },
  { slug: 'notFound',    route: '/404-error' },
  { slug: 'newsCmc2025', route: '/valtoris-attends-canadian-meat-council-annual-conference-2025' },
].filter((r) => !ONLY.length || ONLY.includes(r.slug));

function startPreview() {
  const proc = spawn(
    'npx',
    ['vite', 'preview', '--port', String(PORT), '--host', '127.0.0.1', '--base', '/valtoris-international/'],
    { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] },
  );
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('preview start timeout')), 20000);
    proc.stdout.on('data', (d) => {
      if (d.toString().includes('Local:')) { clearTimeout(t); resolve(proc); }
    });
    proc.on('exit', (c) => reject(new Error('preview exited code=' + c)));
  });
}

function wordBag(text) {
  return new Set(
    (text || '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .split(' ')
      .filter((w) => w.length > 3 && /[a-z]/.test(w)),
  );
}

async function inspect(page, url, screenPath) {
  const failed = [];
  const requests = { total: 0, ok: 0, fail: 0 };
  page.on('response', (resp) => {
    requests.total++;
    if (resp.status() >= 400) {
      requests.fail++;
      failed.push({ status: resp.status(), url: resp.url() });
    } else requests.ok++;
  });
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));

  const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  // Wait for images/fonts
  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(800); // let lazy-loaded items settle

  const imgStats = await page.$$eval('img', (imgs) => {
    const total = imgs.length;
    const loaded = imgs.filter((i) => i.complete && i.naturalWidth > 0).length;
    const broken = imgs
      .filter((i) => i.complete && i.naturalWidth === 0)
      .map((i) => i.currentSrc || i.src)
      .slice(0, 10);
    return { total, loaded, broken };
  });
  const domCount = await page.evaluate(() =>
    document.querySelectorAll('body *:not(script):not(style):not(noscript):not(link)').length,
  );
  const text = await page.evaluate(() => {
    // Collect only user-visible text (skip script, style, noscript, template)
    const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE']);
    function walk(node, out) {
      if (!node) return;
      if (node.nodeType === Node.TEXT_NODE) { out.push(node.nodeValue); return; }
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      if (SKIP.has(node.nodeName)) return;
      for (const child of node.childNodes) walk(child, out);
    }
    const out = [];
    walk(document.body, out);
    return out.join(' ');
  });
  const title = await page.title();
  try {
    await page.screenshot({ path: screenPath, fullPage: true, timeout: 15000 });
  } catch (err) {
    console.warn('    screenshot failed:', err.message);
  }
  return {
    status: resp?.status() || 0,
    url: page.url(),
    title,
    requests,
    failed: failed.slice(0, 20),
    imgStats,
    domCount,
    text,
    pageErrors,
  };
}

async function main() {
  let server;
  if (USE_LOCAL) {
    console.log('→ starting vite preview…');
    server = await startPreview();
  }
  const browser = await chromium.launch();
  const report = [];
  try {
    for (const { slug, route } of ROUTES) {
      console.log(`\n=== ${slug}  ${route} ===`);
      const ctxO = await browser.newContext({ viewport: { width: 1440, height: 900 }, ignoreHTTPSErrors: true });
      const ctxC = await browser.newContext({ viewport: { width: 1440, height: 900 }, ignoreHTTPSErrors: true });
      const pO = await ctxO.newPage();
      const pC = await ctxC.newPage();
      const [orig, clone] = await Promise.all([
        inspect(pO, ORIGIN + route, join(OUT, `${slug}-orig.png`)),
        inspect(pC, CLONE + route, join(OUT, `${slug}-clone.png`)),
      ]);
      await ctxO.close();
      await ctxC.close();

      const wO = wordBag(orig.text);
      const wC = wordBag(clone.text);
      const overlap = [...wO].filter((w) => wC.has(w)).length;
      const textCov = wO.size === 0 ? 1 : overlap / wO.size;
      const missingText = [...wO].filter((w) => !wC.has(w)).slice(0, 12);

      const entry = {
        slug,
        route,
        orig: { status: orig.status, title: orig.title, images: `${orig.imgStats.loaded}/${orig.imgStats.total}`, dom: orig.domCount, failed: orig.requests.fail },
        clone: { status: clone.status, title: clone.title, images: `${clone.imgStats.loaded}/${clone.imgStats.total}`, dom: clone.domCount, failed: clone.requests.fail, brokenSample: clone.imgStats.broken.slice(0, 5), failedSample: clone.failed.slice(0, 5), pageErrors: clone.pageErrors.slice(0, 5) },
        textCoverage: +textCov.toFixed(3),
        missingTextSample: missingText,
      };
      report.push(entry);
      console.log(`  orig:  ${orig.status}  imgs=${orig.imgStats.loaded}/${orig.imgStats.total}  dom=${orig.domCount}  title="${orig.title}"`);
      console.log(`  clone: ${clone.status}  imgs=${clone.imgStats.loaded}/${clone.imgStats.total}  dom=${clone.domCount}  title="${clone.title}"`);
      console.log(`  text overlap: ${(textCov * 100).toFixed(1)}%`);
      if (clone.imgStats.broken.length) console.log('    broken imgs (sample):', clone.imgStats.broken.slice(0, 3));
      if (clone.failed.length) console.log('    http failures (sample):', clone.failed.slice(0, 3).map((f) => `${f.status} ${f.url.slice(0, 120)}`));
      if (clone.pageErrors.length) console.log('    page JS errors:', clone.pageErrors.slice(0, 2));
    }
  } finally {
    await browser.close();
    if (server) server.kill('SIGTERM');
  }
  writeFileSync(join(ROOT, 'compare-report.json'), JSON.stringify(report, null, 2));
  console.log('\nReport: compare-report.json');
  console.log('Screens: compare-screens/');
}

main().catch((e) => { console.error(e); process.exit(2); });

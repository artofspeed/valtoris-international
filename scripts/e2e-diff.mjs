#!/usr/bin/env node
/**
 * E2E fidelity diff: launches the Vite preview server, renders each route in
 * headless Chromium, and compares visible text content + asset references
 * against the original site's mirrored HTML.
 *
 * Pixel-perfect screenshot diffing is impractical because the origin is
 * flaky (503s) and some assets are served from cross-origin CDNs that may
 * lazy-load. This check focuses on what we control: does our route render,
 * does it include the right text, does it reference the same images?
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as cheerio from 'cheerio';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const MIRROR = '/tmp/vmirror/valtorisinternational.com';
const PORT = 4175;
const BASE = `http://127.0.0.1:${PORT}`;

const ROUTES = [
  { slug: 'home',        route: '/',                   src: 'index.html' },
  { slug: 'about',       route: '/about-us',           src: 'about-us/index.html' },
  { slug: 'papers',      route: '/papers',             src: 'papers/index.html' },
  { slug: 'beef',        route: '/beef-tenderloin',    src: 'beef-tenderloin/index.html' },
  { slug: 'pork',        route: '/pork',               src: 'pork/index.html' },
  { slug: 'chicken',     route: '/chicken',            src: 'chicken/index.html' },
  { slug: 'greens',      route: '/greens',             src: 'greens/index.html' },
  { slug: 'sugar',       route: '/sugar',              src: 'sugar/index.html' },
  { slug: 'news',        route: '/news',               src: 'news/index.html' },
  { slug: 'contact',     route: '/contact-us',         src: 'contact-us/index.html' },
  { slug: 'login',       route: '/login',              src: 'login/index.html' },
  { slug: 'notFound',    route: '/404-error',          src: '404-error/index.html' },
  { slug: 'newsCmc2025', route: '/valtoris-attends-canadian-meat-council-annual-conference-2025', src: 'valtoris-attends-canadian-meat-council-annual-conference-2025/index.html' },
];

/** Collapse whitespace + lowercase to compare "is this the same text?" */
function normalize(s) {
  return (s || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

/** Get visible text words from cheerio-parsed HTML. */
function textBagFromHtml(html) {
  const $ = cheerio.load(html);
  $('script, style, noscript').remove();
  const txt = normalize($('body').text());
  return new Set(txt.split(' ').filter(w => w.length > 2));
}

function previewServer() {
  const proc = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--host', '127.0.0.1'], {
    cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'],
  });
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('preview server start timed out')), 15000);
    proc.stdout.on('data', (d) => {
      if (d.toString().includes('Local:')) { clearTimeout(t); resolve(proc); }
    });
    proc.stderr.on('data', (d) => process.stderr.write('[preview stderr] ' + d));
    proc.on('exit', (code) => reject(new Error('preview exited early code=' + code)));
  });
}

async function main() {
  console.log('→ starting preview server…');
  const server = await previewServer();
  try {
    const browser = await chromium.launch();
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    page.on('pageerror', (err) => console.warn('  [pageerror]', err.message));
    page.on('requestfailed', (req) => {
      const url = req.url();
      // Ignore cross-origin asset failures (fonts, reCAPTCHA)
      if (!url.startsWith(BASE)) return;
      console.warn('  [requestfailed]', req.failure()?.errorText, url);
    });

    const results = [];
    for (const { slug, route, src } of ROUTES) {
      const url = BASE + route;
      const originalHtml = readFileSync(join(MIRROR, src), 'utf-8');
      const expectedWords = textBagFromHtml(originalHtml);

      const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      const status = resp?.status() || 0;
      // Wait for the SPA to mount — the StaticPage wrapper carries this attr.
      try {
        await page.waitForSelector('[data-vi-static-page]', { timeout: 10000 });
      } catch {
        // Fall through — we'll catch the miss in the diff below.
      }
      // Give Elementor's inlined styles + images a beat to resolve.
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
      const html = await page.content();
      const actualWords = textBagFromHtml(html);

      // Which expected words are missing from the rendered page?
      const missing = [];
      for (const w of expectedWords) if (!actualWords.has(w)) missing.push(w);
      const coverage = expectedWords.size === 0 ? 1
        : (expectedWords.size - missing.length) / expectedWords.size;

      // Asset reference coverage
      const $o = cheerio.load(originalHtml);
      const expectedImgs = new Set();
      $o('img').each((_, el) => {
        const s = $o(el).attr('src');
        if (s && s.includes('wp-content/uploads')) {
          // Extract just the filename — the path may be absolute or relative
          const m = s.match(/wp-content\/uploads\/[^?#"\s)]+/);
          if (m) expectedImgs.add(m[0]);
        }
      });
      const actualImgRefs = await page.$$eval('img', (imgs) =>
        imgs.map((i) => i.getAttribute('src') || i.currentSrc || '')
      );
      const actualImgs = new Set();
      for (const s of actualImgRefs) {
        const m = s.match(/wp-content\/uploads\/[^?#"\s)]+/);
        if (m) actualImgs.add(m[0]);
      }
      const imgMissing = [...expectedImgs].filter((s) => !actualImgs.has(s));
      const imgCoverage = expectedImgs.size === 0 ? 1
        : (expectedImgs.size - imgMissing.length) / expectedImgs.size;

      const pass = status === 200 && coverage >= 0.92 && imgCoverage >= 0.90;
      results.push({ slug, status, textCoverage: coverage, imgCoverage, expectedWordCount: expectedWords.size, missingSample: missing.slice(0, 8), expectedImgCount: expectedImgs.size, missingImgSample: imgMissing.slice(0, 5), pass });
      console.log(
        `  ${pass ? 'OK ' : 'WARN'} ${slug.padEnd(14)} status=${status} text=${(coverage*100).toFixed(1)}% imgs=${(imgCoverage*100).toFixed(1)}% (${expectedWords.size} words, ${expectedImgs.size} imgs)`
      );
      if (!pass && missing.length) console.log('     missing words:', missing.slice(0, 5).join(', '));
      if (!pass && imgMissing.length) console.log('     missing imgs:', imgMissing.slice(0, 3).join(', '));
    }

    await browser.close();

    const failed = results.filter((r) => !r.pass);
    const summary = {
      total: results.length,
      passed: results.length - failed.length,
      failed: failed.length,
      results,
    };
    const outFile = join(ROOT, 'e2e-diff-report.json');
    const fs = await import('node:fs');
    fs.writeFileSync(outFile, JSON.stringify(summary, null, 2));
    console.log(`\nReport: ${outFile}`);
    console.log(`Summary: ${summary.passed}/${summary.total} pages passed`);
    if (failed.length) process.exit(1);
  } finally {
    server.kill('SIGTERM');
  }
}

main().catch((err) => { console.error(err); process.exit(2); });

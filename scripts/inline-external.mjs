#!/usr/bin/env node
/**
 * Downloads every external URL referenced inside public/wp-content/**\/*.css
 * files, saves them under public/wp-content/ext/<host>/<path>, and rewrites
 * the CSS so the references point to the local copies. Eliminates CORS-blocked
 * font loads and third-party image dependencies.
 *
 * Run: node scripts/inline-external.mjs
 */
import { readdir, readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { request } from 'node:https';
import { URL } from 'node:url';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ASSET_ROOT = join(ROOT, 'public', 'wp-content');
const EXT_ROOT = join(ASSET_ROOT, 'ext');

// Scan css+html files under a root
async function walk(dir, out = []) {
  for (const ent of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) await walk(p, out);
    else out.push(p);
  }
  return out;
}

// Download one URL, following redirects. Returns Buffer.
function download(url, redirectsLeft = 5) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = request(
      {
        host: u.host,
        path: u.pathname + u.search,
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (valtoris-clone asset-inliner)',
          Accept: '*/*',
        },
      },
      (res) => {
        if ([301, 302, 303, 307, 308].includes(res.statusCode || 0) && res.headers.location && redirectsLeft > 0) {
          const next = new URL(res.headers.location, url).toString();
          res.resume();
          resolve(download(next, redirectsLeft - 1));
          return;
        }
        if ((res.statusCode || 0) >= 400) {
          res.resume();
          reject(new Error(`HTTP ${res.statusCode} for ${url}`));
          return;
        }
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
      },
    );
    req.on('error', reject);
    req.end();
  });
}

function localPathFor(extUrl) {
  const u = new URL(extUrl);
  // ext/<host>/<path>
  return join(EXT_ROOT, u.host, decodeURIComponent(u.pathname));
}

function localRefFor(extUrl) {
  // Path used inside CSS, relative to the CSS file's location isn't worth
  // computing per-CSS — use an absolute wp-content/ path so our runtime
  // BASE_URL rewrite handles it.
  const u = new URL(extUrl);
  return `wp-content/ext/${u.host}${u.pathname}`;
}

async function exists(p) { try { await stat(p); return true; } catch { return false; } }

async function main() {
  const cssFiles = (await walk(ASSET_ROOT)).filter((p) => p.includes('/css/') || p.endsWith('.css') || /\.css(\?|$)/.test(p));
  console.log(`scanning ${cssFiles.length} CSS files`);

  const toFetch = new Map(); // extUrl -> localPath
  for (const cssPath of cssFiles) {
    const css = await readFile(cssPath, 'utf-8').catch(() => '');
    if (!css) continue;
    // url(...) and src: url(...) — both absolute http(s) only
    const re = /url\(\s*["']?\s*(https?:\/\/[^)"'\s]+)\s*["']?\s*\)/g;
    let m;
    while ((m = re.exec(css))) {
      const extUrl = m[1];
      if (extUrl.startsWith('data:')) continue;
      if (!toFetch.has(extUrl)) toFetch.set(extUrl, localPathFor(extUrl));
    }
  }
  console.log(`found ${toFetch.size} unique external URLs in CSS`);

  // Download what we don't have
  let ok = 0, fail = 0, skipped = 0;
  for (const [url, local] of toFetch) {
    if (await exists(local)) { skipped++; continue; }
    try {
      const buf = await download(url);
      await mkdir(dirname(local), { recursive: true });
      await writeFile(local, buf);
      ok++;
      if (ok % 10 === 0) console.log(`  downloaded ${ok}/${toFetch.size}…`);
    } catch (err) {
      fail++;
      console.warn(`  FAIL ${url}\n       ${err.message}`);
    }
  }
  console.log(`downloads: ok=${ok} fail=${fail} skipped=${skipped}`);

  // Now rewrite CSS — use paths RELATIVE to the CSS file. Relative paths
  // resolve against the CSS file's own URL, which means they work regardless
  // of what base path the site is hosted at (/, /valtoris-international/, ...).
  const { relative } = await import('node:path');
  let rewritten = 0;
  for (const cssPath of cssFiles) {
    const before = await readFile(cssPath, 'utf-8').catch(() => '');
    if (!before) continue;
    let after = before.replace(
      /url\(\s*(["']?)\s*(https?:\/\/[^)"'\s]+)\s*(["']?)\s*\)/g,
      (_m, q1, url, q2) => {
        if (!toFetch.has(url)) return _m;
        const targetAbs = toFetch.get(url); // absolute filesystem path under public/wp-content/ext/
        let rel = relative(dirname(cssPath), targetAbs).split(/[\\/]+/).join('/');
        return `url(${q1}${rel}${q2})`;
      },
    );
    // Also fix any `/wp-content/ext/<host>/<path>` absolute refs left by a
    // previous run — convert them to paths relative to this CSS file.
    after = after.replace(
      /url\(\s*(["']?)\s*\/wp-content\/ext\/([^)"'\s]+)\s*(["']?)\s*\)/g,
      (_m, q1, tail, q2) => {
        const targetAbs = join(EXT_ROOT, tail);
        let rel = relative(dirname(cssPath), targetAbs).split(/[\\/]+/).join('/');
        return `url(${q1}${rel}${q2})`;
      },
    );
    if (after !== before) {
      await writeFile(cssPath, after);
      rewritten++;
    }
  }
  console.log(`rewrote ${rewritten} CSS files`);
}

main().catch((e) => { console.error(e); process.exit(1); });

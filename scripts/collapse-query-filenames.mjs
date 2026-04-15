#!/usr/bin/env node
/**
 * wget saved CSS/JS URLs like `style.css?ver=123` as the literal filename
 * `style.css?ver=123.css`. A browser can never request a path containing `?`,
 * so all those stylesheets 404 once served. This script:
 *   1. Renames every `<name>?<query>.<ext>` file to `<name>.<ext>`.
 *      If the target already exists with identical content, the source is
 *      deleted; if sizes differ (shouldn't happen in practice), the source
 *      is renamed with a hash suffix and a warning is logged.
 *   2. Rewrites every reference in src/pages/*.generated.ts that uses
 *      `%3Fver=...` or `?ver=...` in the URL to drop the query portion.
 *   3. Rewrites every reference inside public/wp-content/**\/*.css that
 *      uses a `?query.ext` suffix to the canonical form.
 */
import { readdir, readFile, writeFile, rename, stat, unlink } from 'node:fs/promises';
import { join, dirname, basename, extname } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ASSET_ROOT = join(ROOT, 'public', 'wp-content');
const PAGES_DIR = join(ROOT, 'src', 'pages');

async function walk(dir, out = []) {
  for (const ent of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) await walk(p, out);
    else out.push(p);
  }
  return out;
}

async function hashOf(p) { return createHash('sha1').update(await readFile(p)).digest('hex'); }
async function exists(p) { try { await stat(p); return true; } catch { return false; } }

// Normalize a wget-mirrored filename that contains an embedded query string:
//   "style.css?ver=123.css"       -> "style.css"
//   "boskery-addon.js.js?ver=123" -> "boskery-addon.js"
//   "icomoon.woff.woff?qpdwfh"    -> "icomoon.woff"
// Strategy: truncate at the first `?`, then collapse a duplicated extension
// like ".ext.ext" at the end of the result.
function canonicalize(name) {
  const q = name.indexOf('?');
  if (q < 0) return name;
  let out = name.slice(0, q);
  const m = out.match(/^(.+)(\.[A-Za-z0-9]{1,8})\2$/);
  if (m) out = m[1] + m[2];
  return out;
}

async function collapseFilesystem() {
  const files = await walk(ASSET_ROOT);
  let renamed = 0, removed = 0, conflicts = 0;
  for (const src of files) {
    const dir = dirname(src);
    const name = basename(src);
    if (!name.includes('?')) continue;
    const newName = canonicalize(name);
    if (newName === name) continue;
    const dst = join(dir, newName);
    if (await exists(dst)) {
      const [h1, h2] = await Promise.all([hashOf(src), hashOf(dst)]);
      if (h1 === h2) { await unlink(src); removed++; continue; }
      // Content differs — keep both with content hash
      const conflictName = newName.replace(/(\.[^.]+)?$/, `.conflict-${h1.slice(0,8)}$1`);
      await rename(src, join(dir, conflictName));
      conflicts++;
      continue;
    }
    await rename(src, dst);
    renamed++;
  }
  console.log(`filesystem: renamed=${renamed} removed-duplicates=${removed} conflicts=${conflicts}`);
}

function fixReference(ref) {
  // Strip `?query...` or its URL-encoded form `%3Fquery...` from a path.
  // Matches the pattern we see: `<path>.<ext>(%3F|?)<query>.<ext>`
  // Simplest correct transform: find the first (`%3F`|`?`) and truncate to
  // everything before, then re-append the original extension if needed.
  let out = ref;
  const m = out.match(/^([^?%]+?\.[A-Za-z0-9]+)(?:%3F|\?)[^/]*?(\.[A-Za-z0-9]+)?$/);
  if (m) {
    const head = m[1];
    const tail = m[2] || '';
    if (tail && !head.toLowerCase().endsWith(tail.toLowerCase())) out = head + tail;
    else out = head;
  } else {
    // Fallback: just drop everything from '%3F' or '?' onwards
    out = out.replace(/(%3F|\?)[^/]*$/, '');
  }
  return out;
}

async function fixGeneratedModules() {
  const files = (await readdir(PAGES_DIR)).filter((f) => f.endsWith('.generated.ts')).map((f) => join(PAGES_DIR, f));
  let changes = 0;
  for (const p of files) {
    const txt = await readFile(p, 'utf-8');
    // Replace any quoted WP-style URL that embeds a ?query or %3Fquery
    const fixed = txt.replace(
      /(["'])([^"']*\/wp-(?:content|includes|json)\/[^"']*(?:\?|%3F)[^"']*)\1/g,
      (_m, q, ref) => q + fixReference(ref) + q,
    );
    if (fixed !== txt) { await writeFile(p, fixed); changes++; }
  }
  console.log(`generated modules updated: ${changes}`);
}

async function fixCssFiles() {
  const files = (await walk(ASSET_ROOT)).filter((p) => p.endsWith('.css'));
  let changes = 0;
  for (const p of files) {
    const txt = await readFile(p, 'utf-8').catch(() => '');
    if (!txt) continue;
    const fixed = txt.replace(
      /url\(\s*(["']?)\s*([^)"'\s]*wp-content\/[^)"'\s]*(?:\?|%3F)[^)"'\s]*)\s*(["']?)\s*\)/g,
      (_m, q1, ref, q2) => `url(${q1}${fixReference(ref)}${q2})`,
    );
    if (fixed !== txt) { await writeFile(p, fixed); changes++; }
  }
  console.log(`css files updated: ${changes}`);
}

async function main() {
  await collapseFilesystem();
  await fixGeneratedModules();
  await fixCssFiles();
}
main().catch((e) => { console.error(e); process.exit(1); });

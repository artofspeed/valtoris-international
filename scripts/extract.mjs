#!/usr/bin/env node
/**
 * Extract each mirrored WordPress page into a TS module that exports the
 * head styles + body HTML, with absolute URLs rewritten to root-relative
 * so they resolve to our public/ folder on GitHub Pages.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as cheerio from 'cheerio';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIRROR = '/tmp/vmirror/valtorisinternational.com';
const OUT = join(__dirname, '..', 'src', 'pages');
const ORIGIN = 'https://valtorisinternational.com';

// slug → display name + source index.html path
const PAGES = [
  { slug: 'home',            route: '/',                  src: 'index.html' },
  { slug: 'about',           route: '/about-us',          src: 'about-us/index.html' },
  { slug: 'papers',          route: '/papers',            src: 'papers/index.html' },
  { slug: 'beef',            route: '/beef-tenderloin',   src: 'beef-tenderloin/index.html' },
  { slug: 'pork',            route: '/pork',              src: 'pork/index.html' },
  { slug: 'chicken',         route: '/chicken',           src: 'chicken/index.html' },
  { slug: 'greens',          route: '/greens',            src: 'greens/index.html' },
  { slug: 'sugar',           route: '/sugar',             src: 'sugar/index.html' },
  { slug: 'news',            route: '/news',              src: 'news/index.html' },
  { slug: 'contact',         route: '/contact-us',        src: 'contact-us/index.html' },
  { slug: 'login',           route: '/login',             src: 'login/index.html' },
  { slug: 'notFound',        route: '/404-error',         src: '404-error/index.html' },
  { slug: 'newsCmc2025',     route: '/valtoris-attends-canadian-meat-council-annual-conference-2025', src: 'valtoris-attends-canadian-meat-council-annual-conference-2025/index.html' },
];

/** Rewrite a URL string to the form we serve locally. */
function rewriteUrl(url) {
  if (!url) return url;
  let u = url.trim();
  // Strip origin → root-relative
  u = u.replace(new RegExp('^' + ORIGIN.replace('.', '\\.'), 'g'), '');
  // wget saved with relative ../ traversal — normalise to /wp-content/...
  u = u.replace(/^(\.\.\/)+wp-content\//, '/wp-content/');
  u = u.replace(/^(\.\.\/)+wp-includes\//, '/wp-includes/');
  // wget renamed root index to `index.html` in nav — route-level links handled elsewhere
  return u;
}

/** Rewrite all href/src/srcset/content-url style URLs in an HTML string. */
function rewriteHtmlUrls(html) {
  if (!html) return html;
  let out = html;
  // Absolute origin → root-relative
  out = out.replaceAll(ORIGIN, '');
  // url("...") in inline style attributes
  out = out.replaceAll(/url\((['"]?)(\.\.\/)+(wp-content|wp-includes)\//g, 'url($1/$3/');
  // src/href="../wp-content/..." → "/wp-content/..."
  out = out.replaceAll(/(["'=])(?:\.\.\/)+(wp-content|wp-includes)\//g, '$1/$2/');
  return out;
}

function extractOne({ slug, route, src }) {
  const file = join(MIRROR, src);
  if (!existsSync(file)) {
    console.warn(`  MISS ${slug} (${src})`);
    return null;
  }
  const raw = readFileSync(file, 'utf-8');
  const $ = cheerio.load(raw, { decodeEntities: false });

  const title = $('title').first().text().trim();
  const metaDesc = $('meta[name="description"]').attr('content') || '';

  // Collect head stylesheets + inline styles (preserve order).
  const headLinks = [];
  const headStyles = [];
  $('head > link, head > style').each((_, el) => {
    const $el = $(el);
    if (el.tagName === 'link') {
      const rel = ($el.attr('rel') || '').toLowerCase();
      if (rel.includes('stylesheet') || rel === 'preload' || rel === 'icon' || rel === 'shortcut' || rel === 'apple-touch-icon' || rel === 'preconnect' || rel === 'dns-prefetch') {
        const href = $el.attr('href');
        if (!href) return;
        headLinks.push({
          rel: $el.attr('rel'),
          href: rewriteUrl(href),
          type: $el.attr('type'),
          media: $el.attr('media'),
          as: $el.attr('as'),
          crossorigin: $el.attr('crossorigin'),
        });
      }
    } else if (el.tagName === 'style') {
      const id = $el.attr('id') || '';
      headStyles.push({ id, css: rewriteHtmlUrls($el.html() || '') });
    }
  });

  // Remove problematic elements from body before extraction
  // - WordPress admin bar (only visible when logged in, but skip defensively)
  // - WP emoji staging scripts / cookie consent / analytics placeholders — these need JS
  $('body script').each((_, el) => {
    const $el = $(el);
    const s = $el.attr('src') || '';
    const inline = $el.html() || '';
    // Drop inline scripts (WP's wp-emoji-release, jQuery bootstrap, etc.) and
    // external scripts — we're rendering a static snapshot.
    $el.remove();
  });
  $('body noscript').remove();
  // CF7 form tag: keep visible but mark as non-functional (we'll show a note in Contact.tsx wrapper)
  // WP admin bar iframe
  $('#wpadminbar').remove();

  // Body HTML + classes
  const bodyHtml = rewriteHtmlUrls($('body').html() || '');
  const bodyClass = $('body').attr('class') || '';

  return { slug, route, title, metaDesc, headLinks, headStyles, bodyClass, bodyHtml };
}

function escapeBacktick(s) {
  return s.replaceAll('\\', '\\\\').replaceAll('`', '\\`').replaceAll('${', '\\${');
}

function emitPageModule(page) {
  const out = join(OUT, `${page.slug}.generated.ts`);
  const content = `// AUTO-GENERATED by scripts/extract.mjs — do not edit by hand.
// Source: ${page.route}

export const title = ${JSON.stringify(page.title)};
export const metaDesc = ${JSON.stringify(page.metaDesc)};
export const bodyClass = ${JSON.stringify(page.bodyClass)};

export const headLinks: { rel?: string; href: string; type?: string; media?: string; as?: string; crossorigin?: string }[] = ${JSON.stringify(page.headLinks, null, 2)};

export const headStyles: { id: string; css: string }[] = [
${page.headStyles.map(s => `  { id: ${JSON.stringify(s.id)}, css: \`${escapeBacktick(s.css)}\` }`).join(',\n')}
];

export const bodyHtml = \`${escapeBacktick(page.bodyHtml)}\`;

export default { title, metaDesc, bodyClass, headLinks, headStyles, bodyHtml };
`;
  writeFileSync(out, content);
  console.log(`  OK  ${page.slug} → ${basename(out)} (body=${Math.round(page.bodyHtml.length/1024)}KB, styles=${page.headStyles.length}, links=${page.headLinks.length})`);
}

function emitRoutesModule(pages) {
  const file = join(__dirname, '..', 'src', 'pages', 'index.ts');
  const imports = pages.map(p => `import ${p.slug}Page from './${p.slug}.generated';`).join('\n');
  const entries = pages.map(p => `  { slug: ${JSON.stringify(p.slug)}, route: ${JSON.stringify(p.route)}, page: ${p.slug}Page },`).join('\n');
  const content = `// AUTO-GENERATED by scripts/extract.mjs — do not edit by hand.
${imports}

export type PageModule = {
  title: string;
  metaDesc: string;
  bodyClass: string;
  headLinks: { rel?: string; href: string; type?: string; media?: string; as?: string; crossorigin?: string }[];
  headStyles: { id: string; css: string }[];
  bodyHtml: string;
};

export type RouteEntry = { slug: string; route: string; page: PageModule };

export const routes: RouteEntry[] = [
${entries}
];

export const routeBySlug: Record<string, RouteEntry> = Object.fromEntries(routes.map(r => [r.slug, r]));
`;
  writeFileSync(file, content);
  console.log(`Wrote routes map → ${file}`);
}

function main() {
  if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });
  const extracted = [];
  for (const p of PAGES) {
    const r = extractOne(p);
    if (!r) continue;
    emitPageModule(r);
    extracted.push(r);
  }
  emitRoutesModule(extracted);
  console.log(`\nExtracted ${extracted.length}/${PAGES.length} pages.`);
}

main();

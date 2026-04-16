import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { PageModule } from '../pages';
import { applyStaticFallbacks } from './staticFallbacks';
// Polish overrides imported as a URL string (Vite's `?url` suffix) so we can
// append it as the LAST stylesheet in <head> — after every WP/Elementor rule,
// so source-order wins the cascade without `!important` spam.
import polishCssUrl from '../polish.css?url';

const BASE = import.meta.env.BASE_URL; // e.g. "/valtoris-international/" or "/"

/**
 * WordPress-generated HTML contains asset URLs in several forms, inconsistently:
 *   - absolute root:  src="/wp-content/uploads/..."     (most non-home pages)
 *   - relative:       src="wp-content/uploads/..."      (home page)
 *   - up-relative:    srcset=".../paper.jpg, ../wp-content/..."  (wget-depth fix)
 *   - inline CSS:     style="...url(/wp-content/...)" or url(wp-content/...)
 *   - wp-includes:    href="/wp-includes/css/dist/..."   (Gutenberg block CSS)
 * None of these work under a Pages subpath like /valtoris-international/.
 * Normalize every internal asset URL to `${BASE}wp-content/...` (or wp-includes).
 *
 * `PREFIX` matches an optional chain of leading-dot-slash or slash segments
 * before the `wp-content`/`wp-includes` path — handles `/`, ``, `../`,
 * `../../`, etc.
 */
const PREFIX = String.raw`(?:\.\.\/)*\/?`;

/** Routes the SPA knows about. Used to recognize which `<a href="/...">`
 *  links are internal navigation (so we can prefix them with BASE) vs.
 *  arbitrary anchors that would open the new tab at the wrong URL on a
 *  GitHub Pages subpath deploy. Kept in sync with src/pages/index.ts. */
const INTERNAL_NAV_PATHS = [
  'about-us',
  'papers',
  'beef-tenderloin',
  'pork',
  'chicken',
  'greens',
  'sugar',
  'news',
  'contact-us',
  'login',
  '404-error',
  'valtoris-attends-canadian-meat-council-annual-conference-2025',
];

/** Rewrite any `href="/about-us/"`, `href="about-us/"`, or origin-absolute
 *  `href="https://valtorisinternational.com/about-us/"` that points at one of
 *  our SPA routes so it resolves to the BASE-prefixed URL. Needed for
 *  `target="_blank"` anchors (which bypass our SPA click interceptor) to
 *  land on the correct page under a subpath deploy like `/valtoris-international/`. */
function rewriteNavHrefs(html: string): string {
  const base = BASE.endsWith('/') ? BASE : BASE + '/';
  const group = INTERNAL_NAV_PATHS.join('|');
  return html
    .replace(
      new RegExp(`\\bhref=(["'])https?://valtorisinternational\\.com/(${group})/?(#[^"'\\s]*)?\\1`, 'gi'),
      (_m, q, p, frag = '') => `href=${q}${base}${p}/${frag || ''}${q}`,
    )
    .replace(
      new RegExp(`\\bhref=(["'])/?(${group})/?(#[^"'\\s]*)?\\1`, 'g'),
      (_m, q, p, frag = '') => `href=${q}${base}${p}/${frag || ''}${q}`,
    )
    // Home link: orig markup uses the origin URL; rewrite to BASE.
    .replace(
      /\bhref=(["'])https?:\/\/valtorisinternational\.com\/?\1/gi,
      (_m, q) => `href=${q}${base}${q}`,
    );
}

/** Sanitize WordPress-emitted href bugs that the orig site happens to ship:
 *   • Footer phone link malformed as `href="http://+1-..."` (auto-link plugin
 *     mistakenly treated the bare phone number as an http URL). Convert to tel:
 *   • Sidebar widget links to WP archive routes (`/author/*`, `/category/*`,
 *     `/tag/*`) that don't exist in our static clone — convert to inert
 *     placeholders so they don't dump the user on the 404 page.
 *   • Logo `<a>` with no href attribute — make it point at the home route. */
function sanitizeBrokenHrefs(html: string): string {
  const base = BASE.endsWith('/') ? BASE : BASE + '/';
  return html
    // Phone number wrongly auto-linked as http://+1-...
    .replace(
      /\bhref=(["'])https?:\/\/(\+\d[\d\s\-]+)\1/g,
      (_m, q, num) => `href=${q}tel:${num.replace(/\s+/g, '')}${q}`,
    )
    // WordPress archive paths the static clone doesn't serve. Turn into
    // hash placeholders so the SPA click handler intercepts them as no-ops.
    .replace(
      /\bhref=(["'])\/?(author|category|tag)\/[^"'\s]*\1/g,
      (_m, q) => `href=${q}#${q}`,
    )
    // Logo / dead `<a>` with no href — point them at the home route so they
    // don't render as cursor:default unclickable text.
    .replace(
      /<a\b(?![^>]*\bhref=)([^>]*)>/g,
      (_m, attrs) => `<a href="${base}"${attrs}>`,
    )
    // WP breadcrumb home link is emitted as `href=""`. Empty href reloads
    // the current page on click — point it at the home route instead.
    .replace(
      /\bhref=(["'])\1/g,
      (_m, q) => `href=${q}${base}${q}`,
    )
    // Replace the WordPress theme vendor attribution ("Web Tech Craft") in
    // the footer with our own copyright. The original markup is:
    //   "© Copyright  <span class="dynamic-year"> </span> by Web Tech Craft"
    // Any text between "Copyright" and "Web Tech Craft" (including span
    // tags for the year) is stripped. Works for both the original theme
    // `<a>`-wrapped variant and the later plain-text variant.
    .replace(
      /©\s*Copyright[\s\S]{0,200}?Web\s*Tech\s*Craft(?:\s*<\/a>)?/gi,
      '© ' + new Date().getFullYear() + ' Valtoris International Trading Inc.',
    )
    .replace(
      /Copyright[\s\S]{0,200}?Web\s*Tech\s*Craft(?:\s*<\/a>)?/gi,
      String(new Date().getFullYear()) + ' Valtoris International Trading Inc.',
    )
    // Replace the WP theme placeholder "Boskery" inside the testimonials
    // heading ("WHAT THEY'RE TALKING ABOUT BOSKERY") with our brand name.
    .replace(/\b(BOSKERY|Boskery|boskery)\b/g, 'Valtoris')
    // Original heading "RAW MEAT PRODUCTIONBY LEADING FARM" was emitted with
    // a missing space between "PRODUCTION" and "BY". Restore it.
    .replace(/PRODUCTIONBY/g, 'PRODUCTION BY')
    .replace(/Productionby/g, 'Production by')
    .replace(/productionby/g, 'production by');
}

function rewriteAssetUrls(html: string): string {
  const base = BASE.endsWith('/') ? BASE : BASE + '/';
  return sanitizeBrokenHrefs(rewriteNavHrefs(html))
    // src="(…)wp-content/…" etc. (absolute, bare, or ../-relative)
    .replace(
      new RegExp(
        `\\b(src|href|srcset|data-src|data-srcset|poster|data-poster|data-bg|data-bg-image)=(["'])${PREFIX}wp-(content|includes|json)\\/`,
        'g',
      ),
      (_m, attr, q, seg) => `${attr}=${q}${base}wp-${seg}/`,
    )
    // srcset has comma-separated "URL size" pairs; rewrite every URL inside.
    .replace(
      new RegExp(`(,\\s*)${PREFIX}wp-(content|includes)\\/`, 'g'),
      (_m, lead, seg) => `${lead}${base}wp-${seg}/`,
    )
    // CSS url(...) - both unquoted and quoted
    .replace(
      new RegExp(`url\\((\\s*["']?)${PREFIX}wp-(content|includes)\\/`, 'g'),
      (_m, lead, seg) => `url(${lead}${base}wp-${seg}/`,
    )
    // External mirror references (bracketweb.com etc.) that `inline-external`
    // already downloaded under `wp-content/ext/<host>/<path>`. Rewrite only
    // inline style `url(...)` and asset-bearing attrs (never `href`, which
    // is usually navigation). Safe because missing files 404 silently; real
    // external anchor links are untouched.
    .replace(
      /style="([^"]*)"/g,
      (_m, css) => `style="${css.replace(
        /url\(\s*(["']?)\s*https?:\/\/([^/)\s"']+)\//g,
        (_mm: string, q: string, host: string) => `url(${q}${base}wp-content/ext/${host}/`,
      )}"`,
    )
    .replace(
      /\b(src|data-src|data-bg|data-bg-image|poster)=(["'])https?:\/\/([^/)\s"']+)\//g,
      (_m, attr, q, host) => `${attr}=${q}${base}wp-content/ext/${host}/`,
    );
}

function rewriteCss(css: string): string {
  const base = BASE.endsWith('/') ? BASE : BASE + '/';
  return css.replace(
    new RegExp(`url\\((\\s*["']?)${PREFIX}wp-(content|includes)\\/`, 'g'),
    (_m, lead, seg) => `url(${lead}${base}wp-${seg}/`,
  );
}

function rewriteHref(href: string): string {
  const base = BASE.endsWith('/') ? BASE : BASE + '/';
  if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('//') || href.startsWith('data:')) return href;
  // Normalize any `../`-prefixed or slash-prefixed wp-* reference
  const m = href.match(/^(?:\.\.\/)*\/?(wp-(?:content|includes|json)\/.+)$/);
  if (m) return base + m[1];
  return href;
}

/** Global registries of head CSS that's already been added to the document.
 *  We never remove WP stylesheets on route change — they're shared across
 *  every page (theme, Elementor kit, vendor libs), and removing then
 *  re-adding them tears down `<link>` nodes that the browser would have to
 *  re-fetch and re-parse. During that gap, the new page's HTML renders
 *  unstyled (the "Twitter logo + raw text flash" the user reported when
 *  navigating Home → About). With a cumulative cache, every CSS file is
 *  loaded once and stays loaded; route changes only update the body class,
 *  title, and meta — instant. */
const loadedHrefs = new Set<string>();
const loadedStyleKeys = new Set<string>();

export function StaticPage({ page }: { page: PageModule }) {
  const navigate = useNavigate();
  const location = useLocation();
  const hostRef = useRef<HTMLDivElement>(null);

  // Pre-rewrite bodyHtml once per page so `wp-content/…` references resolve
  // under the Vite `BASE_URL` (e.g. `/valtoris-international/`).
  const bodyHtml = useMemo(() => rewriteAssetUrls(page.bodyHtml), [page.bodyHtml]);

  // Inject head CSS (synchronously, before paint) so we don't FOUC.
  useLayoutEffect(() => {
    for (const l of page.headLinks) {
      const href = rewriteHref(l.href);
      const key = `${l.rel || 'stylesheet'}|${href}|${l.media || ''}`;
      if (loadedHrefs.has(key)) continue;
      loadedHrefs.add(key);
      const link = document.createElement('link');
      if (l.rel) link.setAttribute('rel', l.rel);
      link.setAttribute('href', href);
      if (l.type) link.setAttribute('type', l.type);
      if (l.media) link.setAttribute('media', l.media);
      if (l.as) link.setAttribute('as', l.as);
      if (l.crossorigin) link.setAttribute('crossorigin', l.crossorigin);
      link.setAttribute('data-vi-static-css', '');
      document.head.appendChild(link);
    }
    for (const s of page.headStyles) {
      // Dedupe by id when present (WP gives most inline styles a stable id),
      // else by the first chunk of CSS content (cheap proxy for identity).
      const key = s.id ? `id:${s.id}` : `css:${s.css.length}:${s.css.slice(0, 200)}`;
      if (loadedStyleKeys.has(key)) continue;
      loadedStyleKeys.add(key);
      const style = document.createElement('style');
      if (s.id) style.id = s.id;
      style.setAttribute('data-vi-static-css', '');
      style.appendChild(document.createTextNode(rewriteCss(s.css)));
      document.head.appendChild(style);
    }
    document.title = page.title || 'Valtoris International';
    // Meta description (mutate in place; the description is cumulative state
    // we always overwrite on route change).
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', page.metaDesc || '');
    // Body class for per-page WordPress styles. We always set; never restore
    // (next route change will set its own; restore-on-cleanup just creates a
    // brief flash of stale class).
    if (page.bodyClass) document.body.className = page.bodyClass;

    // Polish overrides: append our own stylesheet LAST in <head>, after every
    // WP/Elementor link we just appended above. Source-order wins the cascade,
    // so our responsive fixes don't need to `!important` every rule. We move
    // (not re-create) the node on subsequent route changes so the browser
    // keeps the already-parsed rules.
    let polish = document.getElementById('vi-polish-overrides') as HTMLLinkElement | null;
    if (!polish) {
      polish = document.createElement('link');
      polish.id = 'vi-polish-overrides';
      polish.rel = 'stylesheet';
      polish.href = polishCssUrl;
    }
    // Re-append each route change — no-op if already last child, otherwise
    // moves to the end so newly-added WP stylesheets can't shadow our rules.
    document.head.appendChild(polish);
  }, [page]);

  // Scroll to top on route change (unless there's a hash)
  useEffect(() => {
    if (location.hash) {
      const el = document.getElementById(location.hash.slice(1));
      if (el) { el.scrollIntoView(); return; }
    }
    window.scrollTo(0, 0);
  }, [location.pathname, location.hash]);

  // Apply static fallbacks (show first owl slide, un-hide `.wow`, render
  // final counter values) right after the page HTML is injected.
  useEffect(() => {
    if (!hostRef.current) return;
    const cleanup = applyStaticFallbacks(hostRef.current);
    return cleanup;
  }, [bodyHtml]);

  // Intercept internal link clicks so the SPA router handles them.
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const basePrefix = BASE.endsWith('/') ? BASE.slice(0, -1) : BASE; // e.g. "/valtoris-international" or ""
    function onClick(e: MouseEvent) {
      const target = (e.target as Element | null)?.closest('a') as HTMLAnchorElement | null;
      if (!target) return;
      if (target.target === '_blank' || target.hasAttribute('download')) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const href = target.getAttribute('href');
      // Missing or empty href: dead click. WordPress occasionally emits
      // breadcrumb home links as `<a href="">` (empty). Browser default
      // reloads the current page; we swallow it instead.
      if (!href) { e.preventDefault(); return; }
      // Skip external, mailto, tel, protocol-relative
      if (href.startsWith('mailto:') || href.startsWith('tel:')) return;
      if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('//')) return;
      // Bare `#` or hash-only placeholders (e.g. `index.html#`, `/#`,
      // `something/#`, `#`) are dropdown / scroll-to-top / dead-link
      // placeholders. NEVER navigate — preventDefault swallows the browser's
      // default "append # to URL" behaviour too. (Real in-page anchor
      // fragments like `#mission` should pass through to the browser.)
      if (href === '#' || href.endsWith('#') || href.endsWith('/#')) {
        e.preventDefault();
        return;
      }
      if (href.startsWith('#')) return; // real fragment scroll target — let browser handle
      // Asset links (lightbox, downloads) — let the browser handle them normally.
      // Accept both root-relative `/wp-content/` and BASE-prefixed
      // `/valtoris-international/wp-content/` (post-rewriteAssetUrls).
      const assetRe = new RegExp(`^(?:${basePrefix})?/?wp-(content|includes|json)/`);
      if (assetRe.test(href)) return;
      // wget saved root-index as `index.html` in nav markup
      let path = href;
      if (path === 'index.html' || path.endsWith('/index.html')) {
        path = path.replace(/\/?index\.html$/, '/') || '/';
      }
      // Strip trailing slash inconsistencies so our route table matches
      if (!path.startsWith('/')) path = '/' + path;
      // If the href was BASE-rewritten by rewriteNavHrefs (e.g. `/valtoris-international/contact-us/`),
      // strip the basename so React Router's `basename` prop doesn't double-prefix.
      if (basePrefix && path.startsWith(basePrefix + '/')) {
        path = path.slice(basePrefix.length) || '/';
      } else if (basePrefix && path === basePrefix) {
        path = '/';
      }
      e.preventDefault();
      navigate(path);
    }
    host.addEventListener('click', onClick);
    return () => host.removeEventListener('click', onClick);
  }, [navigate]);

  return (
    <div
      ref={hostRef}
      data-vi-static-page
      dangerouslySetInnerHTML={{ __html: bodyHtml }}
    />
  );
}

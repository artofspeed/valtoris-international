import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { PageModule } from '../pages';
import { applyStaticFallbacks } from './staticFallbacks';

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

function rewriteAssetUrls(html: string): string {
  const base = BASE.endsWith('/') ? BASE : BASE + '/';
  return html
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

export function StaticPage({ page }: { page: PageModule }) {
  const navigate = useNavigate();
  const location = useLocation();
  const hostRef = useRef<HTMLDivElement>(null);

  // Pre-rewrite bodyHtml once per page so `wp-content/…` references resolve
  // under the Vite `BASE_URL` (e.g. `/valtoris-international/`).
  const bodyHtml = useMemo(() => rewriteAssetUrls(page.bodyHtml), [page.bodyHtml]);

  // Inject head CSS (synchronously, before paint) so we don't FOUC.
  useLayoutEffect(() => {
    const nodes: HTMLElement[] = [];
    for (const l of page.headLinks) {
      const link = document.createElement('link');
      if (l.rel) link.setAttribute('rel', l.rel);
      link.setAttribute('href', rewriteHref(l.href));
      if (l.type) link.setAttribute('type', l.type);
      if (l.media) link.setAttribute('media', l.media);
      if (l.as) link.setAttribute('as', l.as);
      if (l.crossorigin) link.setAttribute('crossorigin', l.crossorigin);
      link.setAttribute('data-vi-page', page.title);
      document.head.appendChild(link);
      nodes.push(link);
    }
    for (const s of page.headStyles) {
      const style = document.createElement('style');
      if (s.id) style.id = s.id;
      style.setAttribute('data-vi-page', page.title);
      style.appendChild(document.createTextNode(rewriteCss(s.css)));
      document.head.appendChild(style);
      nodes.push(style);
    }
    document.title = page.title || 'Valtoris International';
    // Meta description
    let meta = document.querySelector('meta[name="description"]');
    const created = !meta;
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    const prevDesc = meta.getAttribute('content') || '';
    meta.setAttribute('content', page.metaDesc || '');
    // Body class for per-page WordPress styles
    const prevBodyClass = document.body.className;
    if (page.bodyClass) document.body.className = page.bodyClass;

    return () => {
      for (const n of nodes) n.remove();
      if (created) meta?.remove();
      else meta?.setAttribute('content', prevDesc);
      document.body.className = prevBodyClass;
    };
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
    if (hostRef.current) applyStaticFallbacks(hostRef.current);
  }, [bodyHtml]);

  // Intercept internal link clicks so the SPA router handles them.
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    function onClick(e: MouseEvent) {
      const target = (e.target as Element | null)?.closest('a') as HTMLAnchorElement | null;
      if (!target) return;
      if (target.target === '_blank' || target.hasAttribute('download')) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const href = target.getAttribute('href');
      if (!href) return;
      // Skip external, mailto, tel, protocol-relative, fragments
      if (href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('#')) return;
      if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('//')) return;
      // Asset links (lightbox, downloads) — let the browser handle them normally
      if (/^\/?wp-content\//.test(href) || /^\/?wp-json\//.test(href)) return;
      // wget saved root-index as `index.html` in nav markup
      let path = href;
      if (path === 'index.html' || path.endsWith('/index.html')) {
        path = path.replace(/\/?index\.html$/, '/') || '/';
      }
      // Strip trailing slash inconsistencies so our route table matches
      if (!path.startsWith('/')) path = '/' + path;
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

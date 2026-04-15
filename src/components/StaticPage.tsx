import { useEffect, useLayoutEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { PageModule } from '../pages';

/**
 * Renders a WordPress-exported page as-is via dangerouslySetInnerHTML.
 *
 * - Injects the page's `<link rel=stylesheet>` + inline `<style>` tags into
 *   document.head on mount, and removes them on unmount.
 * - Intercepts clicks on internal anchors so the Router handles navigation
 *   instead of triggering a full reload.
 * - Sets document.title + meta description per page.
 */
export function StaticPage({ page }: { page: PageModule }) {
  const navigate = useNavigate();
  const location = useLocation();
  const hostRef = useRef<HTMLDivElement>(null);

  // Inject head CSS (synchronously, before paint) so we don't FOUC.
  useLayoutEffect(() => {
    const nodes: HTMLElement[] = [];
    for (const l of page.headLinks) {
      const link = document.createElement('link');
      if (l.rel) link.setAttribute('rel', l.rel);
      link.setAttribute('href', l.href);
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
      style.appendChild(document.createTextNode(s.css));
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
      dangerouslySetInnerHTML={{ __html: page.bodyHtml }}
    />
  );
}

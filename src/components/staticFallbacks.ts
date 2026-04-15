/**
 * Static fallbacks for Elementor/Boskery JS behaviors we don't ship.
 *
 * The original WordPress site ships owl-carousel, WOW.js, jQuery-countTo,
 * Elementor's video-background module, and a preloader fadeOut call. Our
 * clone is static React — no jQuery, no WP globals. Without a shim:
 *   - `.preloader` keeps a full-viewport dark overlay in place (z-index 9991)
 *   - `.owl-carousel` has `display:none` until owl adds `.owl-loaded`
 *   - `.wow` has `visibility:hidden` until WOW.js observes the viewport
 *   - `<h3 data-stop="30">0</h3>` stays "0" until countTo animates to 30
 *   - Elementor containers with `data-settings.background_background:"video"`
 *     render no background until elementor-frontend mounts a `<video>`
 *
 * This function brute-forces the final state in one pass. Call once after
 * the page HTML is injected into the DOM.
 */

const BASE = import.meta.env.BASE_URL;
const baseUrl = BASE.endsWith('/') ? BASE : BASE + '/';

/** Number of items visible simultaneously in each owl-carousel at 1440px.
 *  Mirrors the "active" count measured on the original WordPress site.
 *  Carousels not listed here default to 1 (treated like hero). */
const CAROUSEL_VISIBLE_COUNT: Record<string, number> = {
  'hero-slider-one__carousel': 1,
  'hero-one__carousel': 1,
  'main-slider-one__carousel': 1,
  'main-slider': 1,
  'testimonials-one__carousel': 2,
  'client-carousel__one': 5,
  'news-post-one__carousel': 3,
  'products-carousel': 4,
};

function visibleCountFor(carousel: HTMLElement): number {
  for (const [cls, n] of Object.entries(CAROUSEL_VISIBLE_COUNT)) {
    if (carousel.classList.contains(cls)) return n;
  }
  return 1;
}

/** Owl-carousel's `.owl-stage-outer` inherits theme padding that vertically
 *  centers short items inside a taller band. Without owl we flex-layout the
 *  items directly; match the orig's vertical padding here so section heights
 *  line up. Measured off the live WordPress site at 1440px. */
const CAROUSEL_VERTICAL_PADDING: Record<string, string> = {
  'client-carousel__one': '90px',
};

function verticalPaddingFor(carousel: HTMLElement): string {
  for (const [cls, p] of Object.entries(CAROUSEL_VERTICAL_PADDING)) {
    if (carousel.classList.contains(cls)) return p;
  }
  return '0';
}

function rewriteAssetUrl(u: string): string {
  if (!u) return u;
  if (u.startsWith('http://') || u.startsWith('https://') || u.startsWith('//') || u.startsWith('data:')) return u;
  const m = u.match(/^(?:\.\.\/)*\/?(wp-(?:content|includes|json)\/.+)$/);
  if (m) return baseUrl + m[1];
  return u;
}

function applyElementorLazyLoaded(root: HTMLElement): void {
  // Elementor's inline CSS sets `background-image: none !important` on every
  // `.e-con.e-parent:nth-of-type(n+4):not(.e-lazyloaded):not(.e-no-lazyload)`
  // (with stricter thresholds at narrower heights). `elementor-frontend.js`
  // normally adds `.e-lazyloaded` once the container intersects the viewport;
  // without that JS every below-the-fold Elementor container loses its
  // background-image (e.g. the recycled-paper texture behind the "SAVOR THE
  // WORLD'S BEST CUTS" headline section). Pre-mark them all.
  root.querySelectorAll<HTMLElement>('.e-con.e-parent').forEach((el) => {
    el.classList.add('e-lazyloaded');
  });
}

function applyVideoBackgrounds(root: HTMLElement): void {
  // Elementor stores container settings as a JSON blob on data-settings.
  // When `background_background === "video"` we want to drop a looping,
  // muted, autoplay <video> behind the container content — same effect as
  // Elementor's front-end video module, minus the library dependency.
  const els = root.querySelectorAll<HTMLElement>('[data-settings]');
  for (const el of Array.from(els)) {
    const raw = el.getAttribute('data-settings');
    if (!raw) continue;
    let s: Record<string, unknown>;
    try { s = JSON.parse(raw); } catch { continue; }
    if (s.background_background !== 'video') continue;
    const src = typeof s.background_video_link === 'string' ? s.background_video_link : '';
    if (!src) continue;
    // Normalize absolute origin links back to local mirrored paths.
    let localSrc = src
      .replace(/^https?:\/\/valtorisinternational\.com\//i, '')
      .replace(/^https?:\/\/[^/]+\//, 'wp-content/ext-video/');
    localSrc = rewriteAssetUrl(localSrc);

    const existing = el.querySelector<HTMLVideoElement>(':scope > .vi-video-bg');
    if (existing) continue;
    const style = window.getComputedStyle(el);
    if (style.position === 'static') el.style.position = 'relative';
    const video = document.createElement('video');
    video.className = 'vi-video-bg';
    video.src = localSrc;
    video.autoplay = true;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    Object.assign(video.style, {
      position: 'absolute',
      inset: '0',
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      zIndex: '0',
      pointerEvents: 'none',
    });
    el.prepend(video);
    // Any real children should sit above the video
    for (const c of Array.from(el.children)) {
      if (c === video) continue;
      const cs = window.getComputedStyle(c as HTMLElement);
      if (cs.position === 'static') (c as HTMLElement).style.position = 'relative';
      if (cs.zIndex === 'auto' || cs.zIndex === '0') (c as HTMLElement).style.zIndex = '1';
    }
  }
}

function applyOwlCarousels(root: HTMLElement): void {
  root.querySelectorAll<HTMLElement>('.owl-carousel').forEach((carousel) => {
    carousel.classList.add('owl-loaded', 'owl-drag');
    carousel.style.display = 'block';
    const visible = visibleCountFor(carousel);
    // Owl treats every direct element child as a slide. Select all element
    // children instead of guessing class names (client-carousel has
    // `.client-carousel__one__item`, testimonials have `.item`, hero has
    // `.hero-slider-one__item`, etc.).
    const items = Array.from(carousel.children).filter(
      (c): c is HTMLElement => c.nodeType === 1,
    );
    if (!items.length) return;
    // Inject the "01 / 10" counter that boskery-addon.js would have added
    // inside any carousel marked `.boskery-owl__carousel--with-counter`.
    if (
      carousel.classList.contains('boskery-owl__carousel--with-counter') &&
      !carousel.querySelector(':scope > .boskery-owl__carousel__counter')
    ) {
      const counter = document.createElement('div');
      counter.className = 'boskery-owl__carousel__counter';
      const pad = (n: number) => n.toString().padStart(2, '0');
      counter.innerHTML =
        `<span class="boskery-owl__carousel__counter__current">${pad(1)}</span> / ` +
        `<span class="boskery-owl__carousel__counter__total">${pad(items.length)}</span>`;
      carousel.appendChild(counter);
    }
    if (visible === 1) {
      // Hero-style: show just the first slide. The theme's CSS sets the
      // title, subtitle and button to `opacity: 0` and transforms; they
      // only become visible when a parent has `.active` (normally applied
      // by owl-carousel to the current `.owl-item`). Mark the first slide
      // `.active` so those transitions resolve to their visible end-state.
      items.forEach((el, i) => {
        el.style.display = i === 0 ? '' : 'none';
        el.classList.toggle('active', i === 0);
      });
      return;
    }
    // Multi-item carousel: show exactly the first `visible` items, laid
    // out as a non-wrapping flex row across the full container width,
    // matching the count owl-carousel would have rendered.
    const pad = verticalPaddingFor(carousel);
    Object.assign(carousel.style, {
      display: 'flex',
      flexWrap: 'nowrap',
      gap: '30px',
      justifyContent: 'center',
      alignItems: 'center',
      paddingTop: pad,
      paddingBottom: pad,
    });
    const basis = `calc((100% - ${(visible - 1) * 30}px) / ${visible})`;
    items.forEach((el, i) => {
      if (i < visible) {
        el.style.display = '';
        el.style.flex = `0 0 ${basis}`;
        el.style.maxWidth = basis;
      } else {
        el.style.display = 'none';
      }
    });
  });
}

function applyWowAnimations(root: HTMLElement): void {
  root.querySelectorAll<HTMLElement>('.wow').forEach((el) => {
    el.style.visibility = 'visible';
    el.style.animationName = 'none';
    el.classList.add('animated');
  });
}

function applyCounters(root: HTMLElement): void {
  root.querySelectorAll<HTMLElement>('[data-stop]').forEach((el) => {
    const stop = el.getAttribute('data-stop');
    if (stop) el.textContent = stop;
  });
}

function removePreloader(root: HTMLElement): void {
  root.querySelectorAll<HTMLElement>('.preloader').forEach((el) => el.remove());
  document.body.classList.remove('page-loading', 'is-loading', 'preload-visible');
}

/** Orig's boskery-addon.js collapses every `.faq-accordion .accordion` panel
 *  except the first (or the one tagged `.active`), by hiding its
 *  `.accordion-content` (inline `display: none`). Clicking an
 *  `.accordion-title` slides the clicked one open and collapses the others.
 *  Without the plugin, every `.accordion-content` renders open, which inflates
 *  page height by ~500px on pages that ship an FAQ (beef/chicken etc). */
function applyFaqAccordion(root: HTMLElement): (() => void) | undefined {
  const groups = root.querySelectorAll<HTMLElement>('.faq-accordion');
  if (!groups.length) return undefined;
  const listeners: Array<[HTMLElement, () => void]> = [];
  groups.forEach((group) => {
    const items = Array.from(group.querySelectorAll<HTMLElement>(':scope > .accordion'));
    if (!items.length) return;
    // Pick the initially-open one: first item tagged `.active`, else item 0.
    let openIdx = items.findIndex((el) => el.classList.contains('active'));
    if (openIdx === -1) openIdx = 0;
    items.forEach((item, i) => {
      const content = item.querySelector<HTMLElement>(':scope > .accordion-content');
      if (!content) return;
      if (i === openIdx) {
        item.classList.add('active');
        content.style.display = '';
      } else {
        item.classList.remove('active');
        content.style.display = 'none';
      }
      const title = item.querySelector<HTMLElement>(':scope > .accordion-title');
      if (!title) return;
      const handler = () => {
        const wasActive = item.classList.contains('active');
        // Close all siblings
        items.forEach((sib) => {
          const sc = sib.querySelector<HTMLElement>(':scope > .accordion-content');
          sib.classList.remove('active');
          if (sc) sc.style.display = 'none';
        });
        if (!wasActive) {
          item.classList.add('active');
          content.style.display = '';
        }
      };
      title.addEventListener('click', handler);
      listeners.push([title, handler]);
    });
  });
  return () => {
    for (const [el, fn] of listeners) el.removeEventListener('click', fn);
  };
}

/** Orig's boskery-theme.js mirrors WordPress's `.current-menu-item` /
 *  `.current_page_item` / `.current-menu-parent` / `.current-menu-ancestor`
 *  classes into the plain `.current` class, which is what the theme's menu
 *  CSS actually styles (`.main-menu__list > li.current > a` etc). Replicate. */
function applyCurrentMenuClass(root: HTMLElement): void {
  root.querySelectorAll<HTMLElement>(
    '.main-menu__list li.current-menu-item, .main-menu__list li.current-menu-parent, .main-menu__list li.current-menu-ancestor, .main-menu__list li.current_page_item',
  ).forEach((li) => li.classList.add('current'));
}

/** Orig ships a jQuery "sticky-nav" plugin that clones the `.sticky-header`
 *  element, inserts the clone as a fixed child at the top of `<body>`, and
 *  toggles `.active` on the clone past a scroll threshold. The `.active`
 *  class triggers a `translateY(-100%) → 0%` transition defined in
 *  `style.css:8219`. Replicate here so the clone gets the same drop-down
 *  header that appears on scroll.
 *
 *  Returns a cleanup function that removes the cloned node on unmount. */
function applyStickyHeaderClone(root: HTMLElement): (() => void) | undefined {
  const source = root.querySelector<HTMLElement>('.main-header.sticky-header');
  if (!source) return undefined;
  // Avoid double-cloning if the DOM already has a cloned header (hot-reload).
  if (source.parentElement?.querySelector('.sticky-header--cloned')) return undefined;
  const clone = source.cloneNode(true) as HTMLElement;
  clone.classList.add('sticky-header--cloned');
  // Stale WordPress IDs inside the clone would otherwise duplicate ids on
  // the page (`menu-main-menu-new` for instance). Strip them.
  clone.removeAttribute('id');
  clone.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'));
  source.insertAdjacentElement('afterend', clone);

  const headerHeight = source.offsetHeight || 128;
  const onScroll = () => {
    const active = window.scrollY > headerHeight;
    source.classList.toggle('active', active);
    clone.classList.toggle('active', active);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  return () => {
    window.removeEventListener('scroll', onScroll);
    clone.remove();
  };
}

/** Orig's boskery-theme.js toggles `.show` on `.scroll-to-top` past scrollY>500
 *  and smooth-scrolls to top on click. Replicate both without jQuery. */
function applyScrollToTop(root: HTMLElement): (() => void) | undefined {
  const btns = root.querySelectorAll<HTMLAnchorElement>('.scroll-to-top');
  if (!btns.length) return undefined;
  const THRESHOLD = 500;
  const onScroll = () => {
    const show = window.scrollY > THRESHOLD;
    btns.forEach((b) => b.classList.toggle('show', show));
  };
  const onClick = (e: MouseEvent) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  btns.forEach((b) => b.addEventListener('click', onClick));
  onScroll(); // sync initial state
  return () => {
    window.removeEventListener('scroll', onScroll);
    btns.forEach((b) => b.removeEventListener('click', onClick));
  };
}

export function applyStaticFallbacks(root: HTMLElement): () => void {
  removePreloader(root);
  applyElementorLazyLoaded(root);
  applyVideoBackgrounds(root);
  applyOwlCarousels(root);
  applyWowAnimations(root);
  applyCounters(root);
  applyCurrentMenuClass(root);
  const c1 = applyScrollToTop(root);
  const c2 = applyStickyHeaderClone(root);
  const c3 = applyFaqAccordion(root);
  return () => { c1?.(); c2?.(); c3?.(); };
}

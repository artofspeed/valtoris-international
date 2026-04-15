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
  // Orig's sticky-nav plugin inserts a fixed-position clone of the header
  // that's permanently transformed off-screen via `translateY(-105px)` —
  // it only becomes visible if the plugin adds `.active` (which on the live
  // site it actually never does, because the activation threshold is never
  // met). Mirror the DOM exactly so page-height math matches, but DO NOT
  // toggle `.active` on scroll: the theme's `transition: all` on the source
  // header would otherwise create a visible "flash / dark-shadow" glitch
  // every time the user scrolled past the threshold.
  const clone = source.cloneNode(true) as HTMLElement;
  clone.classList.add('sticky-header--cloned');
  clone.removeAttribute('id');
  clone.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'));
  // Defensively disable transitions on the clone so any residual hover or
  // state change can't produce the flash. The clone is off-screen anyway.
  clone.style.transition = 'none';
  source.insertAdjacentElement('afterend', clone);
  return () => {
    clone.remove();
  };
}

/** Orig's theme JS toggles `.expanded` on `.mobile-nav__wrapper` when the
 *  hamburger `.mobile-nav__toggler` is clicked. `.expanded` slides the nav
 *  panel in via `transform: translateX(0)` (see style.css). The `.mobile-nav__close`
 *  icon and the transparent `.mobile-nav__overlay` below the panel both close
 *  it. We replicate the toggle with no jQuery. */
function applyMobileNav(root: HTMLElement): (() => void) | undefined {
  const wrapper = root.querySelector<HTMLElement>('.mobile-nav__wrapper');
  if (!wrapper) return undefined;
  const listeners: Array<[Element, string, EventListener]> = [];

  // WordPress renders `.mobile-nav__container` as an EMPTY div; boskery's
  // theme JS clones `.main-menu .main-menu__list` into it on page load.
  // Recreate that clone here, strip duplicate IDs, then append a `<button>`
  // dropdown toggler inside each anchor of a `.menu-item-has-children` so
  // sub-menus can be expanded on tap (matches the orig markup we probed).
  const container = root.querySelector<HTMLElement>('.mobile-nav__container');
  if (container && !container.children.length) {
    const source = root.querySelector<HTMLElement>('.main-menu .main-menu__list');
    if (source) {
      const clone = source.cloneNode(true) as HTMLElement;
      clone.removeAttribute('id');
      clone.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'));
      // Add chevron buttons to any parent-item anchors missing one.
      clone.querySelectorAll<HTMLElement>('.menu-item-has-children > a').forEach((a) => {
        if (a.querySelector(':scope > button')) return;
        const btn = document.createElement('button');
        btn.setAttribute('aria-label', 'dropdown toggler');
        btn.innerHTML = '<i class="fa fa-angle-down"></i>';
        a.appendChild(btn);
      });
      container.appendChild(clone);
    }
  }

  const open = () => { wrapper.classList.add('expanded'); };
  const close = () => { wrapper.classList.remove('expanded'); };

  // Hamburger toggles (there are usually two — one in the top bar + one in
  // the main header — both scoped outside .mobile-nav__wrapper).
  document.querySelectorAll<HTMLElement>('.mobile-nav__toggler').forEach((btn) => {
    if (wrapper.contains(btn)) return;
    const h = (e: Event) => { e.preventDefault(); e.stopPropagation(); open(); };
    btn.addEventListener('click', h);
    listeners.push([btn, 'click', h]);
  });

  // Close icon + overlay inside the panel.
  wrapper.querySelectorAll<HTMLElement>('.mobile-nav__close, .mobile-nav__overlay').forEach((el) => {
    const h = (e: Event) => { e.preventDefault(); e.stopPropagation(); close(); };
    el.addEventListener('click', h);
    listeners.push([el, 'click', h]);
  });

  // Tapping an actual menu link should close the panel (mirrors orig UX).
  wrapper.querySelectorAll<HTMLAnchorElement>('.mobile-nav__container a').forEach((a) => {
    // Skip the `<a href="#">` that only exists to hold the dropdown toggler.
    if (a.getAttribute('href') === '#' || a.classList.contains('menu-f')) return;
    const h = () => close();
    a.addEventListener('click', h);
    listeners.push([a, 'click', h]);
  });

  // Dropdown sub-menus inside the mobile nav. Orig's markup embeds a
  // `<button>` inside the `<a>` element of any `.menu-item-has-children`.
  // Clicking it toggles the `<ul>` sibling's `display` and flips a `.expanded`
  // class on the button (CSS rotates the chevron via the class).
  wrapper.querySelectorAll<HTMLElement>('.menu-item-has-children > a button').forEach((btn) => {
    const li = btn.closest<HTMLElement>('.menu-item-has-children');
    const ul = li?.querySelector<HTMLElement>(':scope > ul');
    if (!ul) return;
    // Start collapsed (orig's CSS default is `display: none` on sub-menus).
    ul.style.display = 'none';
    btn.classList.remove('expanded');
    const h = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      const isOpen = btn.classList.toggle('expanded');
      ul.style.display = isOpen ? 'block' : 'none';
    };
    btn.addEventListener('click', h);
    listeners.push([btn, 'click', h]);
    // Also trap clicks on the parent anchor that holds the nested button, so
    // tapping "Our Products" toggles (rather than navigating to "#").
    const parentA = btn.closest('a');
    if (parentA && parentA.getAttribute('href') === '#') {
      const ah = (e: Event) => {
        e.preventDefault();
        const isOpen = btn.classList.toggle('expanded');
        ul.style.display = isOpen ? 'block' : 'none';
      };
      parentA.addEventListener('click', ah);
      listeners.push([parentA, 'click', ah]);
    }
  });

  return () => {
    for (const [el, ev, h] of listeners) el.removeEventListener(ev, h);
    wrapper.classList.remove('expanded');
  };
}

/** Search popup: clicking `.search-toggler` flips `.active` on `.search-popup`,
 *  which triggers a CSS scale-in from a circular overlay. The popup markup
 *  contains a second `.search-toggler` (the overlay `<div>`) which acts as
 *  the click-outside dismiss. Escape also closes. */
function applySearchPopup(root: HTMLElement): (() => void) | undefined {
  const popup = root.querySelector<HTMLElement>('.search-popup');
  if (!popup) return undefined;
  const listeners: Array<[Element | Document, string, EventListener]> = [];

  const toggle = (e: Event) => {
    e.preventDefault();
    // Stop the StaticPage SPA click interceptor from treating the anchor's
    // `href="index.html#"` as a navigation target (would trigger a rerender
    // that tears down this effect and drops the `.active` we just added).
    e.stopPropagation();
    popup.classList.toggle('active');
  };
  document.querySelectorAll<HTMLElement>('.search-toggler').forEach((btn) => {
    btn.addEventListener('click', toggle);
    listeners.push([btn, 'click', toggle]);
  });
  const onKey = (e: Event) => {
    if ((e as KeyboardEvent).key === 'Escape') popup.classList.remove('active');
  };
  document.addEventListener('keydown', onKey);
  listeners.push([document, 'keydown', onKey]);
  return () => {
    for (const [el, ev, h] of listeners) (el as HTMLElement).removeEventListener(ev, h);
    popup.classList.remove('active');
  };
}

/** Video-popup button (`.video-button.video-popup`) normally opens a MagnificPopup
 *  lightbox with the MP4 at its href. Without that library the click does
 *  nothing (and in some browsers would try to navigate to the MP4 file,
 *  leaving the SPA). Shim a minimal lightbox: overlay + <video> + close. */
function applyVideoPopup(root: HTMLElement): (() => void) | undefined {
  const btns = root.querySelectorAll<HTMLAnchorElement>('a.video-popup, a.video-button');
  if (!btns.length) return undefined;
  const listeners: Array<[Element, string, EventListener]> = [];
  let overlay: HTMLDivElement | null = null;

  const close = () => {
    if (!overlay) return;
    overlay.remove();
    overlay = null;
    document.body.style.overflow = '';
  };
  const onClick = (e: Event) => {
    const a = e.currentTarget as HTMLAnchorElement;
    const href = a.getAttribute('href') || '';
    if (!href) return;
    e.preventDefault();
    // Stop the StaticPage SPA click interceptor from navigating to the MP4
    // path (rewriteAssetUrls prefixes it with BASE, so the wp-content guard
    // in StaticPage.tsx no longer matches).
    e.stopPropagation();
    overlay = document.createElement('div');
    overlay.className = 'vi-video-lightbox';
    Object.assign(overlay.style, {
      position: 'fixed', inset: '0', zIndex: '10000',
      background: 'rgba(0,0,0,0.88)', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      opacity: '0', transition: 'opacity 250ms ease-out',
    });
    const video = document.createElement('video');
    video.src = href;
    video.controls = true;
    video.autoplay = true;
    video.playsInline = true;
    Object.assign(video.style, {
      maxWidth: '90vw', maxHeight: '85vh',
      boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
    });
    const closeBtn = document.createElement('button');
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.innerHTML = '&times;';
    Object.assign(closeBtn.style, {
      position: 'absolute', top: '20px', right: '24px',
      width: '44px', height: '44px', borderRadius: '50%',
      border: 'none', background: 'rgba(255,255,255,0.12)',
      color: '#fff', fontSize: '28px', lineHeight: '1',
      cursor: 'pointer', backdropFilter: 'blur(8px)',
    });
    closeBtn.addEventListener('click', close);
    overlay.addEventListener('click', (ev) => { if (ev.target === overlay) close(); });
    overlay.appendChild(video);
    overlay.appendChild(closeBtn);
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => { if (overlay) overlay.style.opacity = '1'; });
  };
  btns.forEach((b) => {
    b.addEventListener('click', onClick);
    listeners.push([b, 'click', onClick]);
  });
  const onKey = (e: Event) => { if ((e as KeyboardEvent).key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  return () => {
    for (const [el, ev, h] of listeners) el.removeEventListener(ev, h);
    document.removeEventListener('keydown', onKey);
    close();
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
  const c4 = applyMobileNav(root);
  const c5 = applySearchPopup(root);
  const c6 = applyVideoPopup(root);
  return () => { c1?.(); c2?.(); c3?.(); c4?.(); c5?.(); c6?.(); };
}

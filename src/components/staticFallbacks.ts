/**
 * Static fallbacks for Elementor/Boskery JS behaviors we don't ship.
 *
 * The original WordPress site ships owl-carousel, WOW.js, jQuery-countTo,
 * and a handful of other libraries that reveal elements or animate numbers
 * on interaction. Our clone is static React — no jQuery, no WP globals.
 * Without a shim the side effects leave parts of the page hidden:
 *   - `.owl-carousel` has `display:none` until owl adds `.owl-loaded`
 *   - `.wow` has `visibility:hidden` until WOW.js observes the viewport
 *   - `<h3 data-stop="30">0</h3>` stays "0" until countTo animates to 30
 *
 * This function brute-forces the final state in one pass: show the first
 * slide of every carousel, un-hide all animated elements, and write each
 * counter's `data-stop` into its text.
 *
 * Call once after the page HTML is injected into the DOM.
 */
export function applyStaticFallbacks(root: HTMLElement): void {
  // 1. Owl carousels — show first .item, hide the rest (closest thing to
  //    "first slide visible" without running owl's JS).
  root.querySelectorAll<HTMLElement>('.owl-carousel').forEach((carousel) => {
    carousel.classList.add('owl-loaded', 'owl-drag');
    carousel.style.display = 'block';
    const items = carousel.querySelectorAll<HTMLElement>(':scope > .item, :scope > .hero-slider-one__item');
    items.forEach((el, i) => {
      el.style.display = i === 0 ? '' : 'none';
    });
  });

  // 2. WOW animations — bypass the observer-gated visibility:hidden state.
  root.querySelectorAll<HTMLElement>('.wow').forEach((el) => {
    el.style.visibility = 'visible';
    el.style.animationName = 'none';
    el.classList.add('animated');
  });

  // 3. Counters (Boskery/countTo) — replace the "0" placeholder with the
  //    final value declared in `data-stop`.
  root.querySelectorAll<HTMLElement>('[data-stop]').forEach((el) => {
    const stop = el.getAttribute('data-stop');
    if (stop) el.textContent = stop;
  });
}

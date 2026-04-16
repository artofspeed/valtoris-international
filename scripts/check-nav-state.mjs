import { chromium } from 'playwright';
const br = await chromium.launch();
const ctx = await br.newContext({ viewport: { width: 375, height: 812 } });
const p = await ctx.newPage();
await p.goto('http://127.0.0.1:4175/valtoris-international/', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(4000);
const info = await p.evaluate(() => {
  const overlay = document.querySelector('.mobile-nav__overlay');
  const content = document.querySelector('.mobile-nav__content');
  const popup = document.querySelector('.search-popup');
  const w = document.querySelector('.mobile-nav__wrapper');
  const r = (el) => el ? { ...el.getBoundingClientRect().toJSON?.() || (() => { const x = el.getBoundingClientRect(); return { x: x.x, y: x.y, w: x.width, h: x.height }; })(), cls: el.className } : null;
  return {
    wrapper: w ? { cls: w.className, expanded: w.classList.contains('expanded') } : null,
    overlay: overlay ? {
      cls: overlay.className,
      visibility: getComputedStyle(overlay).visibility,
      opacity: getComputedStyle(overlay).opacity,
      display: getComputedStyle(overlay).display,
      pointerEvents: getComputedStyle(overlay).pointerEvents,
      bg: getComputedStyle(overlay).backgroundColor,
      pos: getComputedStyle(overlay).position,
      zIndex: getComputedStyle(overlay).zIndex,
    } : null,
    content: content ? {
      cls: content.className,
      visibility: getComputedStyle(content).visibility,
      opacity: getComputedStyle(content).opacity,
      display: getComputedStyle(content).display,
      transform: getComputedStyle(content).transform,
      bg: getComputedStyle(content).backgroundColor,
    } : null,
    popup: popup ? {
      cls: popup.className,
      visibility: getComputedStyle(popup).visibility,
      opacity: getComputedStyle(popup).opacity,
      display: getComputedStyle(popup).display,
      pointerEvents: getComputedStyle(popup).pointerEvents,
    } : null,
  };
});
console.log(JSON.stringify(info, null, 2));
await br.close();

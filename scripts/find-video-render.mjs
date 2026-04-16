import { chromium } from 'playwright';
const br = await chromium.launch();
const ctx = await br.newContext({ viewport: { width: 375, height: 812 } });
const p = await ctx.newPage();
await p.goto('http://127.0.0.1:4175/valtoris-international/', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(4000);
await p.evaluate(() => window.scrollTo(0, 712));
await p.waitForTimeout(400);
const info = await p.evaluate(() => {
  // What's at viewport y=20?
  const all = document.elementsFromPoint(187, 20);
  const v = document.querySelector('.hero-slider-one__video');
  const vrect = v?.getBoundingClientRect();
  return {
    all: all.slice(0, 6).map(el => ({
      tag: el.tagName,
      cls: typeof el.className === 'string' ? el.className.slice(0, 60) : '',
      bg: getComputedStyle(el).backgroundColor,
      pos: getComputedStyle(el).position,
    })),
    video: v ? {
      cls: v.className,
      x: vrect.x, y: vrect.y, w: vrect.width, h: vrect.height,
      bg: getComputedStyle(v).backgroundColor,
      pos: getComputedStyle(v).position,
      readyState: v.readyState,
      paused: v.paused,
      currentSrc: v.currentSrc,
      videoWidth: v.videoWidth,
      videoHeight: v.videoHeight,
      objectFit: getComputedStyle(v).objectFit,
    } : null,
  };
});
console.log(JSON.stringify(info, null, 2));
await br.close();

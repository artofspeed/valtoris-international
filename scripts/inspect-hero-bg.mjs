import { chromium } from 'playwright';
const br = await chromium.launch();
const ctx = await br.newContext({ viewport: { width: 375, height: 812 } });
const p = await ctx.newPage();
await p.goto('http://127.0.0.1:4175/valtoris-international/', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(4000);
const info = await p.evaluate(() => {
  const item = document.querySelector('.hero-slider-one__item');
  const bg = document.querySelector('.hero-slider-one__bg');
  const ir = item?.getBoundingClientRect();
  const br = bg?.getBoundingClientRect();
  const ics = getComputedStyle(item);
  const bcs = getComputedStyle(bg);
  return {
    itemRect: ir,
    itemBgColor: ics.backgroundColor,
    itemBgImg: ics.backgroundImage,
    itemBgSize: ics.backgroundSize,
    itemBgPos: ics.backgroundPosition,
    itemMinH: ics.minHeight,
    itemH: ics.height,
    bgRect: br,
    bgImg: bcs.backgroundImage?.slice(0, 200),
    bgSize: bcs.backgroundSize,
    bgPos: bcs.backgroundPosition,
    bgColor: bcs.backgroundColor,
    bgInline: bg?.getAttribute('style')?.slice(0, 300),
  };
});
console.log(JSON.stringify(info, null, 2));
await br.close();

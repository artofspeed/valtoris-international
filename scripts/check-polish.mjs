import { chromium } from 'playwright';
const br = await chromium.launch();
const ctx = await br.newContext({ viewport: { width: 375, height: 812 } });
const p = await ctx.newPage();
await p.goto('http://127.0.0.1:4175/valtoris-international/', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(4000);
const info = await p.evaluate(() => {
  const item = document.querySelector('.hero-slider-one__item');
  const cs = getComputedStyle(item);
  // also check if polish.css link is in head and is last
  const links = Array.from(document.querySelectorAll('link[rel=stylesheet]'));
  const last = links[links.length - 1];
  const polish = document.getElementById('vi-polish-overrides');
  return {
    bg: cs.backgroundColor,
    height: cs.height,
    minHeight: cs.minHeight,
    padding: cs.padding,
    polishHref: polish?.href,
    polishIsLast: last?.id === 'vi-polish-overrides',
    lastLinkHref: last?.href,
    linkCount: links.length,
  };
});
console.log(JSON.stringify(info, null, 2));
await br.close();

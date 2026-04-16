import { chromium } from 'playwright';
const br = await chromium.launch();
const ctx = await br.newContext({ viewport: { width: 375, height: 812 } });
const p = await ctx.newPage();
await p.goto('http://127.0.0.1:4175/valtoris-international/', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(3500);

// Check .my-icon-sec parent + computed sizes
const info = await p.evaluate(() => {
  const tiles = Array.from(document.querySelectorAll('.my-icon-sec'));
  if (!tiles.length) return 'no .my-icon-sec found';
  const tile = tiles[0];
  const r = tile.getBoundingClientRect();
  const cs = getComputedStyle(tile);
  const parent = tile.parentElement;
  const pr = parent.getBoundingClientRect();
  const pcs = getComputedStyle(parent);
  return {
    count: tiles.length,
    tileWidth: r.width,
    tileFlex: cs.flex,
    tileFlexBasis: cs.flexBasis,
    parentTag: parent.tagName,
    parentClass: parent.className,
    parentWidth: pr.width,
    parentDisplay: pcs.display,
    parentFlexWrap: pcs.flexWrap,
    parentFlexDir: pcs.flexDirection,
    grandparentClass: parent.parentElement?.className,
  };
});
console.log(JSON.stringify(info, null, 2));
await br.close();

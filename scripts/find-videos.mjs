import { chromium } from 'playwright';
const br = await chromium.launch();
const ctx = await br.newContext({ viewport: { width: 375, height: 1500 } });
const p = await ctx.newPage();
await p.goto('http://127.0.0.1:4175/valtoris-international/', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(4000);
const info = await p.evaluate(() => {
  const vids = Array.from(document.querySelectorAll('video'));
  return vids.map(v => {
    const r = v.getBoundingClientRect();
    const cs = getComputedStyle(v);
    return {
      cls: v.className,
      y: Math.round(r.y), h: Math.round(r.height), b: Math.round(r.bottom), w: Math.round(r.width),
      pos: cs.position,
      bg: cs.backgroundColor,
      vis: cs.visibility, disp: cs.display,
      src: v.querySelector('source')?.getAttribute('src')?.slice(-50),
      readyState: v.readyState,
    };
  });
});
console.log(JSON.stringify(info, null, 2));

// Also check iframes
const ifr = await p.evaluate(() => Array.from(document.querySelectorAll('iframe')).map(f => {
  const r = f.getBoundingClientRect();
  return { src: f.src.slice(-60), y: Math.round(r.y), h: Math.round(r.height), b: Math.round(r.bottom), w: Math.round(r.width) };
}));
console.log('iframes:', JSON.stringify(ifr, null, 2));
await br.close();

#!/usr/bin/env node
/** Find elements with rotation transforms applied on every page at mobile + desktop
 *  widths. Report any that aren't actively spinning icons (which is the one
 *  legitimate use case). */
import { chromium } from 'playwright';
const BASE = 'http://127.0.0.1:4175/valtoris-international';
const routes = ['/', '/about-us/', '/beef-tenderloin/', '/pork/', '/chicken/', '/greens/', '/sugar/', '/papers/', '/news/', '/contact-us/', '/login/', '/valtoris-attends-canadian-meat-council-annual-conference-2025/'];

const br = await chromium.launch();

for (const vp of [{ w: 375, h: 812, label: 'mobile' }, { w: 1440, h: 900, label: 'desktop' }]) {
  console.log(`\n=============== VIEWPORT: ${vp.label} (${vp.w}x${vp.h}) ===============`);
  const ctx = await br.newContext({ viewport: { width: vp.w, height: vp.h } });
  const p = await ctx.newPage();
  for (const route of routes) {
    await p.goto(BASE + route, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(2500);
    const results = await p.evaluate(() => {
      const out = [];
      for (const el of document.querySelectorAll('*')) {
        const cs = getComputedStyle(el);
        const t = cs.transform;
        if (!t || t === 'none') continue;
        // Parse the matrix for rotation (atan2(b, a))
        const m = t.match(/matrix\(\s*([^,]+),\s*([^,]+),/);
        if (!m) continue;
        const a = parseFloat(m[1]); const b = parseFloat(m[2]);
        const deg = Math.round(Math.atan2(b, a) * 180 / Math.PI);
        if (Math.abs(deg) < 2) continue; // no rotation
        const r = el.getBoundingClientRect();
        // Skip offscreen / zero-size
        if (r.width < 5 || r.height < 5) continue;
        if (r.bottom < 0 || r.top > window.innerHeight * 4) continue;
        // Skip things with animation-name: we accept them as intentional spinners
        const an = cs.animationName;
        if (an && an !== 'none' && an !== '' && !an.startsWith('dropdownAnim')) continue;
        out.push({
          tag: el.tagName.toLowerCase(),
          cls: (el.className && typeof el.className === 'string' ? el.className : '').slice(0, 80),
          id: el.id ? '#' + el.id : '',
          deg,
          rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
          parentCls: el.parentElement ? (typeof el.parentElement.className === 'string' ? el.parentElement.className.slice(0, 60) : '') : '',
          hasInnerText: (el.textContent || '').trim().slice(0, 30),
        });
      }
      return out;
    });
    if (results.length) {
      console.log(`\n[${route}] ${results.length} rotated elements:`);
      for (const r of results) console.log(`  ${r.deg}° ${r.tag}${r.id}.${r.cls}  rect=${r.rect.x},${r.rect.y} ${r.rect.w}x${r.rect.h}  text="${r.hasInnerText}"`);
    }
  }
  await ctx.close();
}
await br.close();

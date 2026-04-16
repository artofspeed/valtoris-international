#!/usr/bin/env node
import { chromium } from 'playwright';
const br = await chromium.launch();
const ctx = await br.newContext({ viewport: { width: 375, height: 812 } });
const p = await ctx.newPage();
await p.goto('http://127.0.0.1:4175/valtoris-international/', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(3500);

// Full DOM dump of the client-carousel__one structure
const info = await p.evaluate(() => {
  const el = document.querySelector('.client-carousel__one');
  if (!el) return null;
  const out = { tag: el.tagName, cls: (el.className || '').slice(0, 200), html: el.outerHTML.slice(0, 2000) };
  // Get computed styles of el and direct descendants
  const css = (n) => {
    const cs = getComputedStyle(n);
    const r = n.getBoundingClientRect();
    return {
      tag: n.tagName,
      cls: (typeof n.className === 'string' ? n.className : (n.className?.baseVal || '')).slice(0, 120),
      display: cs.display, flexDir: cs.flexDirection, flexWrap: cs.flexWrap,
      width: Math.round(r.width), height: Math.round(r.height),
      transform: cs.transform.slice(0, 60),
      float: cs.float,
    };
  };
  out.self = css(el);
  out.children = [];
  const walk = (n, depth) => {
    if (depth > 4) return;
    for (const c of n.children) {
      out.children.push({ depth, ...css(c) });
      walk(c, depth + 1);
    }
  };
  walk(el, 0);
  return out;
});
console.log(JSON.stringify(info, null, 2));
await br.close();

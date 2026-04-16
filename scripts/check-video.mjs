#!/usr/bin/env node
import { chromium } from 'playwright';
const br = await chromium.launch();
const ctx = await br.newContext({ viewport: { width: 375, height: 812 } });
const p = await ctx.newPage();
p.on('requestfailed', (r) => console.log('[reqfail]', r.url(), r.failure()?.errorText));
p.on('response', (r) => { if (r.status() >= 400) console.log('[resp]', r.status(), r.url().slice(0, 150)); });
await p.goto('http://127.0.0.1:4175/valtoris-international/', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(4000);

const info = await p.evaluate(() => {
  const vids = [...document.querySelectorAll('video')].map(v => ({
    src: v.src || v.currentSrc || 'no src',
    sources: [...v.querySelectorAll('source')].map(s => s.src),
    readyState: v.readyState,
    networkState: v.networkState,
    error: v.error ? { code: v.error.code, msg: v.error.message } : null,
    paused: v.paused,
    duration: v.duration,
    videoWidth: v.videoWidth,
    videoHeight: v.videoHeight,
    poster: v.poster,
    cls: (typeof v.className === 'string' ? v.className : ''),
    parent: v.parentElement?.tagName + '.' + v.parentElement?.className?.slice(0, 80),
    rect: (() => { const r = v.getBoundingClientRect(); return { top: Math.round(r.top + window.scrollY), h: Math.round(r.height), w: Math.round(r.width) }; })(),
  }));
  const bgDivs = [...document.querySelectorAll('.hero-slider-one__bg')].map(d => {
    const cs = getComputedStyle(d);
    const r = d.getBoundingClientRect();
    return {
      bg: cs.backgroundColor,
      bgi: cs.backgroundImage.slice(0, 100),
      pos: cs.position,
      inset: `${cs.top}/${cs.right}/${cs.bottom}/${cs.left}`,
      docTop: Math.round(r.top + window.scrollY), h: Math.round(r.height), w: Math.round(r.width),
      innerHTML: d.innerHTML.slice(0, 200),
    };
  });
  return { vids, bgDivs };
});
console.log(JSON.stringify(info, null, 2));
await br.close();

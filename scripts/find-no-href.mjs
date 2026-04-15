#!/usr/bin/env node
import { chromium } from 'playwright';
const br = await chromium.launch();
const ctx = await br.newContext();
const p = await ctx.newPage();
await p.goto('http://127.0.0.1:4175/valtoris-international/', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(3500);
const noHref = await p.evaluate(() => {
  const host = document.querySelector('[data-vi-static-page]');
  const anchors = Array.from(host.querySelectorAll('a'));
  return anchors.filter(a => !a.hasAttribute('href') || a.getAttribute('href') === null).map(a => ({
    text: (a.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 80) || ('[img alt=' + (a.querySelector('img')?.getAttribute('alt') || '') + ']'),
    cls: a.className.slice(0, 80),
    parent: a.parentElement?.className.slice(0, 80) || '',
    outerHTMLStart: a.outerHTML.slice(0, 200),
  }));
});
console.log(JSON.stringify(noHref, null, 2));
await br.close();

import { chromium } from 'playwright';
const br = await chromium.launch();
const ctx = await br.newContext({ viewport: { width: 375, height: 812 } });
const p = await ctx.newPage();
p.on('console', (msg) => console.log('[console]', msg.type(), msg.text().slice(0, 300)));
p.on('pageerror', (e) => console.log('[error]', e.message.slice(0, 300)));
p.on('requestfailed', (r) => console.log('[reqfail]', r.url(), r.failure()?.errorText));
p.on('response', (r) => { if (r.status() >= 400) console.log('[resp]', r.status(), r.url()); });
await p.goto('http://127.0.0.1:4175/valtoris-international/', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(5000);
const info = await p.evaluate(() => ({
  docH: document.documentElement.scrollHeight,
  bodyH: document.body.scrollHeight,
  bodyInnerLen: document.body.innerHTML.length,
  bodyChildren: document.body.children.length,
  rootHTML: document.getElementById('root')?.innerHTML.length || 0,
  title: document.title,
  hasHero: !!document.querySelector('.hero-slider-one, .main-banner'),
  htmlHeight: getComputedStyle(document.documentElement).height,
  bodyHeight: getComputedStyle(document.body).height,
  htmlOverflow: getComputedStyle(document.documentElement).overflow,
  htmlOverflowY: getComputedStyle(document.documentElement).overflowY,
}));
console.log(JSON.stringify(info, null, 2));
await br.close();

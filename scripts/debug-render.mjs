import { chromium } from 'playwright';
const br = await chromium.launch();
const ctx = await br.newContext({ viewport: { width: 375, height: 812 } });
const p = await ctx.newPage();
p.on('console', (m) => console.log('  [console]', m.type(), m.text().slice(0, 200)));
p.on('pageerror', (e) => console.log('  [pageerror]', e.message));
await p.goto('http://127.0.0.1:4175/valtoris-international/', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(4000);
const info = await p.evaluate(() => {
  const host = document.querySelector('[data-vi-static-page]');
  const body = document.body;
  const root = document.getElementById('root');
  return {
    title: document.title,
    bodyHeight: body.scrollHeight,
    bodyClass: body.className,
    rootChildren: root ? root.children.length : -1,
    rootHTML: root ? root.innerHTML.slice(0, 300) : null,
    hostBytes: host ? host.innerHTML.length : 0,
    linkCount: document.querySelectorAll('link[rel=stylesheet]').length,
    visibleCount: Array.from(document.querySelectorAll('body *')).filter((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && r.top < window.innerHeight;
    }).length,
  };
});
console.log(JSON.stringify(info, null, 2));
await br.close();

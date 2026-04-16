import { chromium } from 'playwright';
const br = await chromium.launch();
const ctx = await br.newContext({ viewport: { width: 375, height: 812 } });
const p = await ctx.newPage();
await p.goto('http://127.0.0.1:4175/valtoris-international/', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(4000);
const info = await p.evaluate(() => {
  const list = Array.from(document.querySelectorAll('*')).filter(el => {
    const t = el.textContent || '';
    if (el.children.length > 0) return false;
    return /1996|since.*1996|SINCE/i.test(t.slice(0, 50));
  }).slice(0, 10);
  return list.map(el => {
    let n = el; const chain = [];
    for (let i = 0; i < 5 && n; i++) {
      chain.push({ tag: n.tagName, cls: typeof n.className === 'string' ? n.className : (n.className?.baseVal || '') });
      n = n.parentElement;
    }
    return { text: (el.textContent || '').slice(0, 50), chain };
  });
});
console.log(JSON.stringify(info, null, 2));
await br.close();

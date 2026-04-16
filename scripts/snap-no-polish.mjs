import { chromium } from 'playwright';
const br = await chromium.launch();
const ctx = await br.newContext({ viewport: { width: 375, height: 1500 } });
const p = await ctx.newPage();
await p.goto('http://127.0.0.1:4175/valtoris-international/', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(4000);
await p.evaluate(() => {
  const polish = document.getElementById('vi-polish-overrides');
  if (polish) polish.remove();
});
await p.waitForTimeout(500);
await p.screenshot({ path: '/tmp/no-polish.png', clip: { x: 0, y: 700, width: 375, height: 200 }, fullPage: true });
console.log('saved');
await br.close();

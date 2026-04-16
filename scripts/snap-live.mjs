import { chromium } from 'playwright';
const br = await chromium.launch();
const ctx = await br.newContext({ viewport: { width: 375, height: 1500 }, ignoreHTTPSErrors: true });
const p = await ctx.newPage();
await p.goto('https://artofspeed.github.io/valtoris-international/', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(6000);
await p.screenshot({ path: '/tmp/live-region.png', clip: { x: 0, y: 700, width: 375, height: 200 }, fullPage: true });
console.log('saved');
await br.close();

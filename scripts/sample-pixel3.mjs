import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';

const br = await chromium.launch();
const ctx = await br.newContext({ viewport: { width: 375, height: 1500 } });
const p = await ctx.newPage();
await p.goto('http://127.0.0.1:4175/valtoris-international/', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(4000);
const buf = await p.screenshot({ clip: { x: 100, y: 720, width: 1, height: 100 }, fullPage: true });
writeFileSync('/tmp/pixel-strip.png', buf);

// Use sharp/jimp? Let's parse PNG manually for IDAT chunk... too complex.
// Easier: use canvas via puppeteer
const data = await p.evaluate(async (b64) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.width; c.height = img.height;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const samples = [];
      for (let y = 0; y < img.height; y += 10) {
        const d = ctx.getImageData(0, y, 1, 1).data;
        samples.push({ y, r: d[0], g: d[1], b: d[2], a: d[3] });
      }
      resolve(samples);
    };
    img.onerror = (e) => resolve('error: ' + e);
    img.src = 'data:image/png;base64,' + b64;
  });
}, buf.toString('base64'));
console.log(JSON.stringify(data, null, 2));
await br.close();

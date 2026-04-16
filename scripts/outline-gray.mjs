#!/usr/bin/env node
import { chromium } from 'playwright';
const br = await chromium.launch();
const ctx = await br.newContext({ viewport: { width: 375, height: 812 } });
const p = await ctx.newPage();
await p.goto('http://127.0.0.1:4175/valtoris-international/', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(4000);

// Outline every element, scroll to the gray band, take a chunk screenshot.
await p.addStyleTag({ content: `
  body * { outline: 1px solid rgba(255, 0, 0, 0.4) !important; }
  [class*="hero-slider"], [class*="hero-main"] { outline: 2px solid lime !important; }
  [class*="elementor-element-fda9124"], [class*="elementor-element-14f13cf"] { outline: 2px solid cyan !important; }
  [class*="elementor-element-aa38394"] { outline: 2px solid yellow !important; }
` });
await p.evaluate(() => window.scrollTo(0, 600));
await p.waitForTimeout(500);
await p.screenshot({ path: '/tmp/outline.png', clip: { x: 0, y: 0, width: 375, height: 400 } });
console.log('saved /tmp/outline.png');
await br.close();

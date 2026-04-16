#!/usr/bin/env node
import { chromium } from 'playwright';
const br = await chromium.launch();
const ctx = await br.newContext({ viewport: { width: 375, height: 812 } });
const p = await ctx.newPage();
await p.goto('http://127.0.0.1:4175/valtoris-international/', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(4000);
await p.screenshot({ path: '/tmp/home-clean.png', fullPage: false });
await p.evaluate(() => window.scrollTo(0, 500));
await p.waitForTimeout(500);
await p.screenshot({ path: '/tmp/home-scroll500.png', fullPage: false });
console.log('saved');
await br.close();

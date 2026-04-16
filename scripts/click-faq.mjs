#!/usr/bin/env node
/** Click an FAQ toggle and check what rotates. */
import { chromium } from 'playwright';
const br = await chromium.launch();
const ctx = await br.newContext({ viewport: { width: 375, height: 812 } });
const p = await ctx.newPage();
await p.goto('http://127.0.0.1:4175/valtoris-international/beef-tenderloin/', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(3000);

// find the "-" button (first FAQ is open by default, has minus)
// click the second FAQ (closed, +)
const beforeSecond = await p.evaluate(() => {
  const items = document.querySelectorAll('.accordion');
  const second = items[1];
  if (!second) return 'no second item';
  const title = second.querySelector('.accordion-title, .accrodion-title');
  const titleCs = title ? getComputedStyle(title) : null;
  const iconSpan = second.querySelector('.accordion-title span, .accrodion-title span, .plus, .minus, [class*="plus"], [class*="minus"], i');
  const iconCs = iconSpan ? getComputedStyle(iconSpan) : null;
  return {
    title_html: title ? title.outerHTML.slice(0, 300) : null,
    title_transform: titleCs ? titleCs.transform : null,
    icon_html: iconSpan ? iconSpan.outerHTML.slice(0, 200) : null,
    icon_transform: iconCs ? iconCs.transform : null,
    icon_cls: iconSpan ? iconSpan.className : null,
  };
});
console.log('BEFORE click second FAQ:', JSON.stringify(beforeSecond, null, 2));

// Click it
await p.evaluate(() => {
  const items = document.querySelectorAll('.accordion');
  const second = items[1];
  const title = second?.querySelector('.accordion-title, .accrodion-title');
  if (title) title.click();
});
await p.waitForTimeout(600);

const after = await p.evaluate(() => {
  const items = document.querySelectorAll('.accordion');
  const second = items[1];
  const title = second.querySelector('.accordion-title, .accrodion-title');
  const titleCs = title ? getComputedStyle(title) : null;
  const iconSpan = second.querySelector('.accordion-title span, .accrodion-title span');
  const iconCs = iconSpan ? getComputedStyle(iconSpan) : null;
  return {
    title_classes: title ? title.className : null,
    title_transform: titleCs ? titleCs.transform : null,
    title_transition: titleCs ? titleCs.transition : null,
    icon_transform: iconCs ? iconCs.transform : null,
    icon_transition: iconCs ? iconCs.transition : null,
    parent_classes: second.className,
  };
});
console.log('AFTER click:', JSON.stringify(after, null, 2));

await br.close();

#!/usr/bin/env node
import { chromium } from 'playwright';
const br = await chromium.launch();

// FAQ page (beef-tenderloin)
{
  const ctx = await br.newContext({ viewport: { width: 375, height: 812 } });
  const p = await ctx.newPage();
  await p.goto('http://127.0.0.1:4175/valtoris-international/beef-tenderloin/', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(3000);

  console.log('\n=== FAQ ACCORDION BUTTONS ===');
  const faqInfo = await p.evaluate(() => {
    const btns = document.querySelectorAll('.accrodion-btn, [class*="accordion"], [class*="faq"]');
    const out = [];
    for (const b of btns) {
      const r = b.getBoundingClientRect();
      if (r.width < 10) continue;
      const cs = getComputedStyle(b);
      out.push({
        tag: b.tagName,
        cls: (typeof b.className === 'string' ? b.className : '').slice(0, 100),
        transform: cs.transform,
        transition: cs.transition,
        html: b.outerHTML.slice(0, 200),
      });
      if (out.length >= 5) break;
    }
    return out;
  });
  console.log(JSON.stringify(faqInfo, null, 2));
  await ctx.close();
}

// Home page — inspect horizontal overflow
{
  const ctx = await br.newContext({ viewport: { width: 375, height: 812 } });
  const p = await ctx.newPage();
  await p.goto('http://127.0.0.1:4175/valtoris-international/', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(3000);

  console.log('\n=== HORIZONTAL OVERFLOW — HOME ===');
  const overflow = await p.evaluate(() => {
    const vw = window.innerWidth;
    const bodyScrollWidth = document.body.scrollWidth;
    const docScrollWidth = document.documentElement.scrollWidth;
    const out = [];
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect();
      if (r.right > vw + 5 && r.width > 50 && r.width < vw + 500) {
        out.push({
          tag: el.tagName,
          cls: (typeof el.className === 'string' ? el.className : '').slice(0, 80),
          rightEdge: Math.round(r.right),
          width: Math.round(r.width),
        });
      }
    }
    const seen = new Set();
    const deduped = out.filter((x) => { const k = x.cls; if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 15);
    return { vw, bodyScrollWidth, docScrollWidth, samples: deduped };
  });
  console.log(JSON.stringify(overflow, null, 2));

  console.log('\n=== OUR PRODUCTS SECTION (beef/pork/chicken icons) ===');
  const products = await p.evaluate(() => {
    // Find the "OUR PRODUCTS" heading and its containing section
    const heads = Array.from(document.querySelectorAll('*')).filter((el) => {
      const t = (el.textContent || '').trim().toUpperCase();
      return (t === 'OUR PRODUCTS' || t.startsWith('OUR\nPRODUCTS') || t === 'OUR\u00a0PRODUCTS') && el.children.length === 0;
    });
    if (!heads.length) return 'heading not found';
    const section = heads[0].closest('section, .elementor-section, .e-con, .container');
    if (!section) return 'section ancestor not found';
    const r = section.getBoundingClientRect();
    return {
      cls: section.className.slice(0, 150),
      width: r.width,
      height: r.height,
      childCount: section.children.length,
      display: getComputedStyle(section).display,
      gridCols: getComputedStyle(section).gridTemplateColumns,
      flexDir: getComputedStyle(section).flexDirection,
      html: section.outerHTML.slice(0, 500),
    };
  });
  console.log(JSON.stringify(products, null, 2));

  await ctx.close();
}
await br.close();

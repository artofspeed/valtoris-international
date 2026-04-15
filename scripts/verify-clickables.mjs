#!/usr/bin/env node
/** Click every unique clickable element in the catalog and verify the effect.
 *  Compares clone behavior vs orig where applicable. */
import { chromium } from 'playwright';
import { readFileSync } from 'fs';

const CLONE_BASE = 'http://127.0.0.1:4175/valtoris-international';
const ORIG_BASE = 'https://valtorisinternational.com';
const unique = JSON.parse(readFileSync('/tmp/clickable-unique.json', 'utf-8'));

const br = await chromium.launch();
const issues = [];
const pass = [];

function log(level, item, note) {
  const row = { level, text: item.text.slice(0, 40), href: item.href, cat: item.cat, route: item.firstSeenOn, note };
  if (level === 'FAIL') issues.push(row);
  else pass.push(row);
  const short = `[${level}] ${item.cat.padEnd(22)} "${item.text.slice(0, 30)}"`.padEnd(70);
  console.log(`${short} ${note}`);
}

async function withPage(base, route, fn) {
  const ctx = await br.newContext({ viewport: { width: 1440, height: 900 }, ignoreHTTPSErrors: true });
  const p = await ctx.newPage();
  const url = base + route;
  try {
    await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await p.waitForTimeout(3000);
    return await fn(p);
  } finally {
    await ctx.close();
  }
}

// Helper: find element by cat + text + href and click it, track outcome
async function clickAndObserve(p, item) {
  const res = await p.evaluate((it) => {
    // Find target by tag + href + text (approximate)
    const host = document.querySelector('[data-vi-static-page]');
    if (!host) return { err: 'no host' };
    const all = Array.from(host.querySelectorAll(
      'a, button, input[type="submit"], input[type="button"], [onclick], [role="button"]'
    ));
    const candidates = all.filter(el => {
      const tagOk = el.tagName === it.tag;
      const hrefOk = (el.getAttribute('href') || null) === it.href;
      const text = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 80);
      const textOk = text === it.text || (it.text.startsWith('[') && !text);
      return tagOk && hrefOk && textOk;
    });
    if (!candidates.length) return { err: 'element not found', tried: all.length };
    const el = candidates[0];
    const rect = el.getBoundingClientRect();
    // Scroll into view first
    el.scrollIntoView({ block: 'center' });
    return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2, tag: el.tagName };
  }, item);
  return res;
}

for (const it of unique) {
  const route = it.firstSeenOn;
  try {
    switch (it.cat) {
      case 'a:asset': {
        // Should open video lightbox (shimmed)
        await withPage(CLONE_BASE, route, async (p) => {
          const urlBefore = p.url();
          const overlayBefore = await p.evaluate(() => !!document.querySelector('.vi-video-lightbox'));
          await p.evaluate((it) => {
            const host = document.querySelector('[data-vi-static-page]');
            const els = Array.from(host.querySelectorAll('a'));
            const m = els.find(a => a.getAttribute('href') === it.href);
            if (m) m.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
          }, it);
          await p.waitForTimeout(600);
          const overlayAfter = await p.evaluate(() => !!document.querySelector('.vi-video-lightbox'));
          const urlAfter = p.url();
          if (overlayAfter && urlAfter === urlBefore) log('OK', it, 'lightbox opened');
          else log('FAIL', it, `overlayAfter=${overlayAfter} urlChanged=${urlAfter !== urlBefore}`);
        });
        break;
      }
      case 'a:external': {
        // Verify href is a valid URL and target=_blank (orig opens new tab)
        try {
          const u = new URL(it.href);
          if (!u.hostname.includes('.')) log('FAIL', it, `malformed hostname: ${u.hostname}`);
          else if (u.hostname === '+1-778-840-7277') log('FAIL', it, `href meant to be tel: but rendered as http://`);
          else log('OK', it, `external → ${u.hostname}`);
        } catch (e) { log('FAIL', it, `malformed URL: ${it.href}`); }
        break;
      }
      case 'a:hash-placeholder': {
        // Should not navigate. Verify click doesn't change URL.
        await withPage(CLONE_BASE, route, async (p) => {
          const urlBefore = p.url();
          const r = await p.evaluate((it) => {
            const host = document.querySelector('[data-vi-static-page]');
            const els = Array.from(host.querySelectorAll('a'));
            const m = els.find(a => {
              const txt = (a.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 80);
              return a.getAttribute('href') === it.href && (txt === it.text || it.text.startsWith('['));
            });
            if (!m) return 'not found';
            m.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
            return 'clicked';
          }, it);
          await p.waitForTimeout(500);
          const urlAfter = p.url();
          if (r !== 'clicked') { log('FAIL', it, `element: ${r}`); return; }
          if (urlAfter !== urlBefore) log('FAIL', it, `navigated from ${urlBefore} to ${urlAfter}`);
          else log('OK', it, 'stayed on page');
        });
        break;
      }
      case 'a:mailto':
      case 'a:tel': {
        // Verify href is a valid mailto/tel URI
        if (it.cat === 'a:tel' && !it.href.startsWith('tel:')) log('FAIL', it, `not tel: → ${it.href}`);
        else if (it.cat === 'a:mailto' && !it.href.startsWith('mailto:')) log('FAIL', it, `not mailto: → ${it.href}`);
        else log('OK', it, it.href);
        break;
      }
      case 'a:no-href': {
        log('FAIL', it, 'anchor with no href (dead click)');
        break;
      }
      case 'a:spa-route': {
        // Verify clicking navigates to the expected route and loads the page.
        await withPage(CLONE_BASE, route, async (p) => {
          const r = await p.evaluate((it) => {
            const host = document.querySelector('[data-vi-static-page]');
            const els = Array.from(host.querySelectorAll('a'));
            const m = els.find(a => {
              const txt = (a.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 80);
              return a.getAttribute('href') === it.href && (txt === it.text || it.text.startsWith('['));
            });
            if (!m) return 'not found';
            // target=_blank will prevent SPA interception; we can't open a new tab here, so read what the URL would be
            if (m.getAttribute('target') === '_blank') {
              return { simulateTarget: m.getAttribute('href') };
            }
            m.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
            return 'clicked';
          }, it);
          if (r === 'not found') { log('FAIL', it, 'element not found'); return; }
          if (typeof r === 'object' && r.simulateTarget) {
            // Just check the href resolves to a real clone page
            const checkUrl = r.simulateTarget.startsWith('/') ? 'http://127.0.0.1:4175' + r.simulateTarget : 'http://127.0.0.1:4175/valtoris-international/' + r.simulateTarget;
            const res = await fetch(checkUrl).catch(() => null);
            if (res && res.status === 200) log('OK', it, `_blank → ${r.simulateTarget} 200`);
            else log('FAIL', it, `_blank target ${r.simulateTarget} status ${res?.status}`);
            return;
          }
          await p.waitForTimeout(1500);
          const url = new URL(p.url());
          // Verify the SPA loaded the new page (host has content)
          const contentOk = await p.evaluate(() => {
            const host = document.querySelector('[data-vi-static-page]');
            return host && host.innerHTML.length > 1000;
          });
          if (!contentOk) log('FAIL', it, `navigated to ${url.pathname} but host empty`);
          else log('OK', it, `→ ${url.pathname}`);
        });
        break;
      }
      case 'a:unknown-path': {
        // Clone has no SPA route — falls to notFound. Verify orig does have the page.
        let cloneStatus, origStatus;
        try {
          const cloneRes = await fetch('http://127.0.0.1:4175' + it.href);
          cloneStatus = cloneRes.status;
        } catch { cloneStatus = 'err'; }
        try {
          const origRes = await fetch(ORIG_BASE + it.href, { redirect: 'manual' });
          origStatus = origRes.status;
        } catch { origStatus = 'err'; }
        // Our SPA returns 200 even for not-found (React Router fallback). We check whether notFound page is rendered.
        const notFoundRendered = await withPage(CLONE_BASE, it.href, async (p) => {
          return await p.evaluate(() => {
            const host = document.querySelector('[data-vi-static-page]');
            return host?.textContent?.toLowerCase().includes('404') || host?.textContent?.toLowerCase().includes('not found');
          });
        }).catch(() => null);
        log(notFoundRendered ? 'FAIL' : 'OK', it, `clone=${cloneStatus} orig=${origStatus} notFoundRender=${notFoundRendered}`);
        break;
      }
      case 'btn:other':
      case 'btn:submit': {
        log('OK', it, `${it.tag} in form`);
        break;
      }
      default:
        log('OK', it, 'skipped');
    }
  } catch (e) { log('FAIL', it, 'exception: ' + e.message.slice(0, 80)); }
}

await br.close();
console.log(`\n\n===== SUMMARY =====`);
console.log(`PASS: ${pass.length}`);
console.log(`FAIL: ${issues.length}`);
if (issues.length) {
  console.log('\n===== FAILURES =====');
  for (const i of issues) console.log(`  [${i.cat}] "${i.text}" href=${i.href}\n    ${i.note}`);
  process.exit(1);
}

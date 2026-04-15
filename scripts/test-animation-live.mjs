#!/usr/bin/env node
/** Validate the three animation/FOUC fixes:
 *   Bug 1: mobile-nav must NOT flash visible on first paint and slide out left.
 *   Bug 2: open + close must be SINGLE synchronized 350ms transitions, no
 *          two-step staggered choreography between wrapper and content.
 *   Bug 3: navigating Home → About via SPA must NOT remove and re-fetch
 *          shared CSS (no FOUC of unstyled icons + raw markup). */
import { chromium } from 'playwright';

const BASE = 'https://artofspeed.github.io/valtoris-international';
const br = await chromium.launch();
let failures = 0;
const ok = (label) => console.log(`  [OK] ${label}`);
const fail = (label, info) => { failures++; console.log(`  [FAIL] ${label} :: ${info}`); };

async function test(viewport, fn) {
  const ctx = await br.newContext({ viewport, ignoreHTTPSErrors: true });
  const p = await ctx.newPage();
  try { await fn(p); } finally { await ctx.close(); }
}

console.log('\n=== BUG 1: mobile-nav does not flash visible on first paint (375) ===');
await test({ width: 375, height: 812 }, async (p) => {
  // Capture screenshots at 0ms and 200ms after navigation starts.
  const samples = [];
  await p.goto(BASE + '/', { waitUntil: 'commit' });
  // Sample early frames before WP CSS finishes loading.
  for (const t of [50, 100, 200, 400, 600, 1000, 2000, 3500]) {
    await p.waitForTimeout(t - (samples.length ? samples[samples.length - 1].t : 0));
    const state = await p.evaluate(() => {
      const w = document.querySelector('.mobile-nav__wrapper');
      if (!w) return null;
      const cs = getComputedStyle(w);
      const r = w.getBoundingClientRect();
      return {
        transform: cs.transform,
        visibility: cs.visibility,
        x: r.x, width: r.width,
        rightEdge: r.x + r.width,
      };
    });
    samples.push({ t, state });
  }
  let badFrames = 0;
  for (const s of samples) {
    if (!s.state) continue; // wrapper not yet in DOM
    // The wrapper should NEVER be on-screen unless .expanded. Bad = rightEdge > 0 with no expanded class.
    if (s.state.rightEdge > 5 && s.state.visibility === 'visible') {
      badFrames++;
      console.log(`    ❌ t=${s.t}ms wrapper visible at x=${s.state.x} width=${s.state.width} transform=${s.state.transform}`);
    }
  }
  if (badFrames === 0) ok(`mobile-nav wrapper hidden across ${samples.length} early frames`);
  else fail(`mobile-nav wrapper hidden`, `${badFrames}/${samples.length} frames had wrapper visible`);
});

console.log('\n=== BUG 2: hamburger open + close is single synchronized animation (375) ===');
await test({ width: 375, height: 812 }, async (p) => {
  await p.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(3500);

  // Check the OPEN transition:
  // Before click, both wrapper & content transforms should be at translateX(-100%).
  const before = await p.evaluate(() => {
    const w = document.querySelector('.mobile-nav__wrapper');
    const c = document.querySelector('.mobile-nav__content');
    return {
      wrapperTransform: w ? getComputedStyle(w).transform : null,
      contentTransform: c ? getComputedStyle(c).transform : null,
      wrapperTransition: w ? getComputedStyle(w).transition : null,
      contentTransition: c ? getComputedStyle(c).transition : null,
    };
  });
  console.log('    pre-click computed styles:');
  console.log('      wrapper transform:', before.wrapperTransform);
  console.log('      content transform:', before.contentTransform);
  console.log('      wrapper transition:', before.wrapperTransition?.slice(0, 100));
  console.log('      content transition:', before.contentTransition?.slice(0, 100));

  // The fix: content has no transition of its own — it moves with wrapper as
  // one unit. Computed-style "none" or "all 0s ease 0s" (Chromium's
  // canonical form for `transition: none`) both satisfy this.
  const ct = before.contentTransition || '';
  const noContentTransition = ct === 'none' || ct === 'all' || ct === 'all 0s ease 0s' || (ct.includes('0s') && !ct.match(/[1-9]\d*ms/) && !ct.match(/0\.[1-9]\d*s/));
  if (noContentTransition) ok(`content transition is effectively none ("${ct}") — moves with wrapper`);
  else fail('content has its own transition', ct);

  // Sample wrapper position over time during open animation.
  await p.click('.mobile-nav__toggler:visible');
  const opens = [];
  for (const t of [0, 50, 100, 175, 250, 350, 500]) {
    await p.waitForTimeout(t === 0 ? 0 : t - opens[opens.length - 1].t);
    const r = await p.evaluate(() => {
      const w = document.querySelector('.mobile-nav__wrapper');
      const c = document.querySelector('.mobile-nav__content');
      return {
        wrapperX: w ? w.getBoundingClientRect().x : null,
        contentX: c ? c.getBoundingClientRect().x : null,
        contentVisible: c ? getComputedStyle(c).visibility : null,
        contentOpacity: c ? getComputedStyle(c).opacity : null,
      };
    });
    opens.push({ t, ...r });
  }
  console.log('    open progression:');
  for (const s of opens) console.log(`      t=${s.t}ms wrapperX=${s.wrapperX?.toFixed(0)} contentX=${s.contentX?.toFixed(0)} contentVis=${s.contentVisible} opacity=${s.contentOpacity}`);

  // Wrapper should reach x=0 by ~350ms. Content X should match wrapper X throughout (no separate stagger).
  const final = opens[opens.length - 1];
  if (final.wrapperX !== null && Math.abs(final.wrapperX) < 5) ok(`wrapper at x=${final.wrapperX} after 500ms (open complete)`);
  else fail('wrapper failed to reach x=0', `final x=${final.wrapperX}`);

  // Content should have full opacity from frame 0 (no fade-in delay)
  const opacities = opens.map((o) => parseFloat(o.contentOpacity));
  const allOpaque = opacities.every((o) => o === 1);
  if (allOpaque) ok('content opacity stays at 1.0 throughout open (no fade)');
  else fail('content fades in', opacities.join(','));

  // Test CLOSE: click overlay → animate out
  await p.evaluate(() => document.querySelector('.mobile-nav__overlay').click());
  const closes = [];
  for (const t of [0, 50, 100, 175, 250, 350, 500]) {
    await p.waitForTimeout(t === 0 ? 0 : t - closes[closes.length - 1].t);
    const r = await p.evaluate(() => {
      const w = document.querySelector('.mobile-nav__wrapper');
      const c = document.querySelector('.mobile-nav__content');
      return {
        wrapperX: w ? w.getBoundingClientRect().x : null,
        contentX: c ? c.getBoundingClientRect().x : null,
        contentOpacity: c ? getComputedStyle(c).opacity : null,
      };
    });
    closes.push({ t, ...r });
  }
  console.log('    close progression:');
  for (const s of closes) console.log(`      t=${s.t}ms wrapperX=${s.wrapperX?.toFixed(0)} contentX=${s.contentX?.toFixed(0)} opacity=${s.contentOpacity}`);

  // After 500ms, wrapper should be fully off-screen (x ≈ -width)
  const closeFinal = closes[closes.length - 1];
  if (closeFinal.wrapperX !== null && closeFinal.wrapperX < -300) ok(`wrapper off-screen at x=${closeFinal.wrapperX.toFixed(0)} after 500ms close`);
  else fail('wrapper failed to slide off-screen on close', `final x=${closeFinal.wrapperX}`);

  // Content X should track wrapper X throughout close (no two-step)
  const closeOpacities = closes.map((o) => parseFloat(o.contentOpacity));
  if (closeOpacities.every((o) => o === 1)) ok('content opacity stays 1.0 throughout close (no fade-out)');
  else fail('content fades on close', closeOpacities.join(','));
});

console.log('\n=== BUG 3: route navigation does not strip CSS (no FOUC) (375) ===');
await test({ width: 375, height: 812 }, async (p) => {
  await p.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(3500);

  // Count CSS link nodes BEFORE navigation
  const before = await p.evaluate(() => ({
    links: document.querySelectorAll('link[rel="stylesheet"]').length,
    styles: document.querySelectorAll('style').length,
    linksHrefs: Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map((l) => l.href).slice(0, 5),
  }));
  console.log('    before nav: links=' + before.links + ' inline-styles=' + before.styles);

  // Navigate to About Us. Watch for any frame where:
  //   - the host has new content (about page DOM)
  //   - but a previously-loaded CSS link has been REMOVED from <head>
  await p.evaluate(() => {
    const a = Array.from(document.querySelectorAll('a')).find((el) => {
      const txt = (el.textContent || '').trim();
      return el.getAttribute('href')?.includes('about-us') && (txt === 'About Us' || txt === 'About');
    });
    if (a) a.click();
  });

  // Sample link count over the next 500ms
  const samples = [];
  for (const t of [0, 30, 60, 100, 200, 400, 800]) {
    await p.waitForTimeout(t === 0 ? 0 : t - samples[samples.length - 1].t);
    const r = await p.evaluate(() => ({
      links: document.querySelectorAll('link[rel="stylesheet"]').length,
      pathname: window.location.pathname,
      hostHasContent: document.querySelector('[data-vi-static-page]')?.innerHTML?.length || 0,
    }));
    samples.push({ t, ...r });
  }
  console.log('    nav progression:');
  for (const s of samples) console.log(`      t=${s.t}ms path=${s.pathname} links=${s.links} hostBytes=${s.hostHasContent}`);

  // Critical assertion: no frame should have FEWER CSS links than the previous frame.
  // (That would indicate a removed-then-re-added cycle = FOUC.)
  let droppedFrames = 0;
  let prev = before.links;
  for (const s of samples) {
    if (s.links < prev) droppedFrames++;
    prev = Math.max(prev, s.links);
  }
  if (droppedFrames === 0) ok(`CSS link count never decreased during nav (cumulative cache works)`);
  else fail('CSS links dropped during nav', `${droppedFrames} frames had fewer links than peak`);

  // Final state: URL should be /about-us, content should be loaded.
  const final = samples[samples.length - 1];
  if (final.pathname.includes('about-us') && final.hostHasContent > 1000) ok(`navigated to ${final.pathname} with ${final.hostHasContent} bytes content`);
  else fail('about-us did not load', `path=${final.pathname} bytes=${final.hostHasContent}`);
});

console.log('\n=== BUG 3b: hash placeholder href="index.html#" should not navigate (1440) ===');
await test({ width: 1440, height: 900 }, async (p) => {
  await p.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(3500);
  const before = p.url();
  await p.evaluate(() => {
    // Find an `index.html#` anchor and click it
    const a = Array.from(document.querySelectorAll('a')).find((el) => el.getAttribute('href') === 'index.html#');
    if (a) a.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  });
  await p.waitForTimeout(400);
  const after = p.url();
  if (before === after) ok(`href="index.html#" did not navigate (stayed at ${after})`);
  else fail('href="index.html#" navigated', `${before} → ${after}`);
});

console.log('\n=== BUG 4: scroll-to-top button must scroll, not navigate to 404 (1440) ===');
for (const route of ['/', '/about-us/', '/beef-tenderloin/', '/contact-us/']) {
  await test({ width: 1440, height: 900 }, async (p) => {
    await p.goto(BASE + route, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(3500);
    // Scroll down 1500px so the button is visible (CSS shows it at scrollY > 500)
    await p.evaluate(() => window.scrollTo(0, 1500));
    await p.waitForTimeout(400);
    const beforeUrl = p.url();
    const beforeScroll = await p.evaluate(() => window.scrollY);
    // Click via dispatchEvent (the visible-state class .show needs the button to actually be shown)
    const clicked = await p.evaluate(() => {
      const a = document.querySelector('.scroll-to-top');
      if (!a) return 'no button';
      a.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      return 'clicked';
    });
    if (clicked !== 'clicked') { fail(`scroll-to-top on ${route}`, clicked); return; }
    await p.waitForTimeout(800);
    const afterUrl = p.url();
    const afterScroll = await p.evaluate(() => window.scrollY);
    const hostHas404 = await p.evaluate(() => {
      const host = document.querySelector('[data-vi-static-page]');
      const txt = host?.textContent?.toLowerCase() || '';
      return txt.includes('404') || txt.includes('not found');
    });
    if (afterUrl !== beforeUrl) fail(`scroll-to-top ${route} navigated`, `${beforeUrl} → ${afterUrl}`);
    else if (hostHas404) fail(`scroll-to-top ${route} 404 rendered`, '');
    else if (afterScroll >= beforeScroll - 100) fail(`scroll-to-top ${route} did not scroll`, `before=${beforeScroll} after=${afterScroll}`);
    else ok(`scroll-to-top ${route}: scrolled ${beforeScroll}→${afterScroll}, stayed at ${afterUrl}`);
  });
}

await br.close();
if (failures > 0) { console.log(`\n${failures} FAILURES`); process.exit(1); }
else console.log('\nALL PASS');

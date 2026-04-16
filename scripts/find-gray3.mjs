import { chromium } from 'playwright';
const br = await chromium.launch();
const ctx = await br.newContext({ viewport: { width: 375, height: 812 } });
const p = await ctx.newPage();
await p.goto('http://127.0.0.1:4175/valtoris-international/', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(4000);

// Take screenshot first
await p.screenshot({ path: '/tmp/page-top.png', fullPage: false });

const info = await p.evaluate(() => {
  const hero = document.querySelector('.hero-slider-one');
  const heroItem = document.querySelector('.hero-slider-one__item');
  const heroSection = document.querySelector('section.hero-slider-one');
  const products = document.querySelector('.my-icon-sec');
  const productsParent = products?.closest('.elementor-element-aa38394, .e-con-inner');
  const r = (el) => el ? el.getBoundingClientRect() : null;
  return {
    hero: r(hero),
    heroItem: r(heroItem),
    heroSection: r(heroSection),
    products: r(products),
    productsParent: r(productsParent),
    docH: document.documentElement.scrollHeight,
  };
});
console.log(JSON.stringify(info, null, 2));
await br.close();

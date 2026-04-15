#!/usr/bin/env node
/** Classify every unique clickable element into a category and tag suspicious ones. */
import { readFileSync, writeFileSync } from 'fs';

const catalog = JSON.parse(readFileSync('/tmp/clickable-catalog.json', 'utf-8'));

// All SPA routes the clone serves (from src/pages/index.ts):
const SPA_ROUTES = new Set([
  '/', 'index.html',
  '/about-us/', '/about-us',
  '/beef-tenderloin/', '/beef-tenderloin',
  '/pork/', '/pork',
  '/chicken/', '/chicken',
  '/greens/', '/greens',
  '/sugar/', '/sugar',
  '/papers/', '/papers',
  '/news/', '/news',
  '/contact-us/', '/contact-us',
  '/login/', '/login',
  '/404-error/', '/404-error',
  '/valtoris-attends-canadian-meat-council-annual-conference-2025/',
  '/valtoris-attends-canadian-meat-council-annual-conference-2025',
]);

function classify(item, route) {
  const href = item.href;
  const cls = item.cls || '';

  if (item.tag === 'BUTTON') {
    if (cls.includes('accordion')) return 'btn:accordion';
    if (cls.includes('dropdown')) return 'btn:dropdown';
    if (cls.includes('search-submit') || item.type === 'submit') return 'btn:submit';
    return 'btn:other';
  }
  if (!href) return item.tag === 'A' ? 'a:no-href' : 'other:no-href';
  if (href === '#' || href === 'index.html#' || href.endsWith('/#')) {
    if (cls.includes('search-toggler')) return 'a:search-toggler';
    if (cls.includes('video-popup') || cls.includes('video-button')) return 'a:video-popup';
    if (cls.includes('scroll-to-top')) return 'a:scroll-to-top';
    if (cls.includes('mobile-nav__toggler')) return 'a:mobile-nav-toggler';
    return 'a:hash-placeholder';
  }
  if (href.startsWith('mailto:')) return 'a:mailto';
  if (href.startsWith('tel:')) return 'a:tel';
  if (href.startsWith('#')) return 'a:fragment';
  if (href.startsWith('http://') || href.startsWith('https://')) {
    const u = new URL(href);
    if (u.hostname.includes('valtorisinternational.com')) return 'a:orig-absolute';
    return 'a:external';
  }
  if (href.startsWith('javascript:')) return 'a:javascript';

  // Strip BASE prefix to compare with SPA_ROUTES
  let path = href;
  if (path.startsWith('/valtoris-international/')) path = path.slice('/valtoris-international'.length);
  // Strip fragment
  path = path.replace(/#.*$/, '');
  // Strip query
  const noQuery = path.replace(/\?.*$/, '');

  if (noQuery.startsWith('/wp-content/') || noQuery.startsWith('/wp-includes/')) return 'a:asset';
  if (SPA_ROUTES.has(noQuery) || SPA_ROUTES.has(noQuery.replace(/\/$/, ''))) return 'a:spa-route';
  return 'a:unknown-path';
}

const byCategory = {};
const unique = new Map(); // key=cat+text+href => first occurrence
for (const [route, items] of Object.entries(catalog)) {
  for (const it of items) {
    const cat = classify(it, route);
    const key = cat + '|' + (it.href || '') + '|' + it.text.slice(0, 40);
    if (!unique.has(key)) unique.set(key, { ...it, cat, firstSeenOn: route });
    (byCategory[cat] ||= []).push({ route, ...it });
  }
}

console.log('=== CATEGORY COUNTS ===');
for (const [cat, list] of Object.entries(byCategory).sort()) {
  console.log(`  ${cat.padEnd(30)} ${list.length}`);
}

console.log('\n=== UNIQUE CLICKABLES ===');
const uniqueList = Array.from(unique.values()).sort((a, b) => a.cat.localeCompare(b.cat));
for (const u of uniqueList) {
  const display = `[${u.cat}] ${u.tag} "${u.text}"`.padEnd(80);
  console.log(`  ${display} href=${u.href} tgt=${u.target || ''} seenOn=${u.firstSeenOn}`);
}
console.log(`\n${uniqueList.length} unique elements (from ${Object.values(catalog).reduce((a,b)=>a+b.length,0)} total)`);

writeFileSync('/tmp/clickable-unique.json', JSON.stringify(uniqueList, null, 2));
writeFileSync('/tmp/clickable-by-cat.json', JSON.stringify(byCategory, null, 2));

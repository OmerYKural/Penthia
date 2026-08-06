/* ============================================================
   Page contract tests.

   FUNCTIONALITY-INVENTORY.md is the checklist the redesign is
   measured against. This file turns the checkable parts of it
   into assertions so a rollout across five pages cannot quietly
   drop an id, a field name, a script, or an asset.

   Run: node pages.test.mjs
   ============================================================ */

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = dirname(fileURLToPath(import.meta.url));
const read = (f) => readFileSync(join(ROOT, f), 'utf8');

let pass = 0, fail = 0;
const failures = [];

function ok(name, cond, detail) {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; failures.push(name); console.log(`  FAIL  ${name}${detail ? ' — ' + detail : ''}`); }
}
function group(title) { console.log(`\n-- ${title} --`); }

const PAGES = ['index.html', 'store.html', 'compare.html', 'about.html', 'contact.html'];
const SRC = Object.fromEntries(PAGES.map((p) => [p, read(p)]));

const count = (s, re) => (s.match(re) || []).length;

/* ── 1. URLs ──────────────────────────────────────────── */
group('URLs — none may move or be renamed');

const REQUIRED_PATHS = [
  'index.html', 'about.html', 'store.html', 'compare.html', 'contact.html',
  'catalog/index.html', 'robots.txt', 'sitemap.xml',
  'googlef73d1b62d183f93f.html', 'CNAME', 'api/chat.js',
];
for (const p of REQUIRED_PATHS) ok(`exists: /${p}`, existsSync(join(ROOT, p)));

const CANONICALS = {
  'index.html': 'https://penthiasolutions.com/',
  'store.html': 'https://penthiasolutions.com/store.html',
  'compare.html': 'https://penthiasolutions.com/compare.html',
  'about.html': 'https://penthiasolutions.com/about.html',
  'contact.html': 'https://penthiasolutions.com/contact.html',
};
for (const [p, href] of Object.entries(CANONICALS)) {
  ok(`${p}: canonical unchanged`, SRC[p].includes(`<link rel="canonical" href="${href}" />`));
}

/* ── 2. Every referenced local asset resolves ─────────── */
group('Local assets referenced by every page exist on disk');

for (const p of PAGES) {
  const refs = new Set();
  for (const m of SRC[p].matchAll(/(?:src|href)="([^"#?][^"]*)"/g)) {
    const v = m[1];
    if (/^(https?:|mailto:|tel:|data:|\/\/)/.test(v)) continue;
    refs.add(decodeURIComponent(v.split(/[?#]/)[0]));
  }
  const missing = [...refs].filter((r) => !existsSync(join(ROOT, r)));
  ok(`${p}: ${refs.size} local refs, all resolve`, missing.length === 0, missing.join(', '));
}

/* ── 3. Navigation ────────────────────────────────────── */
group('Navigation — header, active state, mobile, footer');

for (const p of PAGES) {
  for (const id of ['nav-home', 'nav-store', 'nav-compare', 'nav-about', 'nav-contact']) {
    ok(`${p}: header ${id}`, SRC[p].includes(`id="${id}"`));
  }
  for (const id of ['mnav-home', 'mnav-store', 'mnav-compare', 'mnav-about', 'mnav-contact']) {
    ok(`${p}: mobile ${id}`, SRC[p].includes(`id="${id}"`));
  }
  ok(`${p}: exactly one aria-current`, count(SRC[p], /aria-current="page"/g) === 1);
  ok(`${p}: footer social target`, SRC[p].includes('social-icons-target'));
  ok(`${p}: 4 footer links`, count(SRC[p], /<nav class="k-ft__links">[\s\S]*?<\/nav>/g) === 1
    && count(SRC[p].match(/<nav class="k-ft__links">[\s\S]*?<\/nav>/)[0], /<a /g) === 4);
  ok(`${p}: site search input`, SRC[p].includes('id="siteSearch"'));
  ok(`${p}: wordmark links home`, /k-nv__brand" href="index\.html"/.test(SRC[p]));
}

/* ── 4. Stylesheets and scripts ───────────────────────── */
group('Every page loads the same system');

for (const p of PAGES) {
  ok(`${p}: style.css`, SRC[p].includes('href="style.css"'));
  ok(`${p}: v3.css`, SRC[p].includes('href="v3.css"'));
  ok(`${p}: v3.js`, SRC[p].includes('src="v3.js"'));
  ok(`${p}: script.js`, SRC[p].includes('src="script.js"'));
  ok(`${p}: assistant`, SRC[p].includes('src="penthia-assistant.js"'));
  ok(`${p}: ai intro`, SRC[p].includes('src="penthia-ai-intro.js"'));
  ok(`${p}: ai intro markup`, SRC[p].includes('id="ai-intro-banner"'));
  ok(`${p}: Figtree only`, SRC[p].includes('family=Figtree') && !/family=(Syne|Inter)\b/.test(SRC[p]));
}

// Quiz is homepage-only, per the inventory.
ok('index.html: quiz popup present', SRC['index.html'].includes('id="quiz-popup"')
  && SRC['index.html'].includes('src="penthia-quiz-popup.js"')
  && SRC['index.html'].includes('id="qp-reopen-chip"'));
for (const p of PAGES.filter((x) => x !== 'index.html')) {
  ok(`${p}: no quiz (homepage only)`, !SRC[p].includes('penthia-quiz-popup.js'));
}

/* ── 5. Product modal — the full id contract ──────────── */
group('Product modal id contract (script.js openProduct/setImage/setChips)');

const MODAL_IDS = [
  'modal', 'modalMainImg', 'galleryThumbs', 'modalBadge', 'modalTitle', 'modalDesc',
  'modalBullets', 'variantDisplay', 'variantOS', 'variantStorage', 'variantSupport',
  'variantInput', 'buyboxPrice', 'buyboxSub', 'buyboxNote',
];
for (const p of ['index.html', 'store.html']) {
  for (const id of MODAL_IDS) ok(`${p}: #${id}`, SRC[p].includes(`id="${id}"`));
  for (const fn of ['handleModalClick(event)', 'closeModal()', 'changeImage(-1)', 'changeImage(1)',
    "openContactForm('Request Quote')", "openContactForm('Contact Sales')"]) {
    ok(`${p}: ${fn}`, SRC[p].includes(fn));
  }
}

/* ── 6. Store — filtering contract ────────────────────── */
group('Store — filterProducts contract');

const store = SRC['store.html'];
ok('store: #productGrid', store.includes('id="productGrid"'));
ok('store: 4 .prod-card hooks', count(store, /class="[^"]*\bprod-card\b[^"]*"/g) === 4);
ok('store: 4 data-search attributes', count(store, /data-search="/g) === 4);
ok('store: #productSearch', store.includes('id="productSearch"'));
for (const key of ['pro-max', 'pro', 'iboard', 'qs3']) {
  ok(`store: openProduct('${key}')`, store.includes(`openProduct('${key}')`));
}
// Every product key used must exist in script.js.
const scriptJs = read('script.js');
for (const m of store.matchAll(/openProduct\('([^']+)'\)/g)) {
  ok(`store: '${m[1]}' defined in script.js`, new RegExp(`'${m[1]}':\\s*\\{`).test(scriptJs));
}

/* ── 7. Contact form ──────────────────────────────────── */
group('Contact form — Formspree field names');

const contact = SRC['contact.html'];
ok('contact: #contactForm', contact.includes('id="contactForm"'));
ok('contact: #contactFormWrap', contact.includes('id="contactFormWrap"'));
ok('contact: #contactThankyou', contact.includes('id="contactThankyou"'));
const FIELDS = [
  ['firstName', 'First Name'], ['lastName', 'Last Name'], ['email', 'Email'],
  ['phone', 'Phone Number'], ['organization', 'Organization'], ['message', 'Message'],
];
for (const [id, name] of FIELDS) {
  ok(`contact: #${id} submits as "${name}"`, new RegExp(`id="${id}" name="${name}"`).test(contact));
}
ok('contact: hidden _subject', contact.includes('name="_subject"'));
ok('contact: one submit button, text-only', count(contact, /type="submit"/g) === 1
  && /<button type="submit"[^>]*>[^<]+<\/button>/.test(contact));
ok('contact: email pattern kept', contact.includes('pattern="[^\\s@]+@[^\\s@]+\\.[^\\s@]+"'));
ok('contact: phone pattern kept', contact.includes('pattern="^\\+?[0-9\\s\\-()]{7,}$"'));

/* ── 8. FAQ accordion ─────────────────────────────────── */
group('FAQ accordion — toggleFaq toggles `open` on the parent');

const about = SRC['about.html'];
ok('about: 7 faq questions', count(about, /onclick="toggleFaq\(this\)"/g) === 7);
ok('about: 7 faq items', count(about, /class="k-faq__i"/g) === 7);
ok('about: answers hidden by class, not inline', !/k-faq__a[^>]*style="[^"]*display/.test(about));

/* ── 9. Compare table is intact ───────────────────────── */
group('Compare table');

const compare = SRC['compare.html'];
ok('compare: 23 spec rows', count(compare, /<tr><td>/g) === 23, `found ${count(compare, /<tr><td>/g)}`);
ok('compare: every row has 5 cells',
  [...compare.matchAll(/<tr><td>[\s\S]*?<\/tr>/g)].every((m) => count(m[0], /<td>/g) === 5));
ok('compare: 5 column headers', count(compare, /<th scope="col">/g) === 5);
ok('compare: EDLA wording unchanged',
  compare.includes('Not currently issued under Penthia brand; hardware platform is EDLA-capable'));

/* ── 10. SEO surface ──────────────────────────────────── */
group('SEO — titles, descriptions, robots, OG, JSON-LD');

for (const p of PAGES) {
  ok(`${p}: <title>`, /<title>[^<]+<\/title>/.test(SRC[p]));
  ok(`${p}: description`, /<meta name="description" content="[^"]+"/.test(SRC[p]));
  ok(`${p}: robots`, /<meta name="robots"/.test(SRC[p]));
  ok(`${p}: favicon`, SRC[p].includes('href="favicon.png"'));
  ok(`${p}: theme-color in palette`, /<meta name="theme-color" content="#(f0eeea|080a0f)"/.test(SRC[p]));
}
const idx = SRC['index.html'];
for (const tag of ['og:type', 'og:title', 'og:description', 'og:url', 'og:image']) {
  ok(`index.html: ${tag}`, idx.includes(`property="${tag}"`));
}
ok('index.html: JSON-LD Organization + FAQPage', idx.includes('"@type":"Organization"') && idx.includes('"@type":"FAQPage"'));
ok('index.html: JSON-LD parses', (() => {
  const m = idx.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  try { JSON.parse(m[1]); return true; } catch { return false; }
})());

/* ── 11. Squiggle discipline ──────────────────────────── */
group('Squiggle discipline — two marks per page maximum');

const BUDGET = { 'index.html': 2, 'store.html': 2, 'about.html': 2, 'compare.html': 1, 'contact.html': 1 };
for (const p of PAGES) {
  // A "mark" is one drawn moment: an inline k-mark, or a standalone k-glyph.
  // The per-card draw-border is one moment however many cards carry it.
  const inline = count(SRC[p], /class="k-mark /g);
  const glyphs = count(SRC[p], /class="k-glyph"/g);
  const border = SRC[p].includes('k-card__border') ? 1 : 0;
  const total = inline + glyphs + border;
  ok(`${p}: ${total} mark(s), budget ${BUDGET[p]}`, total <= BUDGET[p], `found ${total}`);
}
// No two pages may carry the same mark variant.
const VARIANTS = ['k-mark--load', 'k-mark--ring', 'k-mark--brk', 'k-mark--rule'];
for (const v of VARIANTS.slice(1)) {
  const on = PAGES.filter((p) => SRC[p].includes(v));
  ok(`${v} used on exactly one page`, on.length === 1, on.join(', '));
}
ok('no leftover k-squig divider', PAGES.every((p) => !SRC[p].includes('k-squig')));

/* ── 12. Nothing left permanently invisible ───────────── */
group('Reveals cannot strand content');

const v3js = read('v3.js');
ok('v3.js: no-IntersectionObserver fallback reveals everything', v3js.includes("!('IntersectionObserver' in window)"));
ok('v3.js: on-load safety net', v3js.includes(".k-rv:not(.is-in)"));
for (const p of PAGES) {
  ok(`${p}: no orphaned old .reveal class`, !/class="[^"]*\breveal\b/.test(SRC[p]));
}

/* ── 13. Palette lock ─────────────────────────────────── */
group('Palette lock — six hexes, no more');

const LOCKED = ['#080a0f', '#5a6480', '#7a849f', '#c9a84c', '#e2c27a', '#f0eeea'];
const v3css = read('v3.css').replace(/\/\*[\s\S]*?\*\//g, ''); // strip the reference-mapping comments
const applied = [...new Set([...v3css.matchAll(/#[0-9a-fA-F]{3,8}/g)].map((m) => m[0].toLowerCase()))];
ok(`v3.css applies only locked hexes (${applied.join(' ')})`,
  applied.every((h) => LOCKED.includes(h)), applied.filter((h) => !LOCKED.includes(h)).join(', '));
const pageHexes = [...new Set(PAGES.flatMap((p) => [...SRC[p].matchAll(/#[0-9a-fA-F]{6}\b/g)].map((m) => m[0].toLowerCase())))];
ok(`pages apply only locked hexes (${pageHexes.join(' ') || 'none'})`,
  pageHexes.every((h) => LOCKED.includes(h)), pageHexes.filter((h) => !LOCKED.includes(h)).join(', '));

/* ── 14. Reduced motion ───────────────────────────────── */
group('Reduced motion draws everything instantly');

ok('v3.css: marks resolve under prefers-reduced-motion',
  /@media \(prefers-reduced-motion: reduce\)[\s\S]*?k-glyph path \{ animation: none !important; stroke-dashoffset: 0 !important/.test(read('v3.css')));

/* ── result ───────────────────────────────────────────── */
console.log(`\n${pass} passed, ${fail} failed`);
if (fail) { console.log('\nFailed:\n  ' + failures.join('\n  ')); process.exit(1); }

/* ============================================================
   Page contract tests.

   FUNCTIONALITY-INVENTORY.md is the checklist the redesign is
   measured against. This file turns the checkable parts of it
   into assertions so a rollout across five pages cannot quietly
   drop an id, a field name, a script, or an asset.

   Run: node pages.test.mjs
   ============================================================ */

import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
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
const LEGAL = [['privacy', 'privacy.html'], ['terms', 'terms.html'], ['warranty', 'warranty.html']];
const LEGAL_PAGES = LEGAL.map(([, f]) => f);
const ALL_PAGES = [...PAGES, ...LEGAL_PAGES];
const SRC = Object.fromEntries(ALL_PAGES.map((p) => [p, read(p)]));

const count = (s, re) => (s.match(re) || []).length;

/* ── 1. URLs ──────────────────────────────────────────── */
group('URLs — none may move or be renamed');

const REQUIRED_PATHS = [
  'index.html', 'about.html', 'store.html', 'compare.html', 'contact.html',
  'privacy.html', 'terms.html', 'warranty.html',
  'docs/legal/privacy.md', 'docs/legal/terms.md', 'docs/legal/warranty.md',
  'tools/build-legal.mjs',
  'catalog/index.html', 'robots.txt', 'sitemap.xml',
  'googlef73d1b62d183f93f.html', 'CNAME', 'api/chat.js',
];
for (const p of REQUIRED_PATHS) ok(`exists: /${p}`, existsSync(join(ROOT, p)));

const CANONICALS = Object.fromEntries(
  ALL_PAGES.map((p) => [p, p === 'index.html' ? 'https://penthiasolutions.com/' : `https://penthiasolutions.com/${p}`])
);
for (const [p, href] of Object.entries(CANONICALS)) {
  ok(`${p}: canonical is ${href}`, SRC[p].includes(`<link rel="canonical" href="${href}" />`));
}

/* ── 2. Every referenced local asset resolves ─────────── */
group('Local assets referenced by every page exist on disk');

for (const p of ALL_PAGES) {
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

for (const p of ALL_PAGES) {
  for (const id of ['nav-home', 'nav-store', 'nav-compare', 'nav-about', 'nav-contact']) {
    ok(`${p}: header ${id}`, SRC[p].includes(`id="${id}"`));
  }
  for (const id of ['mnav-home', 'mnav-store', 'mnav-compare', 'mnav-about', 'mnav-contact']) {
    ok(`${p}: mobile ${id}`, SRC[p].includes(`id="${id}"`));
  }
  ok(`${p}: footer social target`, SRC[p].includes('social-icons-target'));
  ok(`${p}: site search input`, SRC[p].includes('id="siteSearch"'));
  ok(`${p}: wordmark links home`, /k-nv__brand" href="index\.html"/.test(SRC[p]));

  // Single-row footer: the eight site pages minus this one.
  const nav = SRC[p].match(/<nav class="k-ft__links">[\s\S]*?<\/nav>/);
  ok(`${p}: one footer nav`, !!nav);
  ok(`${p}: 7 footer links (8 pages minus self)`, count(nav[0], /<a /g) === 7, `found ${count(nav[0], /<a /g)}`);
  ok(`${p}: footer does not link to itself`, !nav[0].includes(`href="${p}"`));
  for (const legal of ['privacy.html', 'terms.html', 'warranty.html']) {
    if (legal === p) continue;
    ok(`${p}: footer links ${legal}`, nav[0].includes(`href="${legal}"`));
  }
}
// Primary nav marks the current page on the five site pages; the legal
// documents are not in that nav, so they mark nothing.
for (const p of PAGES) ok(`${p}: exactly one aria-current`, count(SRC[p], /aria-current="page"/g) === 1);
for (const p of LEGAL_PAGES) ok(`${p}: no aria-current (not in primary nav)`, count(SRC[p], /aria-current="page"/g) === 0);

/* ── 4. Stylesheets and scripts ───────────────────────── */
group('Every page loads the same system');

for (const p of ALL_PAGES) {
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
for (const p of ALL_PAGES.filter((x) => x !== 'index.html')) {
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

for (const p of ALL_PAGES) {
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

const parseLd = (src) => {
  const m = src.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  if (!m) return null;
  try { return JSON.parse(m[1]); } catch { return null; }
};

const ld = parseLd(idx);
ok('index.html: JSON-LD parses', !!ld);
const types = (ld?.['@graph'] || []).map((n) => n['@type']);
ok('index.html: graph has Organization, WebSite, FAQPage',
  ['Organization', 'WebSite', 'FAQPage'].every((t) => types.includes(t)), types.join(','));
const org = (ld?.['@graph'] || []).find((n) => n['@type'] === 'Organization');
// Every value below is published verbatim in docs/legal/*.md.
ok('index.html: Organization legalName', org?.legalName === 'Penthia Solutions LLC');
ok('index.html: Organization email', org?.email === 'info@penthiasolutions.com');
ok('index.html: Organization address (Ohio, US)',
  org?.address?.addressRegion === 'Ohio' && org?.address?.addressCountry === 'US');
ok('index.html: sameAs preserved', Array.isArray(org?.sameAs) && org.sameAs.length === 2);

for (const p of LEGAL_PAGES) {
  const l = parseLd(SRC[p]);
  ok(`${p}: JSON-LD parses`, !!l);
  ok(`${p}: is a WebPage`, l?.['@type'] === 'WebPage');
  ok(`${p}: canonical url matches JSON-LD url`, l?.url === `https://penthiasolutions.com/${p}`);
  ok(`${p}: publisher points at the Organization`,
    l?.publisher?.['@id'] === 'https://penthiasolutions.com/#organization');
  ok(`${p}: isPartOf points at the WebSite node`,
    l?.isPartOf?.['@id'] === 'https://penthiasolutions.com/#website');
  for (const tag of ['og:type', 'og:title', 'og:description', 'og:url']) {
    ok(`${p}: ${tag}`, SRC[p].includes(`property="${tag}"`));
  }
}

/* ── 10b. Sitemap ─────────────────────────────────────── */
group('Sitemap lists every public page');

const sitemap = read('sitemap.xml');
const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
ok(`sitemap has ${ALL_PAGES.length} entries`, locs.length === ALL_PAGES.length, `found ${locs.length}`);
for (const p of ALL_PAGES) {
  const want = p === 'index.html' ? 'https://penthiasolutions.com/' : `https://penthiasolutions.com/${p}`;
  ok(`sitemap lists ${p}`, locs.includes(want));
}
ok('sitemap has no duplicate entries', new Set(locs).size === locs.length);
ok('every sitemap loc resolves to a file on disk', locs.every((u) => {
  const rel = u.replace('https://penthiasolutions.com/', '') || 'index.html';
  return existsSync(join(ROOT, rel));
}));
ok('robots.txt points at the sitemap', read('robots.txt').includes('https://penthiasolutions.com/sitemap.xml'));

/* ── 10c. Legal pages are built from their markdown ───── */
group('Legal pages are generated, and the copy is unaltered');

ok('built pages match docs/legal/*.md (build-legal --check)', (() => {
  try { execFileSync('node', ['tools/build-legal.mjs', '--check'], { cwd: ROOT, stdio: 'pipe' }); return true; }
  catch { return false; }
})(), 'run: node tools/build-legal.mjs');

// Independent of the generator: strip the HTML back to text and compare it
// with the markdown. This is what proves the copy was never rewritten.
const squash = (s) => s.replace(/\s+/g, ' ').trim();
for (const [key, file] of LEGAL) {
  const md = read(`docs/legal/${key}.md`);
  const mdText = squash(md.split('\n').map((l) => (
    /^#{1,3} /.test(l) ? l.replace(/^#{1,3} /, '')      // heading marker only
      : l.replace(/^- /, '').replace(/^\d+\. /, '')     // list markers are presentational
  )).join('\n').replace(/\*\*/g, ''));

  const article = SRC[file].split('<article class="k-doc">')[1].split('</article>')[0];
  const htmlText = squash(article.replace(/<[^>]+>/g, ' '))
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

  ok(`${file}: renders ${key}.md verbatim (${mdText.length} chars)`, mdText === htmlText,
    (() => {
      for (let i = 0; i < Math.max(mdText.length, htmlText.length); i++) {
        if (mdText[i] !== htmlText[i]) return `first difference at ${i}: md=${JSON.stringify(mdText.slice(i, i + 50))}`;
      }
      return 'length mismatch';
    })());

  ok(`${file}: heading counts match the source`,
    count(SRC[file], /<h1 /g) === count(md, /^# /gm)
    && count(SRC[file], /<h2 /g) === count(md, /^## /gm)
    && count(SRC[file], /<h3 /g) === count(md, /^### /gm));
  ok(`${file}: no card, no mark, no reveal`,
    !/k-card|k-fcard|k-icard|k-mark|k-glyph|k-rv\b/.test(SRC[file]));
  ok(`${file}: body copy renders at 16px`, read('v3.css').includes('.k-doc__p {'));
}

/* ── 11. Squiggle discipline ──────────────────────────── */
group('Squiggle discipline — two marks per page maximum');

const BUDGET = {
  'index.html': 2, 'store.html': 2, 'about.html': 2, 'compare.html': 1, 'contact.html': 1,
  // Legal documents carry no marks at all.
  'privacy.html': 0, 'terms.html': 0, 'warranty.html': 0,
};
for (const p of ALL_PAGES) {
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
  const on = ALL_PAGES.filter((p) => SRC[p].includes(v));
  ok(`${v} used on exactly one page`, on.length === 1, on.join(', '));
}
ok('no leftover k-squig divider', ALL_PAGES.every((p) => !SRC[p].includes('k-squig')));

/* ── 11b. The client cannot outgrow the server's limits ── */
group('Assistant payload fits inside the proxy limits');

/* The highlight-to-ask prompt once ran to ~11,000 characters against a
   4,000 cap, so every highlight failed with a 400. Nothing caught it
   because the client budget and the server cap live in different files
   and were never compared. They are compared here. */

const chatJs = read('api/chat.js');
const assistantJs = read('penthia-assistant.js');

const serverCap = Number(/const MAX_CHARS_PER_MESSAGE = (\d+)/.exec(chatJs)?.[1]);
const serverTotal = Number(/const MAX_CHARS_TOTAL = (\d+)/.exec(chatJs)?.[1]);
const serverMsgs = Number(/const MAX_MESSAGES = (\d+)/.exec(chatJs)?.[1]);
const clientCap = Number(/const MAX_MESSAGE_CHARS = (\d+)/.exec(assistantJs)?.[1]);

ok('server publishes MAX_CHARS_PER_MESSAGE', Number.isFinite(serverCap), String(serverCap));
ok('client publishes MAX_MESSAGE_CHARS', Number.isFinite(clientCap), String(clientCap));
ok(`client cap (${clientCap}) does not exceed server cap (${serverCap})`, clientCap <= serverCap);

// Every limitContext budget inside buildHighlightPrompt, summed, plus the
// fixed template text, must fit the cap.
const fn = assistantJs.split('function buildHighlightPrompt')[1]?.split('\n}')[0] || '';
const budgets = [...fn.matchAll(/limitContext\([^,]+,\s*(\d+)\)/g)].map((m) => Number(m[1]));
ok('buildHighlightPrompt budgets every field it interpolates', budgets.length >= 4, `found ${budgets.length}`);
const template = (/`([\s\S]*?)`/.exec(fn)?.[1] || '').replace(/\$\{[^}]*\}/g, '').length;
const worst = budgets.filter((b) => b < serverCap).reduce((a, b) => a + b, 0) + template + 200; // +200 for the URL
ok(`worst-case highlight prompt (${worst}) fits the server cap (${serverCap})`, worst <= serverCap, `over by ${worst - serverCap}`);
ok('buildHighlightPrompt clamps its own output as a last resort',
  /return limitContext\(prompt,\s*MAX_MESSAGE_CHARS/.test(fn));

// The scraped site map is what blew the budget. The product knowledge is
// in the server-side system prompt, so it must not come back.
ok('no scraped site map in the highlight prompt', !assistantJs.includes('getWebsiteTextMap'));

// The client sends at most 20 turns, and the server accepts 24, so the
// turn count can never trip the server's message-count limit.
const clientTurns = Number(/chatHistory\.slice\(-(\d+)\)/.exec(assistantJs)?.[1]);
ok('client sends a bounded number of turns', Number.isFinite(clientTurns), String(clientTurns));
ok(`client turns (${clientTurns}) stay within server MAX_MESSAGES (${serverMsgs})`, clientTurns <= serverMsgs);

/* A failed request must not become part of the conversation. Both call
   sites fall back to text we wrote ourselves; storing it would replay our
   own error line to the model as if the assistant had said it, and
   sessionStorage would keep doing that for the rest of the visit. So
   every chatHistory.push of an assistant turn must be guarded by a check
   that the model actually answered. */
const assistantPushes = [...assistantJs.matchAll(/chatHistory\.push\(\{\s*role:\s*'assistant'[\s\S]{0,60}?\)\;/g)];
ok('assistant turns are pushed in exactly 2 places (chat, quiz)', assistantPushes.length === 2, `found ${assistantPushes.length}`);
for (const m of assistantPushes) {
  const before = assistantJs.slice(Math.max(0, m.index - 400), m.index);
  ok(`assistant push at ${m.index} is guarded by a real-reply check`,
    /if \((reply|modelReply)\) \{/.test(before), before.slice(-90).replace(/\n/g, ' '));
}
ok('both call sites log the real HTTP status for diagnosis',
  count(assistantJs, /console\.error\('\[penthia\] \/api\/chat/g) >= 3);

/* ── 12. Nothing left permanently invisible ───────────── */
group('Reveals cannot strand content');

const v3js = read('v3.js');
ok('v3.js: no-IntersectionObserver fallback reveals everything', v3js.includes("!('IntersectionObserver' in window)"));
ok('v3.js: on-load safety net', v3js.includes(".k-rv:not(.is-in)"));
for (const p of ALL_PAGES) {
  ok(`${p}: no orphaned old .reveal class`, !/class="[^"]*\breveal\b/.test(SRC[p]));
}
// Legal documents deliberately carry no reveals: a document should be
// readable the instant it loads, including with JS off.
for (const p of LEGAL_PAGES) ok(`${p}: no reveal wrappers`, !SRC[p].includes('k-rv'));

/* ── 13. Palette lock ─────────────────────────────────── */
group('Palette lock — six hexes, no more');

const LOCKED = ['#080a0f', '#5a6480', '#7a849f', '#c9a84c', '#e2c27a', '#f0eeea'];
const v3css = read('v3.css').replace(/\/\*[\s\S]*?\*\//g, ''); // strip the reference-mapping comments
const applied = [...new Set([...v3css.matchAll(/#[0-9a-fA-F]{3,8}/g)].map((m) => m[0].toLowerCase()))];
ok(`v3.css applies only locked hexes (${applied.join(' ')})`,
  applied.every((h) => LOCKED.includes(h)), applied.filter((h) => !LOCKED.includes(h)).join(', '));
const pageHexes = [...new Set(ALL_PAGES.flatMap((p) => [...SRC[p].matchAll(/#[0-9a-fA-F]{6}\b/g)].map((m) => m[0].toLowerCase())))];
ok(`pages apply only locked hexes (${pageHexes.join(' ') || 'none'})`,
  pageHexes.every((h) => LOCKED.includes(h)), pageHexes.filter((h) => !LOCKED.includes(h)).join(', '));

/* ── 14. Reduced motion ───────────────────────────────── */
group('Reduced motion draws everything instantly');

ok('v3.css: marks resolve under prefers-reduced-motion',
  /@media \(prefers-reduced-motion: reduce\)[\s\S]*?k-glyph path \{ animation: none !important; stroke-dashoffset: 0 !important/.test(read('v3.css')));

/* ── result ───────────────────────────────────────────── */
console.log(`\n${pass} passed, ${fail} failed`);
if (fail) { console.log('\nFailed:\n  ' + failures.join('\n  ')); process.exit(1); }

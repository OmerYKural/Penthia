/* ============================================================
   Build the legal pages from docs/legal/*.md

     node tools/build-legal.mjs          write privacy/terms/warranty.html
     node tools/build-legal.mjs --check  exit 1 if any file is stale

   The markdown is final copy. It is converted, never retyped and
   never edited: every character of visible text on the built page
   comes from the source file. pages.test.mjs runs --check so a
   hand-edit of the HTML, or a change to the markdown that was not
   rebuilt, fails the suite.

   The supported subset is exactly what these three documents use:
   h1/h2/h3, unordered and ordered lists, paragraphs, **strong**,
   and a single newline inside a paragraph meaning a line break.
   Anything outside that subset throws rather than being dropped.
   ============================================================ */

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'docs', 'legal');

/* Per-document metadata. Titles and descriptions are drawn from the
   documents themselves — nothing here states anything the copy does not. */
const PAGES = {
  privacy: {
    out: 'privacy.html',
    title: 'Privacy Policy | Penthia Solutions',
    description: 'How Penthia Solutions collects, uses, stores, and shares information. This website sets no cookies and uses no analytics or advertising trackers.',
    nav: 'Privacy',
  },
  terms: {
    out: 'terms.html',
    title: 'Website Terms of Use | Penthia Solutions',
    description: 'The terms governing your access to and use of the Penthia Solutions website.',
    nav: 'Terms',
  },
  warranty: {
    out: 'warranty.html',
    title: 'Warranty and Support | Penthia Solutions',
    description: 'The Penthia Solutions three-year limited hardware warranty, what it covers, how service works, and how to make a claim.',
    nav: 'Warranty',
  },
};

const ORIGIN = 'https://penthiasolutions.com';

/* ── escaping ─────────────────────────────────────────── */

const esc = (s) => s
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

/* Inline: **strong** only. Escape first, so no source text can ever
   introduce markup of its own. */
function inline(text) {
  const out = esc(text).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  if (out.includes('**')) throw new Error(`unbalanced ** in: ${text.slice(0, 80)}`);
  return out;
}

/* ── block parser ─────────────────────────────────────── */

function toHtml(md, file) {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const html = [];
  let i = 0;

  const isUl = (l) => /^- /.test(l);
  const isOl = (l) => /^\d+\. /.test(l);
  const isHeading = (l) => /^#{1,3} /.test(l);

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === '') { i++; continue; }

    if (isHeading(line)) {
      const m = /^(#{1,3}) (.*)$/.exec(line);
      const level = m[1].length;
      const cls = { 1: 'k-doc__h1', 2: 'k-doc__h2', 3: 'k-doc__h3' }[level];
      html.push(`<h${level} class="${cls}">${inline(m[2].trim())}</h${level}>`);
      i++;
      continue;
    }

    if (line.startsWith('#')) {
      throw new Error(`${file}: heading deeper than h3 is not supported: ${line}`);
    }

    if (isUl(line) || isOl(line)) {
      const ordered = isOl(line);
      const tag = ordered ? 'ol' : 'ul';
      const match = ordered ? isOl : isUl;
      const items = [];
      while (i < lines.length && match(lines[i])) {
        items.push(inline(lines[i].replace(ordered ? /^\d+\. / : /^- /, '').trim()));
        i++;
      }
      html.push(`<${tag} class="k-doc__list">`);
      items.forEach((it) => html.push(`  <li>${it}</li>`));
      html.push(`</${tag}>`);
      continue;
    }

    // Paragraph: consecutive non-blank, non-block lines. A single
    // newline inside one is a deliberate line break in these documents
    // (the "Penthia Solutions LLC / Ohio, United States" blocks).
    const para = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !isHeading(lines[i]) &&
      !isUl(lines[i]) &&
      !isOl(lines[i])
    ) {
      para.push(inline(lines[i].trim()));
      i++;
    }
    html.push(`<p class="k-doc__p">${para.join('<br />\n')}</p>`);
  }

  return html.join('\n');
}

/* ── page shell ───────────────────────────────────────── */

/* Footer link set, matching every other page: the five site pages,
   then the legal pages, each omitting itself. */
function footerLinks(selfHref) {
  const all = [
    ['index.html', 'Home'], ['about.html', 'About'], ['store.html', 'Store'],
    ['compare.html', 'Compare'], ['contact.html', 'Contact'],
    ['privacy.html', 'Privacy'], ['terms.html', 'Terms'], ['warranty.html', 'Warranty'],
  ];
  return all
    .filter(([href]) => href !== selfHref)
    .map(([href, label]) => `          <a href="${href}">${label}</a>`)
    .join('\n');
}

function shell(key, meta, body, docTitle) {
  const url = `${ORIGIN}/${meta.out}`;
  const jsonld = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${url}#webpage`,
    name: docTitle,
    url,
    description: meta.description,
    isPartOf: { '@type': 'WebSite', '@id': `${ORIGIN}/#website` },
    publisher: { '@id': `${ORIGIN}/#organization` },
    inLanguage: 'en',
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <!-- Generated by tools/build-legal.mjs from docs/legal/${key}.md — do not edit by hand. -->
  <title>${esc(meta.title)}</title>
  <meta name="description" content="${esc(meta.description)}" />
  <meta name="robots" content="index, follow" />
  <meta name="theme-color" content="#f0eeea" />
  <link rel="canonical" href="${url}" />
  <link rel="icon" type="image/png" href="favicon.png" />
  <link rel="apple-touch-icon" href="favicon.png" />
  <meta property="og:type" content="article" />
  <meta property="og:title" content="${esc(meta.title)}" />
  <meta property="og:description" content="${esc(meta.description)}" />
  <meta property="og:url" content="${url}" />
  <meta property="og:image" content="${ORIGIN}/penthialogo.jpg" />
  <script type="application/ld+json">
  ${jsonld}
  </script>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Figtree:wght@500;700&display=swap" rel="stylesheet" media="print" onload="this.media='all'" />
  <noscript><link href="https://fonts.googleapis.com/css2?family=Figtree:wght@500;700&display=swap" rel="stylesheet" /></noscript>
  <link rel="stylesheet" href="style.css" />
  <link rel="stylesheet" href="v3.css" />
</head>
<body>

  <header class="k-nv">
    <div class="k-nv__in">
      <a class="k-nv__brand" href="index.html" aria-label="Penthia Solutions — home">
        <img src="penthia-wordmark-ink.png" alt="Penthia Solutions" />
      </a>
      <nav class="k-nv__links" aria-label="Primary">
        <a class="k-nv__a" id="nav-home" href="index.html">Home</a>
        <a class="k-nv__a" id="nav-store" href="store.html">Products</a>
        <a class="k-nv__a" id="nav-compare" href="compare.html">Compare</a>
        <a class="k-nv__a" id="nav-about" href="about.html">About</a>
        <a class="k-nv__a" id="nav-contact" href="contact.html">Contact</a>
      </nav>
      <div class="k-nv__right">
        <label class="k-nv__search" aria-label="Search products">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <input type="search" id="siteSearch" placeholder="Search" autocomplete="off" />
        </label>
        <a class="k-btn k-btn--ghost" href="store.html">Products</a>
        <a class="k-btn k-btn--solid" href="contact.html">Request a quote</a>
      </div>
    </div>
  </header>

  <div class="page-wrap">

    <section class="k-sec k-sec--doc">
      <div class="k-c">
        <article class="k-doc">
${body.split('\n').map((l) => (l ? '          ' + l : l)).join('\n')}
        </article>
      </div>
    </section>

    <footer class="k-ft">
      <div class="k-c k-ft__in">
        <span style="font-weight:700;">Penthia Solutions</span>
        <span class="k-t-small" style="color:var(--ink-soft);">&copy; 2026 Penthia Solutions. All rights reserved.</span>
        <div class="footer-social social-icons-target"></div>
        <nav class="k-ft__links">
${footerLinks(meta.out)}
        </nav>
      </div>
    </footer>
  </div>

  <!-- MOBILE NAV -->
  <nav class="mobile-nav" aria-label="Mobile navigation">
    <div class="mobile-nav-inner">
      <a class="mobile-nav-btn" id="mnav-home" href="index.html"><svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>Home</a>
      <a class="mobile-nav-btn" id="mnav-about" href="about.html"><svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>About</a>
      <a class="mobile-nav-btn" id="mnav-store" href="store.html"><svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>Store</a>
      <a class="mobile-nav-btn" id="mnav-compare" href="compare.html"><svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>Compare</a>
      <a class="mobile-nav-btn" id="mnav-contact" href="contact.html"><svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>Contact</a>
    </div>
  </nav>

  <!-- PENTHIA AI INTRO BANNER -->
  <div id="ai-intro-banner">
    <button class="ai-intro-close" aria-label="Dismiss" onclick="AIIntro.dismiss()">✕</button>
    <div class="ai-intro-icon"><img src="favicon.png" alt="Penthia AI" /></div>
    <div class="ai-intro-body">
      <div class="ai-intro-title">Penthia AI is here!</div>
      <div class="ai-intro-text">Ask about specs, pricing, or get a recommendation — anytime, on any page.</div>
      <div class="ai-intro-actions">
        <button class="ai-intro-try" onclick="AIIntro.openChat()">Say hi →</button>
        <button class="ai-intro-dismiss" onclick="AIIntro.dismiss()">Not now</button>
      </div>
    </div>
  </div>

  <script src="script.js"></script>
  <script src="penthia-assistant.js"></script>
  <script src="penthia-ai-intro.js"></script>
  <script src="v3.js"></script>
</body>
</html>
`;
}

/* ── run ──────────────────────────────────────────────── */

const check = process.argv.includes('--check');
let stale = 0;

const found = readdirSync(SRC).filter((f) => f.endsWith('.md')).map((f) => f.replace(/\.md$/, '')).sort();
const expected = Object.keys(PAGES).sort();
if (found.join(',') !== expected.join(',')) {
  console.error(`docs/legal holds [${found}], generator knows [${expected}]`);
  process.exit(1);
}

for (const [key, meta] of Object.entries(PAGES)) {
  const md = readFileSync(join(SRC, `${key}.md`), 'utf8');
  const docTitle = /^# (.*)$/m.exec(md)[1].trim();
  const out = shell(key, meta, toHtml(md, `${key}.md`), docTitle);
  const dest = join(ROOT, meta.out);

  if (check) {
    let current = '';
    try { current = readFileSync(dest, 'utf8'); } catch { /* missing */ }
    if (current !== out) { console.error(`STALE: ${meta.out} does not match docs/legal/${key}.md`); stale++; }
  } else {
    writeFileSync(dest, out);
    console.log(`wrote ${meta.out}  (${out.length} bytes)`);
  }
}

if (check) {
  if (stale) { console.error(`${stale} legal page(s) stale — run: node tools/build-legal.mjs`); process.exit(1); }
  console.log('legal pages match their markdown');
}

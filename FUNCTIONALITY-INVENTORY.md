# Penthia site — functionality inventory

Captured **2026-08-04** from `main` at commit `8a53adc`, before the visual redesign.

This is the checklist the redesign is measured against. Every line must still be
true afterwards. Anything that cannot be preserved gets raised before it is
changed, not discovered after.

---

## 1. URLs — none of these may move or be renamed

| URL | Purpose |
|---|---|
| `/` (`index.html`) | Homepage |
| `/about.html` | About |
| `/store.html` | Product lineup |
| `/compare.html` | Model comparison |
| `/contact.html` | Contact + quote request |
| `/catalog/` (`catalog/index.html`) | Product Catalog 2026 — **live, unlinked from nav** |
| `/testing/` | Experimental 3D hero build — **live, publicly indexable** |
| `/robots.txt` | Crawl directives |
| `/sitemap.xml` | Sitemap |
| `/googlef73d1b62d183f93f.html` | **Google Search Console verification — must never be moved or renamed** |
| `/api/chat` | Claude proxy (Vercel Function) |
| `/CNAME` | GitHub Pages custom-domain file — retain while Pages is the fallback |

Every image asset at the web root is referenced by one or more pages; none may be
deleted without checking references first.

## 2. Navigation

- Header nav on all 5 pages: Home, About, Store, Compare, Contact
- Active-page indicator on the current item
- Brand wordmark (`penthia-wordmark.png`) links to `/`
- Product search input (`#siteSearch`) in the header
- "Shop Now" CTA button → `store.html`
- Mobile nav (`.mobile-nav`) — separate markup, must keep working
- Footer nav: About, Store, Compare, Contact
- Footer social icons — injected by JS into `.social-icons-target`

## 3. Interactive features

| Feature | Implemented in | Notes |
|---|---|---|
| **Penthia AI assistant** | `penthia-assistant.js` | Floating launcher, chat panel, session history in `sessionStorage` (last 20 turns), calls `/api/chat`. **On all 5 pages.** |
| **AI intro toast** | `penthia-ai-intro.js` | "Penthia AI is here!" prompt. On all 5 pages. |
| **Find My Board quiz** | `penthia-quiz-popup.js` | 5-question flow, option buttons, optional free-text note, calls `/api/chat` for the verdict, renders a recommendation card, has a local fallback if the call fails. **Homepage only.** |
| **Highlight-to-ask** | `penthia-assistant.js` | Selecting text on the page offers to ask the assistant about it, passing page context. |
| **Product modal** | `script.js` | `openProduct`, `closeModal`, `handleModalClick`, gallery via `renderThumbs` / `setImage` / `changeImage`, spec chips via `setChips`. |
| **Product images** | `penthia-product-images.js` | Image sets per model. |
| **Product filtering** | `script.js` → `filterProducts` | Store page. |
| **FAQ accordion** | `script.js` → `toggleFaq` | About page. |
| **Contact form opener** | `script.js` → `openContactForm` | Cross-page CTA into the contact form. |
| **Scroll reveals** | `.reveal` / `.reveal.visible` | Content is `opacity: 0` until revealed — **anything replacing this must not leave content permanently invisible.** |

## 4. Contact form

`contact.html` → `<form id="contactForm">` → **Formspree endpoint `xnjoppqk`**

Fields, all of which must survive with the same submitted names:

| Field id | Submitted name |
|---|---|
| `firstName` | `First Name` |
| `lastName` | `Last Name` |
| `email` | `Email` |
| `phone` | `Phone Number` |
| `organization` | `Organization` |
| `message` | `Message` |
| — | `_subject` (hidden) |

## 5. SEO and metadata

- Unique `<title>` and `<meta name="description">` on all 5 pages
- `<meta name="robots">` on all 5 pages; homepage additionally sets
  `max-image-preview:large, max-snippet:-1, max-video-preview:-1`
- `<meta name="theme-color" content="#080a0f">`
- `<link rel="canonical">` on the homepage
- Open Graph: `og:type`, `og:title`, `og:description`, `og:url`, `og:image`
- `<link rel="icon">` and `apple-touch-icon` → `favicon.png`
- **JSON-LD on the homepage**: `Organization` (with `sameAs` → YouTube, LinkedIn) and
  `FAQPage` with two `Question`/`Answer` pairs
- Google Fonts preconnect + deferred stylesheet load with `<noscript>` fallback

**Known pre-existing gap:** `sitemap.xml` lists only `https://penthiasolutions.com/`.
The other four pages are absent. Worth fixing, but it is a change — flag before doing it.

## 6. Infrastructure

- Hosted on **Vercel**; GitHub Pages retained as a fallback
- `/api/chat` — Vercel Function; server owns model, system prompt, and limits
- `api/_system-prompt.js` — server-side system prompt. **Content-rule-bearing:**
  EDLA wording, quote-based pricing, warranty terms. Editing it is a content change,
  not a design change.
- `api/chat.test.mjs` — 30 guard-rail tests, must still pass
- `vercel.json`, `package.json` — build config

## 7. Content rules that bind any copy change

From the vault `CLAUDE.md`. These apply to marketing copy as much as to the assistant:

- No factory costs, supplier identity, margins, or contacts
- No historical price presented as current — **all pricing is quote-based**
- **No Penthia-branded EDLA certification claim.** The platform is EDLA-capable;
  the brand is not certified.
- No invented specifications
- Do not claim 50-point touch universally — QS3 and the 110" differ
- Existing published claims that are already contradictory (the 3-year warranty
  against the factory's 1-year panel term) must not be amplified or repeated more
  prominently than they already are

---

---

## v3 rollout — how this checklist is now enforced

The checkable parts of this document are asserted by **`pages.test.mjs`**
(`node pages.test.mjs`, 266 assertions across all five pages): URLs, canonical
tags, every local asset resolving, nav and mobile-nav ids, the full product-modal
id contract, the store filtering hooks, the seven Formspree field names, the FAQ
markup, the compare table's row count, the SEO surface, the palette lock, and the
squiggle budget. `api/chat.test.mjs` (30) still guards the proxy.

Two hooks from the old stylesheet are kept deliberately and are load-bearing:

- **`prod-card`** on the store cards — `filterProducts()` queries
  `#productGrid .prod-card`. The class is kept as the JS hook and its dark
  `style.css` skin is neutralised in `v3.css` rather than fought.
- **`open`** on FAQ items — `toggleFaq()` toggles that exact word on the parent.
  Everything around it is namespaced `k-faq__*`.

`style.css` also styles the bare `footer` element dark; `v3.css` reclaims it.

## Sign-off checklist

Run against every redesigned page before requesting review.

- [ ] All 12 URLs resolve, none renamed
- [ ] Header nav, active state, mobile nav, footer nav all work
- [ ] Product search present and functional
- [ ] Assistant launcher opens, sends, receives, persists session
- [ ] AI intro toast appears and dismisses
- [ ] Find My Board quiz completes and returns a recommendation
- [ ] Highlight-to-ask still passes page context
- [ ] Product modal opens, gallery cycles, chips render, closes
- [ ] Store filtering works
- [ ] FAQ accordion toggles
- [ ] Contact form submits to Formspree with all 7 field names intact
- [ ] Titles, descriptions, robots, canonical, OG tags, JSON-LD present per page
- [ ] Favicon and theme-color intact
- [ ] Google verification file untouched at its exact path
- [ ] No content in a permanently hidden state
- [ ] `node api/chat.test.mjs` — 30 passing
- [ ] No new colour outside the locked palette

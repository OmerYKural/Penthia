# Feel spec — vibe.us system applied to penthiasolutions.com (v3)

Measured, not remembered. Source: `docs/feel/vibe/report.md`, extractor run at
8 scroll steps, `--full`, three breakpoints, 2026-08-04.

**Vibe is a direct competitor selling interactive displays to the same buyers.**
Only the system is being copied: spacing, type scale, colour *roles*, easing,
durations, density, section rhythm. Their words, images, illustrations, icon
set, product naming, brand colour and signature layouts are not.

---

## Thesis

Calm, confident, mid-scale. Nothing shouts. The page earns attention through
whitespace and restraint rather than size — the largest thing on a 9,500px page
is 48px.

---

## Type

Vibe runs **one family everywhere** (`InterVariable`, 178 occurrences) and only
**two weights**: 700 and 500. There is **no letter-spacing anywhere on the page**.

| Role | Size / line-height | Weight | Count on their page |
|---|---|---|---|
| Display / h1 | 48px / 60px (1.25) | 700 | 14× |
| Section h2 | 40px / 50px (1.25) | 700 | 11× |
| Sub-head | 32px / 43.2px (1.35) | 700 | 15× |
| Card title | 24px / 32.4px (1.35) | 700 | 21× |
| Lead | 20px / 28px (1.4) | 500 | 22× |
| Body | 16px / 24px (1.5) | 500 | 62× |
| Small | 14px / 21px (1.5) | 500 | 28× |
| Caption | 18px / 25.2px | 500 | 5× |

**8 sizes. Two weights. Zero tracking.** We match that exactly.

**The headline discipline is the finding that matters most.** Their h1 is
**6 words at 48px**; h2s run 6–11 words at 32–48px. Mobile tops out at 40px.
Both my previous versions used 92–138px display type. v3 does not.

### Font conflict — flagged

Their face is **InterVariable**. My house rules forbid Inter. Substituting on
shape rather than name: **Figtree** — comparable x-height, similar width, same
neutral-geometric grotesque register, one family for the whole page as they do.
This is a deliberate deviation and the single most likely place v3 reads
differently from the reference.

---

## Spacing

Base unit is **4/8**. Measured gaps, by frequency: 8 (53×), 16 (36×), 4 (24×),
40 (10×), 12, 24, 48, 20, 28, 80, 32.

- Section padding: **120px top / 80px bottom**
- Container: **1240px** (980px for narrow text, 1360px for wide media)
- Page runs **10.6× viewport** desktop, **15.1×** mobile

---

## Colour by role

Their roles, mapped to my locked palette. **No Penthia hex changes.**

| Role | Vibe | Ours |
|---|---|---|
| page | `#ffffff` | `#f0eeea` |
| surface-2 (alt band) | `#f5f5fa` | `rgba(8,10,15,0.03)` over paper |
| slab (dark inset) | `rgba(24,24,24,0.8)` | `#080a0f` |
| ink | `#0c0b0d` | `#080a0f` |
| muted ink | `#5d5c66` / `#b6b5bf` | `#5a6480` / `#7a849f` |
| accent | `#405dff` / `#4a4af4` | `#c9a84c` |
| border | `rgba(12,11,13,0.08)` | `rgba(8,10,15,0.08)` |

Their accent is an indigo-blue — their brand, and a colour my house rules
exclude anyway. Gold does the same structural job: ghost-button borders, link
text, one filled CTA.

**Accent frequency:** 24 text + 6 background occurrences across 9,500px. Used
often enough to feel systematic, rarely enough to still register.

---

## Surfaces

- Radii: **9999px** pills (47×), **16px** cards (44×), **40px** large slabs, 8px small
- Shadow, one value: `0 4px 24px rgba(0,0,0,0.08)` (9×) — low, soft, wide
- Ghost button border: **2px solid accent** (13×)
- Backdrop blur only on overlays (2–4px), not on the nav

---

## Composition

- **Section headings are centred.** Both my previous versions were left-aligned.
- 3-up card grid, equal columns (measured `402.6px × 3` inside 1240px)
- Image cards: full-bleed photo, 16px radius, title overlaid bottom-left on a scrim
- Large rounded dark slab breaking out of the white as a contrast moment
- Centred ghost pill button closing a section
- Alternating white / tinted bands

---

## Motion

**No GSAP, no Lenis, no scroll-linked pinning.** Only Swiper (carousels) and
CSS. Reveals are `IntersectionObserver` + CSS — do not load a library.

- Dominant easing: **`cubic-bezier(0.4, 0, 0.2, 1)`** — 86 of 110 transitions
- Durations: opacity **0.2s**, transform **0.3s**, larger transform **0.5s**, reveals **0.8s**
- `fade-in-up` keyframe present — modest translate, not a big rise
- Hover: colour shift only; almost no lift
- Sticky nav, z 600–800
- Scroll journey is **quiet**: 0–6 elements move per step for most of the page,
  peaking at 14 near the end. This is not an animated site. We match that.

---

## Voice

Headlines 6–11 words, sentence case, assertive not explanatory. Body 1–2 short
sentences. **No new claims will be written** — every line on v3 already appears
on penthiasolutions.com today.

---

## Remap — and where their structure does not fit

| Vibe section | v3 | Note |
|---|---|---|
| Sticky nav, Shop All + Request a Demo, cart, account | Sticky nav, Request a quote | **No cart, no account, no Shop.** Quote-based. |
| Hero: split copy / product-in-use, price shown | Hero: same split, **no price** | Pricing is quote-based. A price cannot appear. |
| "Over 40,000 customers" + logo wall | **Gap — see below** | |
| 3-up named customer stories | Published capability facts | No customers are publishable. |
| Device family cards | Four Vertex lines | Maps cleanly. |
| Vibe AI gradient slab | Penthia AI band, own treatment | Penthia has its own assistant; the gradient is theirs. |
| Resources / blog | — | Doesn't exist. |
| Footer with shop columns | Existing footer | |

### Three places their structure genuinely does not map

1. **Social proof is their spine and we have none.** Their most prominent trust
   device — a customer count and a logo wall directly under the hero — is the
   single strongest thing on their page. Penthia has no publishable customer
   names, counts, or quotes. I will not invent them. The band becomes published
   product facts, which is honest but **measurably weaker**, and it is the
   biggest remaining gap between the two pages.

2. **Commerce chrome carries a third of their nav.** Cart, account, Shop All,
   and shown prices give their page an action surface v3 cannot have. Quote
   requests are slower and less numerous, so the CTA density has to drop.

3. **They have an editorial pipeline.** Stories, resources, webinars fill their
   lower page. v3's lower page is shorter as a result — v3 will land nearer
   6–7× viewport than their 10.6×, and shortening it is the right call rather
   than padding it with filler.

---

## Not copying

- Wordmark, brand name, product names
- Accent colour (theirs is indigo-blue; ours is the locked gold)
- Their photography, illustrations, icon set, gradient AI panel
- The scattered image-collage-around-a-heading device — distinctive enough to be recognisably theirs
- Any copy text
- Inter (house rule) — substituting Figtree on shape

Nobody should mistake the result for Vibe.

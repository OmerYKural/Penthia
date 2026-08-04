# Feel spec — uber.com system applied to penthiasolutions.com (v4)

Measured, not remembered. Source: `docs/feel/uber/report.md`, extractor run at
8 scroll steps, `--full`, three breakpoints, 2026-08-04.

Uber is **not** a competitor — different industry, no overlap in buyers. The
copying constraint is therefore lighter than it was for Vibe, but the rule
holds: system only. No copy text, illustrations, icon set, or brand marks.

---

## Thesis

Utilitarian and dense. A page that behaves like a tool rather than a brochure —
black, white, one grey, almost no colour, almost no motion, everything
left-aligned on a strict 12-column grid.

---

## Type

Two families (`UberMove` display, `UberMoveText` text) and **three weights**,
with **400 dominant** — 69 occurrences against 46 at 500 and only 15 at 700.
Both previous references leaned on 500/700; this one is genuinely lighter.
**No tracking anywhere.**

| Role | Size / line-height | Weight | Count |
|---|---|---|---|
| Display / h1 | 52px / 64px (1.23) | 700 | 1× |
| Section h2 | 36px / 44px (1.22) | 700 | 10× |
| Sub-head | 24px / 32px (1.33) | 500 | 5× |
| Lead | 18px / 24px (1.33) | 400 | 5× |
| Body | 16px / 24px (1.5) | 400 | 44× |
| Body tight | 16px / 20px (1.25) | 400 | 18× |
| Small | 14px / 20px (1.43) | 400 | 53× |
| Micro | 12px / 20px | 400 | 11× |

**8 sizes.** The headline discipline is even tighter than Vibe's: **h1 is 4
words at 52px**, h2 is 3–7 words at 36px. Mobile drops the largest to 36px.

### Font conflict — flagged

`UberMove` / `UberMoveText` are proprietary and unlicensable. Substituting on
shape: **Hanken Grotesk** — geometric grotesque, tall x-height, wide round
forms, full 400/500/700 range. House rules exclude Inter, Roboto, Arial and
Space Grotesk; Hanken Grotesk avoids all four. This is the most likely place
v4 reads differently from the reference.

---

## Spacing

Base unit is **4**, but the dominant rhythm gap is **36px** (15×) — an unusual
number and part of why the page feels its own way. Other gaps: 8, 16, 12, 4, 2.

- Section padding measures **0/0**: they space with grid and margin, not section padding
- **12-column grid, 63px columns** (17×) — an explicit, visible grid
- Containers: **1280px** (10×), 1152px content, 1408px wide, 756px narrow

---

## Colour by role

This is the defining measurement. **Uber has effectively no accent colour.**
Across 100+ colour instances: black 60, white 52, grey 7. Exactly **one** blue.

| Role | Uber | Ours |
|---|---|---|
| page | `#ffffff` | `#f0eeea` |
| surface | `#f3f3f3` | `rgba(8,10,15,0.04)` |
| ink | `#000000` | `#080a0f` |
| muted ink | `#5e5e5e` / `#afafaf` | `#5a6480` / `#7a849f` |
| inverse band | `#000000` | `#080a0f` |
| primary button | **black**, not an accent | **ink**, not gold |
| accent | one blue, once | **gold, used twice on the whole page** |

**The important discipline:** their primary CTA is *black*. Colour is not how
they signal action — weight and contrast are. v4 makes the primary button ink
and lets gold appear only twice, which keeps the locked palette while copying
the restraint honestly.

---

## Surfaces

- Radii: **8px** (31×) dominant, **999px** pills (22×), 12px (9×)
- Shadows barely exist: `0 4px 16px rgba(0,0,0,0.16)` ×3 on the whole page
- Cards are **filled grey panels**, not outlined
- Borders: `2px solid #f3f3f3` — light grey, never accent
- Backdrop blur 32px, once

---

## Composition

- **Everything left-aligned.** Vibe centred its section heads; Uber does not.
- Black nav bar, white text, small pill sign-up
- Hero: copy left with a functional form, image right in an 8px panel
- 3-up grey cards: title, body, small pill button, product image bottom-right
- Alternating 50/50 blocks: square-ish image one side, copy the other
- Persistent bottom action bar

---

## Motion

**This is a static page.** The scroll journey is the most striking measurement
in the whole report:

```
step 0: 0 transformed   step 4: 0 transformed
step 1: 7 transformed   step 5: 0 transformed
step 2: 0 transformed   step 6: 0 transformed
step 3: 0 transformed   step 7: 0 transformed
```

Six of eight scroll steps move **nothing at all**. There are no scroll reveals.

- Dominant transition: `background 0.2s cubic-bezier(0,0,1,1)` (41×) — that curve is **linear**
- Second: `background-size 0.5s cubic-bezier(0.22,1,0.36,1)` (33×) — expo-out, image zoom only
- Hover changes **background colour only**. No lift, no scale.
- Three/Spline is loaded for a hero canvas, not for scroll

**v4 will have no scroll reveals.** That is the single most copyable thing here
and the biggest departure from v1, v2 and v3, all of which faded content in.

---

## Voice

h1 of 4 words. h2 of 3–7. Body 1–2 short sentences. Imperative and plain.
**No new claims** — every line already appears on penthiasolutions.com.

---

## Remap — and where their structure does not fit

| Uber | v4 | Note |
|---|---|---|
| Black nav, Sign up pill | Black nav, Request a quote | |
| Hero with live booking form | Hero with quote path | **Biggest non-mapping — see below** |
| "Explore what you can do" 3-up grey cards | Four product cards | Maps well |
| Alternating 50/50 image/copy blocks | Capability + installation blocks | Maps well |
| Persistent bottom "See prices" bar | Persistent quote bar | Maps, but weaker |
| Login / account / city picker | — | No accounts |
| Custom illustration set | Penthia photography | Not copying their illustration language |

### Three places their structure genuinely does not map

1. **Their hero is a transaction widget, not a headline.** Pickup, dropoff, See
   prices — you can start a purchase in the first viewport. Penthia is
   quote-based, and by your own rules a price cannot appear anywhere. The hero
   becomes copy plus two CTAs, which is *structurally weaker* than theirs and
   is the main reason v4 will not feel as purposeful as the reference.

2. **No accounts, no locality.** City picker, Log in, and recent activity carry
   a third of their nav and give the page a sense of live state. v4 has none.

3. **They have one product per audience; you have four in one family.** Their
   3-up cards are different *services*. v4's four cards are variants of the same
   thing, so the grid reads more repetitive than theirs by nature.

---

## Not copying

- Wordmark, brand name, product names
- Their illustration language, icon set, photography
- Their nav structure or copy text
- `UberMove` (proprietary) — substituting Hanken Grotesk on shape
- The black nav bar is a genuine Uber signature. v4 uses it because the
  measurement demands it (black background 27×), but with Penthia's wordmark
  and no other Uber cue, it should not read as theirs.

/* ============================================================
   Penthia — v3 system behaviour, shared by every page.

   Two jobs only:
     1. scroll reveals   (.k-rv -> .is-in)
     2. squiggle lengths (measure each path, hand it to CSS)

   The reference loads no motion library and moves 0-6 elements
   per scroll step, so this stays deliberately small.
   ============================================================ */

(function () {
  'use strict';

  /* ── 1. reveals ───────────────────────────────────────── */
  var els = document.querySelectorAll('.k-rv');

  if (!('IntersectionObserver' in window)) {
    // No observer: show everything rather than leave content invisible.
    Array.prototype.forEach.call(els, function (e) { e.classList.add('is-in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -5% 0px', threshold: 0.05 });

    Array.prototype.forEach.call(els, function (e) { io.observe(e); });

    // Safety net: anything already on screen after load gets revealed
    // regardless, so a missed observer callback can never hide content.
    window.addEventListener('load', function () {
      setTimeout(function () {
        document.querySelectorAll('.k-rv:not(.is-in)').forEach(function (e) {
          if (e.getBoundingClientRect().top < window.innerHeight) e.classList.add('is-in');
        });
      }, 300);
    });
  }

  /* ── 2. squiggle lengths ──────────────────────────────── */
  /* Every mark is an SVG stroke-dash draw-on. The dash length has to
     equal the path's real length or the stroke draws a fraction of
     itself. Measure it, don't guess it. */

  function setPathLen(el) {
    try {
      var n = el.getTotalLength ? el.getTotalLength() : 0;
      if (n) el.style.setProperty('--len', Math.ceil(n));
    } catch (e) { /* detached or display:none — CSS fallback covers it */ }
  }

  function measure() {
    document.querySelectorAll('.k-mark__svg path, .k-glyph path').forEach(setPathLen);

    // Card borders are a <rect> sized in percent, so getTotalLength()
    // reports the unresolved geometry. Measure the CARD instead.
    document.querySelectorAll('.k-card__border').forEach(function (svg) {
      var card = svg.parentElement;
      var rect = svg.querySelector('rect');
      if (!card || !rect) return;
      var b = card.getBoundingClientRect();
      if (!b.width) return;
      rect.style.setProperty('--len', Math.ceil((b.width + b.height) * 2) + 40);
    });
  }

  if (document.readyState === 'complete') measure();
  else window.addEventListener('load', measure);
  window.addEventListener('resize', measure, { passive: true });

  /* ── 3. the contact confirmation mark ─────────────────── */
  /* script.js reveals #contactThankyou by setting an inline display.
     Relying on "an animation starts when a display:none element is
     shown" is not reliable across browsers, so watch for the reveal
     and flip a class instead. script.js is not touched. */

  var thanks = document.getElementById('contactThankyou');
  if (thanks && 'MutationObserver' in window) {
    // Watch `style` only, and disconnect on the first hit: adding the class
    // is itself an attribute mutation, so a `class` filter would re-enter.
    var mo = new MutationObserver(function () {
      if (thanks.offsetHeight === 0) return;
      mo.disconnect();
      measure();
      thanks.classList.add('is-in');
    });
    mo.observe(thanks, { attributes: true, attributeFilter: ['style'] });
  }
  // Path length comes from the `d` attribute, not from layout, so marks
  // inside a display:none block (the contact confirmation) measure fine
  // here and are already correct by the time they are shown.
})();

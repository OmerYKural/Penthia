/* ============================================================
   Penthia — penthia-home.js
   Homepage behavior: scroll-reveal for .reveal2 elements,
   top-bar scrolled state, and (optional) smooth scrolling.
   The signature 3D boot sequence lives in penthia-boot-3d.js;
   this file handles the calmer page-level motion around it.
   Guards for missing GSAP so nothing breaks if a CDN fails.
   ============================================================ */

(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- Top bar: add .scrolled once the user leaves the hero ---- */
  var tbar = document.getElementById('tbar');
  function onScrollBar() {
    if (!tbar) return;
    if (window.scrollY > 40) tbar.classList.add('scrolled');
    else tbar.classList.remove('scrolled');
  }
  window.addEventListener('scroll', onScrollBar, { passive: true });
  onScrollBar();

  /* ---- Reveal on scroll (IntersectionObserver; no dependency) ---- */
  var reveals = document.querySelectorAll('.reveal2');
  if (reduce || !('IntersectionObserver' in window)) {
    reveals.forEach(function (el) { el.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
    reveals.forEach(function (el) { io.observe(el); });
  }

  /* ---- Stagger groups: give siblings a small incremental delay ---- */
  function stagger(selector, step) {
    var items = document.querySelectorAll(selector);
    items.forEach(function (el, i) {
      el.style.transitionDelay = (i * step) + 'ms';
    });
  }
  if (!reduce) {
    stagger('.readout-cell', 80);
    stagger('.cap-grid .cap-card', 70);
    stagger('.line-list .board-row', 60);
  }

  /* ---- Light parallax on room images (cheap, transform-only) ---- */
  if (!reduce && window.gsap && window.ScrollTrigger) {
    var gsap = window.gsap;
    document.querySelectorAll('.room-shot img').forEach(function (img) {
      gsap.fromTo(img, { yPercent: -6 }, {
        yPercent: 6, ease: 'none',
        scrollTrigger: { trigger: img, start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });
  }
})();

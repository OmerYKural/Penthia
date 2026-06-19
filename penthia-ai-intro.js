/* ============================================================
   Penthia Solutions — penthia-ai-intro.js
   Small persistent "Penthia AI is here!" introduction banner.
   Coexists with the homepage quiz popup (does not replace it):
   on the homepage it waits for the quiz to be dismissed first
   so the two never compete for attention at the same time.
   On every other page it can appear on its own after a short delay.
   Shown once per session; always dismissible.
   ============================================================ */

(function () {
  const SEEN_KEY = 'penthia_ai_intro_seen';
  const isHome = /(^\/$|\/index\.html$)/.test(window.location.pathname) || window.location.pathname === '';

  function show() {
    let seen = false;
    try { seen = sessionStorage.getItem(SEEN_KEY) === '1'; } catch (_) {}
    if (seen) return;

    const banner = document.getElementById('ai-intro-banner');
    if (!banner) return;

    // Don't show while the quiz popup is actively open.
    const quizOverlay = document.getElementById('quiz-popup-overlay');
    if (quizOverlay && quizOverlay.classList.contains('qp-visible')) {
      setTimeout(show, 1000);
      return;
    }

    banner.classList.add('show');
  }

  function dismiss() {
    const banner = document.getElementById('ai-intro-banner');
    if (banner) banner.classList.remove('show');
    try { sessionStorage.setItem(SEEN_KEY, '1'); } catch (_) {}
  }

  function openChat() {
    dismiss();
    setTimeout(() => {
      if (typeof window.togglePenthiaWidget === 'function') {
        const widget = document.getElementById('p-widget');
        if (!widget || !widget.classList.contains('open')) {
          window.togglePenthiaWidget();
        }
      }
    }, 250);
  }

  window.AIIntro = { dismiss, openChat };

  document.addEventListener('DOMContentLoaded', () => {
    // On the homepage, the quiz popup gets first attention. Give it room
    // to appear (and possibly get dismissed) before introducing the chat.
    const delay = isHome ? 4500 : 1800;
    setTimeout(show, delay);
  });
})();

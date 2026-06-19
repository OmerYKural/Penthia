/* ============================================================
   Penthia Solutions — penthia-quiz-popup.js
   First-visit guided quiz popup (Chess.com / Grammarly style).
   Auto-opens once per session, always skippable, and always
   re-openable from a small floating chip.
   ============================================================ */

(function () {
  const SEEN_KEY = 'penthia_quiz_popup_seen';

  const STEPS = [
    {
      eyebrow: "Let's find your board",
      question: "What will this display be used for?",
      options: ["K-12 classroom", "Higher ed / training room", "Business or conference room", "Personal or home use"]
    },
    {
      eyebrow: "Step 2 of 4",
      question: "Do you need Google Workspace support?",
      options: ["Yes, it's essential", "Nice to have", "No, we use Microsoft", "Not sure yet"]
    },
    {
      eyebrow: "Step 3 of 4",
      question: "What matters most to you?",
      options: ["Best performance available", "Best value for budget", "External-computer display, no built-in Android", "Built-in Windows desktop"]
    },
    {
      eyebrow: "Step 4 of 4",
      question: "Will you need a camera and microphone for video calls or hybrid learning?",
      options: ["Yes, definitely", "Maybe later", "No"]
    }
  ];

  let currentStep = 0;
  const answers = [];

  function el(html) {
    const div = document.createElement('div');
    div.innerHTML = html.trim();
    return div.firstElementChild;
  }

  function renderProgress() {
    let dots = '';
    for (let i = 0; i < STEPS.length; i++) {
      dots += `<div class="qp-progress-dot ${i < currentStep ? 'done' : ''}"></div>`;
    }
    return `<div class="qp-progress">${dots}</div>`;
  }

  function renderStep() {
    const popup = document.getElementById('quiz-popup');
    if (!popup) return;
    const step = STEPS[currentStep];

    const optionsHtml = step.options
      .map((opt, i) => `<button class="qp-option" data-idx="${i}">${opt}</button>`)
      .join('');

    popup.innerHTML = `
      <button class="qp-close" aria-label="Close" onclick="QuizPopup.dismiss()">✕</button>
      ${renderProgress()}
      <div class="qp-eyebrow"><span class="qp-dot-pulse"></span>${step.eyebrow}</div>
      <div class="qp-question">${step.question}</div>
      <div class="qp-options">${optionsHtml}</div>
      <div class="qp-footer-row">
        ${currentStep > 0
          ? `<button class="qp-back-btn" onclick="QuizPopup.back()">‹ Back</button>`
          : `<span></span>`}
        <button class="qp-skip-btn" onclick="QuizPopup.dismiss()">No thanks, I'll browse myself</button>
      </div>
    `;

    popup.querySelectorAll('.qp-option').forEach(btn => {
      btn.addEventListener('click', () => selectOption(parseInt(btn.dataset.idx, 10)));
    });
  }

  function selectOption(idx) {
    answers[currentStep] = STEPS[currentStep].options[idx];
    currentStep++;
    if (currentStep < STEPS.length) {
      renderStep();
    } else {
      renderResult();
    }
  }

  function back() {
    if (currentStep === 0) return;
    currentStep--;
    renderStep();
  }

  function getRecommendation() {
    const text = answers.join(' ').toLowerCase();
    if (text.includes('external-computer') || text.includes('no built-in android')) {
      return { name: 'QS3 Series', reason: 'Pairs with the external computer you already use for 4K display, touch, and annotation.' };
    }
    if (text.includes('best value')) {
      return { name: 'Vertex Standard', reason: 'An accessible, reliable choice with 4K touch and the essentials your classroom needs.' };
    }
    if (text.includes('best performance')) {
      return { name: 'Vertex Elite', reason: 'Our flagship model — the fastest, most capable board in the lineup.' };
    }
    return { name: 'Vertex Pro', reason: 'The recommended balance of performance, Google support, and value for most schools.' };
  }

  function renderResult() {
    const popup = document.getElementById('quiz-popup');
    if (!popup) return;
    const rec = getRecommendation();

    popup.innerHTML = `
      <button class="qp-close" aria-label="Close" onclick="QuizPopup.dismiss()">✕</button>
      <div class="qp-result-icon">✦</div>
      <div class="qp-result-title">Based on your answers, we'd suggest the <span class="accent">${rec.name}</span>.</div>
      <p class="qp-result-desc">${rec.reason} Want to keep talking it through? Penthia AI can answer follow-up questions or pull up full specs right now.</p>
      <div class="qp-result-actions">
        <button class="qp-result-primary" onclick="QuizPopup.openAI()">Continue with Penthia AI →</button>
        <button class="qp-result-secondary" onclick="QuizPopup.goToStore()">Just show me the store</button>
      </div>
    `;
  }

  function dismiss() {
    const overlay = document.getElementById('quiz-popup-overlay');
    if (overlay) {
      overlay.style.transition = 'opacity 0.25s ease';
      overlay.style.opacity = '0';
      setTimeout(() => { overlay.style.display = 'none'; overlay.style.opacity = ''; }, 250);
    }
    try { sessionStorage.setItem(SEEN_KEY, '1'); } catch (_) {}
    showReopenChip();
  }

  function showReopenChip() {
    const chip = document.getElementById('qp-reopen-chip');
    if (chip) chip.classList.add('show');
  }

  function hideReopenChip() {
    const chip = document.getElementById('qp-reopen-chip');
    if (chip) chip.classList.remove('show');
  }

  function reopen() {
    currentStep = 0;
    answers.length = 0;
    hideReopenChip();
    const overlay = document.getElementById('quiz-popup-overlay');
    if (overlay) {
      overlay.style.display = 'flex';
      overlay.style.opacity = '1';
    }
    renderStep();
  }

  function openAI() {
    dismiss();
    setTimeout(() => {
      if (typeof window.togglePenthiaWidget === 'function') {
        const widget = document.getElementById('p-widget');
        if (!widget || !widget.classList.contains('open')) {
          window.togglePenthiaWidget();
        }
        // Hand off the quiz answers as context to the AI chat
        if (typeof window.sendPenthiaMessage === 'function' && answers.length === STEPS.length) {
          const summary = `I just answered a quick set of questions on your homepage:
1. Use case: ${answers[0]}
2. Google Workspace needed: ${answers[1]}
3. Priority: ${answers[2]}
4. Camera/mic needed: ${answers[3]}

Based on this, which Penthia board would you recommend, and why?`;
          setTimeout(() => window.sendPenthiaMessage(summary), 400);
        }
      }
    }, 300);
  }

  function goToStore() {
    dismiss();
    setTimeout(() => { window.location.href = 'store.html'; }, 200);
  }

  function init() {
    let alreadySeen = false;
    try { alreadySeen = sessionStorage.getItem(SEEN_KEY) === '1'; } catch (_) {}

    if (alreadySeen) {
      showReopenChip();
      return;
    }

    // Auto-pop on first visit — gets attention without requiring a click,
    // but always paired with a visible skip option.
    setTimeout(() => {
      renderStep();
    }, 900);
  }

  window.QuizPopup = { dismiss, back, reopen, openAI, goToStore };

  document.addEventListener('DOMContentLoaded', init);
})();

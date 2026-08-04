/* ============================================================
   Penthia Solutions — penthia-quiz-popup.js
   First-visit guided quiz popup (Chess.com / Grammarly style).
   Auto-opens once per session, always skippable, always
   re-openable from a small floating chip.

   IMPORTANT: visibility is controlled ONLY by toggling the
   "qp-visible" class on #quiz-popup-overlay. The overlay is
   display:none by default in CSS. This file must never rely
   on inline styles for show/hide, which is what caused the
   stuck-overlay bug in the previous version.
   ============================================================ */

(function () {
  const SEEN_KEY = 'penthia_quiz_popup_seen';
  // Same-origin. Model, system prompt, and limits are server-side.
  const PROXY_URL = '/api/chat';

  const STEPS = [
    {
      eyebrow: "Let's find your board",
      question: "What will this display be used for?",
      options: ["K-12 classroom", "Higher ed / training room", "Business or conference room", "Personal or home use"]
    },
    {
      eyebrow: "Step 2 of 5",
      question: "Roughly what room size are you outfitting?",
      options: ["Small room (under 20 people)", "Standard classroom (20–35)", "Large room or auditorium (35+)", "Not sure yet"]
    },
    {
      eyebrow: "Step 3 of 5",
      question: "Do you need Google Workspace support?",
      options: ["Yes, it's essential", "Nice to have", "No, we use Microsoft", "Not sure yet"]
    },
    {
      eyebrow: "Step 4 of 5",
      question: "What matters most to you?",
      options: ["Best performance available", "Best value for budget", "External-computer display, no built-in Android", "Built-in Windows desktop"]
    },
    {
      eyebrow: "Step 5 of 5",
      question: "Will you need a camera and microphone for video calls or hybrid learning?",
      options: ["Yes, definitely", "Maybe later", "No"]
    }
  ];

  let currentStep = 0;
  const answers = [];
  let extraNote = '';
  let extraOpen = false;

  // Follow-up question state — used only when the AI verdict is uncertain
  let followUpActive = false;
  let followUpQuestion = '';

  function renderProgress(total, done) {
    let dots = '';
    for (let i = 0; i < total; i++) {
      dots += `<div class="qp-progress-dot ${i < done ? 'done' : ''}"></div>`;
    }
    return `<div class="qp-progress">${dots}</div>`;
  }

  function extraFieldHtml() {
    return `
      <button type="button" class="qp-extra-toggle ${extraOpen ? 'open' : ''}" onclick="QuizPopup.toggleExtra()">
        <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path d="M9 18l6-6-6-6"/></svg>
        Anything else we should know? (optional)
      </button>
      <div class="qp-extra-wrap ${extraOpen ? 'open' : ''}">
        <textarea class="qp-extra-input" id="qp-extra-input" rows="2" placeholder="e.g. wall-mounted, need Spanish keyboard support, budget under $3,000…">${extraNote}</textarea>
      </div>
    `;
  }

  function captureExtraNote() {
    const field = document.getElementById('qp-extra-input');
    if (field) extraNote = field.value.trim();
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
      ${renderProgress(STEPS.length, currentStep)}
      <div class="qp-eyebrow"><span class="qp-dot-pulse"></span>${step.eyebrow}</div>
      <div class="qp-question">${step.question}</div>
      <div class="qp-options">${optionsHtml}</div>
      ${extraFieldHtml()}
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
    captureExtraNote();
    answers[currentStep] = STEPS[currentStep].options[idx];
    currentStep++;
    if (currentStep < STEPS.length) {
      renderStep();
    } else {
      runVerdict();
    }
  }

  function back() {
    captureExtraNote();
    if (currentStep === 0) return;
    currentStep--;
    renderStep();
  }

  function toggleExtra() {
    extraOpen = !extraOpen;
    // Re-render in place without losing current step
    if (followUpActive) {
      renderFollowUp();
    } else {
      renderStep();
    }
    if (extraOpen) {
      setTimeout(() => {
        const field = document.getElementById('qp-extra-input');
        if (field) field.focus();
      }, 50);
    }
  }

  function renderThinking(label) {
    const popup = document.getElementById('quiz-popup');
    if (!popup) return;
    popup.innerHTML = `
      <button class="qp-close" aria-label="Close" onclick="QuizPopup.dismiss()">✕</button>
      ${renderProgress(STEPS.length, STEPS.length)}
      <div class="qp-thinking">
        <div class="qp-thinking-dots"><span></span><span></span><span></span></div>
        <div class="qp-thinking-text">${label}</div>
      </div>
    `;
  }

  function renderFollowUp() {
    const popup = document.getElementById('quiz-popup');
    if (!popup) return;
    popup.innerHTML = `
      <button class="qp-close" aria-label="Close" onclick="QuizPopup.dismiss()">✕</button>
      ${renderProgress(STEPS.length, STEPS.length)}
      <div class="qp-eyebrow"><span class="qp-dot-pulse"></span>One more thing</div>
      <div class="qp-question">${followUpQuestion}</div>
      <div class="qp-options">
        <button class="qp-option" id="qp-followup-input-trigger">Type my answer below ↓</button>
      </div>
      <div class="qp-extra-wrap open" style="max-height:80px;">
        <textarea class="qp-extra-input" id="qp-followup-input" rows="2" placeholder="Type your answer…" autofocus></textarea>
      </div>
      <div class="qp-footer-row">
        <button class="qp-back-btn" onclick="QuizPopup.submitFollowUp()">Continue ›</button>
        <button class="qp-skip-btn" onclick="QuizPopup.skipFollowUp()">Skip this</button>
      </div>
    `;
    const trigger = document.getElementById('qp-followup-input-trigger');
    const input = document.getElementById('qp-followup-input');
    if (trigger && input) {
      trigger.addEventListener('click', () => input.focus());
    }
    setTimeout(() => { if (input) input.focus(); }, 50);
  }

  function submitFollowUp() {
    const input = document.getElementById('qp-followup-input');
    const value = input ? input.value.trim() : '';
    if (value) {
      extraNote = extraNote ? `${extraNote}\n${value}` : value;
    }
    followUpActive = false;
    runVerdict(true);
  }

  function skipFollowUp() {
    followUpActive = false;
    runVerdict(true);
  }

  function getProductCatalog() {
    // Reuses the exact same product/image map as the chat widget so the
    // homepage quiz and in-chat recommendations always agree.
    if (window.PENTHIA_RECOMMENDATION_PRODUCTS) return window.PENTHIA_RECOMMENDATION_PRODUCTS;
    return {
      elite: { label: 'Vertex Elite', image: 'elite.png', url: 'store.html?product=pro-max' },
      pro: { label: 'Vertex Pro', image: 'pro2.png', url: 'store.html?product=pro' },
      standard: { label: 'Vertex Standard', image: 'vertexstandard1.png', url: 'store.html?product=iboard' },
      qs3: { label: 'QS3 Series', image: 'qs31.png', url: 'store.html?product=qs3' }
    };
  }

  function lookupProduct(modelName) {
    if (window.getRecommendationProduct) return window.getRecommendationProduct(modelName, '');
    const catalog = getProductCatalog();
    const text = (modelName || '').toLowerCase();
    if (text.includes('qs3')) return catalog.qs3;
    if (text.includes('standard')) return catalog.standard;
    if (text.includes('elite')) return catalog.elite;
    return catalog.pro;
  }

  function localFallbackRecommendation() {
    const text = (answers.join(' ') + ' ' + extraNote).toLowerCase();
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

  function buildVerdictPrompt() {
    return `A visitor on the Penthia Solutions homepage answered a short guided quiz to find the right interactive smartboard. Respond with ONLY a JSON object (no markdown, no code fences, no extra text) in exactly this shape:

{"confident": true, "model": "Vertex Pro", "reason": "One warm, specific sentence (max 28 words) explaining why this model fits them.", "followUpQuestion": ""}

Set "confident" to false ONLY if the answers genuinely conflict or leave the choice ambiguous (e.g. they want both flagship performance AND the cheapest option with no clear priority). If not confident, leave "model" as your best guess anyway, and put ONE short, specific clarifying question in "followUpQuestion" (max 18 words) that would resolve the ambiguity. If confident, leave "followUpQuestion" as an empty string.

The model must be exactly one of: "Vertex Elite", "Vertex Pro", "Vertex Standard", "QS3 Series".

Visitor's answers:
1. Use case: ${answers[0] || 'not answered'}
2. Room size: ${answers[1] || 'not answered'}
3. Google Workspace needed: ${answers[2] || 'not answered'}
4. Priority: ${answers[3] || 'not answered'}
5. Camera/mic needed: ${answers[4] || 'not answered'}
${extraNote ? `Additional notes from visitor: ${extraNote}` : ''}`;
  }

  function parseVerdictJson(raw) {
    if (!raw) return null;
    let cleaned = raw.trim().replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```\s*$/, '');
    try {
      return JSON.parse(cleaned);
    } catch (_) {
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) {
        try { return JSON.parse(match[0]); } catch (_) { return null; }
      }
      return null;
    }
  }

  async function runVerdict(skipFollowUpCheck) {
    captureExtraNote();
    renderThinking(skipFollowUpCheck ? 'Finding your match…' : 'Matching you to a board…');

    let verdict = null;
    try {
      const response = await fetch(PROXY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: buildVerdictPrompt() }]
        })
      });
      const data = await response.json();
      const raw = data?.content?.[0]?.text || '';
      verdict = parseVerdictJson(raw);
    } catch (_) {
      verdict = null;
    }

    if (!verdict) {
      const fallback = localFallbackRecommendation();
      renderResult(fallback.name, fallback.reason);
      return;
    }

    if (!verdict.confident && !skipFollowUpCheck && verdict.followUpQuestion) {
      followUpActive = true;
      followUpQuestion = verdict.followUpQuestion;
      renderFollowUp();
      return;
    }

    renderResult(verdict.model || localFallbackRecommendation().name, verdict.reason || localFallbackRecommendation().reason);
  }

  function renderResult(modelName, reason) {
    const popup = document.getElementById('quiz-popup');
    if (!popup) return;
    const product = lookupProduct(modelName);

    popup.innerHTML = `
      <button class="qp-close" aria-label="Close" onclick="QuizPopup.dismiss()">✕</button>
      <div class="qp-result-media"><img src="${product.image}" alt="${product.label}" loading="lazy" /></div>
      <div class="qp-result-title">We'd suggest the <span class="accent">${product.label}</span>.</div>
      <p class="qp-result-desc">${reason} Want to keep talking it through? Penthia AI can answer follow-up questions or pull up full specs right now.</p>
      <div class="qp-result-actions">
        <button class="qp-result-primary" onclick="QuizPopup.openAI('${product.label.replace(/'/g, "\\'")}', '${reason.replace(/'/g, "\\'")}')">Continue with Penthia AI →</button>
        <a class="qp-result-primary" style="background:transparent;border:1px solid var(--gold-border);color:var(--gold-2);text-decoration:none;" href="${product.url}">View ${product.label} in Store</a>
        <button class="qp-result-secondary" onclick="QuizPopup.goToStore()">Just show me the full lineup</button>
      </div>
    `;
  }

  function dismiss() {
    const overlay = document.getElementById('quiz-popup-overlay');
    if (overlay) overlay.classList.remove('qp-visible');
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
    extraNote = '';
    extraOpen = false;
    followUpActive = false;
    hideReopenChip();
    const overlay = document.getElementById('quiz-popup-overlay');
    if (overlay) overlay.classList.add('qp-visible');
    renderStep();
  }

  function openAI(modelName, reason) {
    dismiss();
    setTimeout(() => {
      if (typeof window.togglePenthiaWidget === 'function') {
        const widget = document.getElementById('p-widget');
        if (!widget || !widget.classList.contains('open')) {
          window.togglePenthiaWidget();
        }
        if (typeof window.sendPenthiaMessage === 'function') {
          const summary = `I just answered a quick set of questions on your homepage and was matched to the ${modelName || 'Vertex Pro'}. ${reason || ''}

Can you tell me more about this board and answer any follow-up questions I might have?`;
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

    // Entry-point only — the chip and the in-page CTA call reopen().
    showReopenChip();
  }

  window.QuizPopup = {
    dismiss, back, reopen, openAI, goToStore,
    toggleExtra, submitFollowUp, skipFollowUp
  };

  document.addEventListener('DOMContentLoaded', init);
})();

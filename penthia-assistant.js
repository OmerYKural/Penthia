/* ============================================================
   Penthia AI Assistant — penthia-assistant.js
   Features: persistent chat, highlight-to-ask, quiz recommender
   ============================================================ */

(function () {

  /* ── Inject HTML into page ── */
  document.body.insertAdjacentHTML('beforeend', `
    <button id="p-launcher" aria-label="Open Penthia AI Assistant">
      <svg class="p-icon-chat" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
      </svg>
      <svg class="p-icon-close" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path d="M18 6L6 18M6 6l12 12"/>
      </svg>
    </button>

    <div id="p-widget" role="dialog" aria-label="Penthia AI Assistant">
      <div class="p-header">
        <div class="p-avatar">
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path d="M12 2a7 7 0 017 7c0 2.5-1.3 4.7-3.3 6L16 21H8l.3-6A7 7 0 0112 2z"/>
          </svg>
        </div>
        <div class="p-header-text">
          <div class="p-name">Penthia Assistant</div>
          <div class="p-status"><span class="p-dot"></span>Online · Powered by Claude</div>
        </div>
        <button class="p-mode-btn" id="pModeBtn" onclick="pSwitchMode()">Find My Board</button>
      </div>
      <div class="p-messages" id="pMessages"></div>
      <div class="p-input-bar">
        <textarea class="p-input" id="pUserInput" placeholder="Ask about any Penthia product…" rows="1"></textarea>
        <button class="p-send" id="pSendBtn" onclick="pSendMessage()">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2">
            <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"/>
          </svg>
        </button>
      </div>
      <div class="p-footer">Penthia AI · Answers are for guidance only · Confirm specs before purchase</div>
    </div>

    <button id="p-highlight-btn">Ask Penthia AI ✦</button>
  `);

  /* ── Inject CSS ── */
  const cssLink = document.createElement('link');
  cssLink.rel = 'stylesheet';
  cssLink.href = 'penthia-widget.css';
  document.head.appendChild(cssLink);

  /* ── Config ── */
  const SUPABASE_URL = 'https://qwbtgguduzygwtrmkjul.supabase.co';
  const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/claude-proxy`;
  const STORAGE_KEY = 'penthia_chat_history';
  const STORAGE_OPEN = 'penthia_widget_open';

  const SYSTEM_PROMPT = `You are the Penthia Solutions AI Assistant, embedded on the Penthia Solutions website. You help visitors understand Penthia's interactive smartboard lineup and choose the right product.

PRODUCT KNOWLEDGE:
- Penthia Vertex Elite: Flagship. RK3588 platform. Android 15. 16GB RAM / 256GB storage. 50-point touch. 4K UHD. 20W×2 + 20W subwoofer. Google Play Store + Google account on supported configs. Optional 48MP AI camera/mic. Optional Windows OPS. Sizes: 65", 75", 86", 98", 110". Standard 350 nits; 65/75/86" may upgrade to 400-450 nits.
- Penthia Vertex Pro: Recommended for most schools. 311D2 platform. Android 14. 8GB/128GB standard, optional 16GB/256GB. 50-point touch. 4K UHD. Google Play Store + Google account on supported configs. Optional 48MP camera/mic. Optional Windows OPS. Sizes: 65", 75", 86", 98", 110".
- Penthia Vertex Standard: Budget-friendly. T985 platform. Android 14. 8GB/128GB. 50-point touch. 4K UHD. USB-C. Google Play may be configurable. Limited Google support compared to Pro and Elite. Sizes: 65", 75", 86", 98", 110".
- Penthia QS3 Series: No built-in Android. For customers with existing Windows/Mac/Linux computers. 20-point touch. 4K. 15W×2 speakers. Works with external OPS devices.

KEY FACTS:
- All pricing is quote-based (no public pricing)
- Google apps supported on Pro and Elite configurations
- Windows OPS is always optional, never required
- Penthia is based in Ohio, USA
- For quotes or demos, visitors should use the contact form

GOOGLE EDLA:
- The hardware platform is capable of EDLA certification and is manufactured by a company that produces EDLA-certified models. However, EDLA certification is not currently issued under the Penthia brand name.
- In practice, customers still have full access to Google Workspace through the board — Chrome, Drive, Docs, Sheets, Slides, Meet, Classroom, and other Google tools work via Google accounts and connected devices.
- For schools that require official EDLA certification as a procurement requirement, Penthia is currently evaluating the certification process for future Penthia-branded models.
- Vertex Elite and Vertex Pro have the strongest Google support. Vertex Standard has limited Google support by comparison.

BEHAVIOR:
- Be concise, warm, and direct. This is a chat widget, not an essay.
- Keep replies to 2-4 sentences unless more detail is genuinely needed.
- Use bullet points and bold for clarity when listing specs or comparisons.
- When recommending a product, say which and briefly why.
- If asked for pricing, explain it is quote-based and suggest contacting Penthia.
- Never make up specs or certifications.
- If asked something off-topic, give a brief friendly answer then redirect to Penthia products.`;

  /* ── State ── */
  let pMode = 'chat';
  let pHistory = [];
  let pQuizAnswers = {};
  let pQuizStep = 0;
  let pLoading = false;
  let pInitialized = false;

  const pQuizSteps = [
    { key: 'environment', q: 'What best describes where the display will be used?', opts: ['K-12 classroom', 'University / higher ed', 'Corporate / training room', 'Other'] },
    { key: 'google', q: 'Does your organization use Google Workspace (Gmail, Google Classroom, Drive)?', opts: ['Yes, heavily', 'Somewhat / mixed', 'No — we use Microsoft or other', 'Not sure'] },
    { key: 'windows', q: 'Do you need to run Windows desktop software on the board?', opts: ['Yes, definitely', 'Maybe, as an option', 'No, Android is fine', 'Not sure'] },
    { key: 'budget', q: 'What best describes the budget priority?', opts: ['Best performance available', 'Good balance of value and features', 'Most cost-effective option', 'Flexible / unsure'] },
    { key: 'camera', q: 'Do you need a built-in camera or microphone for video calls or recording?', opts: ['Yes', 'No', 'Nice to have'] }
  ];

  /* ── DOM refs ── */
  const msgsEl = () => document.getElementById('pMessages');
  const inputEl = () => document.getElementById('pUserInput');
  const sendBtn = () => document.getElementById('pSendBtn');

  /* ── Helpers ── */
  function pNow() { return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
  function pScroll() { setTimeout(() => { const m = msgsEl(); if (m) m.scrollTop = m.scrollHeight; }, 50); }

  function pRenderMarkdown(text) {
    return text
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/^[-•]\s+(.+)$/gm, '<li>$1</li>')
      .replace(/(<li>[\s\S]*?<\/li>)/g, '<ul>$1</ul>')
      .replace(/\n{2,}/g, '</p><p>')
      .replace(/\n/g, '<br>')
      .replace(/^(.+)$/, '<p>$1</p>');
  }

  /* ── Persistence: save & load chat ── */
  function pSaveHistory() {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(pHistory));
    } catch(e) {}
  }

  function pLoadHistory() {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch(e) { return null; }
  }

  function pSaveOpenState(isOpen) {
    try { sessionStorage.setItem(STORAGE_OPEN, isOpen ? '1' : '0'); } catch(e) {}
  }

  function pLoadOpenState() {
    try { return sessionStorage.getItem(STORAGE_OPEN) === '1'; } catch(e) { return false; }
  }

  /* ── Render a bubble from saved history (no side effects) ── */
  function pRenderBubble(role, text) {
    const wrap = document.createElement('div');
    wrap.className = `p-bubble ${role === 'user' ? 'user' : 'ai'}`;
    const t = document.createElement('div');
    t.className = 'p-bubble-text';
    if (role === 'assistant') {
      t.innerHTML = pRenderMarkdown(text);
    } else {
      t.textContent = text;
    }
    const time = document.createElement('div');
    time.className = 'p-bubble-time';
    time.textContent = pNow();
    wrap.appendChild(t); wrap.appendChild(time);
    msgsEl().appendChild(wrap);
  }

  /* ── Add bubble + save ── */
  function pAddBubble(role, text) {
    pRenderBubble(role, text);
    pScroll();
  }

  function pAddTyping() {
    const wrap = document.createElement('div');
    wrap.className = 'p-bubble ai'; wrap.id = 'p-typing';
    const t = document.createElement('div');
    t.className = 'p-typing';
    t.innerHTML = '<span></span><span></span><span></span>';
    wrap.appendChild(t); msgsEl().appendChild(wrap); pScroll();
  }

  function pRemoveTyping() { const el = document.getElementById('p-typing'); if (el) el.remove(); }

  function pAddQuickReplies(opts, onSelect) {
    const chips = document.createElement('div');
    chips.className = 'p-quick-replies';
    opts.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'p-qr-chip'; btn.textContent = opt;
      btn.onclick = () => { chips.remove(); onSelect(opt); };
      chips.appendChild(btn);
    });
    msgsEl().appendChild(chips); pScroll();
  }

  function pAddQuizCard(step, onAnswer) {
    const card = document.createElement('div');
    card.className = 'p-quiz-card';
    const q = document.createElement('div');
    q.className = 'p-quiz-q'; q.textContent = step.q;
    const opts = document.createElement('div');
    opts.className = 'p-quiz-options';
    step.opts.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'p-quiz-opt'; btn.textContent = opt;
      btn.onclick = () => {
        card.querySelectorAll('.p-quiz-opt').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        setTimeout(() => { card.remove(); onAnswer(opt); }, 300);
      };
      opts.appendChild(btn);
    });
    card.appendChild(q); card.appendChild(opts);
    msgsEl().appendChild(card); pScroll();
  }

  function pAddRecCard(product, reason) {
    const card = document.createElement('div');
    card.className = 'p-rec-card';
    card.innerHTML = `
      <div class="p-rec-label">Recommended for you</div>
      <div class="p-rec-title">${product}</div>
      <div class="p-rec-desc">${reason}</div>
      <div class="p-rec-actions">
        <a class="p-rec-btn-primary" href="store.html">View in Store →</a>
        <button class="p-rec-btn-ghost" onclick="document.getElementById('pUserInput').focus()">Ask a question</button>
      </div>`;
    msgsEl().appendChild(card); pScroll();
  }

  /* ── Claude API ── */
  async function pAskClaude(userMessage) {
    pHistory.push({ role: 'user', content: userMessage });
    pSaveHistory();
    pAddTyping();
    sendBtn().disabled = true;
    pLoading = true;

    try {
      const res = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: pHistory, system: SYSTEM_PROMPT })
      });
      const data = await res.json();
      const reply = data.content?.[0]?.text || "I had trouble responding. Please try again or contact Penthia directly.";
      pHistory.push({ role: 'assistant', content: reply });
      pSaveHistory();
      pRemoveTyping();
      pAddBubble('assistant', reply);
    } catch (err) {
      pRemoveTyping();
      pAddBubble('assistant', "I'm having connection trouble. Please try again, or reach out to Penthia using the contact form.");
    }

    sendBtn().disabled = false;
    pLoading = false;
  }

  /* ── Quiz ── */
  function pGetRecommendation() {
    const { google, windows, budget, camera } = pQuizAnswers;
    const wantsWindows = windows === 'Yes, definitely';
    const wantsGoogle = google === 'Yes, heavily' || google === 'Somewhat / mixed';
    const wantsBest = budget === 'Best performance available';
    const wantsBudget = budget === 'Most cost-effective option';
    const wantsCamera = camera === 'Yes' || camera === 'Nice to have';

    if (wantsBudget && !wantsWindows) return {
      product: 'Penthia Vertex Standard',
      reason: "It covers the essentials — Android 14, 4K, 50-point touch — at the most accessible price point. A strong choice when budget is the top priority."
    };
    if (!wantsGoogle && !wantsWindows && !wantsBest) return {
      product: 'Penthia QS3 Series',
      reason: "Since you already have a Windows or Mac computer, the QS3 pairs with it to give you 4K touch and annotation without paying for a built-in Android system you wouldn't use."
    };
    if (wantsBest || (wantsGoogle && wantsCamera)) return {
      product: 'Penthia Vertex Elite',
      reason: `The flagship model — Android 15, RK3588, 16GB RAM — gives you the strongest performance in the lineup${wantsCamera ? ', plus support for the optional 48MP AI camera and microphone' : ''}. Built for schools that want the best.`
    };
    return {
      product: 'Penthia Vertex Pro',
      reason: `The recommended model for most schools. Android 14 with full Google Workspace support${wantsCamera ? ', optional camera/mic' : ''}${wantsWindows ? ', and optional Windows OPS' : ''} — strong balance of features and value.`
    };
  }

  function pNextQuizStep() {
    if (pQuizStep >= pQuizSteps.length) {
      const { product, reason } = pGetRecommendation();
      pAddBubble('assistant', "Based on your answers, here's my recommendation:");
      pAddRecCard(product, reason);
      pAddBubble('assistant', 'Feel free to ask me anything else about this model or any other Penthia product.');
      document.getElementById('pModeBtn').textContent = 'Find My Board';
      pMode = 'chat';
      return;
    }
    const step = pQuizSteps[pQuizStep];
    if (pQuizStep === 0) pAddBubble('assistant', `Let's find your ideal board. I'll ask ${pQuizSteps.length} quick questions. (${pQuizStep + 1}/${pQuizSteps.length})`);
    pAddQuizCard(step, (answer) => {
      pQuizAnswers[step.key] = answer;
      pAddBubble('user', answer);
      pQuizStep++;
      setTimeout(pNextQuizStep, 400);
    });
  }

  /* ── Mode switch ── */
  window.pSwitchMode = function () {
    const btn = document.getElementById('pModeBtn');
    if (pMode === 'chat') {
      pMode = 'quiz'; btn.textContent = 'Free Chat';
      pQuizStep = 0; pQuizAnswers = {};
      pNextQuizStep();
    } else {
      pMode = 'chat'; btn.textContent = 'Find My Board';
      pAddBubble('assistant', 'Switched to free chat. What would you like to know about Penthia products?');
    }
  };

  /* ── Send message ── */
  window.pSendMessage = function () {
    const text = inputEl().value.trim();
    if (!text || pLoading) return;
    inputEl().value = ''; inputEl().style.height = 'auto';
    pAddBubble('user', text);
    pAskClaude(text);
  };

  /* ── Launcher toggle ── */
  document.getElementById('p-launcher').addEventListener('click', function () {
    this.classList.toggle('open');
    const widget = document.getElementById('p-widget');
    widget.classList.toggle('open');
    pSaveOpenState(widget.classList.contains('open'));
  });

  /* ── Input events ── */
  document.getElementById('pUserInput').addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); pSendMessage(); }
  });
  document.getElementById('pUserInput').addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 100) + 'px';
  });

  /* ══════════════════════════════════════
     HIGHLIGHT-TO-ASK FEATURE
  ══════════════════════════════════════ */
  const highlightBtn = document.getElementById('p-highlight-btn');
  let lastHighlightedText = '';

  document.addEventListener('mouseup', function (e) {
    if (document.getElementById('p-widget').contains(e.target)) return;

    setTimeout(() => {
      const selection = window.getSelection();
      const text = selection ? selection.toString().trim() : '';

      if (text.length > 3 && text.length < 500) {
        lastHighlightedText = text;
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        highlightBtn.style.display = 'block';
        highlightBtn.style.left = (rect.left + rect.width / 2) + 'px';
        highlightBtn.style.top = (window.scrollY + rect.top - 44) + 'px';
      } else {
        highlightBtn.style.display = 'none';
        lastHighlightedText = '';
      }
    }, 10);
  });

  highlightBtn.addEventListener('click', function () {
    if (!lastHighlightedText) return;
    highlightBtn.style.display = 'none';

    // Open widget
    const launcher = document.getElementById('p-launcher');
    const widget = document.getElementById('p-widget');
    if (!widget.classList.contains('open')) {
      launcher.classList.add('open');
      widget.classList.add('open');
      pSaveOpenState(true);
    }

    const question = `I'm reading this on your site: "${lastHighlightedText}" — can you tell me more about this?`;
    pAddBubble('user', question);
    pAskClaude(question);
    lastHighlightedText = '';
    window.getSelection().removeAllRanges();
  });

  document.addEventListener('mousedown', function (e) {
    if (e.target !== highlightBtn) {
      highlightBtn.style.display = 'none';
    }
  });

  /* ══════════════════════════════════════
     INIT — restore or greet
  ══════════════════════════════════════ */
  function pInit() {
    if (pInitialized) return;
    pInitialized = true;

    const saved = pLoadHistory();

    if (saved && saved.length > 0) {
      // Restore previous conversation
      pHistory = saved;
      saved.forEach(msg => pRenderBubble(msg.role, msg.content));
      pScroll();
    } else {
      // Fresh greeting
      pAddBubble('assistant', "Hi! I'm Penthia's AI assistant. I can answer questions about any Vertex model, or use \"Find My Board\" to get a personalized recommendation.");
      pAddQuickReplies(
        ["What's the difference between Pro and Elite?", "Do your boards support Google?", "Does it need Windows to work?"],
        (q) => { pAddBubble('user', q); pAskClaude(q); }
      );
    }

    // Restore open/closed state
    if (pLoadOpenState()) {
      document.getElementById('p-launcher').classList.add('open');
      document.getElementById('p-widget').classList.add('open');
    }
  }

  pInit();

})();

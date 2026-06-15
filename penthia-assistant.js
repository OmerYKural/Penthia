/* ============================================================
   Penthia Solutions — penthia-assistant.js
   AI chat widget powered by Supabase Edge Function
   ============================================================ */

const SUPABASE_URL = 'https://qwbtgguduzygwtrmkjul.supabase.co/functions/v1/claude-proxy';

const SYSTEM_PROMPT = `You are Penthia AI, the official assistant for Penthia Solutions — a company that sells interactive smartboards and classroom display systems under the Vertex product line.

PRODUCT KNOWLEDGE:

Vertex Elite (Flagship):
- Platform: RK3588
- Android 15
- 16GB RAM / 256GB storage
- 50-point touch (20-point on 110" Android)
- 4K UHD (3840×2160), 350 nits standard
- 7H tempered anti-glare glass
- 20W × 2 + 20W subwoofer
- Full-function USB-C with 65W charging
- Google Play Store, Google account login, Google Workspace apps on supported configurations
- Optional 48MP camera or 48MP AI camera + 8-mic array (speaker tracking, voice tracking, gesture control)
- Optional Windows OPS (Intel i5 or i7, Windows 11)
- Sizes: 65", 75", 86", 98", 110"
- 65"/75"/86" may be configurable to 400-450 nits at additional cost
- 98" and 110" are fixed at standard brightness

Vertex Pro (Recommended for most schools):
- Platform: 311D2 (A311D2), Android 14
- 8GB RAM / 128GB storage standard; optional 16GB / 256GB upgrade
- 50-point touch (20-point on 110" Android)
- 4K UHD, 350 nits standard
- 7H tempered anti-glare glass
- 20W × 2 + 20W subwoofer
- Full-function USB-C with 65W charging
- Google Play Store, Google account login, Google Workspace apps on supported configurations
- Optional 48MP camera or 48MP AI camera + 8-mic array
- Optional Windows OPS
- Sizes: 65", 75", 86", 98", 110"
- Same brightness upgrade options as Elite

Vertex Standard (Essential classroom):
- Platform: T985, Android 14
- 8GB RAM / 128GB storage
- 50-point touch
- 4K UHD, 350 nits standard
- 7H tempered anti-glare glass
- USB-C connectivity
- Google Play Store may be configurable on supported setups
- Sizes: 65", 75", 86", 98", 110"
- Contact Penthia for camera and speaker configuration details

QS3 Series (No built-in Android):
- No built-in Android system
- 20-point touch
- 4K UHD, anti-glare glass
- 15W × 2 speakers; optional YL7W speaker upgrade
- Works with external Windows, Mac, Linux, or OPS devices
- USB-C / HDMI / touch USB connectivity
- xBoard annotation software on connected computer
- Contact for size options

KEY FACTS:
- All pricing is quote-based. Always direct customers to the contact form for pricing.
- Google apps (Classroom, Drive, Docs, Sheets, Slides, Gmail, Chrome, Meet) work on Vertex Pro and Elite on supported configurations.
- EDLA: The hardware platform is manufactured by an EDLA-certified company and is EDLA-capable, but certification is NOT currently issued under the Penthia brand name. Google Workspace tools work via Google accounts. Do not claim official EDLA certification.
- Windows OPS is always optional, never required for everyday use.
- Touch technology: Infrared (IR), ~6ms response time
- Panel lifespan: ~50,000 hours
- Warranty: 1 year panel, 3 year components
- MDM: iMagic MDM supported (remote lock, reboot, install/enable/disable apps — does NOT support remote factory reset, Wi-Fi profile push, or app uninstall)
- Wireless presentation supported. Screen sharing supported.
- WPA2/WPA3 Enterprise, 802.1X authentication, proxy/static IP/DNS configuration all supported.
- USB-C supports video, touch, charging, and one-cable connection.
- Chromebook, MacBook, Windows laptop, and Linux devices can all connect.
- Zoom, Teams, and Google Meet all supported with appropriate camera/mic configuration.
- Whiteboard and annotation software built in. Annotations can be saved and exported.
- Shipping nationwide. Installation arrangements available, contact Penthia for details.
- Extended warranty available.

WEBSITE CONTEXT:
- When a user asks about highlighted website text, the message may include hidden page context, nearby section text, and a short website text map. Use that context as your source.
- Never say you do not have access to the website when the user message includes website context. Explain the highlighted text using the provided page, section, and product information.
- If the highlighted phrase has a typo or is shortened, infer the intended website phrase from the nearby context and say what it likely means.

BEHAVIOR:
- Be concise, warm, and helpful. 2-4 sentences for most answers.
- Use bullet points and bold for spec comparisons.
- Never invent specs or make up pricing.
- For pricing questions, always say it's quote-based and direct to the contact form at penthiasolutions.com/contact.html
- For Google certification / EDLA questions, be transparent: Google apps work, but official Penthia-brand EDLA certification is not yet issued.
- Do not mention being Islamic-school focused, Ohio-based, or any specific geographic location.
- You are Penthia AI — do not refer to yourself as Claude or any other AI brand.`;

/* ── QUIZ QUESTIONS ── */
const QUIZ_QUESTIONS = [
  {
    q: "What will this display be used for?",
    opts: ["K-12 classroom", "Higher education / training room", "Business / conference room", "Personal or home use"]
  },
  {
    q: "Do you need Google Workspace support (Classroom, Drive, Docs, Meet)?",
    opts: ["Yes, it's essential", "Nice to have but not required", "No, we use Microsoft / other", "Not sure yet"]
  },
  {
    q: "What's your priority?",
    opts: ["Best performance available", "Best value for budget", "External computer display (no built-in Android)", "Windows desktop built in"]
  },
  {
    q: "Will you use a camera and microphone for video conferencing or hybrid learning?",
    opts: ["Yes, definitely", "Maybe in the future", "No"]
  },
  {
    q: "What size are you considering?",
    opts: ["65\" or 75\" (smaller rooms)", "86\" (most popular for classrooms)", "98\" or 110\" (large spaces)", "Not sure yet"]
  }
];

/* ── STATE ── */
let widgetOpen = false;
let chatHistory = [];
let isLoading = false;
let quizMode = false;
let quizStep = 0;
let quizAnswers = [];
const SESSION_KEY = 'penthia_chat_v2';
const OPEN_KEY = 'penthia_widget_open_v2';

/* ── RESTORE SESSION ── */
try {
  const saved = sessionStorage.getItem(SESSION_KEY);
  if (saved) {
    const parsed = JSON.parse(saved);
    chatHistory = parsed.history || [];
  }
} catch(_) {}

/* ── INJECT HTML ── */
function injectWidget() {
  const css = `
    #p-launcher {
      position: fixed; bottom: 28px; right: 28px; z-index: 7000;
      width: 56px; height: 56px; border-radius: 50%;
      background: #c9a84c; border: none; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 8px 32px rgba(201,168,76,0.4);
      transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s;
      font-size: 1.4rem; color: #080a0f;
    }
    #p-launcher:hover { transform: scale(1.1); box-shadow: 0 12px 40px rgba(201,168,76,0.55); }
    #p-launcher .p-lnch-icon { transition: transform 0.3s, opacity 0.2s; position:absolute; }
    #p-launcher.open .p-lnch-icon-open { opacity:0; transform:rotate(90deg) scale(0.5); }
    #p-launcher.open .p-lnch-icon-close { opacity:1; transform:rotate(0deg) scale(1); }
    #p-launcher .p-lnch-icon-close { opacity:0; transform:rotate(-90deg) scale(0.5); }
    #p-launcher .p-lnch-badge {
      position:absolute; top:-4px; right:-4px; width:18px; height:18px;
      background:#e2c27a; border-radius:50%; border:2px solid #080a0f;
      display:flex; align-items:center; justify-content:center;
      font-size:0.55rem; font-weight:700; color:#080a0f;
    }
    #p-widget {
      position:fixed; bottom:96px; right:28px; z-index:7000;
      width:380px; max-height:580px; border-radius:20px;
      background:#0d1018; border:1px solid rgba(255,255,255,0.08);
      box-shadow:0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(201,168,76,0.1);
      display:flex; flex-direction:column; overflow:hidden;
      opacity:0; transform:translateY(16px) scale(0.96); pointer-events:none;
      transition:opacity 0.3s cubic-bezier(0.34,1.56,0.64,1), transform 0.3s cubic-bezier(0.34,1.56,0.64,1);
    }
    #p-widget.open { opacity:1; transform:none; pointer-events:all; }
    #p-header {
      background:#131620; border-bottom:1px solid rgba(255,255,255,0.06);
      padding:16px 18px; display:flex; align-items:center; gap:12px; flex-shrink:0;
    }
    #p-header-icon {
      width:38px; height:38px; border-radius:10px;
      background:rgba(201,168,76,0.15); border:1px solid rgba(201,168,76,0.25);
      display:flex; align-items:center; justify-content:center;
      color:#c9a84c; font-size:1rem; flex-shrink:0;
    }
    #p-header-text { flex:1; }
    #p-header-title { font-size:0.88rem; font-weight:700; color:#f0eeea; font-family:'Inter',sans-serif; }
    #p-header-status { font-size:0.7rem; color:#5a6480; display:flex; align-items:center; gap:5px; margin-top:2px; }
    .p-status-dot { width:6px; height:6px; border-radius:50%; background:#4ade80; animation:pBlink 2s infinite; }
    @keyframes pBlink { 0%,100%{opacity:1} 50%{opacity:0.4} }
    #p-header-close { color:#5a6480; cursor:pointer; padding:4px; border-radius:6px; transition:color 0.2s,background 0.2s; font-size:1rem; line-height:1; }
    #p-header-close:hover { color:#e2c27a; background:rgba(201,168,76,0.1); }
    #p-messages {
      flex:1; overflow-y:auto; padding:16px; display:flex; flex-direction:column; gap:12px;
      scrollbar-width:thin; scrollbar-color:rgba(255,255,255,0.08) transparent;
    }
    .p-msg { display:flex; gap:8px; animation:pMsgIn 0.3s ease; }
    @keyframes pMsgIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
    .p-msg.user { flex-direction:row-reverse; }
    .p-msg-bubble {
      max-width:82%; padding:10px 14px; border-radius:14px;
      font-size:0.83rem; line-height:1.65; font-family:'Inter',sans-serif;
    }
    .p-msg.ai .p-msg-bubble { background:#1a1e2d; color:#9aa3bb; border-radius:4px 14px 14px 14px; }
    .p-msg.user .p-msg-bubble { background:#c9a84c; color:#080a0f; font-weight:500; border-radius:14px 4px 14px 14px; }
    .p-msg-bubble strong { color:#f0eeea; font-weight:700; }
    .p-msg-bubble ul { list-style:none; padding:0; margin:6px 0 0; display:flex; flex-direction:column; gap:3px; }
    .p-msg-bubble li::before { content:'›'; color:#c9a84c; margin-right:6px; font-weight:700; }
    .p-msg-avatar {
      width:28px; height:28px; border-radius:8px; flex-shrink:0; margin-top:2px;
      background:rgba(201,168,76,0.12); border:1px solid rgba(201,168,76,0.2);
      display:flex; align-items:center; justify-content:center;
      color:#c9a84c; font-size:0.7rem;
    }
    .p-typing { display:flex; gap:4px; align-items:center; padding:12px 14px; }
    .p-typing span { width:6px; height:6px; background:#5a6480; border-radius:50%; animation:pDot 1.2s infinite; }
    .p-typing span:nth-child(2) { animation-delay:0.2s; }
    .p-typing span:nth-child(3) { animation-delay:0.4s; }
    @keyframes pDot { 0%,80%,100%{transform:scale(0.7);opacity:0.4} 40%{transform:scale(1);opacity:1} }
    #p-quick-btns { padding:0 14px 10px; display:flex; gap:6px; flex-wrap:wrap; flex-shrink:0; }
    .p-qbtn {
      background:rgba(201,168,76,0.08); border:1px solid rgba(201,168,76,0.2);
      color:#e2c27a; font-size:0.72rem; font-weight:600; padding:6px 12px;
      border-radius:99px; cursor:pointer; transition:all 0.2s;
      font-family:'Inter',sans-serif; white-space:nowrap;
    }
    .p-qbtn:hover { background:rgba(201,168,76,0.18); border-color:rgba(201,168,76,0.4); }
    #p-input-area {
      padding:12px 14px; border-top:1px solid rgba(255,255,255,0.06);
      display:flex; gap:8px; align-items:flex-end; flex-shrink:0;
      background:#0d1018;
    }
    #p-input {
      flex:1; background:#131620; border:1px solid rgba(255,255,255,0.08);
      border-radius:10px; padding:10px 14px; color:#f0eeea;
      font:0.83rem 'Inter',sans-serif; outline:none; resize:none;
      min-height:40px; max-height:100px; line-height:1.5;
      transition:border-color 0.2s;
    }
    #p-input:focus { border-color:rgba(201,168,76,0.3); }
    #p-input::placeholder { color:#5a6480; }
    #p-send {
      width:36px; height:36px; border-radius:9px; background:#c9a84c;
      border:none; cursor:pointer; display:flex; align-items:center;
      justify-content:center; color:#080a0f; flex-shrink:0;
      transition:all 0.2s;
    }
    #p-send:hover { background:#e2c27a; transform:scale(1.05); }
    #p-send:disabled { opacity:0.4; cursor:default; transform:none; }
    /* Quiz options */
    .p-quiz-opts { display:flex; flex-direction:column; gap:6px; margin-top:8px; }
    .p-quiz-opt {
      background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08);
      color:#9aa3bb; font-size:0.8rem; padding:9px 13px; border-radius:9px;
      cursor:pointer; text-align:left; transition:all 0.2s;
      font-family:'Inter',sans-serif;
    }
    .p-quiz-opt:hover { border-color:rgba(201,168,76,0.3); background:rgba(201,168,76,0.06); color:#e2c27a; }
    /* Highlight tooltip */
    #p-highlight-tooltip {
      position:fixed; z-index:7600; background:#c9a84c; color:#080a0f;
      font:700 0.72rem 'Inter',sans-serif; padding:6px 12px; border-radius:99px;
      cursor:pointer; white-space:nowrap; box-shadow:0 4px 16px rgba(201,168,76,0.4);
      opacity:0; pointer-events:none; transition:opacity 0.2s;
      letter-spacing:0.04em;
    }
    #p-highlight-tooltip.show { opacity:1; pointer-events:all; }
    /* Recommendation card */
    .p-rec-card {
      background:rgba(201,168,76,0.08); border:1px solid rgba(201,168,76,0.25);
      border-radius:12px; padding:12px; margin-top:8px;
      display:grid; grid-template-columns:86px 1fr; gap:12px; align-items:center;
    }
    .p-rec-media {
      width:86px; height:70px; border-radius:10px; overflow:hidden;
      background:#f5f5f2; border:1px solid rgba(255,255,255,0.08);
      display:grid; place-items:center;
    }
    .p-rec-media img { width:100%; height:100%; object-fit:contain; padding:5px; }
    .p-rec-title { font-weight:800; color:#e2c27a; font-size:0.9rem; margin-bottom:4px; }
    .p-rec-desc { font-size:0.78rem; color:#9aa3bb; line-height:1.55; }
    .p-rec-link {
      display:inline-flex; align-items:center; gap:5px; margin-top:10px;
      background:#c9a84c; color:#080a0f; font-size:0.72rem; font-weight:700;
      padding:6px 13px; border-radius:8px; text-decoration:none; transition:background 0.2s;
    }
    .p-rec-link:hover { background:#e2c27a; }
    @media(max-width:480px){ .p-rec-card { grid-template-columns:74px 1fr; } .p-rec-media { width:74px; height:62px; } }
    @media(max-width:480px){
      #p-widget { width:calc(100vw - 24px); right:12px; bottom:84px; }
      #p-launcher { bottom:20px; right:20px; }
    }
  `;

  const styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  document.body.insertAdjacentHTML('beforeend', `
    <button id="p-launcher" aria-label="Penthia AI Chat">
      <span class="p-lnch-icon p-lnch-icon-open">✦</span>
      <span class="p-lnch-icon p-lnch-icon-close">✕</span>
      <span class="p-lnch-badge">AI</span>
    </button>

    <div id="p-widget" role="dialog" aria-label="Penthia AI Assistant">
      <div id="p-header">
        <div id="p-header-icon">✦</div>
        <div id="p-header-text">
          <div id="p-header-title">Penthia AI</div>
          <div id="p-header-status"><span class="p-status-dot"></span>Online · Ready to help</div>
        </div>
        <span id="p-header-close" onclick="togglePenthiaWidget()" title="Close">✕</span>
      </div>
      <div id="p-messages"></div>
      <div id="p-quick-btns">
        <button class="p-qbtn" onclick="sendQuickMessage('Compare Pro vs Elite')">Pro vs Elite</button>
        <button class="p-qbtn" onclick="sendQuickMessage('Does it support Google Classroom?')">Google support?</button>
        <button class="p-qbtn" onclick="startQuiz()">Find My Board 🎯</button>
      </div>
      <div id="p-input-area">
        <textarea id="p-input" placeholder="Ask anything about Penthia boards…" rows="1"></textarea>
        <button id="p-send" onclick="sendPenthiaMessage()" aria-label="Send">
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
        </button>
      </div>
    </div>

    <div id="p-highlight-tooltip" onclick="askFromHighlight()">Ask Penthia AI ✦</div>
  `);
}

/* ── TOGGLE ── */
function togglePenthiaWidget() {
  widgetOpen = !widgetOpen;
  document.getElementById('p-launcher').classList.toggle('open', widgetOpen);
  document.getElementById('p-widget').classList.toggle('open', widgetOpen);
  try { sessionStorage.setItem(OPEN_KEY, widgetOpen ? '1' : '0'); } catch(_) {}
  if (widgetOpen) {
    if (chatHistory.length === 0) showWelcome();
    else renderHistory();
    setTimeout(() => document.getElementById('p-input').focus(), 200);
  }
}
window.togglePenthiaWidget = togglePenthiaWidget;

/* ── WELCOME ── */
function showWelcome() {
  appendMessage('ai', `Hi there! 👋 I'm **Penthia AI** — ask me anything about our interactive smartboard lineup.

You can also type **"Find My Board"** and I'll ask you a few quick questions to recommend the perfect model for your needs.`);
}

/* ── RENDER HISTORY ── */
function renderHistory() {
  const container = document.getElementById('p-messages');
  if (!container) return;
  container.innerHTML = '';
  chatHistory.forEach(m => appendMessage(m.role === 'user' ? 'user' : 'ai', m.content, false));
  container.scrollTop = container.scrollHeight;
}

/* ── APPEND MESSAGE ── */
function appendMessage(role, text, scroll = true) {
  const container = document.getElementById('p-messages');
  if (!container) return;
  const div = document.createElement('div');
  div.className = `p-msg ${role}`;
  const formatted = formatMarkdown(text);
  div.innerHTML = role === 'ai'
    ? `<div class="p-msg-avatar">✦</div><div class="p-msg-bubble">${formatted}</div>`
    : `<div class="p-msg-bubble">${formatted}</div>`;
  container.appendChild(div);
  if (scroll) container.scrollTop = container.scrollHeight;
}

/* ── FORMAT MARKDOWN ── */
function formatMarkdown(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
    .replace(/\n{2,}/g, '</p><p>')
    .replace(/\n/g, '<br>')
    .replace(/^(.+)$/, '<p>$1</p>');
}

/* ── SEND MESSAGE ── */
async function sendPenthiaMessage(overrideText, displayText) {
  if (isLoading) return;
  const input = document.getElementById('p-input');
  const text = overrideText || (input ? input.value.trim() : '');
  const visibleText = displayText || text;
  if (!text) return;
  if (input) input.value = '';

  // Check for quiz trigger
  if (visibleText.toLowerCase().includes('find my board') || visibleText.toLowerCase().includes('recommend')) {
    appendMessage('user', visibleText);
    chatHistory.push({ role: 'user', content: text });
    saveSession();
    startQuiz();
    return;
  }

  appendMessage('user', visibleText);
  chatHistory.push({ role: 'user', content: text });
  saveSession();
  showTyping();
  isLoading = true;
  document.getElementById('p-send').disabled = true;

  try {
    const response = await fetch(SUPABASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 800,
        system: SYSTEM_PROMPT,
        messages: chatHistory.map(m => ({ role: m.role, content: m.content }))
      })
    });
    const data = await response.json();
    hideTyping();
    const reply = data?.content?.[0]?.text || "I'm having trouble connecting. Please try again or contact Penthia directly.";
    appendMessage('ai', reply);
    chatHistory.push({ role: 'assistant', content: reply });
    saveSession();
  } catch(err) {
    hideTyping();
    appendMessage('ai', "Connection error. Please try again or visit penthiasolutions.com/contact.html to reach us directly.");
  }
  isLoading = false;
  document.getElementById('p-send').disabled = false;
}
window.sendPenthiaMessage = sendPenthiaMessage;

/* ── QUICK MESSAGE ── */
function sendQuickMessage(text) {
  if (!widgetOpen) togglePenthiaWidget();
  sendPenthiaMessage(text);
}
window.sendQuickMessage = sendQuickMessage;

/* ── TYPING INDICATOR ── */
function showTyping() {
  const container = document.getElementById('p-messages');
  if (!container) return;
  const div = document.createElement('div');
  div.className = 'p-msg ai'; div.id = 'p-typing-indicator';
  div.innerHTML = `<div class="p-msg-avatar">✦</div><div class="p-msg-bubble"><div class="p-typing"><span></span><span></span><span></span></div></div>`;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}
function hideTyping() {
  const el = document.getElementById('p-typing-indicator');
  if (el) el.remove();
}

/* ── QUIZ ── */
function startQuiz() {
  if (!widgetOpen) togglePenthiaWidget();
  quizMode = true; quizStep = 0; quizAnswers = [];
  appendMessage('ai', "Great! Let me help you find the perfect Penthia board. I'll ask you **5 quick questions**. 🎯");
  setTimeout(() => showQuizQuestion(), 400);
}
window.startQuiz = startQuiz;

function showQuizQuestion() {
  if (quizStep >= QUIZ_QUESTIONS.length) { finishQuiz(); return; }
  const q = QUIZ_QUESTIONS[quizStep];
  const container = document.getElementById('p-messages');
  const div = document.createElement('div');
  div.className = 'p-msg ai';
  const opts = q.opts.map((o, i) =>
    `<button class="p-quiz-opt" onclick="answerQuiz(${i})">${o}</button>`
  ).join('');
  div.innerHTML = `<div class="p-msg-avatar">✦</div><div class="p-msg-bubble"><strong>Q${quizStep+1}/${QUIZ_QUESTIONS.length}:</strong> ${q.q}<div class="p-quiz-opts">${opts}</div></div>`;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function answerQuiz(i) {
  const answer = QUIZ_QUESTIONS[quizStep].opts[i];
  quizAnswers.push(answer);
  document.querySelectorAll('.p-quiz-opt').forEach(b => b.disabled = true);
  appendMessage('user', answer);
  quizStep++;
  if (quizStep < QUIZ_QUESTIONS.length) setTimeout(() => showQuizQuestion(), 350);
  else setTimeout(() => finishQuiz(), 350);
}
window.answerQuiz = answerQuiz;

const RECOMMENDATION_PRODUCTS = {
  elite: {
    id: 'pro-max',
    label: 'Vertex Elite',
    image: 'elite.png',
    url: 'store.html?product=pro-max'
  },
  pro: {
    id: 'pro',
    label: 'Vertex Pro',
    image: 'pro2.png',
    url: 'store.html?product=pro'
  },
  standard: {
    id: 'iboard',
    label: 'Vertex Standard',
    image: 'vertexstandard1.png',
    url: 'store.html?product=iboard'
  },
  qs3: {
    id: 'qs3',
    label: 'QS3 Series',
    image: 'qs31.png',
    url: 'store.html?product=qs3'
  }
};

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getRecommendationProduct(modelName, reasonText = '') {
  const text = `${modelName || ''} ${reasonText || ''}`.toLowerCase();
  if (text.includes('qs3') || text.includes('external')) return RECOMMENDATION_PRODUCTS.qs3;
  if (text.includes('standard') || text.includes('budget') || text.includes('essential')) return RECOMMENDATION_PRODUCTS.standard;
  if (text.includes('elite') || text.includes('flagship') || text.includes('highest') || text.includes('best performance')) return RECOMMENDATION_PRODUCTS.elite;
  return RECOMMENDATION_PRODUCTS.pro;
}

function renderRecommendationCard(modelName, reasonText) {
  const container = document.getElementById('p-messages');
  if (!container) return;

  const product = getRecommendationProduct(modelName, reasonText);
  const card = document.createElement('div');
  card.className = 'p-msg ai';
  card.innerHTML = `<div class="p-msg-avatar">✦</div><div class="p-msg-bubble"><div class="p-rec-card"><div class="p-rec-media"><img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.label)}"></div><div><div class="p-rec-title">⭐ Recommended: ${escapeHtml(product.label)}</div><div class="p-rec-desc">${escapeHtml(reasonText)}</div><a class="p-rec-link" href="${escapeHtml(product.url)}">View on Store →</a></div></div></div>`;
  container.appendChild(card);
  container.scrollTop = container.scrollHeight;
}

async function finishQuiz() {
  quizMode = false;
  showTyping();
  const prompt = `Based on these answers from a customer exploring Penthia boards, recommend the best model. Be specific and warm. Include a recommendation card at the end in this format:
[RECOMMEND: ModelName | One-line reason]

Customer answers:
1. Use case: ${quizAnswers[0]}
2. Google Workspace needed: ${quizAnswers[1]}
3. Priority: ${quizAnswers[2]}
4. Camera/mic needed: ${quizAnswers[3]}
5. Size preference: ${quizAnswers[4]}`;

  try {
    const response = await fetch(SUPABASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 600,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    const data = await response.json();
    hideTyping();
    let reply = data?.content?.[0]?.text || "Based on your needs, I'd recommend the Vertex Pro as a great starting point. Contact us to discuss your configuration!";

    // Parse recommendation card. The link is generated locally so it never points to a missing page.
    const recMatch = reply.match(/\[RECOMMEND:\s*([^|\]]+)\|\s*([^|\]]+?)(?:\|\s*[^\]]+)?\s*\]/);
    if (recMatch) {
      reply = reply.replace(recMatch[0], '').trim();
      if (reply) appendMessage('ai', reply);
      renderRecommendationCard(recMatch[1].trim(), recMatch[2].trim());
    } else {
      appendMessage('ai', reply);
      renderRecommendationCard('Vertex Pro', 'A strong starting point for most classrooms and school deployments.');
    }
    chatHistory.push({ role: 'assistant', content: reply });
    saveSession();
  } catch(_) {
    hideTyping();
    const fallback = "Based on your answers, the **Vertex Pro** is likely the best match for most needs. Contact us to confirm the right configuration!";
    appendMessage('ai', fallback);
    renderRecommendationCard('Vertex Pro', 'A balanced choice for most schools with Google-ready Android, 4K touch, and optional Windows OPS.');
  }
}

/* ── SAVE SESSION ── */
function saveSession() {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ history: chatHistory.slice(-20) }));
  } catch(_) {}
}

/* ── HIGHLIGHT TO ASK ── */
let highlightedText = '';
let highlightTimer = null;

function getSelectedText() {
  const sel = window.getSelection();
  return sel ? sel.toString().trim().replace(/\s+/g, ' ') : '';
}

function showHighlightTooltip() {
  const tip = document.getElementById('p-highlight-tooltip');
  const sel = window.getSelection();
  if (!tip || !sel || sel.rangeCount === 0) return;

  const text = getSelectedText();

  if (!text || text.length < 8 || text.length > 500) {
    tip.classList.remove('show');
    return;
  }

  const range = sel.getRangeAt(0);
  const rect = range.getBoundingClientRect();

  if (!rect || (rect.width === 0 && rect.height === 0)) {
    tip.classList.remove('show');
    return;
  }

  highlightedText = text;

  const tooltipWidth = 148;
  const left = Math.max(12, Math.min(window.innerWidth - tooltipWidth - 12, rect.left + rect.width / 2 - tooltipWidth / 2));
  const top = Math.max(12, rect.top - 42);

  tip.style.left = left + 'px';
  tip.style.top = top + 'px';
  tip.classList.add('show');
}

document.addEventListener('selectionchange', () => {
  clearTimeout(highlightTimer);
  highlightTimer = setTimeout(showHighlightTooltip, 160);
});

document.addEventListener('mouseup', () => {
  clearTimeout(highlightTimer);
  highlightTimer = setTimeout(showHighlightTooltip, 80);
});

document.addEventListener('touchend', () => {
  clearTimeout(highlightTimer);
  highlightTimer = setTimeout(showHighlightTooltip, 220);
});

document.addEventListener('pointerdown', (e) => {
  const tip = document.getElementById('p-highlight-tooltip');
  if (!tip) return;

  if (e.target === tip || tip.contains(e.target)) return;

  if (e.target.closest && e.target.closest('#p-widget, #p-launcher')) return;

  tip.classList.remove('show');
});

function cleanContextText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function limitContext(value, maxLength) {
  const text = cleanContextText(value);
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1).trim() + '…';
}

function getSelectionSectionContext() {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return { heading: '', sectionText: '' };

  let node = sel.getRangeAt(0).commonAncestorContainer;
  if (node && node.nodeType === Node.TEXT_NODE) node = node.parentElement;
  if (!node || !node.closest) return { heading: '', sectionText: '' };

  const section = node.closest('section, article, .section, .container, .hero, .store-header, .store-banner, .prod-card, .bento-card, .feature-card, .info-card, .faq-item, .compare-table-wrap, .contact-grid') || document.body;
  const headingEl = section.querySelector('h1, h2, h3, .section-title, .prod-name, .bento-name, .faq-question h3, .image-panel-title');

  return {
    heading: cleanContextText(headingEl ? headingEl.textContent : ''),
    sectionText: limitContext(section.innerText || section.textContent || '', 2400)
  };
}

async function getWebsiteTextMap() {
  const pages = [
    { name: 'Home', url: 'index.html' },
    { name: 'Store', url: 'store.html' },
    { name: 'Compare', url: 'compare.html' },
    { name: 'About', url: 'about.html' },
    { name: 'Contact', url: 'contact.html' }
  ];

  const parts = [];
  for (const page of pages) {
    try {
      const response = await fetch(page.url, { cache: 'no-store' });
      if (!response.ok) continue;
      const html = await response.text();
      const doc = new DOMParser().parseFromString(html, 'text/html');
      doc.querySelectorAll('script, style, nav, footer, svg, .modal, #ai-popup-overlay, .mobile-nav').forEach(el => el.remove());
      const text = limitContext(doc.body ? doc.body.textContent : '', 1800);
      if (text) parts.push(`${page.name} page (${page.url}): ${text}`);
    } catch(_) {}
  }

  return parts.join('\n\n');
}

async function buildHighlightPrompt(selectedText) {
  const sectionContext = getSelectionSectionContext();
  const siteMap = await getWebsiteTextMap();
  const currentPageText = limitContext(document.body ? document.body.innerText : '', 2600);

  return `A website visitor highlighted text on the Penthia Solutions website and asked for an explanation. Use the provided website context directly. Do not say you cannot access the website.\n\nHighlighted text:\n"${selectedText}"\n\nCurrent page:\nTitle: ${document.title}\nURL: ${window.location.href}\nNearest section heading: ${sectionContext.heading || 'Not detected'}\nNearest section text:\n${sectionContext.sectionText || 'Not detected'}\n\nVisible current page text excerpt:\n${currentPageText}\n\nWebsite text map from available pages:\n${siteMap}\n\nQuestion to answer:\nExplain what the highlighted text means in context and how it relates to Penthia's products.`;
}

async function askFromHighlight() {
  const tip = document.getElementById('p-highlight-tooltip');
  if (tip) tip.classList.remove('show');

  const textToAsk = highlightedText || getSelectedText();
  if (!textToAsk) return;

  highlightedText = textToAsk;

  if (!widgetOpen) togglePenthiaWidget();

  const displayText = `I highlighted this text on your website: "${textToAsk}"

Can you explain what it means and how it relates to Penthia's products?`;

  setTimeout(async () => {
    const prompt = await buildHighlightPrompt(textToAsk);
    sendPenthiaMessage(prompt, displayText);
  }, 220);
}

window.askFromHighlight = askFromHighlight;

/* ── INPUT HANDLERS ── */
function initInputHandlers() {
  const input = document.getElementById('p-input');
  const launcher = document.getElementById('p-launcher');
  if (input) {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendPenthiaMessage();
      }
    });
    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 100) + 'px';
    });
  }
  if (launcher) launcher.addEventListener('click', togglePenthiaWidget);
}

/* ── INIT ── */
document.addEventListener('DOMContentLoaded', () => {
  injectWidget();
  initInputHandlers();

  try {
    if (sessionStorage.getItem(OPEN_KEY) === '1') {
      togglePenthiaWidget();
    }
  } catch(_) {}

  // Add scroll reveal
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
});
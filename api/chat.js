/* ============================================================
   Penthia Solutions — Claude proxy (Vercel Function)

   Replaces the Supabase edge function `claude-proxy`, which
   accepted `model`, `system`, and `max_tokens` from the browser
   with no authentication. Anyone who read the site's JavaScript
   could send their own payload and bill it to the Penthia key.

   Trust is inverted here: the server owns the model, the system
   prompt, and every limit. The browser sends only the user's
   messages, and nothing it sends can change how the model runs.
   ============================================================ */

import Anthropic from '@anthropic-ai/sdk';
import { SYSTEM_PROMPT } from './_system-prompt.js';

/* ── SERVER-OWNED MODEL CONFIG — not settable by the caller ── */

const MODEL = 'claude-opus-5';
const MAX_TOKENS = 1600;
const EFFORT = 'low';

/* ── LIMITS ── */

const MAX_MESSAGES = 24;          // turns in one conversation
const MAX_CHARS_PER_MESSAGE = 4000;
const MAX_CHARS_TOTAL = 24000;
const RATE_PER_MINUTE = 12;
const RATE_PER_HOUR = 40;

/* ── ORIGIN ALLOWLIST ──
   A real check, not just a CORS header. CORS is a browser
   convention; curl ignores it. A request from anywhere else is
   refused before it reaches the model.

   Preview deployments are allowed only outside production, so a
   branch preview can be tested end to end without opening the
   production endpoint to every *.vercel.app URL on the internet. */

const ALLOWED_ORIGINS = [
  'https://penthiasolutions.com',
  'https://www.penthiasolutions.com',
];

function isAllowedOrigin(origin) {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  if (process.env.VERCEL_ENV !== 'production') {
    try {
      const { protocol, hostname } = new URL(origin);
      if (protocol === 'https:' && hostname.endsWith('.vercel.app')) return true;
      if (protocol === 'http:' && (hostname === 'localhost' || hostname === '127.0.0.1')) return true;
    } catch {
      return false;
    }
  }
  return false;
}

/* ── RATE LIMIT ──
   In-memory, so it is per warm instance rather than global. That
   makes it a speed bump, not a wall: a determined caller hitting
   cold instances can exceed these numbers. It costs nothing and
   needs no extra service, which is the trade we chose. If abuse
   ever shows up in the logs, this is the thing to move to a
   shared store. */

const hits = new Map();

function rateLimit(ip) {
  const now = Date.now();
  const times = (hits.get(ip) || []).filter((t) => now - t < 3_600_000);

  if (times.filter((t) => now - t < 60_000).length >= RATE_PER_MINUTE) {
    return { ok: false, retryAfter: 60 };
  }
  if (times.length >= RATE_PER_HOUR) {
    return { ok: false, retryAfter: 900 };
  }

  times.push(now);
  hits.set(ip, times);

  // Keep the map from growing without bound on a long-lived instance.
  if (hits.size > 5000) {
    for (const [key, stamps] of hits) {
      if (!stamps.some((t) => now - t < 3_600_000)) hits.delete(key);
    }
  }
  return { ok: true };
}

/* ── REQUEST VALIDATION ──
   Only `messages` is read. A `model`, `system`, or `max_tokens`
   sent by the browser is ignored rather than rejected — there is
   nothing to gain by telling a prober which field it guessed. */

function validateMessages(input) {
  if (!Array.isArray(input) || input.length === 0) {
    return { error: 'messages must be a non-empty array' };
  }
  if (input.length > MAX_MESSAGES) {
    return { error: 'conversation too long' };
  }

  let total = 0;
  const messages = [];

  for (const m of input) {
    if (!m || (m.role !== 'user' && m.role !== 'assistant')) {
      return { error: 'each message needs a role of user or assistant' };
    }
    if (typeof m.content !== 'string') {
      return { error: 'each message needs string content' };
    }
    const content = m.content.trim();
    if (!content) {
      return { error: 'messages cannot be empty' };
    }
    if (content.length > MAX_CHARS_PER_MESSAGE) {
      return { error: 'message too long' };
    }
    total += content.length;
    if (total > MAX_CHARS_TOTAL) {
      return { error: 'conversation too long' };
    }
    messages.push({ role: m.role, content });
  }

  if (messages[messages.length - 1].role !== 'user') {
    return { error: 'the last message must be from the user' };
  }
  return { messages };
}

/* ── HANDLER ── */

const anthropic = new Anthropic();

export default async function handler(req, res) {
  const origin = req.headers.origin;
  const allowed = isAllowedOrigin(origin);

  if (allowed) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Max-Age', '86400');
  }

  if (req.method === 'OPTIONS') {
    return res.status(allowed ? 204 : 403).end();
  }
  if (!allowed) {
    return res.status(403).json({ error: 'origin not allowed' });
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method not allowed' });
  }

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  const limit = rateLimit(ip);
  if (!limit.ok) {
    res.setHeader('Retry-After', String(limit.retryAfter));
    return res.status(429).json({ error: 'too many requests' });
  }

  const body = typeof req.body === 'string' ? safeParse(req.body) : req.body;
  if (!body) {
    return res.status(400).json({ error: 'invalid JSON body' });
  }

  const { messages, error } = validateMessages(body.messages);
  if (error) {
    return res.status(400).json({ error });
  }

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      thinking: { type: 'adaptive' },
      output_config: { effort: EFFORT },
      // The system prompt is the stable prefix, so it is the cache
      // breakpoint. At ~1,700 tokens it clears Opus 5's 512-token
      // minimum comfortably — it never cached on Haiku 4.5, whose
      // minimum is 4,096.
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages,
    });

    // Opus 5 runs adaptive thinking, so content[0] may be a thinking
    // block rather than the answer. The widget reads content[0].text,
    // so hand back exactly one text block and keep the old shape.
    if (response.stop_reason === 'refusal') {
      return res.status(200).json({
        content: [
          {
            type: 'text',
            text: "I can't help with that one. For anything about specifications, pricing, or an order, the team can reach you directly through penthiasolutions.com/contact.html.",
          },
        ],
      });
    }

    const text = response.content.find((b) => b.type === 'text')?.text?.trim();
    if (!text) {
      console.error('no text block in response', {
        stop_reason: response.stop_reason,
        types: response.content.map((b) => b.type),
      });
      return res.status(502).json({ error: 'empty response from model' });
    }

    return res.status(200).json({ content: [{ type: 'text', text }] });
  } catch (err) {
    // Log the detail; return something a customer can act on.
    console.error('claude proxy error', {
      name: err?.name,
      status: err?.status,
      message: err?.message,
      request_id: err?.request_id,
    });

    if (err instanceof Anthropic.RateLimitError) {
      res.setHeader('Retry-After', '30');
      return res.status(429).json({ error: 'busy, try again shortly' });
    }
    if (err instanceof Anthropic.AuthenticationError) {
      // The key is missing, wrong, or revoked. This is an outage.
      return res.status(503).json({ error: 'assistant unavailable' });
    }
    if (err instanceof Anthropic.APIConnectionError) {
      return res.status(504).json({ error: 'upstream timeout' });
    }
    return res.status(502).json({ error: 'assistant unavailable' });
  }
}

function safeParse(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

import { SYSTEM_PROMPT_BASE, REMINDER } from "./prompt.js";

const MAX_MESSAGE_LENGTH = 2000;
const MAX_HISTORY = 12;
// Llama 4 Scout instead of the 3.1 8B model on the older client bots: in the
// CanaTrust tests the 8B model played along with "ignore your rules" messages
// and claimed services the client doesn't list.
const CHAT_MODEL = "@cf/meta/llama-4-scout-17b-16e-instruct";
const LOG_RETENTION_SECONDS = 60 * 60 * 24 * 90; // 90 days

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get("Origin") || "";
    const allowedOrigins = (env.ALLOWED_ORIGINS || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const corsHeaders = buildCorsHeaders(origin, allowedOrigins);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // Reject browsers calling from an origin that is not on the allow list.
    if (origin && !allowedOrigins.includes(origin)) {
      return json({ error: "Forbidden" }, 403, corsHeaders);
    }

    const url = new URL(request.url);

    try {
      if (url.pathname === "/chat" && request.method === "POST") {
        return await handleChat(request, env, corsHeaders, ctx);
      }
      return json({ error: "Not found" }, 404, corsHeaders);
    } catch (err) {
      console.error("Unhandled error:", err && err.stack ? err.stack : err);
      return json({ error: "Server error" }, 500, corsHeaders);
    }
  },
};

function buildCorsHeaders(origin, allowedOrigins) {
  const allow = allowedOrigins.includes(origin) ? origin : allowedOrigins[0] || "";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
}

function json(data, status, headers) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

// Small models slip dashes in despite the prompt (em dashes, en dashes and
// spaced hyphens like "job - we"); swap them for commas. Phone numbers
// are safe: their hyphens have no spaces around them. Only spaces and tabs
// count, so "- " bullets at the start of a line survive. Built from char codes
// (em dash, en dash) so this file has no dash characters.
const DASHES = new RegExp("[ \\t]*[" + String.fromCharCode(0x2014, 0x2013) + "][ \\t]*|[ \\t]+-[ \\t]+", "g");

function cleanReply(text) {
  return String(text).replace(DASHES, ", ").trim();
}

async function handleChat(request, env, corsHeaders, ctx) {
  let body;
  try {
    body = await request.json();
  } catch (_) {
    return json({ error: "Invalid JSON" }, 400, corsHeaders);
  }

  const messages = Array.isArray(body.messages) ? body.messages : [];
  const sessionId =
    typeof body.sessionId === "string" ? body.sessionId.replace(/[^a-zA-Z0-9-]/g, "").slice(0, 64) : "";

  const trimmed = messages
    .slice(-MAX_HISTORY)
    .map((m) => ({
      role: m && m.role === "assistant" ? "assistant" : "user",
      content: String((m && m.content) || "").slice(0, MAX_MESSAGE_LENGTH),
    }))
    .filter((m) => m.content.trim().length > 0);

  if (trimmed.length === 0) {
    return json({ error: "No valid messages provided" }, 400, corsHeaders);
  }

  let result;
  try {
    result = await env.AI.run(CHAT_MODEL, {
      messages: [{ role: "system", content: SYSTEM_PROMPT_BASE }, ...trimmed, { role: "system", content: REMINDER }],
      max_tokens: 400,
      // Low temperature keeps it on script: at the default, Scout sometimes
      // played along with "ignore your rules" messages in the CanaTrust tests
      temperature: 0.2,
    });
  } catch (err) {
    console.error("AI.run failed:", err && err.message ? err.message : err);
    return json({ error: "Assistant is temporarily unavailable" }, 502, corsHeaders);
  }

  const reply = cleanReply((result && result.response) || "") || "Sorry, I didn't catch that. Could you rephrase?";

  // Conversation logging only runs when a CHAT_LOGS KV namespace is bound in
  // wrangler.toml. It's off until the site has a privacy policy that says so.
  if (sessionId && env.CHAT_LOGS) {
    const logEntry = JSON.stringify({
      messages: [...trimmed, { role: "assistant", content: reply }],
      updatedAt: new Date().toISOString(),
    });
    const writeLog = env.CHAT_LOGS.put(`session:${sessionId}`, logEntry, {
      expirationTtl: LOG_RETENTION_SECONDS,
    }).catch((err) => console.error("KV log write failed:", err && err.message ? err.message : err));
    if (ctx && ctx.waitUntil) ctx.waitUntil(writeLog);
  }

  return json({ reply }, 200, corsHeaders);
}

// Language Teacher — Google Cloud Run function for the optional Claude Haiku 5.5 generation model.
//
// The site is static (GitHub Pages), so it cannot hold a secret. This small function does: the Anthropic API key lives
// ONLY here, as the environment variable ANTHROPIC_API_KEY (ideally a Secret Manager reference). The browser
// authenticates to THIS function with a site access code (environment variable LT_ACCESS_CODE), which the owner types
// once in the app's Settings and can change at any time.
//
// Guard rails (enforced here, whatever the browser sends):
//   • refuses to run unless ANTHROPIC_API_KEY and LT_ACCESS_CODE are set (never an open relay)
//   • answers browsers only from the allowed site origins (ALLOWED_ORIGINS, default https://mrkleinman.github.io)
//   • only the model claude-haiku-5-5; max_tokens capped at 16000; request body ≤ 300 KB
//   • only these fields are forwarded: model, max_tokens, system, messages (text blocks, ≤ 4 ephemeral cache marks), adaptive thinking (or thinking switched off, only when the request asks for {type:"disabled"} — v723, for the short one-line Thai calls),
//     output_config.effort and output_config.format (json_schema). temperature / top_p / top_k / tools / stream are dropped.
//   • no retries here (maxRetries: 0): the app retries rate limits / overload itself so every attempt is logged and costed
//
// Deploy (Google Cloud console → Cloud Run → Write a function): runtime Node.js 22, entry point "anthropic",
// "Allow unauthenticated invocations", request timeout 300 s, maximum instances 2. Paste this file as index.js and
// package.json next to it. Step-by-step instructions: dev/server/google-cloud-anthropic/SETUP.md
import functions from "@google-cloud/functions-framework";
import Anthropic from "@anthropic-ai/sdk";

const ALLOWED_MODELS = ["claude-haiku-5-5"];
const MAX_TOKENS_CEILING = 16000;
const MAX_BODY_BYTES = 300 * 1024;
const EFFORTS = ["low", "medium", "high"];
const DEFAULT_ORIGINS = "https://mrkleinman.github.io";

function sameSecret(a, b) {
  const x = new TextEncoder().encode(String(a || "")), y = new TextEncoder().encode(String(b || ""));
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] || 0) ^ (y[i] || 0);
  return diff === 0 && x.length > 0;
}
function textContent(c) {
  return typeof c === "string" ? c : Array.isArray(c) ? c.filter((b) => b && b.type === "text").map((b) => String(b.text || "")).join("\n") : "";
}
// v706 — prompt caching (cost), as the Netlify edge function has had since v703: text blocks are kept as blocks, and a block may
// carry cache_control {type:"ephemeral"} (nothing else: no TTL, no other block types). At most 4 breakpoints, as the API allows.
// Without this the app's cache marks were flattened away here and every paid request was billed at the full input price.
const MAX_CACHE_BREAKPOINTS = 4;
function textBlocks(c, budget) {
  if (!Array.isArray(c)) return textContent(c);
  const blocks = c.filter((b) => b && b.type === "text" && String(b.text || "")).map((b) => {
    const out = { type: "text", text: String(b.text) };
    if (b.cache_control && b.cache_control.type === "ephemeral" && budget.left > 0) { out.cache_control = { type: "ephemeral" }; budget.left--; }
    return out;
  });
  return blocks.length ? blocks : "";
}
// Only the fields the app needs, validated; everything else is dropped.
export function buildParams(body) {
  if (!body || typeof body !== "object") return { error: "body must be a JSON object" };
  if (!ALLOWED_MODELS.includes(body.model)) return { error: "model not allowed: " + String(body.model) };
  if (!Array.isArray(body.messages) || !body.messages.length) return { error: "messages required" };
  const budget = { left: MAX_CACHE_BREAKPOINTS };
  const system = textBlocks(body.system, budget);
  const messages = body.messages.map((m) => ({ role: m && m.role === "assistant" ? "assistant" : "user", content: textBlocks(m && m.content, budget) }));
  if (messages[0].role !== "user" || messages[messages.length - 1].role !== "user") return { error: "messages must start and end with a user turn" };
  const max = Math.floor(Number(body.max_tokens));
  const params = { model: body.model, max_tokens: Math.max(1, Math.min(MAX_TOKENS_CEILING, Number.isFinite(max) ? max : 4096)), messages, thinking: body.thinking && body.thinking.type === "disabled" ? { type: "disabled" } : { type: "adaptive" } };
  if (Array.isArray(system) ? system.length : String(system).trim()) params.system = system;
  const oc = body.output_config || {};
  params.output_config = { effort: EFFORTS.includes(oc.effort) ? oc.effort : "low" };
  if (oc.format && oc.format.type === "json_schema" && oc.format.schema && typeof oc.format.schema === "object") params.output_config.format = { type: "json_schema", schema: oc.format.schema };
  return { params };
}
// The handler (Express-style req / res, as Cloud Run functions provide), with its dependencies injected for tests.
export async function handleAnthropic(req, res, { getEnv, Anthropic: SDK }) {
  const origins = String(getEnv("ALLOWED_ORIGINS") || DEFAULT_ORIGINS).split(",").map((s) => s.trim()).filter(Boolean);
  const origin = req.get ? req.get("origin") : req.headers && req.headers.origin;
  res.set("Cache-Control", "no-store");
  res.set("Vary", "Origin");
  if (origin && origins.includes(origin)) {
    res.set("Access-Control-Allow-Origin", origin);
    res.set("Access-Control-Allow-Headers", "Content-Type, x-lt-access");
    res.set("Access-Control-Allow-Methods", "POST");
    res.set("Access-Control-Max-Age", "3600");
  }
  const fail = (status, type, message) => res.status(status).json({ type: "error", error: { type, message } });
  if (req.method === "OPTIONS") return res.status(origin && origins.includes(origin) ? 204 : 403).send("");
  if (origin && !origins.includes(origin)) return fail(403, "origin_not_allowed", "this site is not allowed to use the function (set ALLOWED_ORIGINS)");
  if (req.method !== "POST") return fail(405, "method_not_allowed", "POST only");
  const apiKey = getEnv("ANTHROPIC_API_KEY"), access = getEnv("LT_ACCESS_CODE");
  if (!apiKey || !access) return fail(503, "not_configured", "set ANTHROPIC_API_KEY and LT_ACCESS_CODE on the Cloud Run function");
  if (!sameSecret(req.get ? req.get("x-lt-access") : req.headers["x-lt-access"], access)) return fail(401, "access_denied", "wrong or missing site access code");
  const raw = req.rawBody ? req.rawBody.toString("utf8") : typeof req.body === "string" ? req.body : JSON.stringify(req.body || null);
  if (raw.length > MAX_BODY_BYTES) return fail(413, "request_too_large", "request body over " + MAX_BODY_BYTES + " bytes");
  let body = null;
  try { body = typeof req.body === "object" && req.body && !Buffer.isBuffer(req.body) ? req.body : JSON.parse(raw); } catch (e) { return fail(400, "invalid_request_error", "body is not JSON"); }
  const { params, error } = buildParams(body);
  if (error) return fail(400, "invalid_request_error", error);
  const client = new SDK({ apiKey, maxRetries: 0, timeout: 280000 });
  try {
    const msg = await client.messages.create(params);
    // the message as-is (content blocks, stop reason, served model, usage); never any header or credential
    return res.status(200).json({ id: msg.id, type: msg.type, model: msg.model, role: msg.role, content: msg.content, stop_reason: msg.stop_reason,
      stop_details: msg.stop_details || null, usage: msg.usage });
  } catch (e) {
    if (e instanceof SDK.APIError) {
      const status = typeof e.status === "number" ? e.status : 502;
      const type = e.type || (e.error && e.error.error && e.error.error.type) || "api_error";
      const message = (e.error && e.error.error && e.error.error.message) || e.message || "Anthropic API error";
      return fail(status, type, String(message).slice(0, 300));
    }
    return fail(502, "proxy_error", "could not reach Anthropic: " + String((e && e.message) || e).slice(0, 200));
  }
}

functions.http("anthropic", (req, res) => handleAnthropic(req, res, { getEnv: (k) => process.env[k], Anthropic }));

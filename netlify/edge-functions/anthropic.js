// Language Teacher — server-side proxy for the optional Claude Haiku 5.5 generation model.
//
// The Anthropic API key lives ONLY here, as the Netlify environment variable ANTHROPIC_API_KEY; it is never sent to the
// browser, written to index.html or stored on the device. The browser authenticates to THIS function with a site access
// code (environment variable LT_ACCESS_CODE), which the owner types once in Settings and can rotate at any time.
//
// Guard rails (enforced here, whatever the browser sends):
//   • refuses to run unless both environment variables are set (never an open relay)
//   • only the model claude-haiku-5-5; max_tokens capped at 16000; request body ≤ 300 KB
//   • only these fields are forwarded: model, max_tokens, system, messages (text), adaptive thinking,
//     output_config.effort and output_config.format (json_schema). temperature / top_p / top_k / tools / stream are dropped.
//   • no retries here (maxRetries: 0): the app retries rate limits / overload itself so every attempt is logged and costed
//   • same-origin only (no CORS headers are added)
//   • Netlify requires an Edge Function to send its response headers within ~40 s; a long Haiku answer (adaptive thinking,
//     up to 16000 tokens) can take longer. Once the request is validated, the function therefore answers 200 at once and
//     keeps the connection alive with spaces until Anthropic replies, then writes the JSON (leading spaces are valid JSON
//     whitespace). An Anthropic error is written as {"type":"error","status":<HTTP status>,"error":{type,message}}.
import Anthropic from "npm:@anthropic-ai/sdk@0.133.0";

const ALLOWED_MODELS = ["claude-haiku-5-5"];
const MAX_TOKENS_CEILING = 16000;
const MAX_BODY_BYTES = 300 * 1024;
const EFFORTS = ["low", "medium", "high"];
const KEEPALIVE_MS = 10000;

function reply(status, obj) {
  return new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
}
function fail(status, type, message) {
  return reply(status, { type: "error", error: { type, message } });
}
function sameSecret(a, b) {
  const x = new TextEncoder().encode(String(a || "")), y = new TextEncoder().encode(String(b || ""));
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] || 0) ^ (y[i] || 0);
  return diff === 0 && x.length > 0;
}
function textContent(c) {
  return typeof c === "string" ? c : Array.isArray(c) ? c.filter((b) => b && b.type === "text").map((b) => String(b.text || "")).join("\n") : "";
}
// Only the fields the app needs, validated; everything else is dropped.
export function buildParams(body) {
  if (!body || typeof body !== "object") return { error: "body must be a JSON object" };
  if (!ALLOWED_MODELS.includes(body.model)) return { error: "model not allowed: " + String(body.model) };
  if (!Array.isArray(body.messages) || !body.messages.length) return { error: "messages required" };
  const messages = body.messages.map((m) => ({ role: m && m.role === "assistant" ? "assistant" : "user", content: textContent(m && m.content) }));
  if (messages[0].role !== "user" || messages[messages.length - 1].role !== "user") return { error: "messages must start and end with a user turn" };
  const max = Math.floor(Number(body.max_tokens));
  const params = { model: body.model, max_tokens: Math.max(1, Math.min(MAX_TOKENS_CEILING, Number.isFinite(max) ? max : 4096)), messages, thinking: { type: "adaptive" } };
  if (typeof body.system === "string" && body.system.trim()) params.system = body.system;
  const oc = body.output_config || {};
  params.output_config = { effort: EFFORTS.includes(oc.effort) ? oc.effort : "low" };
  if (oc.format && oc.format.type === "json_schema" && oc.format.schema && typeof oc.format.schema === "object") params.output_config.format = { type: "json_schema", schema: oc.format.schema };
  return { params };
}
// The handler, with its dependencies injected (so it can be tested without the network).
export async function handleAnthropicProxy(request, { getEnv, Anthropic: SDK, keepAliveMs }) {
  if (request.method !== "POST") return fail(405, "method_not_allowed", "POST only");
  const apiKey = getEnv("ANTHROPIC_API_KEY"), access = getEnv("LT_ACCESS_CODE");
  if (!apiKey || !access) return fail(503, "not_configured", "set ANTHROPIC_API_KEY and LT_ACCESS_CODE in the Netlify site's environment variables");
  if (!sameSecret(request.headers.get("x-lt-access"), access)) return fail(401, "access_denied", "wrong or missing site access code");
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return fail(413, "request_too_large", "request body over " + MAX_BODY_BYTES + " bytes");
  let body = null;
  try { body = JSON.parse(raw); } catch (e) { return fail(400, "invalid_request_error", "body is not JSON"); }
  const { params, error } = buildParams(body);
  if (error) return fail(400, "invalid_request_error", error);
  const client = new SDK({ apiKey, maxRetries: 0, timeout: 170000 });
  const call = async () => {
    try {
      const msg = await client.messages.create(params);
      // the message as-is (content blocks, stop reason, served model, usage); never any header or credential
      return { id: msg.id, type: msg.type, model: msg.model, role: msg.role, content: msg.content, stop_reason: msg.stop_reason,
        stop_details: msg.stop_details || null, usage: msg.usage };
    } catch (e) {
      if (e instanceof SDK.APIError) {
        const status = typeof e.status === "number" ? e.status : 502;
        const type = e.type || (e.error && e.error.error && e.error.error.type) || "api_error";
        const message = (e.error && e.error.error && e.error.error.message) || e.message || "Anthropic API error";
        return { type: "error", status, error: { type, message: String(message).slice(0, 300) } };
      }
      return { type: "error", status: 502, error: { type: "proxy_error", message: "could not reach Anthropic: " + String((e && e.message) || e).slice(0, 200) } };
    }
  };
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(ctrl) {
      const keepAlive = setInterval(() => { try { ctrl.enqueue(enc.encode(" ")); } catch (e) {} }, keepAliveMs || KEEPALIVE_MS);
      const out = await call();
      clearInterval(keepAlive);
      ctrl.enqueue(enc.encode(JSON.stringify(out)));
      ctrl.close();
    },
  });
  return new Response(stream, { status: 200, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
}

export default async (request) => handleAnthropicProxy(request, { getEnv: (k) => Netlify.env.get(k), Anthropic });

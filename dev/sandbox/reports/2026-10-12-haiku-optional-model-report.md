# Language Teacher — Claude Haiku 5.5 as an optional generation model

**Date:** 12 Oct 2026
**Branch:** `claude/session-continuation-check-a19meq` (development only)
**Status:** built and tested offline. Nothing deployed, no paid calls made.


> **Correction (v686, same day).** The site is served by **GitHub Pages**, not Netlify. Every release is published by GitHub's "pages build and deployment" job; the Netlify files in the repository are not used. GitHub Pages only serves files, so the `/api/anthropic` function could not run there: the owner's first Test Connection got "405".
>
> **The server is now a Google Cloud Run function.** It lives in `dev/server/google-cloud-anthropic/`:
> - `index.js` and `package.json`;
> - step-by-step `SETUP.md`.
>
> It has the same guard rails as before, plus a check that browsers may call it only from `https://mrkleinman.github.io` (changeable with `ALLOWED_ORIGINS`).
>
> **App changes:**
> - Settings has a **Server address** field.
> - "No server function here", "server refused", "site not allowed" and "server unreachable after 3 tries" now each stop the track at once, with a message saying what to fix.
>
> **Verified end to end in a real browser:** app → the function under Google's own Functions Framework with the real Anthropic SDK → a local stand-in for Anthropic (nothing paid). Tests45 now has 79 checks. **§4 and §8 below describe the Netlify setup; for this site, follow `dev/server/google-cloud-anthropic/SETUP.md` instead.**

---

## 1. Architecture and what was required

### How the app works today (Phase 1 findings)

- **Hosting.** Language Teacher is a static website on Netlify: one `index.html` that runs entirely in the browser.
- **Gemini calls.** All AI work goes straight from the browser to Google Gemini, using the Gemini key stored on the device.
  - Model: `gemini-2.5-flash-lite`, with thinking switched off.
  - Every request passes through one function, `geminiRequest`. It handles retries (3 attempts), the backup key and the "stop on billing error" latch.
- **Generators.** All three languages call that same function. Each request has a *stage*:
  - writing: scene, generation, regeneration, QC replacement, recovery;
  - checking: group evaluation, cue check, naturalness, coherence;
  - support: pronunciation, segmentation, gloss.
- **Cost recording.** Every request is written to a per-run ledger: tokens, cost, stage, retry reason. That ledger produces the "AI usage summary" at the end of each track.
- **Settings storage.** Settings live in device storage (`window.storage`, falling back to `localStorage`).
- **Branches.**
  - `main` = production v683.
  - This branch = development: v684 code (still switched off) plus this change.

**Smallest secure backend.** The site has no server of its own, so the Anthropic key had nowhere safe to live. The browser must never hold that key. The smallest secure option is **one Netlify Edge Function**:
- It is the same mechanism the site already uses for `/api/deepseek`.
- It holds the Anthropic key as a Netlify environment variable, on Netlify's servers.
- The browser calls `/api/anthropic` on the same site. No new hosting, database or account is needed.

### What was built

| Requirement | How it is met |
|---|---|
| Choice in Settings, Gemini default | New **AI Generation Model** card offering "Gemini 2.5 Flash-Lite — Default" and "Claude Haiku 5.5 — Experimental". Existing users stay on Gemini. |
| Choice persists | Saved under `tt-generation-model` and loaded at app start. |
| Works for all three languages | Applies to Daily, Revision and Weak-words tracks in Thai, Japanese and Mandarin. |
| Model recorded on the track | Each track stores `generationModel`. It also appears in the run report and in the export header (`GENERATION_MODEL: …`). |
| A saved track never changes model | The model is fixed when a run starts. Work on an existing track (QC rebuild, Retry missing) uses that track's own model. A half-finished draft can only be completed by the model that started it. |
| No silent switch | A Haiku failure stops with a clear message. Nothing is ever re-sent to Gemini. |
| Useful error when unavailable | Messages such as "CLAUDE HAIKU UNAVAILABLE: Anthropic billing / credit problem (…) — your model choice was NOT changed; select Gemini in Settings to continue with Gemini." |
| Messages API, adaptive thinking, effort | `thinking: {type: "adaptive"}` and `output_config.effort: "low"`. No temperature, top_p or top_k is ever sent (checked again on the server). |
| Thinking, text and stop reasons handled | Thinking blocks are counted and skipped. Text is read by block type. A refusal, cut-off or empty reply counts as a failed attempt, never as a partial answer. |
| JSON compatible with existing parsing | Gemini's structured-output schemas are converted to Anthropic JSON Schema. Replies come back in exactly the shape the generators already parse. |
| Same teaching pipeline | Only the *transport* changes. Targets, quotas, 3 recalls, closed vocabulary, cues, translations, pronunciation, QC, recovery and SRS protections are untouched. There is no Haiku-specific rule anywhere. |
| Same QC for both | Haiku writes. **Every checker stays on Gemini**: judges, cue checks, naturalness, coherence and recovery audits. So do pronunciation, segmentation and gloss. Both models' output faces identical checks. |
| Logs | Per request: provider, requested model, model that actually answered, stage, attempt, retry reason, input/output/thinking tokens, stop reason, cost. The run report adds a per-provider section with cost by stage and the total. |
| Haiku pricing | US$0.10 input / US$0.50 output per million tokens, with thinking counted as output. Prompts over 100K tokens are priced at US$0.50 / US$2.50 (Daily prompts are around 2–4K tokens). Cache reads 0.1×, cache writes 1.25× (the app sends no caching). Batch is not used. |
| Spending ceiling and request limit | Per track, set in Settings. Defaults: US$0.25 and 300 Haiku requests. The worst case of the *next* request is checked **before** sending it. |
| No retries on billing, auth or credit errors | These errors stop the run at once; the rest of the track is not sent. Only rate limits, overloads, server errors and dropped connections are retried (at most 3 attempts), and each retry is logged. |
| Experimental generator stays off | The v684 teaching plan and Gen2 are still disabled. |

**Gemini differences, documented.** Gemini runs with thinking off, temperature 0.7 and a short output cap. Haiku runs with adaptive thinking at effort "low". It cannot take a temperature setting, and thinking counts toward its output cap, so its cap is set to 3× the Gemini cap (minimum 2048, maximum 16000). Prompts are identical. A "system" message becomes Anthropic's system prompt.

## 2. Exact files changed

| File | Change |
|---|---|
| `dev/tt.jsx` (+393 lines) | **New block "OPTIONAL GENERATION MODEL"** (just before the v675 benchmark block):<br>• model list, preference, run binding;<br>• request classification (writing / checking / support);<br>• Messages API request and reply mapping;<br>• error handling, cost, limits;<br>• `anthropicRequest` and `anthropicTestConnection`.<br>**Small hooks elsewhere:**<br>• the one routing line in `geminiRequest`;<br>• run binding in `aiBeginRun`;<br>• Anthropic pricing in `aiRecordEnd`;<br>• per-provider breakdown in `aiUsageSummary` and the report lines;<br>• `generationModel` on tracks, drafts and the export header;<br>• the existing-track entry points pass the track's own model;<br>• the `GenerationModelCard` in Settings;<br>• two loads at app start. |
| `netlify/edge-functions/anthropic.js` (new, 98 lines) | The server function. Holds the key and checks the site access code. Forwards only whitelisted fields, caps the request size, and never retries. Sends a keep-alive reply for long answers. |
| `netlify.toml` | Routes `/api/anthropic` to that function, next to the existing `/api/deepseek` entry. |
| `dev/tests45.js` (new) | The offline suite for this feature (69 checks). |
| `dev/sandbox/haiku_replay.js` (new) | Test helper. Answers `/api/anthropic` from recorded runs or the simulator. |
| `dev/sandbox/haiku_samples.js` (new, **paid, not run**) | Script for the first few real sample calls, once approved. |
| `dev/benchmark/run.js` | Two optional test hooks (`wrapFetch`, `prepare`). Default behaviour is unchanged. |
| `dev/tests13.js`, `tests37.js`, `tests38.js`, `tests39.js` | Guard tests updated precisely; see §5. |
| `dev/run_all.sh` | Adds tests45. |
| `dev/package.json`, `package-lock.json` | Test-only dev dependencies: the official Anthropic SDK 0.133.0, plus `react-test-renderer` 18.3.1. Older suites already used `react-test-renderer`, but it had never been recorded in `package.json`. |

Not touched: tracks, vocabulary banks or IDs, bookmarks, belts, SRS records, the production `index.html`, and `main`.

## 3. How the selector works

1. **Choosing.** Settings → **AI Generation Model** has two choices. Gemini is pre-selected.
2. **Extra fields for Haiku.** Picking Claude Haiku 5.5 shows:
   - the **site access code** field (the code you set on Netlify — *not* an Anthropic key);
   - the per-track **US$ ceiling** and **max requests**;
   - a **Test Connection** button. It sends one tiny paid request, and only when clicked.
3. **When the choice applies.** It takes effect for the **next** Daily, Revision or Weak-words track you start, in any language.
   - The track records which model wrote it.
   - Changing the setting mid-track does nothing to that track.
   - Continuing an old track (QC rebuild, Retry missing) always uses the model that made it.
   - A saved draft written by Haiku is only resumed while Haiku is selected, and vice versa. The app explains why.
4. **What stays on Gemini.** Listening tracks, Kru chat and word auto-fill always use Gemini, whatever the setting.
5. **Browser check.** Tested in a real browser with Chromium:
   - Gemini selected by default;
   - choosing Haiku reveals the extra fields;
   - the choice and the access code survive a page reload;
   - no AI request was sent at any point.

## 4. How authentication is secured

- **The Anthropic key never reaches the browser.** It is a Netlify environment variable (`ANTHROPIC_API_KEY`), read only inside the server function.
  - It is not in `index.html`, any committed JavaScript, device storage, logs or GitHub.
  - Tests scan the client files and confirm no Anthropic key appears and no direct call to `api.anthropic.com` is made.
- **The site access code (`LT_ACCESS_CODE`, chosen by you)** stops strangers from using your Anthropic credit through your site.
  - The server compares it in constant time.
  - It travels only in a request header to your own site. It never appears in logs, reports, the ledger or any Gemini request (tested).
  - You can change it at any time in Netlify.
- **Server-side guard rails, whatever the browser sends:**
  - it refuses to run unless both variables are set;
  - only the `claude-haiku-5-5` model is accepted;
  - output is capped at 16000 tokens and the request body at 300 KB;
  - temperature, top_p, top_k, tools and streaming are stripped out;
  - no CORS headers are sent, so other websites cannot call it;
  - no automatic retries.
- **Spend protection, three layers:**
  1. the per-track ceiling and request limit in the app;
  2. the 16000-token cap on the server;
  3. a monthly spend limit you set in the Anthropic Console (recommended in §8).

## 5. Test results (offline, no network, no cost)

### New suite `tests45.js`: **69 / 69 pass**

| Group | What it proves |
|---|---|
| S — setting (S1–S9) | Gemini default; values normalised; persistence; binding to Daily/Revision/Weak in all three languages; no mid-run change; existing tracks keep their model; labels; track stamping; drafts never mix models. |
| R — routing (R1–R6) | Only writing requests of a Haiku-bound run go to Haiku. Judges stay on Gemini, whether recognised by stage, prompt or verdict schema. Pronunciation and unnamed requests also stay on Gemini. A Gemini run is unchanged. Listening stays on Gemini. There is one switch point and no forked generator. |
| M — mapping (M1–M8) | Adaptive thinking and effort; no sampling parameters; system prompt handled; schema conversion; thinking blocks skipped; refusal, cut-off, empty, malformed and unexpected stops rejected ("valid JSON alone is not a pass"); a rejected reply is a failed candidate, not retried on Gemini. |
| E — failures (E1–E13) | Wrong access code, billing/credit, bad key, permission, not configured, not deployed and model unavailable each mean **one** request, never retried, nothing more sent that run, and a clear message. 429/529/dropped connections are retried and logged. No access code means nothing is sent. An error inside the keep-alive reply is handled by its real status. |
| C — cost (C1–C6) | Exact Haiku price with thinking; long-prompt price; cache price; per-provider summary (requests, failures, retries and reasons, tokens incl. thinking, cost, requested vs served model); the report text. A Gemini-only report is unchanged. |
| L — limits (L1–L4) | The request limit stops before sending. The US$ ceiling stops before it could be exceeded. Limits reset per track. Settings and the server cap are both present. |
| P — recorded live runs (P1–P4) | The three recorded live v682 Daily runs (99 / 178 / 250 requests) replayed with every writing request answered **through the Haiku path**. Result: **identical tracks**, every recorded request used exactly once. The writing requests went to Haiku (ja 58, th 82, zh 208) and all checks and pronunciation stayed on Gemini (41 / 96 / 42). |
| Q — QC cannot be bypassed (Q1–Q3) | With the simulated model, a Haiku-routed run equals the Gemini run. When "Haiku" puts an untaught word into **every** sentence, the existing checks reject it in all three languages: it never reaches the track, and the track ends not-ready or incomplete instead of accepting bad lines. |
| X — security / data (X1–X6) | No key in client files; key only on the server; access code never logged; only two new settings keys are written; no learner data written; experimental generators still off. |
| F — server function (F1–F8) | Field whitelist; model and turn checks; refusals (405/503/401/413/400) without contacting Anthropic; success path; the **real Anthropic SDK** on a mocked network (correct endpoint, key header, thinking, schema, no temperature); billing error after exactly one call; keep-alive for long answers; `netlify.toml` route. |

### Gemini path unchanged

The release proof replays the three recorded live Daily runs with Gemini selected (the default). Result: **527 / 527 requests byte-identical, tracks identical**. Re-run after the final change: ja 99/99, th 178/178, zh 250/250, all PASS.

### Full regression suite

**OFFLINE REGRESSION: OK.** All 43 suites plus the render test ran: 1494 checks passed.

The only failures are the three already documented before this work:
- tests33 2G (pre-existing since v677);
- tests35 2C-thTH and 2C-zhZH (blocked: the old listening logs are not in the package).

### Guard tests updated deliberately

Four older tests pinned "Gemini is the only AI provider" and "no new storage writes". This brief changes both on purpose, so each was narrowed to name exactly the new exception, not loosened:

- **tests13 I1.** Every other provider name is still banned everywhere. "Anthropic / Claude / Haiku" may appear only inside the new block, its Settings card and a dozen named routing / pricing / report lines. An Anthropic endpoint, key or key header in the client still fails the test.
- **tests13 I2.** One extra network call is allowed: the same-site `/api/anthropic`.
- **tests13 UI1.** Settings may show the two labelled choices, and no Haiku fields while Gemini is selected.
- **tests37 G3, tests38 O3, tests39 A6.** At most three new storage writes are allowed, and only for `tt-generation-model` and `tt-anthropic-site-access`.

## 6. Limitations and open points

1. **No real Haiku output has been seen yet.** Every test uses recorded Gemini text or the simulator. Whether Haiku writes *better* lessons is unknown until real calls are made. The offline tests prove only that its output is handled and checked exactly like Gemini's.
2. **Gemini still judges Haiku's work.** This keeps QC identical, as asked, but it does not give an independent quality verdict. A blinded native-speaker or reference comparison is still needed. A Gemini key remains required.
3. **Not yet run on Netlify.** Two things are only verifiable on a deploy preview:
   - whether Netlify's Edge runtime loads the SDK through the `npm:` import (the fallback is a plain `fetch` version of the same function);
   - the keep-alive reply, added because Netlify needs response headers within about 40 seconds.
4. **Cost per track is an estimate.** Claude's tokenizer can count Thai, Japanese and Chinese text differently from Gemini's, and the amount of adaptive thinking is unknown until measured. See §9.
5. **The default US$0.25 ceiling may stop a Mandarin track early.** A Mandarin track makes about 210 writing requests. For full-track trials, set the ceiling to about US$0.40.
6. **Effort level.** "low" was chosen for short structured lesson lines. "medium" may write better but costs more thinking; this is worth measuring in the comparison.
7. **The root `index.html` is still production v683.** To try Haiku in the app, a preview build of `index.html` from this branch must be deployed to a Netlify deploy preview. I have not done this; it needs your approval.
8. **Old, unused `/api/deepseek` function.** It still exists. It is an open relay (it uses the caller's own key and has CORS `*`), and the app no longer calls it. Not touched here, but worth removing separately.

## 7. Ready for user testing?

**Not yet. The code is ready; your setup and approval are what's missing.**

Testing requires:
- (a) an Anthropic key and access code in Netlify (§8);
- (b) your approval for me to create a **deploy preview** (a separate preview build, not production);
- (c) your approval for the small sample budget (§9).

After a successful Test Connection and the sample calls, it would be ready for you to try one Daily track per language on the preview.

## 8. Setup instructions (you do these; never paste a key into chat)

**A. Create the Anthropic key**

1. Go to **console.anthropic.com** and sign in (or create an account).
2. **Settings → Billing.** Add a payment method and a small credit, for example US$5.
3. **Settings → Limits.** Set a **monthly spend limit**, for example US$5.
4. **Settings → API keys → Create key.** Name it "Language Teacher (Netlify)" and copy the key. It is shown only once.

**B. Put it on Netlify (server side only)**

1. In Netlify, open the Language Teacher site, then **Site configuration → Environment variables → Add a variable**.
2. Add `ANTHROPIC_API_KEY` and paste the key there. If Netlify offers it, tick "Contains secret values".
3. Add `LT_ACCESS_CODE` and invent a long passphrase, for example four random words. This is what you will type into the app.
4. Save. These variables take effect on the next deploy or deploy preview.

**C. Try it (after I create the deploy preview, with your approval)**

1. Open the deploy-preview link, then **Settings → AI Generation Model → Claude Haiku 5.5 — Experimental**.
2. Type the `LT_ACCESS_CODE` passphrase and press **Save Access Code**.
3. Press **Test Connection**. You should see ✅ with the model name and a cost of a small fraction of a cent.
4. **To go back:** select **Gemini 2.5 Flash-Lite — Default**. To shut Haiku off completely, delete either variable in Netlify, or revoke the key in the Anthropic Console.

**D. (Optional) Let me run the sample calls from this cloud session**

Add the key to this session's environment:
- open the cloud environment menu in the session title bar → **Edit**;
- add a **network secret** (or environment variable) named `ANTHROPIC_API_KEY`.

A new session picks it up. I would then run `node sandbox/haiku_samples.js --confirm-paid`, but only after you approve the budget.

## 9. Estimated initial testing budget

**Step 1 — a few controlled sample calls (asking for approval now): cap US$0.05**

- **Test Connection:** 1 call, under US$0.001.
- **`haiku_samples.js`:** 3 real generation prompts, one per language, taken from the recorded live runs. They go through the app's own Haiku code and the real server function.
  - Worst case, if every reply used its full output allowance: about US$0.015.
  - Expected: under US$0.01.
- **What the calls check:** the reply comes back in the same JSON shape as Gemini's, plus the real token, thinking and cost numbers.
- **Hard caps:** at most 6 calls and US$0.05, set inside the script.

**Step 2 — later, separately approved: a comparison (no Daily Tracks before Step 1 is reviewed)**

These estimates come from the recorded runs' real prompt sizes, with 120 thinking tokens per request. Real thinking and tokenizer differences could plausibly raise the Haiku part by 2–3×.

| One Daily Track | Haiku (writing) | Gemini (checks) | Total (estimate → plausible high) |
|---|---|---|---|
| Japanese | US$0.038 | US$0.003 | US$0.04 → 0.12 |
| Thai | US$0.041 | US$0.011 | US$0.05 → 0.14 |
| Mandarin | US$0.059 | US$0.003 | US$0.06 → 0.18 |

One Haiku track per language plus a blinded comparison against the existing Gemini tracks would be **about US$0.15–0.45**. I would propose a **US$0.50 cap**, with a per-track ceiling of US$0.40 in Settings.

Nothing has been spent, and nothing will be until you approve.

---

## TL;DR

- **What's built:** Settings now offers **"Gemini 2.5 Flash-Lite — Default"** and **"Claude Haiku 5.5 — Experimental"** for Thai, Japanese and Mandarin tracks.
  - Gemini stays the default.
  - Each track remembers the model that made it, and old tracks never switch.
  - A Haiku failure stops with a clear message; it never quietly switches to Gemini.
- **Same checks for both:** Haiku only *writes*. All quality checks, pronunciation and teaching rules are unchanged and still run on Gemini.
- **Key is safe:** the Anthropic key lives only in a small Netlify server function, as a Netlify setting. It is never in the website, the browser, device storage or GitHub. The app only holds a site access code you choose.
- **Spend is capped:** a per-track US$ ceiling and request limit, a 16000-token cap on the server, and no retries on billing, key or credit errors. Every request is logged with provider, model, tokens (including thinking) and cost.
- **Offline tests pass:**
  - the new suite passes 69/69;
  - the three recorded live Daily tracks replay **identically** through the Haiku path;
  - text with deliberately untaught words is rejected by the existing checks;
  - the Gemini path is unchanged (527/527).
- **Not done:** no deployment and no paid calls.
- **Next steps:** add the key and access code in Netlify (§8), then approve **(1)** a deploy preview and **(2)** a **US$0.05** budget for 3–4 sample calls. A full comparison (about US$0.50) would be a separate decision afterwards.

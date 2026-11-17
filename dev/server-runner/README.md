# Track runner (stage S-1): write a track on a server while the phone is doing something else

A phone browser tab that is not in front is throttled or frozen, so a track that takes minutes to write can stall. This service runs the **real app page** in a headless Chromium on a server, drives it like a learner, and keeps the finished track until the phone comes back for it. Nothing of the app is ported: the same `index.html` the phone loads is opened, the learner's saved data is put where the app keeps it, the app's own screens are clicked through until the app has **saved the track**, and what it saved is returned.

This folder is **not part of the release** and **no button in the app uses it yet** (that is the next stage, listed at the end).

## Files

| File | What it is |
|---|---|
| `server.js` | the HTTP service: token, CORS, validation, the queue (one job at a time), status, results, cancel, purge |
| `runner.js` | one job: launches Chromium, seeds the page's storage, applies the network allowlist, drives the language's flow, collects the result, always closes the browser |
| `drivers.js` | the click path per language (`yue`, `th`; `ja` / `zh` say "not driven yet") |
| `jobspec.js` | what a job may contain, and the storage keys per language |
| `store.js` | job storage behind a four-method interface (memory + one file per job); how to swap in Cloud Storage / Firestore is explained in the file |
| `scrub.js` | removes the job's credentials (and key-shaped strings) from everything that leaves the service |
| `Dockerfile`, `package.json` | the container |
| `test/run.js` | the tests (plain node): `node dev/server-runner/test/run.js` |
| `test/fake-model-server.js`, `test/thai-stand-in.js` | the stand-in for the model function (no real model, no cost) |

## The API

All requests need the header `x-runner-token: <the shared secret>` (compared with the environment variable `RUNNER_TOKEN`). The only request without it is the browser's CORS preflight (`OPTIONS`), which carries no data. Bodies are JSON. Errors look like `{"error":{"code":"...","message":"..."}}`.

### `POST /jobs` → 202 `{ "id": "<32 hex>", "state": "queued", "queuePosition": 0 }`

```json
{
  "language": "yue",                       // th | ja | zh | yue   (anything else: 400)
  "mode": "daily",                         // daily | revision
  "timezone": "Asia/Singapore",            // optional; the device clock the app uses (greeting hour, "today")
  "timeLimitSec": 1500,                    // optional, 30 .. RUNNER_JOB_TIME_LIMIT_SEC
  "data": {                                // the learner's saved data, EXACTLY as the page keeps it in localStorage (parsed JSON), only these keys:
    "tt-yue-vocab": [ { "id": 1, "status": "learning", "...": "..." } ],
    "tt-yue-tracks": [ { "createdAt": "...", "pairs": [] } ],
    "tt-yue-daily-new": { "date": "2026-11-17", "wordIds": [1, 2, 3] }
  },
  "model": {                               // what Settings -> AI Generation Model holds
    "model": "claude-haiku-5-5",           // or "gemini-2.5-flash-lite"
    "serverUrl": "https://<the model function>.run.app",     // for claude-haiku-5-5 (https only)
    "accessCode": "<the site access code>",                  // for claude-haiku-5-5
    "geminiKey": "<Gemini key>",                             // for gemini-2.5-flash-lite
    "limitUsd": 0.25, "limitRequests": 300                   // optional, as in Settings
  }
}
```

Allowed `data` keys: `th` `tt-vocab`, `tt-tracks`, `tt-daily-new`, `thaiTeacherSettings` · `ja` `tt-ja-vocab`, `tt-ja-tracks`, `tt-ja-daily-new`, `tt-ja-register` · `zh` `tt-zh-vocab`, `tt-zh-tracks`, `tt-zh-daily-new`, `tt-zh-grammar`, `tt-zh-settings` · `yue` `tt-yue-vocab`, `tt-yue-tracks`, `tt-yue-daily-new`, `tt-yue-settings`. Anything else (another language's key, a credential key, a path) is refused. A key left out is simply empty, as for a new learner (the app then starts from its own word bank). Unknown fields, an unknown model, a model address that is not https, or an address that is not on `RUNNER_ALLOWED_MODEL_HOSTS` (when set) are refused with the reasons in `details`. Nothing in a job is ever executed or used as a file path.

Other answers: 400 `invalid_job` / `bad_json`, 401 `unauthorized`, 403 `origin_not_allowed`, 413 `request_too_large`, 415, 429 `queue_full`.

### `GET /jobs/:id` → 200

```json
{ "id": "...", "state": "queued|running|done|failed", "language": "yue", "mode": "daily",
  "createdAt": "...", "startedAt": "...", "finishedAt": "...", "expiresAt": "...", "queuePosition": null,
  "progress": { "phase": "quality review", "wordsDone": 42, "wordsTotal": 42, "requests": 1, "costUsd": 0.00045 },
  "log": [ "the last 300 lines the page produced, with credentials removed" ],
  "error": null }
```
`wordsDone / wordsTotal` are the recalls the app has written / will write (the app's own progress counter), `requests` and `costUsd` come from the app's own request ledger (non-zero only when a model is asked). `error` is the app's own reason in plain words when `state` is `failed` (for example "You already have 3 tracks for today", "the job time limit (25 min) was reached", "the runner restarted before this job finished; submit it again"). 404 once the job is purged or never existed.

### `GET /jobs/:id/result` → 200 (409 `not_ready` while queued / running / failed)

```json
{ "language": "yue", "mode": "daily",
  "track": { "...": "the new track exactly as the app saved it" },
  "newTracks": [ ],
  "storage": { "tt-yue-tracks": [ ], "tt-yue-daily-new": { }, "tt-yue-vocab": [ ] },
  "changedKeys": [ "tt-yue-vocab", "tt-yue-tracks", "tt-yue-daily-new" ],
  "unchangedKeys": [ ],
  "usage": { "requests": 1, "costUsd": 0.00045 },
  "notes": [ "anything the learner should be told, e.g. the app says the track is not ready, or its quality review failed" ],
  "finishedAt": "..." }
```
`storage` holds, for each of the language's vocabulary / tracks / daily-new keys that **changed**, the value the page stored — what the app would have saved locally. `track` / `newTracks` are the tracks that were not in the job's `data`. Everything is scrubbed.

### `DELETE /jobs/:id` → 200 `{ "deleted": true }`
Cancels the job if it is waiting or running (the browser is closed) and purges it. Afterwards `GET` answers 404.

## What the runner does for a job

1. Starts a Chromium (one at a time; closed in `finally`, whatever happens; no profile, cache or service worker on disk).
2. Opens the app page and, **before the page's own code runs**, seeds `localStorage` / `sessionStorage` the way the app keeps them: the data keys (JSON text), `tt-active-language`, `tt-generation-model` (`{model, limitUsd, limitRequests, serverUrl}`), `tt-anthropic-site-access` (the access code) or `tt-gemini-key`. For Thai / Japanese / Mandarin with the optional model and no Gemini key, a fixed non-secret marker is stored in `tt-gemini-key` because those screens only enter their model path when a key is present (no request goes to Gemini).
3. Blocks the network except: the page itself, react / react-dom / babel (served from `node_modules`, not the CDN), the job's own model address, and `generativelanguage.googleapis.com` for a Gemini job. Anything else (for example the Google Fonts stylesheet) is refused, and the host is named in the log.
4. Waits for the language's dashboard, wraps the page's generator function so its progress and log callbacks are copied out (arguments and result pass straight through), then clicks through the screens a learner uses until the app has **saved the track**, and waits until nothing more is being written and no request is in flight.
5. Stops on completion, on the app's own failure screen (its reason becomes the job's `error`), on the job time limit, on cancel, or if the page crashes.

Credentials: the access code / Gemini key live in the request body, in the seeded storage of a browser that exists for that one job, and in the page's memory. The job record that is stored (memory, and a file with mode 0600) never contains them; every log line, error, status and result goes through `scrub.js` (plain, URL-encoded, JSON-escaped and base64 forms, `key=…` in a URL, key-shaped strings). The service prints nothing from a request body.

## Languages

| Language | State | How it is driven |
|---|---|---|
| Cantonese (`yue`) | **driven and tested** end to end with the stand-in model | Dashboard → *Daily Track* / *Revision Track* → *Build the track* (modules, no model) → the automatic AI quality review (one request, the AI review stage) → *Study track*, which is the screen's own save of the track, the daily-new slots and the vocabulary. A failed or not-run review does not fail the job; it is in `track.qualityReview` and in `notes`. |
| Thai (`th`) | **driven**; ran to the app's save with the stand-in model (readiness depends on the stand-in's fixed sentence frames) | Dashboard → *Daily Track* / *Revision Track* → the scene is written → *Generate Track from this Scene* → words, checks, quality check → *Start SRS Track* (or *Start anyway* when the app says the track is not ready; `notes` says so with the app's count, e.g. 102/105). The Listening track is a separate track in the app and is not part of this job. |
| Japanese (`ja`), Mandarin (`zh`) | **not driven yet**: the job fails at once with "the ... flow is not driven yet" | They need (1) a click path checked against their screens (same shape as Thai: scene preview → generate → study) and (2) stand-in replies for their prompts (segments with readings are needed) to test it without a real model. Neither exists yet; the storage keys and validation are already in place. |

## Environment variables

| Variable | Meaning |
|---|---|
| `RUNNER_TOKEN` | **required**: the shared secret for the `x-runner-token` header. The service will not start without it. Put it in Secret Manager, never in a file. |
| `RUNNER_PAGE` | **required**: the page to open. Either the app's address (`https://mrkleinman.github.io/Language-Teacher/` — use the address you open on the phone) or the path of a built `index.html`. |
| `RUNNER_PAGE_ORIGIN` | with a page *file*: serve it as if it came from this https origin (for example `https://mrkleinman.github.io`). **Needed with a file**: the model function only answers the app's own origin, and a page opened from a file has the origin `null`. Not needed with an https `RUNNER_PAGE`. |
| `RUNNER_ALLOWED_ORIGINS` | comma list of origins allowed to call this service from a browser (the app's origin, `https://mrkleinman.github.io`). A request from any other origin gets 403; requests without an `Origin` header (curl) are fine with the token. |
| `RUNNER_ALLOWED_MODEL_HOSTS` | optional comma list of host names a job's `serverUrl` may use (set it to your model function's host). Recommended. |
| `RUNNER_JOB_TIME_LIMIT_SEC` | the longest a job may run (default 1500 = 25 min); also the ceiling for a job's own `timeLimitSec`. |
| `RUNNER_RESULT_TTL_SEC` | how long a finished job is kept (default 86400 = 24 h), then purged; a sweep runs every `RUNNER_SWEEP_SEC` (60). |
| `RUNNER_MAX_BODY_BYTES` | request cap (default 8 MB). `RUNNER_MAX_QUEUE` jobs may wait (default 5; more → 429). |
| `RUNNER_DATA_DIR` | where job files go (default the system temp folder; empty = memory only). |
| `RUNNER_CHROMIUM_ARGS` | extra Chromium flags; the container sets `--no-sandbox --disable-dev-shm-usage --disable-gpu`. |
| `PORT` | the port (default 8080; Cloud Run sets it). |
| `RUNNER_VENDOR_DIR` | where `react/`, `react-dom/`, `@babel/standalone/` are (default `node_modules` next to the files, then `../node_modules`). Without them the page would fetch them from unpkg. |
| `RUNNER_ALLOW_LOCAL_MODEL`, `RUNNER_TEST_GEMINI_BASE` | **tests only**: allow `http://127.0.0.1` model addresses; answer the page's Gemini calls from the stand-in. Never set in production. |

## Run it here

```bash
cd dev
python3 build_index.py tt.jsx build/index-1.shell.html /tmp/runner-test/index.html v999     # a test build, never a release folder
cd server-runner && npm install                                                              # playwright, react, react-dom, @babel/standalone
npx playwright install chromium                                                              # once, if the browser is not there yet
RUNNER_TOKEN=local-test-token RUNNER_PAGE=/tmp/runner-test/index.html RUNNER_PAGE_ORIGIN=https://mrkleinman.github.io \
  RUNNER_ALLOWED_ORIGINS=http://localhost:8000 node server.js
```
Tests (build the page themselves, start stand-in models on 127.0.0.1, take about 12 minutes with the Thai flows; `RUNNER_TEST_SKIP_THAI=1` skips them). With the stand-in a Cantonese job takes about 12 s and a Thai job about 3.5 minutes (about 200 requests, answered instantly: with a real model add its time per request):
```bash
node dev/server-runner/test/run.js
```

## Deploy on Google Cloud Run (step by step)

You already run a small Cloud Run function for the model. This is a second, separate service in the same project and region. About 20 minutes. **Never paste a key or the token into a chat or into GitHub.**

1. **Open Cloud Shell** (console.cloud.google.com → the **>_** button, top right) in the project that holds the model function. Enable what the build needs (once): `gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com secretmanager.googleapis.com`
2. **Get the code** into Cloud Shell: `git clone --branch claude/session-continuation-check-a19meq https://github.com/mrkleinman/Language-Teacher.git && cd Language-Teacher/dev/server-runner`
3. **Make the shared token and keep it in Secret Manager.** It is shown once so you can copy it into the app's Settings later:
   ```bash
   TOKEN=$(openssl rand -hex 24); echo "Runner token (copy it now): $TOKEN"
   printf '%s' "$TOKEN" | gcloud secrets create language-teacher-runner-token --data-file=-
   PROJECT_NUMBER=$(gcloud projects describe $(gcloud config get-value project) --format='value(projectNumber)')
   gcloud secrets add-iam-policy-binding language-teacher-runner-token --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" --role=roles/secretmanager.secretAccessor
   ```
4. **Deploy** (Cloud Build builds the `Dockerfile` in this folder; the first build takes several minutes because it installs Chromium). Use the **same region as the model function**; replace the two addresses:
   ```bash
   gcloud run deploy language-teacher-runner --source . --region asia-southeast1 \
     --allow-unauthenticated \
     --no-cpu-throttling \
     --cpu 2 --memory 4Gi \
     --min-instances 1 --max-instances 1 --concurrency 20 \
     --timeout 300 \
     --set-secrets RUNNER_TOKEN=language-teacher-runner-token:latest \
     --set-env-vars RUNNER_PAGE=https://mrkleinman.github.io/Language-Teacher/,RUNNER_ALLOWED_ORIGINS=https://mrkleinman.github.io,RUNNER_ALLOWED_MODEL_HOSTS=<host of your model function, e.g. language-teacher-anthropic-xxxx.asia-southeast1.run.app>
   ```
   What each setting is for:
   * `--no-cpu-throttling` (CPU always allocated): **required.** The job keeps running after `POST /jobs` has answered; without it Cloud Run takes the CPU away between requests and the job stalls, which is the very problem this service exists to remove.
   * `--min-instances 1 --max-instances 1`: keeps the one instance alive (and the only one, so the queue and the results are in one place). With `--min-instances 0` Cloud Run may stop the instance while the phone is away and nothing is polling; the job and its result are then lost (the app sees 404 or "the runner restarted… submit it again"). Cost: an always-on instance is billed all the time; check the Cloud Run pricing page for your region and put a **budget alert** on the project.
   * `--cpu 2 --memory 4Gi`: Chromium compiles a 16 MB page in the browser (Babel) and then runs it. Measured here (Cantonese Daily and Thai Daily alike): the Chromium processes add up to about 2.4 GB of resident memory at the peak (pages shared between its processes are counted once per process, so the real figure is lower), which leaves no margin in 2 GiB. If a job fails with "the browser page crashed", raise it further.
   * `--timeout 300`: the longest a single HTTP request may take. Every request here is short (the job itself is not a request), so the default is plenty.
   * `--concurrency 20`: the service can answer polls while a job runs; only one job runs at a time whatever this is.
   * `--allow-unauthenticated`: the phone's browser calls the service directly, and the only lock is the token (like the model function's access code). Hence a long random token and HTTPS only.
   * `RUNNER_PAGE=https://…`: the runner opens **the live app**, so it always runs the same version the phone runs and the model function sees the app's own origin. (To pin a build instead, copy a built `index.html` next to the files, add `COPY index.html ./page/index.html` to the Dockerfile and set `RUNNER_PAGE=/app/page/index.html` and `RUNNER_PAGE_ORIGIN=https://mrkleinman.github.io`.)
5. **Check it.** Cloud Run prints the service address (`https://language-teacher-runner-….run.app`). Then:
   ```bash
   URL=<the address>; curl -s -o /dev/null -w '%{http_code}\n' $URL/jobs/00000000000000000000000000000000                          # 401: it is up and wants the token
   curl -s -H "x-runner-token: $TOKEN" $URL/jobs/00000000000000000000000000000000                                                     # {"error":{"code":"not_found",...}}
   ```
6. **Put the address and the token into the app** once the next stage (below) has added the setting. Until then nothing uses the service.
7. **Allow the app to call it**: `RUNNER_ALLOWED_ORIGINS` already lists the app's site. The model function's own `ALLOWED_ORIGINS` needs no change: the runner's page runs under the same origin.
8. **To change the token later**: add a new secret version (`gcloud secrets versions add language-teacher-runner-token --data-file=-`), then `gcloud run services update language-teacher-runner --region asia-southeast1` (a new revision reads `latest`), and enter the new token in the app.

### Things to know
* **Instances restart.** Cloud Run replaces instances (deploys, crashes, maintenance). The jobs and results are in the instance's memory and disk, which go with it; a job that was running or waiting is then gone, and the app must say "submit it again". For results that survive, write a store class for Cloud Storage or Firestore (the four methods and how are described at the top of `store.js`) and pass it to `createServer({ store })`.
* **A model is paid per request.** A Thai Daily is about 200 requests with the stand-in; the app's own limits (`limitUsd`, `limitRequests` in the job, as in Settings) stop a run that costs too much, exactly as on the phone.
* **Memory.** A job needs about 2.5 GB at its peak (measured). When the machine runs short the browser is killed and the job fails with "the browser page crashed" (this happened here when other work shared the same memory limit). One job at a time is by design; do not raise `--max-instances` above 1 without also giving each instance enough memory.
* **The runner's Chromium has no sandbox** inside the container (`--no-sandbox`, needed on Cloud Run); it only opens the app's own page, with the network allowlist above.

## What the app side must do (the next stage — not done)

1. **Settings**: a "runner address" and "runner token" stored on the device like the other settings (never logged, never in a track or export); a way to test them (`GET /jobs/<32 zeros>` with the token: 404 = good, 401 = wrong token).
2. **A "write in the background" button** on the Daily / Revision screens (the language's own screen). It gathers, from the same state the generator uses: the language's `vocab`, the recent `tracks` (the last 10 are enough for selection and the daily cap; the daily cap counts tracks dated today), `daily-new`, the model preference and the site access code / Gemini key from storage, the device time zone (`Intl.DateTimeFormat().resolvedOptions().timeZone`) — and POSTs the job. It stores `{ id, language, mode, submittedAt, the ids and JSON of what it sent }` on the device so a reload, another tab or coming back later resumes. Handle 400 (show `details`), 401, 413 (send fewer tracks), 429 (queue full), network errors.
3. **Poll** `GET /jobs/:id` every 3–5 s while the page is visible, once on `visibilitychange` / `focus` / `online`, and show `progress` (phase, `wordsDone / wordsTotal`, requests, cost) and the last log lines; a Cancel button → `DELETE`.
4. **Import the result with the same merge the app uses for a finished track**: tracks through the three-way merge (`stSyncCommit` / `stMerge3` with `ST_TRACK_OPTS`, ids by `stTrackId`, the list capped at 20); the daily-new slots through `stSet`; vocabulary only for the words whose JSON differs from what was sent, merged with `ST_VOCAB_OPTS` (the learner may have rated words on the phone meanwhile; the newer progress wins). Then do what the screen's `onTrackGenerated` does after the save for that language (for Thai: nothing further is needed for the save itself; the page already ran `stampTrackMode`, the framing words and the queue clear), navigate to the track, and `DELETE` the job to purge it.
5. **Failure and edge cases**: `failed` → show `error` in plain words and keep the learner's data untouched; 404 → "the runner no longer has this job (it restarted or the result expired after 24 h): write it again"; `done` with `notes` → show them (for example "the app says the track is not ready (102/105)" with a choice to study it anyway, or "the quality review failed"); only one pending job per language; do not start a phone-side generation for the same language and mode meanwhile (the slots and the daily cap would be counted twice).
6. **Tests** in the app's own suite: the request builder (exact keys, no credential in logs or tracks), the import (merge keeps another tab's track and a newer rating), the poll states.

Size of that work: a Settings card, one module for the job (submit / poll / import) and a small progress panel, about 400–600 lines in `tt.jsx` plus tests; no change to any generator.

## What was and was not tested

Tested here (`test/run.js`; 64 checks without the Thai flows, 67 with them — the last full run with the Thai flows passed all but one check, which an out-of-memory kill of the browser had broken and which was then fixed and re-run without the Thai flows): validation; the token, CORS, body cap, queue, lifecycle, cancel, purge, restart behaviour and secret scrubbing without a browser; then, in a **real headless Chromium running the real page** with a **stand-in model on 127.0.0.1**: Cantonese Daily and Revision (including the AI review stage, a flagged line, a failed review, the app's own refusal "3 tracks today", the time limit, cancel while the model is busy, the Gemini path, the origin check), and the Thai Daily and Revision flows to the app's save.

**Not tested:** a real model (every reply here is canned; the Thai stand-in's fixed sentence frames mean the track may be "not ready" for some words, and the real model's replies, speed, rate limits and cost are unknown); Cloud Run itself (CPU allocation, instance restarts, the container build: no Docker and no Cloud Run were available, so the `Dockerfile` has not been built); the Japanese and Mandarin flows; the app side (it does not exist yet); a real phone going to the background.

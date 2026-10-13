#!/usr/bin/env bash
# Language Teacher — one-step setup of the Claude Haiku server on Google Cloud.
# Run it in Google Cloud Shell (the >_ button at the top of console.cloud.google.com):
#
#   bash <(curl -sL https://raw.githubusercontent.com/mrkleinman/Language-Teacher/claude/session-continuation-check-a19meq/dev/server/google-cloud-anthropic/deploy.sh)
#
# It asks for your Anthropic API key (typed hidden, stored only in Google Secret Manager) and makes up a site access
# code for you. At the end it prints the two things to enter in the app: the Server address and the access code.
# Running it again is safe: it updates the same server (and can replace the key).
set -euo pipefail

SERVICE="language-teacher-anthropic"
REGION="${REGION:-asia-southeast1}"
SECRET="anthropic-api-key"
SITE="${ALLOWED_ORIGINS:-https://mrkleinman.github.io}"
SRC_REF="053245d7c34bd50f913563986a80cabb3967a478"   # the tested version of index.js / package.json
RAW="https://raw.githubusercontent.com/mrkleinman/Language-Teacher/${SRC_REF}/dev/server/google-cloud-anthropic"

say()  { printf '\n\033[1m%s\033[0m\n' "$*"; }
fail() { printf '\n\033[31m✗ %s\033[0m\n' "$*"; exit 1; }
TTY="${LT_TTY:-/dev/tty}"   # where answers are typed (tests pass a file)
ask()  { local __v; read -r -p "$1" __v < "$TTY" >&2; printf '%s' "$__v"; }

command -v gcloud >/dev/null || fail "Please run this in Google Cloud Shell (the >_ button at the top of console.cloud.google.com)."

# 0. Cloud Shell must be signed in to your Google account (one-time: link → Allow → paste the code back)
if [ -z "$(gcloud auth list --filter=status:ACTIVE --format='value(account)' 2>/dev/null)" ]; then
  say "First, sign Cloud Shell in to your Google account: open the link below, choose your account, click Allow, then paste the code back here."
  gcloud auth login --no-launch-browser < "$TTY" || fail "Sign-in did not finish. Run this line again."
fi

# 1. which Google Cloud project
PROJECT="$(gcloud config get-value project 2>/dev/null || true)"
if [ -z "$PROJECT" ] || [ "$PROJECT" = "(unset)" ]; then
  say "Your Google Cloud projects:"
  gcloud projects list --format="table(projectId,name)" || true
  PROJECT="$(ask 'Type the PROJECT_ID to use (left column) and press Enter: ')"
fi
[ -n "$PROJECT" ] || fail "No project chosen."
gcloud config set project "$PROJECT" >/dev/null
say "Using project: $PROJECT (region $REGION)"

# 2. billing must be on (Cloud Run needs it; this usage normally stays inside the free allowance)
BILLING="$(gcloud billing projects describe "$PROJECT" --format='value(billingEnabled)' 2>/dev/null || echo unknown)"
if [ "$BILLING" = "False" ]; then
  fail "Billing is not switched on for $PROJECT. Open console.cloud.google.com → Billing → link a billing account to this project, then run this again."
fi

# 3. switch on the Google services it needs
say "Switching on Cloud Run, Cloud Build, Artifact Registry and Secret Manager (first time: about 1 minute)…"
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com secretmanager.googleapis.com --quiet

# 4. the Anthropic key → Secret Manager (typed hidden; never shown, never saved anywhere else)
if gcloud secrets describe "$SECRET" >/dev/null 2>&1; then
  REPLACE="$(ask 'An Anthropic key is already stored. Replace it? (y/N): ')"
else
  REPLACE="y"
  gcloud secrets create "$SECRET" --replication-policy=automatic --quiet >/dev/null
fi
if [ "${REPLACE,,}" = "y" ]; then
  say "Paste your Anthropic API key (it starts with sk-ant-). Nothing will appear while you paste — that is normal. Then press Enter."
  read -r -s KEY < "$TTY"; echo
  case "$KEY" in sk-ant-*) ;; *) fail "That does not look like an Anthropic API key (it should start with sk-ant-). Nothing was changed.";; esac
  printf '%s' "$KEY" | gcloud secrets versions add "$SECRET" --data-file=- --quiet >/dev/null
  unset KEY
  echo "✓ key stored in Secret Manager"
fi

# 5. the site access code (what you type in the app) — made up for you unless you want your own
CODE="$(ask 'Press Enter to get a random site access code, or type your own (at least 12 characters): ')"
if [ -z "$CODE" ]; then CODE="lt-$(head -c 18 /dev/urandom | base64 | tr -dc 'a-zA-Z0-9' | head -c 20)"; fi
[ "${#CODE}" -ge 12 ] || fail "The access code must have at least 12 characters."

# 6. permissions for the server (read the key) and for the build
NUM="$(gcloud projects describe "$PROJECT" --format='value(projectNumber)')"
SA="${NUM}-compute@developer.gserviceaccount.com"
gcloud secrets add-iam-policy-binding "$SECRET" --member="serviceAccount:$SA" --role=roles/secretmanager.secretAccessor --quiet >/dev/null
gcloud projects add-iam-policy-binding "$PROJECT" --member="serviceAccount:$SA" --role=roles/run.builder --condition=None --quiet >/dev/null 2>&1 || true

# 7. fetch the tested server code and deploy it
DIR="$(mktemp -d)"
curl -fsSL "$RAW/index.js" -o "$DIR/index.js" || fail "Could not download the server code."
curl -fsSL "$RAW/package.json" -o "$DIR/package.json" || fail "Could not download the server code."
say "Building and starting the server (2–4 minutes)…"
gcloud run deploy "$SERVICE" --source "$DIR" --function anthropic --base-image nodejs22 --region "$REGION" \
  --allow-unauthenticated --timeout 300 --max-instances 2 --memory 512Mi \
  --set-env-vars "LT_ACCESS_CODE=${CODE},ALLOWED_ORIGINS=${SITE}" \
  --set-secrets "ANTHROPIC_API_KEY=${SECRET}:latest" --quiet

URL="$(gcloud run services describe "$SERVICE" --region "$REGION" --format='value(status.url)')"
[ -n "$URL" ] || fail "The server did not start. Scroll up for Google's message."

# 8. it must be reachable without a Google login (the access code protects it instead)
if ! curl -s "$URL" | grep -q '"type":"error"'; then
  gcloud run services update "$SERVICE" --region "$REGION" --no-invoker-iam-check --quiet >/dev/null 2>&1 || true
fi
CHECK="$(curl -s -X POST "$URL" -H 'Content-Type: application/json' -H "x-lt-access: $CODE" -d '{"model":"none","messages":[{"role":"user","content":"x"}]}' || true)"
case "$CHECK" in
  *'model not allowed'*) OK="✓ server is running and your access code works (this check did not contact Anthropic)";;
  *) OK="⚠ server answered: ${CHECK:0:160}";;
esac

printf '\n\033[32m%s\033[0m\n' "$OK"
cat <<EOF

────────────────────────────────────────────────────────────────────
 Now open Language Teacher → Settings → AI Generation Model
 → Claude Haiku 5.5 — Experimental, and enter:

   Server address :  $URL
   Access code    :  $CODE

 Press "Save Address & Limits", "Save Access Code", then "Test Connection".
 (Keep the access code private. Lost it? Run this script again to set a new one.)
────────────────────────────────────────────────────────────────────
EOF

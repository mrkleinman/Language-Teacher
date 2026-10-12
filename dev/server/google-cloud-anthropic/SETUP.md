# Claude Haiku for Language Teacher: Google Cloud setup

Language Teacher is a static website on GitHub Pages, so it cannot keep a secret. This small Google Cloud function keeps your Anthropic API key and passes the app's requests on to Claude Haiku.

- About 15 minutes, once.
- **Never paste the key into a chat, the app or GitHub.**

## Easiest way: one line in Google Cloud Shell (about 10 minutes)

1. **Get an Anthropic key.** Go to **console.anthropic.com**.
   - **Settings → Billing:** add a small credit (for example US$5).
   - **Settings → Limits:** set a monthly spend limit (for example US$5).
   - **Settings → API keys → Create key:** copy the key. It starts with `sk-ant-` and is shown only once.
2. **Open Google Cloud.** Go to **console.cloud.google.com** and sign in with your Google account.
   - At the top, pick the project your Gemini key belongs to, or create a new one.
   - The project needs **billing** linked (**Billing → Link a billing account**). This usage normally stays inside the free allowance.
3. **Open Cloud Shell.** Click the **>_** button (top right, "Activate Cloud Shell"). A black terminal window opens at the bottom. If asked, click **Authorize**.
4. **Paste this one line** into the terminal and press **Enter**:

   ```
   bash <(curl -sL https://raw.githubusercontent.com/mrkleinman/Language-Teacher/claude/session-continuation-check-a19meq/dev/server/google-cloud-anthropic/deploy.sh)
   ```

5. **Answer the questions:**
   - **Paste your Anthropic key** and press Enter. Nothing appears while you paste; that is normal.
   - **Press Enter** to get a random access code.
   - Then wait 3–5 minutes.
6. **Copy what it prints.** At the end you'll see a **Server address** (ending in `.run.app`) and an **Access code**. Enter both in the app: **Settings → AI Generation Model → Claude Haiku 5.5**, then **Save Address & Limits**, **Save Access Code** and **Test Connection**.

If the script stops with a message, it says what to do (for example "switch on billing"). Running it again is safe.

---

## The manual way (Google Cloud console forms) — only if you prefer clicking

## 1. Anthropic key

1. Go to **console.anthropic.com**. Under **Settings → Billing**, add a small credit (for example US$5).
2. Under **Settings → Limits**, set a **monthly spend limit** (for example US$5).
3. Under **Settings → API keys → Create key**, name it "Language Teacher" and copy the key. It is shown only once.

## 2. Google Cloud project

1. Go to **console.cloud.google.com**. You can use the project that holds your Gemini key, or create a new one.
2. The project needs **billing switched on**: **Billing → Link a billing account**.
   - This usage normally stays inside the free monthly allowance.
   - Cloud Run gives 2 million requests a month free; a Daily Track is about 60–210 requests.
3. If asked, enable these APIs: **Cloud Run Admin API**, **Cloud Build API** and **Artifact Registry API** (the console offers a button).

## 3. Store the key as a secret (recommended)

1. Search for **Secret Manager** and click **Create secret**.
2. Name: `anthropic-api-key`. Secret value: paste the Anthropic key. Click **Create**.

## 4. Create the function

1. Search for **Cloud Run** and click **Write a function** (it may also say "Create service" → "Use an inline editor to create a function").
2. Fill in:
   - **Service name:** `language-teacher-anthropic`
   - **Region:** one near you, for example `asia-southeast1` (Singapore)
   - **Runtime:** Node.js 22
   - **Authentication:** **Allow unauthenticated invocations** (public access). The site access code protects it instead.
3. Open **Container(s), Volumes, Networking, Security**:
   - **Settings → Request timeout:** `300` seconds.
   - **Revision scaling → Maximum number of instances:** `2`.
   - **Variables & Secrets → Add variable:** name `LT_ACCESS_CODE`, value: a long passphrase you invent (for example four random words). You will type this in the app.
   - **Variables & Secrets → Reference a secret:** secret `anthropic-api-key`, version `latest`, exposed as **environment variable** `ANTHROPIC_API_KEY`.
     - If it asks for permission for the service account to read the secret, accept.
     - *(Simpler but less private: add a plain variable `ANTHROPIC_API_KEY` with the key instead.)*
4. Click **Create**. On the source screen:
   - **Function entry point:** `anthropic`
   - Replace **index.js** with the contents of this folder's `index.js`.
   - Replace **package.json** with the contents of this folder's `package.json`.
5. Click **Save and redeploy**. Wait until it shows a green tick, then copy the **URL** at the top. It looks like `https://language-teacher-anthropic-…run.app`.

## 5. In the app

1. Open Language Teacher, then **Settings → AI Generation Model → Claude Haiku 5.5 — Experimental**.
2. **Server address:** paste the URL from step 4.5, then press **Save Address & Limits**.
3. **Site access code:** type your `LT_ACCESS_CODE` passphrase, then press **Save Access Code**.
4. Press **Test Connection**. You should see ✅, the model name and a cost of a small fraction of a cent.

## If something goes wrong

The Test Connection message names the problem:

| Message | What to do |
|---|---|
| "no Haiku server function at …" | Check the server address. |
| "refused the request … allow unauthenticated" | Cloud Run → your service → **Security** → allow public access. |
| "does not accept requests from this site" | Your site is not at `https://mrkleinman.github.io`. Add a variable `ALLOWED_ORIGINS` with your site's address (for example `https://www.example.com`), then redeploy. |
| "not set up" | One of `ANTHROPIC_API_KEY` / `LT_ACCESS_CODE` is missing on the function. |
| "access code … missing or wrong" | Retype the passphrase in the app. |
| "billing / credit problem" | Add credit in the Anthropic Console. |

## To switch Haiku off

- **In the app:** select **Gemini** in Settings.
- **Completely:** delete the Cloud Run service, or revoke the key in the Anthropic Console.

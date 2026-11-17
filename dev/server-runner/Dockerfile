# The track runner: a Node service that drives the real app page in a headless Chromium.
# No secret is baked in: the shared token, the allowed origin and the page address arrive as environment variables when the container runs, and a job's
# model address / access code arrive in the job request and live in memory for that job only.
#
# Build (from the repository root, so the page can be built and copied in if you choose to bake it):
#   gcloud run deploy ... --source dev/server-runner        (Cloud Build builds this file; see README.md)
FROM node:22-bookworm-slim

ENV NODE_ENV=production \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright \
    RUNNER_CHROMIUM_ARGS="--no-sandbox --disable-dev-shm-usage --disable-gpu" \
    PORT=8080

WORKDIR /app
COPY package.json ./
# Chromium and the system libraries it needs, installed as root; react / react-dom / babel are the files the page loads from a CDN (served locally to the page)
RUN npm install --omit=dev --no-audit --no-fund \
 && npx playwright install --with-deps chromium \
 && rm -rf /var/lib/apt/lists/* /root/.npm \
 && chmod -R a+rX /ms-playwright

COPY server.js runner.js drivers.js jobspec.js scrub.js store.js ./

# a non-root user; the job files go to a folder only it can write
RUN useradd --create-home --uid 10001 runner && mkdir -p /data && chown runner /data
ENV RUNNER_DATA_DIR=/data
USER runner

EXPOSE 8080
CMD ["node", "server.js"]

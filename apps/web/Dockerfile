FROM node:24-slim AS base
COPY --from=oven/bun:1.3.3 /usr/local/bin/bun /usr/local/bin/bun
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# Dependencies only depend on the manifests, so this layer stays cached until a
# package.json or bun.lock changes. Only the web app's dependency graph is
# installed; the Expo/React Native app is skipped.
FROM base AS deps
COPY package.json bun.lock ./
COPY apps/web/package.json apps/web/package.json
COPY apps/native/package.json apps/native/package.json
COPY packages/api/package.json packages/api/package.json
COPY packages/auth/package.json packages/auth/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/env/package.json packages/env/package.json
COPY packages/ui/package.json packages/ui/package.json
RUN --mount=type=cache,target=/root/.bun/install/cache \
  bun install --frozen-lockfile --filter web

FROM deps AS builder
ENV SKIP_ENV_VALIDATION=1
# the build evaluates the auth config; the real secret comes from compose at runtime
ENV BETTER_AUTH_SECRET=build-time-placeholder-secret-not-used-at-runtime
# CI's next build type-checks (typed routes included) before any deploy
ENV SKIP_BUILD_TYPECHECK=1
ENV TURBOPACK_BUILD_CACHE=1
ENV NODE_ENV=production

COPY . .
RUN --mount=type=cache,target=/app/apps/web/.next/cache \
  cd apps/web && bun run build
# standalone output excludes public/; ensure it exists so the runner copy never fails
RUN bun build packages/db/src/migrate.ts \
  --target=node \
  --format=esm \
  --outfile=packages/db/migrate.js \
  && bun build packages/db/src/history-import-cli.ts \
  --target=node \
  --format=esm \
  --outfile=packages/db/history-import.js \
  && mkdir -p apps/web/public

FROM node:24-slim AS runner
RUN apt-get update \
  && apt-get install -y --no-install-recommends curl \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --chown=node:node apps/web/docker-entrypoint.sh ./apps/web/docker-entrypoint.sh
COPY --from=builder --chown=node:node /app/packages/db/src/migrations ./packages/db/migrations
COPY --from=builder --chown=node:node /app/packages/db/migrate.js /app/packages/db/history-import.js ./packages/db/
COPY --from=builder --chown=node:node /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=node:node /app/apps/web/.next/standalone ./
COPY --from=builder --chown=node:node /app/apps/web/.next/static ./apps/web/.next/static

ENV HOSTNAME=0.0.0.0
ENV PORT=3001
EXPOSE 3001

USER node

HEALTHCHECK --interval=10s --timeout=5s --retries=5 --start-period=60s \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3001/api/health').then((response) => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))"]

ENTRYPOINT ["/bin/sh", "/app/apps/web/docker-entrypoint.sh"]

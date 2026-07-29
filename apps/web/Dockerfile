FROM node:24-slim AS builder
COPY --from=oven/bun:1.3.3 /usr/local/bin/bun /usr/local/bin/bun
WORKDIR /app
ENV SKIP_ENV_VALIDATION=1
# the build evaluates the auth config; the real secret comes from compose at runtime
ENV BETTER_AUTH_SECRET=build-time-placeholder-secret-not-used-at-runtime

COPY . .
RUN --mount=type=cache,target=/root/.bun/install/cache bun install --frozen-lockfile

ENV NODE_ENV=production
RUN cd apps/web && bun run build
RUN bun build packages/db/src/migrate.ts \
  --target=node \
  --format=esm \
  --outfile=packages/db/migrate.js
# standalone output excludes public/; ensure it exists so the runner copy never fails
RUN mkdir -p apps/web/public

FROM node:24-slim AS runner
RUN apt-get update \
  && apt-get install -y --no-install-recommends curl \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder --chown=node:node /app/apps/web/.next/standalone ./
COPY --from=builder --chown=node:node /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=node:node /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=node:node /app/packages/db/migrate.js ./packages/db/migrate.js
COPY --from=builder --chown=node:node /app/packages/db/src/migrations ./packages/db/migrations
COPY --chown=node:node apps/web/docker-entrypoint.sh ./apps/web/docker-entrypoint.sh

ENV HOSTNAME=0.0.0.0
ENV PORT=3001
EXPOSE 3001

USER node

HEALTHCHECK --interval=10s --timeout=5s --retries=5 --start-period=60s \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3001/api/health').then((response) => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))"]

ENTRYPOINT ["/bin/sh", "/app/apps/web/docker-entrypoint.sh"]

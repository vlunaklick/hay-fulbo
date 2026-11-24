# Coolify production automation

These scripts reconcile and deploy Hay Fulbo on the audited Coolify `4.1.2`
API. They are intentionally scoped to the exact names below:

- project: `hay-fulbo`
- environment: `production`
- PostgreSQL: `hay-fulbo-postgres`
- application: `hay-fulbo-web`

The shared VPS never builds this app. GitHub Actions builds `apps/web/Dockerfile`
and publishes `ghcr.io/vlunaklick/hay-fulbo-web:<commit SHA>`; Coolify only pulls
that image. Every command uses `RELEASE_SHA` when set (CI sets it to the pushed
commit) and otherwise fetches `origin/main` and uses its full commit SHA. Crecenly
projects and their resources are discovered first and registered as protected
identifiers. A mutation is rejected locally, before `fetch`, if its path or
payload contains a protected UUID/name or the word `Crecenly`.

## Credentials

Set these in the shell or secret manager running the command:

```sh
export COOLIFY_API_URL=https://coolify.example.com
export COOLIFY_API_TOKEN=...
```

The token needs read access to the current team, version, servers, projects,
applications, databases, deployments, environment variables, and database
backups. It needs create/update access for the four Hay Fulbo resources and
permission to trigger a deployment. `read:sensitive` is required so a second
reconciliation can preserve the existing database and auth secrets.

If discovery sees more than one usable server or Docker destination, also set:

```sh
export COOLIFY_SERVER_UUID=...
export COOLIFY_DESTINATION_UUID=...
```

The scripts never read another repository's `.env` file and never print API
tokens, database URLs, passwords, or application secrets. New secrets are
generated in memory using `crypto.randomBytes`.

## Runbook

Preview first. This only performs Coolify GET requests:

```sh
bun run coolify:plan
```

Reconcile the project, production environment, private PostgreSQL 18 database,
prebuilt-image application, resource limits, environment variables, and daily
local backup:

```sh
bun run coolify:apply
```

The application runs the image tagged with the release SHA, exposes port `3001`,
forces HTTPS, uses `/api/health` every 30 seconds, and requests a generated
Coolify domain. GitHub Actions is the single deployment trigger. Limits are
sized for a low-traffic personal app on a shared host: the web container gets
`384m` and one CPU (the image caps the V8 heap at 256 MB), PostgreSQL gets `256m`
and one CPU. Coolify applies new limits on the next restart or deployment. PostgreSQL uses an elevated migrator
role only during startup; the runtime `DATABASE_URL` is built with `URL` for the
restricted `hay_fulbo_runtime` role. Seven local backups are retained, S3 is
disabled, and the backup runs at `17 4 * * *` (server time) to stay off the
midnight slot other scheduled jobs use.

Trigger one deployment of an already published image and wait for a terminal
Coolify status:

```sh
bun run coolify:deploy
```

Verify that Coolify reports the release SHA as the image tag, the public URL is
HTTPS, the application is running/healthy, and three independent database-aware
health probes return `200`, `{ "status": "ok" }`, and `Cache-Control: no-store`:

```sh
bun run coolify:smoke
```

Tests use only an injected fake `fetch`; they never contact Coolify:

```sh
bun run coolify:test
```

## Automatic production deploys

Every push to `main` runs the complete `CI` workflow. The `Publish production
image` job builds and pushes the image on GitHub's runners (free for public
repositories). After verification and publishing pass, the `Deploy production`
job points Coolify at that image tag and runs the production smoke checks. Pull
requests never publish or deploy.

`deploy.mjs` refuses to deploy an application that still builds from Git, so a
misconfiguration cannot silently move the build back onto the VPS.

If the VPS is ARM, set the repository variable `IMAGE_RUNNER` to
`ubuntu-24.04-arm` so the image matches the server architecture
(`uname -m` on the server: `x86_64` needs nothing, `aarch64` needs the variable).

## One-time cutover from the server-built application

The original `hay-fulbo-web` was a Git + Dockerfile application that Coolify
built on the VPS. Coolify cannot switch an existing application to a prebuilt
image, so the cutover creates a new application and keeps the old one as a
fallback until the new one is healthy:

1. Check the server architecture (see above) and set `IMAGE_RUNNER` if needed.
2. Merge to `main`. `Publish production image` pushes the first image. The
   `Deploy production` job fails on purpose with "run the cutover"; production
   keeps serving the previous release.
3. In GitHub → Packages → `hay-fulbo-web` → Package settings, set visibility
   to **Public** so Coolify can pull without credentials. The image contains no
   secrets: `.env` files are excluded and runtime values come from Coolify.
4. In Coolify, rename the old application to `hay-fulbo-web-legacy`. Do not
   stop it yet.
5. Run `RELEASE_SHA=<the main SHA from step 2> bun run coolify:plan`, then the
   same with `coolify:apply`. It creates the new `hay-fulbo-web`, copies
   `BETTER_AUTH_SECRET` and `RUNTIME_DATABASE_PASSWORD` from the legacy
   application (sessions survive), and applies limits and the backup schedule.
   It never mutates the legacy application.
6. Re-run the failed `Deploy production` job (or `RELEASE_SHA=... bun run
coolify:deploy`). Check the generated URL's `/api/health`.
7. Move the production domain (`hay-fulbo.vmoon.tech`) from the legacy
   application to the new one in Coolify, then run `coolify:apply` again so
   `BETTER_AUTH_URL` and `CORS_ORIGIN` follow the domain, and redeploy.
8. Run `bun run coolify:smoke`. When it passes, stop and delete
   `hay-fulbo-web-legacy`, and restart `hay-fulbo-postgres` from Coolify so its
   memory limit applies.

Rollback during the cutover: move the domain back to `hay-fulbo-web-legacy` and
start it. After the cutover, roll back by redeploying an earlier SHA:
`RELEASE_SHA=<previous SHA> bun run coolify:deploy`.

The GitHub repository needs these Actions secrets:

- `COOLIFY_API_URL`
- `COOLIFY_API_TOKEN`

The deployment job is attached to the GitHub `production` environment and links
to `https://hay-fulbo.vmoon.tech`.

The payload contract is pinned to the
[Coolify source revision audited for 4.1.2](https://github.com/coollabsio/coolify/blob/e7dff30b7c998c301fd91bd169727b90c59ec291/openapi.json).

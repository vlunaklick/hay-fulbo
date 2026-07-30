# Coolify production automation

These scripts reconcile and deploy Hay Fulbo on the audited Coolify `4.1.2`
API. They are intentionally scoped to the exact names below:

- project: `hay-fulbo`
- environment: `production`
- PostgreSQL: `hay-fulbo-postgres`
- application: `hay-fulbo-web`

Every command fetches `origin/main` and uses its full commit SHA. Crecenly
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
Dockerfile application, environment variables, and daily local backup:

```sh
bun run coolify:apply
```

The application is pinned to `origin/main`, exposes port `3001`, forces HTTPS,
uses `/api/health`, disables Coolify's native automatic deployment, and requests
a generated Coolify domain. GitHub Actions is the single deployment trigger, so
Coolify does not start a duplicate build. PostgreSQL uses an elevated migrator
role only during startup; the runtime `DATABASE_URL` is built with `URL` for the
restricted `hay_fulbo_runtime` role. Seven local backups are retained and S3 is
disabled.

Trigger one deployment and wait for a terminal Coolify status:

```sh
bun run coolify:deploy
```

Verify that Coolify reports the exact `origin/main` SHA, the public URL is
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

Every push to `main` runs the complete `CI` workflow. After the verification job
passes, the `Deploy production` job deploys the exact `origin/main` revision and
runs the production smoke checks. Pull requests never deploy.

The GitHub repository needs these Actions secrets:

- `COOLIFY_API_URL`
- `COOLIFY_API_TOKEN`

The deployment job is attached to the GitHub `production` environment and links
to `https://hay-fulbo.vmoon.tech`.

The payload contract is pinned to the
[Coolify source revision audited for 4.1.2](https://github.com/coollabsio/coolify/blob/e7dff30b7c998c301fd91bd169727b90c59ec291/openapi.json).

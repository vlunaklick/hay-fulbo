#!/bin/sh
set -eu

node /app/packages/db/migrate.js
unset MIGRATION_DATABASE_URL RUNTIME_DATABASE_PASSWORD

exec node /app/apps/web/server.js

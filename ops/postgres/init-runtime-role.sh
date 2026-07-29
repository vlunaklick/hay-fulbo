#!/bin/sh
set -eu

psql \
  --set ON_ERROR_STOP=1 \
  --set runtime_password="$POSTGRES_RUNTIME_PASSWORD" \
  --username "$POSTGRES_USER" \
  --dbname "$POSTGRES_DB" <<'SQL'
CREATE ROLE hay_fulbo_runtime
  LOGIN
  PASSWORD :'runtime_password'
  NOSUPERUSER
  NOCREATEDB
  NOCREATEROLE
  NOINHERIT
  NOBYPASSRLS;

GRANT CONNECT ON DATABASE "hay-fulbo" TO hay_fulbo_runtime;
GRANT USAGE ON SCHEMA public TO hay_fulbo_runtime;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO hay_fulbo_runtime;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO hay_fulbo_runtime;
SQL

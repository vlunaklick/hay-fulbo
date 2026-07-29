import type { PoolClient } from "pg";

const RUNTIME_ROLE = "hay_fulbo_runtime";

export async function provisionRuntimeRole(client: PoolClient, password: string) {
  if (password.length < 32) {
    throw new Error("RUNTIME_DATABASE_PASSWORD must contain at least 32 characters");
  }

  const role = await client.query<{ exists: boolean }>(
    "select exists(select 1 from pg_roles where rolname = $1) as exists",
    [RUNTIME_ROLE],
  );
  if (!role.rows[0]?.exists) {
    await client.query(`
      create role hay_fulbo_runtime
        login
        nosuperuser
        nocreatedb
        nocreaterole
        noinherit
        nobypassrls
    `);
  }

  await executeFormatted(
    client,
    "select format('alter role hay_fulbo_runtime password %L', $1::text) as statement",
    [password],
  );
  await executeFormatted(
    client,
    "select format('grant connect on database %I to hay_fulbo_runtime', current_database()) as statement",
  );
  await client.query("grant usage on schema public to hay_fulbo_runtime");
  await executeFormatted(
    client,
    `select format(
      'alter default privileges for role %I in schema public grant select, insert, update, delete on tables to hay_fulbo_runtime',
      current_user
    ) as statement`,
  );
  await executeFormatted(
    client,
    `select format(
      'alter default privileges for role %I in schema public grant usage, select, update on sequences to hay_fulbo_runtime',
      current_user
    ) as statement`,
  );
}

export async function grantRuntimeRolePrivileges(client: PoolClient) {
  await client.query(
    "grant select, insert, update, delete on all tables in schema public to hay_fulbo_runtime",
  );
  await client.query(
    "grant usage, select, update on all sequences in schema public to hay_fulbo_runtime",
  );
  await client.query(
    "grant execute on function public.hay_fulbo_resolve_shared_group(bytea) to hay_fulbo_runtime",
  );
  await client.query("revoke all on table public.history_import from hay_fulbo_runtime");
}

async function executeFormatted(client: PoolClient, query: string, values?: unknown[]) {
  const result = await client.query<{ statement: string }>(query, values);
  const statement = result.rows[0]?.statement;
  if (!statement) {
    throw new Error("PostgreSQL did not produce a runtime-role statement");
  }
  await client.query(statement);
}

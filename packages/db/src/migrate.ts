import { migrate } from "drizzle-orm/node-postgres/migrator";
import { drizzle } from "drizzle-orm/node-postgres";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { Pool } from "pg";

import { grantRuntimeRolePrivileges, provisionRuntimeRole } from "./runtime-role";

export async function runMigrations() {
  const connectionString = process.env.MIGRATION_DATABASE_URL;
  const runtimePassword = process.env.RUNTIME_DATABASE_PASSWORD;

  if (!connectionString) {
    throw new Error("MIGRATION_DATABASE_URL is required");
  }
  if (!runtimePassword) {
    throw new Error("RUNTIME_DATABASE_PASSWORD is required");
  }

  const pool = new Pool({ connectionString });
  const migrationsFolder = join(dirname(fileURLToPath(import.meta.url)), "migrations");
  const client = await pool.connect();

  try {
    await client.query("select pg_advisory_lock(hashtext('hay_fulbo_schema_migration'))");
    await provisionRuntimeRole(client, runtimePassword);
    await migrate(drizzle(client), { migrationsFolder });
    await grantRuntimeRolePrivileges(client);
  } finally {
    await client
      .query("select pg_advisory_unlock(hashtext('hay_fulbo_schema_migration'))")
      .catch(() => undefined);
    client.release();
    await pool.end();
  }
}

await runMigrations();

import { migrate } from "drizzle-orm/node-postgres/migrator";
import { drizzle } from "drizzle-orm/node-postgres";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { Pool } from "pg";

export async function runMigrations() {
  const connectionString = process.env.MIGRATION_DATABASE_URL;

  if (!connectionString) {
    throw new Error("MIGRATION_DATABASE_URL is required");
  }

  const pool = new Pool({ connectionString });
  const migrationsFolder = join(dirname(fileURLToPath(import.meta.url)), "migrations");

  try {
    await migrate(drizzle(pool), { migrationsFolder });
  } finally {
    await pool.end();
  }
}

await runMigrations();

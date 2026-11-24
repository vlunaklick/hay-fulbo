import { env } from "@hay-fulbo/env/server";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema";

// One small pool per process, shared by the API and Better Auth. Idle
// connections close so PostgreSQL backends are released when the app is quiet.
const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 30_000,
});

export function createDb() {
  return drizzle({ client: pool, schema });
}

export const db = createDb();

export async function checkDatabaseConnection() {
  await db.execute(sql`select 1`);
}

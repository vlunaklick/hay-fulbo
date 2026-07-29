import { env } from "@hay-fulbo/env/server";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";

import * as schema from "./schema";

export function createDb() {
  return drizzle(env.DATABASE_URL, { schema });
}

export const db = createDb();

export async function checkDatabaseConnection() {
  await db.execute(sql`select 1`);
}

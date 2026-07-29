import { describe, expect, test } from "bun:test";
import type { PoolClient } from "pg";

import { grantRuntimeRolePrivileges, provisionRuntimeRole } from "./runtime-role";

describe("provisionRuntimeRole", () => {
  test("keeps the password parameterized and applies least-privilege grants", async () => {
    const password = "runtime-secret-with-at-least-32-characters";
    const calls: Array<{ text: string; values?: unknown[] }> = [];
    const client = {
      async query(text: string, values?: unknown[]) {
        calls.push({ text, values });
        if (text.includes("from pg_roles")) {
          return { rows: [{ exists: false }] };
        }
        if (text.includes("format('alter role")) {
          return { rows: [{ statement: "alter role hay_fulbo_runtime password 'redacted'" }] };
        }
        if (text.includes("format('grant connect")) {
          return {
            rows: [{ statement: "grant connect on database hay_fulbo to hay_fulbo_runtime" }],
          };
        }
        if (text.includes("alter default privileges for role")) {
          return {
            rows: [
              {
                statement:
                  "alter default privileges for role migrator in schema public grant select on tables to hay_fulbo_runtime",
              },
            ],
          };
        }
        return { rows: [] };
      },
    } as unknown as PoolClient;

    await provisionRuntimeRole(client, password);
    await grantRuntimeRolePrivileges(client);

    expect(calls.some(({ text }) => text.includes(password))).toBe(false);
    expect(calls.some(({ values }) => values?.includes(password))).toBe(true);
    expect(calls.map(({ text }) => text).join("\n")).toContain("nobypassrls");
    expect(calls.map(({ text }) => text).join("\n")).toContain(
      "grant execute on function public.hay_fulbo_resolve_shared_group(bytea)",
    );
    expect(calls.map(({ text }) => text).join("\n")).toContain(
      "revoke all on table public.history_import",
    );
  });

  test("rejects weak runtime credentials before querying PostgreSQL", async () => {
    const client = {
      query() {
        throw new Error("query should not run");
      },
    } as unknown as PoolClient;

    await expect(provisionRuntimeRole(client, "too-short")).rejects.toThrow(
      "RUNTIME_DATABASE_PASSWORD must contain at least 32 characters",
    );
  });
});

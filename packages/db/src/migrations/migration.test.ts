import { describe, expect, test } from "bun:test";
import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const migrationDirectory = dirname(fileURLToPath(import.meta.url));
const migrationSql = (
  await Promise.all(
    (
      await readdir(migrationDirectory)
    )
      .filter((fileName) => fileName.endsWith(".sql"))
      .toSorted()
      .map((fileName) => readFile(join(migrationDirectory, fileName), "utf8")),
  )
).join("\n");

describe("database enforcement migration", () => {
  test("forces tenant scope on every domain table", () => {
    for (const table of [
      "player",
      "court",
      "match",
      "match_team",
      "match_appearance",
      "match_rsvp",
      "match_rating",
      "match_transition",
      "match_organizer_transfer",
      "group_shared_link",
      "group_shared_link_event",
      "history_import",
    ]) {
      expect(migrationSql).toContain(`ALTER TABLE "${table}" FORCE ROW LEVEL SECURITY`);
      expect(migrationSql).toContain(`CREATE POLICY "${table}_group_scope"`);
    }
    expect(migrationSql).toContain("current_setting('app.group_id', true)");
  });

  test("validates a closure under database lock", () => {
    expect(migrationSql).toContain("hay_fulbo_guard_match_closure");
    expect(migrationSql).toContain("expected contributions must equal court cost");
    expect(migrationSql).toContain("assists exceed attributed goals");
  });

  test("freezes sporting data but permits payment updates after closure", () => {
    expect(migrationSql).toContain("hay_fulbo_guard_appearance_mutation");
    expect(migrationSql).toContain("only payment fields may change on a closed match");
  });

  test("allows ratings only on closed matches", () => {
    expect(migrationSql).toContain("hay_fulbo_guard_rating_mutation");
    expect(migrationSql).toContain("ratings may only be written on a closed match");
  });

  test("keeps audit tables append-only", () => {
    expect(migrationSql).toContain("hay_fulbo_reject_audit_mutation");
    expect(migrationSql).toContain("audit rows are append-only");
    expect(migrationSql).toContain("history_import_append_only");
  });

  test("scopes historical idempotency to a group, source and external key", () => {
    expect(migrationSql).toContain(
      'CONSTRAINT "history_import_pk" PRIMARY KEY("group_id","source","external_key")',
    );
  });

  test("resolves shared access from a hash without exposing secrets", () => {
    expect(migrationSql).toContain("hay_fulbo_resolve_shared_group");
    expect(migrationSql).toContain("REVOKE ALL ON FUNCTION");
  });
});

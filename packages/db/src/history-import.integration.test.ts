import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { join } from "node:path";

import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

import {
  HistoryImportError,
  importHistoricalMatches,
  parseHistoryImportPayload,
} from "./history-import";

const databaseUrl =
  process.env.HISTORY_IMPORT_TEST_DATABASE_URL ?? process.env.MATCH_TEST_DATABASE_URL;
const integration = databaseUrl ? describe : describe.skip;

const payloadFixture = {
  source: "history-import-integration-v1",
  groupName: "History Fixture Group",
  court: {
    name: "Historical placeholder",
    address: "Fixture address",
    mapsUrl: "https://maps.example/history-fixture",
  },
  players: ["Existing Player", "New Player", "Directory Only"],
  matches: [
    {
      externalKey: "fixture-match-1",
      scheduledAt: "2025-01-01T22:00:00.000-03:00",
      courtCostMinor: 10_000,
      teams: [
        {
          displayName: "First",
          players: [
            {
              displayName: "Existing Player",
              goals: 1,
              assists: 1,
              paid: true,
            },
          ],
        },
        {
          displayName: "Second",
          players: [{ displayName: "New Player", paid: false }],
        },
      ],
    },
  ],
};

integration("historical import", () => {
  const pool = new Pool({ connectionString: databaseUrl });
  const database = drizzle(pool);

  beforeAll(async () => {
    await migrate(database, {
      migrationsFolder: join(import.meta.dir, "migrations"),
    });
  });

  beforeEach(async () => {
    await pool.query(`
      truncate table
        history_import, group_shared_link_event, group_shared_link,
        match_organizer_transfer, match_transition, match_appearance,
        match_team, match, court, player, invitation, member, session,
        account, verification, organization, "user"
      restart identity cascade
    `);
    await pool.query(`
      insert into "user" (
        id, name, email, email_verified, created_at, updated_at
      ) values (
        'history-owner', 'Fixture Owner', 'history-owner@example.test', true, now(), now()
      );
      insert into organization (
        id, name, slug, created_at, updated_at
      ) values (
        'history-group', 'History Fixture Group', 'history-fixture-group', now(), now()
      );
      insert into member (
        id, organization_id, user_id, role, created_at
      ) values (
        'history-member', 'history-group', 'history-owner', 'owner', now()
      );
      insert into player (
        group_id, display_name, normalized_name, archived_at
      ) values (
        'history-group', 'Existing Player', 'existing player', now()
      );
    `);
  });

  afterAll(async () => {
    await pool.end();
  });

  test("imports and closes a complete match, then skips the same hash", async () => {
    const payload = parseHistoryImportPayload(JSON.stringify(payloadFixture));
    const first = await importHistoricalMatches({
      connectionString: databaseUrl!,
      payload,
    });
    expect(first).toEqual({
      matchesImported: 1,
      matchesSkipped: 0,
      playersCreated: 2,
      playersReused: 1,
      courtsCreated: 1,
      courtsReused: 0,
      appearancesCreated: 2,
    });

    const state = await pool.query<{
      status: string;
      teams: number;
      appearances: number;
      transitions: number;
      ledger: number;
    }>(`
      select
        matched.status,
        (select count(*)::int from match_team) as teams,
        (select count(*)::int from match_appearance) as appearances,
        (select count(*)::int from match_transition) as transitions,
        (select count(*)::int from history_import) as ledger
      from match as matched
    `);
    expect(state.rows[0]).toEqual({
      status: "closed",
      teams: 2,
      appearances: 2,
      transitions: 2,
      ledger: 1,
    });

    const directory = await pool.query<{ count: number; active: number }>(
      `
        select
          count(*)::int as count,
          count(*) filter (where archived_at is null)::int as active
        from player
        where group_id = 'history-group'
      `,
    );
    expect(directory.rows[0]).toEqual({ count: 3, active: 3 });

    await expect(
      importHistoricalMatches({ connectionString: databaseUrl!, payload }),
    ).resolves.toEqual({
      matchesImported: 0,
      matchesSkipped: 1,
      playersCreated: 0,
      playersReused: 3,
      courtsCreated: 0,
      courtsReused: 0,
      appearancesCreated: 0,
    });
    const unchangedState = await pool.query<{
      status: string;
      teams: number;
      appearances: number;
      transitions: number;
      ledger: number;
    }>(`
      select
        matched.status,
        (select count(*)::int from match_team) as teams,
        (select count(*)::int from match_appearance) as appearances,
        (select count(*)::int from match_transition) as transitions,
        (select count(*)::int from history_import) as ledger
      from match as matched
    `);
    expect(unchangedState.rows[0]).toEqual(state.rows[0]);
  });

  test("aborts a changed payload hash without partial writes", async () => {
    const payload = parseHistoryImportPayload(JSON.stringify(payloadFixture));
    await importHistoricalMatches({ connectionString: databaseUrl!, payload });

    const changed = parseHistoryImportPayload(JSON.stringify(payloadFixture));
    changed.matches[0]!.teams[0]!.players[0]!.goals = 2;
    await expect(
      importHistoricalMatches({
        connectionString: databaseUrl!,
        payload: changed,
      }),
    ).rejects.toEqual(new HistoryImportError("ledger_hash_mismatch"));

    const counts = await pool.query<{ matches: number; ledger: number }>(`
      select
        (select count(*)::int from match) as matches,
        (select count(*)::int from history_import) as ledger
    `);
    expect(counts.rows[0]).toEqual({ matches: 1, ledger: 1 });
  });

  test("aborts ambiguous normalized players and rolls back the court", async () => {
    await pool.query(`
      insert into player (
        group_id, display_name, normalized_name
      ) values (
        'history-group', 'Existing Player duplicate', 'existing player'
      )
    `);
    const payload = parseHistoryImportPayload(JSON.stringify(payloadFixture));
    await expect(
      importHistoricalMatches({ connectionString: databaseUrl!, payload }),
    ).rejects.toEqual(new HistoryImportError("player_ambiguous"));

    const counts = await pool.query<{ matches: number; courts: number; ledger: number }>(`
      select
        (select count(*)::int from match) as matches,
        (select count(*)::int from court) as courts,
        (select count(*)::int from history_import) as ledger
    `);
    expect(counts.rows[0]).toEqual({ matches: 0, courts: 0, ledger: 0 });
  });

  test("records paid evidence for a zero-cost appearance that the UI classifies as exempt", async () => {
    const zeroCost = parseHistoryImportPayload(
      JSON.stringify({
        ...payloadFixture,
        source: "history-zero-cost-v1",
        matches: [
          {
            ...payloadFixture.matches[0],
            externalKey: "zero-cost",
            courtCostMinor: 0,
          },
        ],
      }),
    );
    await importHistoricalMatches({ connectionString: databaseUrl!, payload: zeroCost });

    const paid = await pool.query<{
      expected_minor: string;
      paid_minor: string;
      paid_updated_at: Date | null;
      paid_updated_by_user_id: string | null;
    }>(`
      select expected_minor, paid_minor, paid_updated_at, paid_updated_by_user_id
      from match_appearance as appearance
      join player on player.group_id = appearance.group_id
        and player.id = appearance.player_id
      where player.normalized_name = 'existing player'
    `);
    expect(paid.rows[0]).toMatchObject({
      expected_minor: "0",
      paid_minor: "0",
      paid_updated_by_user_id: "history-owner",
    });
    expect(paid.rows[0]?.paid_updated_at).toBeInstanceOf(Date);
    // MatchQueries maps expected=0 and paid=0 to the UI's "Exento" contribution status.
  });
});

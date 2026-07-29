import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { join } from "node:path";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

import * as schema from "../schema";
import { groupSharedLink, member, organization, user } from "../schema";
import { createStatsQueries, StatsReadError } from "../stats";

const databaseUrl = process.env.MATCH_TEST_DATABASE_URL;
const integration = databaseUrl ? describe : describe.skip;

integration("StatsQueries authorized public seam", () => {
  const pool = new Pool({ connectionString: databaseUrl });
  const database = drizzle(pool, { schema });
  const queries = createStatsQueries(database);
  const groupId = "stats-group";
  const otherGroupId = "other-stats-group";
  const memberId = "stats-member";
  const outsiderId = "stats-outsider";
  const tokenHash = Buffer.alloc(32, 7);

  beforeAll(async () => {
    await migrate(database, {
      migrationsFolder: join(import.meta.dir, "../migrations"),
    });
  });

  beforeEach(async () => {
    await pool.query(`
      truncate table
        group_shared_link_event, group_shared_link, match_organizer_transfer,
        match_transition, match_appearance, match_team, match, court, player,
        invitation, member, session, account, verification, organization, "user"
      restart identity cascade
    `);
    await database.insert(user).values([
      {
        id: memberId,
        name: "Miembro",
        email: "stats-member@example.com",
        emailVerified: true,
      },
      {
        id: outsiderId,
        name: "Afuera",
        email: "stats-outsider@example.com",
        emailVerified: true,
      },
    ]);
    await database.insert(organization).values([
      {
        id: groupId,
        name: "Los del stats",
        slug: "los-del-stats",
      },
      {
        id: otherGroupId,
        name: "Otro grupo",
        slug: "otro-grupo-stats",
      },
    ]);
    await database.insert(member).values({
      id: "stats-membership",
      organizationId: groupId,
      userId: memberId,
      role: "member",
    });
    await database.insert(groupSharedLink).values({
      groupId,
      tokenHash,
      generation: 1,
      issuedByUserId: memberId,
    });
  });

  afterAll(async () => {
    await pool.end();
  });

  test("allows a member and rejects a non-member", async () => {
    await expect(
      queries.dashboard({ kind: "member", groupId, actorUserId: memberId }),
    ).resolves.toMatchObject({ group: { id: groupId }, ranking: [] });
    await expect(
      queries.dashboard({ kind: "member", groupId, actorUserId: outsiderId }),
    ).rejects.toMatchObject({
      code: "membership_required",
    } satisfies Partial<StatsReadError>);
  });

  test("requires the exact current shared hash, generation, and group", async () => {
    await expect(
      queries.dashboard({ kind: "shared", groupId, generation: 1, tokenHash }),
    ).resolves.toMatchObject({ group: { id: groupId } });
    await expect(
      queries.dashboard({
        kind: "shared",
        groupId,
        generation: 2,
        tokenHash,
      }),
    ).rejects.toMatchObject({
      code: "invalid_shared_access",
    } satisfies Partial<StatsReadError>);
    await expect(
      queries.dashboard({
        kind: "shared",
        groupId,
        generation: 1,
        tokenHash: Buffer.alloc(32, 8),
      }),
    ).rejects.toMatchObject({
      code: "invalid_shared_access",
    } satisfies Partial<StatsReadError>);
    await expect(
      queries.dashboard({
        kind: "shared",
        groupId: otherGroupId,
        generation: 1,
        tokenHash,
      }),
    ).rejects.toMatchObject({
      code: "invalid_shared_access",
    } satisfies Partial<StatsReadError>);
  });
});

import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { join } from "node:path";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

import * as schema from "../schema";
import { organization, member, user } from "../schema";
import { createMatchCommands, MatchCommandError } from "./commands";
import { createMatchQueries } from "./queries";

const databaseUrl = process.env.MATCH_TEST_DATABASE_URL;
const integration = databaseUrl ? describe : describe.skip;

integration("MatchCommands public seam", () => {
  const pool = new Pool({ connectionString: databaseUrl });
  const database = drizzle(pool, { schema });
  const commands = createMatchCommands(database);
  const queries = createMatchQueries(database);
  const groupId = "group-a";
  const organizerId = "user-organizer";
  const memberId = "user-member";
  const outsiderId = "user-outsider";

  beforeAll(async () => {
    await migrate(database, {
      migrationsFolder: join(import.meta.dir, "../migrations"),
    });
  });

  beforeEach(async () => {
    await pool.query(`
      truncate table
        group_shared_link_event, group_shared_link, match_organizer_transfer,
        match_transition, match_rating, match_appearance, match_team, match, court, player,
        invitation, member, session, account, verification, organization, "user"
      restart identity cascade
    `);
    await database.insert(user).values([
      {
        id: organizerId,
        name: "Organizador",
        email: "organizer@example.com",
        emailVerified: true,
      },
      {
        id: memberId,
        name: "Miembro",
        email: "member@example.com",
        emailVerified: true,
      },
      {
        id: outsiderId,
        name: "Afuera",
        email: "outsider@example.com",
        emailVerified: true,
      },
    ]);
    await database.insert(organization).values({
      id: groupId,
      name: "Los Miércoles",
      slug: "los-miercoles",
    });
    await database.insert(member).values([
      {
        id: "member-organizer",
        organizationId: groupId,
        userId: organizerId,
        role: "owner",
      },
      {
        id: "member-member",
        organizationId: groupId,
        userId: memberId,
        role: "member",
      },
    ]);
  });

  afterAll(async () => {
    await pool.end();
  });

  test("limits the designated scorekeeper to live goal totals", async () => {
    const organizer = { groupId, actorUserId: organizerId };
    const scorer = { groupId, actorUserId: memberId };
    const created = await commands.execute(organizer, {
      type: "createMatch",
      scheduledAt: new Date("2026-01-01"),
    });
    const base = { matchId: created.matchId, expectedLockVersion: 0 };
    await expect(
      commands.execute(scorer, { ...base, type: "setScorekeeper", scorekeeperUserId: memberId }),
    ).rejects.toMatchObject({ code: "forbidden" });
    await expect(
      commands.execute(organizer, {
        ...base,
        type: "setScorekeeper",
        scorekeeperUserId: outsiderId,
      }),
    ).rejects.toMatchObject({ code: "scorekeeper_not_member" });
    let current = await commands.execute(organizer, {
      ...base,
      type: "setScorekeeper",
      scorekeeperUserId: memberId,
    });
    const added = await commands.execute(organizer, {
      type: "createAndAddParticipant",
      matchId: created.matchId,
      expectedLockVersion: current.lockVersion,
      teamId: created.teamIds[0],
      displayName: "Beto",
    });
    current = added;
    for (const field of ["goals", "ownGoals", "unattributedGoals"] as const) {
      for (const delta of [1, -1] as const) {
        current = await commands.execute(scorer, {
          type: "adjustStat",
          matchId: created.matchId,
          expectedLockVersion: current.lockVersion,
          field,
          delta,
          ...(field === "unattributedGoals"
            ? { teamId: created.teamIds[0] }
            : { playerId: added.playerId }),
        });
        const detail = await queries.detail(scorer, created.matchId);
        expect(detail.scorekeeperUserId).toBe(memberId);
        expect(detail.scorekeeperName).toBe("Miembro");
        expect(
          field === "unattributedGoals"
            ? detail.teams[0]!.unattributedGoals
            : detail.teams[0]!.appearances[0]![field],
        ).toBe(delta === 1 ? 1 : 0);
      }
    }
    const versioned = { matchId: created.matchId, expectedLockVersion: current.lockVersion };
    for (const command of [
      { ...versioned, type: "adjustStat", field: "assists", delta: 1, playerId: added.playerId },
      { ...versioned, type: "closeMatch" },
      { ...versioned, type: "setScorekeeper", scorekeeperUserId: null },
      { ...versioned, type: "updatePaid", playerId: added.playerId, paidMinor: 1n },
      { ...versioned, type: "removeParticipant", playerId: added.playerId },
    ] as const) {
      await expect(commands.execute(scorer, command)).rejects.toMatchObject({ code: "forbidden" });
    }
    const client = await pool.connect();
    try {
      await client.query("begin");
      const { rows } = await client.query(
        "select 1 from pg_roles where rolname = 'hay_fulbo_runtime'",
      );
      if (rows.length) await client.query("set local role hay_fulbo_runtime");
      // Better Auth deletes memberships without setting the domain tenant context.
      await client.query("delete from member where id = 'member-member'");
      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
    const afterRemoval = await queries.detail(organizer, created.matchId);
    expect(afterRemoval.scorekeeperUserId).toBeNull();
    expect(afterRemoval.lockVersion).toBe(current.lockVersion + 1);
    await expect(
      commands.execute(scorer, {
        ...versioned,
        type: "adjustStat",
        field: "goals",
        delta: 1,
        playerId: added.playerId,
      }),
    ).rejects.toMatchObject({ code: "membership_required" });
    await database
      .insert(member)
      .values({ id: "member-member", organizationId: groupId, userId: memberId, role: "member" });
    current = { ...current, lockVersion: afterRemoval.lockVersion };
    await expect(
      commands.execute(scorer, {
        ...versioned,
        expectedLockVersion: current.lockVersion,
        type: "adjustStat",
        field: "goals",
        delta: 1,
        playerId: added.playerId,
      }),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  test("serializes scorekeeper assignment with concurrent member deletion", async () => {
    const scope = { groupId, actorUserId: organizerId };
    const created = await commands.execute(scope, {
      type: "createMatch",
      scheduledAt: new Date("2026-01-01"),
    });
    const deletion = await pool.connect();
    const assignment = await pool.connect();
    let assigning: Promise<unknown> | undefined;
    try {
      const { rows: roles } = await pool.query(
        "select 1 from pg_roles where rolname = 'hay_fulbo_runtime'",
      );
      // Exercise the production role's permissions and tenant RLS when available.
      if (roles.length) await assignment.query("set role hay_fulbo_runtime");
      await assignment.query("set statement_timeout = '3s'");
      const {
        rows: [{ pid }],
      } = await assignment.query("select pg_backend_pid() as pid");
      await deletion.query("begin");
      if (roles.length) await deletion.query("set local role hay_fulbo_runtime");
      await deletion.query("delete from member where id = 'member-member'");
      assigning = createMatchCommands(drizzle(assignment, { schema }))
        .execute(scope, {
          type: "setScorekeeper",
          matchId: created.matchId,
          expectedLockVersion: 0,
          scorekeeperUserId: memberId,
        })
        .then(
          (result) => result,
          (error: unknown) => error,
        );

      // Wait for a real lock wait, not a timing-dependent race. The old command
      // commits a dangling grant here because it reads the uncommitted deletion.
      let blocked = false;
      for (let attempt = 0; attempt < 100; attempt++) {
        const { rows } = await deletion.query(
          "select cardinality(pg_blocking_pids($1)) > 0 as blocked",
          [pid],
        );
        if (rows[0].blocked) {
          blocked = true;
          break;
        }
        await Bun.sleep(10);
      }
      expect(blocked).toBe(true);
      await deletion.query("commit");
      expect(await assigning).toMatchObject({ code: "scorekeeper_not_member" });
      const { rows } = await pool.query(
        `select scorekeeper_user_id from match
         where id = $1 and (scorekeeper_user_id is null or exists (
           select 1 from member
           where organization_id = match.group_id and user_id = match.scorekeeper_user_id
         ))`,
        [created.matchId],
      );
      expect(rows).toEqual([{ scorekeeper_user_id: null }]);
    } finally {
      await deletion.query("rollback");
      await assigning;
      await assignment.query("reset role");
      await assignment.query("reset statement_timeout");
      assignment.release();
      deletion.release();
    }
  });

  test("rejects assignment and scoring on closed or cancelled matches", async () => {
    const scope = { groupId, actorUserId: organizerId };
    const court = await commands.execute(scope, {
      type: "upsertCourt",
      name: "Cancha",
      address: "Acá",
      mapsUrl: "https://example.com",
    });
    const created = await commands.execute(scope, {
      type: "createMatch",
      scheduledAt: new Date("2026-01-01"),
      courtId: court.courtId,
      courtCostMinor: 0n,
    });
    let current = await commands.execute(scope, {
      type: "setScorekeeper",
      matchId: created.matchId,
      expectedLockVersion: 0,
      scorekeeperUserId: memberId,
    });
    for (const teamId of created.teamIds) {
      current = await commands.execute(scope, {
        type: "createAndAddParticipant",
        matchId: created.matchId,
        expectedLockVersion: current.lockVersion,
        teamId,
        displayName: teamId,
      });
    }
    current = await commands.execute(scope, {
      type: "closeMatch",
      matchId: created.matchId,
      expectedLockVersion: current.lockVersion,
    });
    for (const status of ["closed", "cancelled"]) {
      if (status === "cancelled") {
        current = await commands.execute(scope, {
          type: "reopenMatch",
          matchId: created.matchId,
          expectedLockVersion: current.lockVersion,
        });
        current = await commands.execute(scope, {
          type: "cancelMatch",
          matchId: created.matchId,
          expectedLockVersion: current.lockVersion,
        });
      }
      await expect(
        commands.execute(scope, {
          type: "setScorekeeper",
          matchId: created.matchId,
          expectedLockVersion: current.lockVersion,
          scorekeeperUserId: null,
        }),
      ).rejects.toMatchObject({ code: "match_not_open" });
      await expect(
        commands.execute(
          { groupId, actorUserId: memberId },
          {
            type: "adjustStat",
            matchId: created.matchId,
            expectedLockVersion: current.lockVersion,
            field: "unattributedGoals",
            teamId: created.teamIds[0],
            delta: 1,
          },
        ),
      ).rejects.toMatchObject({ code: "match_not_open" });
    }
  });

  test("creates the match with default temporary teams and its initial event atomically", async () => {
    const scope = { groupId, actorUserId: organizerId };
    const created = await commands.execute(scope, {
      type: "createMatch",
      scheduledAt: new Date("2026-07-29T22:00:00.000Z"),
    });

    expect(typeof created.matchId).toBe("string");
    expect(created.lockVersion).toBe(0);
    expect(created.teamIds).toHaveLength(2);
    await expect(queries.detail(scope, created.matchId)).resolves.toMatchObject({
      id: created.matchId,
      status: "open",
      lockVersion: 0,
      teams: [
        { slot: 1, displayName: "Equipo 1", appearances: [] },
        { slot: 2, displayName: "Equipo 2", appearances: [] },
      ],
    });

    await expect(
      commands.execute(
        { groupId, actorUserId: outsiderId },
        {
          type: "createMatch",
          scheduledAt: new Date("2026-07-29T22:00:00.000Z"),
        },
      ),
    ).rejects.toMatchObject({ code: "membership_required" } satisfies Partial<MatchCommandError>);
  });

  test("keeps global setup manager-only", async () => {
    const organizer = { groupId, actorUserId: organizerId };
    const memberScope = { groupId, actorUserId: memberId };

    await expect(
      commands.execute(memberScope, {
        type: "createMatch",
        scheduledAt: new Date("2026-07-29T22:00:00.000Z"),
      }),
    ).rejects.toMatchObject({ code: "owner_required" } satisfies Partial<MatchCommandError>);
    await expect(
      commands.execute(memberScope, {
        type: "upsertPlayer",
        displayName: "No autorizado",
      }),
    ).rejects.toMatchObject({ code: "owner_required" } satisfies Partial<MatchCommandError>);
    await expect(
      commands.execute(memberScope, {
        type: "upsertCourt",
        name: "Cancha ajena",
        address: "Sin permiso 123",
        mapsUrl: "https://maps.example/sin-permiso",
      }),
    ).rejects.toMatchObject({ code: "owner_required" } satisfies Partial<MatchCommandError>);

    const directory = await queries.directory(organizer);
    expect(directory.members.find(({ id }) => id === organizerId)).toMatchObject({
      linkedPlayerId: null,
      role: "owner",
    });
  });

  test("links each group account to at most one player and exposes the current link", async () => {
    const organizer = { groupId, actorUserId: organizerId };
    const memberScope = { groupId, actorUserId: memberId };
    const first = await commands.execute(organizer, {
      type: "upsertPlayer",
      displayName: "Beto",
      linkedUserId: memberId,
    });

    await expect(
      commands.execute(organizer, {
        type: "upsertPlayer",
        displayName: "Betito",
        linkedUserId: memberId,
      }),
    ).rejects.toMatchObject({
      code: "player_account_already_linked",
    } satisfies Partial<MatchCommandError>);
    await expect(
      commands.execute(organizer, {
        type: "upsertPlayer",
        displayName: "Afuera",
        linkedUserId: outsiderId,
      }),
    ).rejects.toMatchObject({ code: "membership_required" } satisfies Partial<MatchCommandError>);
    await expect(
      commands.execute(memberScope, {
        type: "upsertPlayer",
        playerId: first.playerId,
        displayName: "Beto",
        linkedUserId: null,
      }),
    ).rejects.toMatchObject({ code: "owner_required" } satisfies Partial<MatchCommandError>);

    const linkedDirectory = await queries.directory(organizer);
    expect(linkedDirectory.members.find(({ id }) => id === memberId)).toMatchObject({
      linkedPlayerId: first.playerId,
    });

    await commands.execute(organizer, {
      type: "upsertPlayer",
      playerId: first.playerId,
      displayName: "Beto",
      linkedUserId: null,
    });
    const second = await commands.execute(organizer, {
      type: "upsertPlayer",
      displayName: "Betito",
      linkedUserId: memberId,
    });
    expect(
      (await queries.directory(organizer)).members.find(({ id }) => id === memberId),
    ).toMatchObject({ linkedPlayerId: second.playerId });
  });

  test("prorates exact minor units and lets the organizer manage the roster and stats", async () => {
    const organizer = { groupId, actorUserId: organizerId };
    const memberScope = { groupId, actorUserId: memberId };
    const created = await commands.execute(organizer, {
      type: "createMatch",
      scheduledAt: new Date("2026-07-29T22:00:00.000Z"),
      courtCostMinor: 100n,
    });
    const [firstTeamId, secondTeamId] = created.teamIds;
    const players = await Promise.all(
      ["Ada", "Beto", "Cami"].map((displayName) =>
        commands.execute(organizer, { type: "upsertPlayer", displayName }),
      ),
    );
    let version = created.lockVersion;

    ({ lockVersion: version } = await commands.execute(organizer, {
      type: "addParticipant",
      matchId: created.matchId,
      expectedLockVersion: version,
      teamId: firstTeamId,
      playerId: players[0]!.playerId,
    }));
    await expect(
      commands.execute(memberScope, {
        type: "addParticipant",
        matchId: created.matchId,
        expectedLockVersion: version,
        teamId: secondTeamId,
        playerId: players[1]!.playerId,
      }),
    ).rejects.toMatchObject({ code: "forbidden" } satisfies Partial<MatchCommandError>);
    ({ lockVersion: version } = await commands.execute(organizer, {
      type: "addParticipant",
      matchId: created.matchId,
      expectedLockVersion: version,
      teamId: secondTeamId,
      playerId: players[1]!.playerId,
    }));
    ({ lockVersion: version } = await commands.execute(organizer, {
      type: "addParticipant",
      matchId: created.matchId,
      expectedLockVersion: version,
      teamId: secondTeamId,
      playerId: players[2]!.playerId,
    }));

    const detail = await queries.detail(organizer, created.matchId);
    expect(
      detail.teams.flatMap((team) =>
        team.appearances.map((appearance) => appearance.expectedMinor),
      ),
    ).toEqual([34n, 33n, 33n]);
    expect(detail.lockVersion).toBe(version);

    ({ lockVersion: version } = await commands.execute(organizer, {
      type: "adjustStat",
      matchId: created.matchId,
      expectedLockVersion: version,
      field: "goals",
      delta: 1,
      playerId: players[0]!.playerId,
    }));
    ({ lockVersion: version } = await commands.execute(organizer, {
      type: "adjustStat",
      matchId: created.matchId,
      expectedLockVersion: version,
      field: "unattributedGoals",
      delta: 1,
      teamId: secondTeamId,
    }));
    await expect(
      commands.execute(organizer, {
        type: "adjustStat",
        matchId: created.matchId,
        expectedLockVersion: version,
        field: "ownGoals",
        delta: -1,
        playerId: players[0]!.playerId,
      }),
    ).rejects.toMatchObject({ code: "invalid_input" } satisfies Partial<MatchCommandError>);
    ({ lockVersion: version } = await commands.execute(organizer, {
      type: "moveParticipant",
      matchId: created.matchId,
      expectedLockVersion: version,
      playerId: players[2]!.playerId,
      teamId: firstTeamId,
    }));

    const adjusted = await queries.detail(organizer, created.matchId);
    expect(adjusted.score.map(({ goals }) => goals)).toEqual([1, 1]);
    expect(
      adjusted.teams.flatMap((team) =>
        team.appearances.map((appearance) => [
          appearance.expectedMinor,
          appearance.contributionStatus,
        ]),
      ),
    ).toEqual([
      [34n, "pending"],
      [33n, "pending"],
      [33n, "pending"],
    ]);

    ({ lockVersion: version } = await commands.execute(organizer, {
      type: "removeParticipant",
      matchId: created.matchId,
      expectedLockVersion: version,
      playerId: players[2]!.playerId,
    }));
    const reduced = await queries.detail(organizer, created.matchId);
    expect(reduced.teams.flatMap((team) => team.appearances.length)).toEqual([1, 1]);
    expect(
      reduced.teams
        .flatMap((team) => team.appearances)
        .map((appearance) => appearance.expectedMinor),
    ).toEqual([50n, 50n]);
  });

  test("closes valid data, rejects stale writes and still accepts payments", async () => {
    const organizer = { groupId, actorUserId: organizerId };
    const venue = await commands.execute(organizer, {
      type: "upsertCourt",
      name: "El Poli",
      address: "Av. Siempre Viva 123",
      mapsUrl: "https://maps.example/el-poli",
    });
    const [alice, bob] = await Promise.all(
      ["Alice", "Bob"].map((displayName) =>
        commands.execute(organizer, { type: "upsertPlayer", displayName }),
      ),
    );
    const created = await commands.execute(organizer, {
      type: "createMatch",
      scheduledAt: new Date("2020-01-01T22:00:00.000Z"),
      courtId: venue.courtId,
      courtCostMinor: 1_000n,
    });
    const [firstTeamId, secondTeamId] = created.teamIds;
    let version = created.lockVersion;
    for (const command of [
      { type: "addParticipant" as const, teamId: firstTeamId, playerId: alice!.playerId },
      { type: "addParticipant" as const, teamId: secondTeamId, playerId: bob!.playerId },
      {
        type: "adjustStat" as const,
        field: "goals" as const,
        delta: 1 as const,
        playerId: alice!.playerId,
      },
      {
        type: "adjustStat" as const,
        field: "assists" as const,
        delta: 1 as const,
        playerId: alice!.playerId,
      },
      {
        type: "adjustStat" as const,
        field: "ownGoals" as const,
        delta: 1 as const,
        playerId: bob!.playerId,
      },
      {
        type: "adjustStat" as const,
        field: "unattributedGoals" as const,
        delta: 1 as const,
        teamId: secondTeamId,
      },
    ]) {
      ({ lockVersion: version } = await commands.execute(organizer, {
        ...command,
        matchId: created.matchId,
        expectedLockVersion: version,
      }));
    }

    ({ lockVersion: version } = await commands.execute(organizer, {
      type: "closeMatch",
      matchId: created.matchId,
      expectedLockVersion: version,
    }));
    expect((await queries.detail(organizer, created.matchId)).score).toEqual([
      { teamId: firstTeamId, goals: 2 },
      { teamId: secondTeamId, goals: 1 },
    ]);
    await expect(
      commands.execute(organizer, {
        type: "adjustStat",
        matchId: created.matchId,
        expectedLockVersion: version,
        field: "goals",
        delta: 1,
        playerId: alice!.playerId,
      }),
    ).rejects.toMatchObject({ code: "match_not_open" } satisfies Partial<MatchCommandError>);
    await expect(
      commands.execute(organizer, {
        type: "updatePaid",
        matchId: created.matchId,
        expectedLockVersion: version,
        playerId: alice!.playerId,
        paidMinor: 500n,
      }),
    ).resolves.toMatchObject({ lockVersion: version + 1 });
    version += 1;
    await expect(
      commands.execute(organizer, {
        type: "reopenMatch",
        matchId: created.matchId,
        expectedLockVersion: version - 1,
      }),
    ).rejects.toMatchObject({ code: "concurrent_update" } satisfies Partial<MatchCommandError>);
    ({ lockVersion: version } = await commands.execute(organizer, {
      type: "reopenMatch",
      matchId: created.matchId,
      expectedLockVersion: version,
    }));
    expect((await queries.detail(organizer, created.matchId)).status).toBe("open");
  });

  test("audits cancellation and restoration without mandatory reasons", async () => {
    const organizer = { groupId, actorUserId: organizerId };
    const created = await commands.execute(organizer, {
      type: "createMatch",
      scheduledAt: new Date("2026-07-29T22:00:00.000Z"),
    });
    let version = created.lockVersion;

    ({ lockVersion: version } = await commands.execute(organizer, {
      type: "cancelMatch",
      matchId: created.matchId,
      expectedLockVersion: version,
      reason: "La cancha cerró",
    }));
    expect((await queries.detail(organizer, created.matchId)).status).toBe("cancelled");
    ({ lockVersion: version } = await commands.execute(organizer, {
      type: "restoreMatch",
      matchId: created.matchId,
      expectedLockVersion: version,
    }));
    ({ lockVersion: version } = await commands.execute(organizer, {
      type: "cancelMatch",
      matchId: created.matchId,
      expectedLockVersion: version,
    }));
    expect((await queries.detail(organizer, created.matchId)).status).toBe("cancelled");
    ({ lockVersion: version } = await commands.execute(organizer, {
      type: "restoreMatch",
      matchId: created.matchId,
      expectedLockVersion: version,
    }));
    expect((await queries.detail(organizer, created.matchId)).status).toBe("open");
  });
});

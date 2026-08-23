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
        match_transition, match_appearance, match_team, match, court, player,
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

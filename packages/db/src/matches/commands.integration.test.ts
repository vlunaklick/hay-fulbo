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
  const captainId = "user-captain";
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
        id: captainId,
        name: "Capitán",
        email: "captain@example.com",
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
        id: "member-captain",
        organizationId: groupId,
        userId: captainId,
        role: "member",
      },
    ]);
  });

  afterAll(async () => {
    await pool.end();
  });

  test("creates the match, both temporary teams and its initial event atomically", async () => {
    const scope = { groupId, actorUserId: organizerId };
    const created = await commands.execute(scope, {
      type: "createMatch",
      scheduledAt: new Date("2026-07-29T22:00:00.000Z"),
      teams: [{ displayName: "Oscuros" }, { displayName: "Claros" }],
    });

    expect(typeof created.matchId).toBe("string");
    expect(created.lockVersion).toBe(0);
    expect(created.teamIds).toHaveLength(2);
    await expect(queries.detail(scope, created.matchId)).resolves.toMatchObject({
      id: created.matchId,
      status: "open",
      lockVersion: 0,
      teams: [
        { slot: 1, displayName: "Oscuros", appearances: [] },
        { slot: 2, displayName: "Claros", appearances: [] },
      ],
    });

    await expect(
      commands.execute(
        { groupId, actorUserId: outsiderId },
        {
          type: "createMatch",
          scheduledAt: new Date("2026-07-29T22:00:00.000Z"),
          teams: [{ displayName: "A" }, { displayName: "B" }],
        },
      ),
    ).rejects.toMatchObject({ code: "membership_required" } satisfies Partial<MatchCommandError>);
  });

  test("keeps global setup owner-only while a captain can create a player into their team", async () => {
    const organizer = { groupId, actorUserId: organizerId };
    const captain = { groupId, actorUserId: captainId };

    await expect(
      commands.execute(captain, {
        type: "createMatch",
        scheduledAt: new Date("2026-07-29T22:00:00.000Z"),
        teams: [{ displayName: "Oscuros" }, { displayName: "Claros" }],
      }),
    ).rejects.toMatchObject({ code: "owner_required" } satisfies Partial<MatchCommandError>);
    await expect(
      commands.execute(captain, {
        type: "upsertPlayer",
        displayName: "No autorizado",
      }),
    ).rejects.toMatchObject({ code: "owner_required" } satisfies Partial<MatchCommandError>);
    await expect(
      commands.execute(captain, {
        type: "upsertCourt",
        name: "Cancha ajena",
        address: "Sin permiso 123",
        mapsUrl: "https://maps.example/sin-permiso",
      }),
    ).rejects.toMatchObject({ code: "owner_required" } satisfies Partial<MatchCommandError>);

    const created = await commands.execute(organizer, {
      type: "createMatch",
      scheduledAt: new Date("2026-07-29T22:00:00.000Z"),
      courtCostMinor: 1_000n,
      teams: [{ displayName: "Oscuros" }, { displayName: "Claros" }],
    });
    const [captainTeamId, rivalTeamId] = created.teamIds;
    const captainAssignment = await commands.execute(organizer, {
      type: "setCaptain",
      matchId: created.matchId,
      expectedLockVersion: created.lockVersion,
      teamId: captainTeamId,
      captainUserId: captainId,
    });
    const added = await commands.execute(captain, {
      type: "createAndAddParticipant",
      matchId: created.matchId,
      expectedLockVersion: captainAssignment.lockVersion,
      teamId: captainTeamId,
      displayName: "Jugador invitado",
    });

    expect(added).toMatchObject({
      matchId: created.matchId,
      lockVersion: captainAssignment.lockVersion + 1,
    });
    expect(typeof added.playerId).toBe("string");
    await expect(
      commands.execute(captain, {
        type: "createAndAddParticipant",
        matchId: created.matchId,
        expectedLockVersion: added.lockVersion,
        teamId: rivalTeamId,
        displayName: "No entra",
      }),
    ).rejects.toMatchObject({ code: "forbidden" } satisfies Partial<MatchCommandError>);

    const directory = await queries.directory(captain);
    expect(directory.players.map(({ displayName }) => displayName)).toEqual(["Jugador invitado"]);
    expect(directory.members).toEqual([
      {
        email: "captain@example.com",
        id: captainId,
        linkedPlayerId: null,
        name: "Capitán",
        role: "member",
      },
      {
        email: "organizer@example.com",
        id: organizerId,
        linkedPlayerId: null,
        name: "Organizador",
        role: "owner",
      },
    ]);
  });

  test("links each group account to at most one player and exposes the current link", async () => {
    const organizer = { groupId, actorUserId: organizerId };
    const captain = { groupId, actorUserId: captainId };
    const first = await commands.execute(organizer, {
      type: "upsertPlayer",
      displayName: "Beto",
      linkedUserId: captainId,
    });

    await expect(
      commands.execute(organizer, {
        type: "upsertPlayer",
        displayName: "Betito",
        linkedUserId: captainId,
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
      commands.execute(captain, {
        type: "upsertPlayer",
        playerId: first.playerId,
        displayName: "Beto",
        linkedUserId: null,
      }),
    ).rejects.toMatchObject({ code: "owner_required" } satisfies Partial<MatchCommandError>);

    const linkedDirectory = await queries.directory(organizer);
    expect(linkedDirectory.members.find(({ id }) => id === captainId)).toMatchObject({
      email: "captain@example.com",
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
      linkedUserId: captainId,
    });
    expect(
      (await queries.directory(organizer)).members.find(({ id }) => id === captainId),
    ).toMatchObject({ linkedPlayerId: second.playerId });
  });

  test("prorates exact minor units and confines a captain to their team", async () => {
    const organizer = { groupId, actorUserId: organizerId };
    const captain = { groupId, actorUserId: captainId };
    const created = await commands.execute(organizer, {
      type: "createMatch",
      scheduledAt: new Date("2026-07-29T22:00:00.000Z"),
      courtCostMinor: 100n,
      teams: [{ displayName: "Oscuros" }, { displayName: "Claros" }],
    });
    const [firstTeamId, secondTeamId] = created.teamIds;
    const players = await Promise.all(
      ["Ada", "Beto", "Cami"].map((displayName) =>
        commands.execute(organizer, { type: "upsertPlayer", displayName }),
      ),
    );
    let version = created.lockVersion;

    ({ lockVersion: version } = await commands.execute(organizer, {
      type: "setCaptain",
      matchId: created.matchId,
      expectedLockVersion: version,
      teamId: firstTeamId,
      captainUserId: captainId,
    }));
    ({ lockVersion: version } = await commands.execute(captain, {
      type: "addParticipant",
      matchId: created.matchId,
      expectedLockVersion: version,
      teamId: firstTeamId,
      playerId: players[0]!.playerId,
    }));
    await expect(
      commands.execute(captain, {
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
      type: "setExpectedContribution",
      matchId: created.matchId,
      expectedLockVersion: version,
      playerId: players[0]!.playerId,
      kind: "fixed",
      expectedMinor: 0n,
    }));
    const adjusted = await queries.detail(organizer, created.matchId);
    expect(
      adjusted.teams.flatMap((team) =>
        team.appearances.map((appearance) => [
          appearance.expectedMinor,
          appearance.contributionStatus,
        ]),
      ),
    ).toEqual([
      [0n, "exempt"],
      [50n, "pending"],
      [50n, "pending"],
    ]);
  });

  test("closes valid data, rejects stale writes and still accepts payments", async () => {
    const organizer = { groupId, actorUserId: organizerId };
    const captain = { groupId, actorUserId: captainId };
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
      teams: [{ displayName: "Oscuros" }, { displayName: "Claros" }],
    });
    const [firstTeamId, secondTeamId] = created.teamIds;
    let version = created.lockVersion;
    for (const command of [
      {
        type: "setCaptain" as const,
        teamId: firstTeamId,
        captainUserId: captainId,
      },
      { type: "addParticipant" as const, teamId: firstTeamId, playerId: alice!.playerId },
      { type: "addParticipant" as const, teamId: secondTeamId, playerId: bob!.playerId },
      {
        type: "updateAppearance" as const,
        playerId: alice!.playerId,
        goals: 1,
        assists: 1,
        ownGoals: 0,
      },
      {
        type: "updateAppearance" as const,
        playerId: bob!.playerId,
        goals: 0,
        assists: 0,
        ownGoals: 1,
      },
      {
        type: "setUnattributedGoals" as const,
        teamId: secondTeamId,
        goals: 1,
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
        type: "updateAppearance",
        matchId: created.matchId,
        expectedLockVersion: version,
        playerId: alice!.playerId,
        goals: 2,
        assists: 1,
        ownGoals: 0,
      }),
    ).rejects.toMatchObject({ code: "match_not_open" } satisfies Partial<MatchCommandError>);
    await expect(
      commands.execute(captain, {
        type: "updatePaid",
        matchId: created.matchId,
        expectedLockVersion: version,
        playerId: alice!.playerId,
        paidMinor: 500n,
      }),
    ).resolves.toMatchObject({ lockVersion: version + 1 });
    await expect(
      commands.execute(organizer, {
        type: "reopenMatch",
        matchId: created.matchId,
        expectedLockVersion: version,
        reason: "Corregir el tanteador",
      }),
    ).rejects.toMatchObject({ code: "concurrent_update" } satisfies Partial<MatchCommandError>);
  });

  test("audits cancellation, restoration and organizer transfer through legal states", async () => {
    const organizer = { groupId, actorUserId: organizerId };
    const nextOrganizer = { groupId, actorUserId: captainId };
    const created = await commands.execute(organizer, {
      type: "createMatch",
      scheduledAt: new Date("2026-07-29T22:00:00.000Z"),
      teams: [{ displayName: "Oscuros" }, { displayName: "Claros" }],
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
      reason: "Conseguimos otra cancha",
    }));
    ({ lockVersion: version } = await commands.execute(organizer, {
      type: "transferOrganizer",
      matchId: created.matchId,
      expectedLockVersion: version,
      nextOrganizerUserId: captainId,
      reason: "Beto organiza esta fecha",
    }));
    await expect(
      commands.execute(organizer, {
        type: "cancelMatch",
        matchId: created.matchId,
        expectedLockVersion: version,
        reason: "Sin autoridad",
      }),
    ).rejects.toMatchObject({ code: "forbidden" } satisfies Partial<MatchCommandError>);
    await expect(
      commands.execute(nextOrganizer, {
        type: "cancelMatch",
        matchId: created.matchId,
        expectedLockVersion: version,
        reason: "Lluvia",
      }),
    ).resolves.toMatchObject({ lockVersion: version + 1 });
  });
});

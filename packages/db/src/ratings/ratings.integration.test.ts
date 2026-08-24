import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { join } from "node:path";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

import * as schema from "../schema";
import { member, organization, player, user } from "../schema";
import { createMatchCommands } from "../matches/commands";
import { createRatingCommands, createRatingQueries } from "./ratings";

const databaseUrl = process.env.MATCH_TEST_DATABASE_URL;
const integration = databaseUrl ? describe : describe.skip;

integration("MatchRatings seam", () => {
  const pool = new Pool({ connectionString: databaseUrl });
  const database = drizzle(pool, { schema });
  const matchCommands = createMatchCommands(database);
  const ratingCommands = createRatingCommands(database);
  const ratingQueries = createRatingQueries(database);
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
      { id: organizerId, name: "Organizador", email: "organizer@example.com", emailVerified: true },
      { id: memberId, name: "Miembro", email: "member@example.com", emailVerified: true },
      { id: outsiderId, name: "Afuera", email: "outsider@example.com", emailVerified: true },
    ]);
    await database.insert(organization).values({
      id: groupId,
      name: "Los Miércoles",
      slug: "los-miercoles",
    });
    await database.insert(member).values([
      { id: "member-organizer", organizationId: groupId, userId: organizerId, role: "owner" },
      { id: "member-member", organizationId: groupId, userId: memberId, role: "member" },
    ]);
  });

  afterAll(async () => {
    await pool.end();
  });

  async function createClosedMatchWithPlayers() {
    const scope = { groupId, actorUserId: organizerId };
    const created = await matchCommands.execute(scope, {
      type: "createMatch",
      scheduledAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
    });
    let lockVersion = created.lockVersion;
    const beto = await matchCommands.execute(scope, {
      type: "upsertPlayer",
      displayName: "Beto",
      linkedUserId: memberId,
    });
    const alex = await matchCommands.execute(scope, { type: "upsertPlayer", displayName: "Alex" });
    const carla = await matchCommands.execute(scope, {
      type: "upsertPlayer",
      displayName: "Carla",
    });
    const court = await matchCommands.execute(scope, {
      type: "upsertCourt",
      name: "El Galpón",
      address: "Córdoba 123",
      mapsUrl: "https://maps.example/galpon",
    });
    await matchCommands.execute(scope, {
      type: "updateMatch",
      matchId: created.matchId,
      expectedLockVersion: lockVersion++,
      courtId: court.courtId,
      courtCostMinor: 0n,
    });
    for (const [playerId, teamId] of [
      [beto.playerId, created.teamIds[0]],
      [carla.playerId, created.teamIds[0]],
      [alex.playerId, created.teamIds[1]],
    ] as const) {
      await matchCommands.execute(scope, {
        type: "addParticipant",
        matchId: created.matchId,
        expectedLockVersion: lockVersion++,
        teamId: teamId!,
        playerId,
      });
    }
    await matchCommands.execute(scope, {
      type: "closeMatch",
      matchId: created.matchId,
      expectedLockVersion: lockVersion,
    });
    return {
      matchId: created.matchId,
      betoPlayerId: beto.playerId,
      alexPlayerId: alex.playerId,
      carlaPlayerId: carla.playerId,
    };
  }

  test("lets participants rate anonymously and reveals once the quorum is met", async () => {
    const { matchId, betoPlayerId, alexPlayerId, carlaPlayerId } =
      await createClosedMatchWithPlayers();

    // The organizer's account is not a participant, so it cannot rate.
    await expect(
      ratingCommands.submit(
        { groupId, actorUserId: organizerId },
        {
          matchId,
          scores: [{ playerId: alexPlayerId, score: 5 }],
        },
      ),
    ).rejects.toMatchObject({ code: "not_participant" });

    // Beto (linked to memberId) rates Alex.
    await expect(
      ratingQueries.state({ groupId, actorUserId: memberId }, matchId),
    ).resolves.toMatchObject({
      revealed: false,
      eligibleVoters: 1,
      completeVotes: 0,
      viewerCanRate: true,
    });

    await ratingCommands.submit(
      { groupId, actorUserId: memberId },
      {
        matchId,
        scores: [
          { playerId: alexPlayerId, score: 9 },
          { playerId: carlaPlayerId, score: 6 },
        ],
      },
    );

    const revealedState = await ratingQueries.state({ groupId, actorUserId: memberId }, matchId);
    expect(revealedState.revealed).toBe(true);
    expect(revealedState.completeVotes).toBe(1);
    expect(revealedState.ownScores[alexPlayerId]).toBe(9);
    expect(revealedState.figure).toMatchObject({
      displayName: "Alex",
      average: 9,
      playerId: alexPlayerId,
    });

    // Updating an existing vote works and keeps one row per pair.
    await ratingCommands.submit(
      { groupId, actorUserId: memberId },
      {
        matchId,
        scores: [{ playerId: alexPlayerId, score: 7 }],
      },
    );
    const updated = await ratingQueries.state({ groupId, actorUserId: memberId }, matchId);
    expect(updated.ownScores[alexPlayerId]).toBe(7);

    // Non-members stay locked out.
    await expect(
      ratingQueries.state({ groupId, actorUserId: outsiderId }, matchId),
    ).rejects.toMatchObject({ code: "membership_required" });
    expect(betoPlayerId).toBeDefined();
  });

  test("rejects ratings while the match is open and invalid payloads", async () => {
    const scope = { groupId, actorUserId: organizerId };
    const created = await matchCommands.execute(scope, {
      type: "createMatch",
      scheduledAt: new Date("2026-07-29T22:00:00.000Z"),
    });

    await database.insert(player).values({
      id: "11111111-1111-4111-8111-111111111111",
      groupId,
      displayName: "Solo",
      normalizedName: "solo",
      linkedUserId: memberId,
    });

    await expect(
      ratingCommands.submit(
        { groupId, actorUserId: memberId },
        {
          matchId: created.matchId,
          scores: [{ playerId: "player-solo", score: 5 }],
        },
      ),
    ).rejects.toMatchObject({ code: "match_not_closed" });
  });
});

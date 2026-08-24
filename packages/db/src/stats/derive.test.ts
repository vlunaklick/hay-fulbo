import { describe, expect, test } from "bun:test";

import { deriveStatsDashboard, derivePlayerStats, type StatsSource } from "../stats";

const source: StatsSource = {
  group: {
    id: "group-a",
    name: "Los del martes",
    timeZone: "America/Argentina/Buenos_Aires",
    currency: "ARS",
  },
  courts: [
    {
      id: "court-a",
      name: "El Galpón",
      address: "Córdoba 123",
      mapsUrl: "https://maps.example/court-a",
    },
    {
      id: "court-b",
      name: "La Terraza",
      address: "Santa Fe 456",
      mapsUrl: "https://maps.example/court-b",
    },
  ],
  players: [
    {
      id: "player-a",
      displayName: "Alex",
      normalizedName: "alex",
      archived: false,
    },
    {
      id: "player-b",
      displayName: "Beto",
      normalizedName: "beto",
      archived: false,
    },
    {
      id: "player-c",
      displayName: "Cami",
      normalizedName: "cami",
      archived: true,
    },
    {
      id: "player-zero",
      displayName: "Dani",
      normalizedName: "dani",
      archived: false,
    },
  ],
  matches: [
    {
      id: "closed-win",
      courtId: "court-a",
      scheduledAt: new Date("2026-07-20T23:00:00.000Z"),
      status: "closed",
      courtCostMinor: 60_000n,
      teams: [
        {
          id: "team-a",
          slot: 1,
          displayName: "Oscuros",
          unattributedGoals: 1,
          appearances: [
            {
              playerId: "player-a",
              joinedOrder: 1,
              goals: 2,
              assists: 1,
              ownGoals: 0,
              expectedMinor: 15_000n,
              paidMinor: 15_000n,
            },
            {
              playerId: "player-c",
              joinedOrder: 2,
              goals: 0,
              assists: 1,
              ownGoals: 0,
              expectedMinor: 15_000n,
              paidMinor: 10_000n,
            },
          ],
        },
        {
          id: "team-b",
          slot: 2,
          displayName: "Claros",
          unattributedGoals: 0,
          appearances: [
            {
              playerId: "player-b",
              joinedOrder: 3,
              goals: 1,
              assists: 0,
              ownGoals: 1,
              expectedMinor: 15_000n,
              paidMinor: 0n,
            },
          ],
        },
      ],
    },
    {
      id: "closed-draw",
      courtId: "court-b",
      scheduledAt: new Date("2026-06-10T00:30:00.000Z"),
      status: "closed",
      courtCostMinor: 30_000n,
      teams: [
        {
          id: "draw-a",
          slot: 1,
          displayName: "Negros",
          unattributedGoals: 0,
          appearances: [
            {
              playerId: "player-a",
              joinedOrder: 1,
              goals: 0,
              assists: 0,
              ownGoals: 0,
              expectedMinor: 15_000n,
              paidMinor: 15_000n,
            },
          ],
        },
        {
          id: "draw-b",
          slot: 2,
          displayName: "Blancos",
          unattributedGoals: 0,
          appearances: [
            {
              playerId: "player-b",
              joinedOrder: 2,
              goals: 0,
              assists: 0,
              ownGoals: 0,
              expectedMinor: 15_000n,
              paidMinor: 15_000n,
            },
          ],
        },
      ],
    },
    {
      id: "open-next",
      courtId: "court-a",
      scheduledAt: new Date("2026-08-02T21:00:00.000Z"),
      status: "open",
      courtCostMinor: 60_000n,
      teams: [
        {
          id: "next-a",
          slot: 1,
          displayName: "Pechera",
          unattributedGoals: 0,
          appearances: [
            {
              playerId: "player-a",
              joinedOrder: 1,
              goals: 9,
              assists: 9,
              ownGoals: 0,
              expectedMinor: 20_000n,
              paidMinor: 25_000n,
            },
          ],
        },
        {
          id: "next-b",
          slot: 2,
          displayName: "Sin pechera",
          unattributedGoals: 0,
          appearances: [
            {
              playerId: "player-b",
              joinedOrder: 2,
              goals: 0,
              assists: 0,
              ownGoals: 0,
              expectedMinor: 20_000n,
              paidMinor: 5_000n,
            },
          ],
        },
      ],
    },
    {
      id: "cancelled",
      courtId: "court-a",
      scheduledAt: new Date("2026-07-25T23:00:00.000Z"),
      status: "cancelled",
      courtCostMinor: 60_000n,
      teams: [
        {
          id: "cancelled-a",
          slot: 1,
          displayName: "Pechera",
          unattributedGoals: 0,
          appearances: [],
        },
        {
          id: "cancelled-b",
          slot: 2,
          displayName: "Sin pechera",
          unattributedGoals: 0,
          appearances: [],
        },
      ],
    },
    {
      id: "reopened",
      courtId: "court-a",
      scheduledAt: new Date("2026-07-18T23:00:00.000Z"),
      status: "open",
      courtCostMinor: 30_000n,
      teams: [
        {
          id: "reopened-a",
          slot: 1,
          displayName: "A",
          unattributedGoals: 0,
          appearances: [
            {
              playerId: "player-c",
              joinedOrder: 1,
              goals: 20,
              assists: 20,
              ownGoals: 0,
              expectedMinor: 15_000n,
              paidMinor: 0n,
            },
          ],
        },
        {
          id: "reopened-b",
          slot: 2,
          displayName: "B",
          unattributedGoals: 0,
          appearances: [],
        },
      ],
    },
  ],
};

describe("deriveStatsDashboard", () => {
  test("counts only closed matches and keeps own goals separate", () => {
    const dashboard = deriveStatsDashboard(source, {}, new Date("2026-07-29T12:00:00.000Z"));

    expect(dashboard.summary).toEqual({
      matchesPlayed: 2,
      totalGoals: 5,
      goalsPerMatch: 2.5,
    });
    expect(dashboard.ranking.map((row) => row.playerId)).toEqual([
      "player-a",
      "player-c",
      "player-b",
    ]);
    expect(dashboard.ranking.find((row) => row.playerId === "player-a")).toMatchObject({
      played: 2,
      wins: 1,
      draws: 1,
      losses: 0,
      points: 4,
      winPercentage: 50,
      goals: 2,
      assists: 1,
      contributions: 3,
      goalsPerMatch: 1,
      assistsPerMatch: 0.5,
      contributionsPerMatch: 1.5,
      goalsFor: 4,
      goalsAgainst: 1,
      goalDifference: 3,
      ownGoals: 0,
    });
    expect(dashboard.ranking.find((row) => row.playerId === "player-b")).toMatchObject({
      played: 2,
      wins: 0,
      draws: 1,
      losses: 1,
      goals: 1,
      ownGoals: 1,
    });
    expect(dashboard.ranking.some((row) => row.playerId === "player-zero")).toBe(false);
    expect(dashboard.ranking.find((row) => row.playerId === "player-c")?.archived).toBe(true);
    expect(dashboard.history.map((item) => item.matchId)).toEqual([
      "cancelled",
      "closed-win",
      "closed-draw",
    ]);
    expect(dashboard.upcoming?.matchId).toBe("open-next");
    expect(dashboard.finances).toMatchObject({
      expectedMinor: "40000",
      paidMinor: "30000",
      debtMinor: "15000",
      participantCount: 2,
      paidCount: 1,
    });
  });

  test("uses inclusive local dates and court filters", () => {
    const dashboard = deriveStatsDashboard(
      source,
      {
        from: "2026-06-09",
        to: "2026-06-09",
        courtId: "court-b",
      },
      new Date("2026-07-29T12:00:00.000Z"),
    );

    expect(dashboard.summary.matchesPlayed).toBe(1);
    expect(dashboard.history.map((item) => item.matchId)).toEqual(["closed-draw"]);
    expect(dashboard.ranking.every((row) => row.draws === 1)).toBe(true);
  });

  test("filters history by result without changing the ranking", () => {
    const dashboard = deriveStatsDashboard(
      source,
      { result: "draws" },
      new Date("2026-07-29T12:00:00.000Z"),
    );

    expect(dashboard.history.map((item) => item.matchId)).toEqual(["closed-draw"]);
    expect(dashboard.summary.matchesPlayed).toBe(2);
  });
});

describe("derivePlayerStats", () => {
  test("returns the aggregate and match history for one participant", () => {
    const detail = derivePlayerStats(source, "player-b", {});

    expect(detail?.player.displayName).toBe("Beto");
    expect(detail?.aggregate).toMatchObject({
      played: 2,
      wins: 0,
      draws: 1,
      losses: 1,
      points: 1,
      goals: 1,
      assists: 0,
      contributions: 1,
      ownGoals: 1,
    });
    expect(detail?.matches.map((item) => item.outcome)).toEqual(["loss", "draw"]);
  });

  test("returns an existing player with no statistical matches", () => {
    const detail = derivePlayerStats(source, "player-zero", {});

    expect(detail?.aggregate).toBeNull();
    expect(detail?.matches).toEqual([]);
  });

  test("does not return a player outside the source", () => {
    expect(derivePlayerStats(source, "foreign-player", {})).toBeNull();
  });
});

describe("deriveStatsDashboard with ratings", () => {
  const ratedSource: StatsSource = {
    ...source,
    group: { ...source.group, ratingQuorum: "all_voted" },
    players: source.players.map((player) => ({
      ...player,
      linkedUserId:
        player.id === "player-a" ? "user-a" : player.id === "player-b" ? "user-b" : null,
    })),
    ratings: [
      // player-a rated everyone else in closed-win
      { matchId: "closed-win", raterPlayerId: "player-a", ratedPlayerId: "player-b", score: 7 },
      { matchId: "closed-win", raterPlayerId: "player-a", ratedPlayerId: "player-c", score: 9 },
      // player-b only rated one rival, so their vote is incomplete
      { matchId: "closed-win", raterPlayerId: "player-b", ratedPlayerId: "player-a", score: 10 },
      // vote from a non-participant must be ignored
      { matchId: "closed-win", raterPlayerId: "player-zero", ratedPlayerId: "player-a", score: 1 },
      // orphaned target after a hypothetical reopen must be ignored
      { matchId: "closed-win", raterPlayerId: "player-a", ratedPlayerId: "gone", score: 5 },
      // ratings on a non-closed match never count
      { matchId: "open-next", raterPlayerId: "player-a", ratedPlayerId: "player-b", score: 2 },
    ],
  };

  test("keeps averages hidden until every eligible voter completed their ballot", () => {
    const dashboard = deriveStatsDashboard(ratedSource, {}, new Date("2026-07-29T12:00:00.000Z"));

    expect(dashboard.ranking.every((row) => row.ratingAverage === null)).toBe(true);
    expect(dashboard.ranking.every((row) => row.ratingMatchCount === 0)).toBe(true);
    expect(dashboard.history.map((item) => item.figure ?? null)).toContain(null);
  });

  test("reveals averages and the figure once the quorum is met", () => {
    const revealedSource: StatsSource = {
      ...ratedSource,
      ratings: [
        ...ratedSource.ratings!,
        { matchId: "closed-win", raterPlayerId: "player-b", ratedPlayerId: "player-c", score: 6 },
        { matchId: "closed-draw", raterPlayerId: "player-a", ratedPlayerId: "player-b", score: 8 },
      ],
      group: { ...ratedSource.group, ratingQuorum: "half_plus_one" },
    };
    const dashboard = deriveStatsDashboard(
      revealedSource,
      {},
      new Date("2026-07-29T12:00:00.000Z"),
    );

    const cami = dashboard.ranking.find((row) => row.playerId === "player-c");
    expect(cami).toMatchObject({ ratingAverage: 7.5, ratingMatchCount: 1 });

    const win = dashboard.history.find((item) => item.matchId === "closed-win");
    expect(win?.figure).toEqual({
      playerId: "player-a",
      displayName: "Alex",
      average: 10,
    });

    const draw = dashboard.history.find((item) => item.matchId === "closed-draw");
    expect(draw?.figure).toBeNull();
  });
});

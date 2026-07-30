import { describe, expect, test } from "bun:test";

import { deriveMatchParity, deriveSocieties } from "./insights";
import type { StatsSource, StatsSourceMatch } from "./types";

const players = [
  { id: "a", displayName: "Ana", normalizedName: "ana", archived: false },
  { id: "b", displayName: "Beto", normalizedName: "beto", archived: false },
  { id: "c", displayName: "Cami", normalizedName: "cami", archived: false },
  { id: "d", displayName: "Dani", normalizedName: "dani", archived: false },
] as const;

function appearance(playerId: string, goals = 0, assists = 0) {
  return {
    playerId,
    joinedOrder: 1,
    goals,
    assists,
    ownGoals: 0,
    expectedMinor: 0n,
    paidMinor: 0n,
  };
}

function match(
  id: string,
  day: number,
  leftPlayers: ReturnType<typeof appearance>[],
  rightPlayers: ReturnType<typeof appearance>[],
  score: [number, number],
  status: StatsSourceMatch["status"] = "closed",
): StatsSourceMatch {
  return {
    id,
    courtId: null,
    scheduledAt: new Date(`2026-07-${String(day).padStart(2, "0")}T21:00:00Z`),
    status,
    courtCostMinor: null,
    teams: [
      {
        id: `${id}-left`,
        slot: 1,
        displayName: "Verde",
        color: null,
        captainName: null,
        unattributedGoals: score[0],
        appearances: leftPlayers,
      },
      {
        id: `${id}-right`,
        slot: 2,
        displayName: "Negro",
        color: null,
        captainName: null,
        unattributedGoals: score[1],
        appearances: rightPlayers,
      },
    ],
  };
}

function source(matches: StatsSourceMatch[]): StatsSource {
  return {
    group: {
      id: "group",
      name: "Miércoles",
      timeZone: "America/Argentina/Buenos_Aires",
      currency: "ARS",
    },
    courts: [],
    players,
    matches,
  };
}

describe("match insights", () => {
  test("uses a neutral prior when the current teams have no history", () => {
    const upcoming = match(
      "00000000-0000-0000-0000-000000000001",
      20,
      [appearance("a")],
      [appearance("b")],
      [0, 0],
      "open",
    );
    const parity = deriveMatchParity(source([upcoming]), upcoming.id);

    expect(parity?.teams[0].probability).toBe(0.36);
    expect(parity?.drawProbability).toBe(0.28);
    expect(parity?.teams[1].probability).toBe(0.36);
    expect(parity?.confidence).toBe("low");
  });

  test("raises the probability of players with repeated wins and keeps probabilities normalized", () => {
    const history = [
      match(
        "00000000-0000-0000-0000-000000000001",
        1,
        [appearance("a")],
        [appearance("c")],
        [3, 0],
      ),
      match(
        "00000000-0000-0000-0000-000000000002",
        2,
        [appearance("a")],
        [appearance("d")],
        [2, 0],
      ),
      match(
        "00000000-0000-0000-0000-000000000003",
        3,
        [appearance("a")],
        [appearance("c")],
        [4, 1],
      ),
    ];
    const upcoming = match(
      "00000000-0000-0000-0000-000000000004",
      20,
      [appearance("a")],
      [appearance("c")],
      [0, 0],
      "open",
    );
    const parity = deriveMatchParity(source([...history, upcoming]), upcoming.id);

    expect(parity).not.toBeNull();
    expect(parity!.teams[0].probability).toBeGreaterThan(parity!.teams[1].probability);
    expect(
      parity!.teams[0].probability + parity!.drawProbability + parity!.teams[1].probability,
    ).toBeCloseTo(1, 3);
  });

  test("ranks recurring same-team pairs and excludes one-off pairs", () => {
    const matches = [
      match(
        "00000000-0000-0000-0000-000000000001",
        1,
        [appearance("a", 1), appearance("b", 0, 1)],
        [appearance("c"), appearance("d")],
        [1, 0],
      ),
      match(
        "00000000-0000-0000-0000-000000000002",
        2,
        [appearance("a"), appearance("b", 1)],
        [appearance("c")],
        [0, 1],
      ),
    ];
    const societies = deriveSocieties(source(matches));

    expect(societies).toHaveLength(1);
    expect(societies[0]).toMatchObject({
      playerIds: ["a", "b"],
      played: 2,
      wins: 1,
      draws: 1,
      points: 4,
      contributions: 3,
    });
  });
});

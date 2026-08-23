import { describe, expect, test } from "bun:test";

import { calculateExpectedContributions, calculateScore, validateMatchClosure } from "../matches";

describe("calculateExpectedContributions", () => {
  test("assigns indivisible minor units by joined order", () => {
    const result = calculateExpectedContributions({
      courtCostMinor: 10_001n,
      contributions: [
        { playerId: "late", joinedOrder: 3 },
        { playerId: "invited", joinedOrder: 2 },
        { playerId: "first", joinedOrder: 1 },
      ],
    });

    expect(result).toEqual([
      { playerId: "late", expectedMinor: 3_333n },
      { playerId: "invited", expectedMinor: 3_334n },
      { playerId: "first", expectedMinor: 3_334n },
    ]);
  });

  test("returns zero for every player when there is no cost", () => {
    const result = calculateExpectedContributions({
      courtCostMinor: 0n,
      contributions: [{ playerId: "a", joinedOrder: 1 }],
    });
    expect(result).toEqual([{ playerId: "a", expectedMinor: 0n }]);
  });
});

describe("calculateScore", () => {
  test("combines attributed, unattributed and rival own goals", () => {
    const result = calculateScore({
      teams: [
        { id: "one", unattributedGoals: 1 },
        { id: "two", unattributedGoals: 2 },
      ],
      appearances: [
        { teamId: "one", goals: 3, assists: 2, ownGoals: 1 },
        { teamId: "two", goals: 4, assists: 3, ownGoals: 2 },
      ],
    });

    expect(result).toEqual([
      { teamId: "one", goals: 6 },
      { teamId: "two", goals: 7 },
    ]);
  });
});

describe("validateMatchClosure", () => {
  test("accepts a complete match and returns its derived score", () => {
    const result = validateMatchClosure({
      now: new Date("2026-07-29T22:00:00.000Z"),
      scheduledAt: new Date("2026-07-29T20:00:00.000Z"),
      courtId: "court",
      courtCostMinor: 10_000n,
      teams: [
        { id: "one", slot: 1, unattributedGoals: 0 },
        { id: "two", slot: 2, unattributedGoals: 0 },
      ],
      appearances: [
        {
          playerId: "a",
          teamId: "one",
          goals: 2,
          assists: 1,
          ownGoals: 0,
          expectedMinor: 5_000n,
        },
        {
          playerId: "b",
          teamId: "two",
          goals: 1,
          assists: 0,
          ownGoals: 0,
          expectedMinor: 5_000n,
        },
      ],
    });

    expect(result).toEqual({
      ok: true,
      issues: [],
      score: [
        { teamId: "one", goals: 2 },
        { teamId: "two", goals: 1 },
      ],
    });
  });

  test("reports every independent invariant that prevents closure", () => {
    const result = validateMatchClosure({
      now: new Date("2026-07-29T19:00:00.000Z"),
      scheduledAt: new Date("2026-07-29T20:00:00.000Z"),
      courtId: null,
      courtCostMinor: 9_000n,
      teams: [
        { id: "one", slot: 1, unattributedGoals: 0 },
        { id: "two", slot: 2, unattributedGoals: 0 },
      ],
      appearances: [
        {
          playerId: "a",
          teamId: "one",
          goals: 0,
          assists: 1,
          ownGoals: 0,
          expectedMinor: 4_000n,
        },
      ],
    });

    expect(result.issues).toEqual([
      "match_not_started",
      "court_required",
      "team_without_players",
      "assists_exceed_attributed_goals",
      "expected_total_mismatch",
    ]);
    expect(result.ok).toBe(false);
  });
});

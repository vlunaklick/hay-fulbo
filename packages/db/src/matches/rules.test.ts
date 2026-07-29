import { describe, expect, test } from "bun:test";

import {
  MatchRuleError,
  calculateExpectedContributions,
  calculateScore,
  validateMatchClosure,
} from "../matches";

describe("calculateExpectedContributions", () => {
  test("preserves fixed amounts and assigns indivisible minor units by joined order", () => {
    const result = calculateExpectedContributions({
      courtCostMinor: 10_001n,
      contributions: [
        { playerId: "late", joinedOrder: 3, kind: "automatic" },
        { playerId: "invited", joinedOrder: 2, kind: "fixed", expectedMinor: 0n },
        { playerId: "first", joinedOrder: 1, kind: "automatic" },
      ],
    });

    expect(result).toEqual([
      { playerId: "late", expectedMinor: 5_000n },
      { playerId: "invited", expectedMinor: 0n },
      { playerId: "first", expectedMinor: 5_001n },
    ]);
  });

  test("rejects fixed amounts above the court cost", () => {
    expect(() =>
      calculateExpectedContributions({
        courtCostMinor: 1_000n,
        contributions: [
          { playerId: "a", joinedOrder: 1, kind: "fixed", expectedMinor: 1_001n },
          { playerId: "b", joinedOrder: 2, kind: "automatic" },
        ],
      }),
    ).toThrow(new MatchRuleError("fixed_amounts_exceed_cost"));
  });

  test("rejects a positive remainder when nobody has an automatic contribution", () => {
    expect(() =>
      calculateExpectedContributions({
        courtCostMinor: 2_000n,
        contributions: [{ playerId: "a", joinedOrder: 1, kind: "fixed", expectedMinor: 500n }],
      }),
    ).toThrow(new MatchRuleError("unallocated_remainder"));
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

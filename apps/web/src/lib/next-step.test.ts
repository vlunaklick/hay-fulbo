import { describe, expect, test } from "bun:test";

import { isLive, missingPlayers, pickHomeStep } from "./next-step";

// Thursday 12 Nov 2026, 21:30 local time.
const now = new Date(2026, 10, 12, 21, 30);

function match(id: string, day: number, hour: number, status: "open" | "closed" | "cancelled") {
  return { id, scheduledAt: new Date(2026, 10, day, hour, 0), status };
}

const base = {
  now,
  canManage: true,
  matches: [],
  upcoming: null,
  finances: null,
  myDebtMinor: null,
};

describe("isLive", () => {
  test("is an open match that started today", () => {
    expect(isLive(match("a", 12, 21, "open"), now)).toBe(true);
    expect(isLive(match("b", 12, 22, "open"), now)).toBe(false);
    expect(isLive(match("c", 11, 21, "open"), now)).toBe(false);
    expect(isLive(match("d", 12, 21, "closed"), now)).toBe(false);
  });
});

describe("missingPlayers", () => {
  test("evens teams up, at least five a side", () => {
    expect(missingPlayers([])).toBe(10);
    expect(missingPlayers([3, 5])).toBe(2);
    expect(missingPlayers([6, 5])).toBe(1);
    expect(missingPlayers([5, 5])).toBe(0);
  });
});

describe("pickHomeStep", () => {
  test("a match in play wins over everything", () => {
    expect(
      pickHomeStep({
        ...base,
        matches: [match("old", 5, 21, "open"), match("now", 12, 21, "open")],
        upcoming: { matchId: "next", teamSizes: [1, 1] },
      }),
    ).toMatchObject({ kind: "live", matchId: "now" });
  });

  test("managers close past open matches; players skip that", () => {
    const input = { ...base, matches: [match("old", 5, 21, "open")] };
    expect(pickHomeStep(input)).toMatchObject({ kind: "close", matchId: "old" });
    expect(pickHomeStep({ ...input, canManage: false })).toBeNull();
  });

  test("asks to invite while the next match is short-handed", () => {
    expect(pickHomeStep({ ...base, upcoming: { matchId: "next", teamSizes: [4, 5] } })).toEqual({
      kind: "invite",
      matchId: "next",
      missing: 1,
    });
  });

  test("then asks to collect, or to pay your part", () => {
    const input = {
      ...base,
      upcoming: { matchId: "next", teamSizes: [5, 5] },
      finances: { debtMinor: "1440000", debtors: 3 },
      myDebtMinor: 144000n,
    };
    expect(pickHomeStep(input)).toEqual({
      kind: "collect",
      matchId: "next",
      debtMinor: 1440000n,
      debtors: 3,
    });
    expect(pickHomeStep({ ...input, canManage: false })).toEqual({
      kind: "pay",
      matchId: "next",
      debtMinor: 144000n,
    });
  });

  test("offers to create a match when there is none, only to managers", () => {
    expect(pickHomeStep(base)).toEqual({ kind: "create" });
    expect(pickHomeStep({ ...base, canManage: false })).toBeNull();
  });

  test("nothing to do once the next match is full and paid", () => {
    expect(
      pickHomeStep({
        ...base,
        upcoming: { matchId: "next", teamSizes: [5, 5] },
        finances: { debtMinor: "0", debtors: 0 },
      }),
    ).toBeNull();
  });
});

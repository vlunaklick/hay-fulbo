import { describe, expect, test } from "bun:test";

import { owedFor, pickFecha, rosterTarget } from "./fecha";

// Thursday 12 Nov 2026, 21:30 local time.
const now = new Date(2026, 10, 12, 21, 30);

function match(id: string, day: number, hour: number, status: "open" | "closed" | "cancelled") {
  return { id, scheduledAt: new Date(2026, 10, day, hour, 0), status };
}

describe("pickFecha", () => {
  test("a match in play wins over everything", () => {
    expect(
      pickFecha({
        now,
        canManage: true,
        matches: [match("old", 5, 21, "open"), match("live", 12, 21, "open")],
        upcomingId: "next",
      }),
    ).toEqual({ matchId: "live", phase: "live" });
  });

  test("managers close the oldest unclosed past match before the next one", () => {
    const matches = [match("a", 5, 21, "open"), match("b", 1, 21, "open")];
    expect(pickFecha({ now, canManage: true, matches, upcomingId: "next" })).toEqual({
      matchId: "b",
      phase: "close",
    });
    expect(pickFecha({ now, canManage: false, matches, upcomingId: "next" })).toEqual({
      matchId: "next",
      phase: "upcoming",
    });
  });

  test("without a next match, the last closed one stays as la fecha", () => {
    expect(
      pickFecha({
        now,
        canManage: true,
        matches: [match("c", 10, 21, "cancelled"), match("b", 5, 21, "closed")],
        upcomingId: null,
      }),
    ).toEqual({ matchId: "b", phase: "closed" });
  });

  test("an empty group has no fecha", () => {
    expect(pickFecha({ now, canManage: true, matches: [], upcomingId: null })).toBeNull();
  });
});

describe("rosterTarget", () => {
  test("both teams at the biggest size, at least five a side", () => {
    expect(rosterTarget([])).toBe(10);
    expect(rosterTarget([3, 5])).toBe(10);
    expect(rosterTarget([6, 6])).toBe(12);
  });
});

describe("owedFor", () => {
  const person = (playerId: string, debtMinor: string) => ({
    playerId,
    playerDisplayName: playerId,
    debtMinor,
  });

  test("lists debtors biggest first and counts absences that owe", () => {
    const owed = owedFor({
      teams: [{ appearances: [person("ana", "0"), person("beto", "100")] }],
      absences: [
        { ...person("caro", "300"), owesContribution: true },
        { ...person("dani", "500"), owesContribution: false },
      ],
    });
    expect(owed.debtors.map((debtor) => debtor.playerId)).toEqual(["caro", "beto"]);
    expect(owed.totalMinor).toBe(400n);
    expect(owed.people).toBe(3);
    expect(owed.paid).toBe(1);
  });
});

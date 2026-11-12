import { describe, expect, test } from "bun:test";

import { groupHabit, relativeDay, splitMatches, suggestedDates } from "./match-schedule";

// Thursday 12 Nov 2026, 10:00 local time.
const now = new Date(2026, 10, 12, 10, 0);

function match(
  day: number,
  status: "open" | "closed" | "cancelled",
  extra: { hour?: number; courtId?: string | null; courtCostMinor?: string | null } = {},
) {
  return {
    scheduledAt: new Date(2026, 10, day, extra.hour ?? 21, 0),
    status,
    courtId: extra.courtId ?? null,
    courtCostMinor: extra.courtCostMinor ?? null,
  };
}

describe("match schedule", () => {
  test("splits upcoming, unclosed and played matches", () => {
    const { upcoming, unclosed, played } = splitMatches(
      [
        match(23, "open"),
        match(19, "open"),
        match(12, "open"),
        match(9, "open"),
        match(5, "closed"),
        match(8, "cancelled"),
      ],
      now,
    );
    expect(upcoming.map((item) => item.scheduledAt.getDate())).toEqual([12, 19, 23]);
    expect(unclosed.map((item) => item.scheduledAt.getDate())).toEqual([9]);
    expect(played.map((item) => item.scheduledAt.getDate())).toEqual([8, 5]);
  });

  test("reads the group's usual slot and latest court", () => {
    const habit = groupHabit([
      match(5, "closed", { courtId: "potrero", courtCostMinor: "6000000" }),
      match(-2, "closed"),
      match(2, "closed", { courtId: "canchita", courtCostMinor: "4800000" }),
      match(10, "cancelled", { courtId: "ciudad" }),
    ]);
    expect(habit.slots[0]).toEqual({ weekday: 4, hour: 21, minute: 0 });
    expect(habit.courtId).toBe("potrero");
    expect(habit.courtCostMinor).toBe("6000000");
  });

  test("falls back to Thursday 21:00 with no history", () => {
    expect(groupHabit([]).slots).toEqual([{ weekday: 4, hour: 21, minute: 0 }]);
  });

  test("suggests habitual dates that are free and still ahead", () => {
    // Two Thursdays (5 Nov, 29 Oct) and one Monday (2 Nov).
    const history = [match(5, "closed"), match(-2, "closed"), match(2, "closed")];
    const suggestions = suggestedDates([...history, match(19, "open")], now, 3);
    expect(suggestions.map((date) => date.getDate())).toEqual([12, 16, 23]);
    expect(suggestions.every((date) => date.getHours() === 21)).toBe(true);
  });

  test("skips today's slot once it has passed", () => {
    const late = new Date(2026, 10, 12, 22, 0);
    expect(suggestedDates([match(5, "closed")], late, 1)[0]?.getDate()).toBe(19);
  });

  test("describes days relative to today", () => {
    expect(relativeDay(new Date(2026, 10, 12, 23), now)).toBe("hoy");
    expect(relativeDay(new Date(2026, 10, 13), now)).toBe("mañana");
    expect(relativeDay(new Date(2026, 10, 19), now)).toBe("en 7 días");
    expect(relativeDay(new Date(2026, 10, 9), now)).toBe("hace 3 días");
  });
});

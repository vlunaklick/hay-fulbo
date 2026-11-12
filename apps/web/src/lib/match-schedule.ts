/**
 * Pure helpers behind the match list: what is coming up, what still needs
 * closing, and when the group usually plays (to suggest the next date).
 * Dates are read in the viewer's local time, like `formatDate`.
 */

export type ScheduledMatch = {
  scheduledAt: Date;
  status: "open" | "closed" | "cancelled";
  courtId: string | null;
  courtCostMinor: string | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function sameDay(a: Date, b: Date) {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

/**
 * Open matches from today on are upcoming (soonest first); open matches from
 * earlier days were played but not closed yet. Closed and cancelled matches are
 * history, newest first.
 */
export function splitMatches<T extends ScheduledMatch>(matches: readonly T[], now: Date) {
  const today = startOfDay(now);
  const byDate = (a: T, b: T) => a.scheduledAt.getTime() - b.scheduledAt.getTime();
  const open = matches.filter((match) => match.status === "open");
  return {
    upcoming: open.filter((match) => match.scheduledAt >= today).sort(byDate),
    unclosed: open.filter((match) => match.scheduledAt < today).sort(byDate),
    played: matches.filter((match) => match.status !== "open").sort((a, b) => byDate(b, a)),
  };
}

export type GroupHabit = {
  slots: { weekday: number; hour: number; minute: number }[];
  courtId: string | null;
  courtCostMinor: string | null;
};

const DEFAULT_SLOT = { weekday: 4, hour: 21, minute: 0 };

/**
 * The group's two most played weekday + time slots, and the court and cost of
 * its latest non-cancelled match with a court. Falls back to Thursday 21:00.
 */
export function groupHabit(matches: readonly ScheduledMatch[]): GroupHabit {
  const counts = new Map<string, { slot: GroupHabit["slots"][number]; count: number }>();
  for (const match of matches) {
    if (match.status === "cancelled") continue;
    const slot = {
      weekday: match.scheduledAt.getDay(),
      hour: match.scheduledAt.getHours(),
      minute: match.scheduledAt.getMinutes(),
    };
    const key = `${slot.weekday}-${slot.hour}-${slot.minute}`;
    counts.set(key, { slot, count: (counts.get(key)?.count ?? 0) + 1 });
  }
  const slots = [...counts.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 2)
    .map((entry) => entry.slot);
  const latest = matches
    .filter((match) => match.status !== "cancelled" && match.courtId)
    .toSorted((a, b) => b.scheduledAt.getTime() - a.scheduledAt.getTime())[0];
  return {
    slots: slots.length ? slots : [DEFAULT_SLOT],
    courtId: latest?.courtId ?? null,
    courtCostMinor: latest?.courtCostMinor ?? null,
  };
}

/** The next `count` habitual slots, within four weeks, on days without a match. */
export function suggestedDates(matches: readonly ScheduledMatch[], now: Date, count = 3) {
  const { slots } = groupHabit(matches);
  const taken = matches.filter((match) => match.status !== "cancelled");
  const results: Date[] = [];
  for (let offset = 0; offset < 28 && results.length < count; offset++) {
    const day = startOfDay(new Date(now.getTime() + offset * DAY_MS));
    for (const slot of slots.toSorted((a, b) => a.hour - b.hour || a.minute - b.minute)) {
      if (day.getDay() !== slot.weekday) continue;
      const candidate = new Date(day);
      candidate.setHours(slot.hour, slot.minute, 0, 0);
      if (candidate <= now) continue;
      if (taken.some((match) => sameDay(match.scheduledAt, candidate))) continue;
      results.push(candidate);
    }
  }
  return results.slice(0, count);
}

/** "hoy", "mañana", "en 3 días", "ayer", "hace 2 días". */
export function relativeDay(date: Date, now: Date) {
  const days = Math.round((startOfDay(date).getTime() - startOfDay(now).getTime()) / DAY_MS);
  if (days === 0) return "hoy";
  if (days === 1) return "mañana";
  if (days === -1) return "ayer";
  return days > 1 ? `en ${days} días` : `hace ${-days} días`;
}

/** Value for an `<input type="datetime-local">` in local time. */
export function toLocalInput(date: Date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

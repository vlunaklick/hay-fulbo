/**
 * Pure rules behind the group home: which match is "la fecha" right now and
 * which of its four moments it is in (convocando, en juego, por cerrar, cerrada).
 */

import { startOfDay } from "./match-schedule";
import { isLive, MIN_PER_TEAM } from "./next-step";

type DatedMatch = {
  id: string;
  scheduledAt: Date;
  status: "open" | "closed" | "cancelled";
};

export type FechaPhase = "upcoming" | "live" | "close" | "closed";

export type Fecha = { matchId: string; phase: FechaPhase };

/**
 * The match the home is about, in this order: one being played, a past match
 * left open (managers close it), the next one, and otherwise the last closed
 * match (results and what is still owed). `null` for a group with no matches.
 */
export function pickFecha(input: {
  now: Date;
  canManage: boolean;
  matches: readonly DatedMatch[];
  upcomingId: string | null;
}): Fecha | null {
  const { now, canManage, matches, upcomingId } = input;
  const byDateDesc = matches.toSorted((a, b) => b.scheduledAt.getTime() - a.scheduledAt.getTime());

  const live = byDateDesc.find((match) => isLive(match, now));
  if (live) return { matchId: live.id, phase: "live" };

  if (canManage) {
    const unclosed = byDateDesc
      .filter((match) => match.status === "open" && match.scheduledAt < startOfDay(now))
      .at(-1);
    if (unclosed) return { matchId: unclosed.id, phase: "close" };
  }

  if (upcomingId) return { matchId: upcomingId, phase: "upcoming" };

  const lastClosed = byDateDesc.find(
    (match) => match.status === "closed" && match.scheduledAt <= now,
  );
  return lastClosed ? { matchId: lastClosed.id, phase: "closed" } : null;
}

/**
 * Players the roster aims for: both teams at the size of the biggest one, never
 * below {@link MIN_PER_TEAM}. `[3, 5]` → 10; `[6, 6]` → 12; `[]` → 10.
 */
export function rosterTarget(teamSizes: readonly number[]) {
  const sizes = teamSizes.length ? teamSizes : [0, 0];
  return Math.max(MIN_PER_TEAM, ...sizes) * sizes.length;
}

type Contribution = {
  playerId: string;
  playerDisplayName: string;
  debtMinor: string;
};

/** Who still owes money for a match, biggest debt first, with the total. */
export function owedFor(detail: {
  teams: readonly { appearances: readonly Contribution[] }[];
  absences: readonly (Contribution & { owesContribution: boolean })[];
}) {
  const people = [
    ...detail.teams.flatMap((team) => team.appearances),
    ...detail.absences.filter((absence) => absence.owesContribution),
  ];
  const debtors = people
    .filter((person) => BigInt(person.debtMinor) > 0n)
    .toSorted((a, b) => {
      const diff = BigInt(b.debtMinor) - BigInt(a.debtMinor);
      return diff > 0n
        ? 1
        : diff < 0n
          ? -1
          : a.playerDisplayName.localeCompare(b.playerDisplayName);
    });
  const totalMinor = debtors.reduce((total, person) => total + BigInt(person.debtMinor), 0n);
  return { debtors, people: people.length, paid: people.length - debtors.length, totalMinor };
}

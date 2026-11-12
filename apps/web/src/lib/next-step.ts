/**
 * Pure rules behind the "Próximo paso" card on the group home and the match
 * list: which single thing the viewer should do now.
 */

import { startOfDay } from "./match-schedule";

type DatedMatch = {
  id: string;
  scheduledAt: Date;
  status: "open" | "closed" | "cancelled";
};

/** An open match that already kicked off today: it is being played right now. */
export function isLive(match: DatedMatch, now: Date) {
  return (
    match.status === "open" && match.scheduledAt <= now && match.scheduledAt >= startOfDay(now)
  );
}

/** Players per team a 5-a-side match needs before it stops asking for invites. */
export const MIN_PER_TEAM = 5;

/**
 * Players still missing so both teams reach the same size, never below
 * {@link MIN_PER_TEAM}. `[3, 5]` → 2; `[]` → 10.
 */
export function missingPlayers(teamSizes: readonly number[]) {
  const sizes = teamSizes.length ? teamSizes : [0, 0];
  const target = Math.max(MIN_PER_TEAM, ...sizes);
  return sizes.reduce((total, size) => total + (target - size), 0);
}

export type HomeStep =
  | { kind: "live"; matchId: string; scheduledAt: Date }
  | { kind: "close"; matchId: string; scheduledAt: Date }
  | { kind: "invite"; matchId: string; missing: number }
  | { kind: "collect"; matchId: string; debtMinor: bigint; debtors: number }
  | { kind: "pay"; matchId: string; debtMinor: bigint }
  | { kind: "create" };

/**
 * The most urgent thing in the group, in this order: a match being played, a
 * past match left open (managers), a short-handed next match, money owed on the
 * next match (managers collect, players pay their part), and, with no next
 * match, creating one (managers). `null` when there is nothing to do.
 */
export function pickHomeStep(input: {
  now: Date;
  canManage: boolean;
  matches: readonly DatedMatch[];
  upcoming: {
    matchId: string;
    /** Players per team, once the match detail loaded. */
    teamSizes: readonly number[] | null;
  } | null;
  finances: { debtMinor: string; debtors: number } | null;
  myDebtMinor: bigint | null;
}): HomeStep | null {
  const { now, canManage, matches, upcoming } = input;
  const live = matches
    .filter((match) => isLive(match, now))
    .toSorted((a, b) => b.scheduledAt.getTime() - a.scheduledAt.getTime())[0];
  if (live) return { kind: "live", matchId: live.id, scheduledAt: live.scheduledAt };

  if (canManage) {
    const unclosed = matches
      .filter((match) => match.status === "open" && match.scheduledAt < startOfDay(now))
      .toSorted((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime())[0];
    if (unclosed) {
      return { kind: "close", matchId: unclosed.id, scheduledAt: unclosed.scheduledAt };
    }
  }

  if (!upcoming) return canManage ? { kind: "create" } : null;

  if (upcoming.teamSizes) {
    const missing = missingPlayers(upcoming.teamSizes);
    if (missing > 0) return { kind: "invite", matchId: upcoming.matchId, missing };
  }

  const debt = input.finances ? BigInt(input.finances.debtMinor) : 0n;
  if (canManage && input.finances && debt > 0n) {
    return {
      kind: "collect",
      matchId: upcoming.matchId,
      debtMinor: debt,
      debtors: input.finances.debtors,
    };
  }
  if (input.myDebtMinor !== null && input.myDebtMinor > 0n) {
    return { kind: "pay", matchId: upcoming.matchId, debtMinor: input.myDebtMinor };
  }
  return null;
}

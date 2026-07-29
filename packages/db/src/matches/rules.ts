export type MatchRuleErrorCode =
  | "negative_amount"
  | "duplicate_joined_order"
  | "fixed_amounts_exceed_cost"
  | "unallocated_remainder";

export class MatchRuleError extends Error {
  constructor(readonly code: MatchRuleErrorCode) {
    super(code);
    this.name = "MatchRuleError";
  }
}

type Contribution =
  | {
      playerId: string;
      joinedOrder: number;
      kind: "automatic";
    }
  | {
      playerId: string;
      joinedOrder: number;
      kind: "fixed";
      expectedMinor: bigint;
    };

export function calculateExpectedContributions(input: {
  courtCostMinor: bigint;
  contributions: readonly Contribution[];
}): { playerId: string; expectedMinor: bigint }[] {
  if (input.courtCostMinor < 0n) {
    throw new MatchRuleError("negative_amount");
  }

  const joinedOrders = new Set<number>();
  let fixedTotal = 0n;
  const automatic = input.contributions
    .filter((contribution) => {
      if (joinedOrders.has(contribution.joinedOrder)) {
        throw new MatchRuleError("duplicate_joined_order");
      }
      joinedOrders.add(contribution.joinedOrder);

      if (contribution.kind === "fixed") {
        if (contribution.expectedMinor < 0n) {
          throw new MatchRuleError("negative_amount");
        }
        fixedTotal += contribution.expectedMinor;
        return false;
      }
      return true;
    })
    .toSorted((left, right) => left.joinedOrder - right.joinedOrder);

  if (fixedTotal > input.courtCostMinor) {
    throw new MatchRuleError("fixed_amounts_exceed_cost");
  }

  const remainder = input.courtCostMinor - fixedTotal;
  if (automatic.length === 0 && remainder > 0n) {
    throw new MatchRuleError("unallocated_remainder");
  }

  const automaticCount = BigInt(automatic.length);
  const quotient = automaticCount === 0n ? 0n : remainder / automaticCount;
  const residualUnits = automaticCount === 0n ? 0n : remainder % automaticCount;
  const automaticAmounts = new Map(
    automatic.map((contribution, index) => [
      contribution.playerId,
      quotient + (BigInt(index) < residualUnits ? 1n : 0n),
    ]),
  );

  return input.contributions.map((contribution) => ({
    playerId: contribution.playerId,
    expectedMinor:
      contribution.kind === "fixed"
        ? contribution.expectedMinor
        : (automaticAmounts.get(contribution.playerId) ?? 0n),
  }));
}

export type ScoreTeam = {
  id: string;
  unattributedGoals: number;
};

export type ScoreAppearance = {
  teamId: string;
  goals: number;
  assists: number;
  ownGoals: number;
};

export function calculateScore(input: {
  teams: readonly ScoreTeam[];
  appearances: readonly ScoreAppearance[];
}): { teamId: string; goals: number }[] {
  return input.teams.map((team) => ({
    teamId: team.id,
    goals:
      team.unattributedGoals +
      sum(
        input.appearances
          .filter((appearance) => appearance.teamId === team.id)
          .map((appearance) => appearance.goals),
      ) +
      sum(
        input.appearances
          .filter((appearance) => appearance.teamId !== team.id)
          .map((appearance) => appearance.ownGoals),
      ),
  }));
}

export type ClosureIssue =
  | "match_not_started"
  | "court_required"
  | "court_cost_required"
  | "invalid_team_slots"
  | "team_without_players"
  | "negative_sporting_total"
  | "assists_exceed_attributed_goals"
  | "expected_total_mismatch";

export function validateMatchClosure(input: {
  now: Date;
  scheduledAt: Date;
  courtId: string | null;
  courtCostMinor: bigint | null;
  teams: readonly (ScoreTeam & { slot: number })[];
  appearances: readonly (ScoreAppearance & {
    playerId: string;
    expectedMinor: bigint;
  })[];
}): {
  ok: boolean;
  issues: ClosureIssue[];
  score: { teamId: string; goals: number }[];
} {
  const issues: ClosureIssue[] = [];

  if (input.scheduledAt.getTime() > input.now.getTime()) {
    issues.push("match_not_started");
  }
  if (input.courtId === null) {
    issues.push("court_required");
  }
  if (input.courtCostMinor === null) {
    issues.push("court_cost_required");
  }

  const slots = input.teams.map((team) => team.slot).toSorted();
  if (slots.length !== 2 || slots[0] !== 1 || slots[1] !== 2) {
    issues.push("invalid_team_slots");
  }
  if (
    input.teams.some(
      (team) => !input.appearances.some((appearance) => appearance.teamId === team.id),
    )
  ) {
    issues.push("team_without_players");
  }
  if (
    input.teams.some((team) => team.unattributedGoals < 0) ||
    input.appearances.some(
      (appearance) => appearance.goals < 0 || appearance.assists < 0 || appearance.ownGoals < 0,
    )
  ) {
    issues.push("negative_sporting_total");
  }
  if (
    input.teams.some((team) => {
      const appearances = input.appearances.filter((appearance) => appearance.teamId === team.id);
      const attributedAndUnattributedGoals =
        sum(appearances.map((appearance) => appearance.goals)) + team.unattributedGoals;
      return (
        sum(appearances.map((appearance) => appearance.assists)) > attributedAndUnattributedGoals
      );
    })
  ) {
    issues.push("assists_exceed_attributed_goals");
  }
  if (
    input.courtCostMinor !== null &&
    input.appearances.reduce((total, appearance) => total + appearance.expectedMinor, 0n) !==
      input.courtCostMinor
  ) {
    issues.push("expected_total_mismatch");
  }

  return {
    ok: issues.length === 0,
    issues,
    score: calculateScore(input),
  };
}

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

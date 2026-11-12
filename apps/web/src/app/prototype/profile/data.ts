// PROTOTYPE ONLY — mock data shaped like trpc `stats.global` (packages/api/src/routers/stats.ts).
// Worst-case content on purpose: long names, a linked group with no closed matches
// (production renders it as "Sin vincular"), and an unlinked group.

export type Aggregate = {
  played: number;
  wins: number;
  draws: number;
  losses: number;
  winPercentage: number;
  goals: number;
  assists: number;
  contributions: number;
  goalsPerMatch: number;
  assistsPerMatch: number;
  contributionsPerMatch: number;
  goalDifference: number;
  ownGoals: number;
  absences: number;
  ratingAverage: number | null;
  ratingMatchCount: number;
};

export type GroupBreakdown = {
  groupName: string;
  linked: boolean;
  playerName: string | null;
  aggregate: Aggregate | null;
};

export type GlobalStats = {
  groups: GroupBreakdown[];
  totals: {
    played: number;
    wins: number;
    draws: number;
    losses: number;
    goals: number;
    assists: number;
    contributions: number;
    winPercentage: number;
  };
};

export type ProfileData = { userName: string; stats: GlobalStats };

function aggregate(input: {
  played: number;
  wins: number;
  draws: number;
  goals: number;
  assists: number;
  goalDifference: number;
  ownGoals?: number;
  absences?: number;
  ratingAverage?: number | null;
  ratingMatchCount?: number;
}): Aggregate {
  const losses = input.played - input.wins - input.draws;
  const contributions = input.goals + input.assists;
  return {
    played: input.played,
    wins: input.wins,
    draws: input.draws,
    losses,
    winPercentage: input.played === 0 ? 0 : (input.wins / input.played) * 100,
    goals: input.goals,
    assists: input.assists,
    contributions,
    goalsPerMatch: input.played === 0 ? 0 : input.goals / input.played,
    assistsPerMatch: input.played === 0 ? 0 : input.assists / input.played,
    contributionsPerMatch: input.played === 0 ? 0 : contributions / input.played,
    goalDifference: input.goalDifference,
    ownGoals: input.ownGoals ?? 0,
    absences: input.absences ?? 0,
    ratingAverage: input.ratingAverage ?? null,
    ratingMatchCount: input.ratingMatchCount ?? 0,
  };
}

function withTotals(groups: GroupBreakdown[]): GlobalStats {
  const totals = {
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goals: 0,
    assists: 0,
    contributions: 0,
  };
  for (const group of groups) {
    if (!group.aggregate) continue;
    totals.played += group.aggregate.played;
    totals.wins += group.aggregate.wins;
    totals.draws += group.aggregate.draws;
    totals.losses += group.aggregate.losses;
    totals.goals += group.aggregate.goals;
    totals.assists += group.aggregate.assists;
    totals.contributions += group.aggregate.contributions;
  }
  return {
    groups,
    totals: {
      ...totals,
      winPercentage: totals.played === 0 ? 0 : (totals.wins / totals.played) * 100,
    },
  };
}

const USER_NAME = "Juan Ignacio Fernández Etchegaray";

export const FULL: ProfileData = {
  userName: USER_NAME,
  stats: withTotals([
    {
      groupName: "Fulbo de los martes — Club Atlético Villa Crespo",
      linked: true,
      playerName: "Juani Fernández",
      aggregate: aggregate({
        played: 31,
        wins: 17,
        draws: 5,
        goals: 23,
        assists: 14,
        goalDifference: 18,
        ownGoals: 1,
        absences: 6,
        ratingAverage: 7.4,
        ratingMatchCount: 22,
      }),
    },
    {
      groupName: "Los del laburo",
      linked: true,
      playerName: "Juan F.",
      aggregate: aggregate({
        played: 8,
        wins: 3,
        draws: 1,
        goals: 4,
        assists: 6,
        goalDifference: -3,
        absences: 2,
      }),
    },
    {
      groupName: "Fútbol 5 de los viernes",
      linked: true,
      playerName: "Juan Ignacio",
      aggregate: null,
    },
    {
      groupName: "Picado del domingo en Parque Centenario",
      linked: false,
      playerName: null,
      aggregate: null,
    },
  ]),
};

export const EMPTY: ProfileData = {
  userName: USER_NAME,
  stats: withTotals([
    {
      groupName: "Fútbol 5 de los viernes",
      linked: true,
      playerName: "Juan Ignacio",
      aggregate: null,
    },
    {
      groupName: "Picado del domingo en Parque Centenario",
      linked: false,
      playerName: null,
      aggregate: null,
    },
  ]),
};

// Shared formatting helpers for every variant.
const decimal = new Intl.NumberFormat("es-AR", {
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});
const oneDecimal = new Intl.NumberFormat("es-AR", {
  maximumFractionDigits: 1,
  minimumFractionDigits: 1,
});
const whole = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });

export const fmt = {
  perMatch: (value: number) => decimal.format(value),
  rating: (value: number) => oneDecimal.format(value),
  pct: (value: number) => `${whole.format(value)}%`,
  signed: (value: number) => (value > 0 ? `+${value}` : `${value}`),
};

export function plural(count: number, one: string, many: string) {
  return count === 1 ? one : many;
}

export type GroupState = "stats" | "no-matches" | "unlinked";

export function groupState(group: GroupBreakdown): GroupState {
  if (group.aggregate) return "stats";
  return group.linked ? "no-matches" : "unlinked";
}

export const GROUP_HINT: Record<Exclude<GroupState, "stats">, string> = {
  "no-matches": "Todavía no jugaste partidos cerrados acá.",
  unlinked: "Tu cuenta no está vinculada a un jugador de este grupo.",
};

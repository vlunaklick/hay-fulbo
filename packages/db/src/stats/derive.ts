import type {
  PlayerStats,
  StatsAggregate,
  StatsDashboard,
  StatsFilters,
  StatsMatchDetail,
  StatsMatchListItem,
  StatsSource,
  StatsSourceMatch,
  StatsSourceTeam,
} from "./types";

type ScoredMatch = {
  match: StatsSourceMatch;
  teams: readonly [StatsSourceTeam, StatsSourceTeam];
  scores: ReadonlyMap<string, number>;
};

export function deriveStatsDashboard(
  source: StatsSource,
  filters: StatsFilters = {},
  now = new Date(),
): StatsDashboard {
  const closedMatches = source.matches
    .filter((match) => match.status === "closed")
    .filter((match) => matchesPrimaryFilters(match, filters, source.group.timeZone))
    .map(scoreMatch)
    .filter(isScoredMatch);
  const ranking = buildRanking(source, closedMatches);
  const history = source.matches
    .filter((match) => match.status === "closed" || match.status === "cancelled")
    .filter((match) => matchesPrimaryFilters(match, filters, source.group.timeZone))
    .map(scoreMatch)
    .filter(isScoredMatch)
    .filter((match) => matchesResultFilter(match, filters.result))
    .sort(descendingByScheduledAt)
    .map((match) => toListItem(source, match));
  const upcomingMatch =
    source.matches
      .filter((match) => match.status === "open" && match.scheduledAt >= now)
      .sort((left, right) => left.scheduledAt.getTime() - right.scheduledAt.getTime())[0] ?? null;
  const upcoming = upcomingMatch ? scoreMatch(upcomingMatch) : null;

  const totalGoals = closedMatches.reduce(
    (total, scored) => total + [...scored.scores.values()].reduce((sum, goals) => sum + goals, 0),
    0,
  );

  return {
    group: source.group,
    courts: source.courts,
    filters,
    summary: {
      matchesPlayed: closedMatches.length,
      totalGoals,
      goalsPerMatch: ratio(totalGoals, closedMatches.length),
    },
    ranking,
    history,
    upcoming: upcoming
      ? {
          ...toListItem(source, upcoming),
          courtCostMinor: money(upcoming.match.courtCostMinor),
        }
      : null,
    finances: upcoming ? buildFinances(source, upcoming) : null,
  };
}

export function derivePlayerStats(
  source: StatsSource,
  playerId: string,
  filters: StatsFilters = {},
): PlayerStats | null {
  const player = source.players.find((candidate) => candidate.id === playerId);
  if (!player) return null;

  const scoredMatches = source.matches
    .filter((match) => match.status === "closed")
    .filter((match) => matchesPrimaryFilters(match, filters, source.group.timeZone))
    .map(scoreMatch)
    .filter(isScoredMatch)
    .filter((scored) =>
      scored.teams.some((team) =>
        team.appearances.some((appearance) => appearance.playerId === playerId),
      ),
    );
  const aggregate = buildRanking(source, scoredMatches).find(
    (candidate) => candidate.playerId === playerId,
  );
  const matches = scoredMatches.sort(descendingByScheduledAt).map((scored) => {
    const team = scored.teams.find((candidate) =>
      candidate.appearances.some((appearance) => appearance.playerId === playerId),
    );
    if (!team) throw new Error("player appearance lost while deriving detail");
    const opponent = scored.teams.find((candidate) => candidate.id !== team.id);
    if (!opponent) throw new Error("opponent lost while deriving detail");
    const appearance = team.appearances.find((candidate) => candidate.playerId === playerId);
    if (!appearance) throw new Error("player appearance lost while deriving detail");
    const teamScore = scored.scores.get(team.id) ?? 0;
    const opponentScore = scored.scores.get(opponent.id) ?? 0;
    return {
      ...toListItem(source, scored),
      teamId: team.id,
      outcome: outcome(teamScore, opponentScore),
      goals: appearance.goals,
      assists: appearance.assists,
      contributions: appearance.goals + appearance.assists,
      ownGoals: appearance.ownGoals,
    };
  });

  return {
    group: source.group,
    player,
    aggregate: aggregate ?? null,
    matches,
  };
}

export function deriveStatsMatch(source: StatsSource, matchId: string): StatsMatchDetail | null {
  const match = source.matches.find((candidate) => candidate.id === matchId);
  if (!match) return null;
  const scored = scoreMatch(match);
  if (!scored) return null;
  const players = new Map(source.players.map((player) => [player.id, player]));

  return {
    ...toListItem(source, scored),
    group: source.group,
    courtCostMinor: money(match.courtCostMinor),
    appearances: scored.teams
      .flatMap((team) =>
        team.appearances.map((appearance) => ({
          playerId: appearance.playerId,
          playerDisplayName: players.get(appearance.playerId)?.displayName ?? "Jugador desconocido",
          teamId: team.id,
          joinedOrder: appearance.joinedOrder,
          goals: appearance.goals,
          assists: appearance.assists,
          ownGoals: appearance.ownGoals,
          expectedMinor: money(appearance.expectedMinor) ?? "0",
          paidMinor: money(appearance.paidMinor) ?? "0",
          debtMinor: money(maxBigInt(appearance.expectedMinor - appearance.paidMinor, 0n)) ?? "0",
        })),
      )
      .sort((left, right) => left.joinedOrder - right.joinedOrder),
  };
}

function buildRanking(source: StatsSource, matches: readonly ScoredMatch[]): StatsAggregate[] {
  const players = new Map(source.players.map((player) => [player.id, player]));
  const rows = new Map<string, StatsAggregate>();

  for (const scored of matches) {
    for (const team of scored.teams) {
      const opponent = scored.teams.find((candidate) => candidate.id !== team.id);
      if (!opponent) continue;
      const teamScore = scored.scores.get(team.id) ?? 0;
      const opponentScore = scored.scores.get(opponent.id) ?? 0;
      const result = outcome(teamScore, opponentScore);

      for (const appearance of team.appearances) {
        const player = players.get(appearance.playerId);
        if (!player) continue;
        const row =
          rows.get(player.id) ??
          ({
            playerId: player.id,
            displayName: player.displayName,
            normalizedName: player.normalizedName,
            archived: player.archived,
            played: 0,
            wins: 0,
            draws: 0,
            losses: 0,
            points: 0,
            winPercentage: 0,
            goals: 0,
            assists: 0,
            contributions: 0,
            goalsPerMatch: 0,
            assistsPerMatch: 0,
            contributionsPerMatch: 0,
            goalsFor: 0,
            goalsAgainst: 0,
            goalDifference: 0,
            ownGoals: 0,
          } satisfies StatsAggregate);
        row.played += 1;
        row.wins += result === "win" ? 1 : 0;
        row.draws += result === "draw" ? 1 : 0;
        row.losses += result === "loss" ? 1 : 0;
        row.points += result === "win" ? 3 : result === "draw" ? 1 : 0;
        row.goals += appearance.goals;
        row.assists += appearance.assists;
        row.contributions += appearance.goals + appearance.assists;
        row.goalsFor += teamScore;
        row.goalsAgainst += opponentScore;
        row.goalDifference = row.goalsFor - row.goalsAgainst;
        row.ownGoals += appearance.ownGoals;
        rows.set(player.id, row);
      }
    }
  }

  return [...rows.values()]
    .map((row) => ({
      ...row,
      winPercentage: ratio(row.wins * 100, row.played),
      goalsPerMatch: ratio(row.goals, row.played),
      assistsPerMatch: ratio(row.assists, row.played),
      contributionsPerMatch: ratio(row.contributions, row.played),
    }))
    .sort(compareRanking);
}

function buildFinances(source: StatsSource, scored: ScoredMatch): StatsDashboard["finances"] {
  const players = new Map(source.players.map((player) => [player.id, player]));
  const appearances = scored.teams.flatMap((team) => team.appearances);
  const expected = sumMoney(appearances.map((appearance) => appearance.expectedMinor));
  const paid = sumMoney(appearances.map((appearance) => appearance.paidMinor));
  const debt = sumMoney(
    appearances.map((appearance) => maxBigInt(appearance.expectedMinor - appearance.paidMinor, 0n)),
  );
  const debtors = appearances
    .filter((appearance) => appearance.paidMinor < appearance.expectedMinor)
    .map((appearance) => ({
      playerId: appearance.playerId,
      displayName: players.get(appearance.playerId)?.displayName ?? "Jugador desconocido",
      expectedMinor: appearance.expectedMinor.toString(),
      paidMinor: appearance.paidMinor.toString(),
      debtMinor: (appearance.expectedMinor - appearance.paidMinor).toString(),
    }))
    .sort((left, right) => left.displayName.localeCompare(right.displayName, "es"));

  return {
    matchId: scored.match.id,
    courtCostMinor: money(scored.match.courtCostMinor),
    expectedMinor: expected.toString(),
    paidMinor: paid.toString(),
    debtMinor: debt.toString(),
    participantCount: appearances.length,
    paidCount: appearances.filter((appearance) => appearance.paidMinor >= appearance.expectedMinor)
      .length,
    debtors,
  };
}

function scoreMatch(match: StatsSourceMatch): ScoredMatch | null {
  const teams = [...match.teams].sort((left, right) => left.slot - right.slot);
  if (teams.length !== 2) return null;
  const [first, second] = teams;
  if (!first || !second) return null;
  const scores = new Map<string, number>();
  for (const team of teams) {
    const opponent = team.id === first.id ? second : first;
    const attributed = team.appearances.reduce((sum, appearance) => sum + appearance.goals, 0);
    const opponentOwnGoals = opponent.appearances.reduce(
      (sum, appearance) => sum + appearance.ownGoals,
      0,
    );
    scores.set(team.id, attributed + team.unattributedGoals + opponentOwnGoals);
  }
  return { match, teams: [first, second], scores };
}

function toListItem(source: StatsSource, scored: ScoredMatch): StatsMatchListItem {
  const court = source.courts.find((candidate) => candidate.id === scored.match.courtId) ?? null;
  return {
    matchId: scored.match.id,
    scheduledAt: scored.match.scheduledAt,
    status: scored.match.status,
    court,
    teams: scored.teams.map((team) => ({
      id: team.id,
      slot: team.slot,
      displayName: team.displayName,
      color: team.color,
      captainName: team.captainName,
      goals: scored.scores.get(team.id) ?? 0,
    })),
  };
}

function matchesPrimaryFilters(match: StatsSourceMatch, filters: StatsFilters, timeZone: string) {
  if (filters.courtId && match.courtId !== filters.courtId) return false;
  const localDate = formatLocalDate(match.scheduledAt, timeZone);
  if (filters.from && localDate < filters.from) return false;
  if (filters.to && localDate > filters.to) return false;
  return true;
}

function matchesResultFilter(scored: ScoredMatch, filter: StatsFilters["result"]) {
  if (!filter || filter === "all") return true;
  if (scored.match.status === "cancelled") return false;
  const [first, second] = scored.teams;
  const isDraw = scored.scores.get(first.id) === scored.scores.get(second.id);
  return filter === "draws" ? isDraw : !isDraw;
}

function formatLocalDate(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function compareRanking(left: StatsAggregate, right: StatsAggregate) {
  return (
    right.contributions - left.contributions ||
    right.contributionsPerMatch - left.contributionsPerMatch ||
    right.goals - left.goals ||
    right.assists - left.assists ||
    left.normalizedName.localeCompare(right.normalizedName, "es") ||
    left.playerId.localeCompare(right.playerId)
  );
}

function descendingByScheduledAt(left: ScoredMatch, right: ScoredMatch) {
  return right.match.scheduledAt.getTime() - left.match.scheduledAt.getTime();
}

function outcome(teamScore: number, opponentScore: number): "win" | "draw" | "loss" {
  return teamScore > opponentScore ? "win" : teamScore < opponentScore ? "loss" : "draw";
}

function ratio(numerator: number, denominator: number) {
  if (denominator === 0) return 0;
  return Math.round((numerator / denominator) * 100) / 100;
}

function money(value: bigint | null) {
  return value === null ? null : value.toString();
}

function sumMoney(values: readonly bigint[]) {
  return values.reduce((sum, value) => sum + value, 0n);
}

function maxBigInt(left: bigint, right: bigint) {
  return left > right ? left : right;
}

function isScoredMatch(value: ScoredMatch | null): value is ScoredMatch {
  return value !== null;
}

import type {
  MatchParity,
  StatsSociety,
  StatsSource,
  StatsSourceMatch,
  StatsSourceTeam,
} from "./types";

const INITIAL_RATING = 1000;
const K_FACTOR = 24;

type Scored = {
  match: StatsSourceMatch;
  teams: readonly [StatsSourceTeam, StatsSourceTeam];
  leftGoals: number;
  rightGoals: number;
};

export function deriveMatchParity(source: StatsSource, matchId: string): MatchParity | null {
  const target = source.matches.find((match) => match.id === matchId);
  const targetScored = target ? score(target) : null;
  if (!target || !targetScored) return null;

  const ratings = new Map<string, number>();
  const appearances = new Map<string, number>();
  const history = source.matches
    .filter(
      (match) =>
        match.status === "closed" &&
        (match.scheduledAt < target.scheduledAt ||
          (match.scheduledAt.getTime() === target.scheduledAt.getTime() &&
            match.id.localeCompare(target.id) < 0)),
    )
    .map(score)
    .filter((match): match is Scored => match !== null)
    .sort(
      (left, right) =>
        left.match.scheduledAt.getTime() - right.match.scheduledAt.getTime() ||
        left.match.id.localeCompare(right.match.id),
    );

  for (const played of history) {
    const [left, right] = played.teams;
    const leftRating = teamRating(left, ratings);
    const rightRating = teamRating(right, ratings);
    const leftExpected = expectedScore(leftRating, rightRating);
    const leftActual =
      played.leftGoals > played.rightGoals ? 1 : played.leftGoals < played.rightGoals ? 0 : 0.5;
    const delta = K_FACTOR * (leftActual - leftExpected);
    for (const appearance of left.appearances) {
      ratings.set(appearance.playerId, playerRating(appearance.playerId, ratings) + delta);
      appearances.set(appearance.playerId, (appearances.get(appearance.playerId) ?? 0) + 1);
    }
    for (const appearance of right.appearances) {
      ratings.set(appearance.playerId, playerRating(appearance.playerId, ratings) - delta);
      appearances.set(appearance.playerId, (appearances.get(appearance.playerId) ?? 0) + 1);
    }
  }

  const [left, right] = targetScored.teams;
  const currentPlayerIds = [
    ...new Set(
      targetScored.teams.flatMap((team) =>
        team.appearances.map((appearance) => appearance.playerId),
      ),
    ),
  ];
  const averageMatches =
    currentPlayerIds.length === 0
      ? 0
      : currentPlayerIds.reduce((total, playerId) => total + (appearances.get(playerId) ?? 0), 0) /
        currentPlayerIds.length;
  const hasBothTeams = left.appearances.length > 0 && right.appearances.length > 0;
  const hasHistory = currentPlayerIds.some((playerId) => (appearances.get(playerId) ?? 0) > 0);
  const leftRating = teamRating(left, ratings);
  const rightRating = teamRating(right, ratings);
  let leftProbability = 0.36;
  let drawProbability = 0.28;
  let rightProbability = 0.36;

  if (hasBothTeams && hasHistory) {
    const expected = expectedScore(leftRating, rightRating);
    drawProbability = 0.12 + 0.16 * Math.exp(-Math.abs(leftRating - rightRating) / 200);
    leftProbability = (1 - drawProbability) * expected;
    rightProbability = 1 - drawProbability - leftProbability;
  }

  return {
    matchId,
    confidence: averageMatches < 3 ? "low" : averageMatches < 8 ? "medium" : "high",
    sample: {
      averageMatchesPerPlayer: round(averageMatches, 1),
      closedMatches: history.length,
    },
    teams: [
      {
        id: left.id,
        displayName: left.displayName,
        probability: round(leftProbability, 4),
        rating: Math.round(leftRating),
      },
      {
        id: right.id,
        displayName: right.displayName,
        probability: round(rightProbability, 4),
        rating: Math.round(rightRating),
      },
    ],
    drawProbability: round(drawProbability, 4),
  };
}

export function deriveSocieties(
  source: StatsSource,
  matches: readonly StatsSourceMatch[] = source.matches,
): StatsSociety[] {
  const players = new Map(source.players.map((player) => [player.id, player]));
  const rows = new Map<string, StatsSociety>();

  for (const played of matches) {
    if (played.status !== "closed") continue;
    const scored = score(played);
    if (!scored) continue;
    for (const [teamIndex, team] of scored.teams.entries()) {
      const teamGoals = teamIndex === 0 ? scored.leftGoals : scored.rightGoals;
      const opponentGoals = teamIndex === 0 ? scored.rightGoals : scored.leftGoals;
      const outcome =
        teamGoals > opponentGoals ? "win" : teamGoals < opponentGoals ? "loss" : "draw";
      const appearances = [...team.appearances].sort((left, right) =>
        comparePlayers(left.playerId, right.playerId, players),
      );

      for (let leftIndex = 0; leftIndex < appearances.length; leftIndex += 1) {
        for (let rightIndex = leftIndex + 1; rightIndex < appearances.length; rightIndex += 1) {
          const left = appearances[leftIndex];
          const right = appearances[rightIndex];
          if (!left || !right || left.playerId === right.playerId) continue;
          const leftPlayer = players.get(left.playerId);
          const rightPlayer = players.get(right.playerId);
          if (!leftPlayer || !rightPlayer) continue;
          const key = `${left.playerId}:${right.playerId}`;
          const row =
            rows.get(key) ??
            ({
              playerIds: [left.playerId, right.playerId],
              playerNames: [leftPlayer.displayName, rightPlayer.displayName],
              played: 0,
              wins: 0,
              draws: 0,
              losses: 0,
              points: 0,
              winPercentage: 0,
              goalDifference: 0,
              contributions: 0,
            } satisfies StatsSociety);
          row.played += 1;
          row.wins += outcome === "win" ? 1 : 0;
          row.draws += outcome === "draw" ? 1 : 0;
          row.losses += outcome === "loss" ? 1 : 0;
          row.points += outcome === "win" ? 3 : outcome === "draw" ? 1 : 0;
          row.goalDifference += teamGoals - opponentGoals;
          row.contributions += left.goals + left.assists + right.goals + right.assists;
          rows.set(key, row);
        }
      }
    }
  }

  return [...rows.values()]
    .filter((row) => row.played >= 2)
    .map((row) => ({
      ...row,
      winPercentage: round((row.wins * 100) / row.played, 2),
    }))
    .sort(
      (left, right) =>
        right.points - left.points ||
        right.winPercentage - left.winPercentage ||
        right.goalDifference - left.goalDifference ||
        right.contributions - left.contributions ||
        right.played - left.played ||
        left.playerNames[0].localeCompare(right.playerNames[0], "es") ||
        left.playerNames[1].localeCompare(right.playerNames[1], "es") ||
        left.playerIds[0].localeCompare(right.playerIds[0]) ||
        left.playerIds[1].localeCompare(right.playerIds[1]),
    );
}

function score(match: StatsSourceMatch): Scored | null {
  const teams = [...match.teams].sort((left, right) => left.slot - right.slot);
  if (teams.length !== 2) return null;
  const [left, right] = teams;
  if (!left || !right) return null;
  return {
    match,
    teams: [left, right],
    leftGoals:
      left.appearances.reduce((total, item) => total + item.goals, 0) +
      left.unattributedGoals +
      right.appearances.reduce((total, item) => total + item.ownGoals, 0),
    rightGoals:
      right.appearances.reduce((total, item) => total + item.goals, 0) +
      right.unattributedGoals +
      left.appearances.reduce((total, item) => total + item.ownGoals, 0),
  };
}

function playerRating(playerId: string, ratings: ReadonlyMap<string, number>) {
  return ratings.get(playerId) ?? INITIAL_RATING;
}

function teamRating(team: StatsSourceTeam, ratings: ReadonlyMap<string, number>) {
  if (team.appearances.length === 0) return INITIAL_RATING;
  return (
    team.appearances.reduce(
      (total, appearance) => total + playerRating(appearance.playerId, ratings),
      0,
    ) / team.appearances.length
  );
}

function expectedScore(rating: number, opponentRating: number) {
  return 1 / (1 + 10 ** ((opponentRating - rating) / 400));
}

function comparePlayers(
  leftId: string,
  rightId: string,
  players: ReadonlyMap<string, StatsSource["players"][number]>,
) {
  const left = players.get(leftId);
  const right = players.get(rightId);
  return (
    (left?.normalizedName ?? "").localeCompare(right?.normalizedName ?? "", "es") ||
    leftId.localeCompare(rightId)
  );
}

function round(value: number, places: number) {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

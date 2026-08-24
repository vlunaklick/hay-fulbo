import type { RatingQuorumSetting } from "./types";

export function ratingQuorumTarget(quorum: RatingQuorumSetting, eligibleVoters: number): number {
  if (eligibleVoters <= 0) return Number.POSITIVE_INFINITY;
  if (quorum === "first_vote") return 1;
  if (quorum === "half_plus_one") return Math.floor(eligibleVoters / 2) + 1;
  return eligibleVoters;
}

export function isRatingRevealed(
  quorum: RatingQuorumSetting,
  eligibleVoters: number,
  completeVotes: number,
): boolean {
  return completeVotes >= ratingQuorumTarget(quorum, eligibleVoters);
}

export type RatingParticipant = {
  playerId: string;
  linkedUserId: string | null;
};

export type RatingRow = {
  raterPlayerId: string;
  ratedPlayerId: string;
  score: number;
};

/**
 * Keeps only ratings where both the rater and the rated player are current
 * participants, so reopened matches never leak votes toward players who left.
 */
export function validRatingsFor(
  participants: readonly RatingParticipant[],
  ratings: readonly RatingRow[],
): RatingRow[] {
  const ids = new Set(participants.map((participant) => participant.playerId));
  return ratings.filter((rating) => ids.has(rating.raterPlayerId) && ids.has(rating.ratedPlayerId));
}

/**
 * A vote only counts toward the quorum once its author rated every current
 * participant. Raters without a linked user cannot exist (votes come from
 * accounts), but archived players keep voting while they remain participants.
 */
export function completeVoteCount(
  participants: readonly RatingParticipant[],
  ratings: readonly RatingRow[],
): number {
  const voters = new Set(
    participants.filter((p) => p.linkedUserId !== null).map((p) => p.playerId),
  );
  const targets = new Set(participants.map((participant) => participant.playerId));
  const covered = new Map<string, Set<string>>();
  for (const rating of validRatingsFor(participants, ratings)) {
    if (!voters.has(rating.raterPlayerId)) continue;
    const own = covered.get(rating.raterPlayerId) ?? new Set<string>();
    own.add(rating.ratedPlayerId);
    covered.set(rating.raterPlayerId, own);
  }
  let count = 0;
  for (const [voter, rated] of covered) {
    if ([...targets].every((target) => target === voter || rated.has(target))) count += 1;
  }
  return count;
}

export type RatingAverage = { sum: number; votes: number; average: number };

export function ratingAverages(
  participants: readonly RatingParticipant[],
  ratings: readonly RatingRow[],
): Map<string, RatingAverage> {
  const averages = new Map<string, RatingAverage>();
  for (const rating of validRatingsFor(participants, ratings)) {
    const current = averages.get(rating.ratedPlayerId) ?? { sum: 0, votes: 0, average: 0 };
    current.sum += rating.score;
    current.votes += 1;
    current.average = Math.round((current.sum / current.votes) * 100) / 100;
    averages.set(rating.ratedPlayerId, current);
  }
  return averages;
}

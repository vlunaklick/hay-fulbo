import type { ExtractTablesWithRelations } from "drizzle-orm";
import type { NodePgDatabase, NodePgTransaction } from "drizzle-orm/node-postgres";

import type * as schema from "../schema";

export type RatingDatabase = NodePgDatabase<typeof schema>;
export type RatingTransaction = NodePgTransaction<
  typeof schema,
  ExtractTablesWithRelations<typeof schema>
>;

export type RatingScope = {
  groupId: string;
  actorUserId: string;
};

export type RatingQuorumSetting = "all_voted" | "half_plus_one" | "first_vote";

export type RatingErrorCode =
  | "membership_required"
  | "not_found"
  | "match_not_closed"
  | "not_participant"
  | "invalid_input";

export class RatingCommandError extends Error {
  constructor(
    readonly code: RatingErrorCode,
    message = code,
  ) {
    super(message);
    this.name = "RatingCommandError";
  }
}

export type SubmitRatingsInput = {
  matchId: string;
  scores: readonly { playerId: string; score: number }[];
};

export type MatchRatingsPlayer = {
  playerId: string;
  displayName: string;
  teamId: string;
  average: number | null;
  votes: number | null;
};

export type MatchRatingsState = {
  matchId: string;
  status: "open" | "closed" | "cancelled";
  quorum: RatingQuorumSetting;
  eligibleVoters: number;
  completeVotes: number;
  missingVotes: number;
  revealed: boolean;
  viewerCanRate: boolean;
  viewerPlayerId: string | null;
  ownScores: Record<string, number>;
  figure: { playerId: string; displayName: string; average: number } | null;
  players: MatchRatingsPlayer[];
};

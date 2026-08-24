import { and, eq, sql } from "drizzle-orm";

import { match, matchAppearance, matchRating, member, organization, player } from "../schema";
import {
  completeVoteCount,
  isRatingRevealed,
  ratingAverages,
  type RatingParticipant,
} from "./rules";
import {
  RatingCommandError,
  type MatchRatingsState,
  type RatingDatabase,
  type RatingScope,
  type RatingTransaction,
} from "./types";

export type RatingCommands = ReturnType<typeof createRatingCommands>;
export type RatingQueries = ReturnType<typeof createRatingQueries>;

export function createRatingCommands(database: RatingDatabase) {
  return {
    async submit(
      scope: RatingScope,
      input: { matchId: string; scores: readonly { playerId: string; score: number }[] },
    ): Promise<{ matchId: string }> {
      return database.transaction(async (transaction) => {
        await establishScope(transaction, scope);
        const [root] = await transaction
          .select({ id: match.id, status: match.status })
          .from(match)
          .where(and(eq(match.groupId, scope.groupId), eq(match.id, input.matchId)))
          .limit(1);
        if (!root) throw new RatingCommandError("not_found");
        if (root.status !== "closed") throw new RatingCommandError("match_not_closed");

        const appearances = await transaction
          .select({ playerId: matchAppearance.playerId })
          .from(matchAppearance)
          .where(
            and(
              eq(matchAppearance.groupId, scope.groupId),
              eq(matchAppearance.matchId, input.matchId),
            ),
          );
        const participantIds = new Set(appearances.map((row) => row.playerId));

        const [viewer] = await transaction
          .select({ id: player.id })
          .from(player)
          .where(and(eq(player.groupId, scope.groupId), eq(player.linkedUserId, scope.actorUserId)))
          .limit(1);
        if (!viewer || !participantIds.has(viewer.id)) {
          throw new RatingCommandError("not_participant");
        }

        if (input.scores.length === 0) throw new RatingCommandError("invalid_input");
        const seen = new Set<string>();
        for (const item of input.scores) {
          if (item.playerId === viewer.id || !participantIds.has(item.playerId)) {
            throw new RatingCommandError("invalid_input");
          }
          if (!Number.isInteger(item.score) || item.score < 1 || item.score > 10) {
            throw new RatingCommandError("invalid_input");
          }
          if (seen.has(item.playerId)) throw new RatingCommandError("invalid_input");
          seen.add(item.playerId);
        }

        await transaction
          .insert(matchRating)
          .values(
            input.scores.map((item) => ({
              groupId: scope.groupId,
              matchId: input.matchId,
              raterPlayerId: viewer.id,
              ratedPlayerId: item.playerId,
              score: item.score,
            })),
          )
          .onConflictDoUpdate({
            target: [
              matchRating.groupId,
              matchRating.matchId,
              matchRating.raterPlayerId,
              matchRating.ratedPlayerId,
            ],
            set: { score: sql`excluded.score`, updatedAt: sql`now()` },
          });

        return { matchId: input.matchId };
      });
    },
  };
}

export function createRatingQueries(database: RatingDatabase) {
  return {
    async state(scope: RatingScope, matchId: string): Promise<MatchRatingsState> {
      return database.transaction(async (transaction) => {
        await establishScope(transaction, scope);
        return loadState(transaction, scope.actorUserId, matchId);
      });
    },
  };
}

async function loadState(
  transaction: RatingTransaction,
  actorUserId: string,
  matchId: string,
): Promise<MatchRatingsState> {
  const [root] = await transaction
    .select({ groupId: match.groupId, status: match.status })
    .from(match)
    .where(eq(match.id, matchId))
    .limit(1);
  if (!root) throw new RatingCommandError("not_found");

  const [group] = await transaction
    .select({ quorum: organization.ratingQuorum })
    .from(organization)
    .where(eq(organization.id, root.groupId))
    .limit(1);

  const appearanceRows = await transaction
    .select({
      playerId: matchAppearance.playerId,
      displayName: player.displayName,
      teamId: matchAppearance.teamId,
      linkedUserId: player.linkedUserId,
    })
    .from(matchAppearance)
    .innerJoin(
      player,
      and(eq(player.groupId, matchAppearance.groupId), eq(player.id, matchAppearance.playerId)),
    )
    .where(and(eq(matchAppearance.groupId, root.groupId), eq(matchAppearance.matchId, matchId)));

  const ratingRows = await transaction
    .select({
      raterPlayerId: matchRating.raterPlayerId,
      ratedPlayerId: matchRating.ratedPlayerId,
      score: matchRating.score,
    })
    .from(matchRating)
    .where(and(eq(matchRating.groupId, root.groupId), eq(matchRating.matchId, matchId)));

  const [viewer] = await transaction
    .select({ id: player.id })
    .from(player)
    .where(and(eq(player.groupId, root.groupId), eq(player.linkedUserId, actorUserId)))
    .limit(1);

  const participants: RatingParticipant[] = appearanceRows.map((row) => ({
    linkedUserId: row.linkedUserId,
    playerId: row.playerId,
  }));
  const eligibleVoters = participants.filter((p) => p.linkedUserId !== null).length;
  const completeVotes = completeVoteCount(participants, ratingRows);
  const quorum = group?.quorum ?? "all_voted";
  const revealed =
    root.status === "closed" && isRatingRevealed(quorum, eligibleVoters, completeVotes);
  const averages = revealed ? ratingAverages(participants, ratingRows) : new Map();

  const players = appearanceRows.map((row) => ({
    playerId: row.playerId,
    displayName: row.displayName,
    teamId: row.teamId,
    average: averages.get(row.playerId)?.average ?? null,
    votes: averages.get(row.playerId)?.votes ?? null,
  }));

  let figure: MatchRatingsState["figure"] = null;
  if (revealed) {
    for (const row of players) {
      if (row.average === null || row.votes === null || row.votes === 0) continue;
      if (
        figure === null ||
        row.average > figure.average ||
        (row.average === figure.average &&
          row.votes > (players.find((p) => p.playerId === figure?.playerId)?.votes ?? 0))
      ) {
        figure = {
          average: row.average,
          displayName: row.displayName,
          playerId: row.playerId,
        };
      }
    }
  }

  const ownScores: Record<string, number> = {};
  if (viewer) {
    for (const row of ratingRows) {
      if (row.raterPlayerId === viewer.id) ownScores[row.ratedPlayerId] = row.score;
    }
  }

  return {
    matchId,
    status: root.status,
    quorum,
    eligibleVoters,
    completeVotes,
    missingVotes: Math.max(eligibleVoters - completeVotes, 0),
    revealed,
    viewerCanRate:
      root.status === "closed" &&
      Boolean(viewer && appearanceRows.some((row) => row.playerId === viewer.id)),
    viewerPlayerId: viewer?.id ?? null,
    ownScores,
    figure,
    players,
  };
}

async function establishScope(transaction: RatingTransaction, scope: RatingScope) {
  const [membership] = await transaction
    .select({ archivedAt: organization.archivedAt })
    .from(member)
    .innerJoin(organization, eq(organization.id, member.organizationId))
    .where(and(eq(member.organizationId, scope.groupId), eq(member.userId, scope.actorUserId)))
    .limit(1);
  if (!membership || membership.archivedAt !== null) {
    throw new RatingCommandError("membership_required");
  }
}

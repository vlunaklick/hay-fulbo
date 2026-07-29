import { and, asc, desc, eq, gte, lte, sql } from "drizzle-orm";

import {
  court,
  match,
  matchAppearance,
  matchTeam,
  member,
  organization,
  player,
  user,
} from "../schema";
import { calculateScore } from "./rules";
import {
  MatchCommandError,
  type ContributionStatus,
  type MatchDatabase,
  type MatchDetail,
  type MatchDirectory,
  type MatchListItem,
  type MatchScope,
  type MatchTransaction,
} from "./types";

export type MatchQueries = ReturnType<typeof createMatchQueries>;

export function createMatchQueries(database: MatchDatabase) {
  return {
    async detail(scope: MatchScope, matchId: string): Promise<MatchDetail> {
      return database.transaction(async (transaction) => {
        await establishReadScope(transaction, scope);
        return loadDetail(transaction, scope.groupId, matchId);
      });
    },

    async directory(scope: MatchScope): Promise<MatchDirectory> {
      return database.transaction(async (transaction) => {
        await establishReadScope(transaction, scope);
        const [players, courts, members] = await Promise.all([
          transaction
            .select({
              archivedAt: player.archivedAt,
              displayName: player.displayName,
              id: player.id,
              linkedUserId: player.linkedUserId,
            })
            .from(player)
            .where(eq(player.groupId, scope.groupId))
            .orderBy(asc(player.normalizedName), asc(player.id)),
          transaction
            .select({
              address: court.address,
              archivedAt: court.archivedAt,
              id: court.id,
              mapsUrl: court.mapsUrl,
              name: court.name,
            })
            .from(court)
            .where(eq(court.groupId, scope.groupId))
            .orderBy(asc(court.normalizedName), asc(court.id)),
          transaction
            .select({ email: user.email, id: user.id, name: user.name, role: member.role })
            .from(member)
            .innerJoin(user, eq(user.id, member.userId))
            .where(eq(member.organizationId, scope.groupId))
            .orderBy(asc(user.name), asc(user.id)),
        ]);
        return {
          players,
          courts,
          members: members.flatMap((item) =>
            item.role === "owner" || item.role === "member"
              ? [
                  {
                    email: item.email,
                    id: item.id,
                    linkedPlayerId:
                      players.find((candidate) => candidate.linkedUserId === item.id)?.id ?? null,
                    name: item.name,
                    role: item.role,
                  },
                ]
              : [],
          ),
        };
      });
    },

    async list(
      scope: MatchScope,
      filters: {
        status?: "open" | "closed" | "cancelled";
        courtId?: string;
        scheduledFrom?: Date;
        scheduledTo?: Date;
        limit?: number;
      } = {},
    ): Promise<MatchListItem[]> {
      return database.transaction(async (transaction) => {
        await establishReadScope(transaction, scope);
        const conditions = [eq(match.groupId, scope.groupId)];
        if (filters.status) conditions.push(eq(match.status, filters.status));
        if (filters.courtId) conditions.push(eq(match.courtId, filters.courtId));
        if (filters.scheduledFrom) {
          conditions.push(gte(match.scheduledAt, filters.scheduledFrom));
        }
        if (filters.scheduledTo) {
          conditions.push(lte(match.scheduledAt, filters.scheduledTo));
        }
        const rows = await transaction
          .select({ id: match.id })
          .from(match)
          .where(and(...conditions))
          .orderBy(desc(match.scheduledAt), desc(match.createdAt))
          .limit(Math.min(Math.max(filters.limit ?? 50, 1), 100));
        return Promise.all(
          rows.map(async ({ id }) => {
            const detail = await loadDetail(transaction, scope.groupId, id);
            return {
              ...detail,
              teams: detail.teams.map((team) => ({
                id: team.id,
                slot: team.slot,
                displayName: team.displayName,
                color: team.color,
                goals: detail.score.find((score) => score.teamId === team.id)?.goals ?? 0,
              })),
            };
          }),
        );
      });
    },
  };
}

async function establishReadScope(transaction: MatchTransaction, scope: MatchScope) {
  const [access] = await transaction
    .select({ archivedAt: organization.archivedAt })
    .from(member)
    .innerJoin(organization, eq(organization.id, member.organizationId))
    .where(and(eq(member.organizationId, scope.groupId), eq(member.userId, scope.actorUserId)))
    .limit(1);
  if (!access) throw new MatchCommandError("membership_required");
  await transaction.execute(sql`select set_config('app.group_id', ${scope.groupId}, true)`);
}

async function loadDetail(
  transaction: MatchTransaction,
  groupId: string,
  matchId: string,
): Promise<MatchDetail> {
  const [root] = await transaction
    .select()
    .from(match)
    .where(and(eq(match.groupId, groupId), eq(match.id, matchId)))
    .limit(1);
  if (!root) throw new MatchCommandError("not_found");

  const teams = await transaction
    .select()
    .from(matchTeam)
    .where(and(eq(matchTeam.groupId, groupId), eq(matchTeam.matchId, matchId)))
    .orderBy(asc(matchTeam.slot));
  const appearances = await transaction
    .select({
      row: matchAppearance,
      playerDisplayName: player.displayName,
    })
    .from(matchAppearance)
    .innerJoin(
      player,
      and(eq(player.groupId, matchAppearance.groupId), eq(player.id, matchAppearance.playerId)),
    )
    .where(and(eq(matchAppearance.groupId, groupId), eq(matchAppearance.matchId, matchId)))
    .orderBy(asc(matchAppearance.joinedOrder));
  const score = calculateScore({
    teams: teams.map((team) => ({
      id: team.id,
      unattributedGoals: team.unattributedGoals,
    })),
    appearances: appearances.map(({ row }) => row),
  });

  return {
    id: root.id,
    groupId: root.groupId,
    organizerUserId: root.organizerUserId,
    courtId: root.courtId,
    scheduledAt: root.scheduledAt,
    courtCostMinor: root.courtCostMinor,
    status: root.status,
    lockVersion: root.lockVersion,
    score,
    teams: teams.map((team) => ({
      id: team.id,
      slot: team.slot,
      displayName: team.displayName,
      color: team.color,
      captainUserId: team.captainUserId,
      unattributedGoals: team.unattributedGoals,
      appearances: appearances
        .filter(({ row }) => row.teamId === team.id)
        .map(({ row, playerDisplayName }) => ({
          playerId: row.playerId,
          playerDisplayName,
          teamId: row.teamId,
          joinedOrder: row.joinedOrder,
          goals: row.goals,
          assists: row.assists,
          ownGoals: row.ownGoals,
          expectedKind: row.expectedKind,
          expectedMinor: row.expectedMinor,
          paidMinor: row.paidMinor,
          contributionStatus: contributionStatus(row.expectedMinor, row.paidMinor),
          debtMinor: row.expectedMinor > row.paidMinor ? row.expectedMinor - row.paidMinor : 0n,
          overpaidMinor: row.paidMinor > row.expectedMinor ? row.paidMinor - row.expectedMinor : 0n,
        })),
    })),
  };
}

function contributionStatus(expected: bigint, paid: bigint): ContributionStatus {
  if (expected === 0n && paid === 0n) return "exempt";
  if (paid === 0n) return "pending";
  if (paid < expected) return "partial";
  if (paid === expected) return "paid";
  return "overpaid";
}

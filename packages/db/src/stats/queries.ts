import { and, asc, eq, inArray, sql } from "drizzle-orm";
import type { ExtractTablesWithRelations } from "drizzle-orm";
import type { NodePgDatabase, NodePgTransaction } from "drizzle-orm/node-postgres";

import {
  court,
  groupSharedLink,
  match,
  matchAppearance,
  matchTeam,
  member,
  organization,
  player,
  user,
} from "../schema";
import type * as schema from "../schema";
import { derivePlayerStats, deriveStatsDashboard, deriveStatsMatch } from "./derive";
import { deriveMatchParity } from "./insights";
import type {
  MatchParity,
  PlayerStats,
  StatsDashboard,
  StatsFilters,
  StatsMatchDetail,
  StatsSource,
} from "./types";

type StatsDatabase = NodePgDatabase<typeof schema>;
type StatsTransaction = NodePgTransaction<typeof schema, ExtractTablesWithRelations<typeof schema>>;

export type StatsAccess =
  | { kind: "member"; groupId: string; actorUserId: string }
  | { kind: "shared"; groupId: string; generation: number; tokenHash: Buffer };

export type StatsReadErrorCode =
  | "membership_required"
  | "invalid_shared_access"
  | "group_not_found"
  | "not_found";

export class StatsReadError extends Error {
  constructor(
    readonly code: StatsReadErrorCode,
    message = code,
  ) {
    super(message);
    this.name = "StatsReadError";
  }
}

export function createStatsQueries(database: StatsDatabase) {
  return {
    async dashboard(
      access: StatsAccess,
      filters: StatsFilters = {},
      now = new Date(),
    ): Promise<StatsDashboard> {
      return database.transaction(async (transaction) => {
        const source = await loadAuthorizedSource(transaction, access);
        return deriveStatsDashboard(source, filters, now);
      });
    },

    async player(
      access: StatsAccess,
      playerId: string,
      filters: StatsFilters = {},
    ): Promise<PlayerStats> {
      return database.transaction(async (transaction) => {
        const source = await loadAuthorizedSource(transaction, access);
        const result = derivePlayerStats(source, playerId, filters);
        if (!result) throw new StatsReadError("not_found");
        return result;
      });
    },

    async match(access: StatsAccess, matchId: string): Promise<StatsMatchDetail> {
      return database.transaction(async (transaction) => {
        const source = await loadAuthorizedSource(transaction, access);
        const result = deriveStatsMatch(source, matchId);
        if (!result) throw new StatsReadError("not_found");
        return result;
      });
    },

    async parity(access: StatsAccess, matchId: string): Promise<MatchParity> {
      return database.transaction(async (transaction) => {
        const source = await loadAuthorizedSource(transaction, access);
        const result = deriveMatchParity(source, matchId);
        if (!result) throw new StatsReadError("not_found");
        return result;
      });
    },
  };
}

async function loadAuthorizedSource(
  transaction: StatsTransaction,
  access: StatsAccess,
): Promise<StatsSource> {
  await establishStatsScope(transaction, access);
  const [group] = await transaction
    .select({
      currency: organization.currencyCode,
      id: organization.id,
      name: organization.name,
      timeZone: organization.timeZone,
    })
    .from(organization)
    .where(and(eq(organization.id, access.groupId), sql`${organization.archivedAt} is null`))
    .limit(1);
  if (!group) throw new StatsReadError("group_not_found");

  const players = await transaction
    .select({
      archivedAt: player.archivedAt,
      displayName: player.displayName,
      id: player.id,
      normalizedName: player.normalizedName,
    })
    .from(player)
    .where(eq(player.groupId, access.groupId))
    .orderBy(asc(player.normalizedName), asc(player.id));
  const courts = await transaction
    .select({
      address: court.address,
      id: court.id,
      mapsUrl: court.mapsUrl,
      name: court.name,
    })
    .from(court)
    .where(eq(court.groupId, access.groupId))
    .orderBy(asc(court.normalizedName), asc(court.id));
  const matches = await transaction
    .select({
      courtCostMinor: match.courtCostMinor,
      courtId: match.courtId,
      id: match.id,
      scheduledAt: match.scheduledAt,
      status: match.status,
    })
    .from(match)
    .where(eq(match.groupId, access.groupId))
    .orderBy(asc(match.scheduledAt), asc(match.id));

  const matchIds = matches.map(({ id }) => id);
  const teams =
    matchIds.length === 0
      ? []
      : await transaction
          .select({
            captainName: user.name,
            captainUserId: matchTeam.captainUserId,
            color: matchTeam.color,
            displayName: matchTeam.displayName,
            id: matchTeam.id,
            matchId: matchTeam.matchId,
            slot: matchTeam.slot,
            unattributedGoals: matchTeam.unattributedGoals,
          })
          .from(matchTeam)
          .leftJoin(user, eq(user.id, matchTeam.captainUserId))
          .where(and(eq(matchTeam.groupId, access.groupId), inArray(matchTeam.matchId, matchIds)))
          .orderBy(asc(matchTeam.matchId), asc(matchTeam.slot));
  const appearances =
    matchIds.length === 0
      ? []
      : await transaction
          .select({
            assists: matchAppearance.assists,
            expectedMinor: matchAppearance.expectedMinor,
            goals: matchAppearance.goals,
            joinedOrder: matchAppearance.joinedOrder,
            matchId: matchAppearance.matchId,
            ownGoals: matchAppearance.ownGoals,
            paidMinor: matchAppearance.paidMinor,
            playerId: matchAppearance.playerId,
            teamId: matchAppearance.teamId,
          })
          .from(matchAppearance)
          .where(
            and(
              eq(matchAppearance.groupId, access.groupId),
              inArray(matchAppearance.matchId, matchIds),
            ),
          )
          .orderBy(asc(matchAppearance.matchId), asc(matchAppearance.joinedOrder));

  return {
    group,
    courts,
    players: players.map((item) => ({
      id: item.id,
      displayName: item.displayName,
      normalizedName: item.normalizedName,
      archived: item.archivedAt !== null,
    })),
    matches: matches.map((item) => ({
      id: item.id,
      courtId: item.courtId,
      scheduledAt: item.scheduledAt,
      status: item.status,
      courtCostMinor: item.courtCostMinor,
      teams: teams
        .filter((team) => team.matchId === item.id)
        .map((team) => ({
          id: team.id,
          slot: team.slot,
          displayName: team.displayName,
          color: team.color,
          captainName: team.captainUserId ? team.captainName : null,
          unattributedGoals: team.unattributedGoals,
          appearances: appearances
            .filter((appearance) => appearance.matchId === item.id && appearance.teamId === team.id)
            .map((appearance) => ({
              playerId: appearance.playerId,
              joinedOrder: appearance.joinedOrder,
              goals: appearance.goals,
              assists: appearance.assists,
              ownGoals: appearance.ownGoals,
              expectedMinor: appearance.expectedMinor,
              paidMinor: appearance.paidMinor,
            })),
        })),
    })),
  };
}

async function establishStatsScope(transaction: StatsTransaction, access: StatsAccess) {
  if (access.kind === "member") {
    const [membership] = await transaction
      .select({ id: member.id })
      .from(member)
      .innerJoin(organization, eq(organization.id, member.organizationId))
      .where(
        and(
          eq(member.organizationId, access.groupId),
          eq(member.userId, access.actorUserId),
          sql`${organization.archivedAt} is null`,
        ),
      )
      .limit(1);
    if (!membership) throw new StatsReadError("membership_required");
  }

  await transaction.execute(sql`select set_config('app.group_id', ${access.groupId}, true)`);

  if (access.kind === "shared") {
    const [sharedLink] = await transaction
      .select({ generation: groupSharedLink.generation })
      .from(groupSharedLink)
      .where(
        and(
          eq(groupSharedLink.groupId, access.groupId),
          eq(groupSharedLink.generation, access.generation),
          eq(groupSharedLink.tokenHash, access.tokenHash),
        ),
      )
      .limit(1)
      .for("share");
    if (!sharedLink) throw new StatsReadError("invalid_shared_access");
  }
}

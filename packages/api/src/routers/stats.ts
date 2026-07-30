import { db } from "@hay-fulbo/db";
import { createMatchQueries } from "@hay-fulbo/db/matches";
import { createStatsQueries, StatsReadError } from "@hay-fulbo/db/stats";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { protectedProcedure, router } from "../index";
import { statsFiltersSchema, statsIdSchema } from "./stats-input";

const queries = createStatsQueries(db);
const matchQueries = createMatchQueries(db);

export const statsRouter = router({
  global: protectedProcedure.query(async ({ ctx }) => {
    const groups = await ctx.groupAccess.listGroups({
      email: ctx.session.user.email,
      emailVerified: ctx.session.user.emailVerified,
      headers: ctx.requestHeaders,
      userId: ctx.session.user.id,
    });
    const breakdown = await Promise.all(
      groups.map(async (group) => {
        const scope = {
          actorUserId: ctx.session.user.id,
          groupId: group.id,
          kind: "member" as const,
        };
        const directory = await matchQueries.directory(scope);
        const linkedPlayer = directory.players.find(
          (candidate) => candidate.linkedUserId === ctx.session.user.id,
        );
        const playerStats = linkedPlayer ? await queries.player(scope, linkedPlayer.id) : null;
        return {
          groupName: group.name,
          linked: Boolean(linkedPlayer),
          playerName: linkedPlayer?.displayName ?? null,
          aggregate: playerStats?.aggregate ?? null,
        };
      }),
    );
    const totals = breakdown.reduce(
      (result, item) => {
        if (!item.aggregate) return result;
        result.played += item.aggregate.played;
        result.wins += item.aggregate.wins;
        result.draws += item.aggregate.draws;
        result.losses += item.aggregate.losses;
        result.goals += item.aggregate.goals;
        result.assists += item.aggregate.assists;
        result.contributions += item.aggregate.contributions;
        return result;
      },
      {
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goals: 0,
        assists: 0,
        contributions: 0,
      },
    );
    return {
      groups: breakdown,
      totals: {
        ...totals,
        winPercentage: totals.played === 0 ? 0 : (totals.wins / totals.played) * 100,
      },
    };
  }),

  dashboard: protectedProcedure.input(statsFiltersSchema).query(async ({ ctx, input }) => {
    try {
      return await queries.dashboard(scopeFromSession(ctx.session), input ?? {});
    } catch (error) {
      throw asStatsTrpcError(error);
    }
  }),

  player: protectedProcedure
    .input(
      z.object({
        playerId: statsIdSchema,
        filters: statsFiltersSchema,
      }),
    )
    .query(async ({ ctx, input }) => {
      try {
        return await queries.player(
          scopeFromSession(ctx.session),
          input.playerId,
          input.filters ?? {},
        );
      } catch (error) {
        throw asStatsTrpcError(error);
      }
    }),

  match: protectedProcedure
    .input(z.object({ matchId: statsIdSchema }))
    .query(async ({ ctx, input }) => {
      try {
        return await queries.match(scopeFromSession(ctx.session), input.matchId);
      } catch (error) {
        throw asStatsTrpcError(error);
      }
    }),

  parity: protectedProcedure
    .input(z.object({ matchId: statsIdSchema }))
    .query(async ({ ctx, input }) => {
      try {
        return await queries.parity(scopeFromSession(ctx.session), input.matchId);
      } catch (error) {
        throw asStatsTrpcError(error);
      }
    }),
});

function scopeFromSession(session: {
  user: { id: string };
  session: { activeOrganizationId?: string | null };
}) {
  const groupId = session.session.activeOrganizationId;
  if (!groupId) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Seleccioná un grupo para ver sus estadísticas",
    });
  }
  return { kind: "member" as const, groupId, actorUserId: session.user.id };
}

function asStatsTrpcError(error: unknown) {
  if (!(error instanceof StatsReadError)) return error;
  return new TRPCError({
    code:
      error.code === "not_found" || error.code === "group_not_found" ? "NOT_FOUND" : "FORBIDDEN",
    message: error.message,
    cause: { domainCode: error.code },
  });
}

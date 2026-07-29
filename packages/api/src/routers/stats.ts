import { db } from "@hay-fulbo/db";
import { createStatsQueries, StatsReadError } from "@hay-fulbo/db/stats";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { protectedProcedure, router } from "../index";
import { statsFiltersSchema, statsIdSchema } from "./stats-input";

const queries = createStatsQueries(db);

export const statsRouter = router({
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

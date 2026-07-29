import { initTRPC, TRPCError } from "@trpc/server";
import { z } from "zod";

import type { SharedContext } from "../shared-context";
import { statsFiltersSchema } from "./stats-input";

const t = initTRPC.context<SharedContext>().create();

const sharedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.shared) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Shared access is invalid",
    });
  }
  return next({
    ctx: {
      ...ctx,
      shared: ctx.shared,
    },
  });
});

export const sharedRouter = t.router({
  snapshot: sharedProcedure.query(async ({ ctx }) => {
    try {
      return await ctx.sharedAccess.readSnapshot(ctx.shared);
    } catch (error) {
      throw new TRPCError({
        cause: error,
        code: "UNAUTHORIZED",
        message: "Shared access is invalid",
      });
    }
  }),
  dashboard: sharedProcedure.input(statsFiltersSchema).query(async ({ ctx, input }) => {
    try {
      return await ctx.sharedAccess.readDashboard(ctx.shared, input ?? {});
    } catch (error) {
      throw sharedReadError(error);
    }
  }),
  player: sharedProcedure
    .input(
      z.object({
        playerId: z.string().uuid(),
        filters: statsFiltersSchema,
      }),
    )
    .query(async ({ ctx, input }) => {
      try {
        return await ctx.sharedAccess.readPlayer(ctx.shared, input.playerId, input.filters ?? {});
      } catch (error) {
        throw sharedReadError(error);
      }
    }),
  match: sharedProcedure
    .input(z.object({ matchId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      try {
        return await ctx.sharedAccess.readMatch(ctx.shared, input.matchId);
      } catch (error) {
        throw sharedReadError(error);
      }
    }),
});

export type SharedRouter = typeof sharedRouter;

function sharedReadError(error: unknown) {
  return new TRPCError({
    cause: error,
    code: error instanceof Error && error.message === "not_found" ? "NOT_FOUND" : "UNAUTHORIZED",
    message: "Shared access is invalid",
  });
}

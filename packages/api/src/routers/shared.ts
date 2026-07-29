import { initTRPC, TRPCError } from "@trpc/server";

import type { SharedContext } from "../shared-context";

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
});

export type SharedRouter = typeof sharedRouter;

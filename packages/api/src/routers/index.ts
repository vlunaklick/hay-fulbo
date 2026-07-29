import { protectedProcedure, publicProcedure, router } from "../index";
import { matchesRouter } from "./matches";

export const appRouter = router({
  matches: matchesRouter,
  healthCheck: publicProcedure.query(() => {
    return "OK";
  }),
  privateData: protectedProcedure.query(({ ctx }) => {
    return {
      message: "This is private",
      user: ctx.session.user,
    };
  }),
});
export type AppRouter = typeof appRouter;

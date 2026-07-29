import { TRPCError } from "@trpc/server";
import { z } from "zod";

import type { GroupActor } from "../group-access";
import { GroupAccessError } from "../group-access";
import { SharedAccessError } from "../shared-access";
import { protectedProcedure, publicProcedure, router } from "../index";
import { matchesRouter } from "./matches";

function actorFromContext(ctx: {
  requestHeaders: Headers;
  session: {
    user: {
      id: string;
      email: string;
      emailVerified: boolean;
    };
  };
}): GroupActor {
  return {
    email: ctx.session.user.email,
    emailVerified: ctx.session.user.emailVerified,
    headers: ctx.requestHeaders,
    userId: ctx.session.user.id,
  };
}

async function translateAccessError<T>(operation: () => Promise<T>) {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof GroupAccessError) {
      throw new TRPCError({
        cause: error,
        code:
          error.code === "MEMBERSHIP_REQUIRED" || error.code === "OWNER_REQUIRED"
            ? "FORBIDDEN"
            : "BAD_REQUEST",
        message: error.message,
      });
    }
    if (error instanceof SharedAccessError) {
      throw new TRPCError({
        cause: error,
        code:
          error.code === "SHARED_LINK_NOT_ACTIVE"
            ? "NOT_FOUND"
            : error.code === "SHARED_LINK_ALREADY_ACTIVE"
              ? "CONFLICT"
              : "UNAUTHORIZED",
        message: error.message,
      });
    }
    throw error;
  }
}

const groupRouter = router({
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().trim().min(1).max(120),
        slug: z.string().trim().min(1).max(120),
      }),
    )
    .mutation(({ ctx, input }) =>
      translateAccessError(() => ctx.groupAccess.createGroup(actorFromContext(ctx), input)),
    ),
  inviteMember: protectedProcedure
    .input(z.object({ email: z.email(), groupId: z.string().min(1) }))
    .mutation(({ ctx, input }) =>
      translateAccessError(() => ctx.groupAccess.inviteMember(actorFromContext(ctx), input)),
    ),
  linkPlayer: protectedProcedure
    .input(
      z.object({
        groupId: z.string().min(1),
        linkedUserId: z.string().min(1).nullable(),
        playerId: z.uuid(),
      }),
    )
    .mutation(({ ctx, input }) =>
      translateAccessError(() => ctx.groupAccess.linkPlayer(actorFromContext(ctx), input)),
    ),
  list: protectedProcedure.query(({ ctx }) =>
    translateAccessError(() => ctx.groupAccess.listGroups(actorFromContext(ctx))),
  ),
  select: protectedProcedure
    .input(z.object({ groupId: z.string().min(1) }))
    .mutation(({ ctx, input }) =>
      translateAccessError(() => ctx.groupAccess.selectGroup(actorFromContext(ctx), input.groupId)),
    ),
  sharedLink: router({
    create: protectedProcedure
      .input(z.object({ groupId: z.string().min(1) }))
      .mutation(({ ctx, input }) =>
        translateAccessError(() => ctx.sharedAccess.issue(actorFromContext(ctx), input.groupId)),
      ),
    revoke: protectedProcedure
      .input(z.object({ groupId: z.string().min(1) }))
      .mutation(({ ctx, input }) =>
        translateAccessError(() => ctx.sharedAccess.revoke(actorFromContext(ctx), input.groupId)),
      ),
    rotate: protectedProcedure
      .input(z.object({ groupId: z.string().min(1) }))
      .mutation(({ ctx, input }) =>
        translateAccessError(() => ctx.sharedAccess.rotate(actorFromContext(ctx), input.groupId)),
      ),
  }),
});

export const appRouter = router({
  group: groupRouter,
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

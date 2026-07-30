import { TRPCError } from "@trpc/server";
import { z } from "zod";

import type { GroupActor } from "../group-access";
import { GroupAccessError } from "../group-access";
import { GroupJoinError } from "../group-join-access";
import { MatchInviteError } from "../match-invite-access";
import { SharedAccessError } from "../shared-access";
import { protectedProcedure, publicProcedure, router } from "../index";
import { matchesRouter } from "./matches";
import { statsRouter } from "./stats";

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
          error.code === "MEMBERSHIP_REQUIRED" ||
          error.code === "OWNER_REQUIRED" ||
          error.code === "LEADER_REQUIRED"
            ? "FORBIDDEN"
            : error.code === "PLAYER_ACCOUNT_ALREADY_LINKED"
              ? "CONFLICT"
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
    if (error instanceof GroupJoinError) {
      throw new TRPCError({
        cause: error,
        code: error.code === "JOIN_LINK_NOT_ACTIVE" ? "NOT_FOUND" : "BAD_REQUEST",
        message: error.message,
      });
    }
    if (error instanceof MatchInviteError) {
      throw new TRPCError({
        cause: error,
        code:
          error.code === "MATCH_INVITE_NOT_FOUND"
            ? "NOT_FOUND"
            : error.code === "MATCH_NOT_OPEN"
              ? "CONFLICT"
              : error.code === "PLAYER_NOT_FOUND"
                ? "BAD_REQUEST"
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
    .input(z.object({ email: z.email(), groupId: z.string().min(1), playerId: z.uuid() }))
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
  removeMember: protectedProcedure
    .input(z.object({ groupId: z.string().min(1), membershipId: z.string().min(1) }))
    .mutation(({ ctx, input }) =>
      translateAccessError(() => ctx.groupAccess.removeMember(actorFromContext(ctx), input)),
    ),
  updateMemberRole: protectedProcedure
    .input(
      z.object({
        groupId: z.string().min(1),
        membershipId: z.string().min(1),
        role: z.enum(["leader", "member"]),
      }),
    )
    .mutation(({ ctx, input }) =>
      translateAccessError(() => ctx.groupAccess.updateMemberRole(actorFromContext(ctx), input)),
    ),
  list: protectedProcedure.query(({ ctx }) =>
    translateAccessError(() => ctx.groupAccess.listGroups(actorFromContext(ctx))),
  ),
  membership: protectedProcedure
    .input(z.object({ groupId: z.string().min(1) }))
    .query(({ ctx, input }) =>
      translateAccessError(() =>
        ctx.groupAccess.authorize(actorFromContext(ctx), input.groupId, "member"),
      ),
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
  joinLink: router({
    status: protectedProcedure
      .input(z.object({ groupId: z.string().min(1) }))
      .query(({ ctx, input }) =>
        translateAccessError(() =>
          ctx.groupJoinAccess.status(actorFromContext(ctx), input.groupId),
        ),
      ),
    renew: protectedProcedure
      .input(z.object({ groupId: z.string().min(1) }))
      .mutation(({ ctx, input }) =>
        translateAccessError(() => ctx.groupJoinAccess.renew(actorFromContext(ctx), input.groupId)),
      ),
    revoke: protectedProcedure
      .input(z.object({ groupId: z.string().min(1) }))
      .mutation(({ ctx, input }) =>
        translateAccessError(() =>
          ctx.groupJoinAccess.revoke(actorFromContext(ctx), input.groupId),
        ),
      ),
    preview: publicProcedure
      .input(z.object({ token: z.string().min(1).max(512) }))
      .query(({ ctx, input }) =>
        translateAccessError(() => ctx.groupJoinAccess.preview(input.token)),
      ),
    accept: protectedProcedure
      .input(z.object({ token: z.string().min(1).max(512) }))
      .mutation(async ({ ctx, input }) => {
        const actor = actorFromContext(ctx);
        const result = await translateAccessError(() =>
          ctx.groupJoinAccess.accept(actor, input.token),
        );
        await translateAccessError(() => ctx.groupAccess.selectGroup(actor, result.group.id));
        return result;
      }),
  }),
});

const matchInviteRouter = router({
  preview: publicProcedure
    .input(z.object({ token: z.string().min(1).max(512) }))
    .query(({ ctx, input }) =>
      translateAccessError(() => ctx.matchInviteAccess.preview(input.token)),
    ),
  respond: publicProcedure
    .input(
      z.object({
        playerId: z.uuid(),
        response: z.enum(["yes", "maybe", "no"]),
        token: z.string().min(1).max(512),
      }),
    )
    .mutation(({ ctx, input }) =>
      translateAccessError(() =>
        ctx.matchInviteAccess.respond(input.token, input.playerId, input.response),
      ),
    ),
});

export const appRouter = router({
  group: groupRouter,
  matchInvite: matchInviteRouter,
  matches: matchesRouter,
  stats: statsRouter,
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

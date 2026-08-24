import { db } from "@hay-fulbo/db";
import {
  createMatchCommands,
  createMatchQueries,
  MatchCommandError,
  type MatchCommand,
  type MatchDetail,
  type MatchListItem,
} from "@hay-fulbo/db/matches";
import {
  createRatingCommands,
  createRatingQueries,
  RatingCommandError,
} from "@hay-fulbo/db/ratings";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { protectedProcedure, router } from "../index";

const commands = createMatchCommands(db);
const queries = createMatchQueries(db);
const ratingCommands = createRatingCommands(db);
const ratingQueries = createRatingQueries(db);

const id = z.string().uuid();
const versioned = {
  matchId: id,
  expectedLockVersion: z.number().int().nonnegative(),
};
const optionalMinor = z
  .string()
  .regex(/^\d+$/)
  .nullable()
  .transform((value) => (value === null ? null : BigInt(value)));

const commandSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("createMatch"),
    scheduledAt: z.coerce.date(),
    courtId: id.optional(),
    courtCostMinor: optionalMinor.optional(),
  }),
  z.object({
    type: z.literal("upsertPlayer"),
    playerId: id.optional(),
    displayName: z.string().trim().min(1),
    linkedUserId: z.string().min(1).nullable().optional(),
  }),
  z.object({
    type: z.literal("archivePlayer"),
    playerId: id,
    archived: z.boolean(),
  }),
  z.object({
    type: z.literal("upsertCourt"),
    courtId: id.optional(),
    name: z.string().trim().min(1),
    address: z.string().trim().min(1),
    mapsUrl: z.url(),
  }),
  z.object({
    type: z.literal("archiveCourt"),
    courtId: id,
    archived: z.boolean(),
  }),
  z.object({
    type: z.literal("updateMatch"),
    ...versioned,
    scheduledAt: z.coerce.date().optional(),
    courtId: id.nullable().optional(),
    courtCostMinor: optionalMinor.optional(),
  }),
  z.object({
    type: z.literal("renameTeam"),
    ...versioned,
    teamId: id,
    displayName: z.string().trim().min(1),
  }),
  z.object({
    type: z.literal("addParticipant"),
    ...versioned,
    teamId: id,
    playerId: id,
  }),
  z.object({
    type: z.literal("createAndAddParticipant"),
    ...versioned,
    teamId: id,
    displayName: z.string().trim().min(1),
  }),
  z.object({
    type: z.literal("removeParticipant"),
    ...versioned,
    playerId: id,
  }),
  z.object({
    type: z.literal("moveParticipant"),
    ...versioned,
    playerId: id,
    teamId: id,
  }),
  z.object({
    type: z.literal("adjustStat"),
    ...versioned,
    field: z.enum(["goals", "assists", "ownGoals", "unattributedGoals"]),
    delta: z.union([z.literal(1), z.literal(-1)]),
    playerId: id.optional(),
    teamId: id.optional(),
  }),
  z.object({
    type: z.literal("updatePaid"),
    ...versioned,
    playerId: id,
    paidMinor: z
      .string()
      .regex(/^\d+$/)
      .transform((value) => BigInt(value)),
  }),
  z.object({ type: z.literal("closeMatch"), ...versioned }),
  z.object({ type: z.literal("reopenMatch"), ...versioned }),
  z.object({
    type: z.literal("cancelMatch"),
    ...versioned,
    reason: z.string().trim().min(1).max(500).optional(),
  }),
  z.object({ type: z.literal("restoreMatch"), ...versioned }),
  z.object({
    type: z.literal("transferOrganizer"),
    ...versioned,
    nextOrganizerUserId: z.string().min(1),
    reason: z.string().trim().min(1),
  }),
]);

export const matchesRouter = router({
  execute: protectedProcedure.input(commandSchema).mutation(async ({ ctx, input }) => {
    try {
      return await commands.execute(scopeFromSession(ctx.session), input as MatchCommand);
    } catch (error) {
      throw asTrpcError(error);
    }
  }),

  detail: protectedProcedure.input(z.object({ matchId: id })).query(async ({ ctx, input }) => {
    try {
      const detail = await queries.detail(scopeFromSession(ctx.session), input.matchId);
      return serializeDetail(detail);
    } catch (error) {
      throw asTrpcError(error);
    }
  }),

  directory: protectedProcedure.query(async ({ ctx }) => {
    try {
      return await queries.directory(scopeFromSession(ctx.session));
    } catch (error) {
      throw asTrpcError(error);
    }
  }),

  inviteLink: protectedProcedure.input(z.object({ matchId: id })).query(async ({ ctx, input }) => {
    try {
      const detail = await queries.detail(scopeFromSession(ctx.session), input.matchId);
      return {
        url: ctx.matchInviteAccess.createUrl({
          groupId: detail.groupId,
          matchId: detail.id,
        }),
      };
    } catch (error) {
      throw asTrpcError(error);
    }
  }),

  list: protectedProcedure
    .input(
      z
        .object({
          status: z.enum(["open", "closed", "cancelled"]).optional(),
          courtId: id.optional(),
          scheduledFrom: z.coerce.date().optional(),
          scheduledTo: z.coerce.date().optional(),
          limit: z.number().int().min(1).max(100).optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      try {
        const rows = await queries.list(scopeFromSession(ctx.session), input);
        return rows.map(serializeListItem);
      } catch (error) {
        throw asTrpcError(error);
      }
    }),

  ratings: protectedProcedure.input(z.object({ matchId: id })).query(async ({ ctx, input }) => {
    try {
      return await ratingQueries.state(scopeFromSession(ctx.session), input.matchId);
    } catch (error) {
      throw asRatingTrpcError(error);
    }
  }),

  rate: protectedProcedure
    .input(
      z.object({
        matchId: id,
        scores: z
          .array(z.object({ playerId: id, score: z.number().int().min(1).max(10) }))
          .min(1)
          .max(40),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await ratingCommands.submit(scopeFromSession(ctx.session), input);
      } catch (error) {
        throw asRatingTrpcError(error);
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
      message: "Select an active group first",
    });
  }
  return { groupId, actorUserId: session.user.id };
}

function asTrpcError(error: unknown) {
  if (!(error instanceof MatchCommandError)) return error;
  const code =
    error.code === "not_found"
      ? "NOT_FOUND"
      : error.code === "concurrent_update"
        ? "CONFLICT"
        : error.code === "player_account_already_linked"
          ? "CONFLICT"
          : error.code === "forbidden" ||
              error.code === "membership_required" ||
              error.code === "owner_required"
            ? "FORBIDDEN"
            : "BAD_REQUEST";
  return new TRPCError({
    code,
    message: error.message,
    cause: { domainCode: error.code, details: error.details },
  });
}

function asRatingTrpcError(error: unknown) {
  if (!(error instanceof RatingCommandError)) return error;
  const code =
    error.code === "not_found"
      ? "NOT_FOUND"
      : error.code === "match_not_closed"
        ? "CONFLICT"
        : error.code === "not_participant" || error.code === "membership_required"
          ? "FORBIDDEN"
          : "BAD_REQUEST";
  return new TRPCError({
    code,
    message: error.message,
    cause: { domainCode: error.code },
  });
}

function serializeDetail(detail: MatchDetail) {
  return {
    ...detail,
    courtCostMinor: detail.courtCostMinor?.toString() ?? null,
    teams: detail.teams.map((team) => ({
      ...team,
      appearances: team.appearances.map((appearance) => ({
        ...appearance,
        expectedMinor: appearance.expectedMinor.toString(),
        paidMinor: appearance.paidMinor.toString(),
        debtMinor: appearance.debtMinor.toString(),
        overpaidMinor: appearance.overpaidMinor.toString(),
      })),
    })),
  };
}

function serializeListItem(item: MatchListItem) {
  return {
    ...item,
    courtCostMinor: item.courtCostMinor?.toString() ?? null,
  };
}

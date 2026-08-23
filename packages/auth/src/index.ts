import { expo } from "@better-auth/expo";
import { createDb } from "@hay-fulbo/db";
import * as schema from "@hay-fulbo/db/schema/auth";
import { player } from "@hay-fulbo/db/schema/domain";
import { env } from "@hay-fulbo/env/server";
import { and, eq, or, sql } from "drizzle-orm";
import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { organization } from "better-auth/plugins";
import { defaultAc, memberAc, ownerAc } from "better-auth/plugins/organization/access";

import {
  emailDeliveryConfigured,
  invitationDeliveryMode,
  sendInvitationEmail,
  sendVerificationEmail,
} from "./email";
import { createVerificationPolicy } from "./verification-policy";

export function createAuth() {
  const db = createDb();
  const verificationPolicy = createVerificationPolicy(emailDeliveryConfigured);
  const leaderAc = defaultAc.newRole({
    organization: [],
    member: [],
    invitation: ["create", "cancel"],
    team: [],
    ac: ["read"],
  });

  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "pg",

      schema: schema,
    }),
    trustedOrigins: [
      env.CORS_ORIGIN,
      "hay-fulbo://",
      "exp://",
      "http://localhost:8081",
      "http://localhost:8444",
    ],
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: emailDeliveryConfigured,
    },
    emailVerification: emailDeliveryConfigured
      ? {
          sendOnSignUp: true,
          sendVerificationEmail,
        }
      : undefined,
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    plugins: [
      organization({
        allowUserToCreateOrganization: verificationPolicy.canCreateOrganization,
        cancelPendingInvitationsOnReInvite: true,
        creatorRole: "owner",
        disableOrganizationDeletion: true,
        invitationExpiresIn: 60 * 60 * 48,
        requireEmailVerificationOnInvitation: verificationPolicy.requireVerifiedEmailForInvitation,
        roles: {
          leader: leaderAc,
          member: memberAc,
          owner: ownerAc,
        },
        organizationHooks: {
          beforeAcceptInvitation: async ({ invitation, user }) => {
            const invitedPlayerId =
              typeof invitation.playerId === "string" ? invitation.playerId : null;
            if (!invitedPlayerId) return;
            const valid = await db.transaction(async (transaction) => {
              await transaction.execute(
                sql`select set_config('app.group_id', ${invitation.organizationId}, true)`,
              );
              const [target] = await transaction
                .select({ id: player.id, linkedUserId: player.linkedUserId })
                .from(player)
                .where(
                  and(
                    eq(player.groupId, invitation.organizationId),
                    eq(player.id, invitedPlayerId),
                  ),
                )
                .limit(1);
              const [existing] = await transaction
                .select({ id: player.id })
                .from(player)
                .where(
                  and(
                    eq(player.groupId, invitation.organizationId),
                    eq(player.linkedUserId, user.id),
                  ),
                )
                .limit(1);
              return Boolean(
                target &&
                (target.linkedUserId === null || target.linkedUserId === user.id) &&
                (!existing || existing.id === target.id),
              );
            });
            if (!valid) {
              throw new APIError("CONFLICT", {
                message: "Este jugador ya está vinculado a otra cuenta",
              });
            }
          },
          afterAcceptInvitation: async ({ invitation, user }) => {
            const invitedPlayerId =
              typeof invitation.playerId === "string" ? invitation.playerId : null;
            if (!invitedPlayerId) return;
            await db.transaction(async (transaction) => {
              await transaction.execute(
                sql`select set_config('app.group_id', ${invitation.organizationId}, true)`,
              );
              const [linked] = await transaction
                .update(player)
                .set({ linkedUserId: user.id, updatedAt: new Date() })
                .where(
                  and(
                    eq(player.groupId, invitation.organizationId),
                    eq(player.id, invitedPlayerId),
                    or(eq(player.linkedUserId, user.id), sql`${player.linkedUserId} is null`),
                  ),
                )
                .returning({ id: player.id });
              if (!linked) {
                throw new APIError("CONFLICT", {
                  message: "No pudimos vincular la cuenta con el jugador invitado",
                });
              }
            });
          },
        },
        sendInvitationEmail: emailDeliveryConfigured ? sendInvitationEmail : undefined,
        schema: {
          invitation: {
            additionalFields: {
              playerId: {
                type: "string",
                required: false,
              },
            },
          },
          organization: {
            additionalFields: {
              currencyCode: {
                type: "string",
                required: false,
                defaultValue: "ARS",
              },
              timeZone: {
                type: "string",
                required: false,
                defaultValue: "America/Argentina/Buenos_Aires",
              },
              archivedAt: {
                type: "date",
                required: false,
                input: false,
              },
            },
          },
        },
      }),
      expo(),
      nextCookies(),
    ],
  });
}

export const auth = createAuth();

export { invitationDeliveryMode };

import { expo } from "@better-auth/expo";
import { createDb } from "@hay-fulbo/db";
import * as schema from "@hay-fulbo/db/schema/auth";
import { env } from "@hay-fulbo/env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { organization } from "better-auth/plugins";
import { memberAc, ownerAc } from "better-auth/plugins/organization/access";

export function createAuth() {
  const db = createDb();

  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "pg",

      schema: schema,
    }),
    trustedOrigins: [env.CORS_ORIGIN, "hay-fulbo://", "exp://", "http://localhost:8081"],
    emailAndPassword: {
      enabled: true,
    },
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    plugins: [
      organization({
        creatorRole: "owner",
        disableOrganizationDeletion: true,
        roles: {
          member: memberAc,
          owner: ownerAc,
        },
        schema: {
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
      nextCookies(),
      expo(),
    ],
  });
}

export const auth = createAuth();

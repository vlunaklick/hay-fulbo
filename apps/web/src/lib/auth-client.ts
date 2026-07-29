import { createAuthClient } from "better-auth/react";
import { organizationClient } from "better-auth/client/plugins";
import { memberAc, ownerAc } from "better-auth/plugins/organization/access";

export const authClient = createAuthClient({
  plugins: [
    organizationClient({
      roles: {
        member: memberAc,
        owner: ownerAc,
      },
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
            archivedAt: {
              type: "date",
              input: false,
              required: false,
            },
            currencyCode: {
              type: "string",
              defaultValue: "ARS",
              required: false,
            },
            timeZone: {
              type: "string",
              defaultValue: "America/Argentina/Buenos_Aires",
              required: false,
            },
          },
        },
      },
    }),
  ],
});

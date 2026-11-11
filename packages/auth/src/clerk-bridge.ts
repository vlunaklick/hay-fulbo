import { createClerkClient, verifyToken } from "@clerk/backend";
import type { BetterAuthPlugin } from "better-auth";
import { APIError, createAuthEndpoint } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import { z } from "zod";

import { resolveClerkIdentity } from "./clerk-identity";

const CLERK_PROVIDER_ID = "clerk";

/**
 * Clerk is the sign-in front door (Google and friends), but Hay Fulbo's users,
 * groups and RLS stay on better-auth. This endpoint trades a fresh Clerk session
 * token for a better-auth session, creating or linking the user by verified email.
 */
export function clerkBridge(options: { secretKey: string; authorizedParties: string[] }) {
  const clerk = createClerkClient({ secretKey: options.secretKey });

  return {
    id: "clerk-bridge",
    endpoints: {
      clerkExchange: createAuthEndpoint(
        "/clerk/exchange",
        { method: "POST", body: z.object({ token: z.string().min(1) }) },
        async (ctx) => {
          let clerkUserId: string;
          try {
            const claims = await verifyToken(ctx.body.token, {
              secretKey: options.secretKey,
              authorizedParties: options.authorizedParties,
            });
            clerkUserId = claims.sub;
          } catch {
            throw new APIError("UNAUTHORIZED", { message: "La sesión de Google no es válida" });
          }

          const identity = resolveClerkIdentity(await clerk.users.getUser(clerkUserId));
          if (!identity) {
            throw new APIError("FORBIDDEN", {
              message: "Tu cuenta de Google no tiene un email verificado",
            });
          }

          const adapter = ctx.context.internalAdapter;
          const findOrCreateUser = async () => {
            const linked = await adapter.findAccountByProviderId(
              identity.clerkUserId,
              CLERK_PROVIDER_ID,
            );
            const linkedUser = linked ? await adapter.findUserById(linked.userId) : null;
            if (linkedUser) return linkedUser;
            const existing = await adapter.findUserByEmail(identity.email, {
              includeAccounts: true,
            });
            if (existing && !existing.user.emailVerified) {
              // Anyone could have registered this unverified email with their own password.
              // Google just proved ownership, so drop that password and its sessions before linking.
              for (const account of existing.accounts) {
                if (account.providerId === "credential") await adapter.deleteAccount(account.id);
              }
              await adapter.deleteUserSessions(existing.user.id);
            }
            const user =
              existing?.user ??
              (await adapter.createUser({
                email: identity.email,
                emailVerified: true,
                image: identity.image,
                name: identity.name,
              }));
            if (!linked) {
              await adapter.linkAccount({
                accountId: identity.clerkUserId,
                providerId: CLERK_PROVIDER_ID,
                userId: user.id,
              });
            }
            return user;
          };
          // A concurrent first sign-in can lose the race on the unique email; the retry finds the winner's row.
          let user = await findOrCreateUser().catch(findOrCreateUser);
          if (!user.emailVerified) {
            user = await adapter.updateUser(user.id, { emailVerified: true });
          }

          const session = await adapter.createSession(user.id);
          await setSessionCookie(ctx, { session, user });
          return ctx.json({ user: { id: user.id, email: user.email, name: user.name } });
        },
      ),
    },
  } satisfies BetterAuthPlugin;
}

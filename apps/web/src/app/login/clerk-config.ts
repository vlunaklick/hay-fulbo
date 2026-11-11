import "server-only";

import { env } from "@hay-fulbo/env/server";

/** Google login needs both halves of the Clerk key pair; with either missing, /login stays email-only. */
export function clerkPublishableKey(): string | null {
  return env.CLERK_PUBLISHABLE_KEY && env.CLERK_SECRET_KEY ? env.CLERK_PUBLISHABLE_KEY : null;
}

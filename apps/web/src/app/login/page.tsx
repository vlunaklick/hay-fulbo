import { groupJoinAccess } from "@hay-fulbo/api/access-runtime";

import { clerkPublishableKey } from "./clerk-config";
import LoginScreen, { type LoginContext } from "./login-screen";
import { safeReturnTo } from "./return-to";

// The Clerk key is runtime configuration, so the page cannot be prerendered at build time.
export const dynamic = "force-dynamic";

async function loginContext(returnTo: string): Promise<LoginContext | null> {
  if (returnTo.startsWith("/sumarse/")) {
    const token = returnTo.slice("/sumarse/".length);
    const preview = await groupJoinAccess.preview(token).catch(() => null);
    return { kind: "join", groupName: preview?.group.name ?? null };
  }
  if (returnTo.startsWith("/invitaciones/")) return { kind: "invitation", groupName: null };
  return null;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string | string[] }>;
}) {
  const { returnTo } = await searchParams;
  const context = await loginContext(
    safeReturnTo(Array.isArray(returnTo) ? returnTo[0] : returnTo),
  );
  return <LoginScreen clerkPublishableKey={clerkPublishableKey()} context={context} />;
}

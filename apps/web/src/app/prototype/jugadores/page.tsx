// PROTOTYPE ONLY — /prototype/jugadores. Mounted inside the real AppShell so the
// variants are judged with real navigation, real permissions and real data.
import { auth } from "@hay-fulbo/auth";
import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { AppShell } from "@/components/app-shell";

import PlayersPrototype from "./players-prototype";

export const metadata: Metadata = {
  title: "Prototipo · Jugadores",
  robots: { index: false, follow: false },
};

export default async function PlayersPrototypePage() {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session?.user) redirect("/login");

  let activeGroupId = session.session.activeOrganizationId ?? null;
  if (!activeGroupId) {
    const groups = await auth.api.listOrganizations({ headers: requestHeaders });
    if (groups.length === 1) {
      activeGroupId = groups[0].id;
      await auth.api
        .setActiveOrganization({
          body: { organizationId: activeGroupId },
          headers: requestHeaders,
        })
        .catch(() => null);
    }
  }
  const sidebarState = (await cookies()).get("sidebar_state")?.value;

  return (
    <AppShell
      activeGroupId={activeGroupId}
      defaultSidebarOpen={sidebarState !== "false"}
      user={{ id: session.user.id, name: session.user.name, email: session.user.email }}
    >
      <Suspense fallback={null}>
        <PlayersPrototype />
      </Suspense>
    </AppShell>
  );
}

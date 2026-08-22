import { auth } from "@hay-fulbo/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
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

  return (
    <AppShell
      activeGroupId={activeGroupId}
      user={{ id: session.user.id, name: session.user.name, email: session.user.email }}
    >
      {children}
    </AppShell>
  );
}

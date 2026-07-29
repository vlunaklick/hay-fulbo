import { auth } from "@hay-fulbo/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login");

  return (
    <AppShell
      activeGroupId={session.session.activeOrganizationId ?? null}
      user={{ id: session.user.id, name: session.user.name, email: session.user.email }}
    >
      {children}
    </AppShell>
  );
}

import { auth } from "@hay-fulbo/auth";
import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { AppShell } from "@/components/app-shell";

import { CourtsPrototype } from "./harness";

export const metadata: Metadata = {
  title: "Prototipo · Canchas",
  robots: { index: false, follow: false },
};

// Renders inside the real dashboard shell so each variant is judged in context.
export default async function CourtsPrototypePage() {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session?.user) redirect("/login");
  const sidebarState = (await cookies()).get("sidebar_state")?.value;

  return (
    <AppShell
      activeGroupId={session.session.activeOrganizationId ?? null}
      defaultSidebarOpen={sidebarState !== "false"}
      user={{ id: session.user.id, name: session.user.name, email: session.user.email }}
    >
      <Suspense fallback={null}>
        <CourtsPrototype />
      </Suspense>
    </AppShell>
  );
}

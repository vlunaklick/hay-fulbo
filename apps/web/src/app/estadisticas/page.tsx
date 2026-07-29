import { auth } from "@hay-fulbo/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { MemberStatsDashboard } from "@/features/stats/stats-dashboard";
import { StatsLoading } from "@/features/stats/stats-loading";

export default async function StatsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login");

  return (
    <div className="dark min-h-svh bg-background text-foreground">
      <Suspense fallback={<StatsLoading />}>
        <MemberStatsDashboard />
      </Suspense>
    </div>
  );
}

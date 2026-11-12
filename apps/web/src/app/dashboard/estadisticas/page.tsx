import type { Route } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { MemberStatsDashboard } from "@/features/stats/stats-dashboard";
import { StatsLoading } from "@/features/stats/stats-loading";

// The old tabbed page linked sections with `?tab=`; each section is now a subpage.
const LEGACY_TABS: Record<string, string> = {
  tabla: "tabla",
  quimica: "sociedades",
  partidos: "partidos",
};

export default async function DashboardStatsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const tab = typeof params.tab === "string" ? LEGACY_TABS[params.tab] : undefined;
  if (tab) {
    const rest = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (key !== "tab" && typeof value === "string") rest.set(key, value);
    }
    const query = rest.toString();
    redirect(`/dashboard/estadisticas/${tab}${query ? `?${query}` : ""}` as Route);
  }
  return (
    <Suspense fallback={<StatsLoading />}>
      <MemberStatsDashboard />
    </Suspense>
  );
}

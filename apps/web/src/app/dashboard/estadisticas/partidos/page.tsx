import { Suspense } from "react";

import { MemberStatsMatches } from "@/features/stats/stats-dashboard";
import { StatsLoading } from "@/features/stats/stats-loading";

export default function DashboardStatsMatchesPage() {
  return (
    <Suspense fallback={<StatsLoading />}>
      <MemberStatsMatches />
    </Suspense>
  );
}

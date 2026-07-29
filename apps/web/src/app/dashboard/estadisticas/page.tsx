import { Suspense } from "react";

import { MemberStatsDashboard } from "@/features/stats/stats-dashboard";
import { StatsLoading } from "@/features/stats/stats-loading";

export default function DashboardStatsPage() {
  return (
    <Suspense fallback={<StatsLoading />}>
      <MemberStatsDashboard />
    </Suspense>
  );
}

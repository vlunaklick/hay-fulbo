import { Suspense } from "react";

import { MemberStatsTable } from "@/features/stats/stats-dashboard";
import { StatsLoading } from "@/features/stats/stats-loading";

export default function DashboardStatsTablePage() {
  return (
    <Suspense fallback={<StatsLoading />}>
      <MemberStatsTable />
    </Suspense>
  );
}

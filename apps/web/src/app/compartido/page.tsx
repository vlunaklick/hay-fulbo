import { Suspense } from "react";

import { SharedStatsDashboard } from "@/features/stats/stats-dashboard";
import { StatsLoading } from "@/features/stats/stats-loading";

export default function SharedDashboardPage() {
  return (
    <div className="dark min-h-svh bg-background text-foreground">
      <Suspense fallback={<StatsLoading />}>
        <SharedStatsDashboard />
      </Suspense>
    </div>
  );
}

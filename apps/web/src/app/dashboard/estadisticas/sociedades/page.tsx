import { Suspense } from "react";

import { MemberStatsSocieties } from "@/features/stats/stats-dashboard";
import { StatsLoading } from "@/features/stats/stats-loading";

export default function DashboardSocietiesPage() {
  return (
    <Suspense fallback={<StatsLoading />}>
      <MemberStatsSocieties />
    </Suspense>
  );
}

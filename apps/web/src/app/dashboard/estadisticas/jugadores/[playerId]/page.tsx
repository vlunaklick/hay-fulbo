import { Suspense } from "react";

import { MemberPlayerStats } from "@/features/stats/stats-detail";
import { StatsLoading } from "@/features/stats/stats-loading";

export default async function DashboardPlayerStatsPage({
  params,
}: {
  params: Promise<{ playerId: string }>;
}) {
  const { playerId } = await params;
  return (
    <Suspense fallback={<StatsLoading />}>
      <MemberPlayerStats playerId={playerId} />
    </Suspense>
  );
}

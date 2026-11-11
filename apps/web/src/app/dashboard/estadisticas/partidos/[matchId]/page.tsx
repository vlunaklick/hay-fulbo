import { Suspense } from "react";

import { StatsLoading } from "@/features/stats/stats-loading";
import { MemberMatchStats } from "@/features/stats/stats-detail";

export default async function DashboardMatchStatsPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = await params;
  return (
    <Suspense fallback={<StatsLoading />}>
      <MemberMatchStats matchId={matchId} />
    </Suspense>
  );
}

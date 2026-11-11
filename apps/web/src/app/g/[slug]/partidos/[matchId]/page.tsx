import { Suspense } from "react";

import { StatsLoading } from "@/features/stats/stats-loading";
import { PublicMatchStats } from "@/features/stats/stats-detail";

export default async function PublicMatchPage({
  params,
}: {
  params: Promise<{ matchId: string; slug: string }>;
}) {
  const { matchId, slug } = await params;
  return (
    <Suspense fallback={<StatsLoading />}>
      <PublicMatchStats matchId={matchId} slug={slug} />
    </Suspense>
  );
}

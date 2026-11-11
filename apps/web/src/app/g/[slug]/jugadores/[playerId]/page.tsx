import { Suspense } from "react";

import { PublicPlayerStats } from "@/features/stats/stats-detail";
import { StatsLoading } from "@/features/stats/stats-loading";

export default async function PublicPlayerPage({
  params,
}: {
  params: Promise<{ playerId: string; slug: string }>;
}) {
  const { playerId, slug } = await params;
  return (
    <>
      <Suspense fallback={<StatsLoading />}>
        <PublicPlayerStats playerId={playerId} slug={slug} />
      </Suspense>
    </>
  );
}

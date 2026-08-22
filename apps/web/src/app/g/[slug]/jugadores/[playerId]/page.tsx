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
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <Suspense fallback={<StatsLoading />}>
        <PublicPlayerStats playerId={playerId} slug={slug} />
      </Suspense>
    </main>
  );
}

import { Suspense } from "react";

import { SharedPlayerStats } from "@/features/stats/stats-detail";
import { StatsLoading } from "@/features/stats/stats-loading";

export default async function SharedPlayerPage({
  params,
}: {
  params: Promise<{ playerId: string }>;
}) {
  const { playerId } = await params;
  return (
    <div className="dark min-h-svh bg-background text-foreground">
      <Suspense fallback={<StatsLoading />}>
        <SharedPlayerStats playerId={playerId} />
      </Suspense>
    </div>
  );
}

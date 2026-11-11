import { Suspense } from "react";

import { StatsLoading } from "@/features/stats/stats-loading";
import { SharedMatchStats } from "@/features/stats/stats-detail";

export default async function SharedMatchPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = await params;
  return (
    <div className="min-h-svh bg-background text-foreground">
      <Suspense fallback={<StatsLoading />}>
        <SharedMatchStats matchId={matchId} />
      </Suspense>
    </div>
  );
}

import { Suspense } from "react";

import { PublicStatsDashboard } from "@/features/stats/stats-dashboard";
import { StatsLoading } from "@/features/stats/stats-loading";

export default async function PublicGroupPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <>
      <Suspense fallback={<StatsLoading />}>
        <PublicStatsDashboard slug={slug} />
      </Suspense>
    </>
  );
}

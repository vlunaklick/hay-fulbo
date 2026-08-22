import { Suspense } from "react";

import { PublicStatsDashboard } from "@/features/stats/stats-dashboard";
import { StatsLoading } from "@/features/stats/stats-loading";

export default async function PublicGroupPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <Suspense fallback={<StatsLoading />}>
        <PublicStatsDashboard slug={slug} />
      </Suspense>
    </main>
  );
}

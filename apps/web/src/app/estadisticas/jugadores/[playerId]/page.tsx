import { auth } from "@hay-fulbo/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { MemberPlayerStats } from "@/features/stats/stats-detail";
import { StatsLoading } from "@/features/stats/stats-loading";

export default async function MemberPlayerPage({
  params,
}: {
  params: Promise<{ playerId: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login");
  const { playerId } = await params;

  return (
    <div className="dark min-h-svh bg-background text-foreground">
      <Suspense fallback={<StatsLoading />}>
        <MemberPlayerStats playerId={playerId} />
      </Suspense>
    </div>
  );
}

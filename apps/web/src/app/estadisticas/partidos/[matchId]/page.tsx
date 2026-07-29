import { auth } from "@hay-fulbo/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { MemberMatchStats } from "@/features/stats/stats-detail";

export default async function MemberMatchPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login");
  const { matchId } = await params;

  return (
    <div className="dark min-h-svh bg-background text-foreground">
      <MemberMatchStats matchId={matchId} />
    </div>
  );
}

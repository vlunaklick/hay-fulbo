import { MemberMatchStats } from "@/features/stats/stats-detail";

export default async function DashboardMatchStatsPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = await params;
  return <MemberMatchStats matchId={matchId} />;
}

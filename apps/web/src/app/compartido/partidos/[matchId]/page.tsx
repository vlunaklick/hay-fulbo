import { SharedMatchStats } from "@/features/stats/stats-detail";

export default async function SharedMatchPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = await params;
  return (
    <div className="dark min-h-svh bg-background text-foreground">
      <SharedMatchStats matchId={matchId} />
    </div>
  );
}

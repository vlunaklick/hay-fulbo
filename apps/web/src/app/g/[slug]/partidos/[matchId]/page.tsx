import { PublicMatchStats } from "@/features/stats/stats-detail";

export default async function PublicMatchPage({
  params,
}: {
  params: Promise<{ matchId: string; slug: string }>;
}) {
  const { matchId, slug } = await params;
  return (
    <>
      <PublicMatchStats matchId={matchId} slug={slug} />
    </>
  );
}

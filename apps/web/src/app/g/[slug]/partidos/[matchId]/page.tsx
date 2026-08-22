import { PublicMatchStats } from "@/features/stats/stats-detail";

export default async function PublicMatchPage({
  params,
}: {
  params: Promise<{ matchId: string; slug: string }>;
}) {
  const { matchId, slug } = await params;
  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <PublicMatchStats matchId={matchId} slug={slug} />
    </main>
  );
}

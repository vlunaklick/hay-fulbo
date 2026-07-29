import { redirect } from "next/navigation";

export default async function MemberMatchPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = await params;
  redirect(`/dashboard/estadisticas/partidos/${matchId}`);
}

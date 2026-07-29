import { redirect } from "next/navigation";

export default async function MemberPlayerPage({
  params,
}: {
  params: Promise<{ playerId: string }>;
}) {
  const { playerId } = await params;
  redirect(`/dashboard/estadisticas/jugadores/${playerId}`);
}

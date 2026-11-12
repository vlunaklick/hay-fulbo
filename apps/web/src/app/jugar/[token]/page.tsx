import { matchInviteAccess } from "@hay-fulbo/api/access-runtime";
import { env } from "@hay-fulbo/env/server";
import { Button } from "@hay-fulbo/ui/components/button";
import Link from "next/link";

import { PublicHeading, PublicShell } from "@/components/public-shell";
import { MatchInvitation } from "@/components/match-invitation";

export default async function PlayInvitationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invitation = await matchInviteAccess.preview(token).catch(() => null);

  if (!invitation) {
    return (
      <PublicShell>
        <PublicHeading
          title="Este partido no está disponible"
          description="El link puede ser incorrecto o el grupo ya no está activo."
        />
        <Button render={<Link href="/login" />} nativeButton={false}>
          Ir al inicio
        </Button>
      </PublicShell>
    );
  }

  return (
    <MatchInvitation
      initialInvitation={invitation}
      invitationUrl={new URL(`/jugar/${encodeURIComponent(token)}`, env.BETTER_AUTH_URL).href}
      token={token}
    />
  );
}

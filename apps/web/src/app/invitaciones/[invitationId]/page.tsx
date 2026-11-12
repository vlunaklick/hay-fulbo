import { auth } from "@hay-fulbo/auth";
import { Button } from "@hay-fulbo/ui/components/button";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { InvitationAcceptance } from "@/components/invitation-acceptance";
import { PublicHeading, PublicShell } from "@/components/public-shell";

export default async function InvitationPage({
  params,
}: {
  params: Promise<{ invitationId: string }>;
}) {
  const { invitationId } = await params;
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session?.user) {
    redirect(`/login?returnTo=${encodeURIComponent(`/invitaciones/${invitationId}`)}`);
  }

  try {
    const invitation = await auth.api.getInvitation({
      headers: requestHeaders,
      query: { id: invitationId },
    });
    return (
      <InvitationAcceptance
        email={invitation.email}
        groupName={invitation.organizationName}
        invitationId={invitationId}
      />
    );
  } catch {
    return (
      <PublicShell>
        <PublicHeading
          title="Esta invitación no está disponible"
          description="Puede haber vencido, ya fue usada o pertenece a otra cuenta."
        />
        <Button render={<Link href="/dashboard" />} nativeButton={false}>
          Volver al inicio
        </Button>
      </PublicShell>
    );
  }
}

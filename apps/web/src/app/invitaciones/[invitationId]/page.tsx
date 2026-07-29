import { auth } from "@hay-fulbo/auth";
import { Button } from "@hay-fulbo/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@hay-fulbo/ui/components/card";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { InvitationAcceptance } from "@/components/invitation-acceptance";
import { LogoMark } from "@/components/logo-mark";

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
      <main className="grid min-h-svh place-items-center px-4 py-10">
        <div className="flex w-full max-w-md flex-col gap-6">
          <div className="flex items-center gap-3">
            <LogoMark className="size-10" />
            <span className="font-bold tracking-tight">Hay Fulbo</span>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Esta invitación no está disponible</CardTitle>
              <CardDescription>
                Puede haber vencido, ya fue usada o pertenece a otra cuenta.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button render={<Link href="/dashboard" />} nativeButton={false}>
                Volver al inicio
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }
}

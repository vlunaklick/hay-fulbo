import { matchInviteAccess } from "@hay-fulbo/api/access-runtime";
import { env } from "@hay-fulbo/env/server";
import { Button } from "@hay-fulbo/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@hay-fulbo/ui/components/card";
import Link from "next/link";

import { LogoMark } from "@/components/logo-mark";
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
      <main className="grid min-h-svh place-items-center px-4 py-10">
        <div className="flex w-full max-w-md flex-col gap-6">
          <div className="flex items-center gap-3">
            <LogoMark className="size-10" />
            <span className="font-bold tracking-tight">Hay Fulbo</span>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Este partido no está disponible</CardTitle>
              <CardDescription>
                El link puede ser incorrecto o el grupo ya no está activo.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button render={<Link href="/login" />} nativeButton={false}>
                Ir al inicio
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
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

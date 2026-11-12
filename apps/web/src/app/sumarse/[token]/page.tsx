import { groupJoinAccess } from "@hay-fulbo/api/access-runtime";
import { auth } from "@hay-fulbo/auth";
import { Button } from "@hay-fulbo/ui/components/button";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { GroupJoinAcceptance } from "@/components/group-join-acceptance";
import { NextStep } from "@/components/next-step";
import { PublicShell } from "@/components/public-shell";

export default async function JoinGroupPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const preview = await groupJoinAccess.preview(token).catch(() => null);

  if (!preview) {
    return (
      <PublicShell>
        <NextStep
          action={
            <Button render={<Link href="/login" />} nativeButton={false}>
              Ir al inicio
            </Button>
          }
          title="Este link ya no está disponible"
        >
          El organizador pudo haberlo renovado o desactivado. Pedile el link nuevo.
        </NextStep>
      </PublicShell>
    );
  }

  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session?.user) {
    redirect(`/login?returnTo=${encodeURIComponent(`/sumarse/${token}`)}`);
  }

  return (
    <GroupJoinAcceptance
      groupName={preview.group.name}
      token={token}
      userEmail={session.user.email}
    />
  );
}

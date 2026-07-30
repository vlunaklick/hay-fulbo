import { groupJoinAccess } from "@hay-fulbo/api/access-runtime";
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

import { GroupJoinAcceptance } from "@/components/group-join-acceptance";
import { LogoMark } from "@/components/logo-mark";

export default async function JoinGroupPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const preview = await groupJoinAccess.preview(token).catch(() => null);

  if (!preview) {
    return (
      <main className="grid min-h-svh place-items-center px-4 py-10">
        <div className="flex w-full max-w-md flex-col gap-6">
          <div className="flex items-center gap-3">
            <LogoMark className="size-10" />
            <span className="font-bold tracking-tight">Hay Fulbo</span>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Este link ya no está disponible</CardTitle>
              <CardDescription>
                El organizador pudo haberlo renovado o desactivado. Pedile el link nuevo.
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

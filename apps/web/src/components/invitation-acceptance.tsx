"use client";

import { Button } from "@hay-fulbo/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@hay-fulbo/ui/components/card";
import { ArrowRightIcon, MailCheckIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { LogoMark } from "@/components/logo-mark";
import { authClient } from "@/lib/auth-client";
import { queryClient } from "@/utils/trpc";

export function InvitationAcceptance({
  email,
  groupName,
  invitationId,
}: {
  email: string;
  groupName: string;
  invitationId: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function accept() {
    setPending(true);
    setError(null);
    const result = await authClient.organization.acceptInvitation({ invitationId });
    if (result.error) {
      setPending(false);
      setError(result.error.message ?? "No pudimos aceptar la invitación.");
      return;
    }
    queryClient.clear();
    toast.success(`Ya sos parte de ${groupName}`);
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="grid min-h-svh place-items-center px-4 py-10">
      <div className="flex w-full max-w-md flex-col gap-6">
        <div className="flex items-center gap-3">
          <LogoMark className="size-10" />
          <span className="font-bold tracking-tight">Hay Fulbo</span>
        </div>
        <Card>
          <CardHeader>
            <div className="mb-2 flex size-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <MailCheckIcon aria-hidden="true" />
            </div>
            <CardTitle>Te invitaron a {groupName}</CardTitle>
            <CardDescription>
              Al aceptar, tu cuenta {email} va a quedar vinculada con tu jugador en este grupo.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button onClick={accept} disabled={pending}>
              {pending ? "Aceptando…" : "Aceptar invitación"}
              <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

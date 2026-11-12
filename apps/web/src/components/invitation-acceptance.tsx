"use client";

import { Alert, AlertDescription } from "@hay-fulbo/ui/components/alert";
import { Button } from "@hay-fulbo/ui/components/button";
import { Spinner } from "@hay-fulbo/ui/components/spinner";
import { ArrowRightIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { GroupPassBenefits } from "@/components/group-pass-benefits";
import { NextStep } from "@/components/next-step";
import { AccountSwitch, entryNextStep, GroupPass, PublicSplit } from "@/components/public-shell";
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
    <PublicSplit
      context={
        <GroupPass groupName={groupName} kicker="Te invitaron a">
          <GroupPassBenefits
            items={[
              "Tu cuenta queda vinculada con tu jugador en este grupo.",
              "Ves los partidos, las cuentas y las estadísticas del grupo.",
            ]}
          />
        </GroupPass>
      }
      action={
        error ? (
          <Alert id="invitation-error" variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null
      }
      bar={
        <>
          <NextStep
            action={
              <Button
                aria-describedby={error ? "invitation-error" : undefined}
                onClick={accept}
                disabled={pending}
              >
                {pending ? <Spinner data-icon="inline-start" /> : null}
                {pending ? "Aceptando…" : "Aceptar invitación"}
                {pending ? null : <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />}
              </Button>
            }
            className={entryNextStep}
            title="Entrá al grupo"
          />
          <AccountSwitch email={email} returnTo={`/invitaciones/${invitationId}`} />
        </>
      }
    />
  );
}

"use client";

import { Button } from "@hay-fulbo/ui/components/button";
import { Spinner } from "@hay-fulbo/ui/components/spinner";
import { useMutation } from "@tanstack/react-query";
import { ArrowRightIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { GroupPassBenefits } from "@/components/group-pass-benefits";
import { AccountSwitch, GroupPass, PublicSplit } from "@/components/public-shell";
import { queryClient, trpc } from "@/utils/trpc";

export function GroupJoinAcceptance({
  groupName,
  token,
  userEmail,
}: {
  groupName: string;
  token: string;
  userEmail: string;
}) {
  const router = useRouter();
  const accept = useMutation(
    trpc.group.joinLink.accept.mutationOptions({
      onSuccess: (result) => {
        queryClient.clear();
        toast.success(
          result.alreadyMember ? `Volviste a ${groupName}` : `Ya sos parte de ${groupName}`,
        );
        router.push("/dashboard");
        router.refresh();
      },
      onError: (error) =>
        toast.error("No pudimos sumarte al grupo", { description: error.message }),
    }),
  );

  return (
    <PublicSplit
      context={
        <GroupPass groupName={groupName} kicker="Te pasaron el link de">
          <GroupPassBenefits
            items={[
              "Entrás como miembro del grupo.",
              "Ves los partidos, las cuentas y las estadísticas del grupo.",
              "Después el organizador te vincula con tu jugador.",
            ]}
          />
        </GroupPass>
      }
      bar={
        <>
          <Button disabled={accept.isPending} onClick={() => accept.mutate({ token })}>
            {accept.isPending ? <Spinner data-icon="inline-start" /> : null}
            {accept.isPending ? "Sumándote…" : "Sumarme al grupo"}
            {accept.isPending ? null : <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />}
          </Button>
          <AccountSwitch email={userEmail} returnTo={`/sumarse/${token}`} />
        </>
      }
    />
  );
}

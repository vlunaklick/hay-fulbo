"use client";

import { Button } from "@hay-fulbo/ui/components/button";
import { Spinner } from "@hay-fulbo/ui/components/spinner";
import { ArrowRightIcon } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { PublicHeading, PublicShell } from "@/components/public-shell";
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
    <PublicShell>
      <PublicHeading
        title={`Sumate a ${groupName}`}
        description={`Vas a entrar con ${userEmail} como miembro. Después el organizador puede vincular tu cuenta con tu jugador.`}
      />
      <Button disabled={accept.isPending} onClick={() => accept.mutate({ token })}>
        {accept.isPending ? <Spinner data-icon="inline-start" /> : null}
        {accept.isPending ? "Sumándote…" : "Sumarme al grupo"}
        <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
      </Button>
    </PublicShell>
  );
}

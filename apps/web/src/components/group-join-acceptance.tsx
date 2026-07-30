"use client";

import { Button } from "@hay-fulbo/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@hay-fulbo/ui/components/card";
import { ArrowRightIcon, UsersRoundIcon } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { LogoMark } from "@/components/logo-mark";
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
    <main className="grid min-h-svh place-items-center px-4 py-10">
      <div className="flex w-full max-w-md flex-col gap-6">
        <div className="flex items-center gap-3">
          <LogoMark className="size-10" />
          <span className="font-bold tracking-tight">Hay Fulbo</span>
        </div>
        <Card>
          <CardHeader>
            <div className="mb-2 flex size-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <UsersRoundIcon aria-hidden="true" />
            </div>
            <CardTitle>Sumate a {groupName}</CardTitle>
            <CardDescription>
              Vas a entrar con {userEmail} como miembro. Después el organizador puede vincular tu
              cuenta con tu jugador.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full"
              disabled={accept.isPending}
              onClick={() => accept.mutate({ token })}
            >
              {accept.isPending ? "Sumándote…" : "Sumarme al grupo"}
              <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

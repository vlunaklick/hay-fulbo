"use client";

import { Alert, AlertDescription, AlertTitle } from "@hay-fulbo/ui/components/alert";
import { Button } from "@hay-fulbo/ui/components/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@hay-fulbo/ui/components/field";
import { Input } from "@hay-fulbo/ui/components/input";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeftIcon, CalendarPlusIcon, CircleAlertIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { useAppContext } from "@/components/app-shell";
import { queryClient, trpc } from "@/utils/trpc";

function defaultDateTime() {
  const date = new Date(Date.now() + 24 * 60 * 60 * 1000);
  date.setMinutes(0, 0, 0);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export default function NewMatchPage() {
  const router = useRouter();
  const { role } = useAppContext();
  const [scheduledAt, setScheduledAt] = useState(defaultDateTime);
  const [error, setError] = useState<string | null>(null);

  const create = useMutation(
    trpc.matches.execute.mutationOptions({
      onSuccess: (result) => {
        if (!("matchId" in result)) return;
        toast.success("Partido creado");
        queryClient.invalidateQueries({ queryKey: trpc.matches.list.queryKey() });
        router.push(`/dashboard/partidos/${result.matchId}`);
      },
      onError: (cause) => setError(cause.message),
    }),
  );

  if (role === "member") {
    return (
      <Alert>
        <CircleAlertIcon aria-hidden="true" />
        <AlertTitle>Acción reservada al organizador</AlertTitle>
        <AlertDescription>Podés volver a la lista y consultar los partidos.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6">
      <header className="flex flex-col gap-4">
        <Button
          variant="ghost"
          size="sm"
          render={<Link href="/dashboard/partidos" />}
          nativeButton={false}
          className="self-start"
        >
          <ArrowLeftIcon data-icon="inline-start" aria-hidden="true" />
          Volver
        </Button>
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Nuevo partido</h1>
          <p className="text-sm text-muted-foreground">
            Solo la fecha. Cancha, costo y equipos se completan después.
          </p>
        </div>
      </header>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!scheduledAt) return setError("Elegí fecha y hora.");
          setError(null);
          create.mutate({ type: "createMatch", scheduledAt: new Date(scheduledAt) });
        }}
        className="flex flex-col gap-5"
      >
        <Field>
          <FieldLabel htmlFor="scheduled-at">Fecha y hora</FieldLabel>
          <Input
            id="scheduled-at"
            type="datetime-local"
            value={scheduledAt}
            onChange={(event) => setScheduledAt(event.target.value)}
          />
          <FieldDescription>Nace abierto, con dos equipos por armar.</FieldDescription>
        </Field>
        <FieldError>{error}</FieldError>
        <Button disabled={create.isPending} size="lg" type="submit">
          <CalendarPlusIcon data-icon="inline-start" aria-hidden="true" />
          {create.isPending ? "Creando…" : "Crear partido"}
        </Button>
      </form>
    </div>
  );
}

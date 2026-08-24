"use client";

import { Button } from "@hay-fulbo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@hay-fulbo/ui/components/dialog";
import { Field, FieldDescription, FieldError, FieldLabel } from "@hay-fulbo/ui/components/field";
import { Input } from "@hay-fulbo/ui/components/input";
import { useMutation } from "@tanstack/react-query";
import { CalendarPlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { queryClient, trpc } from "@/utils/trpc";

function defaultDateTime() {
  const date = new Date(Date.now() + 24 * 60 * 60 * 1000);
  date.setMinutes(0, 0, 0);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export function NewMatchDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [scheduledAt, setScheduledAt] = useState(defaultDateTime);
  const [error, setError] = useState<string | null>(null);

  const create = useMutation(
    trpc.matches.execute.mutationOptions({
      onSuccess: (result) => {
        if (!("matchId" in result)) return;
        toast.success("Partido creado");
        queryClient.invalidateQueries({ queryKey: trpc.matches.list.queryKey() });
        queryClient.invalidateQueries({ queryKey: trpc.stats.dashboard.queryKey() });
        onOpenChange(false);
        router.push(`/dashboard/partidos/${result.matchId}`);
      },
      onError: (cause) => setError(cause.message),
    }),
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setError(null);
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo partido</DialogTitle>
          <DialogDescription>
            Solo la fecha. Cancha, costo y equipos se completan después.
          </DialogDescription>
        </DialogHeader>
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
          <Button disabled={create.isPending} type="submit">
            <CalendarPlusIcon data-icon="inline-start" aria-hidden="true" />
            {create.isPending ? "Creando…" : "Crear partido"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

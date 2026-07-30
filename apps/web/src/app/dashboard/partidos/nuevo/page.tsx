"use client";

import { Alert, AlertDescription, AlertTitle } from "@hay-fulbo/ui/components/alert";
import { Button } from "@hay-fulbo/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@hay-fulbo/ui/components/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@hay-fulbo/ui/components/field";
import { Input } from "@hay-fulbo/ui/components/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hay-fulbo/ui/components/select";
import { Skeleton } from "@hay-fulbo/ui/components/skeleton";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeftIcon, CalendarPlusIcon, CircleAlertIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { useAppContext } from "@/components/app-shell";
import { toMinor } from "@/lib/format";
import { queryClient, trpc } from "@/utils/trpc";

function defaultDateTime() {
  const date = new Date(Date.now() + 24 * 60 * 60 * 1000);
  date.setMinutes(0, 0, 0);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export default function NewMatchPage() {
  const router = useRouter();
  const { role } = useAppContext();
  const directory = useQuery(trpc.matches.directory.queryOptions());
  const [scheduledAt, setScheduledAt] = useState(defaultDateTime);
  const [courtId, setCourtId] = useState<string | null>(null);
  const [cost, setCost] = useState("");
  const [capacity, setCapacity] = useState("10");
  const [teamOne, setTeamOne] = useState("Oscuros");
  const [teamTwo, setTeamTwo] = useState("Claros");
  const [error, setError] = useState<string | null>(null);
  const courtOptions = [
    { label: "A definir", value: null },
    ...(directory.data?.courts
      .filter((court) => !court.archivedAt)
      .map((court) => ({ label: court.name, value: court.id })) ?? []),
  ];
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
        <AlertTitle>Acción reservada al organizador y líderes</AlertTitle>
        <AlertDescription>Podés volver a la lista y consultar los partidos.</AlertDescription>
      </Alert>
    );
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const courtCostMinor = cost.trim() ? toMinor(cost) : null;
    if (!scheduledAt || !teamOne.trim() || !teamTwo.trim()) {
      return setError("Completá la fecha y los dos equipos.");
    }
    if (cost.trim() && courtCostMinor === null) return setError("Ingresá un precio válido.");
    const parsedCapacity = Number(capacity);
    if (!Number.isInteger(parsedCapacity) || parsedCapacity < 2 || parsedCapacity > 40) {
      return setError("Los cupos deben ser un número entre 2 y 40.");
    }
    setError(null);
    create.mutate({
      type: "createMatch",
      scheduledAt: new Date(scheduledAt),
      courtId,
      courtCostMinor,
      capacity: parsedCapacity,
      teams: [{ displayName: teamOne }, { displayName: teamTwo }],
    });
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
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
          <p className="text-sm font-semibold text-primary">Nueva fecha</p>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Crear partido</h1>
          <p className="text-sm text-muted-foreground">
            Los equipos son temporales: los podés mezclar en cada partido.
          </p>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Ficha inicial</CardTitle>
          <CardDescription>Después sumás plantel, capitanes, goles y pagos.</CardDescription>
        </CardHeader>
        <CardContent>
          {directory.isPending ? (
            <Skeleton className="h-80 w-full" />
          ) : (
            <form onSubmit={submit}>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="scheduled-at">Fecha y hora</FieldLabel>
                  <Input
                    id="scheduled-at"
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(event) => setScheduledAt(event.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="court">Cancha guardada</FieldLabel>
                  <Select
                    items={courtOptions}
                    value={courtId}
                    onValueChange={(value) => setCourtId(value === null ? null : String(value))}
                  >
                    <SelectTrigger id="court" className="w-full">
                      <SelectValue>
                        {courtOptions.find((option) => option.value === courtId)?.label ??
                          "A definir"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {courtOptions.map((option) => (
                          <SelectItem key={option.value ?? "no-court"} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <FieldDescription>
                    Administrá las canchas desde el directorio si falta una.
                  </FieldDescription>
                </Field>
                <Field>
                  <FieldLabel htmlFor="cost">Precio total de la cancha</FieldLabel>
                  <Input
                    id="cost"
                    inputMode="decimal"
                    value={cost}
                    onChange={(event) => setCost(event.target.value)}
                    placeholder="Ej. 48000"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="capacity">Cupos</FieldLabel>
                  <Input
                    id="capacity"
                    inputMode="numeric"
                    max={40}
                    min={2}
                    onChange={(event) => setCapacity(event.target.value)}
                    type="number"
                    value={capacity}
                  />
                  <FieldDescription>
                    Los confirmados que superen este número pasan a lista de espera.
                  </FieldDescription>
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="team-one">Equipo 1</FieldLabel>
                    <Input
                      id="team-one"
                      value={teamOne}
                      onChange={(event) => setTeamOne(event.target.value)}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="team-two">Equipo 2</FieldLabel>
                    <Input
                      id="team-two"
                      value={teamTwo}
                      onChange={(event) => setTeamTwo(event.target.value)}
                    />
                  </Field>
                </div>
                <FieldError>{error}</FieldError>
                <Button type="submit" disabled={create.isPending || directory.isError}>
                  <CalendarPlusIcon data-icon="inline-start" aria-hidden="true" />
                  {create.isPending ? "Creando…" : "Crear partido"}
                </Button>
              </FieldGroup>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

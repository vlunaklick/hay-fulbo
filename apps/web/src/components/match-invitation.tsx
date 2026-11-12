"use client";

import type { MatchInvitation as MatchInvitationData } from "@hay-fulbo/api/match-invite-access";
import { Badge } from "@hay-fulbo/ui/components/badge";
import { Button } from "@hay-fulbo/ui/components/button";
import { Field, FieldLabel } from "@hay-fulbo/ui/components/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hay-fulbo/ui/components/select";
import { cn } from "@hay-fulbo/ui/lib/utils";
import { useMutation } from "@tanstack/react-query";
import { CalendarPlusIcon, MapPinIcon, MessageCircleIcon, UsersIcon, XIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PublicShell } from "@/components/public-shell";
import {
  buildCalendarIcs,
  buildMatchMessage,
  buildWhatsAppUrl,
  downloadCalendar,
} from "@/lib/match-sharing";
import { trpc } from "@/utils/trpc";

export function MatchInvitation({
  initialInvitation,
  invitationUrl,
  token,
}: {
  initialInvitation: MatchInvitationData;
  invitationUrl: string;
  token: string;
}) {
  const [invitation, setInvitation] = useState(initialInvitation);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const selected = invitation.players.find((player) => player.id === playerId) ?? null;
  const join = useMutation(
    trpc.matchInvite.join.mutationOptions({
      onSuccess: (next) => {
        setInvitation({
          ...next,
          match: {
            ...next.match,
            scheduledAt: new Date(next.match.scheduledAt),
          },
        });
        toast.success("Listo");
      },
      onError: (error) =>
        toast.error("No pudimos guardar tu respuesta", { description: error.message }),
    }),
  );
  const playerOptions = invitation.players.map((player) => ({
    label: player.displayName,
    value: player.id,
  }));
  const shareMessage = buildMatchMessage({
    court: invitation.match.court,
    currency: invitation.group.currency,
    estimatedPerPlayerMinor: invitation.match.estimatedPerPlayerMinor,
    groupName: invitation.group.name,
    invitationUrl,
    playing: invitation.summary.playing,
    scheduledAt: invitation.match.scheduledAt,
    timeZone: invitation.group.timeZone,
  });

  function answer(joined: boolean) {
    if (!playerId) return;
    join.mutate({ joined, playerId, token });
  }

  function addToCalendar() {
    const contents = buildCalendarIcs({
      description: `Sumate: ${invitationUrl}`,
      location: invitation.match.court
        ? `${invitation.match.court.name}, ${invitation.match.court.address}`
        : undefined,
      start: invitation.match.scheduledAt,
      title: `Hay Fulbo · ${invitation.group.name}`,
      uid: `${invitation.match.id}@hay-fulbo`,
    });
    downloadCalendar(`hay-fulbo-${invitation.match.id}.ics`, contents);
  }

  const status = invitation.match.status;
  return (
    <PublicShell width="lg">
      <section className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {invitation.group.name}
            <Badge variant={status === "open" ? "outline" : "secondary"}>
              {status === "open"
                ? "Convocatoria abierta"
                : status === "cancelled"
                  ? "Partido cancelado"
                  : "Partido cerrado"}
            </Badge>
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-balance first-letter:uppercase sm:text-3xl">
            {formatMatchDate(invitation.match.scheduledAt, invitation.group.timeZone)}
          </h1>
          <p className="text-base text-muted-foreground">
            {formatMatchTime(invitation.match.scheduledAt, invitation.group.timeZone)}
            {invitation.match.court ? ` · ${invitation.match.court.name}` : " · Cancha a definir"}
          </p>
        </div>

        <dl className="flex flex-col divide-y divide-border border-y">
          <div className="flex items-center gap-3 py-3">
            <UsersIcon className="size-4 text-muted-foreground" aria-hidden="true" />
            <dt className="sr-only">Jugadores</dt>
            <dd className="text-sm font-medium">
              {invitation.summary.playing}{" "}
              {invitation.summary.playing === 1 ? "anotado" : "anotados"}
            </dd>
          </div>
          {invitation.match.court ? (
            <div className="flex items-center gap-3 py-3">
              <MapPinIcon className="size-4 text-muted-foreground" aria-hidden="true" />
              <dt className="sr-only">Cancha</dt>
              <dd className="min-w-0 text-sm">
                <a
                  className="font-medium underline-offset-4 hover:underline"
                  href={invitation.match.court.mapsUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  {invitation.match.court.name}
                </a>
                <span className="block text-muted-foreground">
                  {invitation.match.court.address}
                </span>
              </dd>
            </div>
          ) : null}
          <div className="flex items-center justify-between gap-3 py-3 text-sm">
            <dt className="text-muted-foreground">Estimado por jugador</dt>
            <dd className="font-medium tabular-nums">
              {invitation.match.estimatedPerPlayerMinor
                ? formatMoney(invitation.match.estimatedPerPlayerMinor, invitation.group.currency)
                : status === "cancelled"
                  ? "Sin aportes"
                  : "A definir"}
            </dd>
          </div>
        </dl>
      </section>

      {status === "open" ? (
        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold">¿Jugás?</h2>
            <p className="text-sm text-muted-foreground">
              Elegí tu nombre y anotate. No necesitás una cuenta.
            </p>
          </div>
          <Field>
            <FieldLabel htmlFor="rsvp-player">Tu nombre</FieldLabel>
            <Select items={playerOptions} value={playerId} onValueChange={setPlayerId}>
              <SelectTrigger id="rsvp-player" className="w-full">
                <SelectValue placeholder="Elegí tu nombre">{selected?.displayName}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {invitation.players.map((player) => (
                    <SelectItem key={player.id} value={player.id}>
                      <span className={cn(player.joined && "font-semibold")}>
                        {player.displayName}
                        {player.joined ? " · Anotado" : ""}
                      </span>
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          {selected?.joined ? (
            <p className="text-sm text-muted-foreground">
              Ya estás anotado. Si algo cambió, podés bajarte.
            </p>
          ) : null}
          <div className="grid gap-2 sm:grid-cols-[2fr_1fr]">
            <Button disabled={!playerId || join.isPending} onClick={() => answer(true)}>
              Me sumo
            </Button>
            <Button
              disabled={!playerId || !selected?.joined || join.isPending}
              onClick={() => answer(false)}
              variant="ghost"
            >
              <XIcon data-icon="inline-start" aria-hidden="true" />
              Bajarme
            </Button>
          </div>
        </section>
      ) : (
        <p className="text-sm text-muted-foreground">
          {status === "cancelled"
            ? "Este partido no se va a jugar. Ya no se pueden sumar jugadores."
            : "El organizador cerró el partido. La convocatoria ya terminó."}
        </p>
      )}

      <div className="flex flex-wrap gap-x-2 gap-y-1">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => window.open(buildWhatsAppUrl(shareMessage), "_blank", "noopener")}
        >
          <MessageCircleIcon data-icon="inline-start" aria-hidden="true" />
          Compartir por WhatsApp
        </Button>
        <Button size="sm" variant="ghost" disabled={status !== "open"} onClick={addToCalendar}>
          <CalendarPlusIcon data-icon="inline-start" aria-hidden="true" />
          Agregar al calendario
        </Button>
      </div>
    </PublicShell>
  );
}

function formatMatchDate(value: Date | string, timeZone: string) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "long",
    timeZone,
    weekday: "long",
  }).format(new Date(value));
}

function formatMatchTime(value: Date | string, timeZone: string) {
  return new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    timeZone,
  }).format(new Date(value));
}

function formatMoney(value: string, currency: string) {
  return new Intl.NumberFormat("es-AR", {
    currency,
    maximumFractionDigits: 0,
    style: "currency",
  }).format(Number(BigInt(value)) / 100);
}

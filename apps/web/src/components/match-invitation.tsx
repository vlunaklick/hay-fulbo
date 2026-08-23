"use client";

import type { MatchInvitation as MatchInvitationData } from "@hay-fulbo/api/match-invite-access";
import { Badge } from "@hay-fulbo/ui/components/badge";
import { Button } from "@hay-fulbo/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@hay-fulbo/ui/components/card";
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

import { LogoMark } from "@/components/logo-mark";
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

  return (
    <main className="min-h-svh bg-background px-4 py-6 sm:py-10">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <LogoMark className="size-10" />
            <div>
              <p className="font-bold tracking-tight">Hay Fulbo</p>
              <p className="text-xs text-muted-foreground">{invitation.group.name}</p>
            </div>
          </div>
          <Badge variant={invitation.match.status === "open" ? "outline" : "secondary"}>
            {invitation.match.status === "open" ? "Convocatoria abierta" : "Convocatoria cerrada"}
          </Badge>
        </header>

        <Card className="overflow-hidden border-primary/30">
          <CardHeader className="border-b bg-primary/5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              Próxima fecha
            </p>
            <CardTitle className="text-3xl">
              {formatMatchDate(invitation.match.scheduledAt, invitation.group.timeZone)}
            </CardTitle>
            <CardDescription className="text-base">
              {formatMatchTime(invitation.match.scheduledAt, invitation.group.timeZone)}
              {invitation.match.court ? ` · ${invitation.match.court.name}` : " · Cancha a definir"}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 py-6 sm:grid-cols-[1fr_0.85fr]">
            <p className="flex items-center gap-3 text-lg font-semibold">
              <UsersIcon className="size-5 text-primary" aria-hidden="true" />
              {invitation.summary.playing}{" "}
              {invitation.summary.playing === 1 ? "anotado" : "anotados"}
            </p>
            <div className="flex flex-col justify-center gap-3 border-t pt-5 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
              {invitation.match.court ? (
                <a
                  className="flex items-start gap-3 rounded-md p-2 text-sm hover:bg-accent"
                  href={invitation.match.court.mapsUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  <MapPinIcon className="mt-0.5 size-4 text-primary" aria-hidden="true" />
                  <span>
                    <strong className="block">{invitation.match.court.name}</strong>
                    <span className="text-muted-foreground">{invitation.match.court.address}</span>
                  </span>
                </a>
              ) : null}
              {invitation.match.estimatedPerPlayerMinor ? (
                <div className="rounded-md border px-3 py-2">
                  <p className="text-xs text-muted-foreground">Estimado por jugador</p>
                  <strong className="text-lg tabular-nums">
                    {formatMoney(
                      invitation.match.estimatedPerPlayerMinor,
                      invitation.group.currency,
                    )}
                  </strong>
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>

        {invitation.match.status === "open" ? (
          <Card>
            <CardHeader>
              <CardTitle>¿Jugás?</CardTitle>
              <CardDescription>Elegí tu nombre y anotate. No necesitás una cuenta.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
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
            </CardContent>
          </Card>
        ) : null}

        <div className="grid gap-2 sm:grid-cols-2">
          <Button
            onClick={() => window.open(buildWhatsAppUrl(shareMessage), "_blank", "noopener")}
            variant="outline"
          >
            <MessageCircleIcon data-icon="inline-start" aria-hidden="true" />
            Compartir por WhatsApp
          </Button>
          <Button onClick={addToCalendar} variant="outline">
            <CalendarPlusIcon data-icon="inline-start" aria-hidden="true" />
            Agregar al calendario
          </Button>
        </div>
      </div>
    </main>
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

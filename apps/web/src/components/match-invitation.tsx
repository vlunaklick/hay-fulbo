"use client";

import type { MatchInvitation as MatchInvitationData } from "@hay-fulbo/api/match-invite-access";
import { Alert, AlertDescription } from "@hay-fulbo/ui/components/alert";
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
} from "@hay-fulbo/ui/components/avatar";
import { Badge } from "@hay-fulbo/ui/components/badge";
import { Button } from "@hay-fulbo/ui/components/button";
import { Card, CardContent } from "@hay-fulbo/ui/components/card";
import { Field, FieldLabel } from "@hay-fulbo/ui/components/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hay-fulbo/ui/components/select";
import { Spinner } from "@hay-fulbo/ui/components/spinner";
import { cn } from "@hay-fulbo/ui/lib/utils";
import { useMutation } from "@tanstack/react-query";
import { CalendarPlusIcon, CheckIcon, MapPinIcon, MessageCircleIcon, XIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PublicSplit } from "@/components/public-shell";
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
  const open = status === "open";
  const joined = invitation.players.filter((player) => player.joined);
  const shown = joined.slice(0, 5);

  const context = (
    <>
      <Card className="rounded-xl">
        <CardContent className="flex flex-col gap-5">
          <div className="flex items-start justify-between gap-3">
            <p className="line-clamp-2 text-sm text-muted-foreground">{invitation.group.name}</p>
            <Badge
              variant={open ? "outline" : status === "cancelled" ? "destructive" : "secondary"}
            >
              {open ? "Convocatoria abierta" : status === "cancelled" ? "Cancelado" : "Cerrado"}
            </Badge>
          </div>
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-bold text-balance first-letter:uppercase">
              {formatMatchDate(invitation.match.scheduledAt, invitation.group.timeZone)}
            </h1>
            <p className="text-6xl leading-none font-black tracking-tight tabular-nums">
              {formatMatchTime(invitation.match.scheduledAt, invitation.group.timeZone)}
            </p>
          </div>
          <div className="flex items-start gap-3">
            <MapPinIcon className="mt-0.5 size-4 text-muted-foreground" aria-hidden="true" />
            {invitation.match.court ? (
              <div className="min-w-0 text-sm">
                <a
                  className="font-semibold underline-offset-4 hover:underline"
                  href={invitation.match.court.mapsUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  {invitation.match.court.name}
                </a>
                <p className="text-muted-foreground">{invitation.match.court.address}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Cancha a definir</p>
            )}
          </div>
          <dl className="grid grid-cols-2 divide-x border-t pt-5">
            <div className="flex flex-col gap-1 pr-4">
              <dt className="text-xs font-medium text-muted-foreground">Anotados</dt>
              <dd className="flex items-center gap-2">
                <span className="text-lg font-semibold tabular-nums">
                  {invitation.summary.playing}
                </span>
                {shown.length > 0 ? (
                  <AvatarGroup aria-hidden="true">
                    {shown.map((player) => (
                      <Avatar key={player.id} size="sm">
                        <AvatarFallback>
                          {player.displayName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                    {joined.length > shown.length ? (
                      <AvatarGroupCount className="text-xs">
                        +{joined.length - shown.length}
                      </AvatarGroupCount>
                    ) : null}
                  </AvatarGroup>
                ) : null}
              </dd>
            </div>
            <div className="flex flex-col gap-1 pl-4">
              <dt className="text-xs font-medium text-muted-foreground">Estimado por jugador</dt>
              <dd className="text-lg font-semibold tabular-nums">
                {invitation.match.estimatedPerPlayerMinor
                  ? formatMoney(invitation.match.estimatedPerPlayerMinor, invitation.group.currency)
                  : status === "cancelled"
                    ? "Sin aportes"
                    : "A definir"}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
      <div className="flex flex-wrap gap-x-2 gap-y-1">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => window.open(buildWhatsAppUrl(shareMessage), "_blank", "noopener")}
        >
          <MessageCircleIcon data-icon="inline-start" aria-hidden="true" />
          Compartir por WhatsApp
        </Button>
        <Button size="sm" variant="ghost" disabled={!open} onClick={addToCalendar}>
          <CalendarPlusIcon data-icon="inline-start" aria-hidden="true" />
          Agregar al calendario
        </Button>
      </div>
    </>
  );

  if (!open) {
    return (
      <PublicSplit
        context={context}
        action={
          <Alert variant={status === "cancelled" ? "destructive" : "default"}>
            <AlertDescription>
              {status === "cancelled"
                ? "Este partido no se va a jugar. Ya no se pueden sumar jugadores."
                : "El organizador cerró el partido. La convocatoria ya terminó."}
            </AlertDescription>
          </Alert>
        }
      />
    );
  }

  return (
    <PublicSplit
      context={context}
      action={
        <div className="hidden flex-col gap-1 lg:flex">
          <h2 className="text-lg font-semibold">¿Jugás?</h2>
          <p className="text-sm text-muted-foreground">
            Elegí tu nombre y anotate. No necesitás una cuenta.
          </p>
        </div>
      }
      bar={
        <>
          <Field>
            <FieldLabel htmlFor="rsvp-player" className="sr-only lg:not-sr-only">
              Tu nombre
            </FieldLabel>
            <Select items={playerOptions} value={playerId} onValueChange={setPlayerId}>
              <SelectTrigger id="rsvp-player" className="w-full text-base md:text-sm">
                <SelectValue placeholder="¿Quién sos? Elegí tu nombre">
                  {selected?.displayName}
                </SelectValue>
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
            <div className="grid grid-cols-[1fr_auto] items-center gap-2">
              <p className="flex items-center gap-2 text-sm font-medium">
                <CheckIcon className="size-4 text-success" aria-hidden="true" />
                Estás anotado
              </p>
              <Button variant="ghost" disabled={join.isPending} onClick={() => answer(false)}>
                {join.isPending ? (
                  <Spinner data-icon="inline-start" />
                ) : (
                  <XIcon data-icon="inline-start" aria-hidden="true" />
                )}
                Bajarme
              </Button>
            </div>
          ) : (
            <Button disabled={!playerId || join.isPending} onClick={() => answer(true)}>
              {join.isPending ? <Spinner data-icon="inline-start" /> : null}
              {join.isPending ? "Anotándote…" : "Me sumo"}
            </Button>
          )}
        </>
      }
    />
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

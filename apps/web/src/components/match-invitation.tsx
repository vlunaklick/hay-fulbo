"use client";

import type { MatchInvitation as MatchInvitationData } from "@hay-fulbo/api/match-invite-access";
import { Alert, AlertDescription } from "@hay-fulbo/ui/components/alert";
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
import { Spinner } from "@hay-fulbo/ui/components/spinner";
import { cn } from "@hay-fulbo/ui/lib/utils";
import { useMutation } from "@tanstack/react-query";
import {
  CalendarPlusIcon,
  CheckIcon,
  MapPinIcon,
  MessageCircleIcon,
  UsersIcon,
  WalletIcon,
  XIcon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { DrillList, DrillRow, HeroNumber, NextStep, StatusHeader } from "@/components/next-step";
import { entryNextStep, PublicSplit } from "@/components/public-shell";
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
  const court = invitation.match.court;
  const weekday = formatWeekday(invitation.match.scheduledAt, invitation.group.timeZone);

  const context = (
    <>
      <StatusHeader
        meta={invitation.group.name}
        status={
          <Badge variant={open ? "outline" : status === "cancelled" ? "destructive" : "secondary"}>
            {open ? "Convocatoria abierta" : status === "cancelled" ? "Cancelado" : "Cerrado"}
          </Badge>
        }
        title={
          <span className="block first-letter:uppercase">
            {formatMatchDate(invitation.match.scheduledAt, invitation.group.timeZone)}
          </span>
        }
      />
      <HeroNumber caption={court ? court.name : "Cancha a definir"}>
        {formatMatchTime(invitation.match.scheduledAt, invitation.group.timeZone)}
      </HeroNumber>
      <DrillList>
        {court ? (
          <DrillRow
            label="Cómo llegar"
            leading={<MapPinIcon aria-hidden="true" className="size-4 text-muted-foreground" />}
            render={({ className, children }) => (
              <a className={className} href={court.mapsUrl} rel="noreferrer" target="_blank">
                {children}
              </a>
            )}
            value={<span className="block max-w-48 truncate">{court.address}</span>}
          />
        ) : null}
        <DrillRow
          label="Anotados"
          leading={<UsersIcon aria-hidden="true" className="size-4 text-muted-foreground" />}
          static
          value={
            <span className="text-sm font-semibold text-foreground">
              {invitation.summary.playing}
            </span>
          }
        />
        <DrillRow
          label="Estimado por jugador"
          leading={<WalletIcon aria-hidden="true" className="size-4 text-muted-foreground" />}
          static
          value={
            <span className="text-sm font-semibold text-foreground">
              {invitation.match.estimatedPerPlayerMinor
                ? formatMoney(invitation.match.estimatedPerPlayerMinor, invitation.group.currency)
                : status === "cancelled"
                  ? "Sin aportes"
                  : "A definir"}
            </span>
          }
        />
        <DrillRow
          label="Compartir por WhatsApp"
          leading={
            <MessageCircleIcon aria-hidden="true" className="size-4 text-muted-foreground" />
          }
          onClick={() => window.open(buildWhatsAppUrl(shareMessage), "_blank", "noopener")}
        />
        {open ? (
          <DrillRow
            label="Agregar al calendario"
            leading={
              <CalendarPlusIcon aria-hidden="true" className="size-4 text-muted-foreground" />
            }
            onClick={addToCalendar}
          />
        ) : null}
      </DrillList>
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
      bar={
        <NextStep
          action={
            selected?.joined ? (
              <Button variant="outline" disabled={join.isPending} onClick={() => answer(false)}>
                {join.isPending ? (
                  <Spinner data-icon="inline-start" />
                ) : (
                  <XIcon data-icon="inline-start" aria-hidden="true" />
                )}
                Bajarme
              </Button>
            ) : (
              <Button disabled={!playerId || join.isPending} onClick={() => answer(true)}>
                {join.isPending ? <Spinner data-icon="inline-start" /> : null}
                {join.isPending ? "Anotándote…" : "Me sumo"}
              </Button>
            )
          }
          className={entryNextStep}
          kicker={
            selected?.joined ? (
              <span className="flex items-center gap-1.5 text-foreground">
                <CheckIcon className="size-4 text-success" aria-hidden="true" />
                Estás anotado
              </span>
            ) : (
              "No necesitás una cuenta"
            )
          }
          title={`¿Jugás el ${weekday}?`}
        >
          <Field className="pt-2 text-foreground">
            <FieldLabel htmlFor="rsvp-player" className="sr-only">
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
        </NextStep>
      }
    />
  );
}

function formatWeekday(value: Date | string, timeZone: string) {
  return new Intl.DateTimeFormat("es-AR", { timeZone, weekday: "long" }).format(new Date(value));
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

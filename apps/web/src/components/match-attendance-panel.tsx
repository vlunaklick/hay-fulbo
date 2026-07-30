"use client";

import { Badge } from "@hay-fulbo/ui/components/badge";
import { Button } from "@hay-fulbo/ui/components/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@hay-fulbo/ui/components/card";
import { Field, FieldLabel } from "@hay-fulbo/ui/components/field";
import { Input } from "@hay-fulbo/ui/components/input";
import { useQuery } from "@tanstack/react-query";
import { CalendarPlusIcon, CopyIcon, MessageCircleIcon, RefreshCwIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AttendanceMeter } from "@/components/attendance-meter";
import {
  buildCalendarIcs,
  buildMatchMessage,
  buildWhatsAppUrl,
  downloadCalendar,
} from "@/lib/match-sharing";
import { queryClient, trpc } from "@/utils/trpc";

type AttendanceDetail = {
  capacity: number;
  courtCostMinor: string | null;
  id: string;
  lockVersion: number;
  rsvps: {
    playerDisplayName: string;
    playerId: string;
    respondedAt: Date | string;
    response: "yes" | "maybe" | "no";
  }[];
  scheduledAt: Date | string;
  status: "open" | "closed" | "cancelled";
};

type MatchAttendancePanelProps = {
  canEdit: boolean;
  court: { address: string; mapsUrl: string; name: string } | null;
  currency: string;
  detail: AttendanceDetail;
  groupName: string;
  onCapacityChange: (capacity: number) => void;
  pending: boolean;
  timeZone: string;
};

export function MatchAttendancePanel(props: MatchAttendancePanelProps) {
  if (props.detail.status !== "open") return null;
  return <OpenMatchAttendancePanel {...props} />;
}

function OpenMatchAttendancePanel({
  canEdit,
  court,
  currency,
  detail,
  groupName,
  onCapacityChange,
  pending,
  timeZone,
}: MatchAttendancePanelProps) {
  const invite = useQuery(trpc.matches.inviteLink.queryOptions({ matchId: detail.id }));
  const [capacity, setCapacity] = useState(String(detail.capacity));
  const summary = summarize(detail.rsvps, detail.capacity);
  const estimatedPerPlayerMinor =
    detail.courtCostMinor === null
      ? null
      : (
          (BigInt(detail.courtCostMinor) + BigInt(detail.capacity) - 1n) /
          BigInt(detail.capacity)
        ).toString();
  const message = invite.data
    ? buildMatchMessage({
        capacity: detail.capacity,
        court,
        currency,
        estimatedPerPlayerMinor,
        groupName,
        invitationUrl: invite.data.url,
        playing: summary.playing,
        scheduledAt: detail.scheduledAt,
        timeZone,
      })
    : null;

  function addToCalendar() {
    if (!invite.data) return;
    downloadCalendar(
      `hay-fulbo-${detail.id}.ics`,
      buildCalendarIcs({
        description: `Confirmá tu lugar: ${invite.data.url}`,
        location: court ? `${court.name}, ${court.address}` : undefined,
        start: detail.scheduledAt,
        title: `Hay Fulbo · ${groupName}`,
        uid: `${detail.id}@hay-fulbo`,
      }),
    );
  }

  async function copyLink() {
    if (!invite.data) return;
    try {
      await navigator.clipboard.writeText(invite.data.url);
      toast.success("Link copiado");
    } catch {
      toast.error("No pudimos copiar el link");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Convocatoria</CardTitle>
        <CardDescription>
          Compartí el link; cada jugador responde sin crear una cuenta.
        </CardDescription>
        <CardAction>
          <Button
            aria-label="Actualizar confirmaciones"
            onClick={() =>
              queryClient.invalidateQueries({
                queryKey: trpc.matches.detail.queryKey({ matchId: detail.id }),
              })
            }
            size="icon-sm"
            variant="ghost"
          >
            <RefreshCwIcon aria-hidden="true" />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-[0.75fr_1.25fr]">
        <div className="flex flex-col gap-5">
          <AttendanceMeter {...summary} capacity={detail.capacity} />
          {canEdit ? (
            <Field>
              <FieldLabel htmlFor="match-capacity">Cupos</FieldLabel>
              <div className="flex gap-2">
                <Input
                  className="w-24"
                  id="match-capacity"
                  inputMode="numeric"
                  max={40}
                  min={2}
                  onChange={(event) => setCapacity(event.target.value)}
                  type="number"
                  value={capacity}
                />
                <Button
                  disabled={
                    pending ||
                    Number(capacity) === detail.capacity ||
                    !Number.isInteger(Number(capacity)) ||
                    Number(capacity) < 2 ||
                    Number(capacity) > 40
                  }
                  onClick={() => onCapacityChange(Number(capacity))}
                  variant="outline"
                >
                  Guardar
                </Button>
              </div>
            </Field>
          ) : null}
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <Button
              disabled={!message}
              onClick={() =>
                message && window.open(buildWhatsAppUrl(message), "_blank", "noopener")
              }
            >
              <MessageCircleIcon data-icon="inline-start" aria-hidden="true" />
              WhatsApp
            </Button>
            <Button disabled={!invite.data} onClick={copyLink} variant="outline">
              <CopyIcon data-icon="inline-start" aria-hidden="true" />
              Copiar link
            </Button>
            <Button
              className="sm:col-span-2 lg:col-span-1 xl:col-span-2"
              disabled={!invite.data}
              onClick={addToCalendar}
              variant="outline"
            >
              <CalendarPlusIcon data-icon="inline-start" aria-hidden="true" />
              Agregar al calendario
            </Button>
          </div>
        </div>

        <div className="grid gap-4 border-t pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
          <ResponseGroup
            empty="Todavía nadie confirmó."
            label="Juegan"
            names={summary.playingNames}
            variant="secondary"
          />
          <ResponseGroup
            empty={null}
            label="En espera"
            names={summary.waitlistNames}
            variant="outline"
          />
          <ResponseGroup
            empty={null}
            label="En duda"
            names={summary.maybeNames}
            variant="outline"
          />
          <ResponseGroup empty={null} label="No pueden" names={summary.noNames} variant="outline" />
        </div>
      </CardContent>
    </Card>
  );
}

function ResponseGroup({
  empty,
  label,
  names,
  variant,
}: {
  empty: string | null;
  label: string;
  names: string[];
  variant: "outline" | "secondary";
}) {
  if (names.length === 0 && !empty) return null;
  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </h3>
      {names.length ? (
        <div className="flex flex-wrap gap-2">
          {names.map((name) => (
            <Badge key={name} variant={variant}>
              {name}
            </Badge>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{empty}</p>
      )}
    </section>
  );
}

function summarize(rsvps: AttendanceDetail["rsvps"], capacity: number) {
  const positive = rsvps
    .filter((rsvp) => rsvp.response === "yes")
    .toSorted(
      (left, right) =>
        new Date(left.respondedAt).getTime() - new Date(right.respondedAt).getTime() ||
        left.playerId.localeCompare(right.playerId),
    );
  const playing = positive.slice(0, capacity);
  const waitlisted = positive.slice(capacity);
  return {
    maybe: rsvps.filter((rsvp) => rsvp.response === "maybe").length,
    maybeNames: rsvps
      .filter((rsvp) => rsvp.response === "maybe")
      .map((rsvp) => rsvp.playerDisplayName),
    no: rsvps.filter((rsvp) => rsvp.response === "no").length,
    noNames: rsvps.filter((rsvp) => rsvp.response === "no").map((rsvp) => rsvp.playerDisplayName),
    playing: playing.length,
    playingNames: playing.map((rsvp) => rsvp.playerDisplayName),
    remaining: Math.max(capacity - playing.length, 0),
    waitlisted: waitlisted.length,
    waitlistNames: waitlisted.map((rsvp) => rsvp.playerDisplayName),
  };
}

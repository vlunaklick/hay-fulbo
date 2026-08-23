"use client";

import { Button } from "@hay-fulbo/ui/components/button";
import { useQuery } from "@tanstack/react-query";
import { CalendarPlusIcon, CopyIcon, MessageCircleIcon } from "lucide-react";
import { toast } from "sonner";

import {
  buildCalendarIcs,
  buildMatchMessage,
  buildWhatsAppUrl,
  downloadCalendar,
} from "@/lib/match-sharing";
import { trpc } from "@/utils/trpc";

export function MatchShareRow({
  court,
  groupName,
  detail,
}: {
  court: { address: string; mapsUrl: string; name: string } | null;
  groupName: string;
  detail: {
    id: string;
    courtCostMinor: string | null;
    scheduledAt: Date | string;
    teams: readonly { appearances: readonly unknown[] }[];
  };
}) {
  const invite = useQuery(trpc.matches.inviteLink.queryOptions({ matchId: detail.id }));
  const playing = detail.teams.reduce((sum, team) => sum + team.appearances.length, 0);
  const estimatedPerPlayerMinor =
    detail.courtCostMinor === null || playing === 0
      ? null
      : ((BigInt(detail.courtCostMinor) + BigInt(playing) - 1n) / BigInt(playing)).toString();
  const message = invite.data
    ? buildMatchMessage({
        court,
        currency: "ARS",
        estimatedPerPlayerMinor,
        groupName,
        invitationUrl: invite.data.url,
        playing,
        scheduledAt: detail.scheduledAt,
        timeZone: "America/Argentina/Buenos_Aires",
      })
    : null;

  function addToCalendar() {
    if (!invite.data) return;
    downloadCalendar(
      `hay-fulbo-${detail.id}.ics`,
      buildCalendarIcs({
        description: `Sumate: ${invite.data.url}`,
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
    <div className="flex flex-wrap gap-2">
      <Button
        disabled={!message}
        onClick={() => message && window.open(buildWhatsAppUrl(message), "_blank", "noopener")}
        size="sm"
      >
        <MessageCircleIcon data-icon="inline-start" aria-hidden="true" />
        WhatsApp
      </Button>
      <Button disabled={!invite.data} onClick={copyLink} size="sm" variant="outline">
        <CopyIcon data-icon="inline-start" aria-hidden="true" />
        Copiar link
      </Button>
      <Button disabled={!invite.data} onClick={addToCalendar} size="sm" variant="ghost">
        <CalendarPlusIcon data-icon="inline-start" aria-hidden="true" />
        Calendario
      </Button>
    </div>
  );
}

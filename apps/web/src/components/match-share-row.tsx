"use client";

import { Button } from "@hay-fulbo/ui/components/button";
import { useQuery } from "@tanstack/react-query";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@hay-fulbo/ui/components/dropdown-menu";
import { CalendarPlusIcon, CopyIcon, MessageCircleIcon, Share2Icon } from "lucide-react";
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

  const ready = Boolean(invite.data);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button size="sm" variant="outline" />}>
        <Share2Icon data-icon="inline-start" aria-hidden="true" />
        Invitar
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {!ready ? (
          <>
            <DropdownMenuGroup>
              <DropdownMenuLabel role={invite.isError ? "alert" : "status"}>
                {invite.isError
                  ? "No pudimos cargar el enlace para compartir."
                  : "Preparando el enlace para compartir…"}
              </DropdownMenuLabel>
              {invite.isError ? (
                <DropdownMenuItem closeOnClick={false} onClick={() => invite.refetch()}>
                  Reintentar
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
          </>
        ) : null}
        <DropdownMenuItem
          disabled={!message}
          onClick={() => message && window.open(buildWhatsAppUrl(message), "_blank", "noopener")}
        >
          <MessageCircleIcon aria-hidden="true" />
          WhatsApp
        </DropdownMenuItem>
        <DropdownMenuItem disabled={!ready} onClick={copyLink}>
          <CopyIcon aria-hidden="true" />
          Copiar link
        </DropdownMenuItem>
        <DropdownMenuItem disabled={!ready} onClick={addToCalendar}>
          <CalendarPlusIcon aria-hidden="true" />
          Calendario
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

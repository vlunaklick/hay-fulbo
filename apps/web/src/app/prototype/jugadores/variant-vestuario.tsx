"use client";
// PROTOTYPE ONLY — "Vestuario": you never leave the list. On a phone a row opens
// in place with the short sheet; on desktop it is master–detail with the full
// profile beside the list. Same content, more room — not a different screen.

import { Avatar, AvatarFallback } from "@hay-fulbo/ui/components/avatar";
import { Badge } from "@hay-fulbo/ui/components/badge";
import { Button } from "@hay-fulbo/ui/components/button";
import { Card } from "@hay-fulbo/ui/components/card";
import { Skeleton } from "@hay-fulbo/ui/components/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@hay-fulbo/ui/components/tabs";
import { cn } from "@hay-fulbo/ui/lib/utils";
import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  ChevronDownIcon,
  MailPlusIcon,
  PencilIcon,
  PlusIcon,
} from "lucide-react";
import { useState } from "react";

import { PageHeader } from "@/components/page-header";
import { initials } from "@/lib/initials";
import { accountPresentationLabel, type PlayerAccountMember } from "@/lib/player-account-link";

import {
  CreatePlayerDialog,
  EditPlayerDialog,
  FormChip,
  InvitePlayerForm,
  SearchField,
  TeamDot,
  filterPlayers,
  formatPercent,
  formatShortDate,
  perspective,
  useArchivePlayer,
  useCanManage,
  usePlayerDetail,
  usePlayersData,
  useSelectedPlayerId,
  type PlayerRowData,
  type StatusFilter,
} from "./shared";

export function VariantVestuario() {
  const canManage = useCanManage();
  const data = usePlayersData();
  const [selected, select] = useSelectedPlayerId();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("active");
  const [createOpen, setCreateOpen] = useState(false);
  const visible = filterPlayers(data.players, search, status).toSorted(
    (a, b) =>
      b.stats.played - a.stats.played || a.displayName.localeCompare(b.displayName, "es-AR"),
  );
  const paneId = selected ?? visible[0]?.id ?? null;
  const panePlayer = data.players.find((player) => player.id === paneId) ?? null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Jugadores"
        description="Los que más juegan, arriba. Tocá uno para ver cómo viene."
        actions={
          canManage ? (
            <Button onClick={() => setCreateOpen(true)}>
              <PlusIcon data-icon="inline-start" aria-hidden="true" />
              Nuevo jugador
            </Button>
          ) : null
        }
      />
      <CreatePlayerDialog open={createOpen} onOpenChange={setCreateOpen} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:items-start">
        <div className="flex min-w-0 flex-col gap-3 lg:sticky lg:top-6">
          <SearchField value={search} onChange={setSearch} />
          <Tabs value={status} onValueChange={(value) => setStatus(value as StatusFilter)}>
            <TabsList className="w-full">
              <TabsTrigger value="active">Activos</TabsTrigger>
              <TabsTrigger value="all">Todos</TabsTrigger>
              <TabsTrigger value="archived">Archivados</TabsTrigger>
            </TabsList>
          </Tabs>

          {data.isPending ? (
            <Skeleton className="h-96 w-full rounded-lg" />
          ) : visible.length === 0 ? (
            <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              Nadie con ese nombre. Probá con un apodo o cambiá el filtro.
            </p>
          ) : (
            <Card className="gap-0 py-0 lg:max-h-[calc(100dvh-14rem)] lg:overflow-y-auto">
              <ul>
                {visible.map((player, index) => {
                  const open = player.id === selected;
                  const inPane = player.id === paneId;
                  return (
                    <li key={player.id} className={cn(index > 0 && "border-t")}>
                      <button
                        type="button"
                        aria-expanded={open}
                        onClick={() => select(open ? null : player.id, "replace")}
                        className={cn(
                          "relative flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left transition-colors duration-150 ease-out hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50 active:bg-muted",
                          open && "bg-muted/60",
                          inPane && "lg:bg-muted/60",
                        )}
                      >
                        <span
                          aria-hidden="true"
                          className={cn(
                            "absolute inset-y-2 left-0 w-0.5 rounded-full bg-primary opacity-0",
                            open && "opacity-100 lg:opacity-0",
                            inPane && "lg:opacity-100",
                          )}
                        />
                        <Avatar className="size-8">
                          <AvatarFallback>{initials(player.displayName)}</AvatarFallback>
                        </Avatar>
                        <span className="flex min-w-0 flex-1 items-center gap-2">
                          <span className="truncate text-sm font-medium">{player.displayName}</span>
                          {player.archived ? <Badge variant="secondary">Archivado</Badge> : null}
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                          {player.stats.played === 0 ? (
                            "—"
                          ) : (
                            <>
                              <span className="font-semibold text-foreground">
                                {player.stats.goals}
                              </span>{" "}
                              G ·{" "}
                              <span className="font-semibold text-foreground">
                                {player.stats.assists}
                              </span>{" "}
                              A
                            </>
                          )}
                        </span>
                        <ChevronDownIcon
                          aria-hidden="true"
                          className={cn(
                            "size-4 shrink-0 text-muted-foreground transition-transform duration-200 ease-out lg:hidden",
                            open && "rotate-180",
                          )}
                        />
                      </button>
                      {open ? (
                        <div className="border-t bg-muted/30 px-4 py-4 animate-in fade-in-0 duration-200 lg:hidden">
                          <Detail player={player} members={data.members} layout="inline" />
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}
        </div>

        <div className="hidden min-w-0 lg:block">
          {panePlayer ? (
            <Card className="gap-0 px-6 py-6">
              <Detail
                key={panePlayer.id}
                player={panePlayer}
                members={data.members}
                layout="pane"
              />
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Detail({
  player,
  members,
  layout,
}: {
  player: PlayerRowData;
  members: readonly PlayerAccountMember[];
  layout: "inline" | "pane";
}) {
  const canManage = useCanManage();
  const detail = usePlayerDetail(player.id);
  const archive = useArchivePlayer();
  const [editOpen, setEditOpen] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [showAll, setShowAll] = useState(layout === "pane");
  const stats = player.stats;
  const matches = detail.data?.matches ?? [];
  const timeZone = detail.data?.group.timeZone ?? "America/Argentina/Buenos_Aires";
  const shownMatches = showAll ? matches : matches.slice(0, 3);
  const pane = layout === "pane";
  const actions = (
    <div className="flex shrink-0 gap-1">
      <Button variant="outline" onClick={() => setEditOpen(true)}>
        <PencilIcon data-icon="inline-start" aria-hidden="true" />
        Editar
      </Button>
      {!player.linkedUserId ? (
        <Button variant="outline" onClick={() => setInviting((value) => !value)}>
          <MailPlusIcon data-icon="inline-start" aria-hidden="true" />
          Invitar
        </Button>
      ) : null}
      <Button
        variant="ghost"
        size="icon"
        aria-label={player.archived ? "Reactivar jugador" : "Archivar jugador"}
        disabled={archive.isPending}
        onClick={() => archive.toggle(player)}
      >
        {player.archived ? (
          <ArchiveRestoreIcon aria-hidden="true" />
        ) : (
          <ArchiveIcon aria-hidden="true" />
        )}
      </Button>
    </div>
  );

  return (
    <div className={cn("flex flex-col", pane ? "gap-6" : "gap-4")}>
      {pane ? (
        <header className="flex items-start gap-4">
          <Avatar className="size-12">
            <AvatarFallback>{initials(player.displayName)}</AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h2 className="text-xl font-bold tracking-tight text-balance">{player.displayName}</h2>
            <p className="truncate text-sm text-muted-foreground">
              {player.linkedUserId
                ? accountPresentationLabel(members, player.linkedUserId)
                : "Sin cuenta en la app"}
            </p>
          </div>
          {canManage ? actions : null}
        </header>
      ) : null}
      {pane && canManage && inviting && !player.linkedUserId ? (
        <div className="rounded-lg border p-4">
          <InvitePlayerForm player={player} />
        </div>
      ) : null}

      {stats.played === 0 ? (
        <p className="text-sm text-muted-foreground">
          Todavía no jugó un partido cerrado. Sus números aparecen después del primero.
        </p>
      ) : (
        <>
          <dl className={cn("grid grid-cols-4", pane ? "gap-4" : "gap-2")}>
            <Mini label="Partidos" value={stats.played} pane={pane} />
            <Mini label="Goles" value={stats.goals} pane={pane} />
            <Mini label="Asist." value={stats.assists} pane={pane} />
            <Mini label="% victorias" value={formatPercent(stats.winPercentage)} pane={pane} />
          </dl>
          {matches.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                Últimos {Math.min(pane ? 10 : 5, matches.length)}
              </span>
              <div className="flex flex-wrap gap-1">
                {matches.slice(0, pane ? 10 : 5).map((match) => (
                  <FormChip key={match.matchId} outcome={match.outcome} />
                ))}
              </div>
            </div>
          ) : null}
        </>
      )}

      {detail.isPending ? (
        <Skeleton className="h-24 w-full rounded-md" />
      ) : matches.length > 0 ? (
        <div className="flex flex-col gap-1">
          {pane ? <h3 className="text-sm font-semibold">Partidos</h3> : null}
          <ul className="flex flex-col">
            {shownMatches.map((match, index) => {
              const { own, rival } = perspective(match);
              return (
                <li
                  key={match.matchId}
                  className={cn(
                    "flex min-h-11 items-center gap-3 text-sm",
                    index > 0 && "border-t border-border/60",
                  )}
                >
                  <span className="w-14 shrink-0 text-xs text-muted-foreground">
                    {formatShortDate(match.scheduledAt, timeZone)}
                  </span>
                  <TeamDot slot={own.slot} />
                  <span className="font-semibold tabular-nums">
                    {own.goals}–{rival.goals}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                    {match.outcome === "win"
                      ? "ganó"
                      : match.outcome === "draw"
                        ? "empató"
                        : "perdió"}
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {match.goals || match.assists
                      ? [
                          match.goals ? `${match.goals} G` : null,
                          match.assists ? `${match.assists} A` : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")
                      : "—"}
                  </span>
                </li>
              );
            })}
          </ul>
          {!showAll && matches.length > 3 ? (
            <Button
              variant="ghost"
              size="sm"
              className="-ml-3 w-fit"
              onClick={() => setShowAll(true)}
            >
              Ver los {matches.length} partidos
            </Button>
          ) : null}
        </div>
      ) : null}

      {canManage && !pane ? (
        <div className="flex flex-col gap-3">
          {inviting && !player.linkedUserId ? (
            <InvitePlayerForm player={player} />
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setEditOpen(true)}>
                <PencilIcon data-icon="inline-start" aria-hidden="true" />
                Editar
              </Button>
              {!player.linkedUserId ? (
                <Button variant="outline" onClick={() => setInviting(true)}>
                  <MailPlusIcon data-icon="inline-start" aria-hidden="true" />
                  Invitar
                </Button>
              ) : null}
              <Button
                variant="ghost"
                disabled={archive.isPending}
                onClick={() => archive.toggle(player)}
              >
                {player.archived ? (
                  <ArchiveRestoreIcon data-icon="inline-start" aria-hidden="true" />
                ) : (
                  <ArchiveIcon data-icon="inline-start" aria-hidden="true" />
                )}
                {player.archived ? "Reactivar" : "Archivar"}
              </Button>
            </div>
          )}
        </div>
      ) : null}
      <EditPlayerDialog
        key={`${player.id}-${editOpen}`}
        open={editOpen}
        onOpenChange={setEditOpen}
        player={player}
        members={members}
      />
    </div>
  );
}

function Mini({ label, value, pane }: { label: string; value: number | string; pane: boolean }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="truncate text-xs text-muted-foreground">{label}</dt>
      <dd className={cn("font-semibold tabular-nums", pane ? "text-2xl" : "text-lg")}>{value}</dd>
    </div>
  );
}

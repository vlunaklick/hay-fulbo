"use client";
// PROTOTYPE ONLY — "Tabla": players as a ranking. One metric at a time decides
// the order; the profile is a stat sheet (big numbers, form, own line per match).
// Management steps back into an overflow menu.

import { Badge } from "@hay-fulbo/ui/components/badge";
import { Button } from "@hay-fulbo/ui/components/button";
import { Card } from "@hay-fulbo/ui/components/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@hay-fulbo/ui/components/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@hay-fulbo/ui/components/dropdown-menu";
import { Skeleton } from "@hay-fulbo/ui/components/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@hay-fulbo/ui/components/tabs";
import { cn } from "@hay-fulbo/ui/lib/utils";
import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  ArrowLeftIcon,
  EllipsisIcon,
  MailPlusIcon,
  PencilIcon,
  PlusIcon,
} from "lucide-react";
import { useState } from "react";

import { PageHeader } from "@/components/page-header";
import type { PlayerAccountMember } from "@/lib/player-account-link";

import {
  CreatePlayerDialog,
  EditPlayerDialog,
  FormChip,
  InvitePlayerForm,
  SearchField,
  TeamDot,
  filterPlayers,
  formatPercent,
  formatRate,
  formatShortDate,
  perspective,
  signed,
  useArchivePlayer,
  useCanManage,
  usePlayerDetail,
  usePlayersData,
  useSelectedPlayerId,
  type Aggregate,
  type PlayerRowData,
} from "./shared";

type Metric = "contributions" | "goals" | "assists" | "played" | "winPercentage";

const METRICS: { key: Metric; short: string; long: string }[] = [
  { key: "contributions", short: "G+A", long: "goles + asistencias" },
  { key: "goals", short: "Goles", long: "goles" },
  { key: "assists", short: "Asist.", long: "asistencias" },
  { key: "played", short: "PJ", long: "partidos jugados" },
  { key: "winPercentage", short: "% V", long: "% de victorias" },
];

function metricValue(stats: Aggregate, metric: Metric) {
  return stats[metric];
}

function formatMetric(value: number, metric: Metric) {
  return metric === "winPercentage" ? formatPercent(value) : String(value);
}

function rankPlayers(players: PlayerRowData[], metric: Metric) {
  return players.toSorted(
    (a, b) =>
      metricValue(b.stats, metric) - metricValue(a.stats, metric) ||
      b.stats.played - a.stats.played ||
      a.displayName.localeCompare(b.displayName, "es-AR"),
  );
}

export function VariantTabla() {
  const [selected, select] = useSelectedPlayerId();
  const data = usePlayersData();
  const [metric, setMetric] = useState<Metric>("contributions");
  const player = data.players.find((item) => item.id === selected) ?? null;
  if (selected && player) {
    const ranked = rankPlayers(
      data.players.filter((item) => !item.archived && item.stats.played > 0),
      metric,
    );
    const position = ranked.findIndex((item) => item.id === player.id) + 1;
    return (
      <TablaProfile
        player={player}
        members={data.members}
        metric={metric}
        position={position}
        total={ranked.length}
        onBack={() => select(null)}
      />
    );
  }
  return <TablaList data={data} metric={metric} onMetric={setMetric} onOpen={(id) => select(id)} />;
}

function TablaList({
  data,
  metric,
  onMetric,
  onOpen,
}: {
  data: ReturnType<typeof usePlayersData>;
  metric: Metric;
  onMetric: (metric: Metric) => void;
  onOpen: (id: string) => void;
}) {
  const canManage = useCanManage();
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const pool = filterPlayers(data.players, search, showArchived ? "all" : "active");
  const ranked = rankPlayers(
    pool.filter((player) => player.stats.played > 0),
    metric,
  );
  const unplayed = pool.filter((player) => player.stats.played === 0);
  const max = Math.max(1, ...ranked.map((player) => metricValue(player.stats, metric)));
  const archivedCount = data.players.filter((player) => player.archived).length;
  const current = METRICS.find((item) => item.key === metric)!;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Jugadores"
        description={`Ordenados por ${current.long}, en partidos cerrados.`}
        actions={
          canManage ? (
            <Button variant="outline" onClick={() => setCreateOpen(true)}>
              <PlusIcon data-icon="inline-start" aria-hidden="true" />
              Nuevo jugador
            </Button>
          ) : null
        }
      />
      <CreatePlayerDialog open={createOpen} onOpenChange={setCreateOpen} />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs value={metric} onValueChange={(value) => onMetric(value as Metric)}>
          <TabsList aria-label="Ordenar por" className="w-full lg:w-fit">
            {METRICS.map((item) => (
              <TabsTrigger key={item.key} value={item.key} className="px-2.5">
                {item.short}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <SearchField value={search} onChange={setSearch} className="lg:max-w-64" />
      </div>

      {data.isPending ? (
        <Skeleton className="h-96 w-full rounded-lg" />
      ) : ranked.length === 0 && unplayed.length === 0 ? (
        <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          Nadie con ese nombre. Probá con un apodo.
        </p>
      ) : (
        <Card className="gap-0 py-0">
          <div className="flex items-center gap-3 border-b px-4 py-2 text-xs font-medium text-muted-foreground">
            <span className="w-6 text-right">#</span>
            <span className="flex-1">Jugador</span>
            <span className="text-right">{current.short}</span>
          </div>
          <ol>
            {ranked.map((player, index) => {
              const value = metricValue(player.stats, metric);
              const tied = index > 0 && metricValue(ranked[index - 1]!.stats, metric) === value;
              return (
                <li key={player.id} className={index > 0 ? "border-t" : undefined}>
                  <button
                    type="button"
                    onClick={() => onOpen(player.id)}
                    className="flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left transition-colors duration-150 ease-out hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:bg-muted"
                  >
                    <span
                      className={cn(
                        "w-6 shrink-0 text-right text-sm tabular-nums",
                        tied
                          ? "text-transparent"
                          : index < 3
                            ? "font-semibold"
                            : "text-muted-foreground",
                      )}
                      aria-label={`Puesto ${index + 1}`}
                    >
                      {index + 1}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="truncate text-sm font-medium">{player.displayName}</span>
                        {player.archived ? <Badge variant="secondary">Archivado</Badge> : null}
                      </span>
                      <span
                        className="h-1 w-full overflow-hidden rounded-full bg-muted"
                        aria-hidden="true"
                      >
                        <span
                          className="block h-full rounded-full bg-foreground/35"
                          style={{ width: `${(value / max) * 100}%` }}
                        />
                      </span>
                    </span>
                    <span className="flex w-16 shrink-0 flex-col items-end">
                      <span className="text-lg font-semibold tabular-nums leading-tight">
                        {formatMetric(value, metric)}
                      </span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {metric === "played"
                          ? `${player.stats.contributions} G+A`
                          : `${player.stats.played} PJ`}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
          {unplayed.length > 0 ? (
            <div className="flex flex-col gap-1 border-t px-4 py-3">
              <span className="text-xs font-medium text-muted-foreground">
                Sin partidos todavía
              </span>
              <div className="flex flex-wrap gap-x-1">
                {unplayed.map((player) => (
                  <Button
                    key={player.id}
                    variant="link"
                    className="h-11 px-1"
                    onClick={() => onOpen(player.id)}
                  >
                    {player.displayName}
                  </Button>
                ))}
              </div>
            </div>
          ) : null}
        </Card>
      )}

      {archivedCount > 0 ? (
        <Button
          variant="ghost"
          className="w-fit self-center"
          onClick={() => setShowArchived((value) => !value)}
        >
          {showArchived ? "Ocultar archivados" : `Incluir ${archivedCount} archivados`}
        </Button>
      ) : null}
    </div>
  );
}

function TablaProfile({
  player,
  members,
  metric,
  position,
  total,
  onBack,
}: {
  player: PlayerRowData;
  members: readonly PlayerAccountMember[];
  metric: Metric;
  position: number;
  total: number;
  onBack: () => void;
}) {
  const canManage = useCanManage();
  const detail = usePlayerDetail(player.id);
  const archive = useArchivePlayer();
  const [editOpen, setEditOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const stats = player.stats;
  const matches = detail.data?.matches ?? [];
  const timeZone = detail.data?.group.timeZone ?? "America/Argentina/Buenos_Aires";
  const form = matches.slice(0, 10);
  const metricLabel = METRICS.find((item) => item.key === metric)!.short;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" className="-ml-3 w-fit" onClick={onBack}>
          <ArrowLeftIcon data-icon="inline-start" aria-hidden="true" />
          Tabla
        </Button>
        {canManage ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="ghost" size="icon" aria-label="Más acciones" />}
            >
              <EllipsisIcon aria-hidden="true" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setEditOpen(true)}>
                <PencilIcon aria-hidden="true" />
                Editar jugador
              </DropdownMenuItem>
              {!player.linkedUserId ? (
                <DropdownMenuItem onClick={() => setInviteOpen(true)}>
                  <MailPlusIcon aria-hidden="true" />
                  Invitar a la app
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled={archive.isPending} onClick={() => archive.toggle(player)}>
                {player.archived ? (
                  <ArchiveRestoreIcon aria-hidden="true" />
                ) : (
                  <ArchiveIcon aria-hidden="true" />
                )}
                {player.archived ? "Reactivar" : "Archivar"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
      <EditPlayerDialog
        key={`${player.id}-${editOpen}`}
        open={editOpen}
        onOpenChange={setEditOpen}
        player={player}
        members={members}
      />
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invitar a {player.displayName}</DialogTitle>
            <DialogDescription>
              La cuenta que acepte queda vinculada a este jugador.
            </DialogDescription>
          </DialogHeader>
          <InvitePlayerForm player={player} />
        </DialogContent>
      </Dialog>

      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-balance">{player.displayName}</h1>
        <p className="text-sm text-muted-foreground">
          {player.archived ? "Archivado · " : ""}
          {stats.played === 0
            ? "Todavía no jugó un partido cerrado"
            : position > 0
              ? `${position}º de ${total} en ${metricLabel} · ${stats.played} partidos`
              : `${stats.played} partidos`}
        </p>
      </header>

      {stats.played === 0 ? (
        <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          Sus números aparecen cuando juegue su primer partido cerrado.
        </p>
      ) : (
        <>
          <dl className="grid grid-cols-3 gap-4">
            <Hero label="Goles" value={stats.goals} />
            <Hero label="Asistencias" value={stats.assists} />
            <Hero
              label="G+A"
              value={stats.contributions}
              hint={`${formatRate(stats.contributionsPerMatch)} por partido`}
            />
          </dl>

          <section aria-labelledby="tabla-record" className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between gap-3">
              <h2 id="tabla-record" className="text-base font-semibold">
                Resultados
              </h2>
              <span className="text-sm text-muted-foreground tabular-nums">
                {formatPercent(stats.winPercentage)} victorias · {signed(stats.goalDifference)} de
                gol
              </span>
            </div>
            <RecordBar wins={stats.wins} draws={stats.draws} losses={stats.losses} />
            {form.length > 0 ? (
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  Últimos {form.length}, del más reciente
                </span>
                <div className="flex flex-wrap gap-1">
                  {form.map((match) => (
                    <FormChip key={match.matchId} outcome={match.outcome} />
                  ))}
                </div>
              </div>
            ) : null}
          </section>
        </>
      )}

      <section aria-labelledby="tabla-matches" className="flex flex-col gap-3">
        <h2 id="tabla-matches" className="text-base font-semibold">
          Partido a partido
        </h2>
        {detail.isPending ? (
          <Skeleton className="h-40 w-full rounded-lg" />
        ) : matches.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin partidos cerrados.</p>
        ) : (
          <Card className="gap-0 py-0">
            <div className="flex items-center gap-3 border-b px-4 py-2 text-xs font-medium text-muted-foreground">
              <span className="flex-1">Partido</span>
              <span className="w-7 text-right">G</span>
              <span className="w-7 text-right">A</span>
            </div>
            {matches.map((match, index) => {
              const { own, rival } = perspective(match);
              return (
                <div
                  key={match.matchId}
                  className={cn(
                    "flex min-h-12 items-center gap-3 px-4 py-2",
                    index > 0 && "border-t",
                  )}
                >
                  <FormChip outcome={match.outcome} className="size-6" />
                  <span className="flex min-w-0 flex-1 items-center gap-2 text-sm">
                    <TeamDot slot={own.slot} />
                    <span className="font-semibold tabular-nums">
                      {own.goals}–{rival.goals}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {formatShortDate(match.scheduledAt, timeZone)}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "w-7 text-right text-sm tabular-nums",
                      match.goals ? "font-semibold" : "text-muted-foreground",
                    )}
                  >
                    {match.goals}
                  </span>
                  <span
                    className={cn(
                      "w-7 text-right text-sm tabular-nums",
                      match.assists ? "font-semibold" : "text-muted-foreground",
                    )}
                  >
                    {match.assists}
                  </span>
                </div>
              );
            })}
          </Card>
        )}
      </section>
    </div>
  );
}

function Hero({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-5xl font-black tabular-nums leading-none tracking-tight">{value}</dd>
      {hint ? <dd className="text-xs text-muted-foreground">{hint}</dd> : null}
    </div>
  );
}

function RecordBar({ wins, draws, losses }: { wins: number; draws: number; losses: number }) {
  const total = Math.max(1, wins + draws + losses);
  const parts = [
    {
      key: "V",
      label: wins === 1 ? "victoria" : "victorias",
      value: wins,
      className: "bg-success",
    },
    {
      key: "E",
      label: draws === 1 ? "empate" : "empates",
      value: draws,
      className: "bg-muted-foreground/50",
    },
    {
      key: "D",
      label: losses === 1 ? "derrota" : "derrotas",
      value: losses,
      className: "bg-border",
    },
  ];
  return (
    <div className="flex flex-col gap-2">
      <div className="flex h-2 w-full gap-0.5 overflow-hidden rounded-full" aria-hidden="true">
        {parts.map((part) =>
          part.value > 0 ? (
            <span
              key={part.key}
              className={part.className}
              style={{ width: `${(part.value / total) * 100}%` }}
            />
          ) : null,
        )}
      </div>
      <div className="flex gap-4 text-sm tabular-nums">
        {parts.map((part) => (
          <span key={part.key}>
            <span className="font-semibold">{part.value}</span>{" "}
            <span className="text-muted-foreground">{part.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

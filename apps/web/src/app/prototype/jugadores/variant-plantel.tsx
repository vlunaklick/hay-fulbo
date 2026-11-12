"use client";
// PROTOTYPE ONLY — "Plantel": the directory is about people. Alphabetical,
// account status on every row, and one profile page where management sits on top.

import { Avatar, AvatarFallback } from "@hay-fulbo/ui/components/avatar";
import { Badge } from "@hay-fulbo/ui/components/badge";
import { Button } from "@hay-fulbo/ui/components/button";
import { Card } from "@hay-fulbo/ui/components/card";
import { Skeleton } from "@hay-fulbo/ui/components/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@hay-fulbo/ui/components/tabs";
import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  ArrowLeftIcon,
  ChevronRightIcon,
  PencilIcon,
  PlusIcon,
  SearchXIcon,
} from "lucide-react";
import { useState } from "react";

import { PageHeader } from "@/components/page-header";
import { initials } from "@/lib/initials";
import { accountPresentationLabel, type PlayerAccountMember } from "@/lib/player-account-link";

import {
  CreatePlayerDialog,
  EditPlayerDialog,
  InvitePlayerForm,
  SearchField,
  TeamDot,
  filterPlayers,
  formatLongDate,
  formatPercent,
  formatRate,
  outcomeWord,
  perspective,
  relativeWeeks,
  signed,
  useArchivePlayer,
  useCanManage,
  usePlayerDetail,
  usePlayersData,
  useSelectedPlayerId,
  plural,
  type PlayerRowData,
} from "./shared";

export function VariantPlantel() {
  const [selected, select] = useSelectedPlayerId();
  const data = usePlayersData();
  const player = data.players.find((item) => item.id === selected) ?? null;
  if (selected && player) {
    return <PlantelProfile player={player} members={data.members} onBack={() => select(null)} />;
  }
  return <PlantelList data={data} onOpen={(id) => select(id)} />;
}

function PlantelList({
  data,
  onOpen,
}: {
  data: ReturnType<typeof usePlayersData>;
  onOpen: (id: string) => void;
}) {
  const canManage = useCanManage();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"active" | "archived">("active");
  const [createOpen, setCreateOpen] = useState(false);
  const active = data.players.filter((player) => !player.archived);
  const archivedCount = data.players.length - active.length;
  const unlinked = active.filter((player) => !player.linkedUserId).length;
  const visible = filterPlayers(data.players, search, status).toSorted((a, b) =>
    a.displayName.localeCompare(b.displayName, "es-AR"),
  );
  const groups = groupByLetter(visible);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Jugadores"
        description={
          data.isPending
            ? "Cargando plantel…"
            : `${active.length} en el plantel · ${unlinked} sin cuenta en la app`
        }
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

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchField value={search} onChange={setSearch} className="sm:max-w-xs" />
        <Tabs value={status} onValueChange={(value) => setStatus(value as "active" | "archived")}>
          <TabsList className="w-full sm:w-fit">
            <TabsTrigger value="active">
              En el plantel{" "}
              <span className="tabular-nums text-muted-foreground">{active.length}</span>
            </TabsTrigger>
            <TabsTrigger value="archived">
              Archivados <span className="tabular-nums text-muted-foreground">{archivedCount}</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {data.isPending ? (
        <div className="flex flex-col gap-px">
          {Array.from({ length: 8 }, (_, index) => (
            <Skeleton
              key={index}
              className="h-14 w-full rounded-none first:rounded-t-lg last:rounded-b-lg"
            />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="flex items-center gap-4 rounded-lg border border-dashed p-4">
          <SearchXIcon className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <p className="text-sm font-medium">
              {search ? "Nadie con ese nombre" : "No hay jugadores archivados"}
            </p>
            <p className="text-sm text-muted-foreground">
              {search
                ? "Probá con un apodo o limpiá la búsqueda."
                : "Los que archives aparecen acá."}
            </p>
          </div>
        </div>
      ) : (
        <Card className="gap-0 py-0">
          {groups.map(([letter, players], groupIndex) => (
            <section key={letter} aria-label={`Jugadores con ${letter}`}>
              <h2
                className={`bg-muted/40 px-4 py-1 text-xs font-medium text-muted-foreground ${groupIndex > 0 ? "border-t" : ""}`}
              >
                {letter}
              </h2>
              {players.map((player) => (
                <button
                  key={player.id}
                  type="button"
                  onClick={() => onOpen(player.id)}
                  className="flex min-h-16 w-full items-center gap-3 border-t px-4 py-2.5 text-left transition-colors duration-150 ease-out hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50 active:bg-muted"
                >
                  <Avatar className="size-9">
                    <AvatarFallback>{initials(player.displayName)}</AvatarFallback>
                  </Avatar>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-sm font-medium">{player.displayName}</span>
                    <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                      {player.linkedUserId ? (
                        <span className="truncate">
                          {accountPresentationLabel(data.members, player.linkedUserId)}
                        </span>
                      ) : (
                        <span>Sin cuenta</span>
                      )}
                      <span aria-hidden="true">·</span>
                      <span className="shrink-0 tabular-nums">
                        {player.stats.played === 0
                          ? "sin partidos"
                          : plural(player.stats.played, "partido", "partidos")}
                      </span>
                    </span>
                  </span>
                  <ChevronRightIcon
                    className="size-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                </button>
              ))}
            </section>
          ))}
        </Card>
      )}
    </div>
  );
}

function PlantelProfile({
  player,
  members,
  onBack,
}: {
  player: PlayerRowData;
  members: readonly PlayerAccountMember[];
  onBack: () => void;
}) {
  const canManage = useCanManage();
  const detail = usePlayerDetail(player.id);
  const archive = useArchivePlayer();
  const [editOpen, setEditOpen] = useState(false);
  const stats = player.stats;
  const matches = detail.data?.matches ?? [];
  const timeZone = detail.data?.group.timeZone ?? "America/Argentina/Buenos_Aires";
  const lastMatch = matches[0];

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <div className="flex flex-col gap-4">
        <Button variant="ghost" size="sm" className="-ml-3 w-fit" onClick={onBack}>
          <ArrowLeftIcon data-icon="inline-start" aria-hidden="true" />
          Jugadores
        </Button>
        <header className="flex items-start gap-4">
          <Avatar className="size-14 text-base">
            <AvatarFallback>{initials(player.displayName)}</AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h1 className="text-2xl font-bold tracking-tight text-balance">{player.displayName}</h1>
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
              {player.archived ? <Badge variant="secondary">Archivado</Badge> : null}
              <span>
                {lastMatch
                  ? `Último partido ${relativeWeeks(lastMatch.scheduledAt)}`
                  : "Todavía no jugó"}
              </span>
            </p>
          </div>
        </header>
        {canManage ? (
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <PencilIcon data-icon="inline-start" aria-hidden="true" />
              Editar
            </Button>
            <Button
              variant="outline"
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
        ) : null}
        <EditPlayerDialog
          key={`${player.id}-${editOpen}`}
          open={editOpen}
          onOpenChange={setEditOpen}
          player={player}
          members={members}
        />
      </div>

      <section aria-labelledby="plantel-account" className="flex flex-col gap-3">
        <h2 id="plantel-account" className="text-base font-semibold">
          Cuenta en la app
        </h2>
        {player.linkedUserId ? (
          <Card size="sm" className="flex-row items-center gap-3 px-4">
            <span className="min-w-0 flex-1 truncate text-sm">
              {accountPresentationLabel(members, player.linkedUserId)}
            </span>
            <Badge variant="success">Vinculada</Badge>
          </Card>
        ) : canManage ? (
          <Card size="sm" className="gap-3 px-4">
            <p className="text-sm text-muted-foreground">
              Todavía no tiene cuenta. La cuenta que acepte la invitación queda vinculada a este
              jugador.
            </p>
            <InvitePlayerForm player={player} />
          </Card>
        ) : (
          <p className="text-sm text-muted-foreground">Sin cuenta vinculada.</p>
        )}
      </section>

      <section aria-labelledby="plantel-stats" className="flex flex-col gap-3">
        <h2 id="plantel-stats" className="text-base font-semibold">
          Números
        </h2>
        {stats.played === 0 ? (
          <p className="text-sm text-muted-foreground">
            — <span className="text-xs">Aparecen cuando juegue su primer partido cerrado.</span>
          </p>
        ) : (
          <>
            <Card className="py-0">
              <dl className="grid grid-cols-4 divide-x">
                <StripMetric label="Partidos" value={stats.played} />
                <StripMetric label="Goles" value={stats.goals} />
                <StripMetric label="Asist." value={stats.assists} />
                <StripMetric label="% victorias" value={formatPercent(stats.winPercentage)} />
              </dl>
            </Card>
            <p className="text-sm text-muted-foreground tabular-nums">
              {plural(stats.wins, "victoria", "victorias")} ·{" "}
              {plural(stats.draws, "empate", "empates")} ·{" "}
              {plural(stats.losses, "derrota", "derrotas")} ·{" "}
              {formatRate(stats.contributionsPerMatch)} G+A por partido ·{" "}
              {signed(stats.goalDifference)} de gol
            </p>
          </>
        )}
      </section>

      <section aria-labelledby="plantel-history" className="flex flex-col gap-3">
        <h2 id="plantel-history" className="text-base font-semibold">
          Partidos
        </h2>
        {detail.isPending ? (
          <Skeleton className="h-40 w-full rounded-lg" />
        ) : matches.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin partidos cerrados.</p>
        ) : (
          <Card className="gap-0 py-0">
            {matches.map((match, index) => {
              const { own, rival } = perspective(match);
              return (
                <div
                  key={match.matchId}
                  className={`flex min-h-14 items-center gap-3 px-4 py-2 ${index > 0 ? "border-t" : ""}`}
                >
                  <span className="w-20 shrink-0 text-xs text-muted-foreground">
                    {formatLongDate(match.scheduledAt, timeZone)}
                  </span>
                  <span className="flex min-w-0 flex-1 items-center gap-2 text-sm">
                    <TeamDot slot={own.slot} />
                    <span className="truncate">
                      {outcomeWord(match.outcome)}{" "}
                      <span className="font-semibold tabular-nums">
                        {own.goals}–{rival.goals}
                      </span>
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                    {match.goals > 0 || match.assists > 0
                      ? [
                          match.goals ? `${match.goals} G` : null,
                          match.assists ? `${match.assists} A` : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")
                      : "—"}
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

function StripMetric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 px-3 py-3 sm:px-4">
      <dt className="truncate text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-lg font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

function groupByLetter(players: PlayerRowData[]) {
  const map = new Map<string, PlayerRowData[]>();
  for (const player of players) {
    const letter = player.displayName
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .charAt(0)
      .toLocaleUpperCase("es-AR");
    const key = /[A-Z]/.test(letter) ? letter : "#";
    map.set(key, [...(map.get(key) ?? []), player]);
  }
  return [...map.entries()];
}

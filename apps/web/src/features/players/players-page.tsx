"use client";

import { Alert, AlertDescription, AlertTitle } from "@hay-fulbo/ui/components/alert";
import { Avatar, AvatarFallback } from "@hay-fulbo/ui/components/avatar";
import { Badge } from "@hay-fulbo/ui/components/badge";
import { Button } from "@hay-fulbo/ui/components/button";
import { Card } from "@hay-fulbo/ui/components/card";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@hay-fulbo/ui/components/input-group";
import { Skeleton } from "@hay-fulbo/ui/components/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@hay-fulbo/ui/components/tabs";
import { cn } from "@hay-fulbo/ui/lib/utils";
import { useQuery } from "@tanstack/react-query";
import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  ChevronDownIcon,
  CircleAlertIcon,
  MailPlusIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  SearchXIcon,
  UserRoundIcon,
  XIcon,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useSyncExternalStore } from "react";

import { useAppContext } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { formatShortDate } from "@/lib/format";
import { initials } from "@/lib/initials";
import { accountPresentationLabel, type PlayerAccountMember } from "@/lib/player-account-link";
import { trpc } from "@/utils/trpc";

import {
  CreatePlayerDialog,
  EditPlayerDialog,
  InvitePlayerForm,
  usePlayerMutation,
} from "./player-forms";

type PlayerStats = {
  played: number;
  goals: number;
  assists: number;
  winPercentage: number;
};

type Player = {
  id: string;
  displayName: string;
  archived: boolean;
  linkedUserId: string | null;
  stats: PlayerStats;
};

type StatusFilter = "active" | "all" | "archived";
type Outcome = "win" | "draw" | "loss";

const EMPTY_STATS: PlayerStats = { played: 0, goals: 0, assists: 0, winPercentage: 0 };
const DESKTOP_QUERY = "(min-width: 64rem)";

/**
 * Players directory. The list never navigates away: on a phone a row opens in
 * place with the player's summary; on desktop the same summary sits beside the
 * list. The selected player lives in `?p=` so it survives reloads and can be shared.
 */
export function PlayersPage() {
  const { role } = useAppContext();
  const canManage = role !== "member";
  const isDesktop = useIsDesktop();
  const directory = useQuery(trpc.matches.directory.queryOptions());
  const stats = useQuery(trpc.stats.dashboard.queryOptions({}));
  const [selectedId, select] = useSelectedPlayer();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("active");
  const [createOpen, setCreateOpen] = useState(false);

  const ranking = new Map((stats.data?.ranking ?? []).map((row) => [row.playerId, row]));
  const players: Player[] = (directory.data?.players ?? []).map((player) => ({
    id: player.id,
    displayName: player.displayName,
    archived: Boolean(player.archivedAt),
    linkedUserId: player.linkedUserId,
    stats: ranking.get(player.id) ?? EMPTY_STATS,
  }));
  const members: PlayerAccountMember[] = directory.data?.members ?? [];
  const needle = normalizeSearch(search);
  const visible = players
    .filter((player) => {
      if (status === "active" && player.archived) return false;
      if (status === "archived" && !player.archived) return false;
      return needle ? normalizeSearch(player.displayName).includes(needle) : true;
    })
    .toSorted(
      (a, b) =>
        b.stats.played - a.stats.played || a.displayName.localeCompare(b.displayName, "es-AR"),
    );
  const paneId = selectedId ?? visible[0]?.id ?? null;
  const panePlayer = players.find((player) => player.id === paneId) ?? null;
  const isPending = directory.isPending || stats.isPending;
  const error = directory.error ?? stats.error;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Jugadores"
        description={
          canManage
            ? "Los que más juegan, arriba. Tocá uno para ver cómo viene."
            : "Tocá un jugador para ver cómo viene. El organizador administra el plantel."
        }
        actions={
          canManage ? (
            <>
              {role === "owner" ? (
                <Button
                  nativeButton={false}
                  render={<Link href="/dashboard/grupo#invitar" />}
                  variant="ghost"
                >
                  <MailPlusIcon data-icon="inline-start" aria-hidden="true" />
                  <span className="hidden sm:inline">Invitar amigos</span>
                  <span className="sm:hidden">Invitar</span>
                </Button>
              ) : null}
              <Button onClick={() => setCreateOpen(true)}>
                <PlusIcon data-icon="inline-start" aria-hidden="true" />
                <span className="hidden sm:inline">Nuevo jugador</span>
                <span className="sm:hidden">Agregar</span>
              </Button>
            </>
          ) : null
        }
      />
      {canManage ? <CreatePlayerDialog open={createOpen} onOpenChange={setCreateOpen} /> : null}

      {isPending ? (
        <div className="flex flex-col">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton
              key={index}
              className="h-14 w-full rounded-none first:rounded-t-md last:rounded-b-md"
            />
          ))}
        </div>
      ) : error ? (
        <Alert variant="destructive">
          <CircleAlertIcon aria-hidden="true" />
          <AlertTitle>No pudimos cargar los jugadores</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      ) : players.length === 0 ? (
        <div className="flex items-center gap-4 rounded-lg border border-dashed p-4">
          <UserRoundIcon className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <div className="flex min-w-0 flex-col gap-0.5">
            <p className="text-sm font-medium">No hay jugadores</p>
            <p className="text-sm text-muted-foreground">
              {canManage
                ? "Usá Nuevo jugador para cargar el primero."
                : "El organizador todavía no cargó jugadores."}
            </p>
          </div>
        </div>
      ) : (
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

            {visible.length === 0 ? (
              <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed p-4">
                <div className="flex items-center gap-3">
                  <SearchXIcon
                    className="size-5 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <p className="text-sm text-muted-foreground">
                    {search
                      ? "Nadie con ese nombre. Probá con un apodo."
                      : "No hay jugadores con este filtro."}
                  </p>
                </div>
                {search ? (
                  <Button variant="outline" onClick={() => setSearch("")}>
                    Limpiar búsqueda
                  </Button>
                ) : null}
              </div>
            ) : (
              <Card className="gap-0 py-0 lg:max-h-[calc(100dvh-14rem)] lg:overflow-y-auto">
                <ul>
                  {visible.map((player, index) => {
                    const expanded = !isDesktop && player.id === selectedId;
                    const current = isDesktop && player.id === paneId;
                    const detailId = `player-detail-${player.id}`;
                    return (
                      <li key={player.id} className={cn(index > 0 && "border-t")}>
                        <button
                          type="button"
                          aria-current={current ? "true" : undefined}
                          aria-controls={isDesktop ? undefined : detailId}
                          aria-expanded={isDesktop ? undefined : expanded}
                          onClick={() => select(expanded ? null : player.id)}
                          className={cn(
                            "relative flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left transition-colors duration-150 ease-out hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset active:bg-muted",
                            (expanded || current) && "bg-muted/60",
                          )}
                        >
                          <span
                            aria-hidden="true"
                            className={cn(
                              "absolute inset-y-2 left-0 w-0.5 rounded-full bg-primary opacity-0",
                              (expanded || current) && "opacity-100",
                            )}
                          />
                          <Avatar className="size-8">
                            <AvatarFallback>{initials(player.displayName)}</AvatarFallback>
                          </Avatar>
                          <span className="flex min-w-0 flex-1 items-center gap-2">
                            <span className="truncate text-sm font-medium">
                              {player.displayName}
                            </span>
                            {player.archived ? <Badge variant="secondary">Archivado</Badge> : null}
                          </span>
                          <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                            {player.stats.played === 0 ? (
                              <span aria-label="Sin partidos">—</span>
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
                          {isDesktop ? null : (
                            <ChevronDownIcon
                              aria-hidden="true"
                              className={cn(
                                "size-4 shrink-0 text-muted-foreground transition-transform duration-200 ease-out",
                                expanded && "rotate-180",
                              )}
                            />
                          )}
                        </button>
                        {expanded ? (
                          <div
                            id={detailId}
                            className="animate-in border-t bg-muted/30 px-4 py-4 duration-200 fade-in-0"
                          >
                            <PlayerDetail
                              canManage={canManage}
                              layout="inline"
                              members={members}
                              player={player}
                            />
                          </div>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </Card>
            )}
          </div>

          {isDesktop && panePlayer ? (
            <Card className="min-w-0 gap-0 px-6 py-6">
              <PlayerDetail
                key={panePlayer.id}
                canManage={canManage}
                layout="pane"
                members={members}
                player={panePlayer}
              />
            </Card>
          ) : null}
        </div>
      )}
    </div>
  );
}

function PlayerDetail({
  canManage,
  layout,
  members,
  player,
}: {
  canManage: boolean;
  layout: "inline" | "pane";
  members: readonly PlayerAccountMember[];
  player: Player;
}) {
  const pane = layout === "pane";
  const detail = useQuery(trpc.stats.player.queryOptions({ playerId: player.id, filters: {} }));
  const archive = usePlayerMutation();
  const [editOpen, setEditOpen] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [showAll, setShowAll] = useState(pane);
  const matches = detail.data?.matches ?? [];
  const formSize = pane ? 10 : 5;
  const shownMatches = showAll ? matches : matches.slice(0, 3);
  const canInvite = canManage && !player.linkedUserId;

  function toggleArchive() {
    archive.mutate({ type: "archivePlayer", playerId: player.id, archived: !player.archived });
  }

  const actions = canManage ? (
    <div className={cn("flex flex-wrap gap-2", pane && "shrink-0 gap-1")}>
      <Button variant="outline" onClick={() => setEditOpen(true)}>
        <PencilIcon data-icon="inline-start" aria-hidden="true" />
        Editar
      </Button>
      {canInvite ? (
        <Button
          variant="outline"
          aria-expanded={inviting}
          onClick={() => setInviting((value) => !value)}
        >
          <MailPlusIcon data-icon="inline-start" aria-hidden="true" />
          Invitar a la app
        </Button>
      ) : null}
      {pane ? (
        <Button
          variant="ghost"
          size="icon"
          aria-label={player.archived ? "Reactivar jugador" : "Archivar jugador"}
          disabled={archive.isPending}
          onClick={toggleArchive}
        >
          {player.archived ? (
            <ArchiveRestoreIcon aria-hidden="true" />
          ) : (
            <ArchiveIcon aria-hidden="true" />
          )}
        </Button>
      ) : (
        <Button variant="ghost" disabled={archive.isPending} onClick={toggleArchive}>
          {player.archived ? (
            <ArchiveRestoreIcon data-icon="inline-start" aria-hidden="true" />
          ) : (
            <ArchiveIcon data-icon="inline-start" aria-hidden="true" />
          )}
          {player.archived ? "Reactivar" : "Archivar"}
        </Button>
      )}
    </div>
  ) : null;

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
              {player.archived ? "Archivado · " : ""}
              {player.linkedUserId
                ? accountPresentationLabel(members, player.linkedUserId)
                : "Sin cuenta en la app"}
            </p>
          </div>
          {actions}
        </header>
      ) : null}

      {canInvite && inviting ? (
        <div className={cn(pane && "rounded-lg border p-4")}>
          <InvitePlayerForm player={player} />
        </div>
      ) : null}

      {player.stats.played === 0 ? (
        <p className="text-sm text-muted-foreground">
          Todavía no jugó un partido cerrado. Sus números aparecen después del primero.
        </p>
      ) : (
        <>
          <dl className={cn("grid grid-cols-4", pane ? "gap-4" : "gap-2")}>
            <Metric label="Partidos" value={player.stats.played} pane={pane} />
            <Metric label="Goles" value={player.stats.goals} pane={pane} />
            <Metric label="Asist." value={player.stats.assists} pane={pane} />
            <Metric
              label="% victorias"
              value={`${Math.round(player.stats.winPercentage)}%`}
              pane={pane}
            />
          </dl>
          {matches.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                Últimos {Math.min(formSize, matches.length)}, del más reciente
              </span>
              <ol className="flex flex-wrap gap-1">
                {matches.slice(0, formSize).map((match) => (
                  <li key={match.matchId}>
                    <FormChip outcome={match.outcome} />
                  </li>
                ))}
              </ol>
            </div>
          ) : null}
        </>
      )}

      {detail.isPending ? (
        <Skeleton className="h-24 w-full rounded-md" />
      ) : detail.isError ? (
        <p className="text-sm text-muted-foreground">No pudimos cargar sus partidos.</p>
      ) : matches.length > 0 ? (
        <div className="flex flex-col gap-1">
          {pane ? <h3 className="text-sm font-semibold">Partidos</h3> : null}
          <ul className="flex flex-col">
            {shownMatches.map((match, index) => {
              const own = match.teams.find((team) => team.id === match.teamId) ?? match.teams[0];
              const rival = match.teams.find((team) => team.id !== own?.id) ?? match.teams[1];
              return (
                <li key={match.matchId} className={cn(index > 0 && "border-t border-border/60")}>
                  <Link
                    href={`/dashboard/estadisticas/partidos/${match.matchId}` as Route}
                    className="-mx-2 flex min-h-11 items-center gap-3 rounded-md px-2 text-sm transition-colors duration-150 ease-out hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                  >
                    <span className="w-14 shrink-0 text-xs text-muted-foreground">
                      {formatShortDate(match.scheduledAt)}
                    </span>
                    <span
                      aria-hidden="true"
                      className={cn(
                        "size-2 shrink-0 rounded-full",
                        own?.slot === 1 ? "bg-team-blue" : "bg-team-amber",
                      )}
                    />
                    <span className="font-semibold tabular-nums">
                      {own?.goals}–{rival?.goals}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                      {outcomeVerb(match.outcome)}
                      <span className="sr-only"> con {own?.displayName}</span>
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                      {contributionLabel(match.goals, match.assists)}
                    </span>
                  </Link>
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

      {pane ? null : actions}

      {canManage ? (
        <EditPlayerDialog
          key={`${player.id}-${editOpen}`}
          members={members}
          onOpenChange={setEditOpen}
          open={editOpen}
          player={player}
        />
      ) : null}
    </div>
  );
}

function Metric({ label, value, pane }: { label: string; value: number | string; pane: boolean }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="truncate text-xs text-muted-foreground">{label}</dt>
      <dd className={cn("font-semibold tabular-nums", pane ? "text-2xl" : "text-lg")}>{value}</dd>
    </div>
  );
}

function FormChip({ outcome }: { outcome: Outcome }) {
  const label = outcome === "win" ? "Victoria" : outcome === "draw" ? "Empate" : "Derrota";
  return (
    <span
      className={cn(
        "inline-flex size-7 items-center justify-center rounded-xs text-xs font-semibold",
        outcome === "win" && "bg-success/15 text-success",
        outcome === "draw" && "bg-muted text-muted-foreground",
        outcome === "loss" && "border border-border text-foreground",
      )}
      title={label}
    >
      <span aria-hidden="true">{label[0]}</span>
      <span className="sr-only">{label}</span>
    </span>
  );
}

function SearchField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <InputGroup>
      <InputGroupAddon>
        <SearchIcon aria-hidden="true" />
      </InputGroupAddon>
      <InputGroupInput
        aria-label="Buscar jugadores"
        onChange={(event) => onChange(event.target.value)}
        placeholder="Buscar por nombre"
        type="search"
        value={value}
      />
      {value ? (
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            aria-label="Limpiar búsqueda"
            onClick={() => onChange("")}
            size="icon-xs"
          >
            <XIcon aria-hidden="true" />
          </InputGroupButton>
        </InputGroupAddon>
      ) : null}
    </InputGroup>
  );
}

function useSelectedPlayer() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const selected = searchParams.get("p");
  function select(id: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (id) params.set("p", id);
    else params.delete("p");
    const query = params.toString();
    router.replace(`${pathname}${query ? `?${query}` : ""}` as Route, { scroll: false });
  }
  return [selected, select] as const;
}

function subscribeDesktop(onChange: () => void) {
  const query = window.matchMedia(DESKTOP_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** Mobile-first: the server renders the phone layout, desktop upgrades on the client. */
function useIsDesktop() {
  return useSyncExternalStore(
    subscribeDesktop,
    () => window.matchMedia(DESKTOP_QUERY).matches,
    () => false,
  );
}

function outcomeVerb(outcome: Outcome) {
  return outcome === "win" ? "ganó" : outcome === "draw" ? "empató" : "perdió";
}

function contributionLabel(goals: number, assists: number) {
  const parts = [goals ? `${goals} G` : null, assists ? `${assists} A` : null].filter(Boolean);
  return parts.length ? parts.join(" · ") : "—";
}

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLocaleLowerCase("es-AR");
}

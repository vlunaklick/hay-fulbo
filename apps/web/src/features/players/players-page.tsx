"use client";

import { Alert, AlertDescription, AlertTitle } from "@hay-fulbo/ui/components/alert";
import { Avatar, AvatarFallback } from "@hay-fulbo/ui/components/avatar";
import { Button } from "@hay-fulbo/ui/components/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@hay-fulbo/ui/components/input-group";
import { Skeleton } from "@hay-fulbo/ui/components/skeleton";
import { cn } from "@hay-fulbo/ui/lib/utils";
import { useQuery } from "@tanstack/react-query";
import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  CircleAlertIcon,
  MailPlusIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  XIcon,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { useAppContext } from "@/components/app-shell";
import {
  DrillList,
  DrillRow,
  GroupBack,
  HeroNumber,
  NextStep,
  StatusHeader,
} from "@/components/next-step";
import { DrillDetail, NextStepLayout, useIsDesktop } from "@/components/next-step-layout";
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

type Outcome = "win" | "draw" | "loss";

const EMPTY_STATS: PlayerStats = { played: 0, goals: 0, assists: 0, winPercentage: 0 };
/** Above this many active players a compact search shows up over the list. */
const SEARCH_THRESHOLD = 12;
/** `?p=` value that opens the archived list instead of a player. */
const ARCHIVED_KEY = "archivados";

/**
 * Players directory, "Próximo paso" shape: header → active count → one next step
 * (invite the unlinked or add a player) → one row per player, most played first.
 * Each row opens the player's detail (bottom sheet on mobile, right column on desktop);
 * the open thing lives in `?p=` (a player id or `archivados`) so it survives reloads and
 * can be shared. On desktop the most played player is open by default.
 */
export function PlayersPage() {
  const { role } = useAppContext();
  const canManage = role !== "member";
  const isOwner = role === "owner";
  const isDesktop = useIsDesktop();
  const directory = useQuery(trpc.matches.directory.queryOptions());
  const stats = useQuery(trpc.stats.dashboard.queryOptions({}));
  const [openKey, select] = useOpenKey();
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [inviteFor, setInviteFor] = useState<string | null>(null);

  const ranking = new Map((stats.data?.ranking ?? []).map((row) => [row.playerId, row]));
  const players: Player[] = (directory.data?.players ?? [])
    .map((player) => ({
      id: player.id,
      displayName: player.displayName,
      archived: Boolean(player.archivedAt),
      linkedUserId: player.linkedUserId,
      stats: ranking.get(player.id) ?? EMPTY_STATS,
    }))
    .toSorted(
      (a, b) =>
        b.stats.played - a.stats.played || a.displayName.localeCompare(b.displayName, "es-AR"),
    );
  const members: PlayerAccountMember[] = directory.data?.members ?? [];
  const active = players.filter((player) => !player.archived);
  const archived = players.filter((player) => player.archived);
  const unlinked = active.filter((player) => !player.linkedUserId);
  const needle = normalizeSearch(search);
  const visible = needle
    ? active.filter((player) => normalizeSearch(player.displayName).includes(needle))
    : active;
  const isPending = directory.isPending || stats.isPending;
  const error = directory.error ?? stats.error;
  const inviteNext = isOwner && unlinked.length > 0 ? unlinked[0] : null;
  // One detail at a time: either the archived list or a player. On desktop, fall back
  // to the most played player so the right column is never empty.
  const archivedOpen = openKey === ARCHIVED_KEY && archived.length > 0;
  const selected = archivedOpen
    ? null
    : (players.find((player) => player.id === openKey) ??
      (isDesktop && !isPending && !error ? (active[0] ?? null) : null));

  function openPlayer(id: string | null, invite = false) {
    setInviteFor(invite ? id : null);
    select(id);
  }

  return (
    <NextStepLayout
      emptyDetail={isPending || error ? undefined : "Cuando sumes jugadores, acá ves sus números."}
    >
      <StatusHeader back={<GroupBack />} title="Jugadores" meta="Los que más juegan, arriba" />
      {canManage ? <CreatePlayerDialog open={createOpen} onOpenChange={setCreateOpen} /> : null}

      {isPending ? (
        <div className="flex flex-col gap-4" aria-busy="true">
          <Skeleton className="mx-auto h-16 w-40 rounded-md" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <div className="flex flex-col gap-1">
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} className="h-12 w-full rounded-md" />
            ))}
          </div>
        </div>
      ) : error ? (
        <Alert variant="destructive">
          <CircleAlertIcon aria-hidden="true" />
          <AlertTitle>No pudimos cargar los jugadores</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      ) : (
        <>
          {active.length > 0 ? (
            <HeroNumber
              caption={
                archived.length > 0
                  ? `${archived.length} ${archived.length === 1 ? "archivado" : "archivados"}`
                  : undefined
              }
            >
              {active.length}{" "}
              <span className="text-2xl font-bold">
                {active.length === 1 ? "jugador" : "jugadores"}
              </span>
            </HeroNumber>
          ) : null}

          {!canManage ? (
            active.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                El organizador todavía no cargó ningún jugador.
              </p>
            ) : null
          ) : active.length === 0 ? (
            <NextStep
              kicker={archived.length > 0 ? "No hay jugadores activos" : "Todavía no hay nadie"}
              title="Cargá el primer jugador"
              action={
                <Button onClick={() => setCreateOpen(true)}>
                  <PlusIcon data-icon="inline-start" aria-hidden="true" />
                  Sumar jugador
                </Button>
              }
            >
              Con el plantel cargado ya podés armar partidos.
            </NextStep>
          ) : inviteNext ? (
            <NextStep
              kicker={`${unlinked.length} sin vincular`}
              title="Invitalos a la app"
              action={
                <Button onClick={() => openPlayer(inviteNext.id, true)}>
                  <MailPlusIcon data-icon="inline-start" aria-hidden="true" />
                  Invitar a {inviteNext.displayName}
                </Button>
              }
            >
              Con cuenta se anotan solos y ven sus números.
            </NextStep>
          ) : (
            <NextStep
              title="¿Viene alguien nuevo?"
              action={
                <Button onClick={() => setCreateOpen(true)}>
                  <PlusIcon data-icon="inline-start" aria-hidden="true" />
                  Sumar jugador
                </Button>
              }
            />
          )}

          {active.length > 0 ? (
            <div className="flex flex-col gap-3">
              {active.length > SEARCH_THRESHOLD ? (
                <SearchField value={search} onChange={setSearch} />
              ) : null}
              {visible.length === 0 ? (
                <div className="flex flex-col items-start gap-2">
                  <p className="text-sm text-muted-foreground">
                    Nadie con ese nombre. Probá con un apodo.
                  </p>
                  <Button variant="outline" onClick={() => setSearch("")}>
                    Limpiar búsqueda
                  </Button>
                </div>
              ) : (
                <DrillList title="Plantel">
                  {visible.map((player) => (
                    <DrillRow
                      key={player.id}
                      label={player.displayName}
                      leading={<PlayerAvatar name={player.displayName} />}
                      value={<PlayerTotals stats={player.stats} />}
                      selected={player.id === selected?.id}
                      onClick={() => openPlayer(player.id)}
                    />
                  ))}
                </DrillList>
              )}
            </div>
          ) : null}

          {(canManage && inviteNext) || isOwner || archived.length > 0 ? (
            <DrillList title="Más">
              {canManage && inviteNext ? (
                <DrillRow label="Sumar jugador" onClick={() => setCreateOpen(true)} />
              ) : null}
              {isOwner ? (
                <DrillRow
                  label="Invitar amigos al grupo"
                  render={({ className, children }) => (
                    <Link href="/dashboard/grupo?tema=invitar" className={className}>
                      {children}
                    </Link>
                  )}
                />
              ) : null}
              {archived.length > 0 ? (
                <DrillRow
                  label="Archivados"
                  value={archived.length}
                  selected={archivedOpen}
                  onClick={() => openPlayer(ARCHIVED_KEY)}
                />
              ) : null}
            </DrillList>
          ) : null}
        </>
      )}

      <DrillDetail
        description="No aparecen al armar partidos. Sus números quedan."
        onOpenChange={(next) => (next ? null : openPlayer(null))}
        open={archivedOpen}
        title="Archivados"
      >
        <ul className="flex flex-col divide-y">
          {archived.map((player) => (
            <ArchivedRow
              key={player.id}
              canManage={canManage}
              player={player}
              onOpen={() => openPlayer(player.id)}
            />
          ))}
        </ul>
      </DrillDetail>

      <DrillDetail
        description={
          selected
            ? `${selected.archived ? "Archivado · " : ""}${
                selected.linkedUserId
                  ? accountPresentationLabel(members, selected.linkedUserId)
                  : "Sin cuenta en la app"
              }`
            : undefined
        }
        onOpenChange={(next) => (next ? null : openPlayer(null))}
        open={selected !== null}
        title={selected?.displayName ?? "Jugador"}
      >
        {selected ? (
          <PlayerDetail
            key={selected.id}
            canManage={canManage}
            initialInviting={inviteFor === selected.id}
            members={members}
            player={selected}
          />
        ) : null}
      </DrillDetail>
    </NextStepLayout>
  );
}

function PlayerAvatar({ name }: { name: string }) {
  return (
    <Avatar aria-hidden="true" className="size-8">
      <AvatarFallback>{initials(name)}</AvatarFallback>
    </Avatar>
  );
}

function PlayerTotals({ stats }: { stats: PlayerStats }) {
  if (stats.played === 0) return <span aria-label="Sin partidos">—</span>;
  return (
    <>
      <span className="font-semibold text-foreground">{stats.goals}</span> G ·{" "}
      <span className="font-semibold text-foreground">{stats.assists}</span> A
    </>
  );
}

function ArchivedRow({
  canManage,
  onOpen,
  player,
}: {
  canManage: boolean;
  onOpen: () => void;
  player: Player;
}) {
  const restore = usePlayerMutation();
  return (
    <li className="flex items-center gap-2">
      <button
        type="button"
        onClick={onOpen}
        className="flex min-h-12 min-w-0 flex-1 items-center gap-3 text-left outline-none transition-colors duration-100 hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <PlayerAvatar name={player.displayName} />
        <span className="min-w-0 flex-1 truncate text-sm font-semibold">{player.displayName}</span>
        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
          <PlayerTotals stats={player.stats} />
        </span>
      </button>
      {canManage ? (
        <Button
          variant="ghost"
          aria-label={`Reactivar a ${player.displayName}`}
          disabled={restore.isPending}
          onClick={() =>
            restore.mutate({ type: "archivePlayer", playerId: player.id, archived: false })
          }
        >
          <ArchiveRestoreIcon data-icon="inline-start" aria-hidden="true" />
          Reactivar
        </Button>
      ) : null}
    </li>
  );
}

function PlayerDetail({
  canManage,
  initialInviting,
  members,
  player,
}: {
  canManage: boolean;
  initialInviting: boolean;
  members: readonly PlayerAccountMember[];
  player: Player;
}) {
  const detail = useQuery(trpc.stats.player.queryOptions({ playerId: player.id, filters: {} }));
  const archive = usePlayerMutation();
  const [editOpen, setEditOpen] = useState(false);
  const canInvite = canManage && !player.linkedUserId;
  const [inviting, setInviting] = useState(initialInviting && canInvite);
  const [showAll, setShowAll] = useState(false);
  const matches = detail.data?.matches ?? [];
  const formSize = 5;
  const shownMatches = showAll ? matches : matches.slice(0, 3);

  return (
    <div className="flex flex-col gap-6">
      {canInvite && inviting ? <InvitePlayerForm player={player} /> : null}

      {player.stats.played === 0 ? (
        <p className="text-sm text-muted-foreground">
          Todavía no jugó un partido cerrado. Sus números aparecen después del primero.
        </p>
      ) : (
        <>
          <dl className="grid grid-cols-4 gap-2">
            <Metric label="Partidos" value={player.stats.played} />
            <Metric label="Goles" value={player.stats.goals} />
            <Metric label="Asist." value={player.stats.assists} />
            <Metric label="% victorias" value={`${Math.round(player.stats.winPercentage)}%`} />
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
          <h3 className="text-sm font-semibold">Partidos</h3>
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
      {canManage ? (
        // Manager actions: first on desktop (next to the title), last on mobile (thumb reach).
        <div className="order-last flex flex-row flex-wrap gap-2 pb-[env(safe-area-inset-bottom)] lg:order-first lg:pb-0">
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
          <Button
            variant="ghost"
            className="sm:ml-auto"
            disabled={archive.isPending}
            onClick={() =>
              archive.mutate({
                type: "archivePlayer",
                playerId: player.id,
                archived: !player.archived,
              })
            }
          >
            {player.archived ? (
              <ArchiveRestoreIcon data-icon="inline-start" aria-hidden="true" />
            ) : (
              <ArchiveIcon data-icon="inline-start" aria-hidden="true" />
            )}
            {player.archived ? "Reactivar" : "Archivar"}
          </Button>
          <EditPlayerDialog
            key={`${player.id}-${editOpen}`}
            members={members}
            onOpenChange={setEditOpen}
            open={editOpen}
            player={player}
          />
        </div>
      ) : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="truncate text-xs text-muted-foreground">{label}</dt>
      <dd className="text-lg font-semibold tabular-nums">{value}</dd>
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

function useOpenKey() {
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

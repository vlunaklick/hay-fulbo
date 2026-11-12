"use client";

import type { AppRouter } from "@hay-fulbo/api/routers/index";
import { Alert, AlertDescription, AlertTitle } from "@hay-fulbo/ui/components/alert";
import { Badge } from "@hay-fulbo/ui/components/badge";
import { Button } from "@hay-fulbo/ui/components/button";
import { Card, CardContent } from "@hay-fulbo/ui/components/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@hay-fulbo/ui/components/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@hay-fulbo/ui/components/dropdown-menu";
import { Field, FieldLabel } from "@hay-fulbo/ui/components/field";
import { Input } from "@hay-fulbo/ui/components/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hay-fulbo/ui/components/select";
import { Skeleton } from "@hay-fulbo/ui/components/skeleton";
import { Spinner } from "@hay-fulbo/ui/components/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@hay-fulbo/ui/components/tabs";
import { cn } from "@hay-fulbo/ui/lib/utils";
import { useQuery } from "@tanstack/react-query";
import type { inferRouterOutputs } from "@trpc/server";
import {
  ArrowLeftIcon,
  BanIcon,
  CalendarClockIcon,
  CheckIcon,
  CircleAlertIcon,
  LockKeyholeIcon,
  MapPinIcon,
  Maximize2Icon,
  MinusIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  RotateCcwIcon,
  UserXIcon,
  WalletIcon,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import type { ReactNode } from "react";

import { useAppContext } from "@/components/app-shell";
import { MatchParityCard } from "@/components/match-parity-card";
import { MatchRatings } from "@/components/match-ratings";
import { MatchResultCard } from "@/components/match-result-card";
import {
  MatchScoreboard,
  useMatchCommand,
  type RunMatchAction,
} from "@/components/match-scoreboard";
import { MatchShareRow } from "@/components/match-share-row";
import { isTerminalReadError, matchReadErrorMessage } from "@/lib/match-command-error";
import { formatDate, formatMoney, toMinor } from "@/lib/format";
import { trpc } from "@/utils/trpc";

type Outputs = inferRouterOutputs<AppRouter>;
type Detail = Outputs["matches"]["detail"];
type Directory = Outputs["matches"]["directory"];
type Appearance = Detail["teams"][number]["appearances"][number];
type PaymentSubject = Pick<
  Appearance,
  "playerId" | "playerDisplayName" | "expectedMinor" | "paidMinor" | "contributionStatus"
>;
/** Where the match is in its life: drives the hero, the tabs and the one primary action. */
type Phase = "upcoming" | "live" | "closed" | "cancelled";
type Tab = "planilla" | "equipos" | "caja" | "notas";

const issueText = {
  match_not_started: "La hora del partido todavía no pasó.",
  court_required: "Falta elegir una cancha.",
  court_cost_required: "Falta el precio total de la cancha.",
  invalid_team_slots: "Los dos equipos no están completos.",
  team_without_players: "Cada equipo necesita al menos un jugador.",
  negative_sporting_total: "Goles y asistencias deben ser positivos.",
  assists_exceed_attributed_goals: "Hay más asistencias que goles atribuidos.",
  expected_total_mismatch: "El reparto no coincide con el total de la cancha.",
} as const;

const phaseLabel = {
  upcoming: "Por jugar",
  live: "En juego",
  closed: "Cerrado",
  cancelled: "Cancelado",
} as const satisfies Record<Phase, string>;

const tabsByPhase = {
  upcoming: ["equipos", "caja"],
  live: ["planilla", "equipos", "caja"],
  closed: ["notas", "planilla", "caja"],
  cancelled: ["equipos"],
} as const satisfies Record<Phase, readonly Tab[]>;

const tabLabel = {
  planilla: "Planilla",
  equipos: "Equipos",
  caja: "Caja",
  notas: "Notas",
} as const satisfies Record<Tab, string>;

export default function MatchPage() {
  const { matchId } = useParams<{ matchId: string }>();
  const detail = useQuery({
    ...trpc.matches.detail.queryOptions({ matchId }),
    refetchInterval: (query) => (query.state.data?.status === "open" ? 5000 : false),
  });
  const directory = useQuery(trpc.matches.directory.queryOptions());

  if (detail.isPending || directory.isPending) {
    return (
      <div className="flex flex-col gap-5">
        <Skeleton className="h-11 w-28" />
        <Skeleton className="h-52 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }
  const readError = detail.error ?? directory.error;
  if (!detail.data || !directory.data || isTerminalReadError(readError)) {
    return (
      <Alert variant="destructive">
        <CircleAlertIcon aria-hidden="true" />
        <AlertTitle>No pudimos abrir el partido</AlertTitle>
        <AlertDescription>{matchReadErrorMessage(readError)}</AlertDescription>
      </Alert>
    );
  }

  // A failed background poll keeps the cached workspace (and any open drafts) mounted.
  return (
    <>
      {readError ? (
        <Alert role="status">
          <CircleAlertIcon aria-hidden="true" />
          <AlertTitle>No pudimos actualizar el partido</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center gap-3">
            {matchReadErrorMessage(readError)}
            <Button
              onClick={() => {
                void detail.refetch();
                void directory.refetch();
              }}
              size="sm"
              variant="outline"
            >
              Reintentar
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}
      <MatchWorkspace key={detail.data.id} detail={detail.data} directory={directory.data} />
    </>
  );
}

// The score is the anchor of the page: it sits on the first screen in every state (and follows
// you down on the phone); rosters, the sheet, the money and the ratings live in tabs under it.
function MatchWorkspace({ detail, directory }: { detail: Detail; directory: Directory }) {
  const { groupName, role, user } = useAppContext();
  const manager = detail.organizerUserId === user.id || role !== "member";
  const isOpen = detail.status === "open";
  const editable = isOpen && manager;
  const phase = phaseOf(detail);
  const { run, pending } = useMatchCommand(detail);
  const canScore = isOpen && (manager || detail.scorekeeperUserId === user.id);
  const court = directory.courts.find((item) => item.id === detail.courtId) ?? null;
  const [left, right] = detail.teams;
  const leftName = left?.displayName ?? "Equipo 1";
  const rightName = right?.displayName ?? "Equipo 2";
  const showClosingBar = editable && phase === "live";
  const [heroVisible, setHeroVisible] = useState(true);
  const heroRef = useCallback((node: HTMLElement | null) => {
    if (!node) return;
    // The mobile header is h-14 plus its bottom border.
    const observer = new IntersectionObserver(
      ([entry]) => setHeroVisible(entry?.isIntersecting ?? true),
      { rootMargin: "-57px 0px 0px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  const tabs = tabsByPhase[phase];

  return (
    <div className={cn("flex flex-col gap-5", showClosingBar && "pb-20 md:pb-0")}>
      {phase === "live" || phase === "closed" ? (
        <CompactScore
          visible={!heroVisible}
          left={{ name: leftName, goals: scoreFor(detail, left?.id) }}
          right={{ name: rightName, goals: scoreFor(detail, right?.id) }}
        />
      ) : null}

      <MatchHeader
        courts={directory.courts}
        detail={detail}
        editable={editable}
        pending={pending}
        run={run}
        share={
          isOpen ? (
            <MatchShareRow
              court={court}
              detail={detail}
              groupName={groupName}
              variant={phase === "upcoming" && manager ? "default" : "outline"}
            />
          ) : null
        }
        onCancelMatch={
          editable ? () => run({ type: "cancelMatch", matchId: detail.id }) : undefined
        }
        onRestore={
          detail.status === "cancelled" && manager
            ? () => run({ type: "restoreMatch", matchId: detail.id })
            : undefined
        }
        onReopen={
          detail.status === "closed" && manager
            ? () => run({ type: "reopenMatch", matchId: detail.id })
            : undefined
        }
      />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:items-start lg:gap-8">
        <section
          aria-label="Marcador"
          ref={heroRef}
          className="flex flex-col gap-3 lg:sticky lg:top-8"
        >
          <h1 className="sr-only">
            {leftName} vs {rightName}
          </h1>
          <MatchMeta detail={detail} phase={phase} courtName={court?.name ?? null} />

          {phase === "live" ? (
            <MatchScoreboard
              detail={detail}
              canScore={canScore}
              pending={pending}
              run={run}
              actions={
                <>
                  {editable ? (
                    <ScorekeeperSelect
                      detail={detail}
                      directory={directory}
                      pending={pending}
                      run={run}
                    />
                  ) : null}
                  <Button
                    render={<Link href={`/dashboard/partidos/${detail.id}/cancha` as Route} />}
                    nativeButton={false}
                    size="sm"
                    variant={canScore ? "secondary" : "outline"}
                  >
                    <Maximize2Icon data-icon="inline-start" aria-hidden="true" />
                    Modo cancha
                  </Button>
                </>
              }
            />
          ) : phase === "closed" ? (
            <MatchResultCard
              dateLabel={formatDate(detail.scheduledAt)}
              groupName={groupName}
              left={{ goals: scoreFor(detail, left?.id), name: leftName }}
              matchId={detail.id}
              right={{ goals: scoreFor(detail, right?.id), name: rightName }}
            />
          ) : (
            <Lineup detail={detail}>
              {phase === "upcoming" ? (
                <div className="flex flex-col gap-3 border-t px-4 py-4">
                  <h2 className="text-xs font-medium text-muted-foreground">Cómo llegan</h2>
                  <MatchParityCard matchId={detail.id} />
                </div>
              ) : (
                <p className="border-t px-4 py-3 text-sm text-muted-foreground">
                  Partido cancelado. No aporta resultados ni deuda.
                </p>
              )}
            </Lineup>
          )}

          {showClosingBar ? (
            <ClosingBar
              issues={closureIssues(detail)}
              pending={pending}
              onClose={() => run({ type: "closeMatch", matchId: detail.id })}
            />
          ) : null}
        </section>

        <Tabs key={phase} defaultValue={tabs[0]} className="gap-4">
          <TabsList className="w-full">
            {tabs.map((tab) => (
              <TabsTrigger key={tab} value={tab}>
                {tabLabel[tab]}
                {tab === "caja" ? <CashCount detail={detail} /> : null}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value="equipos" className="text-sm">
            <RosterGrid
              detail={detail}
              directory={directory}
              editable={editable}
              pending={pending}
              run={run}
            />
          </TabsContent>
          <TabsContent value="planilla" className="text-sm">
            {phase === "closed" ? (
              <ReadOnlyStats detail={detail} />
            ) : (
              <Planilla detail={detail} editable={editable} pending={pending} run={run} />
            )}
          </TabsContent>
          <TabsContent value="caja" className="text-sm">
            <Caja
              detail={detail}
              editable={manager && detail.status !== "cancelled"}
              pending={pending}
              run={run}
            />
          </TabsContent>
          <TabsContent value="notas" className="text-sm">
            <MatchRatings matchId={detail.id} teams={detail.teams} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function phaseOf(detail: Detail): Phase {
  if (detail.status === "closed") return "closed";
  if (detail.status === "cancelled") return "cancelled";
  return new Date(detail.scheduledAt).getTime() > Date.now() ? "upcoming" : "live";
}

function TeamDot({ slot }: { slot: number }) {
  return (
    <span
      className={cn("size-2 shrink-0 rounded-full", slot === 1 ? "bg-team-blue" : "bg-team-amber")}
      aria-hidden="true"
    />
  );
}

function MatchMeta({
  courtName,
  detail,
  phase,
}: {
  courtName: string | null;
  detail: Detail;
  phase: Phase;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
      <Badge
        variant={phase === "cancelled" ? "destructive" : phase === "live" ? "default" : "secondary"}
      >
        {phaseLabel[phase]}
      </Badge>
      <span className="flex items-center gap-1.5">
        <CalendarClockIcon className="size-3.5 shrink-0" aria-hidden="true" />
        {formatDate(detail.scheduledAt)}
      </span>
      <span className="flex min-w-0 items-center gap-1.5">
        <MapPinIcon className="size-3.5 shrink-0" aria-hidden="true" />
        <span className="truncate">{courtName ?? "Cancha a definir"}</span>
      </span>
      {detail.courtCostMinor !== null ? (
        <span className="tabular-nums">{formatMoney(detail.courtCostMinor)}</span>
      ) : null}
    </div>
  );
}

/** Who plays, before there is a score to show (or when there will never be one). */
function Lineup({ children, detail }: { children: ReactNode; detail: Detail }) {
  return (
    <Card className="gap-0 py-0">
      <div className="grid grid-cols-2 divide-x">
        {detail.teams.map((team) => (
          <div key={team.id} className="flex min-w-0 flex-col items-center gap-2 px-3 py-5">
            <h2 className="flex max-w-full items-center gap-2 text-sm font-semibold">
              <TeamDot slot={team.slot} />
              <span className="truncate">{team.displayName}</span>
            </h2>
            <p className="text-sm text-muted-foreground tabular-nums">
              {team.appearances.length === 1 ? "1 anotado" : `${team.appearances.length} anotados`}
            </p>
          </div>
        ))}
      </div>
      {children}
    </Card>
  );
}

/** Slim score pinned under the mobile header once the big one scrolls away. */
function CompactScore({
  left,
  right,
  visible,
}: {
  left: { name: string; goals: number };
  right: { name: string; goals: number };
  visible: boolean;
}) {
  return (
    <div
      aria-hidden="true"
      inert={!visible}
      className={cn(
        "fixed inset-x-0 top-[calc(3.5rem+1px)] z-10 border-b bg-background transition-[opacity,translate] duration-150 ease-out motion-reduce:transition-none md:hidden",
        visible ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-2 opacity-0",
      )}
    >
      <div className="grid h-12 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 px-4 text-sm font-semibold">
        <span className="flex min-w-0 items-center justify-end gap-2">
          <span className="truncate">{left.name}</span>
          <TeamDot slot={1} />
        </span>
        <span className="text-lg font-black tabular-nums">
          {left.goals} – {right.goals}
        </span>
        <span className="flex min-w-0 items-center gap-2">
          <TeamDot slot={2} />
          <span className="truncate">{right.name}</span>
        </span>
      </div>
    </div>
  );
}

function ScorekeeperSelect({
  detail,
  directory,
  pending,
  run,
}: {
  detail: Detail;
  directory: Directory;
  pending: boolean;
  run: RunMatchAction;
}) {
  const items: Array<{ label: string; value: string | null }> = [
    { label: "Sin planillero", value: null },
    ...directory.members.map((member) => ({ label: member.name, value: member.id })),
  ];
  return (
    <Select
      items={items}
      value={detail.scorekeeperUserId ?? null}
      disabled={pending}
      onValueChange={(value) => {
        void run({ type: "setScorekeeper", matchId: detail.id, scorekeeperUserId: value });
      }}
    >
      <SelectTrigger aria-label="Planillero" size="sm" className="w-40">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {items.map((item) => (
            <SelectItem key={item.value ?? "none"} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

function MatchHeader({
  courts,
  detail,
  editable,
  onCancelMatch,
  onReopen,
  onRestore,
  pending,
  run,
  share,
}: {
  courts: Directory["courts"];
  detail: Detail;
  editable: boolean;
  onCancelMatch?: () => void;
  onReopen?: () => void;
  onRestore?: () => void;
  pending: boolean;
  run: RunMatchAction;
  share: ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const [expectedLockVersion, setExpectedLockVersion] = useState(detail.lockVersion);
  const localDate = toLocalInputValue(detail.scheduledAt);
  const [scheduledAt, setScheduledAt] = useState(localDate);
  const [courtId, setCourtId] = useState<string | null>(detail.courtId);
  const [cost, setCost] = useState(
    detail.courtCostMinor === null ? "" : String(Number(detail.courtCostMinor) / 100),
  );

  async function save() {
    const courtCostMinor = cost.trim() ? toMinor(cost) : null;
    const saved = await run(
      {
        type: "updateMatch",
        matchId: detail.id,
        ...(scheduledAt !== localDate ? { scheduledAt: new Date(scheduledAt) } : {}),
        ...(courtId !== detail.courtId ? { courtId } : {}),
        ...(() => {
          const next = cost.trim() ? courtCostMinor : null;
          return next !== detail.courtCostMinor ? { courtCostMinor: next } : {};
        })(),
      },
      { expectedLockVersion, onConflict: setExpectedLockVersion },
    );
    if (saved) setEditing(false);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 text-muted-foreground"
          render={<Link href="/dashboard/partidos" />}
          nativeButton={false}
        >
          <ArrowLeftIcon data-icon="inline-start" aria-hidden="true" />
          Partidos
        </Button>
        <div className="flex min-w-0 items-center gap-1">
          {share}
          {editable ? (
            <Button
              aria-expanded={editing}
              onClick={() => {
                if (!editing) {
                  setExpectedLockVersion(detail.lockVersion);
                  setScheduledAt(toLocalInputValue(detail.scheduledAt));
                  setCourtId(detail.courtId);
                  setCost(
                    detail.courtCostMinor === null
                      ? ""
                      : String(Number(detail.courtCostMinor) / 100),
                  );
                }
                setEditing((current) => !current);
              }}
              size="sm"
              variant="outline"
            >
              <PencilIcon data-icon="inline-start" aria-hidden="true" />
              <span className="max-sm:sr-only">{editing ? "Cerrar edición" : "Editar datos"}</span>
            </Button>
          ) : null}
          {onReopen ? (
            <Button onClick={onReopen} size="sm" variant="outline">
              <RotateCcwIcon data-icon="inline-start" aria-hidden="true" />
              Reabrir partido
            </Button>
          ) : null}
          {onRestore ? (
            <Button onClick={onRestore} size="sm" variant="outline">
              <RotateCcwIcon data-icon="inline-start" aria-hidden="true" />
              Restaurar partido
            </Button>
          ) : null}
          {onCancelMatch ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    aria-label="Más acciones del partido"
                    disabled={pending}
                    size="icon"
                    variant="ghost"
                  />
                }
              >
                <MoreHorizontalIcon aria-hidden="true" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem variant="destructive" onClick={onCancelMatch}>
                  <BanIcon aria-hidden="true" />
                  Cancelar partido
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      </div>

      {editing ? (
        <Card>
          <CardContent>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                save();
              }}
              className="grid gap-4 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end"
            >
              <Field>
                <FieldLabel htmlFor="match-date">Fecha y hora</FieldLabel>
                <Input
                  id="match-date"
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(event) => setScheduledAt(event.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="match-court">Cancha</FieldLabel>
                <Select
                  items={courtItemsFor(courts, detail.courtId)}
                  value={courtId}
                  onValueChange={setCourtId}
                >
                  <SelectTrigger id="match-court" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {courtItemsFor(courts, detail.courtId).map((item) => (
                        <SelectItem key={item.value ?? "no-court"} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="match-cost">Precio total</FieldLabel>
                <Input
                  id="match-cost"
                  inputMode="decimal"
                  placeholder="Ej. 48000"
                  value={cost}
                  onChange={(event) => setCost(event.target.value)}
                />
              </Field>
              <Button disabled={pending} type="submit">
                {pending ? (
                  <Spinner data-icon="inline-start" />
                ) : (
                  <CheckIcon data-icon="inline-start" aria-hidden="true" />
                )}
                Guardar datos
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
function TeamNameEditor({
  editable,
  detail,
  pending,
  run,
  team,
}: {
  editable: boolean;
  detail: Detail;
  pending: boolean;
  run: RunMatchAction;
  team: Detail["teams"][number];
}) {
  const [editing, setEditing] = useState(false);
  const [expectedLockVersion, setExpectedLockVersion] = useState(detail.lockVersion);
  const [name, setName] = useState(team.displayName);

  if (!editable) {
    return <span>{team.displayName}</span>;
  }
  if (!editing) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="min-w-0 justify-start px-1"
        onClick={() => {
          setName(team.displayName);
          setExpectedLockVersion(detail.lockVersion);
          setEditing(true);
        }}
      >
        <span className="truncate">{team.displayName}</span>
        <PencilIcon data-icon="inline-end" aria-hidden="true" />
      </Button>
    );
  }
  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        if (!name.trim()) return;
        if (name.trim() === team.displayName) {
          setEditing(false);
          return;
        }
        if (
          await run(
            {
              type: "renameTeam",
              matchId: detail.id,
              teamId: team.id,
              displayName: name,
            },
            { expectedLockVersion, onConflict: setExpectedLockVersion },
          )
        )
          setEditing(false);
      }}
      className="flex items-center gap-1"
    >
      <Input
        autoFocus
        aria-label="Nombre del equipo"
        className="min-h-11 w-32 px-2 py-0 text-sm"
        value={name}
        onBlur={(event) => {
          if (event.target.value.trim() && event.target.value !== team.displayName) return;
          setEditing(false);
        }}
        onChange={(event) => setName(event.target.value)}
      />
      <Button aria-label="Guardar nombre" disabled={pending} size="icon" type="submit">
        <CheckIcon aria-hidden="true" />
      </Button>
    </form>
  );
}

function RosterGrid({
  detail,
  directory,
  editable,
  pending,
  run,
}: {
  detail: Detail;
  directory: Directory;
  editable: boolean;
  pending: boolean;
  run: RunMatchAction;
}) {
  const assigned = new Set(
    detail.teams.flatMap((team) => team.appearances.map((row) => row.playerId)),
  );
  const absent = new Set(detail.absences.map((row) => row.playerId));
  const available = directory.players.filter(
    (player) => !player.archivedAt && !assigned.has(player.id) && !absent.has(player.id),
  );

  if (!editable && detail.teams.every((team) => team.appearances.length === 0)) {
    return (
      <p className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
        Todavía no hay anotados
      </p>
    );
  }

  return (
    <Card className="gap-0 py-0">
      <div className="grid divide-y lg:grid-cols-2 lg:divide-x lg:divide-y-0">
        {detail.teams.map((team) => (
          <TeamRoster
            key={team.id}
            available={available}
            detail={detail}
            editable={editable}
            pending={pending}
            run={run}
            team={team}
          />
        ))}
      </div>
      {detail.absences.length > 0 ? (
        <AbsencesList detail={detail} editable={editable} pending={pending} run={run} />
      ) : null}
    </Card>
  );
}

function AbsencesList({
  detail,
  editable,
  pending,
  run,
}: {
  detail: Detail;
  editable: boolean;
  pending: boolean;
  run: RunMatchAction;
}) {
  return (
    <div className="flex flex-col border-t px-4 pt-3 pb-1">
      <h3 className="text-xs font-medium text-muted-foreground">
        Dijeron que venían y no vinieron
      </h3>
      <ul className="flex flex-col divide-y">
        {detail.absences.map((absence) => (
          <li
            key={absence.playerId}
            className="flex min-h-12 flex-wrap items-center justify-between gap-x-3 gap-y-1 py-1"
          >
            <span className="flex min-w-0 items-center gap-2 text-sm">
              <UserXIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span className="truncate">{absence.playerDisplayName}</span>
              {absence.owesContribution ? (
                <Badge variant="secondary">Ausente · aporta</Badge>
              ) : null}
            </span>
            {editable ? (
              <span className="flex min-w-0 flex-wrap items-center gap-1">
                {absence.owesContribution && detail.courtCostMinor !== null ? (
                  <PaymentCell
                    appearance={absence}
                    detail={detail}
                    editable
                    pending={pending}
                    run={run}
                  />
                ) : null}
                <Button
                  aria-label={`Quitar la marca de ausente de ${absence.playerDisplayName}`}
                  disabled={pending}
                  onClick={() =>
                    run({
                      type: "removeAbsence",
                      matchId: detail.id,
                      playerId: absence.playerId,
                    })
                  }
                  size="sm"
                  variant="ghost"
                >
                  Vino al final
                </Button>
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

function TeamRoster({
  available,
  detail,
  editable,
  pending,
  run,
  team,
}: {
  available: Directory["players"];
  detail: Detail;
  editable: boolean;
  pending: boolean;
  run: RunMatchAction;
  team: Detail["teams"][number];
}) {
  const count = team.appearances.length;
  return (
    <div className="flex min-w-0 flex-col px-4 py-3">
      <div className="flex min-h-11 items-center justify-between gap-2">
        <h3 className="flex min-w-0 items-center gap-2 text-sm font-semibold">
          <TeamDot slot={team.slot} />
          <TeamNameEditor
            editable={editable}
            detail={detail}
            pending={pending}
            run={run}
            team={team}
          />
        </h3>
        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
          {count === 1 ? "1 jugador" : `${count} jugadores`}
        </span>
      </div>

      {count === 0 ? (
        <p className="border-t py-3 text-sm text-muted-foreground">Sin jugadores todavía.</p>
      ) : (
        <ul className="flex flex-col divide-y border-t">
          {team.appearances.map((appearance) => (
            <li
              key={appearance.playerId}
              className="flex min-h-11 items-center justify-between gap-2"
            >
              <span className="truncate text-sm">{appearance.playerDisplayName}</span>
              {editable ? (
                <RosterActions
                  detail={detail}
                  pending={pending}
                  appearance={appearance}
                  run={run}
                />
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {editable ? (
        <div className="flex flex-col gap-2 border-t pt-3 pb-1">
          {available.length > 0 ? (
            <div className="-m-1 flex max-h-32 flex-wrap content-start gap-1.5 overflow-y-auto p-1">
              {available.map((player) => (
                <Button
                  key={player.id}
                  disabled={pending}
                  size="xs"
                  variant="secondary"
                  onClick={() =>
                    run({
                      type: "addParticipant",
                      matchId: detail.id,
                      playerId: player.id,
                      teamId: team.id,
                    })
                  }
                >
                  <PlusIcon data-icon="inline-start" aria-hidden="true" />
                  <span className="max-w-36 truncate">{player.displayName}</span>
                </Button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Todos los del grupo están anotados.</p>
          )}
          <NewPlayerInput detail={detail} disabled={pending} run={run} teamId={team.id} />
        </div>
      ) : null}
    </div>
  );
}

function RosterActions({
  detail,
  pending,
  appearance,
  run,
}: {
  detail: Detail;
  pending: boolean;
  appearance: Appearance;
  run: RunMatchAction;
}) {
  const [asking, setAsking] = useState(false);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const otherTeam = detail.teams.find((team) => team.id !== appearance.teamId);
  async function mark(owesContribution: boolean) {
    if (
      await run({
        type: "markAbsent",
        matchId: detail.id,
        playerId: appearance.playerId,
        owesContribution,
      })
    )
      setAsking(false);
  }
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              ref={trigger}
              className="size-11 shrink-0"
              variant="ghost"
              aria-label={`Opciones de ${appearance.playerDisplayName}`}
              disabled={pending}
            />
          }
        >
          <MoreHorizontalIcon aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={() => setAsking(true)}>No vino</DropdownMenuItem>
          <DropdownMenuItem
            disabled={!otherTeam}
            onClick={() =>
              otherTeam &&
              run({
                type: "moveParticipant",
                matchId: detail.id,
                playerId: appearance.playerId,
                teamId: otherTeam.id,
              })
            }
          >
            Mover al otro equipo
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onClick={() =>
              run({ type: "removeParticipant", matchId: detail.id, playerId: appearance.playerId })
            }
          >
            Sacar del partido
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={asking} onOpenChange={setAsking}>
        <DialogContent finalFocus={trigger}>
          <DialogHeader>
            <DialogTitle>{appearance.playerDisplayName} no vino</DialogTitle>
            <DialogDescription>¿Deja su aporte para la cancha?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" disabled={pending} onClick={() => setAsking(false)}>
              Cancelar
            </Button>
            <Button variant="outline" disabled={pending} onClick={() => mark(false)}>
              No aporta
            </Button>
            <Button disabled={pending} onClick={() => mark(true)}>
              Sí, aporta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function NewPlayerInput({
  detail,
  disabled,
  run,
  teamId,
}: {
  detail: Detail;
  disabled: boolean;
  run: RunMatchAction;
  teamId: string;
}) {
  const [name, setName] = useState("");
  return (
    <form
      className="flex items-center gap-2"
      onSubmit={async (event) => {
        event.preventDefault();
        if (
          name.trim() &&
          (await run({
            type: "createAndAddParticipant",
            displayName: name,
            matchId: detail.id,
            teamId,
          }))
        ) {
          setName("");
        }
      }}
    >
      <Input
        aria-label="Jugador nuevo"
        autoComplete="off"
        disabled={disabled}
        placeholder="O escribí un nombre nuevo…"
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      <Button
        aria-label="Crear y sumar jugador"
        disabled={disabled || !name.trim()}
        size="icon"
        type="submit"
        variant="outline"
      >
        <PlusIcon aria-hidden="true" />
      </Button>
    </form>
  );
}

const planillaFields = [
  { field: "goals", label: "Goles" },
  { field: "assists", label: "Asistencias" },
  { field: "ownGoals", label: "En contra" },
] as const;

/** Phone: the name on its own line with the three counters under it. Wider: one row each. */
const planillaRow =
  "grid grid-cols-3 items-center gap-x-2 gap-y-1 sm:grid-cols-[minmax(0,1fr)_repeat(3,7rem)]";

function Planilla({
  detail,
  editable,
  pending,
  run,
}: {
  detail: Detail;
  editable: boolean;
  pending: boolean;
  run: RunMatchAction;
}) {
  const playing = detail.teams.reduce((sum, team) => sum + team.appearances.length, 0);
  if (playing === 0) {
    return <EmptyNote>Sumá jugadores a los equipos para cargar la planilla.</EmptyNote>;
  }
  return (
    <div className="flex flex-col gap-4">
      {detail.teams.map((team) => (
        <Card key={team.id} className="gap-0 py-0">
          <h3 className="flex min-h-11 items-center gap-2 border-b bg-muted/40 px-4 text-sm font-semibold">
            <TeamDot slot={team.slot} />
            <span className="truncate">{team.displayName}</span>
          </h3>
          <div
            aria-hidden="true"
            className={cn(
              planillaRow,
              "min-h-9 border-b px-4 text-xs font-medium text-muted-foreground",
            )}
          >
            <span className="hidden sm:block">Jugador</span>
            {planillaFields.map((stat) => (
              <span key={stat.field} className="text-center">
                {stat.label}
              </span>
            ))}
          </div>
          <ul className="flex flex-col divide-y">
            {team.appearances.map((appearance) => (
              <li
                key={appearance.playerId}
                className={cn(planillaRow, "px-4 py-2 sm:min-h-12 sm:py-1")}
              >
                <span className="col-span-3 truncate text-sm font-medium sm:col-span-1">
                  {appearance.playerDisplayName}
                </span>
                {planillaFields.map((stat) => (
                  <span key={stat.field} className="flex justify-center">
                    <Stepper
                      disabled={pending}
                      readOnly={!editable}
                      label={`${stat.label} de ${appearance.playerDisplayName}`}
                      onDecrement={() =>
                        run({
                          type: "adjustStat",
                          field: stat.field,
                          matchId: detail.id,
                          playerId: appearance.playerId,
                          delta: -1,
                        })
                      }
                      onIncrement={() =>
                        run({
                          type: "adjustStat",
                          field: stat.field,
                          matchId: detail.id,
                          playerId: appearance.playerId,
                          delta: 1,
                        })
                      }
                      value={appearance[stat.field]}
                    />
                  </span>
                ))}
              </li>
            ))}
            {editable || team.unattributedGoals > 0 ? (
              <li className={cn(planillaRow, "px-4 py-2 sm:min-h-12 sm:py-1")}>
                <span className="col-span-3 text-sm text-muted-foreground sm:col-span-1">
                  Sin autor
                </span>
                <span className="flex justify-center">
                  <Stepper
                    disabled={pending}
                    readOnly={!editable}
                    label={`Goles sin autor de ${team.displayName}`}
                    onDecrement={() =>
                      run({
                        type: "adjustStat",
                        field: "unattributedGoals",
                        matchId: detail.id,
                        teamId: team.id,
                        delta: -1,
                      })
                    }
                    onIncrement={() =>
                      run({
                        type: "adjustStat",
                        field: "unattributedGoals",
                        matchId: detail.id,
                        teamId: team.id,
                        delta: 1,
                      })
                    }
                    value={team.unattributedGoals}
                  />
                </span>
              </li>
            ) : null}
          </ul>
        </Card>
      ))}
    </div>
  );
}

function EmptyNote({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
      {children}
    </p>
  );
}

/** Pinned above the bottom nav on the phone, under the score on wider screens. */
function ClosingBar({
  issues,
  onClose,
  pending,
}: {
  issues: (keyof typeof issueText)[];
  onClose: () => void;
  pending: boolean;
}) {
  const ready = issues.length === 0;
  const [first] = issues;
  return (
    <div className="fixed inset-x-0 bottom-[calc(4rem+1px+max(0.5rem,env(safe-area-inset-bottom)))] z-20 border-t bg-background px-4 py-3 md:static md:border-0 md:bg-transparent md:p-0">
      <div className="flex items-center gap-3">
        <p className="flex min-w-0 flex-1 items-start gap-2 text-xs text-muted-foreground">
          {ready ? (
            <CheckIcon className="size-4 shrink-0 text-success" aria-hidden="true" />
          ) : (
            <CircleAlertIcon className="size-4 shrink-0" aria-hidden="true" />
          )}
          <span>
            {first ? issueText[first] : "Todo listo para cerrar."}
            {issues.length > 1 ? ` (y ${issues.length - 1} más)` : null}
          </span>
        </p>
        <Button disabled={!ready || pending} onClick={onClose}>
          <LockKeyholeIcon data-icon="inline-start" aria-hidden="true" />
          Cerrar partido
        </Button>
      </div>
    </div>
  );
}

function Stepper({
  disabled,
  label,
  onDecrement,
  onIncrement,
  readOnly = false,
  value,
}: {
  disabled: boolean;
  label: string;
  onDecrement: () => void;
  onIncrement: () => void;
  readOnly?: boolean;
  value: number;
}) {
  if (readOnly) {
    return (
      <span
        className={cn(
          "flex h-11 items-center justify-center text-sm font-semibold tabular-nums",
          value === 0 && "font-normal text-muted-foreground",
        )}
      >
        <span className="sr-only">{label}: </span>
        {value}
      </span>
    );
  }
  return (
    <span
      className="mx-auto flex w-full max-w-28 min-w-0 items-center justify-between rounded-md bg-muted/50"
      role="group"
      aria-label={label}
    >
      <Button
        aria-label={`${label}: restar`}
        disabled={disabled || value === 0}
        onClick={onDecrement}
        size="icon"
        variant="ghost"
      >
        <MinusIcon aria-hidden="true" />
      </Button>
      <span
        className={cn(
          "min-w-4 text-center text-sm font-semibold tabular-nums",
          value === 0 && "font-normal text-muted-foreground",
        )}
      >
        {value}
      </span>
      <Button
        aria-label={`${label}: sumar`}
        disabled={disabled}
        onClick={onIncrement}
        size="icon"
        variant="ghost"
      >
        <PlusIcon aria-hidden="true" />
      </Button>
    </span>
  );
}

const statusStyles = {
  exempt: "text-muted-foreground",
  overpaid: "text-foreground",
  paid: "text-foreground",
  partial: "text-foreground",
  pending: "text-foreground",
} as const;

const statusBadge = {
  exempt: { label: "Exento", variant: "ghost" },
  pending: { label: "Pendiente", variant: "destructive" },
  partial: { label: "Parcial", variant: "outline" },
  paid: { label: "Pagado", variant: "success" },
  overpaid: { label: "Excedido", variant: "secondary" },
} as const;

function cashRows(detail: Detail) {
  return [
    ...detail.teams.flatMap((team) => team.appearances),
    ...detail.absences.filter((row) => row.owesContribution),
  ];
}

function CashCount({ detail }: { detail: Detail }) {
  const rows = cashRows(detail);
  if (detail.courtCostMinor === null || rows.length === 0) return null;
  const settled = rows.filter(
    (row) => row.contributionStatus === "paid" || row.contributionStatus === "overpaid",
  ).length;
  return (
    <span className="font-normal text-muted-foreground tabular-nums">
      {settled}/{rows.length}
      <span className="sr-only"> pagaron</span>
    </span>
  );
}

function Caja({
  detail,
  editable,
  pending,
  run,
}: {
  detail: Detail;
  editable: boolean;
  pending: boolean;
  run: RunMatchAction;
}) {
  const rows = cashRows(detail);
  if (detail.courtCostMinor === null) {
    return (
      <EmptyNote>Cargá el precio de la cancha en “Editar datos” para repartir la caja.</EmptyNote>
    );
  }
  if (rows.length === 0) {
    return <EmptyNote>Sumá jugadores para repartir la caja.</EmptyNote>;
  }
  const collected = rows.reduce((acc, row) => acc + BigInt(row.paidMinor), 0n);
  const expected = rows.reduce((acc, row) => acc + BigInt(row.expectedMinor), 0n);
  const missing = expected > collected ? expected - collected : 0n;
  return (
    <div className="flex flex-col gap-4">
      <Card size="sm" className="py-0">
        <dl className="grid grid-cols-3 divide-x">
          {[
            { label: "Cancha", value: formatMoney(detail.courtCostMinor) },
            { label: "Juntado", value: formatMoney(collected) },
            { label: "Falta", value: formatMoney(missing) },
          ].map((item) => (
            <div key={item.label} className="flex min-w-0 flex-col gap-0.5 px-3 py-3">
              <dt className="text-xs font-medium text-muted-foreground">{item.label}</dt>
              <dd className="truncate text-base font-semibold tabular-nums sm:text-lg">
                {item.value}
              </dd>
            </div>
          ))}
        </dl>
      </Card>
      <Card className="gap-0 py-0">
        <ul className="flex flex-col divide-y">
          {rows.map((appearance) => (
            <PaymentRow
              key={appearance.playerId}
              appearance={appearance}
              detail={detail}
              editable={editable}
              pending={pending}
              run={run}
            />
          ))}
        </ul>
      </Card>
    </div>
  );
}

function PaymentRow({
  appearance,
  detail,
  editable,
  pending,
  run,
}: {
  appearance: PaymentSubject & { owesContribution?: boolean };
  detail: Detail;
  editable: boolean;
  pending: boolean;
  run: RunMatchAction;
}) {
  return (
    <li className="flex flex-col gap-2 px-4 py-3">
      <span className="flex min-w-0 items-center gap-2 text-sm font-medium">
        <span className="truncate">{appearance.playerDisplayName}</span>
        {appearance.owesContribution ? <Badge variant="secondary">Ausente · aporta</Badge> : null}
      </span>
      <PaymentCell
        appearance={appearance}
        detail={detail}
        editable={editable}
        pending={pending}
        run={run}
      />
    </li>
  );
}

function PaymentCell({
  appearance,
  compact = false,
  detail,
  editable,
  pending,
  run,
}: {
  appearance: PaymentSubject;
  /** In the closing sheet the amounts move under the player's name on small screens. */
  compact?: boolean;
  detail: Detail;
  editable: boolean;
  pending: boolean;
  run: RunMatchAction;
}) {
  const [editing, setEditing] = useState(false);
  const [expectedLockVersion, setExpectedLockVersion] = useState(detail.lockVersion);
  const [amount, setAmount] = useState(String(Number(appearance.paidMinor) / 100));

  async function save() {
    const paidMinor = toMinor(amount);
    if (paidMinor !== null) {
      const saved = await run(
        {
          type: "updatePaid",
          matchId: detail.id,
          paidMinor,
          playerId: appearance.playerId,
        },
        { expectedLockVersion, onConflict: setExpectedLockVersion },
      );
      if (saved) setEditing(false);
    }
  }

  if (editing) {
    return (
      <form
        className="flex w-full flex-wrap items-center gap-2 lg:flex-nowrap"
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
      >
        <Input
          autoFocus
          aria-label={`Pagó ${appearance.playerDisplayName}`}
          className="min-h-11 w-28"
          inputMode="decimal"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
        />
        <Button disabled={pending} size="sm" type="submit">
          {pending ? <Spinner data-icon="inline-start" /> : null}
          Guardar
        </Button>
        <Button
          disabled={pending}
          size="sm"
          type="button"
          variant="ghost"
          onClick={() => setEditing(false)}
        >
          Cancelar
        </Button>
      </form>
    );
  }

  return (
    <span className="flex min-w-0 flex-wrap items-center justify-end gap-x-2 gap-y-1">
      <span
        className={cn("text-sm tabular-nums text-muted-foreground", compact && "hidden xl:inline")}
      >
        <span className={cn("font-semibold", statusStyles[appearance.contributionStatus])}>
          {formatMoney(appearance.paidMinor)}
        </span>{" "}
        de {formatMoney(appearance.expectedMinor)}
      </span>
      <Badge variant={statusBadge[appearance.contributionStatus].variant}>
        {statusBadge[appearance.contributionStatus].label}
      </Badge>
      {editable ? (
        <span className="flex">
          <Button
            aria-label={`Marcar pago completo de ${appearance.playerDisplayName}`}
            disabled={pending || appearance.expectedMinor === appearance.paidMinor}
            onClick={() =>
              run({
                type: "updatePaid",
                matchId: detail.id,
                paidMinor: String(appearance.expectedMinor),
                playerId: appearance.playerId,
              })
            }
            size="icon"
            title="Marcar pago completo"
            variant="ghost"
          >
            <WalletIcon aria-hidden="true" />
          </Button>
          <Button
            aria-label={`Editar pago de ${appearance.playerDisplayName}`}
            disabled={pending}
            onClick={() => {
              setAmount(String(Number(appearance.paidMinor) / 100));
              setExpectedLockVersion(detail.lockVersion);
              setEditing(true);
            }}
            size="icon"
            title="Editar pago"
            variant="ghost"
          >
            <PencilIcon aria-hidden="true" />
          </Button>
        </span>
      ) : null}
    </span>
  );
}

function ReadOnlyStats({ detail }: { detail: Detail }) {
  return (
    <Card className="gap-0 py-0">
      <div className="grid divide-y lg:grid-cols-2 lg:divide-x lg:divide-y-0">
        {detail.teams.map((team) => (
          <div key={team.id} className="flex min-w-0 flex-col px-4 py-3">
            <div className="grid min-h-9 grid-cols-[minmax(0,1fr)_2.5rem_2.5rem_2.5rem] items-center gap-2">
              <h3 className="flex min-w-0 items-center gap-2 text-sm font-semibold">
                <TeamDot slot={team.slot} />
                <span className="truncate">{team.displayName}</span>
              </h3>
              <abbr
                title="Goles"
                className="text-center text-xs font-medium text-muted-foreground no-underline"
              >
                G
              </abbr>
              <abbr
                title="Asistencias"
                className="text-center text-xs font-medium text-muted-foreground no-underline"
              >
                A
              </abbr>
              <abbr
                title="En contra"
                className="text-center text-xs font-medium text-muted-foreground no-underline"
              >
                EC
              </abbr>
            </div>
            <ul className="flex flex-col divide-y border-t">
              {team.appearances.map((appearance) => (
                <li
                  key={appearance.playerId}
                  className="grid min-h-11 grid-cols-[minmax(0,1fr)_2.5rem_2.5rem_2.5rem] items-center gap-2"
                >
                  <span className="truncate text-sm">{appearance.playerDisplayName}</span>
                  <StatCell value={appearance.goals} />
                  <StatCell value={appearance.assists} />
                  <StatCell value={appearance.ownGoals} />
                </li>
              ))}
              {team.unattributedGoals > 0 ? (
                <li className="grid min-h-11 grid-cols-[minmax(0,1fr)_2.5rem_2.5rem_2.5rem] items-center gap-2">
                  <span className="text-sm text-muted-foreground">Sin autor</span>
                  <StatCell value={team.unattributedGoals} />
                </li>
              ) : null}
            </ul>
          </div>
        ))}
      </div>
    </Card>
  );
}

function StatCell({ value }: { value: number }) {
  return (
    <span
      className={cn(
        "text-center text-sm tabular-nums",
        value === 0 ? "text-muted-foreground" : "font-semibold",
      )}
    >
      {value}
    </span>
  );
}

function courtItemsFor(courts: Directory["courts"], currentCourtId: string | null) {
  return [
    { label: "A definir", value: null },
    ...courts
      .filter((court) => !court.archivedAt || court.id === currentCourtId)
      .map((court) => ({ label: court.name, value: court.id })),
  ];
}

function scoreFor(detail: Detail, teamId?: string) {
  return detail.score.find((item) => item.teamId === teamId)?.goals ?? 0;
}

function closureIssues(detail: Detail): (keyof typeof issueText)[] {
  const issues: (keyof typeof issueText)[] = [];
  if (new Date(detail.scheduledAt).getTime() > Date.now()) issues.push("match_not_started");
  if (!detail.courtId) issues.push("court_required");
  if (detail.courtCostMinor === null) issues.push("court_cost_required");
  if (detail.teams.length !== 2) issues.push("invalid_team_slots");
  if (detail.teams.some((team) => team.appearances.length === 0)) {
    issues.push("team_without_players");
  }
  if (
    detail.teams.some(
      (team) =>
        team.appearances.reduce((sum, row) => sum + row.assists, 0) >
        team.unattributedGoals + team.appearances.reduce((sum, row) => sum + row.goals, 0),
    )
  ) {
    issues.push("assists_exceed_attributed_goals");
  }
  if (
    detail.courtCostMinor !== null &&
    [...detail.teams.flatMap((team) => team.appearances), ...detail.absences].reduce(
      (sum, row) => sum + BigInt(row.expectedMinor),
      0n,
    ) !== BigInt(detail.courtCostMinor)
  ) {
    issues.push("expected_total_mismatch");
  }
  return issues;
}

function toLocalInputValue(value: Date | string) {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

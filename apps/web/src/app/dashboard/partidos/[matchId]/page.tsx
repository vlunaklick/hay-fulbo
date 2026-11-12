"use client";

import type { AppRouter } from "@hay-fulbo/api/routers/index";
import { Alert, AlertDescription, AlertTitle } from "@hay-fulbo/ui/components/alert";
import { Badge } from "@hay-fulbo/ui/components/badge";
import { Button } from "@hay-fulbo/ui/components/button";
import { Card, CardContent } from "@hay-fulbo/ui/components/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@hay-fulbo/ui/components/collapsible";
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
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@hay-fulbo/ui/components/sheet";
import { Spinner } from "@hay-fulbo/ui/components/spinner";
import { cn } from "@hay-fulbo/ui/lib/utils";
import { useQuery } from "@tanstack/react-query";
import type { inferRouterOutputs } from "@trpc/server";
import {
  ArrowLeftIcon,
  BanIcon,
  CalendarClockIcon,
  CheckIcon,
  ChevronRightIcon,
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
import { useRef, useState } from "react";
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
import { PageHeader } from "@/components/page-header";
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

function MatchWorkspace({ detail, directory }: { detail: Detail; directory: Directory }) {
  const { groupName, role, user } = useAppContext();
  const manager = detail.organizerUserId === user.id || role !== "member";
  const isOpen = detail.status === "open";
  const editable = isOpen && manager;
  const issues = closureIssues(detail);
  const readyToClose = issues.length === 0;
  const { run, pending } = useMatchCommand(detail);
  const canScore = isOpen && (manager || detail.scorekeeperUserId === user.id);
  const scorekeeperItems: Array<{ label: string; value: string | null }> = [
    { label: "Sin planillero", value: null },
    ...directory.members.map((member) => ({ label: member.name, value: member.id })),
  ];

  async function closeMatch() {
    await run({ type: "closeMatch", matchId: detail.id });
  }
  function reopen() {
    run({ type: "reopenMatch", matchId: detail.id });
  }
  function cancelMatch() {
    run({ type: "cancelMatch", matchId: detail.id });
  }
  function restore() {
    run({ type: "restoreMatch", matchId: detail.id });
  }

  const court = directory.courts.find((item) => item.id === detail.courtId);
  const costKnown = detail.courtCostMinor !== null;

  return (
    <div className={cn("flex flex-col gap-8", isOpen && manager && "pb-24 md:pb-20")}>
      <Overview
        courts={directory.courts}
        detail={detail}
        courtName={court?.name ?? null}
        editable={editable}
        pending={pending}
        run={run}
        share={
          isOpen ? (
            <MatchShareRow court={court ?? null} detail={detail} groupName={groupName} />
          ) : null
        }
        onCancelMatch={isOpen && manager ? cancelMatch : undefined}
        onRestore={detail.status === "cancelled" && manager ? restore : undefined}
        onReopen={detail.status === "closed" && manager ? reopen : undefined}
      />

      {detail.status === "cancelled" ? (
        <div className="flex items-start gap-3 rounded-lg border border-dashed p-4">
          <CircleAlertIcon className="mt-0.5 size-4 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm font-semibold">Partido cancelado · no suma resultados ni deuda</p>
        </div>
      ) : null}

      {isOpen ? (
        <>
          <Section title="Los equipos">
            <RosterGrid
              detail={detail}
              directory={directory}
              editable={editable}
              pending={pending}
              run={run}
            />
            <Collapsible>
              <CollapsibleTrigger
                render={
                  <Button
                    variant="ghost"
                    size="sm"
                    className="group/parity -mx-3 w-fit max-w-full whitespace-normal text-left text-muted-foreground"
                  />
                }
              >
                <ChevronRightIcon
                  data-icon="inline-start"
                  aria-hidden="true"
                  className="transition-transform group-data-[panel-open]/parity:rotate-90"
                />
                Cómo llegan · balance histórico de estos equipos
              </CollapsibleTrigger>
              <CollapsibleContent keepMounted className="pt-2 data-[closed]:hidden">
                <MatchParityCard matchId={detail.id} />
              </CollapsibleContent>
            </Collapsible>
          </Section>

          <Section
            title="El partido"
            action={
              <Button
                render={<Link href={`/dashboard/partidos/${detail.id}/cancha` as Route} />}
                nativeButton={false}
                size="sm"
                variant={canScore ? "secondary" : "outline"}
              >
                <Maximize2Icon data-icon="inline-start" aria-hidden="true" />
                Modo cancha
              </Button>
            }
          >
            <MatchScoreboard
              detail={detail}
              canScore={canScore}
              pending={pending}
              run={run}
              scorekeeperControl={
                editable ? (
                  <Select
                    items={scorekeeperItems}
                    value={detail.scorekeeperUserId ?? null}
                    disabled={pending}
                    onValueChange={(value) => {
                      void run({
                        type: "setScorekeeper",
                        matchId: detail.id,
                        scorekeeperUserId: value,
                      });
                    }}
                  >
                    <SelectTrigger aria-label="Planillero" size="sm" className="w-full sm:w-56">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {scorekeeperItems.map((item) => (
                          <SelectItem key={item.value ?? "none"} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                ) : undefined
              }
            />
          </Section>

          <Section
            title="El cierre"
            action={
              costKnown ? (
                <PaymentsSheet detail={detail} editable={editable} pending={pending} run={run} />
              ) : null
            }
          >
            <Planilla detail={detail} editable={editable} pending={pending} run={run} />
          </Section>

          {manager ? (
            <ClosingBar
              issues={issues}
              pending={pending}
              readyToClose={readyToClose}
              onClose={closeMatch}
            />
          ) : null}
        </>
      ) : null}

      {detail.status === "closed" ? (
        <>
          <MatchResultCard
            dateLabel={formatDate(detail.scheduledAt)}
            groupName={groupName}
            left={{
              goals: scoreFor(detail, detail.teams[0]?.id),
              name: detail.teams[0]?.displayName ?? "Equipo 1",
            }}
            matchId={detail.id}
            right={{
              goals: scoreFor(detail, detail.teams[1]?.id),
              name: detail.teams[1]?.displayName ?? "Equipo 2",
            }}
          />
          <Section
            title="Lo que quedó"
            action={
              <PaymentsSheet detail={detail} editable={manager} pending={pending} run={run} />
            }
          >
            <ReadOnlyStats detail={detail} />
          </Section>
          <Section title="Las notas">
            <MatchRatings matchId={detail.id} teams={detail.teams} />
          </Section>
        </>
      ) : null}
    </div>
  );
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section aria-label={title} className="flex flex-col gap-3">
      <div className="flex min-h-11 items-center justify-between gap-3">
        <h2 className="text-base font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function TeamDot({ slot }: { slot: number }) {
  return (
    <span
      className={cn("size-2 shrink-0 rounded-full", slot === 1 ? "bg-team-blue" : "bg-team-amber")}
      aria-hidden="true"
    />
  );
}

function StatusBadge({ status }: { status: Detail["status"] }) {
  const label = status === "open" ? "Abierto" : status === "closed" ? "Cerrado" : "Cancelado";
  return <Badge variant={status === "cancelled" ? "destructive" : "secondary"}>{label}</Badge>;
}

function Overview({
  courts,
  courtName,
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
  courtName: string | null;
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

  const left = detail.teams[0]?.displayName ?? "Equipo 1";
  const right = detail.teams[1]?.displayName ?? "Equipo 2";

  return (
    <div className="flex flex-col gap-4">
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3 w-fit text-muted-foreground"
        render={<Link href="/dashboard/partidos" />}
        nativeButton={false}
      >
        <ArrowLeftIcon data-icon="inline-start" aria-hidden="true" />
        Partidos
      </Button>
      <PageHeader
        title={
          <>
            <span>{left}</span>
            <span className="mx-2 font-medium text-muted-foreground">vs</span>
            <span>{right}</span>
          </>
        }
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <StatusBadge status={detail.status} />
            <span className="flex items-center gap-1.5">
              <CalendarClockIcon className="size-4 shrink-0" aria-hidden="true" />
              {formatDate(detail.scheduledAt)}
            </span>
            <span className="flex items-center gap-1.5">
              <MapPinIcon className="size-4 shrink-0" aria-hidden="true" />
              {courtName ?? "Cancha a definir"}
            </span>
            {detail.courtCostMinor !== null ? (
              <span className="tabular-nums">{formatMoney(detail.courtCostMinor)}</span>
            ) : null}
          </span>
        }
        actions={
          share || editable || onReopen || onRestore || onCancelMatch ? (
            <>
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
                  {editing ? "Cerrar edición" : "Editar datos"}
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
            </>
          ) : undefined
        }
      />

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

/** Shared column template so every row of the closing sheet lines up on desktop. */
const planillaGrid =
  "grid grid-cols-6 items-center gap-x-2 gap-y-1 xl:grid-cols-[minmax(0,1fr)_7rem_7rem_7rem_18rem] xl:gap-x-4";

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
  const costKnown = detail.courtCostMinor !== null;
  const statsEditable = editable && detail.status === "open";

  if (playing === 0) {
    return (
      <p className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
        Sumá jugadores a los equipos para cargar el cierre.
      </p>
    );
  }

  return (
    <Card className="gap-0 py-0 max-sm:overflow-visible max-sm:rounded-none max-sm:bg-transparent max-sm:ring-0">
      <div
        aria-hidden="true"
        className={cn(
          planillaGrid,
          "border-b py-2 text-xs font-medium text-muted-foreground sm:px-4",
        )}
      >
        <span className="hidden xl:block">Jugador</span>
        <span className="col-span-2 text-center xl:col-span-1">Goles</span>
        <span className="col-span-2 text-center xl:col-span-1">Asistencias</span>
        <span className="col-span-2 text-center xl:col-span-1">En contra</span>
        <span className="hidden text-right xl:block">{costKnown ? "Aporte" : null}</span>
      </div>
      {detail.teams.map((team) => (
        <section key={team.id} aria-label={`Cierre de ${team.displayName}`}>
          <h3 className="flex min-h-10 items-center gap-2 border-b bg-muted/40 text-xs font-semibold max-sm:-mx-4 max-sm:px-4 sm:px-4">
            <TeamDot slot={team.slot} />
            {team.displayName}
          </h3>
          <ul className="flex flex-col divide-y border-b last:border-b-0">
            {team.appearances.map((appearance) => (
              <PlanillaRow
                key={appearance.playerId}
                appearance={appearance}
                costKnown={costKnown}
                detail={detail}
                editableStats={statsEditable}
                editablePayments={editable}
                pending={pending}
                run={run}
              />
            ))}
            {statsEditable || team.unattributedGoals > 0 ? (
              <li className={cn(planillaGrid, "min-h-12 py-1 sm:px-4")}>
                <span className="col-span-6 flex min-h-8 items-center text-sm text-muted-foreground xl:col-span-1">
                  Sin autor
                </span>
                <span className="col-span-2 xl:col-span-1">
                  <Stepper
                    disabled={pending}
                    readOnly={!statsEditable}
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
        </section>
      ))}
    </Card>
  );
}

function PlanillaRow({
  appearance,
  costKnown,
  detail,
  editablePayments,
  editableStats,
  pending,
  run,
}: {
  appearance: Appearance;
  costKnown: boolean;
  detail: Detail;
  editablePayments: boolean;
  editableStats: boolean;
  pending: boolean;
  run: RunMatchAction;
}) {
  const stats = [
    { field: "goals", label: "Goles", value: appearance.goals },
    { field: "assists", label: "Asistencias", value: appearance.assists },
    { field: "ownGoals", label: "En contra", value: appearance.ownGoals },
  ] as const;
  return (
    <li className={cn(planillaGrid, "py-2 sm:px-4 xl:min-h-14 xl:py-1")}>
      <div
        className={cn(
          "flex min-h-11 min-w-0 flex-col justify-center xl:col-span-1",
          costKnown ? "col-span-3" : "col-span-6",
        )}
      >
        <span className="truncate text-sm font-medium">{appearance.playerDisplayName}</span>
        {costKnown ? (
          <span className="text-xs text-muted-foreground tabular-nums xl:hidden">
            {formatMoney(appearance.paidMinor)} de {formatMoney(appearance.expectedMinor)}
          </span>
        ) : null}
      </div>
      {costKnown ? (
        <div className="col-span-3 flex justify-end has-[form]:col-span-6 xl:order-last xl:col-span-1 xl:has-[form]:col-span-1">
          <PaymentCell
            appearance={appearance}
            compact
            detail={detail}
            editable={editablePayments}
            pending={pending}
            run={run}
          />
        </div>
      ) : null}
      {stats.map((stat) => (
        <span key={stat.field} className="col-span-2 xl:col-span-1">
          <Stepper
            disabled={pending}
            readOnly={!editableStats}
            label={`${stat.field === "ownGoals" ? "En contra" : stat.label} de ${appearance.playerDisplayName}`}
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
            value={stat.value}
          />
        </span>
      ))}
    </li>
  );
}

function ClosingBar({
  issues,
  onClose,
  pending,
  readyToClose,
}: {
  issues: (keyof typeof issueText)[];
  onClose: () => void;
  pending: boolean;
  readyToClose: boolean;
}) {
  return (
    <div className={cn(readyToClose && "sticky bottom-20 z-10 md:bottom-6")}>
      <Card size="sm" className={cn(readyToClose && "shadow-lg")}>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          {readyToClose ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckIcon className="size-4 text-success" aria-hidden="true" />
              Todo listo para cerrar.
            </p>
          ) : (
            <ul className="flex min-w-0 flex-1 flex-col gap-1">
              {issues.map((issue) => (
                <li key={issue} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CircleAlertIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  {issueText[issue]}
                </li>
              ))}
            </ul>
          )}
          <Button className="max-sm:w-full" disabled={!readyToClose || pending} onClick={onClose}>
            <LockKeyholeIcon data-icon="inline-start" aria-hidden="true" />
            Cerrar partido
          </Button>
        </CardContent>
      </Card>
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

function PaymentsSheet({
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
  const rows = [
    ...detail.teams.flatMap((team) => team.appearances),
    ...detail.absences.filter((row) => row.owesContribution),
  ];
  if (rows.length === 0) return null;
  const settled = rows.filter(
    (row) => row.contributionStatus === "paid" || row.contributionStatus === "overpaid",
  ).length;
  const collected = rows.reduce((acc, row) => acc + BigInt(row.paidMinor), 0n);
  const expected = rows.reduce((acc, row) => acc + BigInt(row.expectedMinor), 0n);
  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button size="sm" variant="outline">
            <WalletIcon data-icon="inline-start" aria-hidden="true" />
            La caja
            <span className="font-normal text-muted-foreground tabular-nums">
              {settled}/{rows.length}
            </span>
          </Button>
        }
      />
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>La caja</SheetTitle>
          <SheetDescription>
            {settled} de {rows.length} pagaron · {formatMoney(collected)} de {formatMoney(expected)}
          </SheetDescription>
        </SheetHeader>
        <SheetBody className="px-0 py-0">
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
        </SheetBody>
      </SheetContent>
    </Sheet>
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

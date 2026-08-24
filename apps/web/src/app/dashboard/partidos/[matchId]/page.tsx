"use client";

import type { AppRouter } from "@hay-fulbo/api/routers/index";
import { Alert, AlertDescription, AlertTitle } from "@hay-fulbo/ui/components/alert";
import { Badge } from "@hay-fulbo/ui/components/badge";
import { Button } from "@hay-fulbo/ui/components/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@hay-fulbo/ui/components/empty";
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
import { cn } from "@hay-fulbo/ui/lib/utils";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import {
  ArrowLeftIcon,
  ArrowRightLeftIcon,
  CalendarClockIcon,
  CheckIcon,
  CircleAlertIcon,
  LockKeyholeIcon,
  MapPinIcon,
  Maximize2Icon,
  PlusIcon,
  WalletIcon,
  XIcon,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";

import { useAppContext } from "@/components/app-shell";
import { MatchParityCard } from "@/components/match-parity-card";
import { MatchRatings } from "@/components/match-ratings";
import { MatchResultCard } from "@/components/match-result-card";
import { MatchScoreboard } from "@/components/match-scoreboard";
import { MatchShareRow } from "@/components/match-share-row";
import { formatDate, formatMoney, toMinor } from "@/lib/format";
import { queryClient, trpc } from "@/utils/trpc";

type Outputs = inferRouterOutputs<AppRouter>;
type Inputs = inferRouterInputs<AppRouter>;
type Detail = Outputs["matches"]["detail"];
type Directory = Outputs["matches"]["directory"];
type ExecuteInput = Inputs["matches"]["execute"];
type WithoutVersion<T> = T extends { expectedLockVersion: number }
  ? Omit<T, "expectedLockVersion">
  : T;
type MatchAction = WithoutVersion<ExecuteInput>;
type Appearance = Detail["teams"][number]["appearances"][number];

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
  const detail = useQuery(trpc.matches.detail.queryOptions({ matchId }));
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
  if (detail.isError || directory.isError) {
    return (
      <Alert variant="destructive">
        <CircleAlertIcon aria-hidden="true" />
        <AlertTitle>No pudimos abrir el partido</AlertTitle>
        <AlertDescription>{detail.error?.message ?? directory.error?.message}</AlertDescription>
      </Alert>
    );
  }

  return (
    <MatchWorkspace key={detail.data.lockVersion} detail={detail.data} directory={directory.data} />
  );
}

function MatchWorkspace({ detail, directory }: { detail: Detail; directory: Directory }) {
  const { groupName, role, user } = useAppContext();
  const manager = detail.organizerUserId === user.id || role !== "member";
  const isOpen = detail.status === "open";
  const editable = isOpen && manager;
  const issues = closureIssues(detail);
  const readyToClose = issues.length === 0;
  const detailKey = trpc.matches.detail.queryKey({ matchId: detail.id });
  const [version, setVersion] = useState(detail.lockVersion);
  const effectiveVersion = Math.max(version, detail.lockVersion);

  const execute = useMutation(
    trpc.matches.execute.mutationOptions({
      onMutate: async (input) => {
        await queryClient.cancelQueries({ queryKey: detailKey });
        const previous = queryClient.getQueryData<Detail>(detailKey);
        if (previous) {
          const optimistic = optimisticDetail(previous, input);
          if (optimistic !== previous) {
            queryClient.setQueryData<Detail>(detailKey, optimistic);
          }
        }
        return { previous };
      },
      onSuccess: (result, input) => {
        if ("lockVersion" in result) {
          setVersion((current) => Math.max(current, result.lockVersion));
        }
        toast.success(
          input.type === "closeMatch"
            ? "Partido cerrado"
            : input.type === "reopenMatch"
              ? "Partido reabierto"
              : "Listo",
        );
        queryClient.invalidateQueries({ queryKey: trpc.matches.list.queryKey() });
        queryClient.invalidateQueries({ queryKey: trpc.matches.directory.queryKey() });
      },
      onError: (cause, _input, context) => {
        toast.error(cause.message);
        if (context?.previous) {
          queryClient.setQueryData(detailKey, context.previous);
        }
      },
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: detailKey });
      },
    }),
  );
  const run = (action: MatchAction) =>
    execute.mutate({
      ...action,
      expectedLockVersion: effectiveVersion,
    } as ExecuteInput);

  function closeMatch() {
    run({ type: "closeMatch", matchId: detail.id });
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

  return (
    <div className="flex flex-col gap-8 pb-24">
      <header className="flex items-center justify-between gap-3">
        <Button
          variant="ghost"
          size="sm"
          render={<Link href="/dashboard/partidos" />}
          nativeButton={false}
        >
          <ArrowLeftIcon data-icon="inline-start" aria-hidden="true" />
          Partidos
        </Button>
        <StatusBadge status={detail.status} />
      </header>

      <Cover
        courts={directory.courts}
        detail={detail}
        courtName={court?.name ?? null}
        editable={editable}
        pending={execute.isPending}
        run={run}
        onCancelMatch={isOpen && manager ? cancelMatch : undefined}
        onRestore={detail.status === "cancelled" && manager ? restore : undefined}
        onReopen={detail.status === "closed" && manager ? reopen : undefined}
      />

      {detail.status === "cancelled" ? (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CircleAlertIcon aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>Partido cancelado</EmptyTitle>
            <EmptyDescription>No aporta resultados ni deuda.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : null}

      {isOpen ? (
        <>
          <Section step="1" title="Los equipos">
            <RosterGrid
              detail={detail}
              directory={directory}
              editable={editable}
              pending={execute.isPending}
              run={run}
            />
            <MatchShareRow court={court ?? null} detail={detail} groupName={groupName} />
            <details className="group rounded-xl border">
              <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
                Cómo llegan · balance histórico de estos equipos
              </summary>
              <div className="border-t px-4 py-4">
                <MatchParityCard matchId={detail.id} />
              </div>
            </details>
          </Section>

          <Section
            step="2"
            title="El partido"
            action={
              <Button
                render={<Link href={`/dashboard/partidos/${detail.id}/cancha` as Route} />}
                nativeButton={false}
                size="sm"
                variant="outline"
              >
                <Maximize2Icon data-icon="inline-start" aria-hidden="true" />
                Modo cancha
              </Button>
            }
          >
            <MatchScoreboard detail={detail} manager={manager} userId={user.id} />
          </Section>

          <Planilla detail={detail} editable={editable} pending={execute.isPending} run={run} />

          <ClosingBar
            issues={issues}
            pending={execute.isPending}
            readyToClose={readyToClose}
            onClose={closeMatch}
          />
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
          <Section title="Lo que quedó">
            <ReadOnlyStats detail={detail} />
            <PaymentsCard
              detail={detail}
              editable={manager}
              pending={execute.isPending}
              run={run}
            />
          </Section>
          <Section title="Las notas">
            <MatchRatings matchId={detail.id} teams={detail.teams} />
          </Section>
        </>
      ) : null}

      {manager ? (
        <div className="flex justify-center">
          <Button onClick={reopen} variant="outline">
            Corregir algo · reabrir
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function Section({
  step,
  title,
  action,
  children,
}: {
  step?: string;
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section aria-label={title} className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-baseline gap-2 text-lg font-bold tracking-tight">
          {step ? <span className="font-mono text-xs font-bold text-primary">{step}</span> : null}
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function StatusBadge({ status }: { status: Detail["status"] }) {
  const label = status === "open" ? "Abierto" : status === "closed" ? "Cerrado" : "Cancelado";
  return <Badge variant={status === "cancelled" ? "destructive" : "secondary"}>{label}</Badge>;
}

function Cover({
  courts,
  courtName,
  detail,
  editable,
  onCancelMatch,
  onReopen,
  onRestore,
  pending,
  run,
}: {
  courts: Directory["courts"];
  courtName: string | null;
  detail: Detail;
  editable: boolean;
  onCancelMatch?: () => void;
  onReopen?: () => void;
  onRestore?: () => void;
  pending: boolean;
  run: (action: MatchAction) => void;
}) {
  const [editing, setEditing] = useState(false);
  const localDate = toLocalInputValue(detail.scheduledAt);
  const [scheduledAt, setScheduledAt] = useState(localDate);
  const [courtId, setCourtId] = useState<string | null>(detail.courtId);
  const [cost, setCost] = useState(
    detail.courtCostMinor === null ? "" : String(Number(detail.courtCostMinor) / 100),
  );

  function save() {
    const courtCostMinor = cost.trim() ? toMinor(cost) : null;
    run({
      type: "updateMatch",
      matchId: detail.id,
      ...(scheduledAt !== localDate ? { scheduledAt: new Date(scheduledAt) } : {}),
      ...(courtId !== detail.courtId ? { courtId } : {}),
      ...(() => {
        const next = cost.trim() ? courtCostMinor : null;
        return next !== detail.courtCostMinor ? { courtCostMinor: next } : {};
      })(),
    });
    setEditing(false);
  }

  return (
    <section
      aria-labelledby="match-overview-title"
      className="overflow-hidden rounded-2xl border bg-card"
    >
      <div className="flex flex-col gap-4 px-5 py-5">
        <div className="flex items-center justify-between gap-3 text-xs font-medium text-muted-foreground">
          <span className="flex items-center gap-2">
            <CalendarClockIcon className="size-4" aria-hidden="true" />
            {formatDate(detail.scheduledAt)}
          </span>
          {editable ? (
            <Button onClick={() => setEditing((current) => !current)} size="sm" variant="ghost">
              {editing ? "Cerrar edición" : "Editar datos"}
            </Button>
          ) : null}
        </div>

        <div className="grid gap-x-6 gap-y-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <h1 id="match-overview-title" className="text-2xl font-bold tracking-tight">
            {detail.teams[0]?.displayName ?? "Equipo 1"}
            <span className="mx-2 font-mono text-lg font-semibold tabular-nums text-muted-foreground">
              {detail.status === "open" && detail.teams.length > 1
                ? `${scoreFor(detail, detail.teams[0]?.id)} – ${scoreFor(detail, detail.teams[1]?.id)}`
                : "vs."}
            </span>
            {detail.teams[1]?.displayName ?? "Equipo 2"}
          </h1>
          <p className="flex items-center gap-2 text-sm text-muted-foreground sm:justify-self-end">
            <MapPinIcon className="size-4 shrink-0" aria-hidden="true" />
            {courtName ?? "Cancha a definir"}
            {detail.courtCostMinor !== null ? (
              <>
                <span aria-hidden="true">·</span>
                {formatMoney(detail.courtCostMinor)}
              </>
            ) : null}
          </p>
        </div>

        {editing ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              save();
            }}
            className="grid gap-4 border-t pt-4 sm:grid-cols-3"
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
            <div className="sm:col-span-3">
              <Button disabled={pending} size="sm" type="submit">
                <CheckIcon data-icon="inline-start" aria-hidden="true" />
                Guardar datos
              </Button>
            </div>
          </form>
        ) : null}

        {onReopen || onRestore || onCancelMatch ? (
          <div className="flex flex-wrap items-center gap-2 border-t pt-4">
            {onReopen ? (
              <Button onClick={onReopen} size="sm" variant="outline">
                Reabrir partido
              </Button>
            ) : null}
            {onRestore ? (
              <Button onClick={onRestore} size="sm" variant="outline">
                Restaurar partido
              </Button>
            ) : null}
            {onCancelMatch ? (
              <Button
                className="text-destructive hover:text-destructive"
                onClick={onCancelMatch}
                size="sm"
                variant="ghost"
              >
                Cancelar partido
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function TeamNameEditor({
  editable,
  matchId,
  pending,
  run,
  team,
}: {
  editable: boolean;
  matchId: string;
  pending: boolean;
  run: (action: MatchAction) => void;
  team: Detail["teams"][number];
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(team.displayName);

  if (!editable) {
    return <span>{team.displayName}</span>;
  }
  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setName(team.displayName);
          setEditing(true);
        }}
        className="rounded px-1 text-left underline decoration-dotted decoration-muted-foreground/50 underline-offset-4 transition-colors hover:text-primary"
      >
        {team.displayName}
      </button>
    );
  }
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (name.trim() && name !== team.displayName) {
          run({
            type: "renameTeam",
            matchId,
            teamId: team.id,
            displayName: name,
          });
        }
        setEditing(false);
      }}
      className="flex items-center gap-1"
    >
      <Input
        autoFocus
        aria-label="Nombre del equipo"
        className="h-7 w-32 px-2 py-0 text-sm"
        value={name}
        onBlur={(event) => {
          if (event.target.value.trim() && event.target.value !== team.displayName) return;
          setEditing(false);
        }}
        onChange={(event) => setName(event.target.value)}
      />
      <Button aria-label="Guardar nombre" disabled={pending} size="icon-xs" type="submit">
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
  run: (action: MatchAction) => void;
}) {
  const assigned = new Set(
    detail.teams.flatMap((team) => team.appearances.map((row) => row.playerId)),
  );
  const available = directory.players.filter(
    (player) => !player.archivedAt && !assigned.has(player.id),
  );

  if (!editable && detail.teams.every((team) => team.appearances.length === 0)) {
    return (
      <Empty className="border border-dashed">
        <EmptyHeader>
          <EmptyTitle>Todavía no hay anotados</EmptyTitle>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
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
  run: (action: MatchAction) => void;
  team: Detail["teams"][number];
}) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div
        className={cn("flex h-1", team.slot === 1 ? "bg-team-blue" : "bg-team-amber")}
        aria-hidden="true"
      />
      <div className="flex flex-col gap-3 px-4 py-4">
        <div className="flex items-center justify-between gap-2">
          <TeamNameEditor
            editable={editable}
            matchId={detail.id}
            pending={pending}
            run={run}
            team={team}
          />
          <span className="font-mono text-xs font-bold text-muted-foreground">
            {team.appearances.length}
          </span>
        </div>

        {team.appearances.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">Sin jugadores todavía.</p>
        ) : (
          <ul className="flex flex-col divide-y">
            {team.appearances.map((appearance) => (
              <li
                key={appearance.playerId}
                className="group flex min-h-10 items-center justify-between gap-2 py-1"
              >
                <span className="truncate text-sm">{appearance.playerDisplayName}</span>
                {editable ? (
                  <span className="flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                    <Button
                      aria-label={`Mover a ${appearance.playerDisplayName} al otro equipo`}
                      disabled={pending}
                      onClick={() =>
                        run({
                          type: "moveParticipant",
                          matchId: detail.id,
                          playerId: appearance.playerId,
                          teamId:
                            detail.teams.find((candidate) => candidate.id !== team.id)?.id ??
                            team.id,
                        })
                      }
                      size="icon-xs"
                      variant="ghost"
                    >
                      <ArrowRightLeftIcon aria-hidden="true" />
                    </Button>
                    <Button
                      aria-label={`Sacar a ${appearance.playerDisplayName}`}
                      disabled={pending}
                      onClick={() =>
                        run({
                          type: "removeParticipant",
                          matchId: detail.id,
                          playerId: appearance.playerId,
                        })
                      }
                      size="icon-xs"
                      variant="ghost"
                    >
                      <XIcon aria-hidden="true" />
                    </Button>
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        {editable ? (
          <div className="flex flex-col gap-2 border-t pt-3">
            {available.length > 0 ? (
              <div className="-m-1 flex max-h-32 flex-wrap content-start gap-1.5 overflow-y-auto p-1">
                {available.map((player) => (
                  <button
                    key={player.id}
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      run({
                        type: "addParticipant",
                        matchId: detail.id,
                        playerId: player.id,
                        teamId: team.id,
                      })
                    }
                    className="flex min-h-8 items-center gap-1 rounded-full border px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:pointer-events-none disabled:opacity-40"
                  >
                    <PlusIcon className="size-3 shrink-0" aria-hidden="true" />
                    <span className="max-w-36 truncate">{player.displayName}</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Todos los del grupo están anotados.</p>
            )}
            <NewPlayerInput
              disabled={pending}
              onAdd={(displayName) =>
                run({
                  type: "createAndAddParticipant",
                  displayName,
                  matchId: detail.id,
                  teamId: team.id,
                })
              }
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function NewPlayerInput({
  disabled,
  onAdd,
}: {
  disabled: boolean;
  onAdd: (displayName: string) => void;
}) {
  const [name, setName] = useState("");
  return (
    <form
      className="flex items-center gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (name.trim()) {
          onAdd(name);
          setName("");
        }
      }}
    >
      <Input
        aria-label="Jugador nuevo"
        autoComplete="off"
        className="h-9"
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

function Planilla({
  detail,
  editable,
  pending,
  run,
}: {
  detail: Detail;
  editable: boolean;
  pending: boolean;
  run: (action: MatchAction) => void;
}) {
  const rows = detail.teams.flatMap((team) => team.appearances);
  const costKnown = detail.courtCostMinor !== null;

  return (
    <Section step="3" title="El cierre">
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Sumá jugadores a los equipos para cargar el cierre.
        </p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {detail.teams.map((team) => (
            <PlanillaCard
              key={team.id}
              detail={detail}
              editable={editable}
              costKnown={costKnown}
              pending={pending}
              run={run}
              team={team}
            />
          ))}
        </div>
      )}
      {costKnown && rows.length ? (
        <p className="text-sm text-muted-foreground">
          Caja:{" "}
          <strong className="font-mono tabular-nums text-foreground">
            {formatMoney(rows.reduce((sum, row) => sum + BigInt(row.paidMinor), 0n))}
          </strong>{" "}
          de <span className="font-mono tabular-nums">{formatMoney(detail.courtCostMinor)}</span>
        </p>
      ) : null}
    </Section>
  );
}

function PlanillaCard({
  costKnown,
  detail,
  editable,
  pending,
  run,
  team,
}: {
  costKnown: boolean;
  detail: Detail;
  editable: boolean;
  pending: boolean;
  run: (action: MatchAction) => void;
  team: Detail["teams"][number];
}) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div
        className={cn("h-1", team.slot === 1 ? "bg-team-blue" : "bg-team-amber")}
        aria-hidden="true"
      />
      <div className="flex flex-col divide-y px-4 py-3">
        {team.appearances.map((appearance) => (
          <PlanillaRow
            key={appearance.playerId}
            appearance={appearance}
            costKnown={costKnown}
            detail={detail}
            editableStats={editable && detail.status === "open"}
            editablePayments={editable}
            pending={pending}
            run={run}
          />
        ))}
        {editable && detail.status === "open" ? (
          <UnattributedStepper detail={detail} pending={pending} run={run} team={team} />
        ) : team.unattributedGoals > 0 ? (
          <div className="flex min-h-10 items-center justify-between py-2 text-sm text-muted-foreground">
            Goles sin autor
            <span className="font-mono font-bold tabular-nums">{team.unattributedGoals}</span>
          </div>
        ) : null}
      </div>
    </div>
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
  run: (action: MatchAction) => void;
}) {
  return (
    <div className="flex flex-col gap-2 py-2 md:flex-row md:items-center md:justify-between md:gap-4">
      <span className="truncate text-sm font-medium">{appearance.playerDisplayName}</span>
      <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-2 md:justify-end">
        <StatSteppers
          appearance={appearance}
          compact
          detail={detail}
          editable={editableStats}
          pending={pending}
          run={run}
        />
        {costKnown ? (
          <PaymentCell
            appearance={appearance}
            detail={detail}
            editable={editablePayments}
            pending={pending}
            run={run}
          />
        ) : null}
      </div>
    </div>
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
    <div className="sticky bottom-20 z-10 md:bottom-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card/95 px-4 py-3 shadow-[0_12px_32px_rgb(0_0_0/28%)] backdrop-blur">
        {readyToClose ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckIcon className="size-4 text-primary" aria-hidden="true" />
            Todo listo para cerrar.
          </p>
        ) : (
          <ul className="min-w-0 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <CircleAlertIcon className="size-4 shrink-0" aria-hidden="true" />
              {issueText[issues[0]]}
            </li>
            {issues.length > 1 ? (
              <li className="pl-6 text-xs">Y {issues.length - 1} pendiente más.</li>
            ) : null}
          </ul>
        )}
        <Button disabled={!readyToClose || pending} onClick={onClose} size="lg">
          <LockKeyholeIcon data-icon="inline-start" aria-hidden="true" />
          Cerrar partido
        </Button>
      </div>
    </div>
  );
}

function StatSteppers({
  appearance,
  compact = false,
  detail,
  editable,
  pending,
  run,
}: {
  appearance: Appearance;
  compact?: boolean;
  detail: Detail;
  editable: boolean;
  pending: boolean;
  run: (action: MatchAction) => void;
}) {
  return (
    <div className="flex shrink-0 items-center justify-between gap-4">
      <Stepper
        compact={compact}
        disabled={!editable || pending}
        label={`Goles de ${appearance.playerDisplayName}`}
        onDecrement={() =>
          run({
            type: "adjustStat",
            field: "goals",
            matchId: detail.id,
            playerId: appearance.playerId,
            delta: -1,
          })
        }
        onIncrement={() =>
          run({
            type: "adjustStat",
            field: "goals",
            matchId: detail.id,
            playerId: appearance.playerId,
            delta: 1,
          })
        }
        value={appearance.goals}
      />
      <Stepper
        compact={compact}
        disabled={!editable || pending}
        label={`Asistencias de ${appearance.playerDisplayName}`}
        onDecrement={() =>
          run({
            type: "adjustStat",
            field: "assists",
            matchId: detail.id,
            playerId: appearance.playerId,
            delta: -1,
          })
        }
        onIncrement={() =>
          run({
            type: "adjustStat",
            field: "assists",
            matchId: detail.id,
            playerId: appearance.playerId,
            delta: 1,
          })
        }
        value={appearance.assists}
      />
      <Stepper
        compact={compact}
        hideZero
        disabled={!editable || pending}
        label={`En contra de ${appearance.playerDisplayName}`}
        onDecrement={() =>
          run({
            type: "adjustStat",
            field: "ownGoals",
            matchId: detail.id,
            playerId: appearance.playerId,
            delta: -1,
          })
        }
        onIncrement={() =>
          run({
            type: "adjustStat",
            field: "ownGoals",
            matchId: detail.id,
            playerId: appearance.playerId,
            delta: 1,
          })
        }
        value={appearance.ownGoals}
      />
    </div>
  );
}

function Stepper({
  compact = false,
  disabled,
  hideZero = false,
  label,
  onDecrement,
  onIncrement,
  value,
}: {
  compact?: boolean;
  disabled: boolean;
  hideZero?: boolean;
  label: string;
  onDecrement: () => void;
  onIncrement: () => void;
  value: number;
}) {
  const tag = label.startsWith("Asistencias") ? "A" : label.startsWith("En contra") ? "AG" : "G";
  if (hideZero && value === 0 && disabled) {
    return <span className="w-20" aria-hidden="true" />;
  }
  return (
    <span className="flex w-20 items-center justify-end gap-1" role="group" aria-label={label}>
      {compact ? (
        <span
          aria-hidden="true"
          className="w-3 text-center text-[0.65rem] font-bold uppercase text-muted-foreground"
        >
          {tag}
        </span>
      ) : null}
      <button
        type="button"
        aria-label={`${label}: restar`}
        className="grid size-7 place-items-center rounded-full border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
        disabled={disabled || value === 0}
        onClick={onDecrement}
      >
        −
      </button>
      <span
        className={cn(
          "min-w-5 text-center font-mono font-bold tabular-nums",
          value === 0 && "text-muted-foreground/50",
        )}
      >
        {value}
      </span>
      <button
        type="button"
        aria-label={`${label}: sumar`}
        className="grid size-7 place-items-center rounded-full border transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-30"
        disabled={disabled}
        onClick={onIncrement}
      >
        +
      </button>
    </span>
  );
}

function UnattributedStepper({
  detail,
  pending,
  run,
  team,
}: {
  detail: Detail;
  pending: boolean;
  run: (action: MatchAction) => void;
  team: Detail["teams"][number];
}) {
  const editable = detail.status === "open";
  return (
    <div className="flex min-h-11 items-center justify-between gap-3 py-1.5">
      <span className="truncate text-sm text-muted-foreground">Sin autor</span>
      <Stepper
        disabled={!editable || pending}
        hideZero
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
    </div>
  );
}

const statusStyles = {
  exempt: "text-muted-foreground",
  overpaid: "text-sky-600 dark:text-sky-400",
  paid: "text-emerald-600 dark:text-emerald-400",
  partial: "text-amber-600 dark:text-amber-400",
  pending: "text-red-600 dark:text-red-400",
} as const;

function PaymentsCard({
  detail,
  editable,
  pending,
  run,
}: {
  detail: Detail;
  editable: boolean;
  pending: boolean;
  run: (action: MatchAction) => void;
}) {
  const rows = detail.teams.flatMap((team) => team.appearances);
  if (rows.length === 0) return null;
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <p className="border-b px-4 py-3 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
        La caja
      </p>
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
  appearance: Appearance;
  detail: Detail;
  editable: boolean;
  pending: boolean;
  run: (action: MatchAction) => void;
}) {
  return (
    <li className="flex min-h-12 items-center justify-between gap-3 px-4 py-2">
      <span className="truncate text-sm">{appearance.playerDisplayName}</span>
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
  detail,
  editable,
  pending,
  run,
}: {
  appearance: Appearance;
  detail: Detail;
  editable: boolean;
  pending: boolean;
  run: (action: MatchAction) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState(String(Number(appearance.paidMinor) / 100));

  function save() {
    const paidMinor = toMinor(amount);
    if (paidMinor !== null) {
      run({ type: "updatePaid", matchId: detail.id, paidMinor, playerId: appearance.playerId });
    }
    setEditing(false);
  }

  if (editing) {
    return (
      <form
        className="flex shrink-0 items-center gap-1"
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
      >
        <Input
          autoFocus
          aria-label={`Pagó ${appearance.playerDisplayName}`}
          className="h-8 w-24"
          inputMode="decimal"
          value={amount}
          onBlur={() => setEditing(false)}
          onChange={(event) => setAmount(event.target.value)}
        />
        <Button aria-label="Confirmar pago" size="icon-xs" type="submit">
          <CheckIcon aria-hidden="true" />
        </Button>
      </form>
    );
  }

  return (
    <span className="flex shrink-0 items-center gap-3">
      <span className="font-mono text-sm tabular-nums text-muted-foreground">
        {formatMoney(appearance.expectedMinor)}
      </span>
      <strong
        className={cn(
          "min-w-16 text-right font-mono text-sm tabular-nums",
          statusStyles[appearance.contributionStatus],
        )}
      >
        {formatMoney(appearance.paidMinor)}
      </strong>
      {editable ? (
        <>
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
            size="icon-xs"
            variant="outline"
          >
            <WalletIcon aria-hidden="true" />
          </Button>
          <Button
            aria-label={`Editar pago de ${appearance.playerDisplayName}`}
            disabled={pending}
            onClick={() => {
              setAmount(String(Number(appearance.paidMinor) / 100));
              setEditing(true);
            }}
            size="sm"
            variant="ghost"
          >
            Editar
          </Button>
        </>
      ) : null}
    </span>
  );
}

function ReadOnlyStats({ detail }: { detail: Detail }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {detail.teams.map((team) => (
        <div key={team.id} className="overflow-hidden rounded-xl border bg-card">
          <div
            className={cn("h-1", team.slot === 1 ? "bg-team-blue" : "bg-team-amber")}
            aria-hidden="true"
          />
          <div className="px-4 py-3">
            <p className="mb-1 text-sm font-semibold">{team.displayName}</p>
            <ul className="divide-y">
              {team.appearances.map((appearance) => (
                <li
                  key={appearance.playerId}
                  className="flex min-h-10 items-center justify-between gap-3 text-sm"
                >
                  <span className="truncate">{appearance.playerDisplayName}</span>
                  <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                    {appearance.goals}G · {appearance.assists}A
                    {appearance.ownGoals > 0 ? ` · ${appearance.ownGoals}AG` : ""}
                  </span>
                </li>
              ))}
              {team.unattributedGoals > 0 ? (
                <li className="flex min-h-10 items-center justify-between text-sm text-muted-foreground">
                  Sin autor
                  <span className="font-mono text-xs tabular-nums">{team.unattributedGoals}G</span>
                </li>
              ) : null}
            </ul>
          </div>
        </div>
      ))}
    </div>
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

function paidStatus(
  paidMinor: string,
  expectedMinor: string | number,
  previous: Appearance["contributionStatus"],
): Appearance["contributionStatus"] {
  const expected = BigInt(expectedMinor);
  if (expected === 0n) return previous;
  const paid = BigInt(paidMinor);
  if (paid === expected) return "paid";
  if (paid > expected) return "overpaid";
  if (paid > 0n) return "partial";
  return "pending";
}

function optimisticDetail(data: Detail, input: ExecuteInput): Detail {
  if (input.type === "adjustStat") {
    const { field } = input;
    if (field === "unattributedGoals") {
      const scoreTeamId = input.teamId;
      return {
        ...data,
        teams: data.teams.map((team) =>
          team.id === input.teamId
            ? { ...team, unattributedGoals: team.unattributedGoals + input.delta }
            : team,
        ),
        score: scoreTeamId
          ? data.score.map((entry) =>
              entry.teamId === scoreTeamId ? { ...entry, goals: entry.goals + input.delta } : entry,
            )
          : data.score,
      };
    }
    const scorerTeam = data.teams.find((team) =>
      team.appearances.some((row) => row.playerId === input.playerId),
    );
    const scoreTeamId =
      field === "ownGoals"
        ? data.teams.find((team) => team.id !== scorerTeam?.id)?.id
        : scorerTeam?.id;
    return {
      ...data,
      teams: data.teams.map((team) => ({
        ...team,
        appearances: team.appearances.map((row) =>
          row.playerId === input.playerId ? { ...row, [field]: row[field] + input.delta } : row,
        ),
      })),
      score: scoreTeamId
        ? data.score.map((entry) =>
            entry.teamId === scoreTeamId ? { ...entry, goals: entry.goals + input.delta } : entry,
          )
        : data.score,
    };
  }
  if (input.type === "updatePaid") {
    return {
      ...data,
      teams: data.teams.map((team) => ({
        ...team,
        appearances: team.appearances.map((row) =>
          row.playerId === input.playerId
            ? {
                ...row,
                paidMinor: input.paidMinor,
                contributionStatus: paidStatus(
                  input.paidMinor,
                  row.expectedMinor,
                  row.contributionStatus,
                ),
              }
            : row,
        ),
      })),
    };
  }
  return data;
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
    detail.teams
      .flatMap((team) => team.appearances)
      .reduce((sum, row) => sum + BigInt(row.expectedMinor), 0n) !== BigInt(detail.courtCostMinor)
  ) {
    issues.push("expected_total_mismatch");
  }
  return issues;
}

function toLocalInputValue(value: Date | string) {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

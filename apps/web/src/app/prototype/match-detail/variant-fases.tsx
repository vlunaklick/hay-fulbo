"use client";

// PROTOTYPE ONLY — Variant 3 "Fases": the page follows the match lifecycle. Only the phase
// that matters now is open; the rest collapse into a one-line summary.

import { Badge } from "@hay-fulbo/ui/components/badge";
import { Button } from "@hay-fulbo/ui/components/button";
import { Progress } from "@hay-fulbo/ui/components/progress";
import { cn } from "@hay-fulbo/ui/lib/utils";
import {
  ArrowLeftIcon,
  CalendarClockIcon,
  CheckIcon,
  ChevronDownIcon,
  CircleAlertIcon,
  LockIcon,
  LockKeyholeIcon,
  MapPinIcon,
  MinusIcon,
  PlusIcon,
  Share2Icon,
  TrophyIcon,
  UserPlusIcon,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { ReactNode } from "react";

import { formatDate, formatMoney } from "@/lib/format";

import {
  capabilities,
  cashSummary,
  closureIssues,
  figure,
  issueText,
  kickoffLabel,
  phaseLabel,
  teamScore,
  type Dispatch,
  type MatchState,
} from "./data";
import {
  Absences,
  AddPlayers,
  CashList,
  closeMatch,
  draftCount,
  GoalSheet,
  InviteMenu,
  MatchMenu,
  PlayerMenu,
  RatingSelect,
  saveRatings,
  ScorekeeperSelect,
  shareResult,
  Stepper,
  TeamDot,
  type GoalTarget,
} from "./shared";

type StepId = "convocatoria" | "partido" | "cierre" | "notas";
type StepStatus = "done" | "current" | "next" | "locked";

export function VariantFases({ state, dispatch }: { state: MatchState; dispatch: Dispatch }) {
  const [left, right] = state.teams;
  const scores = [teamScore(state, left), teamScore(state, right)] as const;
  const cash = cashSummary(state);
  const anotados = left.players.length + right.players.length;

  const steps: {
    id: StepId;
    title: string;
    status: StepStatus;
    summary: string;
    locked?: string;
  }[] = [
    {
      id: "convocatoria",
      title: "Convocatoria",
      status:
        state.phase === "upcoming" ? "current" : state.phase === "cancelled" ? "locked" : "done",
      summary: `${anotados} anotados · ${left.players.length} vs ${right.players.length}`,
    },
    {
      id: "partido",
      title: "El partido",
      status:
        state.phase === "live"
          ? "current"
          : state.phase === "closed"
            ? "done"
            : state.phase === "upcoming"
              ? "next"
              : "locked",
      summary:
        state.phase === "upcoming"
          ? (kickoffLabel(state) ?? "Arranca a la hora pactada")
          : `${scores[0]} – ${scores[1]}${state.scorekeeper ? ` · planillero ${state.scorekeeper}` : ""}`,
    },
    {
      id: "cierre",
      title: "Cierre y caja",
      status:
        state.phase === "closed"
          ? "done"
          : state.phase === "live"
            ? "next"
            : state.phase === "upcoming"
              ? "next"
              : "locked",
      summary: `${cash.settled} de ${cash.total} pagaron · ${formatMoney(cash.collected)} de ${formatMoney(cash.cost)}`,
    },
    {
      id: "notas",
      title: "Las notas",
      status: state.phase === "closed" ? "current" : "locked",
      summary: state.ratings.revealed
        ? `Notas reveladas${figure(state) ? ` · figura ${figure(state)!.player.name}` : ""}`
        : `Votaron ${state.ratings.votes} de ${state.ratings.eligible}`,
      locked: "Se habilitan cuando se cierra el partido.",
    },
  ];
  const current = steps.find((step) => step.status === "current")?.id ?? "convocatoria";
  // A manual choice only holds within the phase it was made in; closing the match jumps to Las notas.
  const [choice, setChoice] = useState<{ phase: MatchState["phase"]; id: StepId | null } | null>(
    null,
  );
  const open = choice && choice.phase === state.phase ? choice.id : current;
  const setOpen = (id: StepId | null) => setChoice({ phase: state.phase, id });
  const selected = open ?? current;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 text-muted-foreground"
            nativeButton={false}
            render={<Link href="/dashboard/partidos" />}
          >
            <ArrowLeftIcon data-icon="inline-start" aria-hidden="true" />
            Partidos
          </Button>
          <MatchMenu state={state} dispatch={dispatch} />
        </div>
        <header className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-balance">
            {state.phase === "closed" || state.phase === "live" ? (
              <>
                {left.name} <span className="tabular-nums">{scores[0]}</span>
                <span className="mx-2 font-medium text-muted-foreground">–</span>
                <span className="tabular-nums">{scores[1]}</span> {right.name}
              </>
            ) : (
              <>
                {left.name}
                <span className="mx-2 font-medium text-muted-foreground">vs</span>
                {right.name}
              </>
            )}
          </h1>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <Badge
              variant={
                state.phase === "cancelled"
                  ? "destructive"
                  : state.phase === "live"
                    ? "default"
                    : "secondary"
              }
            >
              {phaseLabel[state.phase]}
            </Badge>
            <span className="flex items-center gap-1.5">
              <CalendarClockIcon className="size-4 shrink-0" aria-hidden="true" />
              {formatDate(state.scheduledAt)}
            </span>
            <span className="flex min-w-0 items-center gap-1.5">
              <MapPinIcon className="size-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{state.court.name}</span>
            </span>
          </p>
        </header>
      </div>

      {state.phase === "cancelled" ? (
        <p className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
          Partido cancelado. No aporta resultados ni deuda. Restauralo desde el menú para retomarlo.
        </p>
      ) : null}

      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:items-start">
        <ol className="flex flex-col lg:sticky lg:top-8">
          {steps.map((step, index) => {
            const expanded = open === step.id;
            const canOpen = step.status !== "locked";
            const last = index === steps.length - 1;
            return (
              <li key={step.id} className="relative flex gap-3">
                {!last ? (
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute top-11 bottom-0 left-4 w-px -translate-x-1/2",
                      step.status === "done" ? "bg-success/40" : "bg-border",
                    )}
                  />
                ) : null}
                <StepMarker status={step.status} index={index} />
                <div className="flex min-w-0 flex-1 flex-col pb-4">
                  <button
                    type="button"
                    disabled={!canOpen}
                    aria-expanded={canOpen ? expanded : undefined}
                    onClick={() => setOpen(expanded ? null : step.id)}
                    className={cn(
                      "-mx-2 flex min-h-11 items-start justify-between gap-2 rounded-md px-2 py-1.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/50 enabled:hover:bg-muted/50",
                      selected === step.id && "lg:bg-muted",
                    )}
                  >
                    <span className="flex min-w-0 flex-col">
                      <span
                        className={cn(
                          "text-sm font-semibold",
                          step.status === "locked" && "text-muted-foreground",
                        )}
                      >
                        {step.title}
                      </span>
                      <span className="truncate text-xs text-muted-foreground tabular-nums">
                        {step.status === "locked" && step.locked ? step.locked : step.summary}
                      </span>
                    </span>
                    {canOpen ? (
                      <ChevronDownIcon
                        aria-hidden="true"
                        className={cn(
                          "mt-1 size-4 shrink-0 text-muted-foreground transition-transform duration-150 lg:-rotate-90",
                          expanded && "rotate-180 lg:rotate-0",
                        )}
                      />
                    ) : null}
                  </button>
                  {expanded ? (
                    <div className="pt-3 lg:hidden">
                      <StepContent id={step.id} state={state} dispatch={dispatch} />
                    </div>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>

        <section
          aria-label={steps.find((step) => step.id === selected)?.title}
          className="hidden lg:block"
        >
          <h2 className="mb-4 text-lg font-bold">
            {steps.find((step) => step.id === selected)?.title}
          </h2>
          <StepContent id={selected} state={state} dispatch={dispatch} />
        </section>
      </div>
    </div>
  );
}

function StepMarker({ status, index }: { status: StepStatus; index: number }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative z-[1] mt-1.5 grid size-8 shrink-0 place-items-center rounded-full text-sm font-semibold tabular-nums",
        status === "done" && "bg-success/15 text-success",
        status === "current" && "bg-primary text-primary-foreground",
        status === "next" && "bg-background text-foreground ring-1 ring-border",
        status === "locked" && "bg-muted text-muted-foreground",
      )}
    >
      {status === "done" ? (
        <CheckIcon className="size-4" />
      ) : status === "locked" ? (
        <LockIcon className="size-3.5" />
      ) : (
        index + 1
      )}
    </span>
  );
}

function StepContent({
  id,
  state,
  dispatch,
}: {
  id: StepId;
  state: MatchState;
  dispatch: Dispatch;
}) {
  if (id === "convocatoria") return <Convocatoria state={state} dispatch={dispatch} />;
  if (id === "partido") return <Partido state={state} dispatch={dispatch} />;
  if (id === "cierre") return <Cierre state={state} dispatch={dispatch} />;
  return <Notas state={state} dispatch={dispatch} />;
}

function Block({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex min-h-9 items-center justify-between gap-2">
        <h3 className="text-xs font-medium text-muted-foreground">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function Convocatoria({ state, dispatch }: { state: MatchState; dispatch: Dispatch }) {
  const caps = capabilities(state);
  const [adding, setAdding] = useState<string | null>(null);
  const pct = (value: number) => Math.round(value * 100);
  const options = [
    { label: state.teams[0].name, value: state.parity.left },
    { label: "Empate", value: state.parity.draw },
    { label: state.teams[1].name, value: state.parity.right },
  ];
  return (
    <div className="flex flex-col gap-5">
      {caps.open ? (
        <div className="flex flex-wrap items-center gap-3">
          <InviteMenu
            variant={state.phase === "upcoming" && caps.manager ? "default" : "outline"}
          />
          <span className="text-xs text-muted-foreground">
            Mandá el link al grupo para que se anoten.
          </span>
        </div>
      ) : null}

      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 xl:grid-cols-2">
        {state.teams.map((team) => (
          <Block key={team.id} title={`${team.name} · ${team.players.length}`}>
            <ul className="flex flex-col divide-y border-y">
              {team.players.map((player) => (
                <li key={player.id} className="flex min-h-11 items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-2 text-sm">
                    <TeamDot slot={team.slot} />
                    <span className="truncate">{player.name}</span>
                  </span>
                  {caps.editable ? (
                    <PlayerMenu state={state} dispatch={dispatch} player={player} />
                  ) : null}
                </li>
              ))}
            </ul>
            {caps.editable ? (
              adding === team.id ? (
                <div className="flex flex-col gap-2">
                  <AddPlayers state={state} dispatch={dispatch} team={team} />
                  <Button
                    size="sm"
                    variant="ghost"
                    className="w-fit"
                    onClick={() => setAdding(null)}
                  >
                    Listo
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  className="-ml-3 w-fit"
                  onClick={() => setAdding(team.id)}
                >
                  <UserPlusIcon data-icon="inline-start" aria-hidden="true" />
                  Sumar jugador
                </Button>
              )
            ) : null}
          </Block>
        ))}
      </div>

      <Absences state={state} dispatch={dispatch} />

      <Block title="Cómo llegan">
        <div className="flex flex-col gap-3">
          {options.map((option) => (
            <div key={option.label} className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="truncate">{option.label}</span>
                <strong className="font-semibold tabular-nums">{pct(option.value)}%</strong>
              </div>
              <Progress aria-label={option.label} value={pct(option.value)} />
            </div>
          ))}
          <p className="text-xs text-muted-foreground">
            Referencia recreativa · confianza {state.parity.confidence} · {state.parity.sample}{" "}
            partidos de historial
          </p>
        </div>
      </Block>
    </div>
  );
}

function Partido({ state, dispatch }: { state: MatchState; dispatch: Dispatch }) {
  const caps = capabilities(state);
  const [goal, setGoal] = useState<GoalTarget>(null);
  const canScore = caps.canScore && state.phase === "live";
  return (
    <div className="flex flex-col gap-4">
      {state.phase === "upcoming" ? (
        <p className="text-sm text-muted-foreground">
          {kickoffLabel(state)}. Cuando empiece, el marcador se carga desde acá.
        </p>
      ) : null}
      <div className="grid grid-cols-2 gap-3">
        {state.teams.map((team) => {
          const score = teamScore(state, team);
          return (
            <div
              key={team.id}
              className="flex min-w-0 flex-col items-center gap-3 rounded-lg bg-card px-3 py-4 ring-1 ring-foreground/10"
            >
              <span className="flex max-w-full items-center gap-2 text-sm font-semibold">
                <TeamDot slot={team.slot} />
                <span className="truncate">{team.name}</span>
              </span>
              <output
                aria-label={`Goles de ${team.name}`}
                className="text-6xl leading-none font-black tabular-nums"
              >
                {score}
              </output>
              {canScore ? (
                <div className="flex w-full gap-2">
                  <Button
                    aria-label={`Restar un gol a ${team.name}`}
                    size="icon"
                    variant="outline"
                    disabled={score === 0}
                    onClick={() => setGoal({ teamId: team.id, delta: -1 })}
                  >
                    <MinusIcon aria-hidden="true" />
                  </Button>
                  <Button
                    aria-label={`Sumar un gol a ${team.name}`}
                    className="flex-1"
                    variant={team.slot === 1 ? "team-blue" : "team-amber"}
                    onClick={() => setGoal({ teamId: team.id, delta: 1 })}
                  >
                    <PlusIcon aria-hidden="true" />
                    Gol
                  </Button>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      {state.phase === "live" ? (
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <p className="text-sm">
            {state.scorekeeper ? `Planillero: ${state.scorekeeper}` : "Sin planillero"}
            {!caps.canScore ? (
              <span className="block text-xs text-muted-foreground">
                El organizador y el planillero cargan los goles.
              </span>
            ) : null}
          </p>
          {caps.manager ? (
            <span className="w-44 shrink-0">
              <ScorekeeperSelect state={state} dispatch={dispatch} />
            </span>
          ) : null}
        </div>
      ) : null}
      <GoalSheet state={state} dispatch={dispatch} target={goal} onClose={() => setGoal(null)} />
    </div>
  );
}

function Cierre({ state, dispatch }: { state: MatchState; dispatch: Dispatch }) {
  const caps = capabilities(state);
  const issues = closureIssues(state);
  const editable = caps.editable && state.phase === "live";
  const grid = "grid grid-cols-[minmax(0,1fr)_repeat(3,minmax(0,5.5rem))] items-center gap-1";
  return (
    <div className="flex flex-col gap-6">
      <Block title="Goles, asistencias y en contra">
        <div className="flex flex-col gap-4">
          {state.teams.map((team) => (
            <div key={team.id} className="flex flex-col">
              <div
                className={cn(grid, "min-h-9 border-b text-xs font-medium text-muted-foreground")}
              >
                <span className="flex min-w-0 items-center gap-2 font-semibold text-foreground">
                  <TeamDot slot={team.slot} />
                  <span className="truncate">{team.name}</span>
                </span>
                <span className="text-center">Goles</span>
                <span className="text-center">Asist.</span>
                <span className="text-center">En contra</span>
              </div>
              <ul className="flex flex-col divide-y">
                {team.players.map((player) => (
                  <li key={player.id} className={cn(grid, "min-h-12")}>
                    <span className="truncate text-sm">{player.name}</span>
                    {(["goals", "assists", "ownGoals"] as const).map((field) => (
                      <span key={field} className="flex justify-center">
                        <Stepper
                          label={`${field} de ${player.name}`}
                          value={player[field]}
                          readOnly={!editable}
                          onChange={(delta) =>
                            dispatch({ type: "stat", playerId: player.id, field, delta })
                          }
                        />
                      </span>
                    ))}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Block>

      <Block title="La caja">
        <CashList state={state} dispatch={dispatch} />
      </Block>

      {caps.editable ? (
        <div className="flex flex-col gap-3 rounded-lg bg-muted/40 p-4">
          {issues.length === 0 ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckIcon className="size-4 text-success" aria-hidden="true" />
              Todo listo para cerrar.
            </p>
          ) : (
            <ul className="flex flex-col gap-1">
              {issues.map((issue) => (
                <li key={issue} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CircleAlertIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  {issueText[issue]}
                </li>
              ))}
            </ul>
          )}
          <Button
            className="w-full sm:w-fit"
            disabled={issues.length > 0}
            variant={state.phase === "live" ? "default" : "outline"}
            onClick={() => closeMatch(dispatch)}
          >
            <LockKeyholeIcon data-icon="inline-start" aria-hidden="true" />
            Cerrar partido
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function Notas({ state, dispatch }: { state: MatchState; dispatch: Dispatch }) {
  const pending = draftCount(state);
  const top = figure(state);
  const [left, right] = state.teams;
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        {top ? (
          <p className="flex items-center gap-2 text-sm">
            <TrophyIcon className="size-4 text-primary-text" aria-hidden="true" />
            Figura: <strong>{top.player.name}</strong>
            <span className="tabular-nums text-muted-foreground">{top.average}</span>
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Votaron {state.ratings.votes} de {state.ratings.eligible}. Las notas son anónimas; los
            promedios se revelan cuando vota la mayoría.
          </p>
        )}
        <Button
          size="sm"
          variant="outline"
          className="sm:ml-auto"
          onClick={() => shareResult(state, teamScore(state, left), teamScore(state, right))}
        >
          <Share2Icon data-icon="inline-start" aria-hidden="true" />
          Compartir resultado
        </Button>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 xl:grid-cols-2">
        {state.teams.map((team) => (
          <Block key={team.id} title={team.name}>
            <ul className="flex flex-col divide-y border-y">
              {team.players.map((player) => (
                <li key={player.id} className="flex min-h-12 items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-2 text-sm">
                    <TeamDot slot={team.slot} />
                    <span className="truncate">{player.name}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-3">
                    {state.ratings.revealed ? (
                      <span className="text-sm font-semibold text-muted-foreground tabular-nums">
                        {state.ratings.averages[player.id] ?? "—"}
                      </span>
                    ) : null}
                    <RatingSelect state={state} dispatch={dispatch} player={player} />
                  </span>
                </li>
              ))}
            </ul>
          </Block>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button disabled={pending === 0} onClick={() => saveRatings(state, dispatch)}>
          Guardar notas
        </Button>
        {pending > 0 ? (
          <span className="text-xs text-muted-foreground">
            {pending === 1 ? "1 nota sin guardar" : `${pending} notas sin guardar`}
          </span>
        ) : null}
      </div>
    </div>
  );
}

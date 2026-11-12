"use client";

// PROTOTYPE ONLY — Variant 1 "Tablero": the score is the anchor, everything else sits in tabs.

import { Badge } from "@hay-fulbo/ui/components/badge";
import { Button } from "@hay-fulbo/ui/components/button";
import { Card, CardContent } from "@hay-fulbo/ui/components/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@hay-fulbo/ui/components/tabs";
import { cn } from "@hay-fulbo/ui/lib/utils";
import {
  ArrowLeftIcon,
  CalendarClockIcon,
  CheckIcon,
  CircleAlertIcon,
  EyeIcon,
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
import { useCallback, useState } from "react";

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
  type Team,
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

export function VariantTablero({ state, dispatch }: { state: MatchState; dispatch: Dispatch }) {
  const caps = capabilities(state);
  const [goal, setGoal] = useState<GoalTarget>(null);
  const [heroVisible, setHeroVisible] = useState(true);
  const heroRef = useCallback((node: HTMLElement | null) => {
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => setHeroVisible(entry?.isIntersecting ?? true),
      {
        rootMargin: "-56px 0px 0px 0px",
      },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  const [left, right] = state.teams;
  const scores = [teamScore(state, left), teamScore(state, right)] as const;
  const cash = cashSummary(state);
  const issues = closureIssues(state);
  const showScore = state.phase === "live" || state.phase === "closed";
  const tabs =
    state.phase === "closed"
      ? (["notas", "planilla", "caja"] as const)
      : state.phase === "live"
        ? (["planilla", "equipos", "caja"] as const)
        : state.phase === "upcoming"
          ? (["equipos", "caja"] as const)
          : (["equipos"] as const);

  return (
    <div
      className={cn(
        "flex flex-col gap-5",
        caps.editable && state.phase === "live" && "pb-20 md:pb-16",
      )}
    >
      {/* Compact score that follows you down the page on the phone. */}
      {showScore ? (
        <div
          aria-hidden={heroVisible}
          className={cn(
            "fixed inset-x-0 top-14 z-10 border-b bg-background transition-[opacity,transform] duration-150 ease-out md:hidden",
            heroVisible
              ? "pointer-events-none -translate-y-2 opacity-0"
              : "translate-y-0 opacity-100",
          )}
        >
          <div className="grid h-12 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 px-4 text-sm font-semibold">
            <span className="flex min-w-0 items-center justify-end gap-2">
              <span className="truncate">{left.name}</span>
              <TeamDot slot={1} />
            </span>
            <span className="text-lg font-black tabular-nums">
              {scores[0]} – {scores[1]}
            </span>
            <span className="flex min-w-0 items-center gap-2">
              <TeamDot slot={2} />
              <span className="truncate">{right.name}</span>
            </span>
          </div>
        </div>
      ) : null}

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
        <div className="flex items-center gap-1">
          {caps.open ? (
            <InviteMenu
              variant={state.phase === "upcoming" && caps.manager ? "default" : "outline"}
            />
          ) : null}
          {state.phase === "closed" ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => shareResult(state, scores[0], scores[1])}
            >
              <Share2Icon data-icon="inline-start" aria-hidden="true" />
              Compartir
            </Button>
          ) : null}
          <MatchMenu state={state} dispatch={dispatch} />
        </div>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:items-start lg:gap-8">
        {/* Hero: who plays, the score and the one action you need right now. */}
        <section
          aria-label="Marcador"
          ref={heroRef}
          className="flex flex-col gap-4 lg:sticky lg:top-8"
        >
          <h1 className="sr-only">
            {left.name} vs {right.name}
          </h1>
          <Card className="gap-0 py-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b px-4 py-3 text-xs text-muted-foreground">
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
                <CalendarClockIcon className="size-3.5" aria-hidden="true" />
                {formatDate(state.scheduledAt)}
              </span>
              <span className="flex min-w-0 items-center gap-1.5">
                <MapPinIcon className="size-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">{state.court.name}</span>
              </span>
            </div>

            <div className="grid grid-cols-2 divide-x">
              {state.teams.map((team, index) => (
                <HeroTeam
                  key={team.id}
                  team={team}
                  score={scores[index]!}
                  showScore={showScore}
                  canScore={caps.canScore && state.phase === "live"}
                  closed={state.phase === "closed"}
                  won={state.phase === "closed" && scores[index]! > scores[1 - index]!}
                  onGoal={(delta) => setGoal({ teamId: team.id, delta })}
                />
              ))}
            </div>

            {state.phase === "upcoming" ? <ParityStrip state={state} /> : null}

            {state.phase === "live" ? (
              <div className="flex min-h-14 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t px-4 py-2">
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

            {state.phase === "closed" ? <FigureLine state={state} /> : null}

            {state.phase === "cancelled" ? (
              <p className="border-t px-4 py-3 text-sm text-muted-foreground">
                Partido cancelado. No aporta resultados ni deuda.
              </p>
            ) : null}
          </Card>

          {caps.editable && state.phase === "live" ? (
            <ClosingBar dispatch={dispatch} issues={issues} />
          ) : null}
        </section>

        <Tabs defaultValue={tabs[0]} className="gap-4">
          <TabsList className="w-full">
            {tabs.map((tab) => (
              <TabsTrigger key={tab} value={tab}>
                {tabLabel[tab]}
                {tab === "caja" ? (
                  <span className="font-normal text-muted-foreground tabular-nums">
                    {cash.settled}/{cash.total}
                  </span>
                ) : null}
                {tab === "notas" && draftCount(state) > 0 ? (
                  <>
                    <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
                    <span className="sr-only">(notas sin guardar)</span>
                  </>
                ) : null}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value="equipos" className="text-sm">
            <Roster state={state} dispatch={dispatch} />
          </TabsContent>
          <TabsContent value="planilla" className="text-sm">
            <Planilla state={state} dispatch={dispatch} />
          </TabsContent>
          <TabsContent value="caja" className="text-sm">
            <Caja state={state} dispatch={dispatch} />
          </TabsContent>
          <TabsContent value="notas" className="text-sm">
            <Notas state={state} dispatch={dispatch} />
          </TabsContent>
        </Tabs>
      </div>

      <GoalSheet state={state} dispatch={dispatch} target={goal} onClose={() => setGoal(null)} />
    </div>
  );
}

const tabLabel = {
  equipos: "Equipos",
  planilla: "Planilla",
  caja: "Caja",
  notas: "Notas",
} as const;

function HeroTeam({
  team,
  score,
  showScore,
  canScore,
  closed,
  won,
  onGoal,
}: {
  team: Team;
  score: number;
  showScore: boolean;
  canScore: boolean;
  closed: boolean;
  won: boolean;
  onGoal: (delta: 1 | -1) => void;
}) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-3 px-3 py-5">
      <h2 className="flex max-w-full items-center gap-2 text-sm font-semibold">
        <TeamDot slot={team.slot} />
        <span className="truncate">{team.name}</span>
      </h2>
      {showScore ? (
        <output
          aria-label={`Goles de ${team.name}`}
          className={cn(
            "text-6xl leading-none font-black tabular-nums sm:text-7xl",
            closed && !won && "text-muted-foreground",
          )}
        >
          {score}
        </output>
      ) : (
        <p className="text-sm text-muted-foreground tabular-nums">
          {team.players.length === 1 ? "1 anotado" : `${team.players.length} anotados`}
        </p>
      )}
      {won ? <Badge variant="success">Ganó</Badge> : null}
      {canScore ? (
        <div className="flex w-full max-w-56 gap-2">
          <Button
            aria-label={`Restar un gol a ${team.name}`}
            disabled={score === 0}
            variant="outline"
            size="icon"
            onClick={() => onGoal(-1)}
          >
            <MinusIcon aria-hidden="true" />
          </Button>
          <Button
            aria-label={`Sumar un gol a ${team.name}`}
            className="flex-1"
            variant={team.slot === 1 ? "team-blue" : "team-amber"}
            onClick={() => onGoal(1)}
          >
            <PlusIcon aria-hidden="true" />
            Gol
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function ParityStrip({ state }: { state: MatchState }) {
  const { left, draw, right, confidence, sample } = state.parity;
  const pct = (value: number) => Math.round(value * 100);
  return (
    <div className="flex flex-col gap-2 border-t px-4 py-3">
      <div className="flex items-baseline justify-between gap-3 text-xs">
        <span className="font-medium text-muted-foreground">Cómo llegan</span>
        <span className="text-muted-foreground">{kickoffLabel(state)}</span>
      </div>
      <div className="flex h-2 gap-0.5 overflow-hidden rounded-full" aria-hidden="true">
        <span className="bg-team-blue" style={{ width: `${pct(left)}%` }} />
        <span className="bg-muted-foreground/40" style={{ width: `${pct(draw)}%` }} />
        <span className="bg-team-amber" style={{ width: `${pct(right)}%` }} />
      </div>
      <dl className="grid grid-cols-3 text-xs">
        <div>
          <dt className="sr-only">{state.teams[0].name}</dt>
          <dd className="font-semibold tabular-nums">{pct(left)}%</dd>
        </div>
        <div className="text-center">
          <dt className="sr-only">Empate</dt>
          <dd className="tabular-nums text-muted-foreground">Empate {pct(draw)}%</dd>
        </div>
        <div className="text-right">
          <dt className="sr-only">{state.teams[1].name}</dt>
          <dd className="font-semibold tabular-nums">{pct(right)}%</dd>
        </div>
      </dl>
      <p className="text-xs text-muted-foreground">
        Referencia recreativa · confianza {confidence} · {sample} partidos de historial
      </p>
    </div>
  );
}

function FigureLine({ state }: { state: MatchState }) {
  const top = figure(state);
  return (
    <div className="flex min-h-12 items-center gap-2 border-t px-4 py-2 text-sm">
      {top ? (
        <>
          <TrophyIcon className="size-4 text-primary-text" aria-hidden="true" />
          <span className="min-w-0 truncate">
            Figura: <strong>{top.player.name}</strong>
          </span>
          <span className="ml-auto font-semibold tabular-nums">{top.average}</span>
        </>
      ) : (
        <span className="text-muted-foreground">
          La figura se conoce cuando voten {state.ratings.eligible - state.ratings.votes} más.
        </span>
      )}
    </div>
  );
}

function ClosingBar({
  dispatch,
  issues,
}: {
  dispatch: Dispatch;
  issues: (keyof typeof issueText)[];
}) {
  const ready = issues.length === 0;
  return (
    <div className="fixed inset-x-0 bottom-[calc(4.5rem+max(0.5rem,env(safe-area-inset-bottom)))] z-20 border-t bg-background px-4 py-3 md:static md:border-0 md:bg-transparent md:p-0">
      <div className="flex items-center gap-3">
        <p className="flex min-w-0 flex-1 items-start gap-2 text-xs text-muted-foreground">
          {ready ? (
            <CheckIcon className="size-4 shrink-0 text-success" aria-hidden="true" />
          ) : (
            <CircleAlertIcon className="size-4 shrink-0" aria-hidden="true" />
          )}
          <span>{ready ? "Todo listo para cerrar." : issueText[issues[0]!]}</span>
        </p>
        <Button disabled={!ready} onClick={() => closeMatch(dispatch)}>
          <LockKeyholeIcon data-icon="inline-start" aria-hidden="true" />
          Cerrar partido
        </Button>
      </div>
    </div>
  );
}

function Roster({ state, dispatch }: { state: MatchState; dispatch: Dispatch }) {
  const caps = capabilities(state);
  const [adding, setAdding] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 xl:grid-cols-2">
        {state.teams.map((team) => (
          <Card key={team.id} className="gap-0 py-0">
            <div className="flex min-h-12 items-center justify-between gap-2 border-b px-4">
              <h3 className="flex min-w-0 items-center gap-2 text-sm font-semibold">
                <TeamDot slot={team.slot} />
                <span className="truncate">{team.name}</span>
              </h3>
              <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                {team.players.length} jugadores
              </span>
            </div>
            {team.players.length === 0 ? (
              <p className="px-4 py-3 text-sm text-muted-foreground">Sin jugadores todavía.</p>
            ) : (
              <ul className="flex flex-col divide-y px-4">
                {team.players.map((player) => (
                  <li key={player.id} className="flex min-h-11 items-center justify-between gap-2">
                    <span className="truncate text-sm">{player.name}</span>
                    {caps.editable ? (
                      <PlayerMenu state={state} dispatch={dispatch} player={player} />
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
            {caps.editable ? (
              <div className="border-t px-4 py-2">
                {adding === team.id ? (
                  <div className="flex flex-col gap-2 py-1">
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
                    className="-ml-3"
                    onClick={() => setAdding(team.id)}
                  >
                    <UserPlusIcon data-icon="inline-start" aria-hidden="true" />
                    Sumar a {team.name}
                  </Button>
                )}
              </div>
            ) : null}
          </Card>
        ))}
      </div>
      <Absences state={state} dispatch={dispatch} />
    </div>
  );
}

function Planilla({ state, dispatch }: { state: MatchState; dispatch: Dispatch }) {
  const caps = capabilities(state);
  const editable = caps.editable && state.phase === "live";
  // Phone: name on its own line, the three counters under it. Wider: one row per player.
  const row =
    "grid grid-cols-3 items-center gap-x-2 gap-y-1 sm:grid-cols-[minmax(0,1fr)_repeat(3,7rem)]";
  const fields = [
    ["goals", "Goles"],
    ["assists", "Asistencias"],
    ["ownGoals", "En contra"],
  ] as const;
  return (
    <div className="flex flex-col gap-4">
      {state.teams.map((team) => (
        <Card key={team.id} className="gap-0 py-0">
          <h3 className="flex min-h-11 items-center gap-2 border-b bg-muted/40 px-4 text-sm font-semibold">
            <TeamDot slot={team.slot} />
            <span className="truncate">{team.name}</span>
          </h3>
          <div
            aria-hidden="true"
            className={cn(row, "min-h-9 border-b px-4 text-xs font-medium text-muted-foreground")}
          >
            <span className="hidden sm:block">Jugador</span>
            {fields.map(([field, label]) => (
              <span key={field} className="text-center">
                {label}
              </span>
            ))}
          </div>
          <ul className="flex flex-col divide-y">
            {team.players.map((player) => (
              <li key={player.id} className={cn(row, "px-4 py-2 sm:min-h-12 sm:py-1")}>
                <span className="col-span-3 truncate text-sm font-medium sm:col-span-1">
                  {player.name}
                </span>
                {fields.map(([field, label]) => (
                  <span key={field} className="flex justify-center">
                    <Stepper
                      label={`${label} de ${player.name}`}
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
            {editable || team.unattributed > 0 ? (
              <li className={cn(row, "px-4 py-2 sm:min-h-12 sm:py-1")}>
                <span className="col-span-3 text-sm text-muted-foreground sm:col-span-1">
                  Sin autor
                </span>
                <span className="flex justify-center">
                  <Stepper
                    label={`Goles sin autor de ${team.name}`}
                    value={team.unattributed}
                    readOnly={!editable}
                    onChange={(delta) => dispatch({ type: "unattributed", teamId: team.id, delta })}
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

function Caja({ state, dispatch }: { state: MatchState; dispatch: Dispatch }) {
  const cash = cashSummary(state);
  return (
    <div className="flex flex-col gap-4">
      <Card size="sm" className="py-0">
        <dl className="grid grid-cols-3 divide-x">
          {[
            { label: "Por jugador", value: formatMoney(cash.expected) },
            { label: "Juntado", value: formatMoney(cash.collected) },
            { label: "Falta", value: formatMoney(Math.max(0, cash.cost - cash.collected)) },
          ].map((item) => (
            <div key={item.label} className="flex flex-col gap-0.5 px-3 py-3">
              <dt className="text-xs font-medium text-muted-foreground">{item.label}</dt>
              <dd className="text-base font-semibold tabular-nums sm:text-lg">{item.value}</dd>
            </div>
          ))}
        </dl>
      </Card>
      <Card className="py-0">
        <CardContent className="py-1">
          <CashList state={state} dispatch={dispatch} />
        </CardContent>
      </Card>
    </div>
  );
}

function Notas({ state, dispatch }: { state: MatchState; dispatch: Dispatch }) {
  const pending = draftCount(state);
  const rated = Object.keys(state.ratings.mine).length > 0;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {state.ratings.revealed ? (
          <Badge variant="secondary">
            <EyeIcon aria-hidden="true" />
            Notas reveladas
          </Badge>
        ) : (
          <Badge variant="secondary">
            <LockIcon aria-hidden="true" />
            Votaron {state.ratings.votes} de {state.ratings.eligible}
          </Badge>
        )}
      </div>
      {!state.ratings.revealed ? (
        <p className="max-w-prose text-sm text-muted-foreground">
          Las notas son anónimas. Los promedios se revelan cuando vota la mayoría.
        </p>
      ) : null}
      <Card className="gap-0 py-0">
        <div className="grid divide-y xl:grid-cols-2 xl:divide-x xl:divide-y-0">
          {state.teams.map((team) => (
            <div key={team.id} className="flex min-w-0 flex-col px-4 py-2">
              <h3 className="flex min-h-10 items-center gap-2 text-sm font-semibold">
                <TeamDot slot={team.slot} />
                <span className="truncate">{team.name}</span>
              </h3>
              <ul className="flex flex-col divide-y">
                {team.players.map((player) => (
                  <li key={player.id} className="flex min-h-12 items-center justify-between gap-3">
                    <span className="truncate text-sm">{player.name}</span>
                    <span className="flex shrink-0 items-center gap-3">
                      {state.ratings.revealed && state.ratings.averages[player.id] ? (
                        <span className="text-sm font-semibold text-muted-foreground tabular-nums">
                          {state.ratings.averages[player.id]}
                        </span>
                      ) : null}
                      <RatingSelect state={state} dispatch={dispatch} player={player} />
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Card>
      <div className="flex flex-wrap items-center gap-3">
        <Button disabled={pending === 0} onClick={() => saveRatings(state, dispatch)}>
          {rated ? "Actualizar notas" : "Guardar notas"}
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

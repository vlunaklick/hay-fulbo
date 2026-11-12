"use client";

// PROTOTYPE ONLY — Variant 2 "Planilla": one ledger per team. The score is the sum of its rows,
// and you load a goal by tapping the scorer's number. No separate scoreboard, roster or closing sheet.

import { Badge } from "@hay-fulbo/ui/components/badge";
import { Button } from "@hay-fulbo/ui/components/button";
import { Card } from "@hay-fulbo/ui/components/card";
import { cn } from "@hay-fulbo/ui/lib/utils";
import {
  ArrowLeftIcon,
  CheckIcon,
  ChevronRightIcon,
  CircleAlertIcon,
  LockKeyholeIcon,
  Share2Icon,
  TrophyIcon,
  UserPlusIcon,
  WalletIcon,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { formatDate, formatMoney } from "@/lib/format";

import {
  capabilities,
  cashSummary,
  closureIssues,
  expectedShare,
  figure,
  issueText,
  kickoffLabel,
  payStatus,
  phaseLabel,
  teamScore,
  type Dispatch,
  type MatchState,
  type Player,
  type StatField,
  type Team,
} from "./data";
import {
  Absences,
  AddPlayers,
  CashSheet,
  closeMatch,
  draftCount,
  InviteMenu,
  MatchMenu,
  PayBadge,
  PaymentActions,
  PlayerMenu,
  RatingSelect,
  saveRatings,
  ScorekeeperSelect,
  shareResult,
  Stepper,
  TeamDot,
} from "./shared";

export function VariantPlanilla({ state, dispatch }: { state: MatchState; dispatch: Dispatch }) {
  const caps = capabilities(state);
  const cash = cashSummary(state);
  const issues = closureIssues(state);
  const [cashOpen, setCashOpen] = useState(false);
  const [left, right] = state.teams;
  const scores = [teamScore(state, left), teamScore(state, right)] as const;
  const pending = draftCount(state);
  const bar =
    (caps.editable && state.phase === "live") || (state.phase === "closed" && pending > 0);

  return (
    <div className={cn("flex flex-col gap-6", bar && "pb-20 md:pb-16")}>
      <div className="flex flex-col gap-3">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 w-fit text-muted-foreground"
          nativeButton={false}
          render={<Link href="/dashboard/partidos" />}
        >
          <ArrowLeftIcon data-icon="inline-start" aria-hidden="true" />
          Partidos
        </Button>
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="text-2xl font-bold tracking-tight">
              {sentence(formatDate(state.scheduledAt))}
            </h1>
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
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
              <span className="min-w-0 truncate">{state.court.name}</span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
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
            <Button
              size="sm"
              variant="ghost"
              className="text-muted-foreground"
              onClick={() => setCashOpen(true)}
            >
              <WalletIcon data-icon="inline-start" aria-hidden="true" />
              <span className="tabular-nums">
                {cash.settled}/{cash.total} pagaron
              </span>
            </Button>
            <MatchMenu state={state} dispatch={dispatch} />
          </div>
        </header>
      </div>

      {state.phase === "cancelled" ? (
        <p className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
          Partido cancelado. No aporta resultados ni deuda.
        </p>
      ) : null}

      {state.phase === "upcoming" ? (
        <p className="text-sm text-muted-foreground">
          {kickoffLabel(state)} · Cómo llegan: empate {Math.round(state.parity.draw * 100)}%,
          confianza {state.parity.confidence} ({state.parity.sample} partidos)
        </p>
      ) : null}

      {state.phase === "live" ? (
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-sm">
          <p className="text-muted-foreground">
            {caps.canScore
              ? "Tocá el número de un jugador para sumarle un gol o una asistencia."
              : `Carga ${state.scorekeeper ?? "el organizador"}.`}
          </p>
          {caps.manager ? (
            <span className="flex w-full items-center gap-3 sm:w-64">
              <span className="shrink-0 text-xs font-medium text-muted-foreground">Planillero</span>
              <ScorekeeperSelect state={state} dispatch={dispatch} />
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2 lg:items-start">
        {state.teams.map((team, index) => (
          <Ledger
            key={team.id}
            state={state}
            dispatch={dispatch}
            team={team}
            score={scores[index]!}
            rivalScore={scores[1 - index]!}
            chance={index === 0 ? state.parity.left : state.parity.right}
          />
        ))}
      </div>

      <Absences state={state} dispatch={dispatch} />

      {state.phase === "closed" ? <FigureNote state={state} /> : null}

      {bar ? (
        <div className="fixed inset-x-0 bottom-[calc(4.5rem+max(0.5rem,env(safe-area-inset-bottom)))] z-20 border-t bg-background px-4 py-3 md:sticky md:bottom-6 md:rounded-lg md:border md:px-4">
          {caps.editable && state.phase === "live" ? (
            <div className="flex items-center gap-3">
              <p className="flex min-w-0 flex-1 items-start gap-2 text-xs text-muted-foreground">
                {issues.length === 0 ? (
                  <CheckIcon className="size-4 shrink-0 text-success" aria-hidden="true" />
                ) : (
                  <CircleAlertIcon className="size-4 shrink-0" aria-hidden="true" />
                )}
                <span>
                  {issues.length === 0
                    ? `Todo listo · ${cash.settled} de ${cash.total} pagaron`
                    : issueText[issues[0]!]}
                </span>
              </p>
              <Button disabled={issues.length > 0} onClick={() => closeMatch(dispatch)}>
                <LockKeyholeIcon data-icon="inline-start" aria-hidden="true" />
                Cerrar partido
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                {pending === 1 ? "1 nota sin guardar" : `${pending} notas sin guardar`}
              </p>
              <Button onClick={() => saveRatings(state, dispatch)}>Guardar notas</Button>
            </div>
          )}
        </div>
      ) : null}

      <CashSheet state={state} dispatch={dispatch} open={cashOpen} onOpenChange={setCashOpen} />
    </div>
  );
}

function Ledger({
  state,
  dispatch,
  team,
  score,
  rivalScore,
  chance,
}: {
  state: MatchState;
  dispatch: Dispatch;
  team: Team;
  score: number;
  rivalScore: number;
  chance: number;
}) {
  const caps = capabilities(state);
  const [open, setOpen] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const expected = expectedShare(state);
  const played = state.phase === "live" || state.phase === "closed";
  const rating = state.phase === "closed";
  const tapToScore = caps.canScore && state.phase === "live";
  const paid = team.players.filter((row) => row.paid >= expected).length;
  const cols = cn(
    "grid items-center gap-1",
    played
      ? rating
        ? "grid-cols-[minmax(0,1fr)_repeat(3,2.25rem)_5.25rem]"
        : "grid-cols-[minmax(0,1fr)_repeat(3,2.75rem)]"
      : "grid-cols-[minmax(0,1fr)_auto]",
  );
  const won = state.phase === "closed" && score > rivalScore;

  return (
    <Card className="gap-0 py-0">
      <section aria-label={team.name}>
        <header className="flex items-start justify-between gap-3 px-4 pt-4 pb-3">
          <div className="flex min-w-0 flex-col gap-1">
            <h2 className="flex min-w-0 items-center gap-2 text-base font-semibold">
              <TeamDot slot={team.slot} className="size-2.5" />
              <span className="truncate">{team.name}</span>
            </h2>
            <p className="text-xs text-muted-foreground tabular-nums">
              {team.players.length} jugadores · {paid}/{team.players.length} pagaron
            </p>
          </div>
          {played ? (
            <div className="flex shrink-0 flex-col items-end gap-1">
              <output
                aria-label={`Goles de ${team.name}`}
                className={cn(
                  "text-5xl leading-none font-black tabular-nums",
                  state.phase === "closed" && !won && "text-muted-foreground",
                )}
              >
                {score}
              </output>
              {won ? <Badge variant="success">Ganó</Badge> : null}
            </div>
          ) : (
            <div className="flex shrink-0 flex-col items-end">
              <span className="text-2xl font-bold tabular-nums">{Math.round(chance * 100)}%</span>
              <span className="text-xs text-muted-foreground">chances</span>
            </div>
          )}
        </header>

        <div
          className={cn(
            cols,
            "min-h-9 border-y bg-muted/40 px-4 text-xs font-medium text-muted-foreground",
          )}
        >
          <span>Jugador</span>
          {played ? (
            <>
              <abbr title="Goles" className="text-center no-underline">
                G
              </abbr>
              <abbr title="Asistencias" className="text-center no-underline">
                A
              </abbr>
              <abbr title="En contra" className="text-center no-underline">
                EC
              </abbr>
              {rating ? (
                <span className="text-center">
                  {state.ratings.revealed ? "Promedio" : "Tu nota"}
                </span>
              ) : null}
            </>
          ) : (
            <span className="text-right">Aporte</span>
          )}
        </div>

        <ul className="flex flex-col divide-y">
          {team.players.map((player) => (
            <Row
              key={player.id}
              state={state}
              dispatch={dispatch}
              player={player}
              cols={cols}
              expanded={open === player.id}
              onToggle={() => setOpen((current) => (current === player.id ? null : player.id))}
              tapToScore={tapToScore}
            />
          ))}
          {played && (tapToScore || team.unattributed > 0) ? (
            <li className={cn(cols, "min-h-12 px-4")}>
              <span className="text-sm text-muted-foreground">Sin autor</span>
              <StatCell
                label={`gol sin autor de ${team.name}`}
                value={team.unattributed}
                tap={tapToScore}
                onTap={() => {
                  dispatch({ type: "unattributed", teamId: team.id, delta: 1 });
                  toast.success(`Gol sin autor · ${team.name}`, {
                    action: {
                      label: "Deshacer",
                      onClick: () => dispatch({ type: "unattributed", teamId: team.id, delta: -1 }),
                    },
                  });
                }}
              />
            </li>
          ) : null}
        </ul>

        {caps.editable ? (
          <div className="border-t px-4 py-2">
            {adding ? (
              <div className="flex flex-col gap-2 py-1">
                <AddPlayers state={state} dispatch={dispatch} team={team} />
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-fit"
                  onClick={() => setAdding(false)}
                >
                  Listo
                </Button>
              </div>
            ) : (
              <Button size="sm" variant="ghost" className="-ml-3" onClick={() => setAdding(true)}>
                <UserPlusIcon data-icon="inline-start" aria-hidden="true" />
                Sumar jugador
              </Button>
            )}
          </div>
        ) : null}
      </section>
    </Card>
  );
}

function Row({
  state,
  dispatch,
  player,
  cols,
  expanded,
  onToggle,
  tapToScore,
}: {
  state: MatchState;
  dispatch: Dispatch;
  player: Player;
  cols: string;
  expanded: boolean;
  onToggle: () => void;
  tapToScore: boolean;
}) {
  const caps = capabilities(state);
  const expected = expectedShare(state);
  const played = state.phase === "live" || state.phase === "closed";
  const status = payStatus(player.paid, expected);
  const top = figure(state);
  const detailId = `row-${player.id}`;
  const expandable = caps.editable || (state.role === "organizer" && state.phase === "closed");

  function tap(field: StatField, label: string) {
    dispatch({ type: "stat", playerId: player.id, field, delta: 1 });
    toast.success(`${label}: ${player.name}`, {
      action: {
        label: "Deshacer",
        onClick: () => dispatch({ type: "stat", playerId: player.id, field, delta: -1 }),
      },
    });
  }

  const name = (
    <span className="flex min-w-0 flex-col items-start">
      <span className="flex max-w-full items-center gap-1.5 text-sm font-medium">
        <span className="truncate">{player.name}</span>
        {top?.player.id === player.id ? (
          <>
            <TrophyIcon className="size-3.5 shrink-0 text-primary-text" aria-hidden="true" />
            <span className="sr-only">(figura)</span>
          </>
        ) : null}
      </span>
      {played && status !== "paid" ? (
        <span
          className={cn(
            "text-xs tabular-nums",
            status === "pending" ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {status === "pending"
            ? `Debe ${formatMoney(expected)}`
            : `Pagó ${formatMoney(player.paid)}`}
        </span>
      ) : null}
    </span>
  );

  return (
    <li>
      <div className={cn(cols, "min-h-12 px-4")}>
        {expandable ? (
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls={detailId}
            onClick={onToggle}
            className="-ml-2 flex min-h-11 min-w-0 items-center gap-1 rounded-md px-2 text-left outline-none hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <ChevronRightIcon
              aria-hidden="true"
              className={cn(
                "size-4 shrink-0 text-muted-foreground transition-transform duration-150",
                expanded && "rotate-90",
              )}
            />
            {name}
          </button>
        ) : (
          <span className="flex min-h-11 items-center">{name}</span>
        )}
        {played ? (
          <>
            <StatCell
              label={`gol a ${player.name}`}
              value={player.goals}
              tap={tapToScore}
              onTap={() => tap("goals", "Gol")}
            />
            <StatCell
              label={`asistencia a ${player.name}`}
              value={player.assists}
              tap={tapToScore}
              onTap={() => tap("assists", "Asistencia")}
            />
            <StatCell label={`en contra de ${player.name}`} value={player.ownGoals} />
            {state.phase === "closed" ? (
              <span className="flex justify-center">
                {state.ratings.revealed ? (
                  <span className="text-sm font-semibold tabular-nums">
                    {state.ratings.averages[player.id] ?? "—"}
                  </span>
                ) : (
                  <RatingSelect
                    state={state}
                    dispatch={dispatch}
                    player={player}
                    className="w-full"
                  />
                )}
              </span>
            ) : null}
          </>
        ) : (
          <span className="flex justify-end">
            <PayBadge paid={player.paid} expected={expected} />
          </span>
        )}
      </div>

      {expanded ? (
        <div
          id={detailId}
          className="flex flex-col gap-3 border-t border-dashed bg-muted/30 px-4 py-3"
        >
          {played && caps.editable ? (
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  ["goals", "Goles"],
                  ["assists", "Asist."],
                  ["ownGoals", "En contra"],
                ] as const
              ).map(([field, label]) => (
                <div key={field} className="flex flex-col items-center gap-1">
                  <span className="text-xs font-medium text-muted-foreground">{label}</span>
                  <Stepper
                    label={`${label} de ${player.name}`}
                    value={player[field]}
                    onChange={(delta) =>
                      dispatch({ type: "stat", playerId: player.id, field, delta })
                    }
                  />
                </div>
              ))}
            </div>
          ) : null}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-sm tabular-nums">
              <PayBadge paid={player.paid} expected={expected} />
              <span className="text-muted-foreground">
                {formatMoney(player.paid)} de {formatMoney(expected)}
              </span>
            </span>
            <span className="flex items-center">
              <PaymentActions
                state={state}
                dispatch={dispatch}
                id={player.id}
                name={player.name}
                paid={player.paid}
              />
              {caps.editable ? (
                <PlayerMenu state={state} dispatch={dispatch} player={player} />
              ) : null}
            </span>
          </div>
        </div>
      ) : null}
    </li>
  );
}

function StatCell({
  label,
  value,
  tap,
  onTap,
}: {
  label: string;
  value: number;
  tap?: boolean;
  onTap?: () => void;
}) {
  if (tap && onTap) {
    return (
      <Button
        aria-label={`Sumar ${label} (${value})`}
        variant="ghost"
        size="icon"
        className={cn(
          "mx-auto bg-muted/50 text-sm font-semibold tabular-nums",
          value === 0 && "font-normal text-muted-foreground",
        )}
        onClick={onTap}
      >
        {value}
      </Button>
    );
  }
  return (
    <span
      className={cn(
        "text-center text-sm tabular-nums",
        value === 0 ? "text-muted-foreground" : "font-semibold",
      )}
    >
      <span className="sr-only">{label}: </span>
      {value}
    </span>
  );
}

function FigureNote({ state }: { state: MatchState }) {
  const top = figure(state);
  return (
    <p className="flex items-center gap-2 text-sm text-muted-foreground">
      <TrophyIcon className="size-4 shrink-0" aria-hidden="true" />
      {top
        ? `Figura: ${top.player.name} · ${top.average}`
        : `Votaron ${state.ratings.votes} de ${state.ratings.eligible}. Los promedios y la figura se revelan cuando vota la mayoría; las notas son anónimas.`}
    </p>
  );
}

function sentence(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

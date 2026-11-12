"use client";

// PROTOTYPE ONLY — "Portada": editorial front page. A figure, short podiums, drill-down on demand.
import type { StatsAggregate, StatsDashboard, StatsSociety } from "@hay-fulbo/db/stats/types";
import { Button } from "@hay-fulbo/ui/components/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@hay-fulbo/ui/components/card";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@hay-fulbo/ui/components/sheet";
import { cn } from "@hay-fulbo/ui/lib/utils";
import { ArrowLeftIcon, ChevronRightIcon, TrophyIcon, UsersRoundIcon } from "lucide-react";
import { useState } from "react";

import {
  ArchivedBadge,
  EmptyRow,
  firstName,
  formatPercent,
  formatRate,
  MatchRows,
  minPlayed,
  MoreFilters,
  PeriodTabs,
  periodLabel,
  signed,
  useIsDesktop,
  usePlayerPeek,
  type VariantProps,
} from "./shared";

type Board = {
  key: string;
  title: string;
  description: (dashboard: StatsDashboard) => string;
  value: (row: StatsAggregate) => number;
  display: (row: StatsAggregate) => string;
  unit: string;
  eligible?: (row: StatsAggregate, dashboard: StatsDashboard) => boolean;
};

const BOARDS: Board[] = [
  {
    key: "goles",
    title: "Goleadores",
    description: () => "Goles atribuidos",
    value: (row) => row.goals,
    display: (row) => String(row.goals),
    unit: "goles",
  },
  {
    key: "asistencias",
    title: "Asistidores",
    description: () => "Pases de gol",
    value: (row) => row.assists,
    display: (row) => String(row.assists),
    unit: "asist.",
  },
  {
    key: "efectividad",
    title: "Más ganadores",
    description: (dashboard) => `Mínimo ${minPlayed(dashboard)} partidos`,
    value: (row) => row.winPercentage,
    display: (row) => formatPercent(row.winPercentage),
    unit: "ganados",
    eligible: (row, dashboard) => row.played >= minPlayed(dashboard),
  },
  {
    key: "nota",
    title: "Mejor nota",
    description: () => "Promedio de las votaciones",
    value: (row) => row.ratingAverage ?? 0,
    display: (row) => (row.ratingAverage === null ? "—" : formatRate(row.ratingAverage)),
    unit: "promedio",
    eligible: (row) => row.ratingAverage !== null,
  },
];

const GA_BOARD: Board = {
  key: "ga",
  title: "Ranking G+A",
  description: () => "Goles más asistencias",
  value: (row) => row.contributions,
  display: (row) => String(row.contributions),
  unit: "G+A",
};

function sortBoard(board: Board, dashboard: StatsDashboard) {
  return dashboard.ranking
    .filter((row) => (board.eligible ? board.eligible(row, dashboard) : true))
    .toSorted((left, right) => board.value(right) - board.value(left));
}

export function PortadaVariant(props: VariantProps) {
  return props.screen === "sociedades" ? <SociedadesPortada {...props} /> : <Front {...props} />;
}

function Front(props: VariantProps) {
  const { dashboard } = props;
  const [board, setBoard] = useState<Board | null>(null);
  const [allMatches, setAllMatches] = useState(false);
  const peek = usePlayerPeek();
  const figure = dashboard.ranking[0] ?? null;
  const runnerUp = dashboard.ranking[1] ?? null;
  const duo = dashboard.societies[0] ?? null;

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Estadísticas</h1>
          <p className="text-sm text-muted-foreground">
            {dashboard.group.name} · {periodLabel(props.filters.period)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PeriodTabs filters={props.filters} setFilter={props.setFilter} />
          <MoreFilters
            dashboard={dashboard}
            filters={props.filters}
            iconOnly
            resetFilters={props.resetFilters}
            setFilter={props.setFilter}
          />
        </div>
      </header>

      {!figure ? (
        <EmptyRow
          icon={<TrophyIcon />}
          title="El salón todavía está vacío"
          description="Cerrá el primer partido del período para descubrir a la figura."
        />
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <section aria-labelledby="figura-title">
              <Card className="h-full gap-5 rounded-xl px-5 py-5 sm:px-6">
                <p id="figura-title" className="text-xs font-medium text-muted-foreground">
                  La figura · {periodLabel(props.filters.period)}
                </p>
                <div className="flex items-end justify-between gap-4">
                  <h2 className="min-w-0 text-2xl font-bold tracking-tight text-balance sm:text-3xl">
                    {figure.displayName}
                  </h2>
                  <p className="shrink-0 text-right">
                    <span className="block text-5xl font-black leading-none tabular-nums sm:text-6xl">
                      {figure.contributions}
                    </span>
                    <span className="text-xs font-medium text-muted-foreground">G+A</span>
                  </p>
                </div>
                <p className="max-w-prose text-sm text-muted-foreground text-pretty">
                  <span className="text-foreground tabular-nums">
                    {figure.goals} goles y {figure.assists} asistencias
                  </span>{" "}
                  en {figure.played} partidos, {formatRate(figure.contributionsPerMatch)} por
                  partido.
                  {runnerUp ? (
                    <>
                      {" "}
                      {figure.contributions === runnerUp.contributions
                        ? `Empatado con ${runnerUp.displayName}.`
                        : `Le saca ${figure.contributions - runnerUp.contributions} a ${runnerUp.displayName}.`}
                    </>
                  ) : null}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => peek(figure.playerId)} variant="secondary">
                    Ver su ficha
                  </Button>
                  <Button onClick={() => setBoard(GA_BOARD)} variant="ghost">
                    Ranking completo
                    <ChevronRightIcon data-icon="inline-end" aria-hidden="true" />
                  </Button>
                </div>
              </Card>
            </section>

            <section aria-label="Resumen del período" className="flex flex-col gap-4">
              <Card size="sm" className="py-0">
                <dl className="grid grid-cols-3 divide-x">
                  <Metric label="Partidos" value={dashboard.summary.matchesPlayed} />
                  <Metric label="Goles" value={dashboard.summary.totalGoals} />
                  <Metric label="Por partido" value={formatRate(dashboard.summary.goalsPerMatch)} />
                </dl>
              </Card>
              {duo ? (
                <Card size="sm" className="flex-1">
                  <CardHeader>
                    <CardTitle>
                      <h2>La sociedad</h2>
                    </CardTitle>
                    <CardDescription>La dupla que más suma junta</CardDescription>
                    <CardAction>
                      <Button
                        onClick={() => props.setScreen("sociedades")}
                        size="sm"
                        variant="ghost"
                      >
                        Ver duplas
                      </Button>
                    </CardAction>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-1">
                    <p className="text-lg font-semibold text-balance">
                      {duo.playerNames[0]} <span className="text-muted-foreground">+</span>{" "}
                      {duo.playerNames[1]}
                    </p>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {duo.points} pts · {duo.wins} de {duo.played} ganados ·{" "}
                      {formatPercent(duo.winPercentage)} · DG {signed(duo.goalDifference)}
                    </p>
                  </CardContent>
                </Card>
              ) : null}
            </section>
          </div>

          <section aria-labelledby="podios-title" className="flex flex-col gap-4">
            <h2 id="podios-title" className="text-base font-semibold">
              Podios
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              {BOARDS.map((item) => (
                <Podium
                  key={item.key}
                  board={item}
                  dashboard={dashboard}
                  onAll={() => setBoard(item)}
                />
              ))}
            </div>
          </section>

          <section aria-labelledby="resultados-title" className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <h2 id="resultados-title" className="text-base font-semibold">
                Últimos resultados
              </h2>
              {dashboard.history.length > 4 ? (
                <Button onClick={() => setAllMatches(true)} size="sm" variant="ghost">
                  Ver los {dashboard.history.length}
                </Button>
              ) : null}
            </div>
            {dashboard.history.length ? (
              <Card className="py-0">
                <MatchRows dashboard={dashboard} limit={4} />
              </Card>
            ) : (
              <p className="text-sm text-muted-foreground">No hay partidos con estos filtros.</p>
            )}
          </section>
        </>
      )}

      <BoardSheet
        board={board}
        dashboard={dashboard}
        onClose={() => setBoard(null)}
        period={props.filters.period}
      />
      <MatchesSheet dashboard={dashboard} onClose={() => setAllMatches(false)} open={allMatches} />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 px-4 py-3">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-lg font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

function Podium({
  board,
  dashboard,
  onAll,
}: {
  board: Board;
  dashboard: StatsDashboard;
  onAll: () => void;
}) {
  const peek = usePlayerPeek();
  const rows = sortBoard(board, dashboard);
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>
          <h3>{board.title}</h3>
        </CardTitle>
        <CardDescription>{board.description(dashboard)}</CardDescription>
        {rows.length > 3 ? (
          <CardAction>
            <Button onClick={onAll} size="sm" variant="ghost">
              Ver los {rows.length}
            </Button>
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nadie llega al mínimo todavía.</p>
        ) : (
          <ol className="-mx-2 flex flex-col">
            {rows.slice(0, 3).map((row, index) => (
              <li key={row.playerId}>
                <button
                  className="flex min-h-11 w-full items-center gap-3 rounded-md px-2 py-1.5 text-left transition-colors duration-150 ease-out hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                  onClick={() => peek(row.playerId)}
                  type="button"
                >
                  <span
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums",
                      index === 0
                        ? "bg-foreground text-background"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {index + 1}
                  </span>
                  <span
                    className={cn(
                      "min-w-0 flex-1 truncate",
                      index === 0 ? "font-semibold" : "font-medium",
                    )}
                  >
                    {row.displayName}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                    <span className="text-sm font-semibold text-foreground">
                      {board.display(row)}
                    </span>{" "}
                    {board.unit}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

function BoardSheet({
  board,
  dashboard,
  onClose,
  period,
}: {
  board: Board | null;
  dashboard: StatsDashboard;
  onClose: () => void;
  period: string;
}) {
  const desktop = useIsDesktop();
  const peek = usePlayerPeek();
  const rows = board ? sortBoard(board, dashboard) : [];
  return (
    <Sheet open={board !== null} onOpenChange={(open) => (open ? null : onClose())}>
      <SheetContent side={desktop ? "right" : "bottom"} className="max-h-[90dvh] sm:max-w-md">
        {board ? (
          <>
            <SheetHeader>
              <SheetTitle>{board.title}</SheetTitle>
              <SheetDescription>
                {board.description(dashboard)} · {periodLabel(period)}
              </SheetDescription>
            </SheetHeader>
            <SheetBody className="px-2 py-2">
              <ol className="flex flex-col">
                {rows.map((row, index) => (
                  <li key={row.playerId}>
                    <button
                      className="flex min-h-12 w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors duration-150 ease-out hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                      onClick={() => peek(row.playerId)}
                      type="button"
                    >
                      <span className="w-5 shrink-0 text-xs text-muted-foreground tabular-nums">
                        {index + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate font-medium">{row.displayName}</span>
                          <ArchivedBadge player={row} />
                        </span>
                        <span className="block text-xs text-muted-foreground tabular-nums">
                          {row.played} PJ · {row.goals} G · {row.assists} A · {row.wins}-{row.draws}
                          -{row.losses}
                        </span>
                      </span>
                      <span className="shrink-0 text-right text-base font-semibold tabular-nums">
                        {board.display(row)}
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
            </SheetBody>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function MatchesSheet({
  dashboard,
  onClose,
  open,
}: {
  dashboard: StatsDashboard;
  onClose: () => void;
  open: boolean;
}) {
  const desktop = useIsDesktop();
  return (
    <Sheet open={open} onOpenChange={(next) => (next ? null : onClose())}>
      <SheetContent side={desktop ? "right" : "bottom"} className="max-h-[90dvh] sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Resultados</SheetTitle>
          <SheetDescription className="tabular-nums">
            {dashboard.summary.totalGoals} goles · {formatRate(dashboard.summary.goalsPerMatch)} por
            partido
          </SheetDescription>
        </SheetHeader>
        <SheetBody className="px-0 py-0">
          <MatchRows dashboard={dashboard} />
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}

/* ───────────────────────── /sociedades ───────────────────────── */

function SociedadesPortada(props: VariantProps) {
  const { dashboard } = props;
  const [limit, setLimit] = useState(10);
  const societies = dashboard.societies;
  const leader = societies[0] ?? null;
  const cold = coldest(societies);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <Button
          className="-ml-3 w-fit"
          onClick={() => props.setScreen("estadisticas")}
          size="sm"
          variant="ghost"
        >
          <ArrowLeftIcon data-icon="inline-start" aria-hidden="true" />
          Estadísticas
        </Button>
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Sociedades</h1>
          <p className="text-sm text-muted-foreground text-pretty">
            Las parejas que mejor funcionan cuando comparten equipo. Mínimo 2 partidos juntos.
          </p>
        </header>
      </div>

      {!leader ? (
        <EmptyRow
          icon={<UsersRoundIcon />}
          title="Todavía no hay sociedades"
          description="Se necesitan al menos dos partidos cerrados con la misma pareja en un equipo."
        />
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <Card className="gap-5 rounded-xl px-5 py-5 sm:px-6">
              <p className="text-xs font-medium text-muted-foreground">La sociedad líder</p>
              <div className="flex items-end justify-between gap-4">
                <h2 className="min-w-0 text-2xl font-bold tracking-tight text-balance">
                  {leader.playerNames[0]}
                  <span className="block text-muted-foreground">+ {leader.playerNames[1]}</span>
                </h2>
                <p className="shrink-0 text-right">
                  <span className="block text-5xl font-black leading-none tabular-nums">
                    {leader.points}
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">puntos</span>
                </p>
              </div>
              <p className="text-sm text-muted-foreground text-pretty">
                Juntos ganaron{" "}
                <span className="text-foreground tabular-nums">
                  {leader.wins} de {leader.played}
                </span>{" "}
                ({formatPercent(leader.winPercentage)}), con diferencia de gol{" "}
                {signed(leader.goalDifference)} y {leader.contributions} G+A entre los dos.
              </p>
            </Card>
            {cold ? (
              <Card size="sm">
                <CardHeader>
                  <CardTitle>
                    <h2>La que no arranca</h2>
                  </CardTitle>
                  <CardDescription>Menor efectividad con al menos 4 PJ juntos</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-1">
                  <p className="text-base font-semibold text-balance">
                    {cold.playerNames[0]} <span className="text-muted-foreground">+</span>{" "}
                    {cold.playerNames[1]}
                  </p>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {cold.wins} de {cold.played} ganados · {formatPercent(cold.winPercentage)} · DG{" "}
                    {signed(cold.goalDifference)}
                  </p>
                </CardContent>
              </Card>
            ) : null}
          </div>

          <section aria-labelledby="duplas-title" className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between gap-2">
              <h2 id="duplas-title" className="text-base font-semibold">
                Todas las duplas
              </h2>
              <span className="text-xs text-muted-foreground tabular-nums">
                {societies.length} parejas
              </span>
            </div>
            <Card className="py-0">
              <ol className="flex flex-col divide-y">
                {societies.slice(0, limit).map((society, index) => (
                  <li
                    key={society.playerIds.join(":")}
                    className="flex min-h-14 items-center gap-3 px-4 py-2.5"
                  >
                    <span className="w-6 shrink-0 text-xs text-muted-foreground tabular-nums">
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">
                        {firstName(society.playerNames[0])}{" "}
                        <span className="text-muted-foreground">+</span>{" "}
                        {firstName(society.playerNames[1])}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground tabular-nums">
                        {society.played} PJ · {society.wins}-{society.draws}-{society.losses} ·{" "}
                        {formatPercent(society.winPercentage)}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block text-base font-semibold tabular-nums">
                        {society.points}
                      </span>
                      <span className="block text-xs text-muted-foreground">pts</span>
                    </span>
                  </li>
                ))}
              </ol>
            </Card>
            {societies.length > limit ? (
              <Button
                className="self-start"
                onClick={() => setLimit((value) => value + 20)}
                variant="ghost"
              >
                Ver más ({societies.length - limit})
              </Button>
            ) : null}
          </section>
        </>
      )}
    </div>
  );
}

function coldest(societies: StatsSociety[]) {
  return (
    societies
      .filter((row) => row.played >= 4)
      .toSorted(
        (left, right) =>
          left.winPercentage - right.winPercentage || left.goalDifference - right.goalDifference,
      )[0] ?? null
  );
}

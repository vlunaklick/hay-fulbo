"use client";

// PROTOTYPE ONLY — "Tabla viva": one ranking, re-sorted by a metric switch. Sociedades is a metric.
import type { StatsAggregate, StatsDashboard, StatsSociety } from "@hay-fulbo/db/stats/types";
import { Button } from "@hay-fulbo/ui/components/button";
import { Card } from "@hay-fulbo/ui/components/card";
import { cn } from "@hay-fulbo/ui/lib/utils";
import { ChevronDownIcon, TrophyIcon, UsersRoundIcon } from "lucide-react";
import { useState } from "react";

import {
  ArchivedBadge,
  bestPartner,
  EmptyRow,
  formatPercent,
  formatRate,
  MatchRows,
  minPlayed,
  MoreFilters,
  PeriodTabs,
  signed,
  type VariantProps,
} from "./shared";

type MetricKey = "ga" | "goles" | "asistencias" | "efectividad" | "nota" | "duplas";

type PlayerMetric = {
  key: Exclude<MetricKey, "duplas">;
  label: string;
  unit: string;
  caption: (dashboard: StatsDashboard) => string;
  value: (row: StatsAggregate) => number | null;
  display: (row: StatsAggregate) => string;
  detail: (row: StatsAggregate) => string;
  eligible?: (row: StatsAggregate, dashboard: StatsDashboard) => boolean;
  scale?: "leader" | "percent";
};

const PLAYER_METRICS: PlayerMetric[] = [
  {
    key: "ga",
    label: "G+A",
    unit: "G+A",
    caption: () => "Goles más asistencias",
    value: (row) => row.contributions,
    display: (row) => String(row.contributions),
    detail: (row) => `${row.goals} G · ${row.assists} A · ${row.played} PJ`,
  },
  {
    key: "goles",
    label: "Goles",
    unit: "goles",
    caption: () => "Sin autogoles ni goles sin autor",
    value: (row) => row.goals,
    display: (row) => String(row.goals),
    detail: (row) => `${formatRate(row.goalsPerMatch)} por partido · ${row.played} PJ`,
  },
  {
    key: "asistencias",
    label: "Asistencias",
    unit: "asist.",
    caption: () => "Pases de gol registrados",
    value: (row) => row.assists,
    display: (row) => String(row.assists),
    detail: (row) => `${formatRate(row.assistsPerMatch)} por partido · ${row.played} PJ`,
  },
  {
    key: "efectividad",
    label: "Efectividad",
    unit: "ganados",
    caption: (dashboard) => `Partidos ganados · mínimo ${minPlayed(dashboard)} PJ`,
    value: (row) => row.winPercentage,
    display: (row) => formatPercent(row.winPercentage),
    detail: (row) => `${row.wins}G ${row.draws}E ${row.losses}P · DG ${signed(row.goalDifference)}`,
    eligible: (row, dashboard) => row.played >= minPlayed(dashboard),
    scale: "percent",
  },
  {
    key: "nota",
    label: "Nota",
    unit: "promedio",
    caption: () => "Promedio de los partidos con votación",
    value: (row) => row.ratingAverage,
    display: (row) => (row.ratingAverage === null ? "—" : formatRate(row.ratingAverage)),
    detail: (row) =>
      `${row.ratingMatchCount} ${row.ratingMatchCount === 1 ? "partido" : "partidos"} con nota`,
    eligible: (row) => row.ratingAverage !== null,
  },
];

const METRIC_ORDER: { key: MetricKey; label: string }[] = [
  ...PLAYER_METRICS.map(({ key, label }) => ({ key, label })),
  { key: "duplas", label: "Duplas" },
];

export function TablaVariant(props: VariantProps) {
  const { dashboard, screen, setScreen } = props;
  const [chosen, setChosen] = useState<Exclude<MetricKey, "duplas">>("ga");
  const metric: MetricKey = screen === "sociedades" ? "duplas" : chosen;
  const nothingYet = dashboard.ranking.length === 0 && dashboard.history.length === 0;

  const pick = (key: MetricKey) => {
    if (key === "duplas") {
      setScreen("sociedades");
      return;
    }
    setChosen(key);
    if (screen !== "estadisticas") setScreen("estadisticas");
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Estadísticas</h1>
        <p className="text-sm text-muted-foreground tabular-nums">
          {dashboard.summary.matchesPlayed} partidos cerrados · {dashboard.summary.totalGoals} goles
          · {formatRate(dashboard.summary.goalsPerMatch)} por partido
        </p>
      </header>

      <div className="flex items-center justify-between gap-2 md:justify-start">
        <PeriodTabs filters={props.filters} setFilter={props.setFilter} />
        <MoreFilters
          dashboard={dashboard}
          filters={props.filters}
          iconOnly
          resetFilters={props.resetFilters}
          setFilter={props.setFilter}
        />
      </div>

      {nothingYet ? (
        <EmptyRow
          icon={<TrophyIcon />}
          title="Todavía no hay tabla"
          description="Cuando cierren un partido en este período aparece el ranking."
        />
      ) : (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
          <section aria-labelledby="tabla-title" className="flex min-w-0 flex-col gap-3">
            <h2 id="tabla-title" className="sr-only">
              Ranking
            </h2>
            <div
              aria-label="Ordenar por"
              className="-mx-4 flex snap-x gap-1 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:px-0"
              role="group"
            >
              {METRIC_ORDER.map((item) => (
                <Button
                  key={item.key}
                  ref={metric === item.key ? revealChip : undefined}
                  aria-pressed={metric === item.key}
                  className={cn(
                    "snap-start rounded-full",
                    metric === item.key ? "" : "text-muted-foreground",
                  )}
                  onClick={() => pick(item.key)}
                  size="sm"
                  variant={metric === item.key ? "secondary" : "ghost"}
                >
                  {item.label}
                </Button>
              ))}
            </div>
            {metric === "duplas" ? (
              <DuplasList societies={dashboard.societies} />
            ) : (
              <PlayerList
                dashboard={dashboard}
                metric={PLAYER_METRICS.find((m) => m.key === metric)!}
              />
            )}
          </section>

          <section aria-labelledby="ultimos-title" className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between gap-2">
              <h2 id="ultimos-title" className="text-base font-semibold">
                Últimos partidos
              </h2>
              <span className="text-xs text-muted-foreground tabular-nums">
                {dashboard.history.length} en el período
              </span>
            </div>
            {dashboard.history.length ? (
              <Card className="py-0">
                <MatchRows dashboard={dashboard} limit={5} />
              </Card>
            ) : (
              <p className="text-sm text-muted-foreground">No hay partidos con estos filtros.</p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

/** Keeps the active chip visible when the strip overflows (e.g. landing on Duplas). */
function revealChip(button: HTMLButtonElement | null) {
  const strip = button?.parentElement;
  if (!button || !strip) return;
  const overflowRight =
    button.offsetLeft + button.offsetWidth - (strip.scrollLeft + strip.clientWidth);
  if (overflowRight > 0) strip.scrollLeft += overflowRight + 16;
  else if (button.offsetLeft < strip.scrollLeft) strip.scrollLeft = button.offsetLeft - 16;
}

function PlayerList({ dashboard, metric }: { dashboard: StatsDashboard; metric: PlayerMetric }) {
  const [open, setOpen] = useState<string | null>(null);
  const rows = dashboard.ranking
    .filter((row) => (metric.eligible ? metric.eligible(row, dashboard) : true))
    .toSorted((left, right) => (metric.value(right) ?? 0) - (metric.value(left) ?? 0));
  const left = dashboard.ranking.length - rows.length;
  const leader = rows[0] ? (metric.value(rows[0]) ?? 0) : 0;

  return (
    <>
      <p className="text-xs text-muted-foreground">{metric.caption(dashboard)}</p>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nadie llega al mínimo en este período.</p>
      ) : (
        <Card className="py-0">
          <ol className="flex flex-col divide-y">
            {rows.map((row, index) => {
              const value = metric.value(row) ?? 0;
              const width =
                metric.scale === "percent" ? value : leader > 0 ? (value / leader) * 100 : 0;
              const expanded = open === row.playerId;
              return (
                <li key={row.playerId}>
                  <button
                    aria-expanded={expanded}
                    className="flex min-h-16 w-full items-center gap-3 px-4 py-2.5 text-left transition-colors duration-150 ease-out hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50"
                    onClick={() => setOpen(expanded ? null : row.playerId)}
                    type="button"
                  >
                    <span
                      className={cn(
                        "w-6 shrink-0 text-sm tabular-nums",
                        index < 3 ? "font-semibold text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium">{row.displayName}</span>
                        <ArchivedBadge player={row} />
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground tabular-nums">
                        {metric.detail(row)}
                      </span>
                      <span aria-hidden="true" className="mt-1.5 block h-1 rounded-full bg-muted">
                        <span
                          className="block h-full rounded-full bg-foreground/60"
                          style={{ width: `${Math.max(width, 3)}%` }}
                        />
                      </span>
                    </span>
                    <span className="w-12 shrink-0 text-right">
                      <span className="block text-lg font-semibold tabular-nums">
                        {metric.display(row)}
                      </span>
                      <span className="block text-xs text-muted-foreground">{metric.unit}</span>
                    </span>
                    <ChevronDownIcon
                      aria-hidden="true"
                      className={cn(
                        "size-4 shrink-0 text-muted-foreground transition-transform duration-200 ease-out motion-reduce:transition-none",
                        expanded && "rotate-180",
                      )}
                    />
                  </button>
                  {expanded ? <RowDetail dashboard={dashboard} row={row} /> : null}
                </li>
              );
            })}
          </ol>
        </Card>
      )}
      {left > 0 && rows.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          {left} {left === 1 ? "jugador no entra" : "jugadores no entran"} por no llegar al mínimo.
        </p>
      ) : null}
    </>
  );
}

function RowDetail({ dashboard, row }: { dashboard: StatsDashboard; row: StatsAggregate }) {
  const partner = bestPartner(dashboard.societies, row.playerId);
  const cells: [string, string | number][] = [
    ["PJ", row.played],
    ["G-E-P", `${row.wins}-${row.draws}-${row.losses}`],
    ["Efect.", formatPercent(row.winPercentage)],
    ["Goles", row.goals],
    ["Asist.", row.assists],
    ["Nota", row.ratingAverage === null ? "—" : formatRate(row.ratingAverage)],
  ];
  return (
    <div className="flex flex-col gap-3 bg-muted/40 px-4 pb-4 pt-3">
      <dl className="grid grid-cols-3 gap-x-4 gap-y-3 sm:grid-cols-6">
        {cells.map(([label, value]) => (
          <div key={label} className="flex flex-col gap-0.5">
            <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
            <dd className="text-base font-semibold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="text-xs text-muted-foreground">
        {partner ? (
          <>
            Mejor socio: <span className="font-medium text-foreground">{partner.name}</span> ·{" "}
            {partner.society.points} pts en {partner.society.played} PJ
          </>
        ) : (
          "Todavía sin sociedad (mínimo 2 PJ con el mismo compañero)."
        )}
        {row.absences > 0
          ? ` · ${row.absences} ${row.absences === 1 ? "ausencia" : "ausencias"}`
          : ""}
      </p>
    </div>
  );
}

function DuplasList({ societies }: { societies: StatsSociety[] }) {
  const [limit, setLimit] = useState(12);
  if (societies.length === 0) {
    return (
      <EmptyRow
        icon={<UsersRoundIcon />}
        title="Todavía no hay sociedades"
        description="Se necesitan al menos dos partidos cerrados con la misma pareja en un equipo."
      />
    );
  }
  const leader = societies[0]?.points ?? 1;
  return (
    <>
      <p className="text-xs text-muted-foreground">
        Parejas que comparten equipo · 3 pts por victoria, mínimo 2 PJ juntos
      </p>
      <Card className="py-0">
        <ol className="flex flex-col divide-y">
          {societies.slice(0, limit).map((society, index) => (
            <li
              key={society.playerIds.join(":")}
              className="flex min-h-16 items-center gap-3 px-4 py-2.5"
            >
              <span
                className={cn(
                  "w-6 shrink-0 text-sm tabular-nums",
                  index < 3 ? "font-semibold text-foreground" : "text-muted-foreground",
                )}
              >
                {index + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-balance">
                  {society.playerNames[0]} <span className="text-muted-foreground">+</span>{" "}
                  {society.playerNames[1]}
                </span>
                <span className="mt-0.5 block truncate text-xs text-muted-foreground tabular-nums">
                  {society.played} PJ · {society.wins}G {society.draws}E {society.losses}P ·{" "}
                  {formatPercent(society.winPercentage)} · DG {signed(society.goalDifference)}
                </span>
                <span aria-hidden="true" className="mt-1.5 block h-1 rounded-full bg-muted">
                  <span
                    className="block h-full rounded-full bg-foreground/60"
                    style={{ width: `${Math.max((society.points / leader) * 100, 3)}%` }}
                  />
                </span>
              </span>
              <span className="w-12 shrink-0 text-right">
                <span className="block text-lg font-semibold tabular-nums">{society.points}</span>
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
          Ver más duplas ({societies.length - limit})
        </Button>
      ) : null}
    </>
  );
}

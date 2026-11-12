"use client";

// PROTOTYPE ONLY — "Planilla": dense, sortable sheet + a chemistry matrix for societies.
import type { StatsAggregate, StatsDashboard, StatsSociety } from "@hay-fulbo/db/stats/types";
import { Button } from "@hay-fulbo/ui/components/button";
import { Card } from "@hay-fulbo/ui/components/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@hay-fulbo/ui/components/tabs";
import { cn } from "@hay-fulbo/ui/lib/utils";
import { ArrowDownIcon, ArrowUpIcon, TrophyIcon, UsersRoundIcon } from "lucide-react";
import { useState } from "react";

import { initials } from "@/lib/initials";

import {
  ArchivedBadge,
  EmptyRow,
  formatPercent,
  formatRate,
  MatchRows,
  MoreFilters,
  PeriodTabs,
  signed,
  useIsDesktop,
  usePlayerPeek,
  type VariantProps,
} from "./shared";

type Column = {
  key: string;
  label: string;
  title: string;
  value: (row: StatsAggregate) => number;
  display: (row: StatsAggregate) => string;
  muted?: boolean;
};

const COLUMNS: Column[] = [
  {
    key: "pj",
    label: "PJ",
    title: "Partidos jugados",
    value: (r) => r.played,
    display: (r) => String(r.played),
    muted: true,
  },
  { key: "g", label: "G", title: "Goles", value: (r) => r.goals, display: (r) => String(r.goals) },
  {
    key: "a",
    label: "A",
    title: "Asistencias",
    value: (r) => r.assists,
    display: (r) => String(r.assists),
  },
  {
    key: "ga",
    label: "G+A",
    title: "Goles más asistencias",
    value: (r) => r.contributions,
    display: (r) => String(r.contributions),
  },
  {
    key: "prom",
    label: "Prom.",
    title: "G+A por partido",
    value: (r) => r.contributionsPerMatch,
    display: (r) => formatRate(r.contributionsPerMatch),
    muted: true,
  },
  {
    key: "ef",
    label: "Ef.",
    title: "Efectividad: partidos ganados",
    value: (r) => r.winPercentage,
    display: (r) => formatPercent(r.winPercentage),
  },
  {
    key: "dg",
    label: "DG",
    title: "Diferencia de gol",
    value: (r) => r.goalDifference,
    display: (r) => signed(r.goalDifference),
    muted: true,
  },
  {
    key: "gep",
    label: "G-E-P",
    title: "Ganados, empatados y perdidos",
    value: (r) => r.points,
    display: (r) => `${r.wins}-${r.draws}-${r.losses}`,
    muted: true,
  },
  {
    key: "nota",
    label: "Nota",
    title: "Nota promedio",
    value: (r) => r.ratingAverage ?? -1,
    display: (r) => (r.ratingAverage === null ? "—" : formatRate(r.ratingAverage)),
  },
  {
    key: "aus",
    label: "Aus.",
    title: "Ausencias",
    value: (r) => r.absences,
    display: (r) => (r.absences ? String(r.absences) : "—"),
    muted: true,
  },
];

export function PlanillaVariant(props: VariantProps) {
  const { dashboard } = props;
  const [tab, setTab] = useState(props.screen === "sociedades" ? "quimica" : "tabla");
  const nothingYet = dashboard.ranking.length === 0 && dashboard.history.length === 0;

  const changeTab = (value: string) => {
    setTab(value);
    props.setScreen(value === "quimica" ? "sociedades" : "estadisticas");
  };

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Estadísticas</h1>
          <p className="text-sm text-muted-foreground tabular-nums">
            {dashboard.summary.matchesPlayed} PJ · {dashboard.summary.totalGoals} goles ·{" "}
            {formatRate(dashboard.summary.goalsPerMatch)} por partido
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

      {nothingYet ? (
        <EmptyRow
          icon={<TrophyIcon />}
          title="La planilla está vacía"
          description="Cerrá el primer partido del período para empezar a sumar."
        />
      ) : (
        <Tabs value={tab} onValueChange={(value) => changeTab(String(value))}>
          <div className="border-b">
            <TabsList aria-label="Secciones" variant="line">
              <TabsTrigger value="tabla">Tabla</TabsTrigger>
              <TabsTrigger value="quimica">Química</TabsTrigger>
              <TabsTrigger value="partidos">Partidos</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="tabla" className="pt-4">
            <SortableTable dashboard={dashboard} />
          </TabsContent>
          <TabsContent value="quimica" className="pt-4">
            <Chemistry dashboard={dashboard} />
          </TabsContent>
          <TabsContent value="partidos" className="pt-4">
            {dashboard.history.length ? (
              <Card className="py-0">
                <MatchRows dashboard={dashboard} dense />
              </Card>
            ) : (
              <p className="text-sm text-muted-foreground">No hay partidos con estos filtros.</p>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

/* ───────────────────────── sortable sheet ───────────────────────── */

function SortableTable({ dashboard }: { dashboard: StatsDashboard }) {
  const peek = usePlayerPeek();
  const [sort, setSort] = useState<{ key: string; dir: "desc" | "asc" }>({
    key: "ga",
    dir: "desc",
  });
  const column = COLUMNS.find((item) => item.key === sort.key) ?? COLUMNS[3]!;
  const rows = dashboard.ranking.toSorted((left, right) => {
    const delta = column.value(right) - column.value(left);
    return sort.dir === "desc" ? delta : -delta;
  });

  const toggle = (key: string) =>
    setSort((current) =>
      current.key === key
        ? { key, dir: current.dir === "desc" ? "asc" : "desc" }
        : { key, dir: "desc" },
    );

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-muted-foreground">
        Tocá una columna para ordenar. Tocá un nombre para ver la ficha.
      </p>
      <Card className="overflow-hidden py-0">
        <div className="overflow-x-auto overscroll-x-contain">
          <table className="w-full border-separate border-spacing-0 text-sm">
            <caption className="sr-only">
              Ranking ordenado por {column.title},{" "}
              {sort.dir === "desc" ? "de mayor a menor" : "de menor a mayor"}
            </caption>
            <thead>
              <tr>
                <th
                  scope="col"
                  className="sticky left-0 z-[2] border-b bg-card py-0 pl-4 pr-2 text-left text-xs font-medium text-muted-foreground"
                >
                  Jugador
                </th>
                {COLUMNS.map((item) => {
                  const active = item.key === sort.key;
                  return (
                    <th
                      key={item.key}
                      aria-sort={
                        active ? (sort.dir === "desc" ? "descending" : "ascending") : "none"
                      }
                      scope="col"
                      className={cn("border-b p-0 text-right", active && "bg-muted/60")}
                    >
                      <button
                        className={cn(
                          "inline-flex h-11 w-full items-center justify-end gap-0.5 whitespace-nowrap px-2.5 text-xs font-medium transition-colors duration-150 ease-out hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50",
                          active ? "text-foreground" : "text-muted-foreground",
                        )}
                        onClick={() => toggle(item.key)}
                        title={item.title}
                        type="button"
                      >
                        {item.label}
                        {active ? (
                          sort.dir === "desc" ? (
                            <ArrowDownIcon aria-hidden="true" className="size-3" />
                          ) : (
                            <ArrowUpIcon aria-hidden="true" className="size-3" />
                          )
                        ) : null}
                      </button>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.playerId} className="group">
                  <th
                    scope="row"
                    className="sticky left-0 z-[1] border-b bg-card p-0 text-left font-normal group-last:border-b-0"
                  >
                    <button
                      className="flex h-11 w-36 items-center gap-2 pl-4 pr-2 text-left transition-colors duration-150 ease-out hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50 sm:w-56"
                      onClick={() => peek(row.playerId)}
                      title={row.displayName}
                      type="button"
                    >
                      <span className="w-5 shrink-0 text-xs text-muted-foreground tabular-nums">
                        {index + 1}
                      </span>
                      <span className="min-w-0 truncate font-medium">{row.displayName}</span>
                      <span className="hidden sm:inline">
                        <ArchivedBadge player={row} />
                      </span>
                    </button>
                  </th>
                  {COLUMNS.map((item) => (
                    <td
                      key={item.key}
                      className={cn(
                        "whitespace-nowrap border-b px-2.5 text-right tabular-nums group-last:border-b-0",
                        item.key === sort.key
                          ? "bg-muted/60 font-semibold text-foreground"
                          : item.muted
                            ? "text-muted-foreground"
                            : "",
                      )}
                    >
                      {item.display(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

/* ───────────────────────── chemistry matrix ───────────────────────── */

const BUCKETS = [
  { label: "menos de 25%", min: -1, className: "bg-chart-5/40" },
  { label: "25–40%", min: 25, className: "bg-chart-5/15" },
  { label: "40–60%", min: 40, className: "bg-muted" },
  { label: "60–75%", min: 60, className: "bg-chart-2/20" },
  { label: "75% o más", min: 75, className: "bg-chart-2/45" },
];

function bucketFor(percentage: number) {
  return BUCKETS.findLast((bucket) => percentage >= bucket.min) ?? BUCKETS[0]!;
}

function shortName(name: string) {
  const parts = name
    .replace(/[“”"]/g, "")
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length < 2) return name;
  return `${parts[0]} ${parts.at(-1)![0]}.`;
}

function Chemistry({ dashboard }: { dashboard: StatsDashboard }) {
  const desktop = useIsDesktop();
  const size = desktop ? 12 : 7;
  const players = dashboard.ranking
    .filter((row) => !row.archived)
    .toSorted((left, right) => right.played - left.played)
    .slice(0, size);
  const lookup = new Map(
    dashboard.societies.map((row) => [row.playerIds.toSorted().join(":"), row]),
  );
  const pairOf = (a: string, b: string) => lookup.get([a, b].toSorted().join(":")) ?? null;
  const inMatrix = new Set(players.map((row) => row.playerId));
  const defaultPair =
    dashboard.societies.find(
      (row) => inMatrix.has(row.playerIds[0]) && inMatrix.has(row.playerIds[1]),
    ) ?? null;
  const [selected, setSelected] = useState<StatsSociety | null>(null);
  const active = selected ?? defaultPair;
  const [limit, setLimit] = useState(8);

  if (dashboard.societies.length === 0 || players.length < 2) {
    return (
      <EmptyRow
        icon={<UsersRoundIcon />}
        title="Todavía no hay química para medir"
        description="Se necesitan al menos dos partidos cerrados con la misma pareja en un equipo."
      />
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-start">
      <section aria-labelledby="matriz-title" className="flex min-w-0 flex-col gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 id="matriz-title" className="text-base font-semibold">
            Efectividad jugando juntos
          </h2>
          <p className="text-xs text-muted-foreground">
            Los {players.length} que más jugaron. Cada casilla es el % de partidos que ganaron en el
            mismo equipo.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="border-separate border-spacing-0.5 text-xs">
            <thead>
              <tr>
                <td />
                {players.slice(0, -1).map((player) => (
                  <th
                    key={player.playerId}
                    scope="col"
                    className="h-8 w-11 font-medium text-muted-foreground"
                  >
                    <abbr className="no-underline" title={player.displayName}>
                      {initials(player.displayName.replace(/[“”"]/g, ""))}
                    </abbr>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {players.slice(1).map((rowPlayer, rowIndex) => (
                <tr key={rowPlayer.playerId}>
                  <th
                    scope="row"
                    className="max-w-24 truncate pr-2 text-left font-medium whitespace-nowrap sm:max-w-36"
                    title={rowPlayer.displayName}
                  >
                    {shortName(rowPlayer.displayName)}
                  </th>
                  {players.slice(0, -1).map((colPlayer, colIndex) => {
                    if (colIndex > rowIndex) return <td key={colPlayer.playerId} />;
                    const pair = pairOf(rowPlayer.playerId, colPlayer.playerId);
                    const isActive =
                      pair !== null &&
                      active !== null &&
                      pair.playerIds.join(":") === active.playerIds.join(":");
                    if (!pair) {
                      return (
                        <td key={colPlayer.playerId}>
                          <span
                            aria-label={`${rowPlayer.displayName} y ${colPlayer.displayName}: menos de 2 partidos juntos`}
                            className="flex size-11 items-center justify-center rounded-xs text-muted-foreground"
                          >
                            —
                          </span>
                        </td>
                      );
                    }
                    return (
                      <td key={colPlayer.playerId}>
                        <button
                          aria-label={`${rowPlayer.displayName} y ${colPlayer.displayName}: ${formatPercent(pair.winPercentage)} en ${pair.played} partidos`}
                          aria-pressed={isActive}
                          className={cn(
                            "flex size-11 items-center justify-center rounded-xs font-semibold tabular-nums transition-shadow duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            bucketFor(pair.winPercentage).className,
                            isActive && "ring-2 ring-foreground",
                          )}
                          onClick={() => setSelected(pair)}
                          type="button"
                        >
                          {Math.round(pair.winPercentage)}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul
          aria-label="Referencia de colores"
          className="flex flex-wrap gap-x-3 gap-y-1.5 text-xs text-muted-foreground"
        >
          {BUCKETS.map((bucket) => (
            <li key={bucket.label} className="flex items-center gap-1.5">
              <span aria-hidden="true" className={cn("size-3 rounded-xs", bucket.className)} />
              {bucket.label}
            </li>
          ))}
          <li className="flex items-center gap-1.5">— menos de 2 PJ juntos</li>
        </ul>
      </section>

      <div className="flex min-w-0 flex-col gap-6">
        {active ? (
          <section aria-live="polite" aria-label="Dupla elegida">
            <Card size="sm" className="gap-3 px-4 py-4">
              <p className="text-xs font-medium text-muted-foreground">Dupla elegida</p>
              <p className="text-lg font-semibold text-balance">
                {active.playerNames[0]} <span className="text-muted-foreground">+</span>{" "}
                {active.playerNames[1]}
              </p>
              <dl className="grid grid-cols-4 gap-2">
                {(
                  [
                    ["PJ", active.played],
                    ["G-E-P", `${active.wins}-${active.draws}-${active.losses}`],
                    ["DG", signed(active.goalDifference)],
                    ["Pts", active.points],
                  ] as const
                ).map(([label, value]) => (
                  <div key={label} className="flex flex-col gap-0.5">
                    <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
                    <dd className="text-base font-semibold tabular-nums">{value}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          </section>
        ) : null}

        <section aria-labelledby="duplas-planilla" className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-2">
            <h2 id="duplas-planilla" className="text-base font-semibold">
              Tabla de duplas
            </h2>
            <span className="text-xs text-muted-foreground tabular-nums">
              {dashboard.societies.length} parejas · mín. 2 PJ
            </span>
          </div>
          <Card className="py-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th scope="col" className="h-10 pl-4 text-left font-medium">
                    Dupla
                  </th>
                  <th scope="col" className="w-10 text-right font-medium">
                    <abbr className="no-underline" title="Partidos jugados juntos">
                      PJ
                    </abbr>
                  </th>
                  <th scope="col" className="w-12 text-right font-medium">
                    <abbr className="no-underline" title="Efectividad">
                      Ef.
                    </abbr>
                  </th>
                  <th scope="col" className="w-12 pr-4 text-right font-medium">
                    <abbr className="no-underline" title="Puntos">
                      Pts
                    </abbr>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {dashboard.societies.slice(0, limit).map((society) => {
                  const isActive =
                    active !== null && society.playerIds.join(":") === active.playerIds.join(":");
                  return (
                    <tr key={society.playerIds.join(":")} className={cn(isActive && "bg-muted/60")}>
                      <td className="p-0">
                        <button
                          className="flex min-h-11 w-full items-center py-1.5 pl-4 pr-2 text-left font-medium transition-colors duration-150 ease-out hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50"
                          onClick={() => setSelected(society)}
                          type="button"
                        >
                          {shortName(society.playerNames[0])} + {shortName(society.playerNames[1])}
                        </button>
                      </td>
                      <td className="text-right text-muted-foreground tabular-nums">
                        {society.played}
                      </td>
                      <td className="text-right tabular-nums">
                        {formatPercent(society.winPercentage)}
                      </td>
                      <td className="pr-4 text-right font-semibold tabular-nums">
                        {society.points}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
          {dashboard.societies.length > limit ? (
            <Button
              className="self-start"
              onClick={() => setLimit((value) => value + 20)}
              variant="ghost"
            >
              Ver más ({dashboard.societies.length - limit})
            </Button>
          ) : null}
        </section>
      </div>
    </div>
  );
}

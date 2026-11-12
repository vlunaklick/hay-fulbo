"use client";

import type { StatsAggregate, StatsSociety } from "@hay-fulbo/db/stats";
import { Badge } from "@hay-fulbo/ui/components/badge";
import { Button } from "@hay-fulbo/ui/components/button";
import { Card } from "@hay-fulbo/ui/components/card";
import { useIsMobile } from "@hay-fulbo/ui/hooks/use-mobile";
import { cn } from "@hay-fulbo/ui/lib/utils";
import { ArrowDownIcon, ArrowUpIcon } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";

import { initials } from "@/lib/initials";

import { formatPercent, formatRate, shortName, signed, stripQuotes } from "./stats-format";

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
    value: (row) => row.played,
    display: (row) => String(row.played),
    muted: true,
  },
  {
    key: "g",
    label: "G",
    title: "Goles",
    value: (row) => row.goals,
    display: (row) => String(row.goals),
  },
  {
    key: "a",
    label: "A",
    title: "Asistencias",
    value: (row) => row.assists,
    display: (row) => String(row.assists),
  },
  {
    key: "ga",
    label: "G+A",
    title: "Goles más asistencias",
    value: (row) => row.contributions,
    display: (row) => String(row.contributions),
  },
  {
    key: "prom",
    label: "Prom.",
    title: "G+A por partido",
    value: (row) => row.contributionsPerMatch,
    display: (row) => formatRate(row.contributionsPerMatch),
    muted: true,
  },
  {
    key: "ef",
    label: "Ef.",
    title: "Efectividad: porcentaje de partidos ganados",
    value: (row) => row.winPercentage,
    display: (row) => formatPercent(row.winPercentage),
  },
  {
    key: "dg",
    label: "DG",
    title: "Diferencia de gol",
    value: (row) => row.goalDifference,
    display: (row) => signed(row.goalDifference),
    muted: true,
  },
  {
    key: "gep",
    label: "G-E-P",
    title: "Ganados, empatados y perdidos",
    value: (row) => row.points,
    display: (row) => `${row.wins}-${row.draws}-${row.losses}`,
    muted: true,
  },
  {
    key: "nota",
    label: "Nota",
    title: "Nota promedio de los partidos con votación",
    value: (row) => row.ratingAverage ?? -1,
    display: (row) => (row.ratingAverage === null ? "—" : formatRate(row.ratingAverage)),
  },
  {
    key: "aus",
    label: "Aus.",
    title: "Ausencias",
    value: (row) => row.absences,
    display: (row) => (row.absences ? String(row.absences) : "—"),
    muted: true,
  },
];

/** The whole ranking as one sheet: names pinned, every column sortable. */
export function RankingTable({
  playerHref,
  ranking,
}: {
  playerHref: (playerId: string) => Route;
  ranking: StatsAggregate[];
}) {
  const [sort, setSort] = useState<{ key: string; dir: "desc" | "asc" }>({
    key: "ga",
    dir: "desc",
  });
  const column = COLUMNS.find((item) => item.key === sort.key) ?? COLUMNS[3]!;
  // `ranking` already arrives ordered by G+A, so ties keep that order.
  const rows = ranking.toSorted((left, right) => {
    const delta = column.value(right) - column.value(left);
    return sort.dir === "desc" ? delta : -delta;
  });

  function toggle(key: string) {
    setSort((current) =>
      current.key === key
        ? { key, dir: current.dir === "desc" ? "asc" : "desc" }
        : { key, dir: "desc" },
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-muted-foreground">
        Tocá una columna para ordenar y un nombre para ver su ficha.
      </p>
      <Card className="overflow-hidden py-0">
        <div className="overflow-x-auto overscroll-x-contain">
          <table className="w-full border-separate border-spacing-0 text-sm">
            <caption className="sr-only">
              Ranking ordenado por {column.title.toLowerCase()},{" "}
              {sort.dir === "desc" ? "de mayor a menor" : "de menor a mayor"}
            </caption>
            <thead>
              <tr>
                <th
                  scope="col"
                  className="sticky left-0 z-20 border-b bg-card py-0 pl-4 pr-2 text-left text-xs font-medium text-muted-foreground"
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
                    className="sticky left-0 z-10 border-b bg-card p-0 text-left font-normal group-last:border-b-0"
                  >
                    <Link
                      aria-label={`Ver estadísticas de ${row.displayName}`}
                      className="flex h-11 w-36 items-center gap-2 pl-4 pr-2 transition-colors duration-150 ease-out hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50 sm:w-56"
                      href={playerHref(row.playerId)}
                      title={row.displayName}
                    >
                      <span className="w-5 shrink-0 text-xs text-muted-foreground tabular-nums">
                        {index + 1}
                      </span>
                      <span className="min-w-0 truncate font-medium">{row.displayName}</span>
                      {row.archived ? (
                        <Badge className="hidden sm:inline-flex" variant="outline">
                          Inactivo
                        </Badge>
                      ) : null}
                    </Link>
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

/*
 * Chemistry: win rate of each pair when they share a team. Diverging scale
 * (chart-5 low, chart-2 high, neutral middle) and the number always printed in
 * the cell, so the reading never depends on color alone.
 */
const BUCKETS = [
  { label: "menos de 25%", min: Number.NEGATIVE_INFINITY, className: "bg-chart-5/40" },
  { label: "25–40%", min: 25, className: "bg-chart-5/15" },
  { label: "40–60%", min: 40, className: "bg-muted" },
  { label: "60–75%", min: 60, className: "bg-chart-2/20" },
  { label: "75% o más", min: 75, className: "bg-chart-2/45" },
];

function bucketFor(percentage: number) {
  return BUCKETS.findLast((bucket) => percentage >= bucket.min) ?? BUCKETS[0]!;
}

function pairKey(left: string, right: string) {
  return left < right ? `${left}:${right}` : `${right}:${left}`;
}

export function Chemistry({
  maxPlayers,
  ranking,
  societies,
}: {
  /** Matrix size; defaults to 7 on mobile and 12 on wider screens. */
  maxPlayers?: number;
  ranking: StatsAggregate[];
  societies: StatsSociety[];
}) {
  const mobile = useIsMobile();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [limit, setLimit] = useState(8);

  // The players with the most games give the matrix the most filled cells.
  const players = ranking
    .filter((row) => !row.archived)
    .toSorted((left, right) => right.played - left.played)
    .slice(0, maxPlayers ?? (mobile ? 7 : 12));
  const pairs = new Map(societies.map((row) => [pairKey(...row.playerIds), row]));
  const inMatrix = new Set(players.map((row) => row.playerId));
  const fallback =
    societies.find((row) => inMatrix.has(row.playerIds[0]) && inMatrix.has(row.playerIds[1])) ??
    societies[0] ??
    null;
  const active = (selectedKey ? pairs.get(selectedKey) : null) ?? fallback;
  const activeKey = active ? pairKey(...active.playerIds) : null;

  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="quimica-title" className="flex min-w-0 flex-col gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 id="quimica-title" className="text-base font-semibold">
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
                      {initials(stripQuotes(player.displayName))}
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
                    className="max-w-24 truncate whitespace-nowrap pr-2 text-left font-medium sm:max-w-36"
                    title={rowPlayer.displayName}
                  >
                    {shortName(rowPlayer.displayName)}
                  </th>
                  {players.slice(0, -1).map((colPlayer, colIndex) => {
                    if (colIndex > rowIndex) return <td key={colPlayer.playerId} />;
                    const key = pairKey(rowPlayer.playerId, colPlayer.playerId);
                    const pair = pairs.get(key);
                    if (!pair) {
                      return (
                        <td key={colPlayer.playerId}>
                          <span
                            aria-label={`${rowPlayer.displayName} y ${colPlayer.displayName}: menos de 2 partidos juntos`}
                            className="flex size-11 items-center justify-center text-muted-foreground"
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
                          aria-pressed={key === activeKey}
                          className={cn(
                            "flex size-11 items-center justify-center rounded-xs font-semibold tabular-nums transition-shadow duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            bucketFor(pair.winPercentage).className,
                            key === activeKey && "ring-2 ring-foreground",
                          )}
                          onClick={() => setSelectedKey(key)}
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
          <li>— menos de 2 PJ juntos</li>
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
                <PairMetric label="PJ" value={active.played} />
                <PairMetric
                  label="G-E-P"
                  value={`${active.wins}-${active.draws}-${active.losses}`}
                />
                <PairMetric label="DG" value={signed(active.goalDifference)} />
                <PairMetric label="Pts" value={active.points} />
              </dl>
            </Card>
          </section>
        ) : null}

        <section aria-labelledby="duplas-title" className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-2">
            <h2 id="duplas-title" className="text-base font-semibold">
              Tabla de duplas
            </h2>
            <span className="text-xs text-muted-foreground tabular-nums">
              {societies.length} {societies.length === 1 ? "pareja" : "parejas"} · mín. 2 PJ
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
                    <abbr className="no-underline" title="Puntos: 3 por victoria, 1 por empate">
                      Pts
                    </abbr>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {societies.slice(0, limit).map((society) => {
                  const key = pairKey(...society.playerIds);
                  return (
                    <tr key={key} className={cn(key === activeKey && "bg-muted/60")}>
                      <td className="p-0">
                        <button
                          aria-pressed={key === activeKey}
                          className="flex min-h-11 w-full items-center py-1.5 pl-4 pr-2 text-left font-medium transition-colors duration-150 ease-out hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50"
                          onClick={() => setSelectedKey(key)}
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
      </div>
    </div>
  );
}

function PairMetric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-base font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

"use client";

// PROTOTYPE ONLY — "La tabla": the standings are the page.
// Sort by any stat, tap a row to open it in place, results ride along as a strip.

import { Badge } from "@hay-fulbo/ui/components/badge";
import { Button } from "@hay-fulbo/ui/components/button";
import { Card } from "@hay-fulbo/ui/components/card";
import { Collapsible, CollapsibleContent } from "@hay-fulbo/ui/components/collapsible";
import { ToggleGroup, ToggleGroupItem } from "@hay-fulbo/ui/components/toggle-group";
import { cn } from "@hay-fulbo/ui/lib/utils";
import { ChevronDownIcon, ChevronRightIcon, CalendarClockIcon } from "lucide-react";
import { useState } from "react";

import {
  AccessBadge,
  type Dashboard,
  FormGuide,
  fmt,
  LoadingRows,
  type RankingRow,
  rowLink,
  useDashboard,
  usePlayerStats,
  useProto,
  winnerSlot,
} from "./shared";
import { MatchPage, PlayerPage } from "./variant-previa";

type SortKey = "contributions" | "goals" | "assists" | "winPercentage" | "played";

const sorts: {
  key: SortKey;
  label: string;
  short: string;
  format?: (row: RankingRow) => string;
}[] = [
  { key: "contributions", label: "Goles + asistencias", short: "G+A" },
  { key: "goals", label: "Goles", short: "Goles" },
  { key: "assists", label: "Asistencias", short: "Asist." },
  {
    key: "winPercentage",
    label: "Porcentaje de victorias",
    short: "% Vict.",
    format: (row) => `${Math.round(row.winPercentage)}%`,
  },
  { key: "played", label: "Partidos jugados", short: "PJ" },
];

export function TablaVariant() {
  const { detail } = useProto();
  if (detail?.kind === "partido") return <MatchPage matchId={detail.id} />;
  if (detail?.kind === "jugador") return <PlayerPage playerId={detail.id} />;
  return <TablaHome />;
}

function TablaHome() {
  const query = useDashboard();
  const { param, setParam } = useProto();
  const sortKey = (sorts.find((sort) => sort.key === param("orden"))?.key ??
    "contributions") as SortKey;
  const [openRow, setOpenRow] = useState<string | null>(null);

  if (!query.data) {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 pt-6">
        <LoadingRows rows={10} />
      </main>
    );
  }
  const dashboard = query.data;
  const sort = sorts.find((item) => item.key === sortKey)!;
  const ranking = [...dashboard.ranking].sort(
    (a, b) =>
      b[sortKey] - a[sortKey] ||
      b.contributions - a.contributions ||
      a.displayName.localeCompare(b.displayName),
  );

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-5 pb-28 pt-6 lg:pt-10">
      <header className="flex flex-col gap-3 px-4 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-balance">{dashboard.group.name}</h1>
          <p className="text-sm text-muted-foreground tabular-nums">
            Tabla de {dashboard.summary.matchesPlayed} partidos cerrados ·{" "}
            {dashboard.summary.totalGoals} goles
          </p>
        </div>
        <AccessBadge />
      </header>

      <div className="flex flex-col gap-3 px-4 sm:px-6 lg:px-8">
        <NextStrip dashboard={dashboard} />
      </div>

      <FixtureStrip dashboard={dashboard} />

      <section aria-labelledby="standings" className="flex flex-col gap-3 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base font-semibold" id="standings">
            Ordenar por
          </h2>
          <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0 [scrollbar-width:none]">
            <ToggleGroup
              aria-label="Ordenar la tabla"
              className="w-max"
              onValueChange={(value) => {
                const next = value[0];
                if (next) setParam("orden", next === "contributions" ? null : String(next));
              }}
              value={[sortKey]}
              variant="outline"
            >
              {sorts.map((item) => (
                <ToggleGroupItem
                  aria-label={item.label}
                  className="h-11 px-3"
                  key={item.key}
                  value={item.key}
                >
                  {item.short}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
        </div>

        <Card className="gap-0 py-0">
          <div
            aria-hidden="true"
            className="hidden grid-cols-[2.5rem_minmax(0,1fr)_repeat(5,3.5rem)_6rem_2.5rem] items-center gap-2 border-b px-4 py-2 text-xs font-medium text-muted-foreground md:grid"
          >
            <span>#</span>
            <span>Jugador</span>
            {sorts.map((item) => (
              <span
                className={cn("text-right", item.key === sortKey && "text-foreground")}
                key={item.key}
              >
                {item.short}
              </span>
            ))}
            <span className="text-right">G-E-P</span>
            <span />
          </div>
          <ol className="flex flex-col divide-y">
            {ranking.map((row, index) => (
              <StandingRow
                expanded={openRow === row.playerId}
                key={row.playerId}
                onToggle={() =>
                  setOpenRow((current) => (current === row.playerId ? null : row.playerId))
                }
                position={index + 1}
                row={row}
                sort={sort}
              />
            ))}
          </ol>
        </Card>
        <p className="text-xs text-muted-foreground">
          Solo cuentan partidos cerrados. Los partidos abiertos y cancelados no suman.
        </p>
      </section>
    </main>
  );
}

function WdlBar({ row }: { row: RankingRow }) {
  const total = Math.max(row.played, 1);
  return (
    <span
      aria-label={`${row.wins} ganados, ${row.draws} empatados, ${row.losses} perdidos`}
      className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted"
      role="img"
    >
      <span className="bg-success" style={{ width: `${(row.wins / total) * 100}%` }} />
      <span className="bg-muted-foreground/40" style={{ width: `${(row.draws / total) * 100}%` }} />
      <span className="bg-destructive/70" style={{ width: `${(row.losses / total) * 100}%` }} />
    </span>
  );
}

function StandingRow({
  expanded,
  onToggle,
  position,
  row,
  sort,
}: {
  expanded: boolean;
  onToggle: () => void;
  position: number;
  row: RankingRow;
  sort: (typeof sorts)[number];
}) {
  const value = sort.format ? sort.format(row) : String(row[sort.key]);
  return (
    <li>
      <Collapsible open={expanded}>
        <button
          aria-controls={`row-${row.playerId}`}
          aria-expanded={expanded}
          className={cn(
            "grid min-h-14 w-full grid-cols-[2rem_minmax(0,1fr)_auto_2rem] items-center gap-2 px-4 py-2 text-left md:grid-cols-[2.5rem_minmax(0,1fr)_repeat(5,3.5rem)_6rem_2.5rem]",
            rowLink,
            expanded && "bg-muted/50",
          )}
          onClick={onToggle}
          type="button"
        >
          <span
            className={cn(
              "text-sm tabular-nums",
              position <= 3 ? "font-bold text-foreground" : "text-muted-foreground",
            )}
          >
            {position}
          </span>
          <span className="flex min-w-0 flex-col gap-1.5">
            <span className="flex items-center gap-2">
              <span className="truncate text-sm font-medium">{row.displayName}</span>
              {row.archived ? <Badge variant="outline">Inactivo</Badge> : null}
            </span>
            <span className="flex items-center gap-2 md:hidden">
              <span className="w-20 shrink-0">
                <WdlBar row={row} />
              </span>
              <span className="truncate text-xs tabular-nums text-muted-foreground">
                {row.played} PJ · {row.wins}-{row.draws}-{row.losses}
              </span>
            </span>
          </span>
          {/* Mobile: only the active stat, big. */}
          <span className="text-right text-lg font-semibold tabular-nums md:hidden">{value}</span>
          {/* Desktop: every stat, active one emphasised. */}
          {sorts.map((item) => (
            <span
              className={cn(
                "hidden text-right text-sm tabular-nums md:block",
                item.key === sort.key ? "font-semibold text-foreground" : "text-muted-foreground",
              )}
              key={item.key}
            >
              {item.format ? item.format(row) : row[item.key]}
            </span>
          ))}
          <span className="hidden flex-col items-end gap-1 md:flex">
            <span className="text-xs tabular-nums text-muted-foreground">
              {row.wins}-{row.draws}-{row.losses}
            </span>
            <WdlBar row={row} />
          </span>
          <ChevronDownIcon
            aria-hidden="true"
            className={cn(
              "size-4 justify-self-end text-muted-foreground transition-transform duration-200 ease-out motion-reduce:transition-none",
              expanded && "rotate-180",
            )}
          />
        </button>
        <CollapsibleContent id={`row-${row.playerId}`}>
          {expanded ? <RowDetail row={row} /> : null}
        </CollapsibleContent>
      </Collapsible>
    </li>
  );
}

function RowDetail({ row }: { row: RankingRow }) {
  const { open } = useProto();
  const query = usePlayerStats(row.playerId);
  const stats: [string, string | number][] = [
    ["Goles", row.goals],
    ["Asist.", row.assists],
    ["Prom. G+A", fmt.rate(row.contributionsPerMatch)],
    ["Dif. gol", fmt.signed(row.goalDifference)],
    ["Ausencias", row.absences || "—"],
    ["Nota", row.ratingAverage === null ? "—" : fmt.rate(row.ratingAverage)],
  ];
  return (
    <div className="flex flex-col gap-4 bg-muted/50 px-4 pb-4 pt-1 md:pl-14">
      <dl className="grid grid-cols-3 gap-x-4 gap-y-3 sm:grid-cols-6">
        {stats.map(([label, value]) => (
          <div className="flex flex-col gap-0.5" key={label}>
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="text-sm font-semibold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-muted-foreground">Últimos 5</span>
          {query.data ? (
            <FormGuide
              outcomes={query.data.matches
                .slice(0, 5)
                .map((match) => match.outcome)
                .reverse()}
            />
          ) : (
            <span className="block h-6 w-32 animate-pulse rounded-xs bg-muted motion-reduce:animate-none" />
          )}
        </div>
        <Button onClick={() => open("jugador", row.playerId)} size="sm" variant="outline">
          Ver ficha
          <ChevronRightIcon data-icon="inline-end" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}

function NextStrip({ dashboard }: { dashboard: Dashboard }) {
  const { open, privateLink } = useProto();
  const upcoming = dashboard.upcoming;
  if (!upcoming) return null;
  const tz = dashboard.group.timeZone;
  const debtors = dashboard.finances?.debtors.length ?? 0;
  return (
    <button
      className={cn(
        "flex min-h-12 w-full items-center gap-3 rounded-lg border bg-card px-3 py-2 text-left text-sm",
        rowLink,
      )}
      onClick={() => open("partido", upcoming.matchId)}
      type="button"
    >
      <CalendarClockIcon aria-hidden="true" className="size-4 shrink-0 text-primary-text" />
      <span className="min-w-0 flex-1 truncate">
        <span className="font-semibold first-letter:uppercase">
          {fmt.day(upcoming.scheduledAt, tz)} · {fmt.time(upcoming.scheduledAt, tz)}
        </span>
        <span className="text-muted-foreground">
          {upcoming.court ? ` · ${upcoming.court.name}` : ""}
        </span>
      </span>
      {privateLink && debtors > 0 ? (
        <span className="shrink-0 text-xs text-destructive">{debtors} sin pagar</span>
      ) : (
        <span className="shrink-0 text-xs text-muted-foreground">
          {fmt.relative(upcoming.scheduledAt)}
        </span>
      )}
      <ChevronRightIcon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
    </button>
  );
}

function FixtureStrip({ dashboard }: { dashboard: Dashboard }) {
  const { open } = useProto();
  const tz = dashboard.group.timeZone;
  const items = dashboard.history.slice(0, 12);
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="fixture" className="flex flex-col gap-2">
      <h2 className="px-4 text-base font-semibold sm:px-6 lg:px-8" id="fixture">
        Resultados
      </h2>
      <ul className="flex snap-x snap-mandatory scroll-px-4 gap-2 overflow-x-auto px-4 pb-1 sm:scroll-px-6 sm:px-6 lg:scroll-px-8 lg:px-8 [scrollbar-width:none]">
        {items.map((match) => {
          const winner = winnerSlot(match);
          return (
            <li className="snap-start" key={match.matchId}>
              <button
                className={cn(
                  "flex w-32 flex-col gap-2 rounded-lg border bg-card p-3 text-left",
                  rowLink,
                )}
                onClick={() => open("partido", match.matchId)}
                type="button"
              >
                <span className="text-xs text-muted-foreground">
                  {fmt.day(match.scheduledAt, tz)}
                </span>
                {match.status === "cancelled" ? (
                  <span className="flex h-[3.25rem] items-center">
                    <Badge variant="outline">Cancelado</Badge>
                  </span>
                ) : (
                  <span className="flex flex-col gap-1">
                    {match.teams.map((team) => (
                      <span className="flex items-center justify-between gap-2" key={team.id}>
                        <span
                          className={cn(
                            "truncate text-xs",
                            winner === team.slot ? "font-semibold" : "text-muted-foreground",
                          )}
                        >
                          {team.displayName}
                        </span>
                        <span
                          className={cn(
                            "text-base font-bold tabular-nums",
                            winner !== null && winner !== team.slot && "text-muted-foreground",
                          )}
                        >
                          {team.goals}
                        </span>
                      </span>
                    ))}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

"use client";

import type { StatsDashboard } from "@hay-fulbo/db/stats";
import { Button } from "@hay-fulbo/ui/components/button";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@hay-fulbo/ui/components/sheet";
import { useIsMobile } from "@hay-fulbo/ui/hooks/use-mobile";
import { useQuery } from "@tanstack/react-query";
import { CalendarDaysIcon, UsersRoundIcon } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import type * as React from "react";
import { useState } from "react";

import { DrillList, DrillRow, HeroNumber, NextStep, StatusHeader } from "@/components/next-step";
import { trpc } from "@/utils/trpc";

import { StatsError } from "./stats-error";
import {
  STATS_BASE,
  StatsFilterRow,
  type StatsFilterState,
  useStatsFilters,
} from "./stats-filters";
import { formatPercent, formatShortDay, plural, shortName } from "./stats-format";
import { StatsBack, StatsEmpty, StatsPage } from "./stats-layout";
import { StatsLoading } from "./stats-loading";
import { Chemistry, RankingTable } from "./stats-planilla";

type DashboardData = Omit<StatsDashboard, "history" | "upcoming"> & {
  history: Array<
    Omit<StatsDashboard["history"][number], "scheduledAt"> & {
      scheduledAt: Date | string;
    }
  >;
  upcoming:
    | (Omit<NonNullable<StatsDashboard["upcoming"]>, "scheduledAt"> & {
        scheduledAt: Date | string;
      })
    | null;
};

type Match = DashboardData["history"][number];

/** Loads the filtered dashboard once; every stats page reads from the same query. */
function DashboardQuery({
  children,
}: {
  children: (dashboard: DashboardData, filters: StatsFilterState) => React.ReactNode;
}) {
  const filters = useStatsFilters();
  const query = useQuery(trpc.stats.dashboard.queryOptions(filters.api));
  if (query.isPending) return <StatsLoading />;
  if (query.error || !query.data) {
    return (
      <StatsError
        message={query.error?.message}
        onRetry={() => void query.refetch()}
        exitHref="/dashboard"
      />
    );
  }
  return <>{children(query.data, filters)}</>;
}

/* ---------------------------------------------------------------- Hub */

export function MemberStatsDashboard() {
  return (
    <DashboardQuery>
      {(dashboard, filters) => <StatsHub dashboard={dashboard} filters={filters} />}
    </DashboardQuery>
  );
}

function StatsHub({ dashboard, filters }: { dashboard: DashboardData; filters: StatsFilterState }) {
  const { summary, ranking, societies, history } = dashboard;
  const nothingYet = !filters.active && history.length === 0 && ranking.length === 0;
  const topScorer = ranking.toSorted((left, right) => right.goals - left.goals)[0];
  const bestPair = societies[0];
  const lastMatch = history[0];

  return (
    <StatsPage>
      <StatusHeader
        title="Estadísticas"
        meta={`${dashboard.group.name} · ${filters.periodLabel.toLowerCase()}`}
      />

      {nothingYet ? null : (
        <HeroNumber
          caption={
            <span className="tabular-nums">
              {summary.matchesPlayed === 1 ? "partido cerrado" : "partidos cerrados"} ·{" "}
              {plural(summary.totalGoals, "gol", "goles")}
            </span>
          }
        >
          {summary.matchesPlayed}
        </HeroNumber>
      )}

      <HubNextStep dashboard={dashboard} filters={filters} nothingYet={nothingYet} />

      {nothingYet ? null : (
        <DrillList>
          <StatsFilterRow courts={dashboard.courts} filters={filters} />
          <DrillRow
            label="Tabla"
            value={
              topScorer && topScorer.goals > 0
                ? `goleador ${shortName(topScorer.displayName)} · ${topScorer.goals}`
                : ranking.length
                  ? plural(ranking.length, "jugador", "jugadores")
                  : "—"
            }
            render={({ className, children }) => (
              <Link className={className} href={filters.href(`${STATS_BASE}/tabla`)}>
                {children}
              </Link>
            )}
          />
          <PlayersRow dashboard={dashboard} filters={filters} />
          <DrillRow
            label="Sociedades"
            value={
              bestPair
                ? `${shortName(bestPair.playerNames[0])} + ${shortName(bestPair.playerNames[1])} · ${formatPercent(bestPair.winPercentage)}`
                : "—"
            }
            render={({ className, children }) => (
              <Link className={className} href={filters.href(`${STATS_BASE}/sociedades`)}>
                {children}
              </Link>
            )}
          />
          <DrillRow
            label="Partidos"
            value={
              lastMatch
                ? `último ${lastMatch.teams[0]?.goals ?? 0}–${lastMatch.teams[1]?.goals ?? 0} · ${formatShortDay(lastMatch.scheduledAt, dashboard.group.timeZone)}`
                : "—"
            }
            render={({ className, children }) => (
              <Link className={className} href={filters.href(`${STATS_BASE}/partidos`)}>
                {children}
              </Link>
            )}
          />
        </DrillList>
      )}
    </StatsPage>
  );
}

/**
 * Stats are read-only, so the next step is "what to look at". Rating the last
 * match wins when the viewer still owes their vote; otherwise the leader.
 */
function HubNextStep({
  dashboard,
  filters,
  nothingYet,
}: {
  dashboard: DashboardData;
  filters: StatsFilterState;
  nothingYet: boolean;
}) {
  const lastClosed = dashboard.history.find((match) => match.status === "closed");
  const ratings = useQuery({
    ...trpc.matches.ratings.queryOptions({ matchId: lastClosed?.matchId ?? "" }),
    enabled: Boolean(lastClosed),
    retry: false,
  });
  const leader = dashboard.ranking[0];

  if (nothingYet) {
    return (
      <NextStep
        kicker="Todavía no hay partidos cerrados"
        title="La tabla arranca con el primer partido"
        action={
          <Button nativeButton={false} render={<Link href="/dashboard/partidos" />}>
            Ir a partidos
          </Button>
        }
      >
        Cuando se cierre, acá aparecen goleadores, sociedades y resultados.
      </NextStep>
    );
  }

  const owesVote =
    lastClosed && ratings.data?.viewerCanRate && Object.keys(ratings.data.ownScores).length === 0;
  if (lastClosed && owesVote) {
    return (
      <NextStep
        kicker="Te falta votar"
        title="Calificá el último partido"
        action={
          <Button
            nativeButton={false}
            render={<Link href={`/dashboard/partidos/${lastClosed.matchId}` as Route} />}
          >
            Calificar
          </Button>
        }
      >
        <span className="tabular-nums">
          {matchLine(lastClosed)} ·{" "}
          {formatShortDay(lastClosed.scheduledAt, dashboard.group.timeZone)}
        </span>
      </NextStep>
    );
  }

  if (!leader) {
    return (
      <NextStep
        kicker="Sin partidos para estos filtros"
        title="Probá con otro período"
        action={
          <Button onClick={filters.reset} variant="outline">
            Ver todo
          </Button>
        }
      />
    );
  }

  return (
    <NextStep
      kicker="Lidera la tabla"
      title={`${leader.displayName}, ${leader.contributions} G+A`}
      action={
        <Button nativeButton={false} render={<Link href={filters.href(`${STATS_BASE}/tabla`)} />}>
          Ver la tabla
        </Button>
      }
    >
      <span className="tabular-nums">
        {plural(leader.goals, "gol", "goles")} y{" "}
        {plural(leader.assists, "asistencia", "asistencias")} en{" "}
        {plural(leader.played, "partido", "partidos")}.
      </span>
    </NextStep>
  );
}

/** "Jugadores" opens a sheet to jump to anyone's numbers, A–Z. */
function PlayersRow({
  dashboard,
  filters,
}: {
  dashboard: DashboardData;
  filters: StatsFilterState;
}) {
  const [open, setOpen] = useState(false);
  const mobile = useIsMobile();
  const players = dashboard.ranking.toSorted((left, right) =>
    left.displayName.localeCompare(right.displayName, "es"),
  );
  const active = players.filter((player) => !player.archived);
  return (
    <>
      <DrillRow
        label="Jugadores"
        onClick={() => setOpen(true)}
        value={players.length ? plural(active.length, "activo", "activos") : "—"}
      />
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side={mobile ? "bottom" : "right"} className="max-h-[85dvh] sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Jugadores</SheetTitle>
            <SheetDescription>Elegí uno para ver su ficha.</SheetDescription>
          </SheetHeader>
          <SheetBody className="overflow-y-auto">
            {players.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nadie jugó en este período.</p>
            ) : (
              <DrillList>
                {players.map((player) => (
                  <DrillRow
                    key={player.playerId}
                    label={player.displayName}
                    value={`${player.archived ? "inactivo · " : ""}${player.played} PJ · ${player.contributions} G+A`}
                    render={({ className, children }) => (
                      <Link
                        className={className}
                        href={filters.href(`${STATS_BASE}/jugadores/${player.playerId}`)}
                      >
                        {children}
                      </Link>
                    )}
                  />
                ))}
              </DrillList>
            )}
          </SheetBody>
        </SheetContent>
      </Sheet>
    </>
  );
}

/* ---------------------------------------------------------------- Subpages */

function SubpageHeader({
  filters,
  meta,
  title,
}: {
  filters: StatsFilterState;
  meta?: React.ReactNode;
  title: string;
}) {
  return (
    <StatusHeader
      back={<StatsBack href={filters.href(STATS_BASE)}>Estadísticas</StatsBack>}
      meta={meta}
      title={title}
    />
  );
}

/** The dense sheet: here comparing columns is the point. */
export function MemberStatsTable() {
  return (
    <DashboardQuery>
      {(dashboard, filters) => (
        <StatsPage wide>
          <SubpageHeader
            filters={filters}
            meta={`${dashboard.group.name} · ${plural(dashboard.ranking.length, "jugador", "jugadores")}`}
            title="Tabla"
          />
          <DrillList>
            <StatsFilterRow courts={dashboard.courts} filters={filters} />
          </DrillList>
          {dashboard.ranking.length === 0 ? (
            <NoResults />
          ) : (
            <RankingTable
              playerHref={(playerId) => filters.href(`${STATS_BASE}/jugadores/${playerId}`)}
              ranking={dashboard.ranking}
            />
          )}
        </StatsPage>
      )}
    </DashboardQuery>
  );
}

export function MemberStatsSocieties() {
  return (
    <DashboardQuery>
      {(dashboard, filters) => (
        <StatsPage wide>
          <SubpageHeader
            filters={filters}
            meta="Cómo rinden las parejas cuando caen en el mismo equipo"
            title="Sociedades"
          />
          <DrillList>
            <StatsFilterRow courts={dashboard.courts} filters={filters} />
          </DrillList>
          {dashboard.societies.length === 0 ? (
            <StatsEmpty
              icon={<UsersRoundIcon />}
              title="Todavía no hay sociedades para medir"
              description="Aparecen cuando una pareja comparte equipo en dos partidos cerrados."
            />
          ) : (
            <Chemistry ranking={dashboard.ranking} societies={dashboard.societies} />
          )}
        </StatsPage>
      )}
    </DashboardQuery>
  );
}

export function MemberStatsMatches() {
  return (
    <DashboardQuery>
      {(dashboard, filters) => (
        <StatsPage>
          <SubpageHeader
            filters={filters}
            meta={plural(dashboard.history.length, "partido", "partidos")}
            title="Partidos"
          />
          <DrillList>
            <StatsFilterRow courts={dashboard.courts} filters={filters} />
          </DrillList>
          {dashboard.history.length === 0 ? (
            <NoResults />
          ) : (
            <DrillList>
              {dashboard.history.map((match) => (
                <DrillRow
                  key={match.matchId}
                  label={matchLine(match)}
                  value={`${match.status === "cancelled" ? "cancelado · " : ""}${formatShortDay(match.scheduledAt, dashboard.group.timeZone)}`}
                  render={({ className, children }) => (
                    <Link
                      className={className}
                      href={filters.href(`${STATS_BASE}/partidos/${match.matchId}`)}
                    >
                      {children}
                    </Link>
                  )}
                />
              ))}
            </DrillList>
          )}
        </StatsPage>
      )}
    </DashboardQuery>
  );
}

function NoResults() {
  return (
    <StatsEmpty
      icon={<CalendarDaysIcon />}
      title="No hay resultados para estos filtros"
      description="Los partidos abiertos todavía no suman."
    />
  );
}

function matchLine(match: Match) {
  return `${match.teams[0]?.displayName ?? "Equipo 1"} ${match.teams[0]?.goals ?? 0}–${match.teams[1]?.goals ?? 0} ${match.teams[1]?.displayName ?? "Equipo 2"}`;
}

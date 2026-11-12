"use client";

import type { StatsDashboard } from "@hay-fulbo/db/stats";
import { Button } from "@hay-fulbo/ui/components/button";
import { useQuery } from "@tanstack/react-query";
import { CalendarDaysIcon, UsersRoundIcon } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import type * as React from "react";
import { useState } from "react";

import { DrillList, DrillRow, HeroNumber, NextStep, StatusHeader } from "@/components/next-step";
import { DrillDetail, NextStepLayout, useIsDesktop } from "@/components/next-step-layout";
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

/** A section with its own URL: a subpage on mobile, the right column on desktop. */
type RouteSection = "tabla" | "sociedades" | "partidos";
/** Sections that only open a DrillDetail. */
type LocalSection = "periodo" | "jugadores";

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

/**
 * The stats screen. On desktop it is master-detail: the mobile screen on the left
 * and the section its URL names (the table by default) on the right, so the dense
 * sheets get room and the column is never empty.
 */
function StatsHub({
  dashboard,
  filters,
  section = "tabla",
}: {
  dashboard: DashboardData;
  filters: StatsFilterState;
  section?: RouteSection;
}) {
  const desktop = useIsDesktop();
  // null → whatever the URL names; "none" → the person closed the right column.
  const [local, setLocal] = useState<LocalSection | "none" | null>(null);
  const open: LocalSection | RouteSection | null =
    local === "none" ? null : (local ?? (desktop ? section : null));

  const { summary, ranking, societies, history } = dashboard;
  const nothingYet = !filters.active && history.length === 0 && ranking.length === 0;
  const topScorer = ranking.toSorted((left, right) => right.goals - left.goals)[0];
  const bestPair = societies[0];
  const lastMatch = history[0];

  function sectionRow(key: RouteSection, label: string, value: string) {
    return (
      <DrillRow
        label={label}
        selected={open === key}
        value={value}
        render={({ className, children }) => (
          <Link
            className={className}
            href={filters.href(`${STATS_BASE}/${key}`)}
            // Same route on desktop: the link only reopens the closed column.
            onClick={() => setLocal(null)}
            scroll={false}
          >
            {children}
          </Link>
        )}
      />
    );
  }

  function closeDetail(isOpen: boolean) {
    if (!isOpen) setLocal(desktop ? "none" : null);
  }

  return (
    <NextStepLayout emptyDetail={nothingYet ? null : <p>Elegí una fila para verla acá.</p>}>
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
          <StatsFilterRow
            courts={dashboard.courts}
            filters={filters}
            onOpenChange={(isOpen) => (isOpen ? setLocal("periodo") : closeDetail(false))}
            open={open === "periodo"}
          />
          {sectionRow(
            "tabla",
            "Tabla",
            topScorer && topScorer.goals > 0
              ? `goleador ${shortName(topScorer.displayName)} · ${topScorer.goals}`
              : ranking.length
                ? plural(ranking.length, "jugador", "jugadores")
                : "—",
          )}
          <PlayersRow
            dashboard={dashboard}
            filters={filters}
            onOpenChange={(isOpen) => (isOpen ? setLocal("jugadores") : closeDetail(false))}
            open={open === "jugadores"}
          />
          {sectionRow(
            "sociedades",
            "Sociedades",
            bestPair
              ? `${shortName(bestPair.playerNames[0])} + ${shortName(bestPair.playerNames[1])} · ${formatPercent(bestPair.winPercentage)}`
              : "—",
          )}
          {sectionRow(
            "partidos",
            "Partidos",
            lastMatch
              ? `último ${lastMatch.teams[0]?.goals ?? 0}–${lastMatch.teams[1]?.goals ?? 0} · ${formatShortDay(lastMatch.scheduledAt, dashboard.group.timeZone)}`
              : "—",
          )}
        </DrillList>
      )}

      {/* Route sections render here only on desktop; on mobile they are subpages. */}
      {desktop && !nothingYet ? (
        <>
          <DrillDetail
            description={plural(ranking.length, "jugador", "jugadores")}
            onOpenChange={closeDetail}
            open={open === "tabla"}
            title="Tabla"
          >
            <TableSection dashboard={dashboard} filters={filters} />
          </DrillDetail>
          <DrillDetail
            description="Cómo rinden las parejas cuando caen en el mismo equipo."
            onOpenChange={closeDetail}
            open={open === "sociedades"}
            title="Sociedades"
          >
            <SocietiesSection dashboard={dashboard} maxPlayers={10} />
          </DrillDetail>
          <DrillDetail
            description={plural(history.length, "partido", "partidos")}
            onOpenChange={closeDetail}
            open={open === "partidos"}
            title="Partidos"
          >
            <MatchesSection dashboard={dashboard} filters={filters} />
          </DrillDetail>
        </>
      ) : null}
    </NextStepLayout>
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
        <Button
          nativeButton={false}
          render={<Link href={filters.href(`${STATS_BASE}/tabla`)} scroll={false} />}
        >
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

/** "Jugadores" opens a list to jump to anyone's numbers, A–Z. */
function PlayersRow({
  dashboard,
  filters,
  onOpenChange,
  open,
}: {
  dashboard: DashboardData;
  filters: StatsFilterState;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  const players = dashboard.ranking.toSorted((left, right) =>
    left.displayName.localeCompare(right.displayName, "es"),
  );
  const active = players.filter((player) => !player.archived);
  return (
    <>
      <DrillRow
        label="Jugadores"
        onClick={() => onOpenChange(true)}
        selected={open}
        value={players.length ? plural(active.length, "activo", "activos") : "—"}
      />
      <DrillDetail
        description="Elegí uno para ver su ficha."
        onOpenChange={onOpenChange}
        open={open}
        title="Jugadores"
      >
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
      </DrillDetail>
    </>
  );
}

/* ---------------------------------------------------------------- Sections */

function TableSection({
  dashboard,
  filters,
}: {
  dashboard: DashboardData;
  filters: StatsFilterState;
}) {
  if (dashboard.ranking.length === 0) return <NoResults />;
  return (
    <RankingTable
      playerHref={(playerId) => filters.href(`${STATS_BASE}/jugadores/${playerId}`)}
      ranking={dashboard.ranking}
    />
  );
}

function SocietiesSection({
  dashboard,
  maxPlayers,
}: {
  dashboard: DashboardData;
  maxPlayers?: number;
}) {
  if (dashboard.societies.length === 0) {
    return (
      <StatsEmpty
        icon={<UsersRoundIcon />}
        title="Todavía no hay sociedades para medir"
        description="Aparecen cuando una pareja comparte equipo en dos partidos cerrados."
      />
    );
  }
  return (
    <Chemistry
      maxPlayers={maxPlayers}
      ranking={dashboard.ranking}
      societies={dashboard.societies}
    />
  );
}

function MatchesSection({
  dashboard,
  filters,
}: {
  dashboard: DashboardData;
  filters: StatsFilterState;
}) {
  if (dashboard.history.length === 0) return <NoResults />;
  return (
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
  );
}

/* ---------------------------------------------------------------- Subpages */

/**
 * Mobile: its own page with the section full width. Desktop: the stats screen
 * with this section open on the right.
 */
function SectionPage({
  meta,
  render,
  section,
  title,
  wide,
}: {
  meta: (dashboard: DashboardData) => string;
  render: (dashboard: DashboardData, filters: StatsFilterState) => React.ReactNode;
  section: RouteSection;
  title: string;
  wide?: boolean;
}) {
  const desktop = useIsDesktop();
  return (
    <DashboardQuery>
      {(dashboard, filters) =>
        desktop ? (
          <StatsHub dashboard={dashboard} filters={filters} section={section} />
        ) : (
          <StatsPage wide={wide}>
            <StatusHeader
              back={<StatsBack href={filters.href(STATS_BASE)}>Estadísticas</StatsBack>}
              meta={meta(dashboard)}
              title={title}
            />
            <DrillList>
              <StatsFilterRow courts={dashboard.courts} filters={filters} />
            </DrillList>
            {render(dashboard, filters)}
          </StatsPage>
        )
      }
    </DashboardQuery>
  );
}

/** The dense sheet: here comparing columns is the point. */
export function MemberStatsTable() {
  return (
    <SectionPage
      meta={(dashboard) =>
        `${dashboard.group.name} · ${plural(dashboard.ranking.length, "jugador", "jugadores")}`
      }
      render={(dashboard, filters) => <TableSection dashboard={dashboard} filters={filters} />}
      section="tabla"
      title="Tabla"
      wide
    />
  );
}

export function MemberStatsSocieties() {
  return (
    <SectionPage
      meta={() => "Cómo rinden las parejas cuando caen en el mismo equipo"}
      render={(dashboard) => <SocietiesSection dashboard={dashboard} />}
      section="sociedades"
      title="Sociedades"
      wide
    />
  );
}

export function MemberStatsMatches() {
  return (
    <SectionPage
      meta={(dashboard) => plural(dashboard.history.length, "partido", "partidos")}
      render={(dashboard, filters) => <MatchesSection dashboard={dashboard} filters={filters} />}
      section="partidos"
      title="Partidos"
    />
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

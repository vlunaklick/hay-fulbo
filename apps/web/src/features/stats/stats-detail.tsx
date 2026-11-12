"use client";

import type { PlayerStats, StatsMatchDetail } from "@hay-fulbo/db/stats";
import { Badge } from "@hay-fulbo/ui/components/badge";
import { cn } from "@hay-fulbo/ui/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { TrophyIcon } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import type * as React from "react";
import { useState } from "react";

import { DrillList, DrillRow, HeroNumber, StatusHeader } from "@/components/next-step";
import { DrillDetail, NextStepLayout, useIsDesktop } from "@/components/next-step-layout";
import { trpc } from "@/utils/trpc";

import { StatsError } from "./stats-error";
import { STATS_BASE, type StatsFilterState, useStatsFilters } from "./stats-filters";
import {
  formatLongDay,
  formatPercent,
  formatRate,
  formatShortDay,
  plural,
  signed,
} from "./stats-format";
import { StatsBack, StatsEmpty } from "./stats-layout";
import { StatsLoading } from "./stats-loading";

type SerializedPlayerStats = Omit<PlayerStats, "matches"> & {
  matches: Array<
    Omit<PlayerStats["matches"][number], "scheduledAt"> & {
      scheduledAt: Date | string;
    }
  >;
};
type SerializedMatchDetail = Omit<StatsMatchDetail, "scheduledAt"> & {
  scheduledAt: Date | string;
};

export function MemberPlayerStats({ playerId }: { playerId: string }) {
  const filters = useStatsFilters();
  const query = useQuery(trpc.stats.player.queryOptions({ playerId, filters: filters.api }));
  if (query.isPending) return <StatsLoading />;
  if (query.error || !query.data) {
    return (
      <StatsError
        message="No encontramos las estadísticas de este jugador."
        onRetry={() => void query.refetch()}
      />
    );
  }
  return <PlayerStatsContent data={query.data} filters={filters} />;
}

export function MemberMatchStats({ matchId }: { matchId: string }) {
  const filters = useStatsFilters();
  const query = useQuery(trpc.stats.match.queryOptions({ matchId }));
  if (query.isPending) return <StatsLoading />;
  if (query.error || !query.data) {
    return (
      <StatsError message="No encontramos este partido." onRetry={() => void query.refetch()} />
    );
  }
  return <MatchStatsContent data={query.data} filters={filters} />;
}

function PlayerStatsContent({
  data,
  filters,
}: {
  data: SerializedPlayerStats;
  filters: StatsFilterState;
}) {
  const aggregate = data.aggregate;
  return (
    <NextStepLayout emptyDetail={<p>Elegí una fila para verla acá.</p>}>
      <StatusHeader
        back={<StatsBack href={filters.href(`${STATS_BASE}/tabla`)}>Tabla</StatsBack>}
        meta={`${data.group.name} · ${filters.periodLabel.toLowerCase()}`}
        status={data.player.archived ? <Badge variant="outline">Inactivo</Badge> : null}
        title={data.player.displayName}
      />

      {aggregate ? (
        <>
          <HeroNumber caption={`G+A en ${plural(aggregate.played, "partido", "partidos")}`}>
            {aggregate.contributions}
          </HeroNumber>
          <DrillList title="Resumen">
            <DrillRow static label="Goles" value={String(aggregate.goals)} />
            <DrillRow static label="Asistencias" value={String(aggregate.assists)} />
            <DrillRow
              static
              label="Ganados, empatados, perdidos"
              value={`${aggregate.wins}-${aggregate.draws}-${aggregate.losses}`}
            />
            <DrillRow static label="Efectividad" value={formatPercent(aggregate.winPercentage)} />
            <DrillRow
              static
              label="G+A por partido"
              value={formatRate(aggregate.contributionsPerMatch)}
            />
            <DrillRow static label="Diferencia de gol" value={signed(aggregate.goalDifference)} />
            <DrillRow
              static
              label="Nota"
              value={
                aggregate.ratingAverage === null
                  ? "—"
                  : `${formatRate(aggregate.ratingAverage)} en ${plural(aggregate.ratingMatchCount, "partido", "partidos")}`
              }
            />
            <DrillRow
              static
              label="Ausencias"
              value={aggregate.absences ? String(aggregate.absences) : "—"}
            />
          </DrillList>
        </>
      ) : (
        <StatsEmpty
          icon={<TrophyIcon />}
          title="Sin partidos cerrados"
          description="Todavía no jugó ninguno en este período."
        />
      )}

      {data.matches.length ? (
        <ColumnDetail
          label="Partidos"
          mobileHeading
          value={plural(data.matches.length, "partido", "partidos")}
        >
          <DrillList>
            {data.matches.map((match) => (
              <DrillRow
                key={match.matchId}
                label={`${formatShortDay(match.scheduledAt, data.group.timeZone)} · ${match.teams[0]?.goals ?? 0}–${match.teams[1]?.goals ?? 0}`}
                value={`${outcomeLabel(match.outcome)} · ${match.contributions} G+A`}
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
        </ColumnDetail>
      ) : null}
    </NextStepLayout>
  );
}

function MatchStatsContent({
  data,
  filters,
}: {
  data: SerializedMatchDetail;
  filters: StatsFilterState;
}) {
  const [home, away] = data.teams;
  const grouped = data.teams.map((team) => ({
    team,
    appearances: data.appearances.filter((appearance) => appearance.teamId === team.id),
  }));
  const teamless = data.appearances.filter(
    (appearance) => !data.teams.some((team) => team.id === appearance.teamId),
  );
  const meta = [
    formatLongDay(data.scheduledAt, data.group.timeZone),
    data.court?.name,
    data.courtCostMinor ? formatMoney(data.courtCostMinor, data.group.currency) : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <NextStepLayout emptyDetail={<p>Elegí una fila para verla acá.</p>}>
      <StatusHeader
        back={<StatsBack href={filters.href(`${STATS_BASE}/partidos`)}>Partidos</StatsBack>}
        meta={meta}
        status={<Badge variant="secondary">{statusLabel(data.status)}</Badge>}
        title={`${home?.displayName ?? "Equipo 1"} vs ${away?.displayName ?? "Equipo 2"}`}
      />

      <HeroNumber
        caption={
          data.figure ? (
            <span className="inline-flex items-center gap-1.5 tabular-nums">
              <TrophyIcon aria-hidden="true" className="size-4" />
              Figura: {data.figure.displayName} · {formatRate(data.figure.average)}
            </span>
          ) : null
        }
      >
        {home?.goals ?? 0}–{away?.goals ?? 0}
      </HeroNumber>

      <ColumnDetail
        label="Actuaciones"
        value={plural(data.appearances.length, "jugador", "jugadores")}
      >
        <div className="flex flex-col gap-6">
          {grouped.map(({ team, appearances }) => (
            <DrillList
              key={team.id}
              title={
                <span className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className={cn(
                      "size-2 shrink-0 rounded-full",
                      team.slot === 1 ? "bg-team-blue" : "bg-team-amber",
                    )}
                  />
                  {team.displayName} · {plural(team.goals, "gol", "goles")}
                </span>
              }
            >
              {appearances.map((appearance) => (
                <AppearanceRow
                  appearance={appearance}
                  filters={filters}
                  key={appearance.playerId}
                />
              ))}
            </DrillList>
          ))}
          {teamless.length ? (
            <DrillList title="Sin equipo">
              {teamless.map((appearance) => (
                <AppearanceRow
                  appearance={appearance}
                  filters={filters}
                  key={appearance.playerId}
                />
              ))}
            </DrillList>
          ) : null}
        </div>
      </ColumnDetail>

      <DrillList>
        <DrillRow
          label="Abrir el partido"
          value="caja y notas"
          render={({ className, children }) => (
            <Link className={className} href={`/dashboard/partidos/${data.matchId}` as Route}>
              {children}
            </Link>
          )}
        />
      </DrillList>
    </NextStepLayout>
  );
}

/**
 * The long list of a detail page. Mobile: inline below the summary. Desktop: a
 * row in the left column, open by default in the right column.
 */
function ColumnDetail({
  children,
  label,
  mobileHeading,
  value,
}: {
  children: React.ReactNode;
  label: string;
  /** Show `label` as a list title on mobile (when children carry none). */
  mobileHeading?: boolean;
  value: string;
}) {
  const desktop = useIsDesktop();
  const [open, setOpen] = useState(true);
  if (!desktop) {
    return mobileHeading ? (
      <section className="flex flex-col">
        <h2 className="mb-1 text-xs font-medium text-muted-foreground">{label}</h2>
        {children}
      </section>
    ) : (
      <>{children}</>
    );
  }
  return (
    <>
      <DrillList>
        <DrillRow label={label} onClick={() => setOpen(true)} selected={open} value={value} />
      </DrillList>
      <DrillDetail onOpenChange={setOpen} open={open} title={label}>
        {children}
      </DrillDetail>
    </>
  );
}

function AppearanceRow({
  appearance,
  filters,
}: {
  appearance: SerializedMatchDetail["appearances"][number];
  filters: StatsFilterState;
}) {
  const parts = [
    appearance.goals ? plural(appearance.goals, "gol", "goles") : null,
    appearance.assists ? plural(appearance.assists, "asist.", "asist.") : null,
    appearance.ownGoals ? `${appearance.ownGoals} en contra` : null,
    appearance.debtMinor === "0" ? null : "debe",
  ].filter(Boolean);
  return (
    <DrillRow
      label={appearance.playerDisplayName}
      value={parts.length ? parts.join(" · ") : "—"}
      render={({ className, children }) => (
        <Link
          className={className}
          href={filters.href(`${STATS_BASE}/jugadores/${appearance.playerId}`)}
        >
          {children}
        </Link>
      )}
    />
  );
}

function formatMoney(value: string, currency: string) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value) / 100);
}

function outcomeLabel(outcome: "win" | "draw" | "loss") {
  return outcome === "win" ? "Victoria" : outcome === "draw" ? "Empate" : "Derrota";
}

function statusLabel(status: "open" | "closed" | "cancelled") {
  return status === "open" ? "Abierto" : status === "closed" ? "Cerrado" : "Cancelado";
}

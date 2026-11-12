"use client";

import type { PlayerStats, StatsFilters, StatsMatchDetail } from "@hay-fulbo/db/stats";
import { Avatar, AvatarFallback } from "@hay-fulbo/ui/components/avatar";
import { Badge } from "@hay-fulbo/ui/components/badge";
import { buttonVariants } from "@hay-fulbo/ui/components/button";
import { Card } from "@hay-fulbo/ui/components/card";
import { cn } from "@hay-fulbo/ui/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@hay-fulbo/ui/components/table";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeftIcon,
  BanknoteIcon,
  CalendarDaysIcon,
  MapPinIcon,
  TrophyIcon,
} from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { useSearchParams } from "next/navigation";
import type * as React from "react";
import { Fragment, useMemo } from "react";

import { trpc } from "@/utils/trpc";

import { StatsError } from "./stats-error";
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
  const filters = usePlayerFilters();
  const query = useQuery(trpc.stats.player.queryOptions({ playerId, filters }));
  if (query.isPending) return <StatsLoading />;
  if (query.error || !query.data) {
    return (
      <StatsError
        message="No encontramos las estadísticas de este jugador."
        onRetry={() => void query.refetch()}
      />
    );
  }
  return <PlayerStatsContent data={query.data} />;
}

export function MemberMatchStats({ matchId }: { matchId: string }) {
  const query = useQuery(trpc.stats.match.queryOptions({ matchId }));
  if (query.isPending) return <StatsLoading />;
  if (query.error || !query.data) {
    return (
      <StatsError message="No encontramos este partido." onRetry={() => void query.refetch()} />
    );
  }
  return <MatchStatsContent data={query.data} />;
}

function PlayerStatsContent({ data }: { data: SerializedPlayerStats }) {
  const searchParams = useSearchParams();
  const rankingParams = new URLSearchParams(searchParams.toString());
  rankingParams.delete("tab");
  const base = DETAIL_BASE;
  const aggregate = data.aggregate;
  return (
    <div className="mx-auto flex w-full min-w-0 max-w-5xl flex-col gap-6">
      <BackLink href={`${base}?${rankingParams}` as Route}>Volver al ranking</BackLink>

      <header className="flex items-center gap-4">
        <Avatar className="size-12">
          <AvatarFallback>{initials(data.player.displayName)}</AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-2xl font-bold tracking-tight">
              {data.player.displayName}
            </h1>
            {data.player.archived ? <Badge variant="outline">Inactivo</Badge> : null}
          </div>
          <p className="text-sm text-muted-foreground">{data.group.name}</p>
        </div>
      </header>

      {aggregate ? (
        <section aria-label="Resumen del jugador" className="flex flex-col gap-3">
          <Card size="sm" className="py-0">
            <dl className="grid grid-cols-2 gap-px bg-border sm:grid-cols-4">
              <Metric label="Partidos" value={aggregate.played} />
              <Metric label="Goles" value={aggregate.goals} />
              <Metric label="Asistencias" value={aggregate.assists} />
              <Metric label="G+A" value={aggregate.contributions} />
              <Metric label="Ganados" value={aggregate.wins} />
              <Metric label="Empatados" value={aggregate.draws} />
              <Metric label="Perdidos" value={aggregate.losses} />
              <Metric label="Puntos" value={aggregate.points} />
            </dl>
          </Card>
          <p className="text-sm text-muted-foreground">
            {formatRate(aggregate.winPercentage)}% victorias ·{" "}
            {formatRate(aggregate.contributionsPerMatch)} G+A por partido ·{" "}
            {signed(aggregate.goalDifference)} de gol · {aggregate.absences}{" "}
            {aggregate.absences === 1 ? "ausencia" : "ausencias"}
            {aggregate.ratingAverage !== null
              ? ` · nota ${formatRate(aggregate.ratingAverage)} en ${aggregate.ratingMatchCount} ${
                  aggregate.ratingMatchCount === 1 ? "partido" : "partidos"
                }`
              : ""}
          </p>
        </section>
      ) : (
        <section className="flex items-start gap-3 rounded-lg border border-dashed p-4 sm:p-5">
          <TrophyIcon aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <h2 className="text-sm font-semibold">Sin partidos cerrados</h2>
            <p className="text-sm text-muted-foreground">Todavía no jugó ninguno.</p>
          </div>
        </section>
      )}

      <section aria-labelledby="player-history-title" className="flex flex-col gap-3">
        <h2 className="text-base font-semibold" id="player-history-title">
          Partidos
        </h2>
        <Card size="sm" className="py-1">
          {data.matches.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">
              No hay partidos cerrados para mostrar.
            </p>
          ) : (
            <ul className="flex flex-col divide-y">
              {data.matches.map((match) => (
                <li key={match.matchId}>
                  <Link
                    className="flex min-h-14 items-center justify-between gap-4 px-4 py-2.5 transition-colors duration-100 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                    href={`${base}/partidos/${match.matchId}?${rankingParams}` as Route}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm">
                        {match.teams[0]?.displayName}
                        <strong className="mx-2 font-semibold tabular-nums">
                          {match.teams[0]?.goals}–{match.teams[1]?.goals}
                        </strong>
                        {match.teams[1]?.displayName}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {formatDate(match.scheduledAt, data.group.timeZone)}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-3">
                      <Badge variant={match.outcome === "win" ? "success" : "outline"}>
                        {outcomeLabel(match.outcome)}
                      </Badge>
                      <span className="w-12 text-right text-xs tabular-nums text-muted-foreground">
                        <span className="font-semibold text-foreground">{match.contributions}</span>{" "}
                        G+A
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>
    </div>
  );
}

function MatchStatsContent({ data }: { data: SerializedMatchDetail }) {
  const searchParams = useSearchParams();
  const rankingParams = new URLSearchParams(searchParams.toString());
  rankingParams.delete("tab");
  const base = DETAIL_BASE;
  const grouped = data.teams.map((team) => ({
    team,
    appearances: data.appearances.filter((appearance) => appearance.teamId === team.id),
  }));
  const teamless = data.appearances.filter(
    (appearance) => !data.teams.some((team) => team.id === appearance.teamId),
  );
  return (
    <div className="mx-auto flex w-full min-w-0 max-w-5xl flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <BackLink href={`${base}?${rankingParams}` as Route}>Volver</BackLink>
      </div>

      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{statusLabel(data.status)}</Badge>
          {data.figure ? (
            <Badge variant="outline">
              <TrophyIcon data-icon="inline-start" aria-hidden="true" />
              Figura: {data.figure.displayName} · {data.figure.average}
            </Badge>
          ) : null}
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-balance">
          {data.teams[0]?.displayName}
          <span className="mx-2 tabular-nums">
            {data.teams[0]?.goals} – {data.teams[1]?.goals}
          </span>
          {data.teams[1]?.displayName}
        </h1>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <CalendarDaysIcon aria-hidden="true" className="size-4" />
            {formatDate(data.scheduledAt, data.group.timeZone)}
          </span>
          {data.court ? (
            <span className="flex items-center gap-1.5">
              <MapPinIcon aria-hidden="true" className="size-4" />
              {data.court.name}
            </span>
          ) : null}
          {data.courtCostMinor ? (
            <span className="flex items-center gap-1.5 tabular-nums">
              <BanknoteIcon aria-hidden="true" className="size-4" />
              {formatMoney(data.courtCostMinor, data.group.currency)}
            </span>
          ) : null}
        </div>
      </header>

      <section aria-labelledby="appearances-title" className="flex flex-col gap-3">
        <h2 className="text-base font-semibold" id="appearances-title">
          Actuaciones
        </h2>
        <Card className="py-0">
          <Table className="w-full table-fixed text-sm">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-4 text-xs font-medium text-muted-foreground">
                  Jugador
                </TableHead>
                <StatHead title="Goles">G</StatHead>
                <StatHead title="Asistencias">A</StatHead>
                <StatHead title="Goles en contra">AG</StatHead>
                <TableHead className="w-24 pr-4 text-right text-xs font-medium text-muted-foreground">
                  Pago
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {grouped.map(({ team, appearances }) => (
                <Fragment key={team.id}>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableCell className="pl-4" colSpan={5}>
                      <span className="flex items-center justify-between gap-3">
                        <span className="flex min-w-0 items-center gap-2 font-semibold">
                          <span
                            aria-hidden="true"
                            className={cn(
                              "size-2 shrink-0 rounded-full",
                              team.slot === 1 ? "bg-team-blue" : "bg-team-amber",
                            )}
                          />
                          <span className="truncate">{team.displayName}</span>
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                          <span className="font-semibold text-foreground">{team.goals}</span>{" "}
                          {team.goals === 1 ? "gol" : "goles"}
                        </span>
                      </span>
                    </TableCell>
                  </TableRow>
                  {appearances.map((appearance) => (
                    <AppearanceRow
                      appearance={appearance}
                      href={`${base}/jugadores/${appearance.playerId}?${rankingParams}` as Route}
                      key={appearance.playerId}
                    />
                  ))}
                </Fragment>
              ))}
              {teamless.map((appearance) => (
                <AppearanceRow
                  appearance={appearance}
                  href={`${base}/jugadores/${appearance.playerId}?${rankingParams}` as Route}
                  key={appearance.playerId}
                />
              ))}
            </TableBody>
          </Table>
        </Card>
      </section>
    </div>
  );
}

function AppearanceRow({
  appearance,
  href,
}: {
  appearance: SerializedMatchDetail["appearances"][number];
  href: Route;
}) {
  return (
    <TableRow className="h-11">
      <TableCell className="pl-4">
        <Link
          className="block truncate font-medium underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none"
          href={href}
        >
          {appearance.playerDisplayName}
        </Link>
      </TableCell>
      <StatCell value={appearance.goals} />
      <StatCell value={appearance.assists} />
      <StatCell value={appearance.ownGoals} />
      <TableCell className="pr-4 text-right">
        {appearance.debtMinor === "0" ? (
          <span className="text-xs text-muted-foreground">Al día</span>
        ) : (
          <Badge variant="outline">Pendiente</Badge>
        )}
      </TableCell>
    </TableRow>
  );
}

function StatHead({
  children,
  className,
  title,
}: {
  children: React.ReactNode;
  className?: string;
  title: string;
}) {
  return (
    <TableHead
      className={cn("w-14 text-right text-xs font-medium text-muted-foreground", className)}
    >
      <abbr className="no-underline" title={title}>
        {children}
      </abbr>
    </TableHead>
  );
}

function StatCell({ className, value }: { className?: string; value: number }) {
  return (
    <TableCell
      className={cn(
        "text-right tabular-nums",
        value === 0 ? "text-muted-foreground" : "font-semibold",
        className,
      )}
    >
      {value}
    </TableCell>
  );
}

function BackLink({ children, href }: { children: React.ReactNode; href: Route }) {
  return (
    <Link
      className={cn(buttonVariants({ variant: "ghost", size: "sm", className: "-ml-3 w-fit" }))}
      href={href}
    >
      <ArrowLeftIcon data-icon="inline-start" />
      {children}
    </Link>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-1 bg-card px-4 py-3">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-lg font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

const DETAIL_BASE = "/dashboard/estadisticas";

function formatDate(value: Date | string, timeZone: string) {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "full",
    timeZone,
  }).format(new Date(value));
}

function formatRate(value: number) {
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 }).format(value);
}

function formatMoney(value: string, currency: string) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value) / 100);
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function signed(value: number) {
  return value > 0 ? `+${value}` : String(value);
}

function outcomeLabel(outcome: "win" | "draw" | "loss") {
  return outcome === "win" ? "Victoria" : outcome === "draw" ? "Empate" : "Derrota";
}

function statusLabel(status: "open" | "closed" | "cancelled") {
  return status === "open" ? "Abierto" : status === "closed" ? "Cerrado" : "Cancelado";
}

function usePlayerFilters() {
  const searchParams = useSearchParams();
  const period = searchParams.get("period") ?? "all";
  const court = searchParams.get("court") ?? "all";
  const result = searchParams.get("result") ?? "all";
  return useMemo<StatsFilters>(
    () => ({
      ...periodDates(period),
      courtId: court === "all" ? undefined : court,
      result: result === "draws" || result === "decided" ? result : "all",
    }),
    [court, period, result],
  );
}

function periodDates(period: string): Pick<StatsFilters, "from" | "to"> {
  const today = new Date();
  if (period === "30d") {
    const from = new Date(today);
    from.setDate(from.getDate() - 29);
    return { from: isoLocalDate(from), to: isoLocalDate(today) };
  }
  if (period === "year") {
    return {
      from: `${today.getFullYear()}-01-01`,
      to: isoLocalDate(today),
    };
  }
  return {};
}

function isoLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

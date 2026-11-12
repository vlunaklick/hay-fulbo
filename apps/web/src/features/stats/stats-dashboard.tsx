"use client";

import type { StatsAggregate, StatsDashboard, StatsFilters } from "@hay-fulbo/db/stats";
import { Badge } from "@hay-fulbo/ui/components/badge";
import { Button, buttonVariants } from "@hay-fulbo/ui/components/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@hay-fulbo/ui/components/card";
import { Field, FieldLabel } from "@hay-fulbo/ui/components/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hay-fulbo/ui/components/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@hay-fulbo/ui/components/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@hay-fulbo/ui/components/table";
import { cn } from "@hay-fulbo/ui/lib/utils";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarDaysIcon,
  GlobeIcon,
  HandshakeIcon,
  LockKeyholeIcon,
  TrophyIcon,
} from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type * as React from "react";
import { useMemo } from "react";

import { PageHeader } from "@/components/page-header";
import { trpc, trpcHttpClient } from "@/utils/trpc";

import { sharedStatsClient } from "./stats-client";
import { StatsError } from "./stats-error";
import { StatsLoading } from "./stats-loading";
import { useSharedCapability } from "./shared-fragment";

type DashboardMode = "member" | "shared" | "public";
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

export function MemberStatsDashboard() {
  const filters = useStatsFilters();
  const query = useQuery(trpc.stats.dashboard.queryOptions(filters.api));
  return (
    <DashboardQueryState
      data={query.data}
      error={query.error}
      filters={filters}
      mode="member"
      pending={query.isPending}
      retry={() => void query.refetch()}
    />
  );
}

export function SharedStatsDashboard() {
  const capability = useSharedCapability();
  const filters = useStatsFilters();
  const query = useQuery({
    queryKey: ["shared-stats-dashboard", filters.api],
    queryFn: () => sharedStatsClient.dashboard.query(filters.api),
    enabled: capability.ready,
    retry: false,
  });

  if (capability.exchanging) return <StatsLoading />;
  if (capability.error) {
    return (
      <StatsError
        message="No pudimos abrir el enlace privado. Revisá tu conexión o pedile al organizador el enlace más reciente."
        onRetry={capability.retry}
        exitHref={null}
      />
    );
  }
  return (
    <DashboardQueryState
      data={query.data}
      error={query.error}
      filters={filters}
      mode="shared"
      pending={query.isPending}
      retry={() => void query.refetch()}
    />
  );
}

export function PublicStatsDashboard({ slug }: { slug: string }) {
  const filters = useStatsFilters();
  const query = useQuery({
    queryKey: ["public-stats-dashboard", slug, filters.api],
    queryFn: () => trpcHttpClient.public.dashboard.query({ slug, filters: filters.api }),
    retry: false,
  });

  return (
    <DashboardQueryState
      data={query.data}
      error={query.error}
      filters={filters}
      mode="public"
      pending={query.isPending}
      retry={() => void query.refetch()}
      slug={slug}
    />
  );
}

function DashboardQueryState({
  data,
  error,
  filters,
  mode,
  pending,
  retry,
  slug,
}: {
  data?: DashboardData;
  error: { message: string } | null;
  filters: ReturnType<typeof useStatsFilters>;
  mode: DashboardMode;
  pending: boolean;
  retry: () => void;
  slug?: string;
}) {
  if (pending) return <StatsLoading />;
  if (error || !data) {
    return (
      <StatsError
        message={
          mode === "shared"
            ? "Este enlace privado no está activo. Pedile al organizador el enlace más reciente."
            : mode === "public"
              ? "Este grupo no está disponible públicamente."
              : error?.message
        }
        onRetry={retry}
        exitHref={mode === "member" ? "/dashboard" : null}
      />
    );
  }
  return <StatsDashboardContent dashboard={data} filters={filters} mode={mode} slug={slug} />;
}

function StatsDashboardContent({
  dashboard,
  filters,
  mode,
  slug,
}: {
  dashboard: DashboardData;
  filters: ReturnType<typeof useStatsFilters>;
  mode: DashboardMode;
  slug?: string;
}) {
  const detailBase =
    mode === "shared"
      ? "/compartido"
      : mode === "public"
        ? `/g/${slug ?? ""}`
        : "/dashboard/estadisticas";
  const nothingYet =
    !filters.active && dashboard.history.length === 0 && dashboard.ranking.length === 0;
  return (
    <div className="flex w-full min-w-0 flex-col gap-6">
      <PageHeader
        title="Estadísticas"
        description={`${dashboard.group.name} · solo partidos cerrados`}
        actions={
          mode === "shared" ? (
            <Badge variant="outline">
              <LockKeyholeIcon data-icon="inline-start" />
              Enlace privado · solo lectura
            </Badge>
          ) : mode === "public" ? (
            <Badge variant="outline">
              <GlobeIcon data-icon="inline-start" />
              Grupo público · solo lectura
            </Badge>
          ) : null
        }
      />

      {nothingYet ? (
        <PageEmpty
          icon={<TrophyIcon />}
          title="El salón todavía está vacío"
          description="Aparecen cuando se cierre el primer partido."
        />
      ) : (
        <>
          <StatsFiltersBar dashboard={dashboard} filters={filters} />

          <Tabs value={filters.tab} onValueChange={(value) => filters.set("tab", String(value))}>
            <div className="flex items-end justify-between gap-2 border-b">
              <TabsList aria-label="Secciones de estadísticas" variant="line">
                <TabsTrigger value="resumen">Resumen</TabsTrigger>
                <TabsTrigger value="ranking">Ranking</TabsTrigger>
                <TabsTrigger value="partidos">Partidos</TabsTrigger>
              </TabsList>
              {mode === "member" ? (
                <Link
                  href="/dashboard/estadisticas/sociedades"
                  className={cn(
                    buttonVariants({ variant: "ghost", size: "sm", className: "mb-1" }),
                  )}
                >
                  <HandshakeIcon data-icon="inline-start" aria-hidden="true" />
                  Sociedades
                </Link>
              ) : null}
            </div>

            <TabsContent className="pt-4 text-sm" value="resumen">
              <Overview
                dashboard={dashboard}
                detailBase={detailBase}
                onTab={(tab) => filters.set("tab", tab)}
                query={filters.query}
              />
            </TabsContent>

            <TabsContent className="pt-4 text-sm" value="ranking">
              <section aria-labelledby="ranking-title" className="flex flex-col gap-3">
                <SectionHeading
                  description={`${dashboard.summary.matchesPlayed} partidos cerrados · ordenado por G+A`}
                  id="ranking-title"
                  title="Ranking"
                />
                {dashboard.ranking.length === 0 ? (
                  <PageEmpty icon={<TrophyIcon />} title="Todavía no hay tabla" />
                ) : (
                  <Ranking dashboard={dashboard} detailBase={detailBase} query={filters.query} />
                )}
              </section>
            </TabsContent>

            <TabsContent className="pt-4 text-sm" value="partidos">
              <section aria-labelledby="history-title" className="flex flex-col gap-3">
                <SectionHeading
                  description={`${dashboard.summary.totalGoals} goles · ${formatRate(
                    dashboard.summary.goalsPerMatch,
                  )} por partido`}
                  id="history-title"
                  title="Partidos"
                />
                {dashboard.history.length === 0 ? (
                  <NoResults />
                ) : (
                  <Card className="py-1">
                    <MatchList
                      className="px-2"
                      detailBase={detailBase}
                      matches={dashboard.history}
                      timeZone={dashboard.group.timeZone}
                    />
                  </Card>
                )}
              </section>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

function Overview({
  dashboard,
  detailBase,
  onTab,
  query,
}: {
  dashboard: DashboardData;
  detailBase: string;
  onTab: (tab: "ranking" | "partidos") => void;
  query: string;
}) {
  const figure = dashboard.ranking[0] ?? null;
  const scorer = leaderBy(dashboard.ranking, (row) => row.goals);
  const assister = leaderBy(dashboard.ranking, (row) => row.assists);
  const winner = leaderBy(dashboard.ranking, (row) => row.winPercentage);
  const latest = dashboard.history.slice(0, 5);

  return (
    <div className="flex flex-col gap-4">
      <section aria-label="Resumen del período">
        <Card size="sm" className="py-0">
          <dl className="grid grid-cols-3 divide-x">
            <SummaryMetric label="Partidos" value={dashboard.summary.matchesPlayed} />
            <SummaryMetric label="Goles" value={dashboard.summary.totalGoals} />
            <SummaryMetric
              label="Goles por partido"
              value={formatRate(dashboard.summary.goalsPerMatch)}
            />
          </dl>
        </Card>
      </section>

      {figure ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card size="sm">
            <CardHeader>
              <CardTitle>
                <h2 id="spotlight-title">Carrera G+A</h2>
              </CardTitle>
              <CardAction>
                <Button onClick={() => onTab("ranking")} size="sm" variant="ghost">
                  Ver ranking
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              <ContributionRace
                detailBase={detailBase}
                players={dashboard.ranking.slice(0, 5)}
                query={query}
              />
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader>
              <CardTitle>
                <h2>Dueños de la tabla</h2>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="-mx-2 flex flex-col">
                <Leader
                  detailBase={detailBase}
                  label="La figura"
                  player={figure}
                  query={query}
                  suffix="G+A"
                  value={figure.contributions}
                />
                <Leader
                  detailBase={detailBase}
                  label="Goleador"
                  player={scorer}
                  query={query}
                  suffix="goles"
                  value={scorer?.goals ?? 0}
                />
                <Leader
                  detailBase={detailBase}
                  label="El que reparte"
                  player={assister}
                  query={query}
                  suffix="asistencias"
                  value={assister?.assists ?? 0}
                />
                <Leader
                  detailBase={detailBase}
                  label="Más ganador"
                  player={winner}
                  query={query}
                  suffix="victorias"
                  value={`${winner ? Math.round(winner.winPercentage) : 0}%`}
                />
              </ul>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <Card size="sm">
        <CardHeader>
          <CardTitle>
            <h2>Últimos resultados</h2>
          </CardTitle>
          {dashboard.history.length > latest.length ? (
            <CardAction>
              <Button onClick={() => onTab("partidos")} size="sm" variant="ghost">
                Ver todos
              </Button>
            </CardAction>
          ) : null}
        </CardHeader>
        <CardContent>
          {latest.length ? (
            <MatchList
              className="-mx-2"
              detailBase={detailBase}
              matches={latest}
              timeZone={dashboard.group.timeZone}
            />
          ) : (
            <p className="text-sm text-muted-foreground">No hay resultados para estos filtros.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatsFiltersBar({
  dashboard,
  filters,
}: {
  dashboard: DashboardData;
  filters: ReturnType<typeof useStatsFilters>;
}) {
  return (
    <section
      aria-label="Filtros de estadísticas"
      className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center"
    >
      <FilterSelect
        id="stats-period"
        label="Período"
        onChange={(value) => filters.set("period", value)}
        options={[
          { label: "Todos los tiempos", value: "all" },
          { label: "Últimos 30 días", value: "30d" },
          { label: "Este año", value: "year" },
        ]}
        value={filters.period}
      />
      <FilterSelect
        id="stats-court"
        label="Cancha"
        onChange={(value) => filters.set("court", value)}
        options={[
          { label: "Todas las canchas", value: "all" },
          ...dashboard.courts.map((court) => ({ label: court.name, value: court.id })),
        ]}
        value={filters.court}
      />
      <FilterSelect
        className="col-span-2 sm:col-span-1"
        id="stats-result"
        label="Resultado"
        onChange={(value) => filters.set("result", value)}
        options={[
          { label: "Cualquier resultado", value: "all" },
          { label: "Con ganador", value: "decided" },
          { label: "Empates", value: "draws" },
        ]}
        value={filters.result}
      />
      {filters.active ? (
        <Button className="justify-self-start" onClick={filters.reset} variant="ghost">
          Limpiar
        </Button>
      ) : null}
    </section>
  );
}

function FilterSelect({
  className,
  id,
  label,
  onChange,
  options,
  value,
}: {
  className?: string;
  id: string;
  label: string;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
  value: string;
}) {
  return (
    <Field className={cn("min-w-0 sm:w-auto", className)}>
      <FieldLabel className="sr-only" htmlFor={id}>
        {label}
      </FieldLabel>
      <Select
        items={options}
        onValueChange={(nextValue) => {
          if (nextValue !== null) onChange(String(nextValue));
        }}
        value={value}
      >
        <SelectTrigger aria-label={label} className="w-full sm:w-auto sm:min-w-44" id={id}>
          <SelectValue className="min-w-0">
            {options.find((option) => option.value === value)?.label}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Field>
  );
}

function Ranking({
  dashboard,
  detailBase,
  query,
}: {
  dashboard: DashboardData;
  detailBase: string;
  query: string;
}) {
  return (
    <>
      <Card className="py-1 md:hidden">
        <ul className="flex flex-col divide-y">
          {dashboard.ranking.map((row, index) => (
            <li key={row.playerId}>
              <Link
                className="flex min-h-14 items-center gap-3 px-4 py-2.5 transition-colors duration-100 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                href={playerHref(detailBase, row.playerId, query)}
              >
                <span className="w-5 shrink-0 text-xs tabular-nums text-muted-foreground">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">{row.displayName}</span>
                    {row.archived ? <Badge variant="outline">Inactivo</Badge> : null}
                  </span>
                  <span className="mt-0.5 block text-xs tabular-nums text-muted-foreground">
                    {row.played} PJ · {row.goals} G · {row.assists} A · {row.wins}G {row.draws}E{" "}
                    {row.losses}P
                    {row.absences > 0
                      ? ` · ${row.absences} ${row.absences === 1 ? "ausencia" : "ausencias"}`
                      : ""}
                    {row.ratingAverage !== null ? ` · nota ${row.ratingAverage}` : ""}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-base font-semibold tabular-nums">
                    {row.contributions}
                  </span>
                  <span className="block text-xs text-muted-foreground">G+A</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Card>
      <Card className="hidden py-0 md:flex">
        <Table className="text-sm">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-12 pl-4 text-xs font-medium text-muted-foreground">
                #
              </TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground">Jugador</TableHead>
              <NumberHead title="Partidos jugados">PJ</NumberHead>
              <NumberHead title="Goles">G</NumberHead>
              <NumberHead title="Asistencias">A</NumberHead>
              <NumberHead title="Goles más asistencias">G+A</NumberHead>
              <NumberHead title="G+A por partido">Prom.</NumberHead>
              <NumberHead className="w-20" title="Ganados, empatados y perdidos">
                G-E-P
              </NumberHead>
              <NumberHead title="Ausencias">Aus.</NumberHead>
              <NumberHead className="w-20 pr-4" title="Nota promedio (partidos con nota)">
                Nota
              </NumberHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dashboard.ranking.map((row, index) => (
              <TableRow className="h-11" key={row.playerId}>
                <TableCell className="pl-4 tabular-nums text-muted-foreground">
                  {index + 1}
                </TableCell>
                <TableCell>
                  <span className="flex items-center gap-2">
                    <Link
                      aria-label={`Ver estadísticas de ${row.displayName}`}
                      className="font-medium underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none"
                      href={playerHref(detailBase, row.playerId, query)}
                    >
                      {row.displayName}
                    </Link>
                    {row.archived ? <Badge variant="outline">Inactivo</Badge> : null}
                  </span>
                </TableCell>
                <TableCell className="text-right tabular-nums">{row.played}</TableCell>
                <TableCell className="text-right tabular-nums">{row.goals}</TableCell>
                <TableCell className="text-right tabular-nums">{row.assists}</TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  {row.contributions}
                </TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {formatRate(row.contributionsPerMatch)}
                </TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {row.wins}-{row.draws}-{row.losses}
                </TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {row.absences > 0 ? row.absences : "—"}
                </TableCell>
                <TableCell className="pr-4 text-right tabular-nums text-muted-foreground">
                  {row.ratingAverage !== null
                    ? `${row.ratingAverage} (${row.ratingMatchCount})`
                    : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}

function NumberHead({
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
      className={cn("w-16 text-right text-xs font-medium text-muted-foreground", className)}
    >
      <abbr className="no-underline" title={title}>
        {children}
      </abbr>
    </TableHead>
  );
}

function MatchList({
  className,
  detailBase,
  matches,
  timeZone,
}: {
  className?: string;
  detailBase: string;
  matches: DashboardData["history"];
  timeZone: string;
}) {
  return (
    <ul className={cn("flex flex-col", className)}>
      {matches.map((match) => (
        <li key={match.matchId}>
          <Link
            className="flex min-h-11 flex-col gap-0.5 rounded-md px-2 py-2 transition-colors duration-100 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
            href={matchHref(detailBase, match.matchId)}
          >
            <span className="flex min-w-0 items-center gap-2">
              <span className="min-w-0 truncate">
                {match.teams[0]?.displayName}
                <strong className="mx-2 font-semibold tabular-nums">
                  {match.teams[0]?.goals}–{match.teams[1]?.goals}
                </strong>
                {match.teams[1]?.displayName}
              </span>
              {match.status === "cancelled" ? <Badge variant="outline">Cancelado</Badge> : null}
            </span>
            <span className="shrink-0 truncate text-xs text-muted-foreground">
              {formatDate(match.scheduledAt, timeZone)}
              {match.court ? ` · ${match.court.name}` : ""}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function SectionHeading({
  description,
  id,
  title,
}: {
  description: string;
  id: string;
  title: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <h2 className="text-base font-semibold" id={id}>
        {title}
      </h2>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

function SummaryMetric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex min-w-0 flex-col justify-between gap-1 px-4 py-3">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-lg font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

function ContributionRace({
  detailBase,
  players,
  query,
}: {
  detailBase: string;
  players: StatsAggregate[];
  query: string;
}) {
  const maximum = players[0]?.contributions || 1;
  return (
    <ol className="-mx-2 flex flex-col">
      {players.map((player, index) => (
        <li key={player.playerId}>
          <Link
            className="flex min-h-11 items-center gap-3 rounded-md px-2 py-2 transition-colors duration-100 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            href={playerHref(detailBase, player.playerId, query)}
          >
            <span className="w-4 shrink-0 text-xs tabular-nums text-muted-foreground">
              {index + 1}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline justify-between gap-3">
                <span className="truncate font-medium">{player.displayName}</span>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  <span className="font-semibold text-foreground">{player.contributions}</span> G+A
                </span>
              </span>
              <span aria-hidden="true" className="mt-1.5 block h-1 rounded-full bg-muted">
                <span
                  className="block h-full rounded-full bg-foreground/60"
                  style={{ width: `${Math.max((player.contributions / maximum) * 100, 4)}%` }}
                />
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}

function Leader({
  detailBase,
  label,
  player,
  query,
  suffix,
  value,
}: {
  detailBase: string;
  label: string;
  player: StatsAggregate | null;
  query: string;
  suffix: string;
  value: number | string;
}) {
  const body = (
    <>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-medium text-muted-foreground">{label}</span>
        <span className="block truncate font-medium">{player?.displayName ?? "Sin datos"}</span>
      </span>
      <span className="shrink-0 text-right text-xs tabular-nums text-muted-foreground">
        <span className="font-semibold text-foreground">{value}</span> {suffix}
      </span>
    </>
  );
  const className = "flex min-h-11 items-center gap-3 rounded-md px-2 py-2";
  return (
    <li>
      {player ? (
        <Link
          className={cn(
            className,
            "transition-colors duration-100 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
          )}
          href={playerHref(detailBase, player.playerId, query)}
        >
          {body}
        </Link>
      ) : (
        <div className={className}>{body}</div>
      )}
    </li>
  );
}

function NoResults() {
  return (
    <PageEmpty
      icon={<CalendarDaysIcon />}
      title="No hay resultados para estos filtros"
      description="Los partidos abiertos todavía no suman."
    />
  );
}

function PageEmpty({
  description,
  icon,
  title,
}: {
  description?: string;
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <section className="flex items-start gap-3 rounded-lg border border-dashed p-4 sm:p-5">
      <span aria-hidden="true" className="mt-0.5 shrink-0 text-muted-foreground [&_svg]:size-5">
        {icon}
      </span>
      <div className="min-w-0">
        <h2 className="text-sm font-semibold">{title}</h2>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
    </section>
  );
}

function leaderBy(
  ranking: StatsAggregate[],
  value: (player: StatsAggregate) => number,
): StatsAggregate | null {
  return ranking.reduce<StatsAggregate | null>(
    (leader, player) => (!leader || value(player) > value(leader) ? player : leader),
    null,
  );
}

function useStatsFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const period = searchParams.get("period") ?? "all";
  const court = searchParams.get("court") ?? "all";
  const result = searchParams.get("result") ?? "all";
  const api = useMemo<StatsFilters>(() => {
    const dates = periodDates(period);
    return {
      ...dates,
      courtId: court === "all" ? undefined : court,
      result: result === "draws" || result === "decided" ? result : "all",
    };
  }, [court, period, result]);

  function replace(params: URLSearchParams) {
    const query = params.toString();
    router.replace((query ? `${pathname}?${query}` : pathname) as Route, {
      scroll: false,
    });
  }

  return {
    active: period !== "all" || court !== "all" || result !== "all",
    api,
    court,
    period,
    query: searchParams.toString(),
    tab: ["ranking", "partidos"].includes(searchParams.get("tab") ?? "")
      ? searchParams.get("tab")!
      : "resumen",
    result,
    reset: () => replace(new URLSearchParams()),
    set(key: string, value: string) {
      const next = new URLSearchParams(searchParams.toString());
      if (value === "all") next.delete(key);
      else next.set(key, value);
      replace(next);
    },
  };
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

function formatDate(value: Date | string, timeZone: string) {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(value));
}

function formatRate(value: number) {
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 }).format(value);
}

function playerHref(base: string, playerId: string, query: string) {
  const path = `${base}/jugadores/${playerId}`;
  return `${path}${query ? `?${query}` : ""}` as Route;
}

function matchHref(base: string, matchId: string) {
  return `${base}/partidos/${matchId}` as Route;
}

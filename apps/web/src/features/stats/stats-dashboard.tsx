"use client";

import type { StatsAggregate, StatsDashboard, StatsFilters } from "@hay-fulbo/db/stats";
import { Avatar, AvatarFallback } from "@hay-fulbo/ui/components/avatar";
import { Badge } from "@hay-fulbo/ui/components/badge";
import { Button, buttonVariants } from "@hay-fulbo/ui/components/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@hay-fulbo/ui/components/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@hay-fulbo/ui/components/empty";
import { Field, FieldLabel } from "@hay-fulbo/ui/components/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hay-fulbo/ui/components/select";
import { Separator } from "@hay-fulbo/ui/components/separator";
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
  ArrowRightIcon,
  CalendarDaysIcon,
  Clock3Icon,
  CrosshairIcon,
  FlameIcon,
  LockKeyholeIcon,
  MedalIcon,
  SparklesIcon,
  TrophyIcon,
} from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";

import { initials } from "@/lib/initials";
import { trpc } from "@/utils/trpc";
import { cn } from "@hay-fulbo/ui/lib/utils";

import { sharedStatsClient } from "./stats-client";
import { StatsError } from "./stats-error";
import { StatsLoading } from "./stats-loading";
import { useSharedCapability } from "./shared-fragment";

type DashboardMode = "member" | "shared";
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
    return <StatsError message={capability.error.message} />;
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

function DashboardQueryState({
  data,
  error,
  filters,
  mode,
  pending,
  retry,
}: {
  data?: DashboardData;
  error: { message: string } | null;
  filters: ReturnType<typeof useStatsFilters>;
  mode: DashboardMode;
  pending: boolean;
  retry: () => void;
}) {
  if (pending) return <StatsLoading />;
  if (error || !data) {
    return (
      <StatsError
        message={
          mode === "shared"
            ? "Este enlace privado no está activo. Pedile al organizador el enlace más reciente."
            : error?.message
        }
        onRetry={retry}
      />
    );
  }
  return <StatsDashboardContent dashboard={data} filters={filters} mode={mode} />;
}

function StatsDashboardContent({
  dashboard,
  filters,
  mode,
}: {
  dashboard: DashboardData;
  filters: ReturnType<typeof useStatsFilters>;
  mode: DashboardMode;
}) {
  const detailBase = mode === "shared" ? "/compartido" : "/dashboard/estadisticas";
  const figure = dashboard.ranking[0] ?? null;
  const scorer = leaderBy(dashboard.ranking, (row) => row.goals);
  const assister = leaderBy(dashboard.ranking, (row) => row.assists);
  const winner = leaderBy(dashboard.ranking, (row) => row.winPercentage);
  return (
    <main
      className={cn(
        "w-full",
        mode === "shared" ? "mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12" : "",
      )}
    >
      <header className="mb-8 flex flex-col gap-3">
        <Badge variant="outline">
          <LockKeyholeIcon data-icon="inline-start" />
          {mode === "shared" ? "Enlace privado · solo lectura" : "Tu grupo"}
        </Badge>
        <div>
          <p className="mb-1 text-sm font-medium text-primary">Estadísticas</p>
          <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Los números de {dashboard.group.name}
          </h1>
        </div>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          Rendimiento, goles y protagonistas. Solo cuentan los partidos cerrados.
        </p>
      </header>

      <StatsFiltersBar dashboard={dashboard} filters={filters} />

      <section aria-labelledby="spotlight-title" className="mt-8">
        {figure ? (
          <Card>
            <CardHeader className="border-b">
              <div className="flex items-center gap-2 text-primary">
                <SparklesIcon aria-hidden="true" />
                <span className="text-xs font-semibold uppercase tracking-wider">
                  El vestuario habla
                </span>
              </div>
              <CardTitle className="text-xl" id="spotlight-title">
                La carrera del grupo
              </CardTitle>
              <CardDescription>
                El ranking combina goles y asistencias del período elegido.
              </CardDescription>
              <CardAction>
                <Badge variant="secondary">{dashboard.summary.matchesPlayed} PJ cerrados</Badge>
              </CardAction>
            </CardHeader>
            <CardContent className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="flex flex-col justify-between gap-8">
                <div className="flex items-center gap-4">
                  <Avatar className="size-16">
                    <AvatarFallback className="bg-primary text-lg font-bold text-primary-foreground">
                      {initials(figure.displayName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <Badge className="mb-2">Figura del grupo</Badge>
                    <h2 className="truncate text-2xl font-bold tracking-tight">
                      {figure.displayName}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {figure.contributions} participaciones de gol
                    </p>
                  </div>
                </div>

                <dl className="grid grid-cols-3 gap-3 border-y py-4">
                  <SpotlightMetric label="Goles" value={figure.goals} />
                  <SpotlightMetric label="Asist." value={figure.assists} />
                  <SpotlightMetric label="Prom." value={formatRate(figure.contributionsPerMatch)} />
                </dl>

                <Link
                  className={buttonVariants({
                    variant: "outline",
                    className: "w-full sm:w-fit",
                  })}
                  href={playerHref(detailBase, figure.playerId, filters.query)}
                >
                  Ver ficha de {figure.displayName}
                  <ArrowRightIcon data-icon="inline-end" />
                </Link>
              </div>

              <div className="border-t pt-6 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
                <div className="mb-5 flex items-end justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">Carrera G+A</p>
                    <p className="text-xs text-muted-foreground">Los cinco más determinantes</p>
                  </div>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {dashboard.summary.totalGoals} goles totales
                  </span>
                </div>
                <ContributionRace
                  detailBase={detailBase}
                  players={dashboard.ranking.slice(0, 5)}
                  query={filters.query}
                />
              </div>
            </CardContent>
          </Card>
        ) : (
          <Empty className="border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <TrophyIcon />
              </EmptyMedia>
              <EmptyTitle>El salón todavía está vacío</EmptyTitle>
              <EmptyDescription>
                Cerrá el primer partido para descubrir al goleador y empezar el ranking.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </section>

      {figure ? (
        <section aria-labelledby="hall-title" className="mt-10">
          <SectionHeading
            eyebrow={`${dashboard.summary.totalGoals} goles en ${dashboard.summary.matchesPlayed} partidos`}
            icon={<MedalIcon />}
            id="hall-title"
            title="Salón de la fama"
          />
          <Card className="mt-4">
            <CardContent className="grid gap-6 md:grid-cols-3">
              <HallLeader
                icon={<CrosshairIcon />}
                label="Goleador"
                player={scorer}
                suffix="goles"
                value={scorer?.goals ?? 0}
              />
              <HallLeader
                icon={<SparklesIcon />}
                label="El que reparte"
                player={assister}
                suffix="asistencias"
                value={assister?.assists ?? 0}
              />
              <HallLeader
                icon={<FlameIcon />}
                label="Más ganador"
                player={winner}
                suffix="% victorias"
                value={winner ? Math.round(winner.winPercentage) : 0}
              />
            </CardContent>
          </Card>
        </section>
      ) : null}

      <section aria-labelledby="ranking-title" className="mt-10">
        <SectionHeading
          eyebrow={`${dashboard.summary.matchesPlayed} partidos cerrados`}
          icon={<TrophyIcon />}
          id="ranking-title"
          title="Ranking"
        />
        <div className="mt-4">
          {dashboard.ranking.length === 0 ? (
            <Empty className="border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <TrophyIcon />
                </EmptyMedia>
                <EmptyTitle>Todavía no hay tabla</EmptyTitle>
                <EmptyDescription>
                  Cerrá el primer partido para que aparezcan PJ, goles, asistencias y resultados.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <Ranking dashboard={dashboard} detailBase={detailBase} query={filters.query} />
          )}
        </div>
      </section>

      <Separator className="my-10" />
      <section aria-labelledby="history-title">
        <SectionHeading
          eyebrow={`${dashboard.summary.totalGoals} goles · ${formatRate(
            dashboard.summary.goalsPerMatch,
          )} por partido`}
          icon={<Clock3Icon />}
          id="history-title"
          title="Historial"
        />
        <div className="mt-4">
          {dashboard.history.length === 0 ? (
            <Empty className="border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <CalendarDaysIcon />
                </EmptyMedia>
                <EmptyTitle>No hay resultados para estos filtros</EmptyTitle>
                <EmptyDescription>
                  Probá otro período o Cancha. Los partidos abiertos todavía no suman.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="border">
              {dashboard.history.map((match, index) => (
                <div key={match.matchId}>
                  {index > 0 ? <Separator /> : null}
                  <Link
                    className={buttonVariants({
                      variant: "ghost",
                      className:
                        "h-auto min-h-16 w-full justify-between rounded-none px-4 py-3 text-left",
                    })}
                    href={matchHref(detailBase, match.matchId)}
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">
                        {match.teams[0]?.displayName} {match.teams[0]?.goals} –{" "}
                        {match.teams[1]?.goals} {match.teams[1]?.displayName}
                      </span>
                      <span className="mt-1 flex items-center gap-2 truncate text-xs text-muted-foreground">
                        {match.status === "cancelled" ? (
                          <Badge variant="outline">Cancelado</Badge>
                        ) : null}
                        <span>
                          {formatDate(match.scheduledAt, dashboard.group.timeZone)}
                          {match.court ? ` · ${match.court.name}` : ""}
                        </span>
                      </span>
                    </span>
                    <ArrowRightIcon className="size-4 text-muted-foreground" />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
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
    <section aria-labelledby="filters-title">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Ajustá la tabla
          </p>
          <h2 className="mt-1 text-xl font-semibold" id="filters-title">
            Filtros
          </h2>
        </div>
        {filters.active ? (
          <Button className="min-h-11" onClick={filters.reset} variant="ghost">
            Limpiar
          </Button>
        ) : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
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
          id="stats-result"
          label="Resultado"
          onChange={(value) => filters.set("result", value)}
          options={[
            { label: "Todos", value: "all" },
            { label: "Con ganador", value: "decided" },
            { label: "Empates", value: "draws" },
          ]}
          value={filters.result}
        />
      </div>
    </section>
  );
}

function FilterSelect({
  id,
  label,
  onChange,
  options,
  value,
}: {
  id: string;
  label: string;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
  value: string;
}) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Select
        items={options}
        onValueChange={(nextValue) => {
          if (nextValue !== null) onChange(String(nextValue));
        }}
        value={value}
      >
        <SelectTrigger className="min-h-11 w-full" id={id}>
          <SelectValue>{options.find((option) => option.value === value)?.label}</SelectValue>
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
      <div className="border md:hidden">
        {dashboard.ranking.map((row, index) => (
          <div key={row.playerId}>
            {index > 0 ? <Separator /> : null}
            <Link
              className={buttonVariants({
                variant: "ghost",
                className: "h-auto min-h-20 w-full justify-start rounded-none px-3 py-3 text-left",
              })}
              href={playerHref(detailBase, row.playerId, query)}
            >
              <span className="mr-2 w-5 text-center text-xs tabular-nums text-muted-foreground">
                {index + 1}
              </span>
              <Avatar className="size-9">
                <AvatarFallback>{initials(row.displayName)}</AvatarFallback>
              </Avatar>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium">{row.displayName}</span>
                  {row.archived ? <Badge variant="outline">Inactivo</Badge> : null}
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {row.played} PJ · {row.goals} G · {row.assists} A · {row.wins}G {row.draws}E{" "}
                  {row.losses}P
                </span>
              </span>
              <span className="text-right">
                <span className="block text-lg font-semibold tabular-nums">
                  {row.contributions}
                </span>
                <span className="block text-[10px] uppercase text-muted-foreground">G+A</span>
              </span>
            </Link>
          </div>
        ))}
      </div>
      <div className="hidden overflow-hidden border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Jugador</TableHead>
              <TableHead className="text-right">PJ</TableHead>
              <TableHead className="text-right">G</TableHead>
              <TableHead className="text-right">A</TableHead>
              <TableHead className="text-right">G+A</TableHead>
              <TableHead className="text-right">Prom.</TableHead>
              <TableHead className="text-right">G-E-P</TableHead>
              <TableHead className="w-12">
                <span className="sr-only">Detalle</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dashboard.ranking.map((row, index) => (
              <TableRow key={row.playerId}>
                <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                <TableCell>
                  <span className="flex items-center gap-2 font-medium">
                    <Avatar className="size-7">
                      <AvatarFallback>{initials(row.displayName)}</AvatarFallback>
                    </Avatar>
                    {row.displayName}
                    {row.archived ? <Badge variant="outline">Inactivo</Badge> : null}
                  </span>
                </TableCell>
                <TableCell className="text-right tabular-nums">{row.played}</TableCell>
                <TableCell className="text-right tabular-nums">{row.goals}</TableCell>
                <TableCell className="text-right tabular-nums">{row.assists}</TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  {row.contributions}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatRate(row.contributionsPerMatch)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {row.wins}-{row.draws}-{row.losses}
                </TableCell>
                <TableCell>
                  <Link
                    aria-label={`Ver estadísticas de ${row.displayName}`}
                    className={buttonVariants({
                      variant: "ghost",
                      size: "icon",
                      className: "min-h-11 min-w-11",
                    })}
                    href={playerHref(detailBase, row.playerId, query)}
                  >
                    <ArrowRightIcon />
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

function SectionHeading({
  eyebrow,
  icon,
  id,
  title,
}: {
  eyebrow: string;
  icon: React.ReactNode;
  id: string;
  title: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex size-9 items-center justify-center bg-muted text-muted-foreground [&_svg]:size-4">
        {icon}
      </span>
      <div>
        <h2 className="text-xl font-semibold" id={id}>
          {title}
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">{eyebrow}</p>
      </div>
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
    <div className="flex flex-col gap-4">
      {players.map((player, index) => (
        <Link
          className="group flex min-h-11 items-center gap-3 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          href={playerHref(detailBase, player.playerId, query)}
          key={player.playerId}
        >
          <span className="w-5 text-center text-xs font-semibold tabular-nums text-muted-foreground">
            {String(index + 1).padStart(2, "0")}
          </span>
          <Avatar className="size-8">
            <AvatarFallback>{initials(player.displayName)}</AvatarFallback>
          </Avatar>
          <span className="min-w-0 flex-1">
            <span className="mb-1.5 flex items-center justify-between gap-3">
              <span className="truncate text-sm font-medium">{player.displayName}</span>
              <span className="text-xs font-semibold tabular-nums">{player.contributions} G+A</span>
            </span>
            <span className="block h-1.5 overflow-hidden rounded-full bg-muted">
              <span
                className="block h-full rounded-full bg-primary transition-[width] duration-200 motion-reduce:transition-none"
                style={{ width: `${Math.max((player.contributions / maximum) * 100, 4)}%` }}
              />
            </span>
          </span>
        </Link>
      ))}
    </div>
  );
}

function SpotlightMetric({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 text-xl font-bold tabular-nums">{value}</dd>
    </div>
  );
}

function HallLeader({
  icon,
  label,
  player,
  suffix,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  player: StatsAggregate | null;
  suffix: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-3 md:items-start">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted text-primary [&_svg]:size-4">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-1 truncate text-base font-semibold">
          {player?.displayName ?? "Sin datos"}
        </p>
        <p className="text-sm tabular-nums text-muted-foreground">
          <span className="font-semibold text-foreground">{value}</span> {suffix}
        </p>
      </div>
    </div>
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

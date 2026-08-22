"use client";

import type { StatsAggregate, StatsDashboard, StatsFilters } from "@hay-fulbo/db/stats";
import { Avatar, AvatarFallback } from "@hay-fulbo/ui/components/avatar";
import { Badge } from "@hay-fulbo/ui/components/badge";
import { Button, buttonVariants } from "@hay-fulbo/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@hay-fulbo/ui/components/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@hay-fulbo/ui/components/tabs";
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
  GlobeIcon,
  LockKeyholeIcon,
  SlidersHorizontalIcon,
  SparklesIcon,
  TrophyIcon,
} from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";

import { initials } from "@/lib/initials";
import { trpc, trpcHttpClient } from "@/utils/trpc";
import { cn } from "@hay-fulbo/ui/lib/utils";

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
  const figure = dashboard.ranking[0] ?? null;
  const scorer = leaderBy(dashboard.ranking, (row) => row.goals);
  const assister = leaderBy(dashboard.ranking, (row) => row.assists);
  const winner = leaderBy(dashboard.ranking, (row) => row.winPercentage);
  return (
    <main
      className={cn(
        "w-full",
        mode === "member" ? "" : "mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12",
      )}
    >
      <header className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          {mode === "shared" ? (
            <Badge className="mb-1 w-fit" variant="outline">
              <LockKeyholeIcon data-icon="inline-start" />
              Enlace privado · solo lectura
            </Badge>
          ) : null}
          {mode === "public" ? (
            <Badge className="mb-1 w-fit" variant="outline">
              <GlobeIcon data-icon="inline-start" />
              Grupo público · solo lectura
            </Badge>
          ) : null}
          <h1 className="text-2xl font-bold tracking-[-0.03em] sm:text-3xl">Estadísticas</h1>
          <p className="text-sm text-muted-foreground">
            {dashboard.group.name} · solo partidos cerrados
          </p>
        </div>
        <div className="flex h-11 w-fit items-center gap-3 rounded-md border bg-card px-3 text-sm">
          <span className="relative flex size-2" aria-hidden="true">
            <span className="absolute inline-flex size-full rounded-full bg-primary/35" />
            <span className="relative inline-flex size-2 rounded-full bg-primary" />
          </span>
          <span className="font-semibold tabular-nums">{dashboard.summary.matchesPlayed} PJ</span>
          <span className="h-4 w-px bg-border" aria-hidden="true" />
          <span className="tabular-nums text-muted-foreground">
            {dashboard.summary.totalGoals} goles
          </span>
        </div>
      </header>

      <StatsFiltersBar dashboard={dashboard} filters={filters} />

      <Tabs className="mt-3" defaultValue="resumen">
        <TabsList
          aria-label="Secciones de estadísticas"
          className="h-9 border-b px-1"
          variant="line"
        >
          <TabsTrigger value="resumen">Resumen</TabsTrigger>
          <TabsTrigger value="ranking">Ranking</TabsTrigger>
          <TabsTrigger value="partidos">Partidos</TabsTrigger>
        </TabsList>

        <TabsContent value="resumen">
          <section aria-labelledby="spotlight-title" className="pt-2">
            {figure ? (
              <Card className="group/spotlight relative isolate gap-0 py-0">
                <PitchMarkings />
                <CardHeader className="relative z-10 flex min-h-16 flex-row items-center justify-between gap-4 border-b px-5 py-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-primary">
                      <SparklesIcon className="size-4" aria-hidden="true" />
                      <span className="text-[11px] font-semibold uppercase tracking-[0.12em]">
                        El vestuario habla
                      </span>
                    </div>
                    <CardTitle className="mt-1 text-base" id="spotlight-title">
                      La carrera del grupo
                    </CardTitle>
                  </div>
                  <Badge className="max-w-48 truncate" variant="secondary">
                    Figura: {figure.displayName}
                  </Badge>
                </CardHeader>

                <CardContent className="relative z-10 grid p-0 lg:grid-cols-[0.82fr_1.18fr_0.9fr]">
                  <div className="flex flex-col justify-between gap-4 p-5 lg:min-h-64">
                    <div>
                      <div className="flex items-center gap-4">
                        <Avatar className="size-14 ring-4 ring-primary/10 transition-transform duration-200 ease-out group-hover/spotlight:-rotate-2 group-hover/spotlight:scale-105 motion-reduce:transition-none">
                          <AvatarFallback className="bg-primary text-base font-bold text-primary-foreground">
                            {initials(figure.displayName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                            La figura
                          </p>
                          <h2 className="truncate text-2xl font-bold tracking-[-0.03em]">
                            {figure.displayName}
                          </h2>
                          <p className="text-sm text-muted-foreground">
                            <span className="font-semibold tabular-nums text-foreground">
                              {figure.contributions}
                            </span>{" "}
                            participaciones de gol
                          </p>
                        </div>
                      </div>

                      <dl className="mt-5 grid grid-cols-3 gap-3 border-y py-3">
                        <SpotlightMetric label="Goles" value={figure.goals} />
                        <SpotlightMetric label="Asist." value={figure.assists} />
                        <SpotlightMetric
                          label="Prom."
                          value={formatRate(figure.contributionsPerMatch)}
                        />
                      </dl>
                    </div>

                    <Link
                      className={buttonVariants({
                        variant: "outline",
                        size: "sm",
                        className:
                          "w-full justify-between bg-background/35 sm:w-fit sm:justify-center",
                      })}
                      href={playerHref(detailBase, figure.playerId, filters.query)}
                    >
                      Ver ficha
                      <ArrowRightIcon
                        className="transition-transform duration-200 ease-out group-hover/button:translate-x-0.5 motion-reduce:transition-none"
                        data-icon="inline-end"
                      />
                    </Link>
                  </div>

                  <div className="border-t p-5 lg:min-h-64 lg:border-l lg:border-t-0">
                    <div className="mb-3 flex items-end justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">Carrera G+A</p>
                        <p className="text-xs text-muted-foreground">
                          Goles y asistencias, cabeza a cabeza
                        </p>
                      </div>
                      <span className="text-xs tabular-nums text-muted-foreground">Top 3</span>
                    </div>
                    <ContributionRace
                      detailBase={detailBase}
                      players={dashboard.ranking.slice(0, 3)}
                      query={filters.query}
                    />
                  </div>

                  <div className="border-t p-5 lg:min-h-64 lg:border-l lg:border-t-0">
                    <p className="text-sm font-semibold">Dueños de la tabla</p>
                    <p className="mb-2 text-xs text-muted-foreground">
                      Los líderes del período elegido
                    </p>
                    <div className="divide-y">
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
                    </div>
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
        </TabsContent>

        <TabsContent value="ranking">
          <section aria-labelledby="ranking-title" className="pt-3">
            <SectionHeading
              eyebrow={`${dashboard.summary.matchesPlayed} partidos cerrados`}
              icon={<TrophyIcon />}
              id="ranking-title"
              title="Ranking"
            />
            <div className="mt-3">
              {dashboard.ranking.length === 0 ? (
                <Empty className="border">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <TrophyIcon />
                    </EmptyMedia>
                    <EmptyTitle>Todavía no hay tabla</EmptyTitle>
                    <EmptyDescription>
                      Cerrá el primer partido para que aparezcan PJ, goles, asistencias y
                      resultados.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <Ranking dashboard={dashboard} detailBase={detailBase} query={filters.query} />
              )}
            </div>
          </section>
        </TabsContent>

        <TabsContent value="partidos">
          <section aria-labelledby="history-title" className="pt-3">
            <SectionHeading
              eyebrow={`${dashboard.summary.totalGoals} goles · ${formatRate(
                dashboard.summary.goalsPerMatch,
              )} por partido`}
              icon={<Clock3Icon />}
              id="history-title"
              title="Partidos"
            />
            <div className="mt-3">
              {dashboard.history.length === 0 ? (
                <Empty className="border">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <CalendarDaysIcon />
                    </EmptyMedia>
                    <EmptyTitle>No hay resultados para estos filtros</EmptyTitle>
                    <EmptyDescription>
                      Probá otro período o cancha. Los partidos abiertos todavía no suman.
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
        </TabsContent>
      </Tabs>
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
    <section aria-label="Filtros de estadísticas" className="rounded-lg border bg-card/55 p-2">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <div className="flex h-9 shrink-0 items-center gap-2 px-2 text-xs font-medium text-muted-foreground">
          <SlidersHorizontalIcon className="size-4" aria-hidden="true" />
          Mirando
        </div>
        <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-3">
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
        {filters.active ? (
          <Button className="min-h-11 shrink-0" onClick={filters.reset} variant="ghost">
            Limpiar
          </Button>
        ) : null}
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
    <Field className="min-w-0">
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
        <SelectTrigger className="min-h-11 w-full bg-background/35" id={id}>
          <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {label}
          </span>
          <SelectValue className="min-w-0 font-medium">
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
    <div className="flex flex-col gap-2">
      {players.map((player, index) => (
        <Link
          className="group/racer flex min-h-14 items-center gap-3 rounded-md px-2 outline-none transition-colors duration-200 ease-out hover:bg-muted/55 focus-visible:ring-2 focus-visible:ring-ring/50 motion-reduce:transition-none"
          href={playerHref(detailBase, player.playerId, query)}
          key={player.playerId}
        >
          <span
            className={cn(
              "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums transition-colors duration-200 motion-reduce:transition-none",
              index === 0
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground group-hover/racer:text-foreground",
            )}
          >
            {String(index + 1).padStart(2, "0")}
          </span>
          <Avatar className="size-8 transition-transform duration-200 ease-out group-hover/racer:scale-105 motion-reduce:transition-none">
            <AvatarFallback className={index === 0 ? "bg-primary/15 text-primary" : ""}>
              {initials(player.displayName)}
            </AvatarFallback>
          </Avatar>
          <span className="min-w-0 flex-1">
            <span className="mb-1.5 flex items-center justify-between gap-3">
              <span className="truncate text-sm font-medium">{player.displayName}</span>
              <span className="text-xs font-semibold tabular-nums">{player.contributions} G+A</span>
            </span>
            <span className="block h-1.5 overflow-hidden rounded-full bg-muted">
              <span
                className="stats-race-bar block h-full rounded-full bg-primary"
                style={{
                  animationDelay: `${index * 70}ms`,
                  width: `${Math.max((player.contributions / maximum) * 100, 4)}%`,
                }}
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
      <dd className="mt-0.5 text-xl font-bold tabular-nums">{value}</dd>
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
    <div className="group/leader flex min-h-[3.65rem] items-center gap-3 py-2">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-primary transition-colors duration-200 ease-out group-hover/leader:bg-primary/15 motion-reduce:transition-none [&_svg]:size-4">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          {label}
        </p>
        <p className="truncate text-sm font-semibold">{player?.displayName ?? "Sin datos"}</p>
      </div>
      <p className="shrink-0 text-right text-xs tabular-nums text-muted-foreground">
        <span className="block text-base font-bold text-foreground">{value}</span>
        {suffix}
      </p>
    </div>
  );
}

function PitchMarkings() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-y-0 right-0 z-0 hidden w-[59%] overflow-hidden opacity-[0.045] lg:block"
    >
      <span className="absolute inset-5 rounded-md border border-foreground" />
      <span className="absolute inset-y-5 left-1/2 w-px bg-foreground" />
      <span className="absolute left-1/2 top-1/2 size-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-foreground" />
      <span className="absolute left-5 top-1/2 h-24 w-12 -translate-y-1/2 border border-l-0 border-foreground" />
      <span className="absolute right-5 top-1/2 h-24 w-12 -translate-y-1/2 border border-r-0 border-foreground" />
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

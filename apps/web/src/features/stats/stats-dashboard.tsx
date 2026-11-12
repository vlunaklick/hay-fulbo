"use client";

import type { StatsDashboard, StatsFilters } from "@hay-fulbo/db/stats";
import { Badge } from "@hay-fulbo/ui/components/badge";
import { Card } from "@hay-fulbo/ui/components/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@hay-fulbo/ui/components/tabs";
import { cn } from "@hay-fulbo/ui/lib/utils";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarDaysIcon,
  GlobeIcon,
  LockKeyholeIcon,
  TrophyIcon,
  UsersRoundIcon,
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
import { StatsFilters as StatsFiltersControl } from "./stats-filters";
import { StatsLoading } from "./stats-loading";
import { Chemistry, RankingTable } from "./stats-planilla";
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
  const { summary } = dashboard;
  return (
    <div className="flex w-full min-w-0 flex-col gap-5">
      <PageHeader
        title="Estadísticas"
        description={
          <span className="tabular-nums">
            {dashboard.group.name} · {summary.matchesPlayed}{" "}
            {summary.matchesPlayed === 1 ? "partido cerrado" : "partidos cerrados"} ·{" "}
            {summary.totalGoals} goles · {formatRate(summary.goalsPerMatch)} por partido
          </span>
        }
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
          <StatsFiltersControl courts={dashboard.courts} filters={filters} />

          <Tabs value={filters.tab} onValueChange={(value) => filters.set("tab", String(value))}>
            <div className="border-b">
              <TabsList aria-label="Secciones de estadísticas" variant="line">
                <TabsTrigger value="tabla">Tabla</TabsTrigger>
                <TabsTrigger value="quimica">Química</TabsTrigger>
                <TabsTrigger value="partidos">Partidos</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent className="pt-4 text-sm" value="tabla">
              {dashboard.ranking.length === 0 ? (
                <NoResults />
              ) : (
                <RankingTable
                  playerHref={(playerId) => playerHref(detailBase, playerId, filters.query)}
                  ranking={dashboard.ranking}
                />
              )}
            </TabsContent>

            <TabsContent className="pt-4 text-sm" value="quimica">
              {dashboard.societies.length === 0 ? (
                <PageEmpty
                  icon={<UsersRoundIcon />}
                  title="Todavía no hay química para medir"
                  description="Aparece cuando una pareja comparte equipo en dos partidos cerrados."
                />
              ) : (
                <Chemistry ranking={dashboard.ranking} societies={dashboard.societies} />
              )}
            </TabsContent>

            <TabsContent className="pt-4 text-sm" value="partidos">
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
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
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
    tab: ["quimica", "partidos"].includes(searchParams.get("tab") ?? "")
      ? searchParams.get("tab")!
      : "tabla",
    result,
    reset: () => replace(new URLSearchParams()),
    set(key: string, value: string) {
      const next = new URLSearchParams(searchParams.toString());
      if (value === "all" || (key === "tab" && value === "tabla")) next.delete(key);
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

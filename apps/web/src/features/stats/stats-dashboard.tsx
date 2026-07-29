"use client";

import type { StatsDashboard, StatsFilters } from "@hay-fulbo/db/stats";
import { Alert, AlertDescription, AlertTitle } from "@hay-fulbo/ui/components/alert";
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
import { Label } from "@hay-fulbo/ui/components/label";
import {
  Select,
  SelectContent,
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
  BanknoteIcon,
  CalendarDaysIcon,
  CheckCircle2Icon,
  Clock3Icon,
  LockKeyholeIcon,
  MapPinIcon,
  TrophyIcon,
  UsersIcon,
} from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";

import { trpc } from "@/utils/trpc";

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
  const detailBase = mode === "shared" ? "/compartido" : "/estadisticas";
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <header className="mb-8 space-y-3">
        <Badge variant="outline">
          <LockKeyholeIcon data-icon="inline-start" />
          {mode === "shared" ? "Enlace privado · solo lectura" : "Tu grupo"}
        </Badge>
        <div>
          <p className="mb-1 text-sm text-muted-foreground">El vestuario</p>
          <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            {dashboard.group.name}
          </h1>
        </div>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          Próxima fecha, caja y números del grupo. Las estadísticas deportivas cuentan solamente
          partidos cerrados.
        </p>
      </header>

      <section aria-label="Próxima fecha y caja" className="grid gap-4 lg:grid-cols-2">
        <UpcomingCard dashboard={dashboard} detailBase={detailBase} />
        <FinancesCard dashboard={dashboard} />
      </section>

      <Separator className="my-8" />
      <StatsFiltersBar dashboard={dashboard} filters={filters} />

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

function UpcomingCard({ dashboard, detailBase }: { dashboard: DashboardData; detailBase: string }) {
  const match = dashboard.upcoming;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Próximo partido</CardTitle>
        <CardDescription>La fecha que viene</CardDescription>
        {match ? (
          <CardAction>
            <Badge variant="secondary">Abierto</Badge>
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent>
        {match ? (
          <div className="space-y-5">
            <div className="flex items-start gap-3">
              <CalendarDaysIcon className="mt-0.5 size-5 text-primary" />
              <div>
                <p className="text-base font-medium">
                  {formatDate(match.scheduledAt, dashboard.group.timeZone)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {formatTime(match.scheduledAt, dashboard.group.timeZone)}
                </p>
              </div>
            </div>
            {match.court ? (
              <div className="flex items-start gap-3">
                <MapPinIcon className="mt-0.5 size-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{match.court.name}</p>
                  <p className="text-xs text-muted-foreground">{match.court.address}</p>
                </div>
              </div>
            ) : null}
            {match.courtCostMinor ? (
              <div className="flex items-start gap-3">
                <BanknoteIcon className="mt-0.5 size-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">
                    {formatMoney(match.courtCostMinor, dashboard.group.currency)}
                  </p>
                  <p className="text-xs text-muted-foreground">Costo de la Cancha</p>
                </div>
              </div>
            ) : null}
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-y py-4 text-center">
              <TeamName name={match.teams[0]?.displayName ?? "Equipo 1"} />
              <span className="text-xs text-muted-foreground">VS</span>
              <TeamName name={match.teams[1]?.displayName ?? "Equipo 2"} />
            </div>
            <Link
              className={buttonVariants({
                variant: "outline",
                className: "min-h-11 w-full",
              })}
              href={matchHref(detailBase, match.matchId)}
            >
              Ver partido
              <ArrowRightIcon data-icon="inline-end" />
            </Link>
          </div>
        ) : (
          <Empty className="min-h-52 p-4">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <CalendarDaysIcon />
              </EmptyMedia>
              <EmptyTitle>No hay una próxima fecha</EmptyTitle>
              <EmptyDescription>
                Cuando el organizador cargue un partido abierto, va a aparecer acá.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </CardContent>
    </Card>
  );
}

function FinancesCard({ dashboard }: { dashboard: DashboardData }) {
  const finances = dashboard.finances;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Caja de la fecha</CardTitle>
        <CardDescription>
          {finances?.courtCostMinor
            ? `Cancha ${formatMoney(finances.courtCostMinor, dashboard.group.currency)}`
            : "Esperado, pagado y pendiente"}
        </CardDescription>
        {finances ? (
          <CardAction>
            <Badge variant={finances.debtMinor === "0" ? "secondary" : "outline"}>
              {finances.debtMinor === "0" ? (
                <CheckCircle2Icon data-icon="inline-start" />
              ) : (
                <BanknoteIcon data-icon="inline-start" />
              )}
              {finances.debtMinor === "0" ? "Al día" : "Hay deuda"}
            </Badge>
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent>
        {finances ? (
          <div className="space-y-5">
            <dl className="grid grid-cols-3 gap-3">
              <MoneyMetric
                label="Esperado"
                value={formatMoney(finances.expectedMinor, dashboard.group.currency)}
              />
              <MoneyMetric
                label="Pagado"
                value={formatMoney(finances.paidMinor, dashboard.group.currency)}
              />
              <MoneyMetric
                label="Falta"
                value={formatMoney(finances.debtMinor, dashboard.group.currency)}
              />
            </dl>
            <Alert>
              <UsersIcon />
              <AlertTitle>
                {finances.paidCount} de {finances.participantCount} al día
              </AlertTitle>
              <AlertDescription>
                {finances.debtors.length === 0
                  ? "La caja está completa."
                  : `${finances.debtors.length} ${
                      finances.debtors.length === 1 ? "persona debe" : "personas deben"
                    }.`}
              </AlertDescription>
            </Alert>
            {finances.debtors.length > 0 ? (
              <div aria-label="Deudores" className="space-y-1">
                {finances.debtors.map((debtor) => (
                  <div
                    className="flex min-h-11 items-center justify-between gap-3 border-b py-2 last:border-0"
                    key={debtor.playerId}
                  >
                    <span className="truncate text-sm">{debtor.displayName}</span>
                    <Badge variant="outline">
                      {formatMoney(debtor.debtMinor, dashboard.group.currency)}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <Empty className="min-h-52 p-4">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <BanknoteIcon />
              </EmptyMedia>
              <EmptyTitle>Sin caja abierta</EmptyTitle>
              <EmptyDescription>
                La caja se arma con las participaciones del próximo partido.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </CardContent>
    </Card>
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
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Select onValueChange={(nextValue) => onChange(String(nextValue))} value={value}>
        <SelectTrigger className="min-h-11 w-full" id={id}>
          <SelectValue>{options.find((option) => option.value === value)?.label}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem className="min-h-11" key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
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

function TeamName({ name }: { name: string }) {
  return <p className="truncate text-sm font-semibold">{name}</p>;
}

function MoneyMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 truncate text-sm font-semibold tabular-nums sm:text-base">{value}</dd>
    </div>
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

function formatTime(value: Date | string, timeZone: string) {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatMoney(value: string, currency: string) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value) / 100);
}

function formatRate(value: number) {
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 }).format(value);
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function playerHref(base: string, playerId: string, query: string) {
  const path = `${base}/jugadores/${playerId}`;
  return `${path}${query ? `?${query}` : ""}` as Route;
}

function matchHref(base: string, matchId: string) {
  return `${base}/partidos/${matchId}` as Route;
}

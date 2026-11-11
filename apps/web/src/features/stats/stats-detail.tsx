"use client";

import type { PlayerStats, StatsFilters, StatsMatchDetail } from "@hay-fulbo/db/stats";
import { Avatar, AvatarFallback } from "@hay-fulbo/ui/components/avatar";
import { Badge } from "@hay-fulbo/ui/components/badge";
import { buttonVariants } from "@hay-fulbo/ui/components/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@hay-fulbo/ui/components/card";
import { Separator } from "@hay-fulbo/ui/components/separator";
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
  LockKeyholeIcon,
  MapPinIcon,
  TrophyIcon,
} from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { useSearchParams } from "next/navigation";
import { Fragment, useMemo } from "react";

import { trpc, trpcHttpClient } from "@/utils/trpc";

import { sharedStatsClient } from "./stats-client";
import { StatsError } from "./stats-error";
import { StatsLoading } from "./stats-loading";
import { useSharedCapability } from "./shared-fragment";

type Mode = "member" | "shared" | "public";
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
  return <PlayerStatsContent data={query.data} mode="member" />;
}

export function SharedPlayerStats({ playerId }: { playerId: string }) {
  const capability = useSharedCapability();
  const filters = usePlayerFilters();
  const query = useQuery({
    queryKey: ["shared-player-stats", playerId, filters],
    queryFn: () => sharedStatsClient.player.query({ playerId, filters }),
    enabled: capability.ready,
    retry: false,
  });
  if (capability.error)
    return (
      <StatsError
        message="No pudimos abrir el enlace privado. Revisá tu conexión o pedile al organizador el enlace más reciente."
        onRetry={capability.retry}
        exitHref="/compartido"
      />
    );
  if (capability.exchanging || query.isPending) return <StatsLoading />;
  if (query.error || !query.data) {
    return (
      <StatsError
        message="El jugador no está disponible en este enlace."
        exitHref="/compartido"
        onRetry={() => void query.refetch()}
      />
    );
  }
  return <PlayerStatsContent data={query.data} mode="shared" />;
}

export function MemberMatchStats({ matchId }: { matchId: string }) {
  const query = useQuery(trpc.stats.match.queryOptions({ matchId }));
  if (query.isPending) return <StatsLoading />;
  if (query.error || !query.data) {
    return (
      <StatsError message="No encontramos este partido." onRetry={() => void query.refetch()} />
    );
  }
  return <MatchStatsContent data={query.data} mode="member" />;
}

export function SharedMatchStats({ matchId }: { matchId: string }) {
  const capability = useSharedCapability();
  const query = useQuery({
    queryKey: ["shared-match-stats", matchId],
    queryFn: () => sharedStatsClient.match.query({ matchId }),
    enabled: capability.ready,
    retry: false,
  });
  if (capability.error)
    return (
      <StatsError
        message="No pudimos abrir el enlace privado. Revisá tu conexión o pedile al organizador el enlace más reciente."
        onRetry={capability.retry}
        exitHref="/compartido"
      />
    );
  if (capability.exchanging || query.isPending) return <StatsLoading />;
  if (query.error || !query.data) {
    return (
      <StatsError
        message="El partido no está disponible en este enlace."
        exitHref="/compartido"
        onRetry={() => void query.refetch()}
      />
    );
  }
  return <MatchStatsContent data={query.data} mode="shared" />;
}

export function PublicPlayerStats({ playerId, slug }: { playerId: string; slug: string }) {
  const filters = usePlayerFilters();
  const query = useQuery({
    queryKey: ["public-player-stats", slug, playerId, filters],
    queryFn: () => trpcHttpClient.public.player.query({ playerId, slug, filters }),
    retry: false,
  });
  if (query.isPending) return <StatsLoading />;
  if (query.error || !query.data) {
    return (
      <StatsError
        message="Este grupo no está disponible públicamente."
        exitHref={`/g/${slug}` as Route}
        onRetry={() => void query.refetch()}
      />
    );
  }
  return <PlayerStatsContent data={query.data} mode="public" slug={slug} />;
}

export function PublicMatchStats({ matchId, slug }: { matchId: string; slug: string }) {
  const query = useQuery({
    queryKey: ["public-match-stats", slug, matchId],
    queryFn: () => trpcHttpClient.public.match.query({ matchId, slug }),
    retry: false,
  });
  if (query.isPending) return <StatsLoading />;
  if (query.error || !query.data) {
    return (
      <StatsError
        message="Este grupo no está disponible públicamente."
        exitHref={`/g/${slug}` as Route}
        onRetry={() => void query.refetch()}
      />
    );
  }
  return <MatchStatsContent data={query.data} mode="public" slug={slug} />;
}

function PlayerStatsContent({
  data,
  mode,
  slug,
}: {
  data: SerializedPlayerStats;
  mode: Mode;
  slug?: string;
}) {
  const searchParams = useSearchParams();
  const rankingParams = new URLSearchParams(searchParams.toString());
  rankingParams.set("tab", "ranking");
  const base =
    mode === "shared"
      ? "/compartido"
      : mode === "public"
        ? (`/g/${slug ?? ""}` as Route)
        : "/dashboard/estadisticas";
  return (
    <div className="mx-auto w-full min-w-0 max-w-5xl">
      <Link
        className={cn(
          buttonVariants({
            variant: "ghost",
            className: "mb-8 min-h-11",
          }),
        )}
        href={`${base}?${rankingParams}` as Route}
      >
        <ArrowLeftIcon data-icon="inline-start" />
        Volver al ranking
      </Link>
      <header className="flex items-center gap-4">
        <Avatar className="size-14">
          <AvatarFallback>{initials(data.player.displayName)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-3xl font-semibold tracking-tight">
              {data.player.displayName}
            </h1>
            {data.player.archived ? <Badge variant="outline">Inactivo</Badge> : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{data.group.name}</p>
        </div>
      </header>

      {data.aggregate ? (
        <>
          <section
            aria-label="Resumen del jugador"
            className="mt-8 grid grid-cols-2 gap-px overflow-hidden border bg-border sm:grid-cols-4"
          >
            <Metric label="Partidos" value={data.aggregate.played} />
            <Metric label="Goles" value={data.aggregate.goals} />
            <Metric label="Asistencias" value={data.aggregate.assists} />
            <Metric label="G+A" value={data.aggregate.contributions} />
            <Metric label="Ganados" value={data.aggregate.wins} />
            <Metric label="Empatados" value={data.aggregate.draws} />
            <Metric label="Perdidos" value={data.aggregate.losses} />
            <Metric label="Puntos" value={data.aggregate.points} />
            <Metric label="Ausencias" value={data.aggregate.absences} />
          </section>
          <p className="mt-3 text-sm text-muted-foreground">
            {formatRate(data.aggregate.winPercentage)}% victorias ·{" "}
            {formatRate(data.aggregate.contributionsPerMatch)} G+A por partido ·{" "}
            {signed(data.aggregate.goalDifference)} de gol
            {data.aggregate.ratingAverage !== null
              ? ` · nota ${formatRate(data.aggregate.ratingAverage)} en ${data.aggregate.ratingMatchCount} ${
                  data.aggregate.ratingMatchCount === 1 ? "partido" : "partidos"
                }`
              : ""}
          </p>
        </>
      ) : (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Sin partidos cerrados</CardTitle>
            <CardDescription>
              Este jugador existe en el grupo, pero todavía no tiene una actuación que cuente para
              estadísticas.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <Separator className="my-10" />
      <section aria-labelledby="player-history-title">
        <div className="flex items-center gap-3">
          <TrophyIcon className="size-5 text-muted-foreground" />
          <h2 className="text-xl font-semibold" id="player-history-title">
            Partidos
          </h2>
        </div>
        <Card className="mt-4 gap-0 py-0">
          {data.matches.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              No hay partidos cerrados para mostrar.
            </p>
          ) : (
            data.matches.map((match, index) => (
              <div key={match.matchId}>
                {index > 0 ? <Separator /> : null}
                <Link
                  className={cn(
                    buttonVariants({
                      variant: "ghost",
                      className:
                        "grid h-auto min-h-16 w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] whitespace-normal rounded-none px-4 py-3 text-left",
                    }),
                  )}
                  href={`${base}/partidos/${match.matchId}?${rankingParams}` as Route}
                >
                  <span className="min-w-0 whitespace-normal">
                    <span className="block text-sm font-medium">
                      {match.teams[0]?.displayName} {match.teams[0]?.goals} –{" "}
                      {match.teams[1]?.goals} {match.teams[1]?.displayName}
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {formatDate(match.scheduledAt, data.group.timeZone)}
                    </span>
                  </span>
                  <span className="flex flex-col items-end gap-2 sm:flex-row">
                    <Badge variant={match.outcome === "win" ? "secondary" : "outline"}>
                      {outcomeLabel(match.outcome)}
                    </Badge>
                    <span className="text-sm font-semibold tabular-nums">
                      {match.contributions} G+A
                    </span>
                  </span>
                </Link>
              </div>
            ))
          )}
        </Card>
      </section>
    </div>
  );
}

function MatchStatsContent({
  data,
  mode,
  slug,
}: {
  data: SerializedMatchDetail;
  mode: Mode;
  slug?: string;
}) {
  const searchParams = useSearchParams();
  const rankingParams = new URLSearchParams(searchParams.toString());
  rankingParams.set("tab", "ranking");
  const base =
    mode === "shared"
      ? "/compartido"
      : mode === "public"
        ? (`/g/${slug ?? ""}` as Route)
        : "/dashboard/estadisticas";
  return (
    <div className="mx-auto w-full min-w-0 max-w-5xl">
      <div className="mb-8 flex items-center justify-between gap-4">
        <Link
          className={cn(
            buttonVariants({
              variant: "ghost",
              className: "min-h-11",
            }),
          )}
          href={`${base}?${rankingParams}` as Route}
        >
          <ArrowLeftIcon data-icon="inline-start" />
          Volver
        </Link>
        {mode !== "member" ? (
          <Badge variant="outline">
            <LockKeyholeIcon data-icon="inline-start" />
            Solo lectura
          </Badge>
        ) : null}
      </div>

      <header>
        <Badge variant="secondary">{statusLabel(data.status)}</Badge>
        {data.figure ? (
          <Badge variant="outline" className="mt-3 flex">
            <TrophyIcon data-icon="inline-start" aria-hidden="true" />
            Figura: {data.figure.displayName} · {data.figure.average}
          </Badge>
        ) : null}
        <h1 className={cn("text-3xl font-semibold tracking-tight", data.figure && "mt-3")}>
          {data.teams[0]?.displayName} {data.teams[0]?.goals} – {data.teams[1]?.goals}{" "}
          {data.teams[1]?.displayName}
        </h1>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
          <span className="flex items-center gap-2">
            <CalendarDaysIcon className="size-4" />
            {formatDate(data.scheduledAt, data.group.timeZone)}
          </span>
          {data.court ? (
            <span className="flex items-center gap-2">
              <MapPinIcon className="size-4" />
              {data.court.name}
            </span>
          ) : null}
          {data.courtCostMinor ? (
            <span className="flex items-center gap-2">
              <BanknoteIcon className="size-4" />
              {formatMoney(data.courtCostMinor, data.group.currency)}
            </span>
          ) : null}
        </div>
      </header>

      <section aria-label="Equipos" className="mt-8">
        <Card className="gap-0 py-0">
          {data.teams.map((team, index) => (
            <Fragment key={team.id}>
              {index > 0 ? <Separator /> : null}
              <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{team.displayName}</p>
                </div>
                <span className="text-2xl font-bold tabular-nums">{team.goals}</span>
              </div>
            </Fragment>
          ))}
        </Card>
      </section>

      <Separator className="my-10" />
      <section aria-labelledby="appearances-title">
        <h2 className="text-xl font-semibold" id="appearances-title">
          Actuaciones
        </h2>
        <Card className="mt-4 gap-0 py-0">
          <Table className="w-full table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[44%]">Jugador</TableHead>
                <TableHead className="text-right">G</TableHead>
                <TableHead className="text-right">A</TableHead>
                <TableHead className="text-right">AG</TableHead>
                {mode !== "public" ? (
                  <TableHead className="w-[26%] text-right">Pago</TableHead>
                ) : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.appearances.map((appearance) => (
                <TableRow key={appearance.playerId}>
                  <TableCell className="whitespace-normal">
                    <Link
                      className={cn(
                        buttonVariants({
                          variant: "link",
                          className:
                            "h-auto min-h-11 min-w-0 w-full whitespace-normal justify-start px-0 text-left",
                        }),
                      )}
                      href={`${base}/jugadores/${appearance.playerId}?${rankingParams}` as Route}
                    >
                      {appearance.playerDisplayName}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{appearance.goals}</TableCell>
                  <TableCell className="text-right tabular-nums">{appearance.assists}</TableCell>
                  <TableCell className="text-right tabular-nums">{appearance.ownGoals}</TableCell>
                  {mode !== "public" ? (
                    <TableCell className="text-right">
                      <Badge variant={appearance.debtMinor === "0" ? "secondary" : "outline"}>
                        {appearance.debtMinor === "0" ? "Al día" : "Pendiente"}
                      </Badge>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-background p-4">
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

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

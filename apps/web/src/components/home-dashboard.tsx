"use client";

import { Alert, AlertDescription, AlertTitle } from "@hay-fulbo/ui/components/alert";
import { Badge } from "@hay-fulbo/ui/components/badge";
import { Button } from "@hay-fulbo/ui/components/button";
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
import { Separator } from "@hay-fulbo/ui/components/separator";
import { Skeleton } from "@hay-fulbo/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRightIcon,
  BanknoteIcon,
  CalendarDaysIcon,
  CircleAlertIcon,
  PlusIcon,
  TrophyIcon,
} from "lucide-react";
import Link from "next/link";

import { useAppContext } from "@/components/app-shell";
import { formatDate } from "@/lib/format";
import { trpc } from "@/utils/trpc";

export function HomeDashboard() {
  const { groupName, role } = useAppContext();
  const stats = useQuery(trpc.stats.dashboard.queryOptions({}));

  if (stats.isPending) {
    return (
      <div className="flex flex-col gap-6" aria-label="Cargando resumen">
        <Skeleton className="h-24 w-full" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-72 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      </div>
    );
  }

  if (stats.isError) {
    return (
      <Alert variant="destructive">
        <CircleAlertIcon aria-hidden="true" />
        <AlertTitle>No pudimos cargar el resumen</AlertTitle>
        <AlertDescription>{stats.error.message}</AlertDescription>
      </Alert>
    );
  }

  const dashboard = stats.data;
  const scorers = dashboard.ranking
    .toSorted(
      (left, right) =>
        right.goals - left.goals ||
        right.contributions - left.contributions ||
        left.displayName.localeCompare(right.displayName, "es"),
    )
    .slice(0, 5);
  const latest = dashboard.history.slice(0, 4);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-sm font-semibold text-primary">{groupName}</p>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Resumen del grupo</h1>
          <p className="text-sm text-muted-foreground">La fecha y los números que importan.</p>
        </div>
        {role === "owner" ? (
          <Button render={<Link href="/dashboard/partidos/nuevo" />} nativeButton={false}>
            <PlusIcon data-icon="inline-start" aria-hidden="true" />
            <span className="hidden sm:inline">Nuevo partido</span>
            <span className="sm:hidden">Nuevo</span>
          </Button>
        ) : null}
      </header>

      <dl className="grid grid-cols-3 overflow-hidden rounded-lg border bg-card">
        <Metric label="Partidos" value={dashboard.summary.matchesPlayed} />
        <Metric label="Goles" value={dashboard.summary.totalGoals} divided />
        <Metric label="Por partido" value={formatRate(dashboard.summary.goalsPerMatch)} divided />
      </dl>

      <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <Card>
          <CardHeader>
            <CardTitle>Goleadores</CardTitle>
            <CardDescription>Partidos cerrados</CardDescription>
            <CardAction>
              <Button
                variant="ghost"
                size="sm"
                render={<Link href="/estadisticas" />}
                nativeButton={false}
              >
                Ver estadísticas
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            {scorers.length ? (
              <div>
                <div className="grid grid-cols-[2rem_1fr_repeat(3,3rem)] gap-2 px-2 pb-2 text-xs text-muted-foreground">
                  <span>#</span>
                  <span>Jugador</span>
                  <span className="text-center">G</span>
                  <span className="text-center">A</span>
                  <span className="text-center">G+A</span>
                </div>
                {scorers.map((player, index) => (
                  <div key={player.playerId}>
                    {index > 0 ? <Separator /> : null}
                    <div className="grid min-h-11 grid-cols-[2rem_1fr_repeat(3,3rem)] items-center gap-2 px-2 text-sm">
                      <span className="text-muted-foreground">{index + 1}</span>
                      <span className="truncate font-medium">{player.displayName}</span>
                      <span className="text-center tabular-nums">{player.goals}</span>
                      <span className="text-center tabular-nums">{player.assists}</span>
                      <strong className="text-center tabular-nums">{player.contributions}</strong>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <CompactEmpty
                icon={<TrophyIcon aria-hidden="true" />}
                title="Todavía no hay tabla"
                description="Cerrá un partido para empezar a sumar."
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Últimos partidos</CardTitle>
            <CardDescription>Resultados recientes</CardDescription>
            <CardAction>
              <Button
                variant="ghost"
                size="sm"
                render={<Link href="/dashboard/partidos" />}
                nativeButton={false}
              >
                Ver todos
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            {latest.length ? (
              <div>
                {latest.map((match, index) => (
                  <div key={match.matchId}>
                    {index > 0 ? <Separator /> : null}
                    <Link
                      href={`/dashboard/partidos/${match.matchId}`}
                      className="flex min-h-14 items-center justify-between gap-3 rounded-md px-2 py-2 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">
                          {match.teams[0]?.displayName ?? "Equipo 1"}{" "}
                          <strong className="tabular-nums">{match.teams[0]?.goals ?? 0}</strong>
                          <span className="px-1 text-muted-foreground">–</span>
                          <strong className="tabular-nums">
                            {match.teams[1]?.goals ?? 0}
                          </strong>{" "}
                          {match.teams[1]?.displayName ?? "Equipo 2"}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {formatDate(match.scheduledAt)}
                        </span>
                      </span>
                      <ArrowRightIcon aria-hidden="true" />
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <CompactEmpty
                icon={<CalendarDaysIcon aria-hidden="true" />}
                title="Sin resultados todavía"
                description="Los partidos cerrados van a aparecer acá."
              />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Próximo partido</CardTitle>
            <CardDescription>
              {dashboard.upcoming
                ? formatDate(dashboard.upcoming.scheduledAt)
                : "No hay una fecha abierta"}
            </CardDescription>
            {dashboard.upcoming ? (
              <CardAction>
                <Badge variant="outline">Abierto</Badge>
              </CardAction>
            ) : null}
          </CardHeader>
          <CardContent>
            {dashboard.upcoming ? (
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {dashboard.upcoming.teams[0]?.displayName ?? "Equipo 1"} vs.{" "}
                    {dashboard.upcoming.teams[1]?.displayName ?? "Equipo 2"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {dashboard.upcoming.court?.name ?? "Cancha a definir"}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  render={<Link href={`/dashboard/partidos/${dashboard.upcoming.matchId}`} />}
                  nativeButton={false}
                  aria-label="Abrir próximo partido"
                >
                  <ArrowRightIcon aria-hidden="true" />
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Cuando cargues la próxima fecha, va a quedar visible acá.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Caja actual</CardTitle>
            <CardDescription>Estado del próximo partido</CardDescription>
            {dashboard.finances ? (
              <CardAction>
                <Badge variant={dashboard.finances.debtMinor === "0" ? "secondary" : "outline"}>
                  {dashboard.finances.debtMinor === "0" ? "Al día" : "Pendiente"}
                </Badge>
              </CardAction>
            ) : null}
          </CardHeader>
          <CardContent>
            {dashboard.finances ? (
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-2xl font-bold tabular-nums">
                    {dashboard.finances.paidCount}/{dashboard.finances.participantCount}
                  </p>
                  <p className="text-xs text-muted-foreground">jugadores al día</p>
                </div>
                <BanknoteIcon className="text-muted-foreground" aria-hidden="true" />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                La caja aparece al sumar jugadores a una fecha abierta.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Metric({
  divided = false,
  label,
  value,
}: {
  divided?: boolean;
  label: string;
  value: number | string;
}) {
  return (
    <div className={`flex flex-col gap-1 px-3 py-4 sm:px-5 ${divided ? "border-l" : ""}`}>
      <dt className="truncate text-xs text-muted-foreground">{label}</dt>
      <dd className="text-xl font-bold tabular-nums sm:text-2xl">{value}</dd>
    </div>
  );
}

function CompactEmpty({
  description,
  icon,
  title,
}: {
  description: string;
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <Empty className="min-h-44 p-4">
      <EmptyHeader>
        <EmptyMedia variant="icon">{icon}</EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

function formatRate(value: number) {
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 }).format(value);
}

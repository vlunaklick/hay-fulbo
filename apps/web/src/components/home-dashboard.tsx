"use client";

import { Alert, AlertDescription, AlertTitle } from "@hay-fulbo/ui/components/alert";
import { Badge } from "@hay-fulbo/ui/components/badge";
import { Button } from "@hay-fulbo/ui/components/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@hay-fulbo/ui/components/card";
import {
  Empty,
  EmptyContent,
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
  MapPinIcon,
  PlusIcon,
  TrophyIcon,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";

import { BlurFade } from "@hay-fulbo/ui/components/blur-fade";
import { BorderBeam } from "@hay-fulbo/ui/components/border-beam";
import { MagicCard } from "@hay-fulbo/ui/components/magic-card";
import { Meteors } from "@hay-fulbo/ui/components/meteors";
import { NumberTicker } from "@hay-fulbo/ui/components/number-ticker";

import { useAppContext } from "@/components/app-shell";
import { NewMatchDialog } from "@/components/new-match-dialog";
import { formatDate, formatMoney } from "@/lib/format";
import { trpc } from "@/utils/trpc";

export function HomeDashboard() {
  const { groupName, role, user } = useAppContext();
  const stats = useQuery(trpc.stats.dashboard.queryOptions({}));
  const directory = useQuery(trpc.matches.directory.queryOptions());
  const [createOpen, setCreateOpen] = useState(false);

  if (stats.isPending || directory.isPending) {
    return (
      <div className="flex flex-col gap-4" aria-label="Cargando resumen">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-56 w-full" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-72 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      </div>
    );
  }

  if (stats.isError || directory.isError) {
    return (
      <Alert variant="destructive">
        <CircleAlertIcon aria-hidden="true" />
        <AlertTitle>No pudimos cargar el resumen</AlertTitle>
        <AlertDescription>{stats.error?.message ?? directory.error?.message}</AlertDescription>
      </Alert>
    );
  }

  const dashboard = stats.data;
  const me = directory.data.players.find((player) => player.linkedUserId === user.id);
  const myStats = me ? (dashboard.ranking.find((row) => row.playerId === me.id) ?? null) : null;
  const myDebt = me
    ? (dashboard.finances?.debtors.find((row) => row.playerId === me.id) ?? null)
    : null;
  const scorers = dashboard.ranking
    .toSorted(
      (left, right) =>
        right.goals - left.goals ||
        right.contributions - left.contributions ||
        left.displayName.localeCompare(right.displayName, "es"),
    )
    .slice(0, 5);
  const latest = dashboard.history.slice(0, 3);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">{groupName}</p>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Resumen del grupo</h1>
      </header>

      <NextMatchHero
        canCreate={role !== "member"}
        onCreate={() => setCreateOpen(true)}
        upcoming={dashboard.upcoming}
      />

      <section aria-label="Tu resumen">
        <dl className="grid gap-px overflow-hidden border bg-border sm:grid-cols-3">
          <PersonalMetric label="Tu deuda del último partido">
            {myDebt ? (
              myDebt.debtMinor === "0" ? (
                <span className="flex items-center gap-2 text-lg">
                  <Badge variant="secondary">Al día</Badge>
                </span>
              ) : (
                <strong className="text-xl font-bold tabular-nums text-destructive">
                  {formatMoney(myDebt.debtMinor)}
                </strong>
              )
            ) : (
              <span className="text-sm text-muted-foreground">Nada pendiente</span>
            )}
          </PersonalMetric>
          <PersonalMetric label="Goles + asistencias">
            {myStats ? (
              <strong className="text-xl font-bold tabular-nums">
                <NumberTicker value={myStats.contributions} />
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  (<NumberTicker value={myStats.goals} className="text-base" /> G ·{" "}
                  <NumberTicker value={myStats.assists} className="text-base" /> A)
                </span>
              </strong>
            ) : (
              <span className="text-sm text-muted-foreground">Todavía sin partidos cerrados</span>
            )}
          </PersonalMetric>
          <PersonalMetric label="Caja del grupo">
            {dashboard.finances ? (
              <strong className="text-xl font-bold tabular-nums">
                <NumberTicker value={dashboard.finances.paidCount} />/
                {dashboard.finances.participantCount}
                <span className="ml-2 text-sm font-normal text-muted-foreground">al día</span>
              </strong>
            ) : (
              <span className="text-sm text-muted-foreground">Sin movimientos</span>
            )}
          </PersonalMetric>
        </dl>
      </section>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <MagicCard className="rounded-xl" gradientSize={260}>
          <Card size="sm" className="border-none bg-transparent shadow-none">
            <CardHeader>
              <CardTitle>Últimos resultados</CardTitle>
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
                    <BlurFade key={match.matchId} delay={index} inView duration={0.35}>
                      {index > 0 ? <Separator /> : null}
                      <Link
                        href={`/dashboard/partidos/${match.matchId}`}
                        className="flex min-h-12 items-center justify-between gap-3 rounded-md px-2 py-1.5 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                    </BlurFade>
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
        </MagicCard>

        <MagicCard className="rounded-xl" gradientSize={260}>
          <Card size="sm" className="border-none bg-transparent shadow-none">
            <CardHeader>
              <CardTitle>Goleadores</CardTitle>
              <CardAction>
                <Button
                  variant="ghost"
                  size="sm"
                  render={<Link href="/dashboard/estadisticas" />}
                  nativeButton={false}
                >
                  Ver tabla completa
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent className="pb-1">
              {scorers.length ? (
                <div>
                  {scorers.map((player, index) => (
                    <BlurFade key={player.playerId} delay={index} inView duration={0.35}>
                      {index > 0 ? <Separator /> : null}
                      <div className="grid min-h-11 grid-cols-[auto_1fr_repeat(3,3rem)] items-center gap-2 px-2 text-sm">
                        <span className="w-5 text-xs text-muted-foreground">{index + 1}</span>
                        <span className="truncate font-medium">{player.displayName}</span>
                        <span className="text-center tabular-nums">{player.goals}</span>
                        <span className="text-center tabular-nums text-muted-foreground">
                          {player.assists}
                        </span>
                        <strong className="text-center tabular-nums">{player.contributions}</strong>
                      </div>
                    </BlurFade>
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
        </MagicCard>
      </div>

      <NewMatchDialog onOpenChange={setCreateOpen} open={createOpen} />
    </div>
  );
}

function NextMatchHero({
  canCreate,
  onCreate,
  upcoming,
}: {
  canCreate: boolean;
  onCreate: () => void;
  upcoming: {
    matchId: string;
    scheduledAt: string | Date;
    courtCostMinor: string | null;
    court?: { name: string } | null;
    teams: ReadonlyArray<{ slot: number; displayName: string }>;
  } | null;
}) {
  if (!upcoming) {
    return (
      <Empty className="border py-10">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CalendarDaysIcon aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>No hay próxima fecha</EmptyTitle>
          <EmptyDescription>Createla y empezá a convocar a los jugadores.</EmptyDescription>
        </EmptyHeader>
        {canCreate ? (
          <EmptyContent>
            <Button onClick={onCreate}>
              <PlusIcon data-icon="inline-start" aria-hidden="true" />
              Crear próximo partido
            </Button>
          </EmptyContent>
        ) : null}
      </Empty>
    );
  }
  const teamOne = upcoming.teams[0]?.displayName ?? "Equipo 1";
  const teamTwo = upcoming.teams[1]?.displayName ?? "Equipo 2";
  return (
    <Link
      href={`/dashboard/partidos/${upcoming.matchId}` as Route}
      className="group relative block overflow-hidden rounded-xl border bg-card transition-colors hover:border-primary/40"
    >
      <Meteors className="opacity-70" number={14} />
      <BorderBeam duration={7} size={48} />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-primary/60 to-transparent"
      />
      <div className="relative flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-primary">
            <CalendarDaysIcon className="size-4" aria-hidden="true" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em]">
              Próximo partido
            </span>
          </div>
          <h2 className="mt-2 truncate text-3xl font-bold tracking-tight md:text-4xl">
            {teamOne} <span className="font-medium text-muted-foreground">vs.</span> {teamTwo}
          </h2>
          <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span>{formatDate(upcoming.scheduledAt)}</span>
            <span className="flex items-center gap-1.5">
              <MapPinIcon className="size-4" aria-hidden="true" />
              {upcoming.court?.name ?? "Cancha a definir"}
            </span>
            {upcoming.courtCostMinor ? (
              <span className="flex items-center gap-1.5">
                <BanknoteIcon className="size-4" aria-hidden="true" />
                {formatMoney(upcoming.courtCostMinor)}
              </span>
            ) : null}
          </p>
        </div>
        <Button size="lg" variant="outline" className="shrink-0 max-sm:w-full">
          Abrir partido
          <ArrowRightIcon
            data-icon="inline-end"
            aria-hidden="true"
            className="transition-transform duration-200 ease-out group-hover:translate-x-0.5 motion-reduce:transition-none"
          />
        </Button>
      </div>
    </Link>
  );
}

function PersonalMetric({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="flex min-h-20 flex-col justify-center gap-1 bg-card px-4 py-3">
      <dt className="flex items-center gap-1.5 truncate text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </dt>
      <dd>{children}</dd>
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
    <Empty className="min-h-28 p-3">
      <EmptyHeader>
        <EmptyMedia variant="icon">{icon}</EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

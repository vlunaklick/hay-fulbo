"use client";

import { Alert, AlertDescription, AlertTitle } from "@hay-fulbo/ui/components/alert";
import { Button, buttonVariants } from "@hay-fulbo/ui/components/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@hay-fulbo/ui/components/card";
import { Item } from "@hay-fulbo/ui/components/item";
import { Skeleton } from "@hay-fulbo/ui/components/skeleton";
import { cn } from "@hay-fulbo/ui/lib/utils";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRightIcon,
  BanknoteIcon,
  CalendarDaysIcon,
  CircleAlertIcon,
  MapPinIcon,
  PlusIcon,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";

import { useAppContext } from "@/components/app-shell";
import { NewMatchDialog } from "@/components/new-match-dialog";
import { PageHeader } from "@/components/page-header";
import { formatDate, formatMoney, formatShortDate } from "@/lib/format";
import { trpc } from "@/utils/trpc";

export function HomeDashboard() {
  const { groupName, role, user } = useAppContext();
  const stats = useQuery(trpc.stats.dashboard.queryOptions({}));
  const directory = useQuery(trpc.matches.directory.queryOptions());
  const upcomingId = stats.data?.upcoming?.matchId;
  const upcomingDetail = useQuery({
    ...trpc.matches.detail.queryOptions({ matchId: upcomingId ?? "" }),
    enabled: Boolean(upcomingId),
  });
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
  const myAppearance = upcomingDetail.data
    ? [
        ...upcomingDetail.data.teams.flatMap((team) => team.appearances),
        ...upcomingDetail.data.absences.filter((absence) => absence.owesContribution),
      ].find((appearance) => appearance.playerId === me?.id)
    : undefined;
  const myDebt = myAppearance
    ? BigInt(myAppearance.expectedMinor) - BigInt(myAppearance.paidMinor)
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
    <div className="flex flex-col gap-8">
      <PageHeader title="Resumen del grupo" description={groupName} />

      <NextMatchHero
        canCreate={role !== "member"}
        onCreate={() => setCreateOpen(true)}
        upcoming={dashboard.upcoming}
      />

      <section aria-label="Tu resumen">
        <Card size="sm" className="py-0">
          <dl className="grid divide-y sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <PersonalMetric label="Tu aporte">
              {!me ? (
                <MetricPlaceholder hint="Tu cuenta no está vinculada a un jugador." />
              ) : !dashboard.upcoming ? (
                <MetricPlaceholder hint="No hay próximo partido." />
              ) : dashboard.upcoming.courtCostMinor === null ? (
                <MetricPlaceholder hint="Costo a definir." />
              ) : upcomingDetail.isPending ? (
                <MetricPlaceholder hint="Cargando tu aporte…" />
              ) : upcomingDetail.isError ? (
                <span className="flex items-center gap-1 text-sm">
                  No pudimos cargar tu aporte.
                  <Button variant="ghost" size="sm" onClick={() => upcomingDetail.refetch()}>
                    Reintentar
                  </Button>
                </span>
              ) : myDebt === null ? (
                <MetricPlaceholder hint="Todavía no tenés un aporte asignado." />
              ) : myDebt <= 0n ? (
                <MetricValue>{myDebt < 0n ? "A favor" : "Al día"}</MetricValue>
              ) : (
                <MetricValue className="text-destructive">
                  Te falta {formatMoney(myDebt.toString())}
                </MetricValue>
              )}
            </PersonalMetric>
            <PersonalMetric label="Goles + asistencias">
              {myStats ? (
                <MetricValue>
                  {myStats.contributions}
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    {myStats.goals} G · {myStats.assists} A
                  </span>
                </MetricValue>
              ) : (
                <MetricPlaceholder hint="Se suma al cerrar partidos." />
              )}
            </PersonalMetric>
            <PersonalMetric label="Caja del grupo">
              {dashboard.finances ? (
                <MetricValue>
                  {dashboard.finances.paidCount}/{dashboard.finances.participantCount}
                  <span className="ml-2 text-sm font-normal text-muted-foreground">al día</span>
                </MetricValue>
              ) : (
                <MetricPlaceholder hint="Sin movimientos." />
              )}
            </PersonalMetric>
          </dl>
        </Card>
      </section>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Card size="sm">
          <CardHeader>
            <CardTitle>
              <h2>Últimos resultados</h2>
            </CardTitle>
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
              <ul className="-mx-2 flex flex-col">
                {latest.map((match) => (
                  <li key={match.matchId}>
                    <Item
                      size="sm"
                      className="min-h-11 flex-nowrap justify-between gap-3 px-2 py-2"
                      render={<Link href={`/dashboard/partidos/${match.matchId}`} />}
                    >
                      <span className="min-w-0 truncate text-sm">
                        {match.teams[0]?.displayName ?? "Equipo 1"}
                        <strong className="mx-2 font-semibold tabular-nums">
                          {match.teams[0]?.goals ?? 0}–{match.teams[1]?.goals ?? 0}
                        </strong>
                        {match.teams[1]?.displayName ?? "Equipo 2"}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatShortDate(match.scheduledAt)}
                      </span>
                    </Item>
                  </li>
                ))}
              </ul>
            ) : (
              <CompactEmpty>Los partidos cerrados van a aparecer acá.</CompactEmpty>
            )}
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle>
              <h2>Goleadores</h2>
            </CardTitle>
            <CardAction>
              <Button
                variant="ghost"
                size="sm"
                render={<Link href="/dashboard/estadisticas" />}
                nativeButton={false}
              >
                Ver tabla
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            {scorers.length ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground">
                    <th scope="col" className="w-6 pb-2 text-left font-normal">
                      <span className="sr-only">Posición</span>#
                    </th>
                    <th scope="col" className="pb-2 text-left font-normal">
                      Jugador
                    </th>
                    <th scope="col" className="w-10 pb-2 text-right font-normal">
                      <abbr title="Goles" className="no-underline">
                        G
                      </abbr>
                    </th>
                    <th scope="col" className="w-10 pb-2 text-right font-normal">
                      <abbr title="Asistencias" className="no-underline">
                        A
                      </abbr>
                    </th>
                    <th scope="col" className="w-12 pb-2 text-right font-normal">
                      <abbr title="Goles más asistencias" className="no-underline">
                        G+A
                      </abbr>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {scorers.map((player, index) => (
                    <tr key={player.playerId} className="h-10 border-t">
                      <td className="text-xs text-muted-foreground tabular-nums">{index + 1}</td>
                      <td className="max-w-0 truncate font-medium">{player.displayName}</td>
                      <td className="text-right tabular-nums">{player.goals}</td>
                      <td className="text-right tabular-nums text-muted-foreground">
                        {player.assists}
                      </td>
                      <td className="text-right font-semibold tabular-nums">
                        {player.contributions}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <CompactEmpty>La tabla arranca cuando cierres el primer partido.</CompactEmpty>
            )}
          </CardContent>
        </Card>
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
      <section
        aria-label="Próximo partido"
        className="flex flex-col gap-4 rounded-lg border border-dashed p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
      >
        <div className="flex min-w-0 items-start gap-3">
          <CalendarDaysIcon
            className="mt-0.5 size-5 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
          <div className="min-w-0">
            <h2 className="text-sm font-semibold">No hay próxima fecha</h2>
            <p className="text-sm text-muted-foreground">
              {canCreate
                ? "Createla y empezá a convocar a los jugadores."
                : "Cuando el organizador la cree, va a aparecer acá."}
            </p>
          </div>
        </div>
        {canCreate ? (
          <Button onClick={onCreate} className="shrink-0 max-sm:w-full">
            <PlusIcon data-icon="inline-start" aria-hidden="true" />
            Crear próximo partido
          </Button>
        ) : null}
      </section>
    );
  }
  const teamOne = upcoming.teams[0]?.displayName ?? "Equipo 1";
  const teamTwo = upcoming.teams[1]?.displayName ?? "Equipo 2";
  return (
    <section aria-labelledby="proximo-partido">
      <Link
        href={`/dashboard/partidos/${upcoming.matchId}` as Route}
        className="group block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Card className="py-0 transition-colors duration-150 ease-out group-hover:bg-muted/40">
          <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="min-w-0">
              <p id="proximo-partido" className="text-xs font-medium text-muted-foreground">
                Próximo partido
              </p>
              <h2 className="mt-1 truncate text-xl font-bold tracking-tight">
                {teamOne} <span className="font-normal text-muted-foreground">vs.</span> {teamTwo}
              </h2>
              <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <CalendarDaysIcon className="size-4" aria-hidden="true" />
                  {formatDate(upcoming.scheduledAt)}
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPinIcon className="size-4" aria-hidden="true" />
                  {upcoming.court?.name ?? "Cancha a definir"}
                </span>
                {upcoming.courtCostMinor ? (
                  <span className="flex items-center gap-1.5 tabular-nums">
                    <BanknoteIcon className="size-4" aria-hidden="true" />
                    {formatMoney(upcoming.courtCostMinor)}
                  </span>
                ) : null}
              </p>
            </div>
            <span
              className={buttonVariants({
                variant: "outline",
                className: "shrink-0 max-sm:w-full",
              })}
            >
              Abrir partido
              <ArrowRightIcon
                data-icon="inline-end"
                aria-hidden="true"
                className="transition-transform duration-150 ease-out group-hover:translate-x-0.5 motion-reduce:transition-none"
              />
            </span>
          </CardContent>
        </Card>
      </Link>
    </section>
  );
}

function PersonalMetric({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    // dt/dd sit directly in the grouping div: a <dl> group may only be one <div> deep.
    <div className="flex min-h-12 min-w-0 items-center justify-between gap-4 px-4 py-2.5 sm:min-h-20 sm:flex-col sm:items-start sm:justify-center sm:gap-1 sm:py-3">
      <dt className="shrink-0 text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-right sm:text-left">{children}</dd>
    </div>
  );
}

function MetricValue({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <strong className={cn("text-lg font-semibold tabular-nums", className)}>{children}</strong>
  );
}

/** A metric with nothing to show yet: a quiet dash plus why, so it never reads like an error. */
function MetricPlaceholder({ hint }: { hint: string }) {
  return (
    <span className="flex min-w-0 items-baseline gap-2 max-sm:flex-row-reverse">
      <span className="text-lg font-semibold text-muted-foreground" aria-hidden="true">
        —
      </span>
      <span className="truncate text-xs text-muted-foreground">{hint}</span>
    </span>
  );
}

function CompactEmpty({ children }: { children: React.ReactNode }) {
  return <p className="py-6 text-center text-sm text-muted-foreground">{children}</p>;
}

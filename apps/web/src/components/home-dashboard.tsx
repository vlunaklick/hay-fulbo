"use client";

import { Alert, AlertDescription, AlertTitle } from "@hay-fulbo/ui/components/alert";
import { Button } from "@hay-fulbo/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@hay-fulbo/ui/components/card";
import { Skeleton } from "@hay-fulbo/ui/components/skeleton";
import { cn } from "@hay-fulbo/ui/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { ArrowRightIcon, CircleAlertIcon, PlusIcon } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";

import { useAppContext } from "@/components/app-shell";
import { NewMatchDialog } from "@/components/new-match-dialog";
import { PageHeader } from "@/components/page-header";
import { formatMoney, formatShortDate } from "@/lib/format";
import { trpc } from "@/utils/trpc";

/** Closed or cancelled matches shown on the timeline before linking to the full list. */
const shownResults = 6;

/**
 * The group home as a timeline: the next match on top, then every result below
 * it, newest first. Season totals and top scorers sit beside it on desktop and
 * after it on mobile.
 */
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
      <div className="flex flex-col gap-8" aria-label="Cargando resumen">
        <Skeleton className="h-14 w-56" />
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <Skeleton className="h-96 w-full" />
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
  const upcoming = dashboard.upcoming;
  const me = directory.data.players.find((player) => player.linkedUserId === user.id);
  const myAppearance = upcomingDetail.data
    ? [
        ...upcomingDetail.data.teams.flatMap((team) => team.appearances),
        ...upcomingDetail.data.absences.filter((absence) => absence.owesContribution),
      ].find((appearance) => appearance.playerId === me?.id)
    : undefined;
  const myDebt = myAppearance
    ? BigInt(myAppearance.expectedMinor) - BigInt(myAppearance.paidMinor)
    : null;
  const rosterSizes = new Map(
    upcomingDetail.data?.teams.map((team) => [team.slot, team.appearances.length]) ?? [],
  );
  const scorers = dashboard.ranking
    .toSorted(
      (left, right) =>
        right.goals - left.goals ||
        right.contributions - left.contributions ||
        left.displayName.localeCompare(right.displayName, "es"),
    )
    .slice(0, 5);
  const results = dashboard.history.slice(0, shownResults);

  const contribution = !me ? (
    <Quiet>Sin vincular</Quiet>
  ) : !upcoming || upcoming.courtCostMinor === null ? (
    <Quiet>Costo a definir</Quiet>
  ) : upcomingDetail.isPending ? (
    <Quiet>Cargando…</Quiet>
  ) : upcomingDetail.isError ? (
    <Button
      variant="link"
      className="h-auto p-0 font-normal"
      onClick={() => upcomingDetail.refetch()}
    >
      Reintentar
    </Button>
  ) : myDebt === null ? (
    <Quiet>No estás anotado</Quiet>
  ) : myDebt > 0n ? (
    <span className="text-destructive">Te faltan {formatMoney(myDebt.toString())}</span>
  ) : (
    <span className="text-success">{myDebt < 0n ? "A favor" : "Al día"}</span>
  );

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Resumen del grupo" description={groupName} />

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <ol aria-label="Partidos del grupo" className="relative flex flex-col">
          {/* The rail: one hairline behind every marker. */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-3 bottom-3 left-[0.6875rem] w-px bg-border"
          />

          <TimelineEntry marker="next" label="Próximo">
            {upcoming ? (
              <Card className="gap-0 py-0">
                <CardContent className="flex flex-col gap-4 p-4 sm:p-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <h2 className="text-xl font-bold tracking-tight">
                      <MatchWhen value={upcoming.scheduledAt} />
                    </h2>
                    <p className="min-w-0 truncate text-sm text-muted-foreground">
                      {upcoming.court?.name ?? "Cancha a definir"}
                    </p>
                  </div>

                  <ul className="flex flex-col gap-1.5">
                    {upcoming.teams.map((team) => (
                      <li key={team.slot} className="flex min-w-0 items-center gap-2 text-sm">
                        <TeamDot slot={team.slot} />
                        <span className="truncate font-medium">{team.displayName}</span>
                        {rosterSizes.has(team.slot) ? (
                          <span className="ml-auto shrink-0 text-xs text-muted-foreground tabular-nums">
                            {rosterSizes.get(team.slot)} jugadores
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>

                  <dl className="grid grid-cols-2 divide-x rounded-md bg-muted/50 text-sm">
                    <div className="flex min-w-0 flex-col gap-0.5 px-3 py-2">
                      <dt className="text-xs text-muted-foreground">Tu aporte</dt>
                      <dd className="truncate font-semibold tabular-nums">{contribution}</dd>
                    </div>
                    <div className="flex min-w-0 flex-col gap-0.5 px-3 py-2">
                      <dt className="text-xs text-muted-foreground">Caja</dt>
                      <dd className="truncate font-semibold tabular-nums">
                        {dashboard.finances ? (
                          <>
                            {dashboard.finances.paidCount}/{dashboard.finances.participantCount}
                            <span className="font-normal text-muted-foreground"> pagaron</span>
                          </>
                        ) : upcoming.courtCostMinor ? (
                          formatMoney(upcoming.courtCostMinor)
                        ) : (
                          <Quiet>Costo a definir</Quiet>
                        )}
                      </dd>
                    </div>
                  </dl>

                  <Button
                    className="sm:w-fit"
                    render={<Link href={`/dashboard/partidos/${upcoming.matchId}` as Route} />}
                    nativeButton={false}
                  >
                    Abrir partido
                    <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="flex flex-col gap-3 rounded-lg border border-dashed p-4 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-sm font-semibold">No hay próxima fecha</h2>
                {role !== "member" ? (
                  <Button onClick={() => setCreateOpen(true)} className="shrink-0 max-sm:w-full">
                    <PlusIcon data-icon="inline-start" aria-hidden="true" />
                    Crear próximo partido
                  </Button>
                ) : null}
              </div>
            )}
          </TimelineEntry>

          {results.map((match) => (
            <TimelineEntry key={match.matchId} label={formatShortDate(match.scheduledAt)}>
              <ResultEntry match={match} />
            </TimelineEntry>
          ))}

          <TimelineEntry marker="end">
            {results.length ? (
              <Button
                variant="ghost"
                className="-ml-3 w-fit"
                render={<Link href="/dashboard/partidos" />}
                nativeButton={false}
              >
                {dashboard.history.length > shownResults
                  ? `Ver los ${dashboard.history.length} partidos`
                  : "Ver todos los partidos"}
                <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
              </Button>
            ) : (
              <p className="py-2 text-sm text-muted-foreground">Todavía no hay resultados.</p>
            )}
          </TimelineEntry>
        </ol>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-6">
          <Card size="sm" className="py-0">
            <dl className="grid grid-cols-3 divide-x">
              <SeasonMetric label="Partidos" value={dashboard.summary.matchesPlayed} />
              <SeasonMetric label="Goles" value={dashboard.summary.totalGoals} />
              <SeasonMetric
                label="Por partido"
                value={
                  dashboard.summary.matchesPlayed ? dashboard.summary.goalsPerMatch.toFixed(1) : "—"
                }
              />
            </dl>
          </Card>

          <Card size="sm">
            <CardHeader>
              <CardTitle>
                <h2>Goleadores</h2>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {scorers.length ? (
                <ol className="flex flex-col">
                  {scorers.map((player, index) => (
                    <li
                      key={player.playerId}
                      className="flex h-10 items-center gap-3 border-t text-sm first:border-t-0"
                    >
                      <span className="w-4 text-xs text-muted-foreground tabular-nums">
                        {index + 1}
                      </span>
                      <span
                        className={cn(
                          "min-w-0 flex-1 truncate",
                          player.playerId === me?.id && "font-semibold",
                        )}
                      >
                        {player.displayName}
                      </span>
                      <span className="font-semibold tabular-nums">{player.goals}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-muted-foreground">Todavía no hay goles.</p>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="-mx-3 mt-1 w-fit"
                render={<Link href="/dashboard/estadisticas" />}
                nativeButton={false}
              >
                Ver estadísticas
              </Button>
            </CardContent>
          </Card>
        </aside>
      </div>

      <NewMatchDialog onOpenChange={setCreateOpen} open={createOpen} />
    </div>
  );
}

function TimelineEntry({
  children,
  label,
  marker = "past",
}: {
  children: React.ReactNode;
  label?: string;
  marker?: "next" | "past" | "end";
}) {
  return (
    <li className="relative grid grid-cols-[1.5rem_minmax(0,1fr)] gap-x-3 pb-6 last:pb-0">
      <span aria-hidden="true" className="relative flex h-6 items-center justify-center">
        <span
          className={cn(
            "rounded-full",
            marker === "next" && "size-3 bg-background ring-2 ring-foreground",
            marker === "past" && "size-2 bg-muted-foreground",
            marker === "end" && "size-1.5 bg-border",
          )}
        />
      </span>
      <div className="flex min-w-0 flex-col gap-2">
        {label ? (
          <p className="flex h-6 items-center text-xs font-medium text-muted-foreground">{label}</p>
        ) : null}
        {children}
      </div>
    </li>
  );
}

type HistoryMatch = {
  matchId: string;
  status: "open" | "closed" | "cancelled";
  court?: { name: string } | null;
  figure?: { displayName: string } | null;
  teams: ReadonlyArray<{ id: string; slot: number; displayName: string; goals: number }>;
};

function ResultEntry({ match }: { match: HistoryMatch }) {
  const href = `/dashboard/partidos/${match.matchId}` as Route;
  const linkClass =
    "-mx-3 rounded-lg px-3 py-2 transition-colors duration-150 ease-out hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";

  if (match.status === "cancelled") {
    return (
      <Link
        href={href}
        className={cn(linkClass, "flex min-h-11 items-center gap-2 text-sm text-muted-foreground")}
      >
        <span className="truncate line-through decoration-muted-foreground/60">
          {match.teams[0]?.displayName} vs. {match.teams[1]?.displayName}
        </span>
        <span className="ml-auto shrink-0 text-xs">Cancelado</span>
      </Link>
    );
  }

  const top = Math.max(...match.teams.map((team) => team.goals));
  const draw = match.teams.every((team) => team.goals === top);
  const meta = [draw ? "Empate" : null, match.figure ? `Figura: ${match.figure.displayName}` : null]
    .concat(match.court?.name ?? null)
    .filter(Boolean)
    .join(" · ");

  return (
    <Link href={href} className={cn(linkClass, "flex flex-col gap-1.5")}>
      <ul className="flex flex-col gap-1">
        {match.teams.map((team) => {
          const lost = !draw && team.goals < top;
          return (
            <li key={team.id} className="flex min-w-0 items-center gap-2">
              <TeamDot slot={team.slot} />
              <span
                className={cn("truncate text-sm", lost ? "text-muted-foreground" : "font-medium")}
              >
                {team.displayName}
              </span>
              <span
                className={cn(
                  "ml-auto w-6 shrink-0 text-right text-lg tabular-nums",
                  lost ? "text-muted-foreground" : "font-bold",
                )}
              >
                {team.goals}
              </span>
            </li>
          );
        })}
      </ul>
      {meta ? <p className="truncate text-xs text-muted-foreground">{meta}</p> : null}
    </Link>
  );
}

/** "Mañana 21:00" while it's within the week, "Sábado, 14 de noviembre 21:00" after that. */
function MatchWhen({ value }: { value: string | Date }) {
  const date = new Date(value);
  const today = new Date();
  const startOf = (day: Date) => new Date(day.getFullYear(), day.getMonth(), day.getDate());
  const days = Math.round((startOf(date).getTime() - startOf(today).getTime()) / 86_400_000);
  const time = new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
  const relative =
    days === 0 ? "Hoy" : days === 1 ? "Mañana" : days > 1 && days < 7 ? `En ${days} días` : null;
  const day = new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
  return (
    <>
      {relative ?? day.charAt(0).toUpperCase() + day.slice(1)}{" "}
      <span className="tabular-nums">{time}</span>
    </>
  );
}

function TeamDot({ slot }: { slot: number }) {
  return (
    <span
      aria-hidden="true"
      className={cn("size-2 shrink-0 rounded-full", slot === 1 ? "bg-team-blue" : "bg-team-amber")}
    />
  );
}

function SeasonMetric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 px-3 py-3">
      <dt className="truncate text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-lg font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

function Quiet({ children }: { children: React.ReactNode }) {
  return <span className="font-normal text-muted-foreground">{children}</span>;
}

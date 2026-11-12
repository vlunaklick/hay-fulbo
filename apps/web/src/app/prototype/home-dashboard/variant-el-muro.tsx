"use client";

// PROTOTYPE ONLY — "El muro": time is the structure. Next match on top, then every result below it.

import { Button } from "@hay-fulbo/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@hay-fulbo/ui/components/card";
import { cn } from "@hay-fulbo/ui/lib/utils";
import { ArrowRightIcon, PlusIcon } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";

import { NewMatchDialog } from "@/components/new-match-dialog";
import { PageHeader } from "@/components/page-header";
import { formatMoney, formatShortDate } from "@/lib/format";

import { ErrorState, LoadingState, TeamDot, debtCopy } from "./shared";
import { type HomeData, capitalize, relativeDay, splitDate, useHomeData } from "./use-home-data";

const shownResults = 6;

export function VariantElMuro() {
  const data = useHomeData();
  const [createOpen, setCreateOpen] = useState(false);
  if (data.status === "pending") return <LoadingState />;
  if (data.status === "error") return <ErrorState message={data.message} />;

  const results = data.history.slice(0, shownResults);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Inicio" description={data.groupName} />

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <ol aria-label="Partidos del grupo" className="relative flex flex-col">
          {/* The rail: one hairline behind every marker. */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-3 bottom-3 left-[0.6875rem] w-px bg-border"
          />

          <TimelineEntry marker="next" label={data.upcoming ? "Próximo" : "Sin fecha"}>
            {data.upcoming ? (
              <UpcomingEntry data={data} upcoming={data.upcoming} />
            ) : (
              <div className="flex flex-col gap-3 rounded-lg border border-dashed p-4">
                <p className="text-sm text-muted-foreground">
                  {data.canCreate
                    ? "No hay próxima fecha. Creala y empezá a convocar."
                    : "No hay próxima fecha. Cuando el organizador la cree, aparece acá."}
                </p>
                {data.canCreate ? (
                  <Button onClick={() => setCreateOpen(true)} className="sm:w-fit">
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

          {results.length ? (
            <TimelineEntry marker="end" label="">
              <Button
                variant="ghost"
                className="-ml-3 w-fit"
                render={<Link href="/dashboard/partidos" />}
                nativeButton={false}
              >
                {data.history.length > shownResults
                  ? `Ver los ${data.history.length} partidos`
                  : "Ver todos los partidos"}
                <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
              </Button>
            </TimelineEntry>
          ) : (
            <TimelineEntry marker="end" label="">
              <p className="py-2 text-sm text-muted-foreground">
                Los partidos cerrados se suman acá, del más nuevo al más viejo.
              </p>
            </TimelineEntry>
          )}
        </ol>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-6">
          <Season data={data} />
          <Scorers data={data} />
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
  label: string;
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

function UpcomingEntry({
  data,
  upcoming,
}: {
  data: HomeData;
  upcoming: NonNullable<HomeData["upcoming"]>;
}) {
  const { day, time } = splitDate(upcoming.scheduledAt);
  const relative = relativeDay(upcoming.scheduledAt);
  const debt = debtCopy(data.myDebt);
  const finances = data.finances;
  const rosterSize = (slot: number) =>
    data.upcomingDetail?.teams.find((team) => team.slot === slot)?.appearances.length;

  return (
    <Card className="gap-0 py-0">
      <CardContent className="flex flex-col gap-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <p className="text-xl font-bold tracking-tight">
            {relative ?? capitalize(day)} <span className="tabular-nums">{time}</span>
          </p>
          <p className="min-w-0 truncate text-sm text-muted-foreground">
            {upcoming.court?.name ?? "Cancha a definir"}
          </p>
        </div>

        <ul className="flex flex-col gap-1.5">
          {upcoming.teams.map((team) => (
            <li key={team.slot} className="flex min-w-0 items-center gap-2 text-sm">
              <TeamDot slot={team.slot} />
              <span className="truncate font-medium">{team.displayName}</span>
              {rosterSize(team.slot) !== undefined ? (
                <span className="ml-auto shrink-0 text-xs text-muted-foreground tabular-nums">
                  {rosterSize(team.slot)} jugadores
                </span>
              ) : null}
            </li>
          ))}
        </ul>

        <dl className="grid grid-cols-2 divide-x rounded-md bg-muted/50 text-sm">
          <div className="flex min-w-0 flex-col gap-0.5 px-3 py-2">
            <dt className="text-xs text-muted-foreground">Tu aporte</dt>
            <dd
              className={cn(
                "truncate font-semibold tabular-nums",
                debt.tone === "owes" && "text-destructive",
                debt.tone === "ok" && "text-success",
                debt.tone === "quiet" && "font-normal text-muted-foreground",
              )}
            >
              {debt.text}
            </dd>
          </div>
          <div className="flex min-w-0 flex-col gap-0.5 px-3 py-2">
            <dt className="text-xs text-muted-foreground">Caja</dt>
            <dd className="truncate font-semibold tabular-nums">
              {finances ? (
                <>
                  {finances.paidCount}/{finances.participantCount}
                  <span className="font-normal text-muted-foreground"> pagaron</span>
                </>
              ) : upcoming.courtCostMinor ? (
                formatMoney(upcoming.courtCostMinor)
              ) : (
                <span className="font-normal text-muted-foreground">Costo a definir</span>
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
  );
}

function ResultEntry({ match }: { match: HomeData["history"][number] }) {
  const top = Math.max(...match.teams.map((team) => team.goals));
  const draw = match.teams.every((team) => team.goals === top);

  if (match.status === "cancelled") {
    return (
      <Link
        href={`/dashboard/partidos/${match.matchId}` as Route}
        className="-mx-3 flex min-h-11 items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors duration-150 ease-out hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <span className="truncate line-through decoration-muted-foreground/60">
          {match.teams[0]?.displayName} vs. {match.teams[1]?.displayName}
        </span>
        <span className="ml-auto shrink-0 text-xs">Cancelado</span>
      </Link>
    );
  }

  return (
    <Link
      href={`/dashboard/partidos/${match.matchId}` as Route}
      className="-mx-3 flex flex-col gap-1.5 rounded-lg px-3 py-2 transition-colors duration-150 ease-out hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
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
      <p className="truncate text-xs text-muted-foreground">
        {draw ? "Empate" : null}
        {draw && (match.figure || match.court) ? " · " : null}
        {match.figure ? `Figura: ${match.figure.displayName}` : null}
        {match.figure && match.court ? " · " : null}
        {match.court?.name}
      </p>
    </Link>
  );
}

function Season({ data }: { data: HomeData }) {
  return (
    <Card size="sm" className="py-0">
      <dl className="grid grid-cols-3 divide-x">
        <SeasonMetric label="Partidos" value={data.summary.matchesPlayed} />
        <SeasonMetric label="Goles" value={data.summary.totalGoals} />
        <SeasonMetric
          label="Por partido"
          value={data.summary.matchesPlayed ? data.summary.goalsPerMatch.toFixed(1) : "—"}
        />
      </dl>
    </Card>
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

function Scorers({ data }: { data: HomeData }) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>
          <h2>Goleadores</h2>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.scorers.length ? (
          <ol className="flex flex-col">
            {data.scorers.map((player, index) => (
              <li
                key={player.playerId}
                className="flex h-10 items-center gap-3 border-t text-sm first:border-t-0"
              >
                <span className="w-4 text-xs text-muted-foreground tabular-nums">{index + 1}</span>
                <span
                  className={cn(
                    "min-w-0 flex-1 truncate",
                    player.playerId === data.me?.id && "font-semibold",
                  )}
                >
                  {player.displayName}
                </span>
                <span className="font-semibold tabular-nums">{player.goals}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-muted-foreground">
            La tabla arranca cuando se cierre el primer partido.
          </p>
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
  );
}

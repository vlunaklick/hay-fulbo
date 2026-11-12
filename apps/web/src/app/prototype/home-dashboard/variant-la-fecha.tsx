"use client";

// PROTOTYPE ONLY — "La fecha": the next match is the page. Everything else is a footnote.

import { Button } from "@hay-fulbo/ui/components/button";
import { Card, CardContent } from "@hay-fulbo/ui/components/card";
import { Progress } from "@hay-fulbo/ui/components/progress";
import { cn } from "@hay-fulbo/ui/lib/utils";
import { ArrowRightIcon, BanknoteIcon, MapPinIcon } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";

import { NewMatchDialog } from "@/components/new-match-dialog";
import { formatMoney, formatShortDate } from "@/lib/format";

import { ErrorState, LoadingState, NoUpcoming, TeamDot, debtCopy } from "./shared";
import { type HomeData, capitalize, relativeDay, splitDate, useHomeData } from "./use-home-data";

export function VariantLaFecha() {
  const data = useHomeData();
  const [createOpen, setCreateOpen] = useState(false);
  if (data.status === "pending") return <LoadingState />;
  if (data.status === "error") return <ErrorState message={data.message} />;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex min-w-0 flex-col gap-1">
        <p className="truncate text-sm text-muted-foreground">{data.groupName}</p>
        <h1 className="text-2xl font-bold tracking-tight">
          {data.upcoming ? "Se juega" : "Inicio"}
        </h1>
      </header>

      {data.upcoming ? (
        <MatchHero data={data} upcoming={data.upcoming} />
      ) : (
        <NoUpcoming canCreate={data.canCreate} onCreate={() => setCreateOpen(true)} />
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {data.finances ? <Caja finances={data.finances} /> : null}
        <Footnotes data={data} />
      </div>

      <NewMatchDialog onOpenChange={setCreateOpen} open={createOpen} />
    </div>
  );
}

function MatchHero({
  data,
  upcoming,
}: {
  data: HomeData;
  upcoming: NonNullable<HomeData["upcoming"]>;
}) {
  const { day, time } = splitDate(upcoming.scheduledAt);
  const relative = relativeDay(upcoming.scheduledAt);
  const debt = debtCopy(data.myDebt);
  const teams = data.upcomingDetail?.teams ?? [];

  return (
    <section aria-labelledby="la-fecha-titulo">
      <Card className="gap-0 py-0">
        <CardContent className="grid gap-0 p-0 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <div className="flex flex-col gap-4 p-4 sm:p-6">
            <div>
              <h2 id="la-fecha-titulo" className="text-sm font-medium text-muted-foreground">
                {relative ? `${relative} · ` : ""}
                {capitalize(day)}
              </h2>
              <p className="mt-1 text-6xl font-black tracking-tight tabular-nums sm:text-7xl">
                {time}
              </p>
            </div>
            <dl className="flex flex-col gap-2 text-sm">
              <div className="flex min-w-0 items-start gap-2">
                <dt className="sr-only">Cancha</dt>
                <MapPinIcon
                  className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <dd className="min-w-0">{upcoming.court?.name ?? "Cancha a definir"}</dd>
              </div>
              <div className="flex items-start gap-2">
                <dt className="sr-only">Costo</dt>
                <BanknoteIcon
                  className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <dd className="tabular-nums">
                  {upcoming.courtCostMinor
                    ? formatMoney(upcoming.courtCostMinor)
                    : "Costo a definir"}
                </dd>
              </div>
            </dl>
            <p
              className={cn(
                "rounded-md px-3 py-2.5 text-sm font-medium",
                debt.tone === "owes" && "bg-destructive/10 text-destructive",
                debt.tone === "ok" && "bg-success/10 text-success",
                debt.tone === "quiet" && "bg-muted text-muted-foreground",
              )}
            >
              <span className="sr-only">Tu aporte: </span>
              {debt.text}
              {data.myDebt.kind === "owes" ? (
                <span className="font-normal tabular-nums">
                  {" "}
                  · pagaste {formatMoney(data.myDebt.paid.toString())} de{" "}
                  {formatMoney(data.myDebt.expected.toString())}
                </span>
              ) : null}
            </p>
            <Button
              className="w-full lg:mt-auto"
              size="lg"
              render={<Link href={`/dashboard/partidos/${upcoming.matchId}` as Route} />}
              nativeButton={false}
            >
              Abrir partido
              <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
            </Button>
          </div>

          <div className="grid grid-cols-2 border-t lg:border-t-0 lg:border-l">
            {(teams.length
              ? teams
              : upcoming.teams.map((team) => ({ ...team, appearances: [] }))
            ).map((team, index) => (
              <div
                key={team.slot}
                className={cn("flex min-w-0 flex-col gap-3 p-4 sm:p-6", index === 1 && "border-l")}
              >
                <h3 className="flex min-w-0 items-center gap-2 text-sm font-semibold">
                  <TeamDot slot={team.slot} />
                  <span className="truncate">{team.displayName}</span>
                </h3>
                {team.appearances.length ? (
                  <ol className="flex flex-col text-sm">
                    {team.appearances.map((appearance) => {
                      const isMe = appearance.playerId === data.me?.id;
                      return (
                        <li
                          key={appearance.playerId}
                          className={cn(
                            "truncate leading-7",
                            isMe ? "font-semibold" : "text-muted-foreground",
                          )}
                        >
                          {appearance.playerDisplayName}
                          {isMe ? <span className="font-normal"> (vos)</span> : null}
                        </li>
                      );
                    })}
                  </ol>
                ) : (
                  <p className="text-sm text-muted-foreground">Sin jugadores todavía.</p>
                )}
                <p className="mt-auto text-xs text-muted-foreground tabular-nums">
                  {team.appearances.length} jugadores
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

function Caja({ finances }: { finances: NonNullable<HomeData["finances"]> }) {
  const percent = finances.participantCount
    ? Math.round((finances.paidCount / finances.participantCount) * 100)
    : 0;
  const debtors = finances.debtors.map((debtor) => debtor.displayName.split(" ")[0]);
  const shown = debtors.slice(0, 4);
  return (
    <section aria-labelledby="caja-titulo" className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="caja-titulo" className="text-base font-semibold">
          Caja de la fecha
        </h2>
        <p className="text-sm text-muted-foreground tabular-nums">
          {finances.paidCount} de {finances.participantCount} pagaron
        </p>
      </div>
      <Progress value={percent} aria-label="Jugadores que pagaron" />
      <p className="text-sm text-muted-foreground">
        {BigInt(finances.debtMinor) > 0n ? (
          <>
            Faltan{" "}
            <strong className="font-semibold text-foreground tabular-nums">
              {formatMoney(finances.debtMinor)}
            </strong>
            {shown.length ? (
              <>
                {" "}
                · deben {shown.join(", ")}
                {debtors.length > shown.length ? ` y ${debtors.length - shown.length} más` : ""}
              </>
            ) : null}
          </>
        ) : (
          "Todos pagaron."
        )}
      </p>
    </section>
  );
}

function Footnotes({ data }: { data: HomeData }) {
  const last = data.history.find((match) => match.status === "closed");
  const top = data.scorers.slice(0, 3);
  return (
    <section aria-label="Lo último" className="flex flex-col divide-y rounded-lg border">
      {last ? (
        <Link
          href={`/dashboard/partidos/${last.matchId}` as Route}
          className="flex min-h-14 items-center justify-between gap-3 px-4 py-3 transition-colors duration-150 ease-out hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <span className="min-w-0">
            <span className="block text-xs text-muted-foreground">
              Último resultado · {formatShortDate(last.scheduledAt)}
            </span>
            <span className="block truncate text-sm">
              {last.teams[0]?.displayName}{" "}
              <strong className="font-semibold tabular-nums">
                {last.teams[0]?.goals}–{last.teams[1]?.goals}
              </strong>{" "}
              {last.teams[1]?.displayName}
            </span>
          </span>
          <ArrowRightIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        </Link>
      ) : (
        <p className="px-4 py-3 text-sm text-muted-foreground">
          Los partidos cerrados van a aparecer acá.
        </p>
      )}
      {top.length ? (
        <Link
          href="/dashboard/estadisticas"
          className="flex min-h-14 items-center justify-between gap-3 px-4 py-3 transition-colors duration-150 ease-out hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <span className="min-w-0">
            <span className="block text-xs text-muted-foreground">Goleadores</span>
            <span className="block truncate text-sm">
              {top.map((player, index) => (
                <span key={player.playerId}>
                  {index ? <span className="text-muted-foreground"> · </span> : null}
                  {player.displayName.split(" ")[0]}{" "}
                  <strong className="font-semibold tabular-nums">{player.goals}</strong>
                </span>
              ))}
            </span>
          </span>
          <ArrowRightIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        </Link>
      ) : null}
    </section>
  );
}

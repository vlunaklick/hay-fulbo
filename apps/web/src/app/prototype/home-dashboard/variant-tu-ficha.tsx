"use client";

// PROTOTYPE ONLY — "Tu ficha": the home answers "¿y yo?" first; the group is context around you.

import { Button } from "@hay-fulbo/ui/components/button";
import { Card, CardContent } from "@hay-fulbo/ui/components/card";
import { cn } from "@hay-fulbo/ui/lib/utils";
import { ArrowRightIcon, LinkIcon } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";

import { NewMatchDialog } from "@/components/new-match-dialog";
import { formatDate, formatMoney, formatShortDate } from "@/lib/format";

import { ErrorState, LoadingState, NoUpcoming, TeamDot, debtCopy } from "./shared";
import { type HomeData, relativeDay, splitDate, useHomeData } from "./use-home-data";

export function VariantTuFicha() {
  const data = useHomeData();
  const [createOpen, setCreateOpen] = useState(false);
  if (data.status === "pending") return <LoadingState />;
  if (data.status === "error") return <ErrorState message={data.message} />;

  const firstName = (data.me?.displayName ?? data.user.name).split(" ")[0];

  return (
    <div className="flex flex-col gap-8">
      <header className="flex min-w-0 flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Hola, {firstName}</h1>
        <p className="truncate text-sm text-muted-foreground">{data.groupName}</p>
      </header>

      {data.upcoming ? (
        <YourNextMatch data={data} upcoming={data.upcoming} />
      ) : (
        <NoUpcoming canCreate={data.canCreate} onCreate={() => setCreateOpen(true)} />
      )}

      {data.me ? (
        <div className="grid items-start gap-8 lg:grid-cols-2">
          <YourSeason data={data} />
          <YourTable data={data} />
        </div>
      ) : (
        <Unlinked />
      )}

      <NewMatchDialog onOpenChange={setCreateOpen} open={createOpen} />
    </div>
  );
}

function YourNextMatch({
  data,
  upcoming,
}: {
  data: HomeData;
  upcoming: NonNullable<HomeData["upcoming"]>;
}) {
  const debt = debtCopy(data.myDebt);
  const { time } = splitDate(upcoming.scheduledAt);
  const relative = relativeDay(upcoming.scheduledAt);
  const myTeam = data.mySlot ? upcoming.teams.find((team) => team.slot === data.mySlot) : null;

  return (
    <section aria-labelledby="tu-fecha">
      <Card className="gap-0 py-0">
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex min-w-0 flex-col gap-2">
            <h2 id="tu-fecha" className="text-xs font-medium text-muted-foreground">
              Tu próximo partido
            </h2>
            <p
              className={cn(
                "text-2xl font-bold tracking-tight tabular-nums",
                debt.tone === "owes" && "text-destructive",
                debt.tone === "ok" && "text-success",
                debt.tone === "quiet" && "text-muted-foreground",
              )}
            >
              {debt.text}
            </p>
            <p className="flex flex-wrap items-center gap-x-1.5 text-sm text-muted-foreground">
              <span>
                {relative ?? formatDate(upcoming.scheduledAt)}
                {relative ? ` a las ${time}` : ""}
              </span>
              {myTeam ? (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="flex min-w-0 items-center gap-1.5">
                    jugás en
                    <TeamDot slot={myTeam.slot} />
                    <span className="truncate font-medium text-foreground">
                      {myTeam.displayName}
                    </span>
                  </span>
                </>
              ) : null}
              <span aria-hidden="true">·</span>
              <span className="truncate">{upcoming.court?.name ?? "Cancha a definir"}</span>
            </p>
            {data.myDebt.kind === "owes" ? (
              <p className="text-xs text-muted-foreground tabular-nums">
                Pagaste {formatMoney(data.myDebt.paid.toString())} de{" "}
                {formatMoney(data.myDebt.expected.toString())}.
              </p>
            ) : null}
          </div>
          <Button
            className="shrink-0 max-sm:w-full"
            render={<Link href={`/dashboard/partidos/${upcoming.matchId}` as Route} />}
            nativeButton={false}
          >
            Ver partido
            <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
          </Button>
        </CardContent>
      </Card>
    </section>
  );
}

const outcomeCopy = {
  win: { letter: "G", label: "Ganado", className: "bg-success/10 text-success" },
  draw: { letter: "E", label: "Empate", className: "bg-muted text-muted-foreground" },
  loss: { letter: "P", label: "Perdido", className: "bg-destructive/10 text-destructive" },
} as const;

function YourSeason({ data }: { data: HomeData }) {
  const stats = data.myStats;
  const position = stats ? data.ranking.findIndex((row) => row.playerId === stats.playerId) + 1 : 0;
  const recent = data.myMatches.slice(0, 5);

  return (
    <section aria-labelledby="tu-temporada" className="flex flex-col gap-4">
      <h2 id="tu-temporada" className="flex min-h-11 items-center text-base font-semibold">
        Tu temporada
      </h2>
      <Card size="sm" className="py-0">
        <dl className="grid grid-cols-4 divide-x">
          <Metric label="Puesto" value={position ? `${position}°` : "—"} />
          <Metric label="Jugados" value={stats?.played ?? "—"} />
          <Metric label="Goles" value={stats?.goals ?? "—"} />
          <Metric label="Asist." value={stats?.assists ?? "—"} />
        </dl>
      </Card>

      <div className="flex flex-col gap-2">
        <h3 className="text-xs font-medium text-muted-foreground">Últimos partidos</h3>
        {recent.length ? (
          <ol className="flex flex-col">
            {recent.map((match) => {
              const outcome = outcomeCopy[match.outcome];
              const mine = match.teams.find((team) => team.id === match.teamId);
              const theirs = match.teams.find((team) => team.id !== match.teamId);
              return (
                <li key={match.matchId} className="border-t first:border-t-0">
                  <Link
                    href={`/dashboard/partidos/${match.matchId}` as Route}
                    className="-mx-2 flex min-h-11 items-center gap-3 rounded-md px-2 py-2 transition-colors duration-150 ease-out hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    <span
                      className={cn(
                        "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                        outcome.className,
                      )}
                    >
                      <span aria-hidden="true">{outcome.letter}</span>
                      <span className="sr-only">{outcome.label}</span>
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm">
                      <strong className="font-semibold tabular-nums">
                        {mine?.goals}–{theirs?.goals}
                      </strong>{" "}
                      <span className="text-muted-foreground">vs. {theirs?.displayName}</span>
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                      {match.goals || match.assists
                        ? `${match.goals} G · ${match.assists} A`
                        : formatShortDate(match.scheduledAt)}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="text-sm text-muted-foreground">
            Cuando se cierre tu primer partido, tu racha aparece acá.
          </p>
        )}
      </div>
    </section>
  );
}

function YourTable({ data }: { data: HomeData }) {
  const index = data.ranking.findIndex((row) => row.playerId === data.me?.id);
  const start = index < 0 ? 0 : Math.max(0, Math.min(index - 2, data.ranking.length - 5));
  const slice = data.ranking.slice(start, start + 5);

  return (
    <section aria-labelledby="tu-tabla" className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 id="tu-tabla" className="text-base font-semibold">
          Dónde estás
        </h2>
        <Button
          variant="ghost"
          size="sm"
          render={<Link href="/dashboard/estadisticas" />}
          nativeButton={false}
        >
          Tabla completa
        </Button>
      </div>
      {slice.length ? (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-muted-foreground">
              <th scope="col" className="w-8 pb-2 text-left font-normal">
                <span className="sr-only">Posición</span>#
              </th>
              <th scope="col" className="pb-2 text-left font-normal">
                Jugador
              </th>
              <th scope="col" className="w-10 pb-2 text-right font-normal">
                <abbr title="Partidos jugados" className="no-underline">
                  PJ
                </abbr>
              </th>
              <th scope="col" className="w-12 pb-2 text-right font-normal">
                <abbr title="Goles más asistencias" className="no-underline">
                  G+A
                </abbr>
              </th>
              <th scope="col" className="w-12 pb-2 text-right font-normal">
                <abbr title="Puntos" className="no-underline">
                  Pts
                </abbr>
              </th>
            </tr>
          </thead>
          <tbody>
            {slice.map((row, offset) => {
              const isMe = row.playerId === data.me?.id;
              return (
                <tr
                  key={row.playerId}
                  className={cn("h-11 border-t", isMe && "bg-muted font-semibold")}
                  aria-current={isMe ? "true" : undefined}
                >
                  <td className="pl-2 text-xs text-muted-foreground tabular-nums">
                    {start + offset + 1}
                  </td>
                  <td className="max-w-0 truncate">
                    {row.displayName}
                    {isMe ? (
                      <span className="font-normal text-muted-foreground"> · vos</span>
                    ) : null}
                  </td>
                  <td className="text-right tabular-nums text-muted-foreground">{row.played}</td>
                  <td className="text-right tabular-nums">{row.contributions}</td>
                  <td className="pr-2 text-right tabular-nums">{row.points}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <p className="text-sm text-muted-foreground">
          La tabla arranca cuando se cierre el primer partido.
        </p>
      )}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 px-3 py-3">
      <dt className="truncate text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-lg font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

function Unlinked() {
  return (
    <section className="flex flex-col gap-4 rounded-lg border border-dashed p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <LinkIcon className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">Tu cuenta no está vinculada a un jugador</h2>
          <p className="text-sm text-muted-foreground">
            Vinculala para ver tu aporte, tus goles y dónde estás en la tabla.
          </p>
        </div>
      </div>
      <Button
        variant="outline"
        className="shrink-0 max-sm:w-full"
        render={<Link href="/dashboard/perfil" />}
        nativeButton={false}
      >
        Ir a mi perfil
      </Button>
    </section>
  );
}

"use client";

import { Alert, AlertDescription, AlertTitle } from "@hay-fulbo/ui/components/alert";
import { Badge } from "@hay-fulbo/ui/components/badge";
import { Button } from "@hay-fulbo/ui/components/button";
import { Progress } from "@hay-fulbo/ui/components/progress";
import { Skeleton } from "@hay-fulbo/ui/components/skeleton";
import { cn } from "@hay-fulbo/ui/lib/utils";
import type { AppRouter } from "@hay-fulbo/api/routers/index";
import { useQuery } from "@tanstack/react-query";
import type { inferRouterOutputs } from "@trpc/server";
import { ArrowRightIcon, CircleAlertIcon, PlusIcon } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";

import { useAppContext } from "@/components/app-shell";
import { MatchShareRow } from "@/components/match-share-row";
import { NewMatchDetail } from "@/components/new-match-dialog";
import { NextStep } from "@/components/next-step";
import { type FechaPhase, owedFor, pickFecha, rosterTarget } from "@/lib/fecha";
import { formatDayTitle, formatMoney, formatTime } from "@/lib/format";
import { relativeDay } from "@/lib/match-schedule";
import { missingPlayers } from "@/lib/next-step";
import { trpc } from "@/utils/trpc";

type Detail = inferRouterOutputs<AppRouter>["matches"]["detail"];
type Court = { name: string; address: string; mapsUrl: string } | null;

/** Past dates listed beside the fecha before linking to the full history. */
const shownResults = 5;
/** Debtors listed beside the fecha before linking to the match's caja. */
const shownDebtors = 5;

function matchHref(id: string, suffix = "") {
  return `/dashboard/partidos/${id}${suffix}` as Route;
}

const phaseLabel: Record<FechaPhase, string> = {
  upcoming: "Convocando",
  live: "En juego",
  close: "Por cerrar",
  closed: "Cerrada",
};

/**
 * The group home is la fecha: the one match that matters now, in whichever of
 * its four moments it is (convocando, en juego, por cerrar, cerrada), with a
 * single action. What is owed and the last results sit beside it on desktop and
 * below it on phones.
 */
export function HomeDashboard() {
  const { groupName, role, user } = useAppContext();
  const canManage = role !== "member";
  const stats = useQuery(trpc.stats.dashboard.queryOptions({}));
  const directory = useQuery(trpc.matches.directory.queryOptions());
  const list = useQuery(trpc.matches.list.queryOptions({ limit: 50 }));
  const [creating, setCreating] = useState(false);

  const now = new Date();
  const fecha =
    stats.data && list.data
      ? pickFecha({
          now,
          canManage,
          matches: list.data.map((match) => ({
            ...match,
            scheduledAt: new Date(match.scheduledAt),
          })),
          upcomingId: stats.data.upcoming?.matchId ?? null,
        })
      : null;
  const detail = useQuery({
    ...trpc.matches.detail.queryOptions({ matchId: fecha?.matchId ?? "" }),
    enabled: Boolean(fecha),
  });
  // What is owed comes from the last closed match: before kickoff everyone "owes".
  const lastClosedId = stats.data?.history.find((match) => match.status === "closed")?.matchId;
  const lastClosed = useQuery({
    ...trpc.matches.detail.queryOptions({ matchId: lastClosedId ?? "" }),
    enabled: Boolean(lastClosedId),
  });

  if (stats.isPending || directory.isPending || list.isPending) {
    return (
      <HomeLayout>
        <div className="flex flex-col gap-4" aria-label="Cargando la fecha">
          <Skeleton className="h-72 w-full rounded-xl" />
        </div>
        <Skeleton className="h-48 w-full rounded-xl" />
      </HomeLayout>
    );
  }

  if (stats.isError || directory.isError || list.isError) {
    return (
      <Alert variant="destructive" className="mx-auto max-w-xl">
        <CircleAlertIcon aria-hidden="true" />
        <AlertTitle>No pudimos cargar la fecha</AlertTitle>
        <AlertDescription>
          {stats.error?.message ?? directory.error?.message ?? list.error?.message}
        </AlertDescription>
      </Alert>
    );
  }

  const courts = new Map(directory.data.courts.map((court) => [court.id, court] as const));
  const me = directory.data.players.find((player) => player.linkedUserId === user.id);
  const history = stats.data.history.slice(0, shownResults);
  const hasUpcoming = Boolean(stats.data.upcoming);

  return (
    <HomeLayout>
      <h1 className="sr-only">La fecha de {groupName}</h1>
      <div className="flex min-w-0 flex-col gap-4">
        {!fecha ? (
          canManage ? (
            <NextStep
              kicker="No hay próxima fecha"
              title="Armá el próximo partido"
              action={
                <Button onClick={() => setCreating(true)}>
                  <PlusIcon data-icon="inline-start" aria-hidden="true" />
                  Crear partido
                </Button>
              }
            >
              Elegí el día. Cancha y equipos se completan después.
            </NextStep>
          ) : (
            <NextStep kicker="No hay próxima fecha" title="Todavía no hay partido armado">
              Cuando el organizador cree la fecha, la vas a ver acá.
            </NextStep>
          )
        ) : detail.isPending ? (
          <Skeleton aria-label="Cargando la fecha" className="h-72 w-full rounded-xl" />
        ) : detail.isError ? (
          <Alert variant="destructive">
            <CircleAlertIcon aria-hidden="true" />
            <AlertTitle>No pudimos cargar el partido</AlertTitle>
            <AlertDescription>
              <Button variant="outline" className="mt-2 w-fit" onClick={() => detail.refetch()}>
                Reintentar
              </Button>
            </AlertDescription>
          </Alert>
        ) : (
          <FechaCard
            canManage={canManage}
            court={detail.data.courtId ? (courts.get(detail.data.courtId) ?? null) : null}
            detail={detail.data}
            groupName={groupName}
            hasUpcoming={hasUpcoming}
            myPlayerId={me?.id ?? null}
            userId={user.id}
            now={now}
            onCreate={() => setCreating(true)}
            phase={fecha.phase}
          />
        )}
      </div>

      <aside className="flex min-w-0 flex-col gap-4" aria-label="Contexto del grupo">
        {lastClosed.data ? (
          <DebtsCard canManage={canManage} detail={lastClosed.data} myPlayerId={me?.id ?? null} />
        ) : null}
        <section className="flex flex-col gap-1 rounded-xl border bg-card p-4">
          <h2 className="text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
            Últimas fechas
          </h2>
          {history.length ? (
            <ul className="flex flex-col divide-y">
              {history.map((match) => (
                <li key={match.matchId}>
                  <Link
                    href={matchHref(match.matchId)}
                    className="flex min-h-11 items-center gap-2 text-sm outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
                  >
                    <WinnerDot teams={match.teams} status={match.status} />
                    <span className="min-w-0 flex-1 truncate">
                      {formatDayTitle(match.scheduledAt)}
                    </span>
                    <span className="tabular-nums text-muted-foreground">
                      {match.status === "cancelled"
                        ? "Cancelado"
                        : `${match.teams[0]?.goals ?? 0} – ${match.teams[1]?.goals ?? 0}`}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-2 text-sm text-muted-foreground">Todavía no se jugó ninguna.</p>
          )}
          <Button
            variant="ghost"
            className="mt-1 justify-between px-0 hover:bg-transparent"
            render={<Link href="/dashboard/partidos" />}
            nativeButton={false}
          >
            Ver historial
            <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
          </Button>
        </section>
      </aside>

      {canManage ? <NewMatchDetail open={creating} onOpenChange={setCreating} /> : null}
    </HomeLayout>
  );
}

function HomeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto grid w-full max-w-xl gap-4 lg:max-w-5xl lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start lg:gap-6">
      {children}
    </div>
  );
}

function FechaCard({
  canManage,
  court,
  detail,
  groupName,
  hasUpcoming,
  myPlayerId,
  userId,
  now,
  onCreate,
  phase,
}: {
  canManage: boolean;
  court: Court;
  detail: Detail;
  groupName: string;
  hasUpcoming: boolean;
  myPlayerId: string | null;
  userId: string;
  now: Date;
  onCreate: () => void;
  phase: FechaPhase;
}) {
  const scheduledAt = new Date(detail.scheduledAt);
  const sizes = detail.teams.map((team) => team.appearances.length);
  const playing = sizes.reduce((total, size) => total + size, 0);
  const goals = new Map(detail.score.map((entry) => [entry.teamId, entry.goals]));
  const owed = owedFor(detail);
  const perPlayer =
    detail.courtCostMinor !== null && playing > 0
      ? (BigInt(detail.courtCostMinor) + BigInt(playing) - 1n) / BigInt(playing)
      : null;
  const meta = [
    court?.name ?? "Cancha a definir",
    phase === "upcoming" ? `${playing} ${playing === 1 ? "anotado" : "anotados"}` : null,
    phase === "upcoming" && perPlayer !== null ? `${formatMoney(perPlayer.toString())} c/u` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const myDebt =
    myPlayerId === null
      ? 0n
      : BigInt(owed.debtors.find((debtor) => debtor.playerId === myPlayerId)?.debtMinor ?? "0");

  let headline: string;
  let body: React.ReactNode = null;
  let actions: React.ReactNode;

  switch (phase) {
    case "upcoming": {
      const missing = missingPlayers(sizes);
      const target = rosterTarget(sizes);
      headline =
        missing > 0
          ? missing === 1
            ? "Falta 1 para completar"
            : `Faltan ${missing} para completar`
          : "Equipos completos";
      body = (
        <>
          <div className="flex flex-col gap-1.5">
            <Progress
              aria-label={`${playing} de ${target} jugadores`}
              value={Math.min(100, Math.round((playing / target) * 100))}
            />
            <p className="text-xs text-muted-foreground tabular-nums">
              {playing} de {target} jugadores
            </p>
          </div>
          <TeamColumns detail={detail} />
          {sizes.every((size) => size > 0) ? <ParityLine matchId={detail.id} /> : null}
        </>
      );
      const openMatch = (
        <Button
          variant={missing > 0 ? "outline" : "default"}
          render={<Link href={matchHref(detail.id)} />}
          nativeButton={false}
        >
          {canManage ? "Armar equipos" : "Ver partido"}
        </Button>
      );
      actions =
        missing > 0 ? (
          <>
            <MatchShareRow
              court={court}
              detail={detail}
              groupName={groupName}
              size="default"
              variant="default"
            />
            {openMatch}
          </>
        ) : canManage && owed.totalMinor > 0n ? (
          <>
            <Button render={<Link href={matchHref(detail.id)} />} nativeButton={false}>
              Cobrar {formatMoney(owed.totalMinor.toString())}
            </Button>
          </>
        ) : myDebt > 0n ? (
          <Button render={<Link href={matchHref(detail.id)} />} nativeButton={false}>
            Pagar tu parte · {formatMoney(myDebt.toString())}
          </Button>
        ) : (
          openMatch
        );
      break;
    }
    case "live": {
      // Same rule as modo cancha: managers, the organizer and the planillero load goals.
      const canScore =
        canManage || detail.organizerUserId === userId || detail.scorekeeperUserId === userId;
      headline = `Empezó a las ${formatTime(scheduledAt)}`;
      body = <Scoreboard detail={detail} goals={goals} />;
      actions = canScore ? (
        <>
          <Button render={<Link href={matchHref(detail.id, "/cancha")} />} nativeButton={false}>
            Cargar goles
          </Button>
          <Button
            variant="outline"
            render={<Link href={matchHref(detail.id)} />}
            nativeButton={false}
          >
            Ver partido
          </Button>
        </>
      ) : (
        <Button render={<Link href={matchHref(detail.id)} />} nativeButton={false}>
          Ver partido
        </Button>
      );
      break;
    }
    case "close":
      headline = "Revisá y cerrá el partido";
      body = (
        <>
          <Scoreboard detail={detail} goals={goals} />
          <p className="text-sm text-muted-foreground">
            Al cerrarlo, el resultado cuenta para la tabla y los aportes quedan fijos.
          </p>
        </>
      );
      actions = (
        <Button render={<Link href={matchHref(detail.id)} />} nativeButton={false}>
          Revisar y cerrar
        </Button>
      );
      break;
    case "closed":
      headline =
        owed.totalMinor > 0n
          ? `Faltan cobrar ${formatMoney(owed.totalMinor.toString())}`
          : "Todo cobrado";
      body = (
        <>
          <Scoreboard detail={detail} goals={goals} />
          {owed.people > 0 ? (
            <div className="flex flex-col gap-1.5">
              <Progress
                aria-label={`Pagaron ${owed.paid} de ${owed.people}`}
                value={Math.round((owed.paid / owed.people) * 100)}
              />
              <p className="text-xs text-muted-foreground tabular-nums">
                Pagaron {owed.paid} de {owed.people}
              </p>
            </div>
          ) : null}
        </>
      );
      actions =
        canManage && owed.totalMinor > 0n ? (
          <>
            <Button render={<Link href={matchHref(detail.id)} />} nativeButton={false}>
              Abrir la caja
            </Button>
            {hasUpcoming ? null : (
              <Button variant="outline" onClick={onCreate}>
                Nuevo partido
              </Button>
            )}
          </>
        ) : myDebt > 0n ? (
          <Button render={<Link href={matchHref(detail.id)} />} nativeButton={false}>
            Pagar tu parte · {formatMoney(myDebt.toString())}
          </Button>
        ) : canManage && !hasUpcoming ? (
          <Button onClick={onCreate}>
            <PlusIcon data-icon="inline-start" aria-hidden="true" />
            Armá el próximo partido
          </Button>
        ) : (
          <Button
            variant="outline"
            render={<Link href={matchHref(detail.id)} />}
            nativeButton={false}
          >
            Ver partido
          </Button>
        );
      break;
  }

  return (
    <section
      aria-label="Próximo paso"
      className="flex flex-col gap-4 rounded-xl border bg-card p-4 sm:p-5"
    >
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={phase === "live" ? "default" : "secondary"}>{phaseLabel[phase]}</Badge>
          <span className="text-xs text-muted-foreground">
            {whenLabel(scheduledAt, now)} · {formatTime(scheduledAt)}
          </span>
        </div>
        <h2 className="text-xl font-bold tracking-tight text-balance">{headline}</h2>
        <p className="text-sm text-muted-foreground">{meta}</p>
      </div>
      {body}
      <div className="flex flex-col gap-2 sm:flex-row sm:*:flex-1">{actions}</div>
    </section>
  );
}

/** Both teams side by side, so the roster reads as two lineups instead of one list. */
function TeamColumns({ detail }: { detail: Detail }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:gap-3">
      {detail.teams.map((team) => (
        <div key={team.id} className="flex min-w-0 flex-col gap-1.5 rounded-lg border p-2.5">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <TeamDot slot={team.slot} />
            <span className="min-w-0 flex-1 truncate">{team.displayName}</span>
            <span className="text-xs text-muted-foreground tabular-nums">
              {team.appearances.length}
            </span>
          </div>
          {team.appearances.length ? (
            <ul className="flex flex-col gap-1 text-sm">
              {team.appearances.map((appearance) => (
                <li key={appearance.playerId} className="truncate rounded-md bg-muted px-2 py-1">
                  {appearance.playerDisplayName}
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-md border border-dashed px-2 py-1 text-xs text-muted-foreground">
              Sin jugadores
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

/** "Cómo llegan" in one line: the odds from the group's history, to even the teams out. */
function ParityLine({ matchId }: { matchId: string }) {
  const parity = useQuery(trpc.stats.parity.queryOptions({ matchId }));
  if (!parity.data) return null;
  const [left, right] = parity.data.teams;
  const gap = Math.abs(left.probability - right.probability);
  const verdict =
    gap < 0.1
      ? "Parejos"
      : `Llega mejor ${(left.probability > right.probability ? left : right).displayName}`;
  return (
    <p className="flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-sm">
      <span className="text-muted-foreground">Cómo llegan</span>
      <span>
        <strong className={gap < 0.1 ? "text-success" : undefined}>{verdict}</strong>
        <span className="text-muted-foreground tabular-nums">
          {" "}
          · {Math.round(left.probability * 100)}% – {Math.round(right.probability * 100)}%
        </span>
      </span>
    </p>
  );
}

function Scoreboard({ detail, goals }: { detail: Detail; goals: Map<string, number> }) {
  const [home, away] = detail.teams;
  if (!home || !away) return null;
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 py-2 text-center">
      <ScoreSide name={home.displayName} goals={goals.get(home.id) ?? 0} slot={home.slot} />
      <span className="text-2xl text-muted-foreground" aria-hidden="true">
        –
      </span>
      <ScoreSide name={away.displayName} goals={goals.get(away.id) ?? 0} slot={away.slot} />
    </div>
  );
}

function ScoreSide({ goals, name, slot }: { goals: number; name: string; slot: number }) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-1">
      <span className="text-5xl font-black leading-none tabular-nums">{goals}</span>
      <span className="flex max-w-full items-center gap-1.5 text-xs text-muted-foreground">
        <TeamDot slot={slot} />
        <span className="truncate">{name}</span>
      </span>
    </div>
  );
}

function DebtsCard({
  canManage,
  detail,
  myPlayerId,
}: {
  canManage: boolean;
  detail: Detail;
  myPlayerId: string | null;
}) {
  const owed = owedFor(detail);
  if (owed.totalMinor === 0n) return null;
  const shown = owed.debtors.slice(0, shownDebtors);
  const mine = myPlayerId
    ? owed.debtors.find((debtor) => debtor.playerId === myPlayerId)
    : undefined;

  return (
    <section className="flex flex-col gap-1 rounded-xl border bg-card p-4">
      <h2 className="text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
        {canManage ? "Te deben" : "Deben"} · {formatDayTitle(detail.scheduledAt)}
      </h2>
      {!canManage && myPlayerId ? (
        <p className="flex min-h-11 items-center justify-between border-b text-sm">
          <span className="font-semibold">Tu parte</span>
          <span className={cn("tabular-nums", mine ? "font-semibold" : "text-muted-foreground")}>
            {mine ? `falta ${formatMoney(mine.debtMinor)}` : "Al día"}
          </span>
        </p>
      ) : null}
      <ul className="flex flex-col divide-y">
        {shown.map((debtor) => (
          <li key={debtor.playerId} className="flex min-h-11 items-center justify-between text-sm">
            <span className="min-w-0 truncate">{debtor.playerDisplayName}</span>
            <span className="font-semibold tabular-nums">{formatMoney(debtor.debtMinor)}</span>
          </li>
        ))}
      </ul>
      <Button
        variant="ghost"
        className="mt-1 justify-between px-0 hover:bg-transparent"
        render={<Link href={matchHref(detail.id)} />}
        nativeButton={false}
      >
        {owed.debtors.length > shown.length
          ? `Ver los ${owed.debtors.length} · ${formatMoney(owed.totalMinor.toString())}`
          : `Total ${formatMoney(owed.totalMinor.toString())}`}
        <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
      </Button>
    </section>
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

function WinnerDot({
  status,
  teams,
}: {
  status: "open" | "closed" | "cancelled";
  teams: ReadonlyArray<{ slot: number; goals: number }>;
}) {
  const [home, away] = teams;
  if (status !== "closed" || !home || !away || home.goals === away.goals) {
    return (
      <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-muted-foreground/40" />
    );
  }
  return <TeamDot slot={home.goals > away.goals ? home.slot : away.slot} />;
}

/** "Hoy", "Mañana", "En 3 días" within the week, "Sábado 14 nov" otherwise. */
function whenLabel(date: Date, now: Date) {
  const days = Math.round((date.getTime() - now.getTime()) / 86_400_000);
  if (Math.abs(days) < 7) {
    const relative = relativeDay(date, now);
    return relative.charAt(0).toUpperCase() + relative.slice(1);
  }
  return formatDayTitle(date);
}

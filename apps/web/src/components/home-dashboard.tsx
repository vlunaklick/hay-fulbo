"use client";

import { Alert, AlertDescription, AlertTitle } from "@hay-fulbo/ui/components/alert";
import { Badge } from "@hay-fulbo/ui/components/badge";
import { Button } from "@hay-fulbo/ui/components/button";
import { Skeleton } from "@hay-fulbo/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { CircleAlertIcon, PlusIcon } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";

import { useAppContext } from "@/components/app-shell";
import { DrillSheet } from "@/components/drill-sheet";
import { MatchShareRow } from "@/components/match-share-row";
import { NewMatchSheet } from "@/components/new-match-dialog";
import { DrillList, DrillRow, HeroNumber, NextStep, StatusHeader } from "@/components/next-step";
import { formatDayTitle, formatMoney, formatShortWeekday, formatTime } from "@/lib/format";
import { relativeDay } from "@/lib/match-schedule";
import { type HomeStep, pickHomeStep } from "@/lib/next-step";
import { trpc } from "@/utils/trpc";

/** Results listed in the "Último resultado" sheet before linking to the full list. */
const shownResults = 6;

type Sheet = "results" | "debts" | "create" | null;

function matchHref(id: string) {
  return `/dashboard/partidos/${id}` as Route;
}

/** A `DrillRow` that navigates. */
function linkTo(href: Route) {
  return ({ className, children }: { className: string; children: React.ReactNode }) => (
    <Link className={className} href={href}>
      {children}
    </Link>
  );
}

/**
 * The group home answers "¿qué hago ahora?": the match being played or the next
 * one as the hero, the most urgent action in a `NextStep`, and everything else
 * (results, debts, players, stats) one row away. See docs/prototypes/proximo-paso.md.
 */
export function HomeDashboard() {
  const { groupName, role, user } = useAppContext();
  const canManage = role !== "member";
  const stats = useQuery(trpc.stats.dashboard.queryOptions({}));
  const directory = useQuery(trpc.matches.directory.queryOptions());
  const list = useQuery(trpc.matches.list.queryOptions({ limit: 50 }));
  const upcomingId = stats.data?.upcoming?.matchId;
  const upcomingDetail = useQuery({
    ...trpc.matches.detail.queryOptions({ matchId: upcomingId ?? "" }),
    enabled: Boolean(upcomingId),
  });
  const [sheet, setSheet] = useState<Sheet>(null);

  if (stats.isPending || directory.isPending || list.isPending) {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-col gap-6" aria-label="Cargando resumen">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-36 w-full" />
        <Skeleton className="h-60 w-full" />
      </div>
    );
  }

  if (stats.isError || directory.isError || list.isError) {
    return (
      <Alert variant="destructive" className="mx-auto max-w-xl">
        <CircleAlertIcon aria-hidden="true" />
        <AlertTitle>No pudimos cargar el resumen</AlertTitle>
        <AlertDescription>
          {stats.error?.message ?? directory.error?.message ?? list.error?.message}
        </AlertDescription>
      </Alert>
    );
  }

  const now = new Date();
  const dashboard = stats.data;
  const upcoming = dashboard.upcoming;
  const finances = dashboard.finances;
  const matches = list.data.map((match) => ({
    ...match,
    scheduledAt: new Date(match.scheduledAt),
  }));
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

  const step = pickHomeStep({
    now,
    canManage,
    matches,
    upcoming: upcoming
      ? {
          matchId: upcoming.matchId,
          teamSizes: upcomingDetail.data?.teams.map((team) => team.appearances.length) ?? null,
        }
      : null,
    finances: finances ? { debtMinor: finances.debtMinor, debtors: finances.debtors.length } : null,
    myDebtMinor: myDebt,
  });
  const live =
    step?.kind === "live" ? matches.find((match) => match.id === step.matchId) : undefined;
  const results = dashboard.history.slice(0, shownResults);
  const lastResult = dashboard.history[0];
  const debt = finances ? BigInt(finances.debtMinor) : 0n;
  const activePlayers = directory.data.players.filter((player) => !player.archivedAt).length;

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <StatusHeader
        title="Resumen del grupo"
        meta={groupName}
        status={live ? <Badge>En juego</Badge> : null}
      />

      {live ? (
        <HeroNumber caption={live.teams.map((team) => team.displayName).join(" vs. ")}>
          {live.teams[0]?.goals ?? 0} – {live.teams[1]?.goals ?? 0}
        </HeroNumber>
      ) : upcoming ? (
        <HeroNumber
          caption={`${whenLabel(new Date(upcoming.scheduledAt), now)} · ${upcoming.court?.name ?? "Cancha a definir"}`}
        >
          {formatTime(upcoming.scheduledAt)}
        </HeroNumber>
      ) : null}

      {/* Until the roster loads we can't tell whether the next match needs invites. */}
      {upcoming && upcomingDetail.isPending && step?.kind !== "live" && step?.kind !== "close" ? (
        <Skeleton aria-label="Cargando próximo paso" className="h-32 w-full rounded-xl" />
      ) : step ? (
        <HomeNextStep
          step={step}
          onCreate={() => setSheet("create")}
          invite={
            step.kind === "invite" && upcoming && upcomingDetail.data ? (
              <MatchShareRow
                court={upcoming.court}
                detail={upcomingDetail.data}
                groupName={groupName}
                variant="default"
              />
            ) : null
          }
        />
      ) : null}

      <DrillList>
        {upcoming ? (
          <DrillRow
            label="Próximo partido"
            value={`${formatShortWeekday(upcoming.scheduledAt)} ${new Date(upcoming.scheduledAt).getDate()} · ${formatTime(upcoming.scheduledAt)}`}
            render={linkTo(matchHref(upcoming.matchId))}
          />
        ) : canManage ? (
          <DrillRow label="Próximo partido" value="Sin fecha" onClick={() => setSheet("create")} />
        ) : (
          <DrillRow label="Próximo partido" value="Sin fecha" static />
        )}

        {lastResult ? (
          <DrillRow
            label="Último resultado"
            value={resultValue(lastResult)}
            onClick={() => setSheet("results")}
          />
        ) : (
          <DrillRow label="Último resultado" value="—" static />
        )}

        {finances && finances.participantCount > 0 ? (
          <DrillRow
            label="Deudas"
            value={debt > 0n ? `falta ${formatMoney(debt.toString())}` : "Al día"}
            onClick={() => setSheet("debts")}
          />
        ) : null}

        <DrillRow
          label="Jugadores"
          value={String(activePlayers)}
          render={linkTo("/dashboard/jugadores")}
        />
        <DrillRow
          label="Estadísticas"
          value={`${dashboard.summary.matchesPlayed} ${dashboard.summary.matchesPlayed === 1 ? "partido" : "partidos"} · ${dashboard.summary.totalGoals} goles`}
          render={linkTo("/dashboard/estadisticas")}
        />
        <DrillRow label="Todos los partidos" render={linkTo("/dashboard/partidos")} />
      </DrillList>

      <DrillSheet
        open={sheet === "results"}
        onOpenChange={(open) => setSheet(open ? "results" : null)}
        title="Últimos resultados"
        footer={
          <Button
            variant="outline"
            render={<Link href="/dashboard/partidos" />}
            nativeButton={false}
          >
            {dashboard.history.length > shownResults
              ? `Ver los ${dashboard.history.length} partidos`
              : "Ver todos los partidos"}
          </Button>
        }
      >
        <DrillList>
          {results.map((match) => (
            <DrillRow
              key={match.matchId}
              label={formatDayTitle(match.scheduledAt)}
              value={
                match.figure && match.status === "closed"
                  ? `${resultValue(match)} · ${match.figure.displayName}`
                  : resultValue(match)
              }
              render={linkTo(matchHref(match.matchId))}
            />
          ))}
        </DrillList>
      </DrillSheet>

      {finances && upcoming ? (
        <DrillSheet
          open={sheet === "debts"}
          onOpenChange={(open) => setSheet(open ? "debts" : null)}
          title="Deudas del próximo partido"
          description={`${formatDayTitle(upcoming.scheduledAt)} · pagaron ${finances.paidCount} de ${finances.participantCount}`}
          footer={
            <Button render={<Link href={matchHref(upcoming.matchId)} />} nativeButton={false}>
              Abrir la caja
            </Button>
          }
        >
          <DrillList>
            {myDebt !== null ? (
              <DrillRow
                static
                label="Tu parte"
                value={
                  myDebt > 0n
                    ? `falta ${formatMoney(myDebt.toString())}`
                    : myDebt < 0n
                      ? "A favor"
                      : "Al día"
                }
              />
            ) : null}
            {finances.debtors.length ? (
              finances.debtors.map((debtor) => (
                <DrillRow
                  key={debtor.playerId}
                  static
                  label={debtor.displayName}
                  value={`falta ${formatMoney(debtor.debtMinor)}`}
                />
              ))
            ) : (
              <p className="py-3 text-sm text-muted-foreground">Nadie debe nada.</p>
            )}
          </DrillList>
        </DrillSheet>
      ) : null}

      <NewMatchSheet
        open={sheet === "create"}
        onOpenChange={(open) => setSheet(open ? "create" : null)}
      />
    </div>
  );
}

function HomeNextStep({
  invite,
  onCreate,
  step,
}: {
  invite: React.ReactNode;
  onCreate: () => void;
  step: HomeStep;
}) {
  switch (step.kind) {
    case "live":
      return (
        <NextStep
          kicker={`Empezó a las ${formatTime(step.scheduledAt)}`}
          title="Hay partido en juego"
          action={
            <Button render={<Link href={matchHref(step.matchId)} />} nativeButton={false}>
              Ir al partido
            </Button>
          }
        />
      );
    case "close":
      return (
        <NextStep
          kicker="Falta cerrar"
          title={`Cerrá el partido del ${formatDayTitle(step.scheduledAt).toLowerCase()}`}
          action={
            <Button render={<Link href={matchHref(step.matchId)} />} nativeButton={false}>
              Ir al partido
            </Button>
          }
        />
      );
    case "invite":
      return (
        <NextStep
          kicker={step.missing === 1 ? "Falta 1 jugador" : `Faltan ${step.missing} jugadores`}
          title="Completá el próximo partido"
          action={invite}
        />
      );
    case "collect":
      return (
        <NextStep
          kicker={step.debtors === 1 ? "1 debe su parte" : `${step.debtors} deben su parte`}
          title={`Cobrar ${formatMoney(step.debtMinor.toString())}`}
          action={
            <Button render={<Link href={matchHref(step.matchId)} />} nativeButton={false}>
              Abrir la caja
            </Button>
          }
        />
      );
    case "pay":
      return (
        <NextStep
          kicker="Tu parte del próximo partido"
          title={`Pagar ${formatMoney(step.debtMinor.toString())}`}
          action={
            <Button render={<Link href={matchHref(step.matchId)} />} nativeButton={false}>
              Ver el partido
            </Button>
          }
        />
      );
    case "create":
      return (
        <NextStep
          kicker="No hay próxima fecha"
          title="Armá el próximo partido"
          action={
            <Button onClick={onCreate}>
              <PlusIcon data-icon="inline-start" aria-hidden="true" />
              Crear partido
            </Button>
          }
        />
      );
  }
}

type HistoryMatch = {
  status: "open" | "closed" | "cancelled";
  teams: ReadonlyArray<{ goals: number }>;
};

function resultValue(match: HistoryMatch) {
  if (match.status === "cancelled") return "Cancelado";
  return `${match.teams[0]?.goals ?? 0} – ${match.teams[1]?.goals ?? 0}`;
}

/** "Hoy", "Mañana", "En 3 días" within the week, "Sábado 14 nov" after that. */
function whenLabel(date: Date, now: Date) {
  const relative = relativeDay(date, now);
  const days = Math.round((date.getTime() - now.getTime()) / 86_400_000);
  if (days < 7) return relative.charAt(0).toUpperCase() + relative.slice(1);
  return formatDayTitle(date);
}

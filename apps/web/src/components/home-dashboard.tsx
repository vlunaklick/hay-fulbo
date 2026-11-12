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
import { MatchShareRow } from "@/components/match-share-row";
import { MatchSummary } from "@/components/match-summary";
import { NewMatchDetail } from "@/components/new-match-dialog";
import { DrillList, DrillRow, HeroNumber, NextStep, StatusHeader } from "@/components/next-step";
import { DrillDetail, NextStepLayout, useIsDesktop } from "@/components/next-step-layout";
import { formatDayTitle, formatMoney, formatShortWeekday, formatTime } from "@/lib/format";
import { relativeDay } from "@/lib/match-schedule";
import { type HomeStep, pickHomeStep } from "@/lib/next-step";
import { trpc } from "@/utils/trpc";

/** Results listed in the "Último resultado" sheet before linking to the full list. */
const shownResults = 6;

/** What a row opens: a bottom sheet on phones, the right column on desktop. */
type Detail = "live" | "next" | "results" | "debts" | "create";

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
  const desktop = useIsDesktop();
  // `undefined` until the viewer picks a row: desktop then opens the most relevant one.
  const [picked, setPicked] = useState<Detail | null>();

  if (stats.isPending || directory.isPending || list.isPending) {
    return (
      <NextStepLayout>
        <div className="flex flex-col gap-6" aria-label="Cargando resumen">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-36 w-full" />
          <Skeleton className="h-60 w-full" />
        </div>
      </NextStepLayout>
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
  const showDebts = Boolean(finances && upcoming && finances.participantCount > 0);
  const preferred: Detail | null = live
    ? "live"
    : showDebts && (step?.kind === "collect" || step?.kind === "pay")
      ? "debts"
      : upcoming
        ? "next"
        : canManage
          ? "create"
          : lastResult
            ? "results"
            : null;
  const detail = picked === undefined ? (desktop ? preferred : null) : picked;
  const setSheet = (next: Detail | null) => setPicked(next);
  const detailProps = (key: Detail) => ({
    open: detail === key,
    onOpenChange: (open: boolean) => setSheet(open ? key : null),
  });

  return (
    <NextStepLayout emptyDetail="Elegí una fila para ver el detalle.">
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
                size="default"
                variant="default"
              />
            ) : null
          }
        />
      ) : null}

      <DrillList>
        {live ? (
          <DrillRow
            label="Partido en juego"
            value={resultValue(live)}
            selected={detail === "live"}
            onClick={() => setSheet("live")}
          />
        ) : null}

        {upcoming ? (
          <DrillRow
            label="Próximo partido"
            value={`${formatShortWeekday(upcoming.scheduledAt)} ${new Date(upcoming.scheduledAt).getDate()} · ${formatTime(upcoming.scheduledAt)}`}
            selected={detail === "next"}
            onClick={() => setSheet("next")}
          />
        ) : canManage ? (
          <DrillRow
            label="Próximo partido"
            value="Sin fecha"
            selected={detail === "create"}
            onClick={() => setSheet("create")}
          />
        ) : (
          <DrillRow label="Próximo partido" value="Sin fecha" static />
        )}

        {lastResult ? (
          <DrillRow
            label="Último resultado"
            value={resultValue(lastResult)}
            selected={detail === "results"}
            onClick={() => setSheet("results")}
          />
        ) : (
          <DrillRow label="Último resultado" value="—" static />
        )}

        {showDebts ? (
          <DrillRow
            label="Deudas"
            value={debt > 0n ? `falta ${formatMoney(debt.toString())}` : "Al día"}
            selected={detail === "debts"}
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

      {live ? (
        <DrillDetail
          {...detailProps("live")}
          title="Partido en juego"
          description={`Empezó a las ${formatTime(live.scheduledAt)}`}
        >
          <MatchSummary matchId={live.id} />
        </DrillDetail>
      ) : null}

      {upcoming ? (
        <DrillDetail
          {...detailProps("next")}
          title="Próximo partido"
          description={`${formatDayTitle(upcoming.scheduledAt)} · ${formatTime(upcoming.scheduledAt)} · ${upcoming.court?.name ?? "Cancha a definir"}`}
        >
          <MatchSummary matchId={upcoming.matchId} />
        </DrillDetail>
      ) : null}

      <DrillDetail {...detailProps("results")} title="Últimos resultados">
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
        <Button
          variant="outline"
          className="mt-4 w-full"
          render={<Link href="/dashboard/partidos" />}
          nativeButton={false}
        >
          {dashboard.history.length > shownResults
            ? `Ver los ${dashboard.history.length} partidos`
            : "Ver todos los partidos"}
        </Button>
      </DrillDetail>

      {finances && upcoming ? (
        <DrillDetail
          {...detailProps("debts")}
          title="Deudas del próximo partido"
          description={`${formatDayTitle(upcoming.scheduledAt)} · pagaron ${finances.paidCount} de ${finances.participantCount}`}
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
          <Button
            className="mt-4 w-full"
            render={<Link href={matchHref(upcoming.matchId)} />}
            nativeButton={false}
          >
            Abrir la caja
          </Button>
        </DrillDetail>
      ) : null}

      <NewMatchDetail {...detailProps("create")} />
    </NextStepLayout>
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

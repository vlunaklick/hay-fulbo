"use client";

import { Badge } from "@hay-fulbo/ui/components/badge";
import { buttonVariants } from "@hay-fulbo/ui/components/button";
import { Card } from "@hay-fulbo/ui/components/card";
import { Progress } from "@hay-fulbo/ui/components/progress";
import { Skeleton } from "@hay-fulbo/ui/components/skeleton";
import { cn } from "@hay-fulbo/ui/lib/utils";
import { CalendarDaysIcon, MapPinIcon, NavigationIcon } from "lucide-react";

import { formatMoney } from "@/lib/format";

import { useView } from "./context";
import { useViewMatch, type ViewDashboard, type ViewMatch } from "./data";
import { PlayerAvatar, rowAction, TeamChip, when } from "./parts";

export function NextTab({ dashboard }: { dashboard: ViewDashboard }) {
  const { source, showMoney } = useView();
  const upcoming = dashboard.upcoming;
  const lineup = useViewMatch(source, upcoming?.matchId);
  const tz = dashboard.group.timeZone;

  if (!upcoming) {
    return (
      <section className="flex items-start gap-3 rounded-lg border border-dashed p-4 sm:p-5">
        <CalendarDaysIcon
          aria-hidden="true"
          className="mt-0.5 size-5 shrink-0 text-muted-foreground"
        />
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">No hay fecha programada</h2>
          <p className="text-sm text-muted-foreground">
            Cuando el organizador cargue la próxima, aparece acá con cancha y equipos.
          </p>
        </div>
      </section>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-start">
      <div className="flex flex-col gap-5">
        <Card className="gap-0 overflow-hidden py-0">
          <div className="flex items-stretch">
            <div
              aria-hidden="true"
              className="flex w-24 shrink-0 flex-col items-center justify-center gap-0.5 border-r bg-muted/50 py-4"
            >
              <span className="text-xs font-semibold uppercase text-muted-foreground">
                {when.weekdayShort(upcoming.scheduledAt, tz)}
              </span>
              <span className="text-5xl font-black leading-none tabular-nums">
                {when.dayNumber(upcoming.scheduledAt, tz)}
              </span>
              <span className="text-xs font-semibold uppercase text-muted-foreground">
                {when.month(upcoming.scheduledAt, tz)}
              </span>
            </div>
            <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 p-4">
              <h2 className="text-xl font-bold tracking-tight">
                <span className="sr-only first-letter:uppercase">
                  {when.long(upcoming.scheduledAt, tz)},{" "}
                </span>
                <span className="tabular-nums">{when.time(upcoming.scheduledAt, tz)} hs</span>
                <span className="font-semibold text-muted-foreground">
                  {" "}
                  · {when.relative(upcoming.scheduledAt, tz)}
                </span>
              </h2>
              {upcoming.court ? (
                <>
                  <p className="truncate text-sm font-medium">{upcoming.court.name}</p>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPinIcon aria-hidden="true" className="size-3.5 shrink-0" />
                    <span className="truncate">{upcoming.court.address}</span>
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Cancha a confirmar</p>
              )}
            </div>
          </div>
          {upcoming.court ? (
            <div className="border-t p-3">
              <a
                className={cn(buttonVariants(), "w-full")}
                href={upcoming.court.mapsUrl}
                rel="noreferrer"
                target="_blank"
              >
                <NavigationIcon data-icon="inline-start" aria-hidden="true" />
                Cómo llegar
              </a>
            </div>
          ) : null}
        </Card>

        <section aria-labelledby="next-teams" className="flex flex-col gap-3">
          <h2 className="text-base font-semibold" id="next-teams">
            Equipos
          </h2>
          {lineup.data ? (
            <TeamCards match={lineup.data} />
          ) : lineup.error ? (
            <p className="text-sm text-muted-foreground">No pudimos cargar los equipos.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-56 rounded-lg" />
              <Skeleton className="h-56 rounded-lg" />
            </div>
          )}
        </section>
      </div>

      {showMoney && dashboard.finances ? <CashBox finances={dashboard.finances} /> : null}
    </div>
  );
}

function TeamCards({ match }: { match: ViewMatch }) {
  const { open } = useView();
  if (match.appearances.length === 0) {
    return <p className="text-sm text-muted-foreground">Todavía no hay jugadores anotados.</p>;
  }
  return (
    <div className="grid grid-cols-2 gap-3">
      {match.teams.map((team) => (
        <section
          aria-label={team.displayName}
          className={cn(
            "flex min-w-0 flex-col gap-2 rounded-lg border p-3",
            team.slot === 1
              ? "border-team-blue/40 bg-team-blue/5"
              : "border-team-amber/40 bg-team-amber/5",
          )}
          key={team.id}
        >
          <TeamChip slot={team.slot}>{team.displayName}</TeamChip>
          <ul className="-mx-1.5 flex flex-col">
            {match.appearances
              .filter((appearance) => appearance.teamId === team.id)
              .map((appearance) => (
                <li key={appearance.playerId}>
                  <button
                    className={cn(
                      "flex min-h-11 w-full items-center rounded-md px-1.5 text-left text-sm",
                      rowAction,
                    )}
                    onClick={() => open("jugador", appearance.playerId)}
                    type="button"
                  >
                    <span className="truncate">{appearance.playerDisplayName}</span>
                  </button>
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function CashBox({ finances }: { finances: NonNullable<ViewDashboard["finances"]> }) {
  const { open } = useView();
  const expected = Number(finances.expectedMinor);
  return (
    <section aria-labelledby="next-cash" className="flex flex-col gap-3">
      <h2 className="text-base font-semibold" id="next-cash">
        La caja
      </h2>
      <Card className="gap-4 px-4 py-4">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-2xl font-bold tabular-nums">{formatMoney(finances.paidMinor)}</p>
          <p className="text-sm text-muted-foreground tabular-nums">
            de {formatMoney(finances.expectedMinor)}
          </p>
        </div>
        <Progress
          aria-label="Recaudado"
          value={expected > 0 ? (Number(finances.paidMinor) / expected) * 100 : 0}
        />
        <p className="text-sm text-muted-foreground tabular-nums">
          {finances.paidCount} de {finances.participantCount} pagaron
        </p>
        {finances.debtors.length > 0 ? (
          <div className="flex flex-col gap-2 border-t pt-3">
            <h3 className="text-xs font-medium text-muted-foreground">Faltan pagar</h3>
            <ul className="-mx-2 flex flex-col">
              {finances.debtors.map((debtor) => (
                <li key={debtor.playerId}>
                  <button
                    className={cn(
                      "flex min-h-11 w-full items-center gap-3 rounded-md px-2 text-left text-sm",
                      rowAction,
                    )}
                    onClick={() => open("jugador", debtor.playerId)}
                    type="button"
                  >
                    <PlayerAvatar className="size-7 text-xs" name={debtor.displayName} />
                    <span className="min-w-0 flex-1 truncate">{debtor.displayName}</span>
                    <Badge variant="destructive">Debe {formatMoney(debtor.debtMinor)}</Badge>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : finances.participantCount > 0 ? (
          <Badge variant="success">Todos pagaron</Badge>
        ) : null}
      </Card>
    </section>
  );
}

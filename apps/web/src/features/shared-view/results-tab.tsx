"use client";

import { Badge } from "@hay-fulbo/ui/components/badge";
import { cn } from "@hay-fulbo/ui/lib/utils";
import { CalendarDaysIcon } from "lucide-react";

import { useView } from "./context";
import type { ViewDashboard, ViewHistoryItem } from "./data";
import { groupByMonth, rowAction, TeamDot, when, winnerSlot } from "./parts";

export function ResultsTab({ dashboard }: { dashboard: ViewDashboard }) {
  const tz = dashboard.group.timeZone;
  if (dashboard.history.length === 0) {
    return (
      <section className="flex items-start gap-3 rounded-lg border border-dashed p-4 sm:p-5">
        <CalendarDaysIcon
          aria-hidden="true"
          className="mt-0.5 size-5 shrink-0 text-muted-foreground"
        />
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">Todavía no hay resultados</h2>
          <p className="text-sm text-muted-foreground">
            Los partidos aparecen acá cuando el organizador los cierra.
          </p>
        </div>
      </section>
    );
  }
  return (
    <div className="flex flex-col gap-6">
      <h2 className="sr-only">Resultados</h2>
      {groupByMonth(dashboard.history, tz).map((month) => (
        <section aria-label={month.label} className="flex flex-col gap-2" key={month.label}>
          <h3 className="text-xs font-medium text-muted-foreground first-letter:uppercase">
            {month.label}
          </h3>
          <ul className="grid gap-2 sm:grid-cols-2">
            {month.items.map((match) => (
              <li key={match.matchId}>
                <Scorecard match={match} tz={tz} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function Scorecard({ match, tz }: { match: ViewHistoryItem; tz: string }) {
  const { open } = useView();
  const winner = winnerSlot(match);
  const cancelled = match.status === "cancelled";
  const [left, right] = match.teams;
  return (
    <button
      className={cn(
        "flex w-full flex-col gap-2 rounded-lg border bg-card p-3 text-left",
        rowAction,
      )}
      onClick={() => open("partido", match.matchId)}
      type="button"
    >
      <span className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
        {[left, right].map((team, index) =>
          team ? (
            <span
              className={cn(
                "flex min-w-0 items-center gap-2",
                index === 0 ? "order-1" : "order-3 justify-end",
              )}
              key={team.id}
            >
              {index === 0 ? <TeamDot slot={team.slot} /> : null}
              <span
                className={cn(
                  "truncate text-sm",
                  !cancelled && winner === team.slot ? "font-semibold" : "text-muted-foreground",
                )}
              >
                {team.displayName}
              </span>
              {index === 1 ? <TeamDot slot={team.slot} /> : null}
            </span>
          ) : null,
        )}
        <span className="order-2 text-2xl font-black tabular-nums">
          {cancelled ? (
            <Badge variant="outline">Cancelado</Badge>
          ) : (
            <>
              {left?.goals}
              <span className="px-1 text-muted-foreground">–</span>
              {right?.goals}
            </>
          )}
        </span>
      </span>
      <span className="truncate text-center text-xs text-muted-foreground">
        {when.day(match.scheduledAt, tz)}
        {match.court ? ` · ${match.court.name}` : ""}
      </span>
    </button>
  );
}

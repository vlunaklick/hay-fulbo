"use client";

import { Badge } from "@hay-fulbo/ui/components/badge";
import { Card } from "@hay-fulbo/ui/components/card";
import { ToggleGroup, ToggleGroupItem } from "@hay-fulbo/ui/components/toggle-group";
import { cn } from "@hay-fulbo/ui/lib/utils";
import { TrophyIcon } from "lucide-react";

import { useView } from "./context";
import type { ViewDashboard } from "./data";
import { PlayerAvatar, rowAction } from "./parts";

const metrics = [
  { key: "contributions", label: "G+A", title: "Goles más asistencias" },
  { key: "goals", label: "Goles", title: "Goles" },
  { key: "assists", label: "Asist.", title: "Asistencias" },
] as const;

export function TableTab({ dashboard }: { dashboard: ViewDashboard }) {
  const { open, param, setParam } = useView();
  const metric = metrics.find((item) => item.key === param("orden")) ?? metrics[0];

  if (dashboard.ranking.length === 0) {
    return (
      <section className="flex items-start gap-3 rounded-lg border border-dashed p-4 sm:p-5">
        <TrophyIcon aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">Todavía no hay tabla</h2>
          <p className="text-sm text-muted-foreground">
            Se arma sola con el primer partido cerrado.
          </p>
        </div>
      </section>
    );
  }

  const ranking = [...dashboard.ranking].sort(
    (a, b) =>
      b[metric.key] - a[metric.key] ||
      b.contributions - a.contributions ||
      a.displayName.localeCompare(b.displayName, "es"),
  );
  const podium = [ranking[1], ranking[0], ranking[2]];
  const rest = ranking.slice(3);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-base font-semibold">La tabla</h2>
          <p className="text-xs text-muted-foreground tabular-nums">
            {dashboard.summary.matchesPlayed} partidos cerrados
          </p>
        </div>
        <ToggleGroup
          aria-label="Ordenar la tabla por"
          onValueChange={(value) => {
            const next = value[0];
            if (next) setParam("orden", next === "contributions" ? null : String(next));
          }}
          value={[metric.key]}
          variant="outline"
        >
          {metrics.map((item) => (
            <ToggleGroupItem
              aria-label={item.title}
              className="h-11 px-3"
              key={item.key}
              value={item.key}
            >
              {item.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      <ol aria-label="Podio" className="grid grid-cols-3 items-end gap-2">
        {podium.map((row, slot) => {
          if (!row) return <li aria-hidden="true" key={`empty-${slot}`} />;
          const place = ranking.indexOf(row) + 1;
          return (
            <li key={row.playerId}>
              <button
                className={cn(
                  "flex w-full flex-col items-center gap-2 rounded-lg border bg-card px-2 text-center",
                  place === 1 ? "pb-5 pt-4" : "py-3",
                  rowAction,
                )}
                onClick={() => open("jugador", row.playerId)}
                type="button"
              >
                <span className="text-xs font-semibold tabular-nums text-muted-foreground">
                  {place}º
                </span>
                <PlayerAvatar
                  className={place === 1 ? "size-14 text-base" : "size-11 text-sm"}
                  name={row.displayName}
                />
                <span className="w-full truncate text-sm font-semibold">{row.displayName}</span>
                <span className="flex flex-col items-center">
                  <span
                    className={cn("font-black tabular-nums", place === 1 ? "text-3xl" : "text-2xl")}
                  >
                    {row[metric.key]}
                  </span>
                  <span className="text-xs text-muted-foreground">{metric.label}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      {rest.length > 0 ? (
        <Card className="py-1">
          <ol className="flex flex-col divide-y" start={4}>
            {rest.map((row, index) => (
              <li key={row.playerId}>
                <button
                  className={cn(
                    "flex min-h-12 w-full items-center gap-3 px-4 py-1.5 text-left",
                    rowAction,
                  )}
                  onClick={() => open("jugador", row.playerId)}
                  type="button"
                >
                  <span className="w-5 shrink-0 text-xs tabular-nums text-muted-foreground">
                    {index + 4}
                  </span>
                  <PlayerAvatar className="size-7 text-xs" name={row.displayName} />
                  <span className="flex min-w-0 flex-1 items-center gap-2">
                    <span className="truncate text-sm">{row.displayName}</span>
                    {row.archived ? <Badge variant="outline">Inactivo</Badge> : null}
                  </span>
                  <span className="shrink-0 text-base font-semibold tabular-nums">
                    {row[metric.key]}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </Card>
      ) : null}
    </div>
  );
}

"use client";

import { Badge } from "@hay-fulbo/ui/components/badge";
import { Progress } from "@hay-fulbo/ui/components/progress";
import { ToggleGroup, ToggleGroupItem } from "@hay-fulbo/ui/components/toggle-group";

import { DrillList, DrillRow } from "@/components/next-step";
import { formatMoney } from "@/lib/format";

import { useView, type ViewSection } from "./context";
import type { ViewDashboard } from "./data";
import type * as React from "react";
import {
  groupByMonth,
  PlayerAvatar,
  plural,
  type RankingMetric,
  sortRanking,
  TeamDot,
  when,
} from "./parts";

/** Title, description and body for the section a row opened. */
export function sectionContent(
  section: ViewSection,
  dashboard: ViewDashboard,
): { title: string; description: React.ReactNode; body: React.ReactNode } {
  if (section === "resultados") {
    return {
      title: "Resultados",
      description:
        dashboard.history.length > 0
          ? plural(dashboard.history.length, "partido", "partidos")
          : "Los partidos aparecen acá cuando el organizador los cierra.",
      body: <ResultsSection dashboard={dashboard} />,
    };
  }
  if (section === "tabla") {
    return {
      title: "Tabla",
      description:
        dashboard.ranking.length > 0
          ? plural(dashboard.summary.matchesPlayed, "partido cerrado", "partidos cerrados")
          : "Se arma sola con el primer partido cerrado.",
      body: dashboard.ranking.length > 0 ? <TableSection dashboard={dashboard} /> : null,
    };
  }
  const finances = dashboard.finances;
  return {
    title: "La caja",
    description: finances ? (
      <span className="tabular-nums">
        {finances.paidCount} de {finances.participantCount} pagaron
      </span>
    ) : (
      "Aparece cuando hay un próximo partido."
    ),
    body: finances ? <CashSection finances={finances} /> : null,
  };
}

/** Every closed or cancelled match, newest first, by month. */
function ResultsSection({ dashboard }: { dashboard: ViewDashboard }) {
  const { open } = useView();
  const tz = dashboard.group.timeZone;
  return (
    <div className="flex flex-col gap-5">
      {groupByMonth(dashboard.history, tz).map((month) => (
        <DrillList
          key={month.label}
          title={<span className="first-letter:uppercase">{month.label}</span>}
        >
          {month.items.map((match) => {
            const [left, right] = match.teams;
            const cancelled = match.status === "cancelled";
            return (
              <DrillRow
                key={match.matchId}
                label={
                  <span className="flex min-w-0 items-center gap-2">
                    {left ? <TeamDot slot={left.slot} /> : null}
                    <span className="truncate">{left?.displayName}</span>
                    <span className="shrink-0 tabular-nums">
                      {cancelled ? "–" : `${left?.goals ?? 0}–${right?.goals ?? 0}`}
                    </span>
                    <span className="truncate">{right?.displayName}</span>
                    {right ? <TeamDot slot={right.slot} /> : null}
                  </span>
                }
                onClick={() => open("partido", match.matchId)}
                value={cancelled ? "Cancelado" : when.day(match.scheduledAt, tz)}
              />
            );
          })}
        </DrillList>
      ))}
    </div>
  );
}

const metrics = [
  { key: "contributions", label: "G+A", title: "Goles más asistencias" },
  { key: "goals", label: "Goles", title: "Goles" },
  { key: "assists", label: "Asist.", title: "Asistencias" },
] as const satisfies readonly { key: RankingMetric; label: string; title: string }[];

/** The ranking, sortable by G+A, goals or assists (`?orden=`). */
function TableSection({ dashboard }: { dashboard: ViewDashboard }) {
  const { open, param, setParam } = useView();
  const metric = metrics.find((item) => item.key === param("orden")) ?? metrics[0];
  const ranking = sortRanking(dashboard.ranking, metric.key);

  return (
    <div className="flex flex-col gap-4">
      <ToggleGroup
        aria-label="Ordenar la tabla por"
        className="w-full *:flex-1"
        onValueChange={(value) => {
          const next = value[0];
          if (next) setParam("orden", next === "contributions" ? null : String(next));
        }}
        value={[metric.key]}
        variant="outline"
      >
        {metrics.map((item) => (
          <ToggleGroupItem aria-label={item.title} className="h-11" key={item.key} value={item.key}>
            {item.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <DrillList>
        {ranking.map((row, index) => (
          <DrillRow
            key={row.playerId}
            label={
              <span className="flex min-w-0 items-center gap-2">
                <span className="truncate">{row.displayName}</span>
                {row.archived ? <Badge variant="outline">Inactivo</Badge> : null}
              </span>
            }
            leading={
              <span className="flex items-center gap-3">
                <span className="w-5 text-xs text-muted-foreground tabular-nums">{index + 1}</span>
                <PlayerAvatar className="size-7 text-xs" name={row.displayName} />
              </span>
            }
            onClick={() => open("jugador", row.playerId)}
            value={
              <span className="text-sm font-semibold text-foreground">
                {row[metric.key]} {metric.label}
              </span>
            }
          />
        ))}
      </DrillList>
    </div>
  );
}

/** Private link only: what the next match collected and who still owes. */
function CashSection({ finances }: { finances: NonNullable<ViewDashboard["finances"]> }) {
  const { open } = useView();
  const expected = Number(finances.expectedMinor);
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
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
      </div>
      {finances.debtors.length > 0 ? (
        <DrillList title="Faltan pagar">
          {finances.debtors.map((debtor) => (
            <DrillRow
              key={debtor.playerId}
              label={debtor.displayName}
              leading={<PlayerAvatar className="size-7 text-xs" name={debtor.displayName} />}
              onClick={() => open("jugador", debtor.playerId)}
              value={<span className="text-destructive">debe {formatMoney(debtor.debtMinor)}</span>}
            />
          ))}
        </DrillList>
      ) : finances.participantCount > 0 ? (
        <Badge variant="success">Todos pagaron</Badge>
      ) : (
        <p className="text-sm text-muted-foreground">Todavía no hay jugadores anotados.</p>
      )}
    </div>
  );
}

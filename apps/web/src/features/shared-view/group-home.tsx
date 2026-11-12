"use client";

import { buttonVariants } from "@hay-fulbo/ui/components/button";
import { cn } from "@hay-fulbo/ui/lib/utils";
import { GlobeIcon, LockKeyholeIcon, NavigationIcon } from "lucide-react";

import { DrillList, DrillRow, HeroNumber, NextStep, StatusHeader } from "@/components/next-step";
import { formatMoney } from "@/lib/format";

import { useView } from "./context";
import { useViewMatch, type ViewDashboard } from "./data";
import { plural, sortRanking, when } from "./parts";

/**
 * The screen someone lands on from WhatsApp: when and where the next match is,
 * how to get there, and everything else one row away.
 */
export function GroupHome({ dashboard }: { dashboard: ViewDashboard }) {
  const { source, showMoney, open, openSection, detail, section } = useView();
  const upcoming = dashboard.upcoming;
  const tz = dashboard.group.timeZone;
  const lineup = useViewMatch(source, upcoming?.matchId);
  const finances = showMoney ? dashboard.finances : null;
  const leader = sortRanking(dashboard.ranking, "contributions")[0];

  const teamCounts = lineup.data
    ? lineup.data.teams.map(
        (team) =>
          lineup.data.appearances.filter((appearance) => appearance.teamId === team.id).length,
      )
    : null;
  const lineupValue = !teamCounts
    ? undefined
    : teamCounts.every((count) => count === 0)
      ? "Sin anotados"
      : teamCounts.join(" vs ");

  return (
    <>
      <StatusHeader
        meta={
          <span className="flex items-center gap-1.5">
            {source.kind === "shared" ? (
              <LockKeyholeIcon aria-hidden="true" className="size-3.5" />
            ) : (
              <GlobeIcon aria-hidden="true" className="size-3.5" />
            )}
            {source.kind === "shared" ? "Enlace privado" : "Grupo público"} · solo lectura
          </span>
        }
        title={dashboard.group.name}
      />

      {upcoming ? (
        <>
          <HeroNumber
            caption={
              <span className="first-letter:uppercase">
                {when.long(upcoming.scheduledAt, tz)} · {when.relative(upcoming.scheduledAt, tz)}
              </span>
            }
          >
            {when.time(upcoming.scheduledAt, tz)}
          </HeroNumber>
          <NextStep
            action={
              upcoming.court ? (
                <a
                  className={cn(buttonVariants())}
                  href={upcoming.court.mapsUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  <NavigationIcon data-icon="inline-start" aria-hidden="true" />
                  Cómo llegar
                </a>
              ) : undefined
            }
            kicker="Próximo partido"
            title={upcoming.court?.name ?? "Cancha a confirmar"}
          >
            {upcoming.court?.address ?? "El organizador todavía no eligió la cancha."}
          </NextStep>
        </>
      ) : null}

      <DrillList>
        {upcoming ? (
          <DrillRow
            label="Equipos"
            selected={detail?.kind === "partido" && detail.id === upcoming.matchId}
            onClick={() => open("partido", upcoming.matchId)}
            value={lineupValue}
          />
        ) : (
          <DrillRow label="Próximo partido" static value="Sin fecha" />
        )}
        {finances ? (
          <DrillRow
            label="La caja"
            selected={!detail && section === "caja"}
            onClick={() => openSection("caja")}
            value={
              finances.debtors.length > 0
                ? `falta ${formatMoney(finances.debtMinor)}`
                : finances.participantCount > 0
                  ? "Todos pagaron"
                  : undefined
            }
          />
        ) : null}
        <DrillRow
          label="Resultados"
          selected={!detail && section === "resultados"}
          onClick={() => openSection("resultados")}
          value={
            dashboard.history.length > 0
              ? plural(dashboard.history.length, "partido", "partidos")
              : "Sin partidos"
          }
        />
        <DrillRow
          label="Tabla"
          selected={!detail && section === "tabla"}
          onClick={() => openSection("tabla")}
          value={
            leader ? (
              <span className="flex max-w-48 gap-1">
                <span className="truncate">{leader.displayName}</span>
                <span className="shrink-0">· {leader.contributions} G+A</span>
              </span>
            ) : (
              "Sin datos"
            )
          }
        />
      </DrillList>
    </>
  );
}

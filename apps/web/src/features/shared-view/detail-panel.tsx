"use client";

import { Badge } from "@hay-fulbo/ui/components/badge";
import { Skeleton } from "@hay-fulbo/ui/components/skeleton";
import { cn } from "@hay-fulbo/ui/lib/utils";
import type * as React from "react";

import { DrillDetail } from "@/components/next-step-layout";
import { formatMoney } from "@/lib/format";

import { useView } from "./context";
import {
  useViewMatch,
  useViewPlayer,
  type ViewDashboard,
  type ViewMatch,
  type ViewPlayer,
} from "./data";
import {
  contributionLine,
  FormGuide,
  plural,
  resultLabel,
  rowAction,
  scorers,
  TeamChip,
  TeamDot,
  when,
  winnerSlot,
} from "./parts";
import { sectionContent } from "./sections";

type Content = { title: string; description?: React.ReactNode; body: React.ReactNode };

/**
 * What a row opened: a section, or a match or player detail. Bottom sheet on phones,
 * the right column on desktop. A detail wins over the section it was opened from.
 */
export function DetailPanel({ dashboard }: { dashboard: ViewDashboard }) {
  const { detail, section, close, showMoney, source } = useView();
  const match = useViewMatch(source, detail?.kind === "partido" ? detail.id : null);
  const player = useViewPlayer(source, detail?.kind === "jugador" ? detail.id : null);

  let content: Content | null = null;
  if (detail?.kind === "partido") {
    content = match.error
      ? stateContent("Partido", "Este partido no está disponible.")
      : match.data
        ? matchContent(match.data, showMoney)
        : stateContent("Partido");
  } else if (detail?.kind === "jugador") {
    content = player.error
      ? stateContent("Jugador", "Este jugador no está disponible.")
      : player.data
        ? playerContent(player.data)
        : stateContent("Jugador");
  } else if (section) {
    content = sectionContent(section, dashboard);
  }

  return (
    <DrillDetail
      description={content?.description}
      onOpenChange={(open) => (open ? undefined : close())}
      open={content !== null}
      title={content?.title ?? ""}
    >
      {content?.body}
    </DrillDetail>
  );
}

function stateContent(title: string, message?: string): Content {
  return {
    title,
    body: message ? (
      <p className="text-sm text-muted-foreground">{message}</p>
    ) : (
      <div aria-busy="true" aria-label="Cargando" className="flex flex-col gap-3">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-11 w-full" />
      </div>
    ),
  };
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function matchContent(match: ViewMatch, showMoney: boolean): Content {
  const tz = match.group.timeZone;
  return {
    title: capitalize(when.long(match.scheduledAt, tz)),
    description: (
      <>
        <span className="tabular-nums">{when.time(match.scheduledAt, tz)} hs</span>
        {match.court ? ` · ${match.court.name}` : ""}
        {showMoney && match.courtCostMinor ? ` · cancha ${formatMoney(match.courtCostMinor)}` : ""}
      </>
    ),
    body: <MatchBody match={match} />,
  };
}

function MatchBody({ match }: { match: ViewMatch }) {
  const { open, showMoney } = useView();
  const played = match.status === "closed";
  const winner = winnerSlot(match);
  const [left, right] = match.teams;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col items-center gap-2">
        <div className="grid w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
          {left ? (
            <TeamChip className="order-1 justify-self-start" slot={left.slot}>
              {left.displayName}
            </TeamChip>
          ) : null}
          <span
            aria-label={played ? `${left?.goals} a ${right?.goals}` : undefined}
            className="order-2 text-5xl font-black tabular-nums"
          >
            {played ? (
              <>
                {left?.goals}
                <span aria-hidden="true" className="px-1.5 text-muted-foreground">
                  –
                </span>
                {right?.goals}
              </>
            ) : (
              <span className="text-2xl text-muted-foreground">vs</span>
            )}
          </span>
          {right ? (
            <TeamChip className="order-3 justify-self-end" slot={right.slot}>
              {right.displayName}
            </TeamChip>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Badge variant={match.status === "cancelled" ? "destructive" : "secondary"}>
            {resultLabel(match)}
          </Badge>
          {match.figure ? (
            <Badge variant="outline">Figura: {match.figure.displayName}</Badge>
          ) : null}
        </div>
      </div>

      {played ? (
        <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
          {match.teams.map((team) => (
            <p className={cn(team.slot === 2 && "text-right")} key={team.id}>
              {scorers(match, team.id).join(", ") || "Sin goles atribuidos"}
            </p>
          ))}
        </div>
      ) : null}

      {match.appearances.length === 0 ? (
        <p className="text-sm text-muted-foreground">Todavía no hay jugadores anotados.</p>
      ) : (
        <div className="grid gap-5 xl:grid-cols-2">
          {match.teams.map((team) => (
            <section aria-label={team.displayName} className="flex flex-col gap-1" key={team.id}>
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <TeamDot slot={team.slot} />
                {team.displayName}
                {played && winner === team.slot ? <Badge variant="success">Ganó</Badge> : null}
              </h3>
              <ul className="-mx-2 flex flex-col">
                {match.appearances
                  .filter((appearance) => appearance.teamId === team.id)
                  .map((appearance) => (
                    <li key={appearance.playerId}>
                      <button
                        className={cn(
                          "flex min-h-11 w-full items-center gap-2 rounded-md px-2 text-left text-sm",
                          rowAction,
                        )}
                        onClick={() => open("jugador", appearance.playerId)}
                        type="button"
                      >
                        <span className="min-w-0 flex-1 truncate">
                          {appearance.playerDisplayName}
                        </span>
                        <span className="shrink-0 text-xs tabular-nums">
                          {contributionLine(appearance)}
                        </span>
                        {appearance.ownGoals ? (
                          <span className="shrink-0 text-xs text-destructive">
                            {appearance.ownGoals} AG
                          </span>
                        ) : null}
                        {showMoney && appearance.debtMinor !== "0" ? (
                          <Badge variant="destructive">Debe</Badge>
                        ) : null}
                      </button>
                    </li>
                  ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function playerContent(data: ViewPlayer): Content {
  const aggregate = data.aggregate;
  return {
    title: data.player.displayName,
    description: (
      <>
        {aggregate ? plural(aggregate.played, "partido", "partidos") : "Sin partidos cerrados"}
        {data.player.archived ? " · inactivo" : ""}
      </>
    ),
    body: <PlayerBody data={data} />,
  };
}

function PlayerBody({ data }: { data: ViewPlayer }) {
  const { open } = useView();
  const aggregate = data.aggregate;
  const tz = data.group.timeZone;
  return (
    <div className="flex flex-col gap-5">
      {aggregate ? (
        <>
          <dl className="grid grid-cols-4 gap-2">
            {(
              [
                ["G+A", aggregate.contributions],
                ["Goles", aggregate.goals],
                ["Asist.", aggregate.assists],
                ["Vict.", `${Math.round(aggregate.winPercentage)}%`],
              ] as const
            ).map(([label, value]) => (
              <div
                className="flex flex-col-reverse items-center gap-0.5 rounded-lg bg-muted/50 py-3"
                key={label}
              >
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="text-xl font-bold tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
          <div className="flex flex-col gap-1.5">
            <h3 className="text-xs font-medium text-muted-foreground">Últimos partidos</h3>
            <FormGuide
              outcomes={data.matches
                .slice(0, 10)
                .map((match) => match.outcome)
                .reverse()}
            />
          </div>
        </>
      ) : null}
      <section aria-labelledby="player-matches" className="flex flex-col gap-1">
        <h3 className="text-sm font-semibold" id="player-matches">
          Partidos
        </h3>
        {data.matches.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no jugó un partido cerrado.</p>
        ) : (
          <ul className="-mx-2 flex flex-col">
            {data.matches.map((match) => {
              const own = match.teams.find((team) => team.id === match.teamId);
              const rival = match.teams.find((team) => team.id !== match.teamId);
              return (
                <li key={match.matchId}>
                  <button
                    className={cn(
                      "flex min-h-11 w-full items-center gap-3 rounded-md px-2 text-left text-sm",
                      rowAction,
                    )}
                    onClick={() => open("partido", match.matchId)}
                    type="button"
                  >
                    <FormGuide outcomes={[match.outcome]} />
                    <span className="min-w-0 flex-1 truncate">
                      <span className="tabular-nums">
                        {own?.goals}–{rival?.goals}
                      </span>{" "}
                      <span className="text-muted-foreground">
                        · {when.day(match.scheduledAt, tz)}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs font-semibold tabular-nums">
                      {contributionLine(match)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

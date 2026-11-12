"use client";

// PROTOTYPE ONLY — "La previa": one scroll that reads in time order.
// What's next → what just happened → how the table looks → everything else.

import { Badge } from "@hay-fulbo/ui/components/badge";
import { Button, buttonVariants } from "@hay-fulbo/ui/components/button";
import { Card } from "@hay-fulbo/ui/components/card";
import { Progress } from "@hay-fulbo/ui/components/progress";
import { cn } from "@hay-fulbo/ui/lib/utils";
import { ArrowLeftIcon, ChevronRightIcon, MapPinIcon, NavigationIcon } from "lucide-react";
import { useState } from "react";

import {
  AccessBadge,
  type Dashboard,
  FormGuide,
  fmt,
  groupByMonth,
  LoadingRows,
  type MatchDetail,
  PlayerAvatar,
  plural,
  resultLabel,
  rowLink,
  scorers,
  TeamDot,
  useDashboard,
  useMatchDetail,
  usePlayerStats,
  useProto,
  winnerSlot,
} from "./shared";

export function PreviaVariant() {
  const { detail } = useProto();
  if (detail?.kind === "partido") return <MatchPage matchId={detail.id} />;
  if (detail?.kind === "jugador") return <PlayerPage playerId={detail.id} />;
  return <PreviaHome />;
}

function PreviaHome() {
  const query = useDashboard();
  if (!query.data)
    return (
      <PageShell>
        <LoadingRows rows={8} />
      </PageShell>
    );
  const dashboard = query.data;
  const tz = dashboard.group.timeZone;
  const last = dashboard.history.find((match) => match.status === "closed") ?? null;

  return (
    <PageShell>
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight text-balance">{dashboard.group.name}</h1>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground">
          <AccessBadge />
          <span className="tabular-nums">
            {plural(dashboard.summary.matchesPlayed, "partido", "partidos")} ·{" "}
            {plural(dashboard.summary.totalGoals, "gol", "goles")}
          </span>
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start">
        <div className="lg:sticky lg:top-8">
          <NextMatch dashboard={dashboard} />
        </div>
        <div className="flex min-w-0 flex-col gap-8">
          {last ? <LastMatch match={last} tz={tz} /> : null}
          <TopTable dashboard={dashboard} />
          <Results dashboard={dashboard} />
        </div>
      </div>
    </PageShell>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pt-10">
      {children}
    </main>
  );
}

function SectionTitle({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2 className="text-base font-semibold">{children}</h2>
      {aside ? <span className="text-xs text-muted-foreground">{aside}</span> : null}
    </div>
  );
}

// ── Next match ───────────────────────────────────────────────────────────────

function NextMatch({ dashboard }: { dashboard: Dashboard }) {
  const { privateLink, open } = useProto();
  const upcoming = dashboard.upcoming;
  const detail = useMatchDetail(upcoming?.matchId);
  const tz = dashboard.group.timeZone;

  if (!upcoming) {
    return (
      <section aria-labelledby="next-title" className="flex flex-col gap-3">
        <SectionTitle>Próxima fecha</SectionTitle>
        <p
          className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground"
          id="next-title"
        >
          Todavía no hay fecha programada. El organizador la carga en la app.
        </p>
      </section>
    );
  }

  const finances = dashboard.finances;
  const perHead =
    finances && finances.participantCount > 0
      ? Number(finances.expectedMinor) / finances.participantCount
      : null;

  return (
    <section aria-labelledby="next-title" className="flex flex-col gap-3">
      <SectionTitle aside={fmt.relative(upcoming.scheduledAt)}>Próxima fecha</SectionTitle>
      <Card className="gap-0 py-0">
        <div className="flex flex-col gap-4 p-4 sm:p-5">
          <div className="flex flex-col gap-1">
            <p className="text-3xl font-bold tracking-tight first-letter:uppercase" id="next-title">
              {fmt.long(upcoming.scheduledAt, tz)}
            </p>
            <p className="text-lg font-semibold tabular-nums">
              {fmt.time(upcoming.scheduledAt, tz)} hs
              {upcoming.court ? (
                <span className="text-muted-foreground"> · {upcoming.court.name}</span>
              ) : null}
            </p>
            {upcoming.court ? (
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPinIcon aria-hidden="true" className="size-4 shrink-0" />
                {upcoming.court.address}
              </p>
            ) : null}
          </div>
          {upcoming.court ? (
            <a
              className={cn(buttonVariants({ size: "lg" }), "w-full sm:w-fit")}
              href={upcoming.court.mapsUrl}
              rel="noreferrer"
              target="_blank"
            >
              <NavigationIcon data-icon="inline-start" aria-hidden="true" />
              Cómo llegar
            </a>
          ) : null}
        </div>

        <div className="border-t p-4 sm:p-5">
          {detail.data ? <Lineups detail={detail.data} compact /> : <LoadingRows rows={3} />}
        </div>

        {privateLink && finances ? (
          <div className="flex flex-col gap-3 border-t p-4 sm:p-5">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-sm font-semibold">Pagos</h3>
              <span className="text-xs text-muted-foreground tabular-nums">
                {perHead !== null ? `${fmt.money(perHead)} por cabeza` : null}
              </span>
            </div>
            <Progress
              aria-label="Jugadores que ya pagaron"
              value={(finances.paidCount / Math.max(finances.participantCount, 1)) * 100}
            />
            <p className="text-sm tabular-nums">
              <span className="font-semibold">
                {finances.paidCount} de {finances.participantCount}
              </span>{" "}
              <span className="text-muted-foreground">
                pagaron · faltan {fmt.money(finances.debtMinor)}
              </span>
            </p>
            {finances.debtors.length > 0 ? (
              <ul className="-mx-2 flex flex-col">
                {finances.debtors.map((debtor) => (
                  <li key={debtor.playerId}>
                    <button
                      className={cn(
                        "flex min-h-11 w-full items-center justify-between gap-3 rounded-md px-2 text-left text-sm",
                        rowLink,
                      )}
                      onClick={() => open("jugador", debtor.playerId)}
                      type="button"
                    >
                      <span className="truncate">{debtor.displayName}</span>
                      <span className="shrink-0 text-xs tabular-nums text-destructive">
                        Debe {fmt.money(debtor.debtMinor)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </Card>
    </section>
  );
}

function Lineups({ detail, compact = false }: { detail: MatchDetail; compact?: boolean }) {
  const { open, privateLink } = useProto();
  const played = detail.status === "closed";
  return (
    <div className={cn("grid gap-4", compact ? "grid-cols-2" : "sm:grid-cols-2")}>
      {detail.teams.map((team) => {
        const players = detail.appearances.filter((appearance) => appearance.teamId === team.id);
        return (
          <section
            aria-label={team.displayName}
            className="flex min-w-0 flex-col gap-1"
            key={team.id}
          >
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <TeamDot slot={team.slot} />
              <span className="truncate">{team.displayName}</span>
              {!compact && played ? (
                <span className="ml-auto text-xs font-normal tabular-nums text-muted-foreground">
                  {plural(team.goals, "gol", "goles")}
                </span>
              ) : null}
            </h3>
            <ul className="-mx-2 flex flex-col">
              {players.map((appearance) => {
                const stats = [
                  appearance.goals ? `${appearance.goals} G` : null,
                  appearance.assists ? `${appearance.assists} A` : null,
                ].filter(Boolean);
                const owes = privateLink && appearance.debtMinor !== "0";
                return (
                  <li key={appearance.playerId}>
                    <button
                      className={cn(
                        "flex w-full items-center gap-2 rounded-md px-2 text-left text-sm",
                        compact ? "min-h-9" : "min-h-11",
                        rowLink,
                      )}
                      onClick={() => open("jugador", appearance.playerId)}
                      type="button"
                    >
                      <span className="min-w-0 flex-1 truncate">
                        {appearance.playerDisplayName}
                      </span>
                      {!compact && stats.length ? (
                        <span className="shrink-0 text-xs font-semibold tabular-nums">
                          {stats.join(" · ")}
                        </span>
                      ) : null}
                      {!compact && appearance.ownGoals ? (
                        <span className="shrink-0 text-xs tabular-nums text-destructive">
                          {appearance.ownGoals} AG
                        </span>
                      ) : null}
                      {!compact && owes ? (
                        <span className="shrink-0 text-xs text-destructive">Debe</span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

// ── Last match ───────────────────────────────────────────────────────────────

function LastMatch({ match, tz }: { match: Dashboard["history"][number]; tz: string }) {
  const { open } = useProto();
  const detail = useMatchDetail(match.matchId);
  const winner = winnerSlot(match);
  return (
    <section aria-labelledby="last-title" className="flex flex-col gap-3">
      <SectionTitle aside={fmt.day(match.scheduledAt, tz)}>
        <span id="last-title">Último partido</span>
      </SectionTitle>
      <Card className="gap-0 py-0">
        <button
          className={cn("flex flex-col gap-3 rounded-lg p-4 text-left sm:p-5", rowLink)}
          onClick={() => open("partido", match.matchId)}
          type="button"
        >
          {match.teams.map((team) => (
            <div className="flex items-center gap-3" key={team.id}>
              <TeamDot slot={team.slot} className="size-2.5" />
              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    "block truncate text-lg font-semibold",
                    winner !== null && winner !== team.slot && "text-muted-foreground",
                  )}
                >
                  {team.displayName}
                </span>
                {detail.data ? (
                  <span className="block truncate text-xs text-muted-foreground">
                    {scorers(detail.data, team.id).join(", ") || "Sin goles"}
                  </span>
                ) : (
                  <span className="block h-4" />
                )}
              </span>
              <span
                className={cn(
                  "text-4xl font-black tabular-nums",
                  winner !== null && winner !== team.slot && "text-muted-foreground",
                )}
              >
                {team.goals}
              </span>
            </div>
          ))}
          <span className="flex items-center justify-between border-t pt-3 text-sm text-muted-foreground">
            <span className="truncate">
              {resultLabel(match)}
              {match.court ? ` · ${match.court.name}` : ""}
            </span>
            <span className="flex shrink-0 items-center gap-1 font-medium text-foreground">
              Ver partido
              <ChevronRightIcon aria-hidden="true" className="size-4" />
            </span>
          </span>
        </button>
      </Card>
    </section>
  );
}

// ── Table ────────────────────────────────────────────────────────────────────

function TopTable({ dashboard }: { dashboard: Dashboard }) {
  const { open } = useProto();
  const [expanded, setExpanded] = useState(false);
  const rows = expanded ? dashboard.ranking : dashboard.ranking.slice(0, 5);
  if (dashboard.ranking.length === 0) return null;
  return (
    <section aria-labelledby="table-title" className="flex flex-col gap-3">
      <SectionTitle aside="ordenada por goles + asistencias">
        <span id="table-title">La tabla</span>
      </SectionTitle>
      <Card className="gap-0 py-1">
        <ol className="flex flex-col divide-y">
          {rows.map((row, index) => (
            <li key={row.playerId}>
              <button
                className={cn(
                  "flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left",
                  rowLink,
                )}
                onClick={() => open("jugador", row.playerId)}
                type="button"
              >
                <span
                  className={cn(
                    "w-5 shrink-0 text-sm tabular-nums",
                    index === 0 ? "font-bold text-primary-text" : "text-muted-foreground",
                  )}
                >
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">{row.displayName}</span>
                    {row.archived ? <Badge variant="outline">Inactivo</Badge> : null}
                  </span>
                  <span className="block text-xs tabular-nums text-muted-foreground">
                    {row.goals} G · {row.assists} A · {row.played} PJ
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-lg font-semibold tabular-nums">
                    {row.contributions}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ol>
        {dashboard.ranking.length > 5 ? (
          <div className="border-t px-2 pt-1">
            <Button
              aria-expanded={expanded}
              className="w-full"
              onClick={() => setExpanded((value) => !value)}
              variant="ghost"
            >
              {expanded
                ? "Ver solo los 5 primeros"
                : `Ver los ${dashboard.ranking.length} jugadores`}
            </Button>
          </div>
        ) : null}
      </Card>
    </section>
  );
}

// ── Results ──────────────────────────────────────────────────────────────────

function Results({ dashboard }: { dashboard: Dashboard }) {
  const [limit, setLimit] = useState(8);
  const tz = dashboard.group.timeZone;
  const months = groupByMonth(dashboard.history.slice(0, limit), tz);
  if (dashboard.history.length === 0) return null;
  return (
    <section aria-labelledby="results-title" className="flex flex-col gap-3">
      <SectionTitle aside={plural(dashboard.history.length, "partido", "partidos")}>
        <span id="results-title">Resultados</span>
      </SectionTitle>
      <div className="flex flex-col gap-5">
        {months.map((month) => (
          <div className="flex flex-col gap-1" key={month.label}>
            <h3 className="text-xs font-medium text-muted-foreground first-letter:uppercase">
              {month.label}
            </h3>
            <ResultList items={month.items} tz={tz} />
          </div>
        ))}
      </div>
      {dashboard.history.length > limit ? (
        <Button
          className="w-full sm:w-fit"
          onClick={() => setLimit((value) => value + 10)}
          variant="outline"
        >
          Ver partidos anteriores
        </Button>
      ) : null}
    </section>
  );
}

function ResultList({ items, tz }: { items: Dashboard["history"]; tz: string }) {
  const { open } = useProto();
  return (
    <ul className="-mx-2 flex flex-col">
      {items.map((match) => {
        const winner = winnerSlot(match);
        const [left, right] = match.teams;
        return (
          <li key={match.matchId}>
            <button
              className={cn(
                "flex min-h-12 w-full items-center gap-3 rounded-md px-2 text-left text-sm",
                rowLink,
              )}
              onClick={() => open("partido", match.matchId)}
              type="button"
            >
              <span className="w-16 shrink-0 text-xs text-muted-foreground">
                {fmt.day(match.scheduledAt, tz)}
              </span>
              {match.status === "cancelled" ? (
                <span className="flex min-w-0 flex-1 items-center gap-2 text-muted-foreground">
                  <span className="truncate">{match.court?.name ?? "Partido"}</span>
                  <Badge variant="outline">Cancelado</Badge>
                </span>
              ) : (
                <span className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
                  <span
                    className={cn(
                      "truncate text-right",
                      winner === left?.slot ? "font-semibold" : "text-muted-foreground",
                    )}
                  >
                    {left?.displayName}
                  </span>
                  <span className="rounded-xs bg-muted px-1.5 py-0.5 font-semibold tabular-nums">
                    {left?.goals}–{right?.goals}
                  </span>
                  <span
                    className={cn(
                      "truncate",
                      winner === right?.slot ? "font-semibold" : "text-muted-foreground",
                    )}
                  >
                    {right?.displayName}
                  </span>
                </span>
              )}
              <ChevronRightIcon
                aria-hidden="true"
                className="size-4 shrink-0 text-muted-foreground"
              />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

// ── Detail pages (shared with "La tabla") ────────────────────────────────────

function BackButton() {
  const { close } = useProto();
  return (
    <Button className="-ml-3 w-fit" onClick={close} size="sm" variant="ghost">
      <ArrowLeftIcon data-icon="inline-start" aria-hidden="true" />
      Volver
    </Button>
  );
}

export function MatchPage({ matchId }: { matchId: string }) {
  const query = useMatchDetail(matchId);
  const detail = query.data;
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pb-28 pt-4 sm:px-6 lg:pt-8">
      <BackButton />
      {!detail ? (
        <LoadingRows rows={6} />
      ) : (
        <>
          <MatchScoreboard detail={detail} />
          <section aria-labelledby="lineups-title" className="flex flex-col gap-3">
            <h2 className="text-base font-semibold" id="lineups-title">
              {detail.status === "closed" ? "Quién jugó" : "Equipos"}
            </h2>
            <Card className="py-4">
              <div className="px-4">
                <Lineups detail={detail} />
              </div>
            </Card>
          </section>
        </>
      )}
    </main>
  );
}

function MatchScoreboard({ detail }: { detail: MatchDetail }) {
  const { privateLink } = useProto();
  const tz = detail.group.timeZone;
  const winner = winnerSlot(detail);
  const played = detail.status === "closed";
  return (
    <header className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground first-letter:uppercase">
          {fmt.long(detail.scheduledAt, tz)} · {fmt.time(detail.scheduledAt, tz)} hs
        </p>
        <p className="text-sm text-muted-foreground">
          {detail.court?.name ?? "Sin cancha"}
          {privateLink && detail.courtCostMinor
            ? ` · cancha ${fmt.money(detail.courtCostMinor)}`
            : ""}
        </p>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
        {detail.teams.map((team, index) => (
          <div
            className={cn(
              "flex min-w-0 flex-col gap-1",
              index === 0 ? "order-1 items-start" : "order-3 items-end text-right",
            )}
            key={team.id}
          >
            <span className="flex max-w-full items-center gap-2">
              {index === 0 ? <TeamDot slot={team.slot} /> : null}
              <span
                className={cn(
                  "truncate text-base font-semibold",
                  played && winner !== null && winner !== team.slot && "text-muted-foreground",
                )}
              >
                {team.displayName}
              </span>
              {index === 1 ? <TeamDot slot={team.slot} /> : null}
            </span>
          </div>
        ))}
        <span className="order-2 text-5xl font-black tabular-nums tracking-tight sm:text-6xl">
          {played ? (
            <>
              {detail.teams[0]?.goals}
              <span className="px-2 text-muted-foreground">–</span>
              {detail.teams[1]?.goals}
            </>
          ) : (
            <span className="text-3xl text-muted-foreground">vs</span>
          )}
        </span>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Badge variant={detail.status === "cancelled" ? "destructive" : "secondary"}>
          {resultLabel(detail)}
        </Badge>
        {detail.figure ? (
          <Badge variant="outline">Figura: {detail.figure.displayName}</Badge>
        ) : null}
      </div>
    </header>
  );
}

export function PlayerPage({ playerId }: { playerId: string }) {
  const { open } = useProto();
  const query = usePlayerStats(playerId);
  const data = query.data;
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pb-28 pt-4 sm:px-6 lg:pt-8">
      <BackButton />
      {!data ? (
        <LoadingRows rows={6} />
      ) : (
        <>
          <header className="flex items-center gap-4">
            <PlayerAvatar className="size-14 text-base" name={data.player.displayName} />
            <div className="flex min-w-0 flex-col gap-1">
              <h1 className="text-2xl font-bold tracking-tight text-balance">
                {data.player.displayName}
              </h1>
              <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                {data.aggregate
                  ? plural(data.aggregate.played, "partido", "partidos")
                  : "Sin partidos cerrados"}
                {data.player.archived ? <Badge variant="outline">Inactivo</Badge> : null}
              </p>
            </div>
          </header>

          {data.aggregate ? (
            <>
              <Card className="py-0">
                <dl className="grid grid-cols-4 divide-x">
                  {[
                    ["G+A", data.aggregate.contributions],
                    ["Goles", data.aggregate.goals],
                    ["Asist.", data.aggregate.assists],
                    ["Ganados", `${Math.round(data.aggregate.winPercentage)}%`],
                  ].map(([label, value]) => (
                    <div className="flex min-w-0 flex-col gap-1 px-3 py-3 sm:px-4" key={label}>
                      <dt className="truncate text-xs font-medium text-muted-foreground">
                        {label}
                      </dt>
                      <dd className="text-lg font-semibold tabular-nums">{value}</dd>
                    </div>
                  ))}
                </dl>
              </Card>
              <div className="flex flex-col gap-2">
                <h2 className="text-base font-semibold">Racha</h2>
                <FormGuide
                  outcomes={data.matches
                    .slice(0, 10)
                    .map((match) => match.outcome)
                    .reverse()}
                />
                <p className="text-xs tabular-nums text-muted-foreground">
                  {data.aggregate.wins}G {data.aggregate.draws}E {data.aggregate.losses}P ·{" "}
                  {fmt.rate(data.aggregate.contributionsPerMatch)} G+A por partido · diferencia{" "}
                  {fmt.signed(data.aggregate.goalDifference)}
                </p>
              </div>
            </>
          ) : null}

          <section aria-labelledby="player-matches" className="flex flex-col gap-3">
            <h2 className="text-base font-semibold" id="player-matches">
              Sus partidos
            </h2>
            {data.matches.length === 0 ? (
              <p className="text-sm text-muted-foreground">Todavía no jugó un partido cerrado.</p>
            ) : (
              <Card className="py-1">
                <ul className="flex flex-col divide-y">
                  {data.matches.map((match) => {
                    const own = match.teams.find((team) => team.id === match.teamId);
                    const rival = match.teams.find((team) => team.id !== match.teamId);
                    return (
                      <li key={match.matchId}>
                        <button
                          className={cn(
                            "flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left",
                            rowLink,
                          )}
                          onClick={() => open("partido", match.matchId)}
                          type="button"
                        >
                          <FormGuide outcomes={[match.outcome]} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm">
                              {own?.displayName}{" "}
                              <strong className="font-semibold tabular-nums">
                                {own?.goals}–{rival?.goals}
                              </strong>{" "}
                              {rival?.displayName}
                            </span>
                            <span className="block text-xs text-muted-foreground">
                              {fmt.day(match.scheduledAt, data.group.timeZone)}
                            </span>
                          </span>
                          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                            {match.goals || match.assists ? (
                              <span className="font-semibold text-foreground">
                                {[
                                  match.goals ? `${match.goals} G` : null,
                                  match.assists ? `${match.assists} A` : null,
                                ]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </span>
                            ) : (
                              "—"
                            )}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            )}
          </section>
        </>
      )}
    </main>
  );
}

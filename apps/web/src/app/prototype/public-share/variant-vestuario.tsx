"use client";

// PROTOTYPE ONLY — "El vestuario": an app shell, not a page.
// Three destinations in a bottom bar, one job each; details open in sheets so
// the visitor never loses their place.

import { Badge } from "@hay-fulbo/ui/components/badge";
import { buttonVariants } from "@hay-fulbo/ui/components/button";
import { Card } from "@hay-fulbo/ui/components/card";
import { Progress } from "@hay-fulbo/ui/components/progress";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@hay-fulbo/ui/components/sheet";
import { ToggleGroup, ToggleGroupItem } from "@hay-fulbo/ui/components/toggle-group";
import { cn } from "@hay-fulbo/ui/lib/utils";
import {
  CalendarDaysIcon,
  ListIcon,
  LockKeyholeIcon,
  GlobeIcon,
  MapPinIcon,
  NavigationIcon,
  TrophyIcon,
} from "lucide-react";
import { useSyncExternalStore } from "react";

import {
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

const tabs = [
  { key: "proxima", label: "Próxima", icon: CalendarDaysIcon },
  { key: "resultados", label: "Resultados", icon: ListIcon },
  { key: "tabla", label: "Tabla", icon: TrophyIcon },
] as const;
type TabKey = (typeof tabs)[number]["key"];

export function VestuarioVariant() {
  const { param, setParam, privateLink } = useProto();
  const query = useDashboard();
  const tab = (tabs.find((item) => item.key === param("tab"))?.key ?? "proxima") as TabKey;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-10 border-b bg-background/95 supports-[backdrop-filter]:bg-background/80 supports-[backdrop-filter]:backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-2 px-4 sm:px-6 lg:px-8">
          {privateLink ? (
            <LockKeyholeIcon
              aria-label="Enlace privado"
              className="size-4 shrink-0 text-muted-foreground"
            />
          ) : (
            <GlobeIcon
              aria-label="Grupo público"
              className="size-4 shrink-0 text-muted-foreground"
            />
          )}
          <p className="min-w-0 flex-1 truncate text-sm font-semibold">
            {query.data?.group.name ?? "Cargando…"}
          </p>
          <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">
            Solo lectura
          </span>
        </div>
        <nav
          aria-label="Secciones"
          className="mx-auto hidden w-full max-w-5xl gap-1 px-4 sm:px-6 md:flex lg:px-8"
        >
          {tabs.map((item) => (
            <button
              aria-current={tab === item.key ? "page" : undefined}
              className={cn(
                "relative flex h-11 items-center gap-2 px-3 text-sm font-medium text-muted-foreground transition-colors duration-150 ease-out hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                tab === item.key &&
                  "text-foreground after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-primary",
              )}
              key={item.key}
              onClick={() => setParam("tab", item.key === "proxima" ? null : item.key)}
              type="button"
            >
              <item.icon aria-hidden="true" className="size-4" />
              {item.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-32 pt-5 sm:px-6 md:pb-28 lg:px-8 lg:pt-8">
        {!query.data ? (
          <LoadingRows rows={6} />
        ) : tab === "proxima" ? (
          <NextTab dashboard={query.data} />
        ) : tab === "resultados" ? (
          <ResultsTab dashboard={query.data} />
        ) : (
          <TableTab dashboard={query.data} />
        )}
      </main>

      <nav
        aria-label="Secciones"
        className="fixed inset-x-0 bottom-0 z-10 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] supports-[backdrop-filter]:bg-background/80 supports-[backdrop-filter]:backdrop-blur md:hidden"
      >
        <ul className="grid grid-cols-3">
          {tabs.map((item) => (
            <li key={item.key}>
              <button
                aria-current={tab === item.key ? "page" : undefined}
                className={cn(
                  "flex h-16 w-full flex-col items-center justify-center gap-1 text-xs font-medium text-muted-foreground transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50 [touch-action:manipulation]",
                  tab === item.key && "text-foreground",
                )}
                onClick={() => setParam("tab", item.key === "proxima" ? null : item.key)}
                type="button"
              >
                <item.icon
                  aria-hidden="true"
                  className={cn("size-5", tab === item.key && "text-primary-text")}
                />
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <DetailSheet />
    </div>
  );
}

// ── Próxima ──────────────────────────────────────────────────────────────────

function NextTab({ dashboard }: { dashboard: Dashboard }) {
  const { privateLink, open } = useProto();
  const upcoming = dashboard.upcoming;
  const detail = useMatchDetail(upcoming?.matchId);
  const tz = dashboard.group.timeZone;
  const finances = dashboard.finances;

  if (!upcoming) {
    return (
      <div className="flex flex-col items-start gap-2 rounded-lg border border-dashed p-5">
        <h1 className="text-base font-semibold">No hay fecha programada</h1>
        <p className="text-sm text-muted-foreground">
          Cuando el organizador cargue la próxima, aparece acá con cancha, equipos y pagos.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-start">
      <div className="flex flex-col gap-5">
        <Card className="gap-0 overflow-hidden py-0">
          <div className="flex items-stretch">
            <div className="flex w-24 shrink-0 flex-col items-center justify-center gap-0.5 border-r bg-muted/50 py-4">
              <span className="text-xs font-semibold uppercase text-muted-foreground">
                {fmt.weekdayShort(upcoming.scheduledAt, tz)}
              </span>
              <span className="text-5xl font-black leading-none tabular-nums">
                {fmt.dayNumber(upcoming.scheduledAt, tz)}
              </span>
              <span className="text-xs font-semibold uppercase text-muted-foreground">
                {fmt.month(upcoming.scheduledAt, tz)}
              </span>
            </div>
            <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 p-4">
              <h1 className="text-xl font-bold tracking-tight">
                {fmt.time(upcoming.scheduledAt, tz)} hs
                <span className="font-semibold text-muted-foreground">
                  {" "}
                  · {fmt.relative(upcoming.scheduledAt)}
                </span>
              </h1>
              {upcoming.court ? (
                <>
                  <p className="truncate text-sm font-medium">{upcoming.court.name}</p>
                  <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                    <MapPinIcon aria-hidden="true" className="size-3.5 shrink-0" />
                    {upcoming.court.address}
                  </p>
                </>
              ) : null}
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

        <section aria-labelledby="teams" className="flex flex-col gap-3">
          <h2 className="text-base font-semibold" id="teams">
            Equipos
          </h2>
          {detail.data ? <TeamCards detail={detail.data} /> : <LoadingRows rows={3} />}
        </section>
      </div>

      {privateLink && finances ? (
        <section aria-labelledby="cash" className="flex flex-col gap-3">
          <h2 className="text-base font-semibold" id="cash">
            La caja
          </h2>
          <Card className="gap-4 px-4 py-4">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-2xl font-bold tabular-nums">{fmt.money(finances.paidMinor)}</p>
              <p className="text-sm text-muted-foreground tabular-nums">
                de {fmt.money(finances.expectedMinor)}
              </p>
            </div>
            <Progress
              aria-label="Recaudado"
              value={
                (Number(finances.paidMinor) / Math.max(Number(finances.expectedMinor), 1)) * 100
              }
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
                          rowLink,
                        )}
                        onClick={() => open("jugador", debtor.playerId)}
                        type="button"
                      >
                        <PlayerAvatar className="size-7 text-xs" name={debtor.displayName} />
                        <span className="min-w-0 flex-1 truncate">{debtor.displayName}</span>
                        <Badge variant="destructive">Debe {fmt.money(debtor.debtMinor)}</Badge>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <Badge variant="success">Todos pagaron</Badge>
            )}
          </Card>
        </section>
      ) : null}
    </div>
  );
}

function TeamCards({ detail }: { detail: MatchDetail }) {
  const { open } = useProto();
  return (
    <div className="grid grid-cols-2 gap-3">
      {detail.teams.map((team) => (
        <div
          className={cn(
            "flex min-w-0 flex-col gap-2 rounded-lg border p-3",
            team.slot === 1
              ? "border-team-blue/40 bg-team-blue/5"
              : "border-team-amber/40 bg-team-amber/5",
          )}
          key={team.id}
        >
          <span
            className={cn(
              "w-fit rounded-full px-2 py-0.5 text-xs font-semibold",
              team.slot === 1
                ? "bg-team-blue text-team-blue-ink"
                : "bg-team-amber text-team-amber-ink",
            )}
          >
            {team.displayName}
          </span>
          <ul className="-mx-1.5 flex flex-col">
            {detail.appearances
              .filter((appearance) => appearance.teamId === team.id)
              .map((appearance) => (
                <li key={appearance.playerId}>
                  <button
                    className={cn(
                      "flex min-h-10 w-full items-center rounded-md px-1.5 text-left text-sm",
                      rowLink,
                    )}
                    onClick={() => open("jugador", appearance.playerId)}
                    type="button"
                  >
                    <span className="truncate">{appearance.playerDisplayName}</span>
                  </button>
                </li>
              ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

// ── Resultados ───────────────────────────────────────────────────────────────

function ResultsTab({ dashboard }: { dashboard: Dashboard }) {
  const tz = dashboard.group.timeZone;
  const months = groupByMonth(dashboard.history, tz);
  return (
    <div className="flex flex-col gap-6">
      <h1 className="sr-only">Resultados</h1>
      {months.map((month) => (
        <section className="flex flex-col gap-2" key={month.label}>
          <h2 className="text-xs font-medium text-muted-foreground first-letter:uppercase">
            {month.label}
          </h2>
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

function Scorecard({ match, tz }: { match: Dashboard["history"][number]; tz: string }) {
  const { open } = useProto();
  const winner = winnerSlot(match);
  const cancelled = match.status === "cancelled";
  return (
    <button
      className={cn("flex w-full flex-col gap-2 rounded-lg border bg-card p-3 text-left", rowLink)}
      onClick={() => open("partido", match.matchId)}
      type="button"
    >
      <span className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
        {match.teams.map((team, index) => (
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
        ))}
        <span className="order-2 text-2xl font-black tabular-nums">
          {cancelled ? (
            <Badge variant="outline">Cancelado</Badge>
          ) : (
            <>
              {match.teams[0]?.goals}
              <span className="px-1 text-muted-foreground">–</span>
              {match.teams[1]?.goals}
            </>
          )}
        </span>
      </span>
      <span className="truncate text-center text-xs text-muted-foreground">
        {fmt.day(match.scheduledAt, tz)}
        {match.court ? ` · ${match.court.name}` : ""}
      </span>
    </button>
  );
}

// ── Tabla ────────────────────────────────────────────────────────────────────

const metrics = [
  { key: "contributions", label: "G+A" },
  { key: "goals", label: "Goles" },
  { key: "assists", label: "Asist." },
] as const;

function TableTab({ dashboard }: { dashboard: Dashboard }) {
  const { open, param, setParam } = useProto();
  const metric = metrics.find((item) => item.key === param("orden")) ?? metrics[0];
  const ranking = [...dashboard.ranking].sort(
    (a, b) => b[metric.key] - a[metric.key] || b.contributions - a.contributions,
  );
  const podium = ranking.slice(0, 3);
  const rest = ranking.slice(3);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-base font-semibold">La tabla</h1>
        <ToggleGroup
          aria-label="Métrica"
          onValueChange={(value) => {
            const next = value[0];
            if (next) setParam("orden", next === "contributions" ? null : String(next));
          }}
          value={[metric.key]}
          variant="outline"
        >
          {metrics.map((item) => (
            <ToggleGroupItem className="h-11 px-3" key={item.key} value={item.key}>
              {item.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      <ol className="grid grid-cols-3 items-end gap-2">
        {[podium[1], podium[0], podium[2]].map((row, slot) => {
          if (!row) return <li key={`empty-${slot}`} />;
          const place = ranking.indexOf(row) + 1;
          return (
            <li key={row.playerId}>
              <button
                className={cn(
                  "flex w-full flex-col items-center gap-2 rounded-lg border bg-card px-2 text-center",
                  place === 1 ? "pb-5 pt-4" : "pb-3 pt-3",
                  rowLink,
                )}
                onClick={() => open("jugador", row.playerId)}
                type="button"
              >
                <span className="text-xs font-semibold tabular-nums text-muted-foreground">
                  {place}º
                </span>
                <PlayerAvatar
                  className={cn(place === 1 ? "size-14 text-base" : "size-11 text-sm")}
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

      <Card className="py-1">
        <ol className="flex flex-col divide-y" start={4}>
          {rest.map((row, index) => (
            <li key={row.playerId}>
              <button
                className={cn(
                  "flex min-h-12 w-full items-center gap-3 px-4 py-1.5 text-left",
                  rowLink,
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
    </div>
  );
}

// ── Sheets ───────────────────────────────────────────────────────────────────

function subscribeWide(callback: () => void) {
  const media = window.matchMedia("(min-width: 768px)");
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}

function DetailSheet() {
  const { detail, close } = useProto();
  const wide = useSyncExternalStore(
    subscribeWide,
    () => window.matchMedia("(min-width: 768px)").matches,
    () => false,
  );
  return (
    <Sheet onOpenChange={(open) => (open ? undefined : close())} open={detail !== null}>
      <SheetContent className={cn(!wide && "max-h-[88dvh]")} side={wide ? "right" : "bottom"}>
        {detail?.kind === "partido" ? <MatchSheet matchId={detail.id} /> : null}
        {detail?.kind === "jugador" ? <PlayerSheet playerId={detail.id} /> : null}
      </SheetContent>
    </Sheet>
  );
}

function MatchSheet({ matchId }: { matchId: string }) {
  const { open, privateLink } = useProto();
  const query = useMatchDetail(matchId);
  const detail = query.data;
  if (!detail) {
    return (
      <>
        <SheetHeader>
          <SheetTitle>Partido</SheetTitle>
        </SheetHeader>
        <SheetBody>
          <LoadingRows rows={6} />
        </SheetBody>
      </>
    );
  }
  const tz = detail.group.timeZone;
  const played = detail.status === "closed";
  const winner = winnerSlot(detail);
  return (
    <>
      <SheetHeader>
        <SheetTitle className="first-letter:uppercase">
          {fmt.long(detail.scheduledAt, tz)}
        </SheetTitle>
        <SheetDescription>
          {fmt.time(detail.scheduledAt, tz)} hs{detail.court ? ` · ${detail.court.name}` : ""}
        </SheetDescription>
      </SheetHeader>
      <SheetBody className="flex flex-col gap-5">
        <div className="flex flex-col items-center gap-2">
          <div className="grid w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
            {detail.teams.map((team, index) => (
              <span
                className={cn(
                  "w-fit max-w-full truncate rounded-full px-2.5 py-1 text-xs font-semibold",
                  index === 0 ? "order-1 justify-self-start" : "order-3 justify-self-end",
                  team.slot === 1
                    ? "bg-team-blue text-team-blue-ink"
                    : "bg-team-amber text-team-amber-ink",
                )}
                key={team.id}
              >
                {team.displayName}
              </span>
            ))}
            <span className="order-2 text-5xl font-black tabular-nums">
              {played ? (
                <>
                  {detail.teams[0]?.goals}
                  <span className="px-1.5 text-muted-foreground">–</span>
                  {detail.teams[1]?.goals}
                </>
              ) : (
                <span className="text-2xl text-muted-foreground">vs</span>
              )}
            </span>
          </div>
          <Badge variant={detail.status === "cancelled" ? "destructive" : "secondary"}>
            {resultLabel(detail)}
          </Badge>
        </div>

        {played ? (
          <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
            {detail.teams.map((team) => (
              <p className={cn(team.slot === 2 && "text-right")} key={team.id}>
                {scorers(detail, team.id).join(", ") || "Sin goles atribuidos"}
              </p>
            ))}
          </div>
        ) : null}

        {detail.teams.map((team) => (
          <section className="flex flex-col gap-1" key={team.id}>
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <TeamDot slot={team.slot} />
              {team.displayName}
              {played && winner === team.slot ? <Badge variant="success">Ganó</Badge> : null}
            </h3>
            <ul className="-mx-2 flex flex-col">
              {detail.appearances
                .filter((appearance) => appearance.teamId === team.id)
                .map((appearance) => (
                  <li key={appearance.playerId}>
                    <button
                      className={cn(
                        "flex min-h-11 w-full items-center gap-2 rounded-md px-2 text-left text-sm",
                        rowLink,
                      )}
                      onClick={() => open("jugador", appearance.playerId)}
                      type="button"
                    >
                      <span className="min-w-0 flex-1 truncate">
                        {appearance.playerDisplayName}
                      </span>
                      <span className="shrink-0 text-xs tabular-nums">
                        {[
                          appearance.goals ? `${appearance.goals} G` : null,
                          appearance.assists ? `${appearance.assists} A` : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                      {appearance.ownGoals ? (
                        <span className="shrink-0 text-xs text-destructive">
                          {appearance.ownGoals} AG
                        </span>
                      ) : null}
                      {privateLink && appearance.debtMinor !== "0" ? (
                        <Badge variant="destructive">Debe</Badge>
                      ) : null}
                    </button>
                  </li>
                ))}
            </ul>
          </section>
        ))}
      </SheetBody>
    </>
  );
}

function PlayerSheet({ playerId }: { playerId: string }) {
  const { open } = useProto();
  const query = usePlayerStats(playerId);
  const data = query.data;
  if (!data) {
    return (
      <>
        <SheetHeader>
          <SheetTitle>Jugador</SheetTitle>
        </SheetHeader>
        <SheetBody>
          <LoadingRows rows={6} />
        </SheetBody>
      </>
    );
  }
  const aggregate = data.aggregate;
  return (
    <>
      <SheetHeader className="flex-row items-center gap-3">
        <PlayerAvatar className="size-11 text-sm" name={data.player.displayName} />
        <div className="flex min-w-0 flex-col gap-0.5">
          <SheetTitle className="truncate">{data.player.displayName}</SheetTitle>
          <SheetDescription>
            {aggregate ? plural(aggregate.played, "partido", "partidos") : "Sin partidos cerrados"}
            {data.player.archived ? " · inactivo" : ""}
          </SheetDescription>
        </div>
      </SheetHeader>
      <SheetBody className="flex flex-col gap-5">
        {aggregate ? (
          <>
            <dl className="grid grid-cols-4 gap-2">
              {[
                ["G+A", aggregate.contributions],
                ["Goles", aggregate.goals],
                ["Asist.", aggregate.assists],
                ["Vict.", `${Math.round(aggregate.winPercentage)}%`],
              ].map(([label, value]) => (
                <div
                  className="flex flex-col items-center gap-0.5 rounded-lg bg-muted/50 py-3"
                  key={label}
                >
                  <dd className="text-xl font-bold tabular-nums">{value}</dd>
                  <dt className="text-xs text-muted-foreground">{label}</dt>
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
        <section className="flex flex-col gap-1">
          <h3 className="text-sm font-semibold">Partidos</h3>
          <ul className="-mx-2 flex flex-col">
            {data.matches.map((match) => {
              const own = match.teams.find((team) => team.id === match.teamId);
              const rival = match.teams.find((team) => team.id !== match.teamId);
              return (
                <li key={match.matchId}>
                  <button
                    className={cn(
                      "flex min-h-11 w-full items-center gap-3 rounded-md px-2 text-left text-sm",
                      rowLink,
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
                        · {fmt.day(match.scheduledAt, data.group.timeZone)}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs font-semibold tabular-nums">
                      {[
                        match.goals ? `${match.goals} G` : null,
                        match.assists ? `${match.assists} A` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      </SheetBody>
    </>
  );
}

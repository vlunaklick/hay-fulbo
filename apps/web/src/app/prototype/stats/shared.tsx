"use client";

// PROTOTYPE ONLY — pieces every stats variant shares, so variants differ on layout, not plumbing.
import type { StatsAggregate, StatsDashboard, StatsSociety } from "@hay-fulbo/db/stats/types";
import { Badge } from "@hay-fulbo/ui/components/badge";
import { Button } from "@hay-fulbo/ui/components/button";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@hay-fulbo/ui/components/sheet";
import { Tabs, TabsList, TabsTrigger } from "@hay-fulbo/ui/components/tabs";
import { cn } from "@hay-fulbo/ui/lib/utils";
import {
  CalendarDaysIcon,
  CheckIcon,
  HouseIcon,
  SlidersHorizontalIcon,
  TrophyIcon,
  UsersRoundIcon,
} from "lucide-react";
import type * as React from "react";
import { createContext, useContext, useState, useSyncExternalStore } from "react";

import { LogoMark } from "@/components/logo-mark";

import type { ProtoFilters } from "./prototype-data";

export type Screen = "estadisticas" | "sociedades";

export type VariantProps = {
  dashboard: StatsDashboard;
  filters: ProtoFilters;
  setFilter: (key: keyof ProtoFilters, value: string) => void;
  resetFilters: () => void;
  screen: Screen;
  setScreen: (screen: Screen) => void;
};

/* ───────────────────────── formatting ───────────────────────── */

export function formatRate(value: number) {
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 }).format(value);
}

export function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}

export function signed(value: number) {
  return `${value > 0 ? "+" : ""}${value}`;
}

export function formatDate(value: Date | string, timeZone: string) {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(value));
}

export function firstName(name: string) {
  return name.split(/\s+/)[0] ?? name;
}

/** Win rate is noisy with few games; podiums and highlights need a floor. */
export function minPlayed(dashboard: StatsDashboard) {
  return Math.max(2, Math.ceil(dashboard.summary.matchesPlayed * 0.3));
}

export function periodLabel(period: string) {
  return period === "30d"
    ? "últimos 30 días"
    : period === "year"
      ? "este año"
      : "todos los tiempos";
}

/* ───────────────────────── viewport ───────────────────────── */

function subscribeDesktop(callback: () => void) {
  const query = window.matchMedia("(min-width: 768px)");
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

export function useIsDesktop() {
  return useSyncExternalStore(
    subscribeDesktop,
    () => window.matchMedia("(min-width: 768px)").matches,
    () => false,
  );
}

/* ───────────────────────── fake app shell ───────────────────────── */

const NAV = [
  { label: "Inicio", icon: HouseIcon },
  { label: "Partidos", icon: CalendarDaysIcon },
  { label: "Jugadores", icon: UsersRoundIcon },
  { label: "Estadísticas", icon: TrophyIcon, active: true },
] as const;

/** Mirrors AppShell's chrome without its auth and group queries. */
export function ProtoShell({
  groupName,
  children,
}: {
  groupName: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-svh bg-background text-foreground md:grid md:grid-cols-[15rem_1fr]">
      <aside className="sticky top-0 hidden h-svh flex-col gap-6 border-r bg-sidebar p-3 md:flex">
        <div className="flex items-center gap-2 px-2 pt-1">
          <LogoMark className="size-8 shrink-0" />
          <span className="truncate font-bold tracking-tight">Hay Fulbo</span>
        </div>
        <div className="truncate rounded-md border px-3 py-2.5 text-sm font-semibold">
          {groupName}
        </div>
        <nav aria-label="Principal" className="flex flex-col gap-1">
          {NAV.map((item) => (
            <span
              key={item.label}
              aria-current={"active" in item ? "page" : undefined}
              className={cn(
                "flex h-10 items-center gap-2 rounded-md px-3 text-sm",
                "active" in item
                  ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
                  : "text-muted-foreground",
              )}
            >
              <item.icon aria-hidden="true" className="size-4" />
              {item.label}
            </span>
          ))}
        </nav>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-10 border-b bg-background md:hidden">
          <div className="flex h-14 items-center gap-2 px-4">
            <LogoMark className="size-7 shrink-0" />
            <span className="truncate text-sm font-semibold">{groupName}</span>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl px-4 py-5 pb-36 md:px-8 md:py-8 md:pb-24">
          {children}
        </main>
      </div>
      <nav
        aria-label="Principal"
        className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t bg-sidebar px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 md:hidden"
      >
        {NAV.map((item) => (
          <span
            key={item.label}
            aria-current={"active" in item ? "page" : undefined}
            className={cn(
              "relative flex h-14 flex-col items-center justify-center gap-1",
              "active" in item ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {"active" in item ? (
              <span
                aria-hidden="true"
                className="absolute top-0 h-0.5 w-6 rounded-full bg-primary"
              />
            ) : null}
            <item.icon aria-hidden="true" className="size-4" />
            <span className="text-xs font-medium">{item.label}</span>
          </span>
        ))}
      </nav>
    </div>
  );
}

/* ───────────────────────── filters ───────────────────────── */

const PERIODS = [
  { value: "all", label: "Siempre" },
  { value: "year", label: "Este año" },
  { value: "30d", label: "30 días" },
];

const RESULTS = [
  { value: "all", label: "Cualquier resultado" },
  { value: "decided", label: "Con ganador" },
  { value: "draws", label: "Empates" },
];

export function PeriodTabs({
  className,
  filters,
  setFilter,
}: Pick<VariantProps, "filters" | "setFilter"> & { className?: string }) {
  return (
    <Tabs value={filters.period} onValueChange={(value) => setFilter("period", String(value))}>
      <TabsList aria-label="Período" className={className}>
        {PERIODS.map((period) => (
          <TabsTrigger key={period.value} value={period.value} className="h-9 px-3">
            {period.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

/** Court and result live behind one button: they're changed rarely and cost a row on mobile. */
export function MoreFilters({
  dashboard,
  filters,
  resetFilters,
  setFilter,
  label = "Filtros",
  iconOnly = false,
}: Pick<VariantProps, "dashboard" | "filters" | "setFilter" | "resetFilters"> & {
  label?: string;
  iconOnly?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const desktop = useIsDesktop();
  const count = (filters.court !== "all" ? 1 : 0) + (filters.result !== "all" ? 1 : 0);
  const courts = [
    { value: "all", label: "Todas las canchas" },
    ...dashboard.courts.map((court) => ({ value: court.id, label: court.name })),
  ];
  return (
    <>
      <Button
        aria-label={iconOnly ? `${label}${count ? ` (${count} activos)` : ""}` : undefined}
        onClick={() => setOpen(true)}
        size={iconOnly ? "icon" : "default"}
        variant="outline"
      >
        <SlidersHorizontalIcon data-icon="inline-start" aria-hidden="true" />
        {iconOnly ? null : label}
        {count ? (
          <Badge className="tabular-nums" variant="secondary">
            {count}
          </Badge>
        ) : null}
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side={desktop ? "right" : "bottom"} className="max-h-[85dvh] sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Filtrar estadísticas</SheetTitle>
            <SheetDescription>Solo cuentan partidos cerrados.</SheetDescription>
          </SheetHeader>
          <SheetBody className="flex flex-col gap-6">
            <ChoiceList
              label="Cancha"
              onChange={(value) => setFilter("court", value)}
              options={courts}
              value={filters.court}
            />
            <ChoiceList
              label="Resultado"
              onChange={(value) => setFilter("result", value)}
              options={RESULTS}
              value={filters.result}
            />
            <div className="flex gap-2">
              <Button className="flex-1" onClick={() => setOpen(false)}>
                Ver resultados
              </Button>
              {count ? (
                <Button onClick={resetFilters} variant="ghost">
                  Limpiar
                </Button>
              ) : null}
            </div>
          </SheetBody>
        </SheetContent>
      </Sheet>
    </>
  );
}

function ChoiceList({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  value: string;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-xs font-medium text-muted-foreground">{label}</legend>
      <div className="flex flex-col divide-y rounded-lg border">
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <button
              key={option.value}
              aria-pressed={selected}
              className="flex min-h-11 items-center justify-between gap-3 px-3 py-2 text-left text-sm transition-colors duration-150 ease-out first:rounded-t-lg last:rounded-b-lg hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              onClick={() => onChange(option.value)}
              type="button"
            >
              <span className={cn("min-w-0", selected && "font-semibold")}>{option.label}</span>
              {selected ? (
                <CheckIcon aria-hidden="true" className="size-4 shrink-0 text-primary-text" />
              ) : null}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

/* ───────────────────────── player peek ───────────────────────── */

type PeekContextValue = (playerId: string) => void;
const PeekContext = createContext<PeekContextValue>(() => {});

export function usePlayerPeek() {
  return useContext(PeekContext);
}

/** Stand-in for the player detail route: a sheet with the row's numbers and best partner. */
export function PlayerPeekProvider({
  children,
  dashboard,
}: {
  children: React.ReactNode;
  dashboard: StatsDashboard;
}) {
  const [playerId, setPlayerId] = useState<string | null>(null);
  const desktop = useIsDesktop();
  const index = dashboard.ranking.findIndex((row) => row.playerId === playerId);
  const player = index >= 0 ? dashboard.ranking[index] : null;
  const partner = player ? bestPartner(dashboard.societies, player.playerId) : null;

  return (
    <PeekContext value={setPlayerId}>
      {children}
      <Sheet open={player !== null} onOpenChange={(open) => (open ? null : setPlayerId(null))}>
        <SheetContent side={desktop ? "right" : "bottom"} className="max-h-[85dvh] sm:max-w-md">
          {player ? (
            <>
              <SheetHeader>
                <SheetTitle className="flex flex-wrap items-center gap-2 text-balance">
                  {player.displayName}
                  {player.archived ? <Badge variant="outline">Inactivo</Badge> : null}
                </SheetTitle>
                <SheetDescription className="tabular-nums">
                  {index + 1}.º en G+A · {player.played} partidos jugados
                </SheetDescription>
              </SheetHeader>
              <SheetBody className="flex flex-col gap-6">
                <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-lg border bg-border">
                  <PeekMetric label="Goles" value={player.goals} />
                  <PeekMetric label="Asistencias" value={player.assists} />
                  <PeekMetric label="G+A" value={player.contributions} />
                  <PeekMetric
                    label="Por partido"
                    value={formatRate(player.contributionsPerMatch)}
                  />
                  <PeekMetric
                    label="G-E-P"
                    value={`${player.wins}-${player.draws}-${player.losses}`}
                  />
                  <PeekMetric label="Efectividad" value={formatPercent(player.winPercentage)} />
                  <PeekMetric label="Dif. gol" value={signed(player.goalDifference)} />
                  <PeekMetric
                    label="Nota"
                    value={player.ratingAverage !== null ? formatRate(player.ratingAverage) : "—"}
                  />
                  <PeekMetric label="Ausencias" value={player.absences || "—"} />
                </dl>
                <div className="flex flex-col gap-1">
                  <h3 className="text-xs font-medium text-muted-foreground">Mejor sociedad</h3>
                  {partner ? (
                    <p className="text-sm">
                      <span className="font-semibold">{partner.name}</span>
                      <span className="text-muted-foreground tabular-nums">
                        {" "}
                        · {partner.society.points} pts en {partner.society.played} PJ juntos ·{" "}
                        {formatPercent(partner.society.winPercentage)}
                      </span>
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Todavía no repitió equipo con nadie.
                    </p>
                  )}
                </div>
              </SheetBody>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </PeekContext>
  );
}

function PeekMetric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex flex-col gap-1 bg-popover px-3 py-2.5">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-lg font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

export function bestPartner(societies: StatsSociety[], playerId: string) {
  const society = societies.find((row) => row.playerIds.includes(playerId));
  if (!society) return null;
  const other = society.playerIds[0] === playerId ? 1 : 0;
  return { society, name: society.playerNames[other] };
}

/* ───────────────────────── small shared bits ───────────────────────── */

export function ArchivedBadge({ player }: { player: Pick<StatsAggregate, "archived"> }) {
  return player.archived ? <Badge variant="outline">Inactivo</Badge> : null;
}

export function EmptyRow({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <section className="flex items-start gap-3 rounded-lg border border-dashed p-4 sm:p-5">
      <span aria-hidden="true" className="mt-0.5 shrink-0 text-muted-foreground [&_svg]:size-5">
        {icon}
      </span>
      <div className="min-w-0">
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </section>
  );
}

export function MatchRows({
  dashboard,
  limit,
  dense = false,
}: {
  dashboard: StatsDashboard;
  limit?: number;
  dense?: boolean;
}) {
  const matches = limit ? dashboard.history.slice(0, limit) : dashboard.history;
  return (
    <ul className="flex flex-col divide-y">
      {matches.map((match) => {
        const [left, right] = match.teams;
        const cancelled = match.status === "cancelled";
        return (
          <li
            key={match.matchId}
            className={cn(
              "flex items-center justify-between gap-3 px-4",
              dense ? "min-h-11 py-1.5" : "min-h-14 py-2.5",
            )}
          >
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">
                {formatDate(match.scheduledAt, dashboard.group.timeZone)}
                {match.figure && !cancelled ? (
                  <span className="font-normal text-muted-foreground">
                    {" "}
                    · figura {firstName(match.figure.displayName)}
                  </span>
                ) : null}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {match.court?.name ?? "Sin cancha"}
              </span>
            </span>
            {cancelled ? (
              <Badge variant="outline">Cancelado</Badge>
            ) : (
              <span className="shrink-0 text-sm tabular-nums">
                <span className="text-muted-foreground">{left?.displayName}</span>{" "}
                <strong className="font-semibold">
                  {left?.goals}–{right?.goals}
                </strong>{" "}
                <span className="text-muted-foreground">{right?.displayName}</span>
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

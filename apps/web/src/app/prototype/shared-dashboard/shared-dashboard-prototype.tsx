"use client";

import {
  AlertCircleIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  CalendarDaysIcon,
  ChartNoAxesCombinedIcon,
  ChevronRightIcon,
  CircleDollarSignIcon,
  Clock3Icon,
  EyeOffIcon,
  GoalIcon,
  HandCoinsIcon,
  LockKeyholeIcon,
  MapPinIcon,
  MedalIcon,
  NavigationIcon,
  ReceiptTextIcon,
  ShieldCheckIcon,
  SparklesIcon,
  TrophyIcon,
  UsersIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@hay-fulbo/ui/components/alert";
import { Avatar, AvatarFallback } from "@hay-fulbo/ui/components/avatar";
import { Badge } from "@hay-fulbo/ui/components/badge";
import { Button } from "@hay-fulbo/ui/components/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@hay-fulbo/ui/components/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@hay-fulbo/ui/components/empty";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hay-fulbo/ui/components/select";
import { Separator } from "@hay-fulbo/ui/components/separator";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@hay-fulbo/ui/components/table";
import { ToggleGroup, ToggleGroupItem } from "@hay-fulbo/ui/components/toggle-group";
import { usePrototypeShortcuts } from "@/hooks/use-prototype-shortcuts";

import {
  debts,
  formatCurrency,
  getPrototypeData,
  historyOptions,
  type HistoryFilter,
  type MatchResult,
  type PeriodFilter,
  type PlayerStat,
  type PrototypeFilters,
  upcomingMatch,
  type VenueFilter,
  venueOptions,
} from "./prototype-data";

// Three variants of the public group dashboard, switchable via ?variant= on
// the throwaway /prototype/shared-dashboard route.

const variants = [
  { key: "a", name: "La tapa" },
  { key: "b", name: "Mesa técnica" },
  { key: "c", name: "El vestuario" },
] as const;

type VariantKey = (typeof variants)[number]["key"];

const periodLabels: Record<PeriodFilter, string> = {
  "30d": "30 días",
  year: "Este año",
  all: "Histórico",
};

function isVariant(value: string | undefined): value is VariantKey {
  return variants.some((variant) => variant.key === value);
}

function PrivacyMark({ compact = false }: { compact?: boolean }) {
  return (
    <Badge variant="outline">
      <EyeOffIcon data-icon="inline-start" />
      {compact ? "Privado" : "Enlace privado · solo lectura · no indexado"}
    </Badge>
  );
}

function FilterControls({
  filters,
  onChange,
  compact = false,
}: {
  filters: PrototypeFilters;
  onChange: (next: PrototypeFilters) => void;
  compact?: boolean;
}) {
  return (
    <div
      className={
        compact
          ? "flex flex-col gap-3 lg:flex-row lg:items-center"
          : "flex flex-col gap-3 md:flex-row md:items-center"
      }
      aria-label="Filtros de estadísticas"
    >
      <ToggleGroup
        aria-label="Período"
        value={[filters.period]}
        onValueChange={(values) => {
          const period = values[0] as PeriodFilter | undefined;
          if (period) onChange({ ...filters, period });
        }}
        variant="outline"
        spacing={0}
        className="max-w-full overflow-x-auto"
      >
        <ToggleGroupItem value="30d">30 días</ToggleGroupItem>
        <ToggleGroupItem value="year">Este año</ToggleGroupItem>
        <ToggleGroupItem value="all">Histórico</ToggleGroupItem>
      </ToggleGroup>

      <Select
        items={venueOptions}
        value={filters.venue}
        onValueChange={(value) => onChange({ ...filters, venue: value as VenueFilter })}
      >
        <SelectTrigger aria-label="Filtrar por cancha" className="w-full md:w-44">
          <MapPinIcon />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {venueOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>

      <Select
        items={historyOptions}
        value={filters.history}
        onValueChange={(value) => onChange({ ...filters, history: value as HistoryFilter })}
      >
        <SelectTrigger aria-label="Filtrar historial" className="w-full md:w-48">
          <Clock3Icon />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {historyOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}

function EmptyResults({ subject }: { subject: "ranking" | "historial" }) {
  return (
    <Empty data-testid={`empty-${subject}`} className="min-h-48">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          {subject === "ranking" ? <TrophyIcon /> : <CalendarDaysIcon />}
        </EmptyMedia>
        <EmptyTitle>
          {subject === "ranking" ? "Todavía no hay tabla" : "No hay partidos para mostrar"}
        </EmptyTitle>
        <EmptyDescription>
          Probá ampliando el período o elegí otra cancha. Los borradores nunca aparecen en este
          enlace.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

function PlayerAvatar({ player }: { player: Pick<PlayerStat, "name" | "initials"> }) {
  return (
    <Avatar size="sm" aria-label={player.name}>
      <AvatarFallback>{player.initials}</AvatarFallback>
    </Avatar>
  );
}

function EditorialLeaderboard({ players }: { players: PlayerStat[] }) {
  if (players.length === 0) return <EmptyResults subject="ranking" />;

  return (
    <Table>
      <TableCaption>G+A por partido cerrado · ordenado por contribuciones</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>#</TableHead>
          <TableHead>Jugador</TableHead>
          <TableHead className="text-right">PJ</TableHead>
          <TableHead className="text-right">G</TableHead>
          <TableHead className="text-right">A</TableHead>
          <TableHead className="text-right">G+A</TableHead>
          <TableHead className="text-right">Prom.</TableHead>
          <TableHead className="text-right">G-E-P</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {players.map((player, index) => (
          <TableRow key={player.id}>
            <TableCell>
              <span className="font-serif text-lg">{String(index + 1).padStart(2, "0")}</span>
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <PlayerAvatar player={player} />
                <span className="font-medium">{player.name}</span>
              </div>
            </TableCell>
            <TableCell className="text-right">{player.played}</TableCell>
            <TableCell className="text-right">{player.goals}</TableCell>
            <TableCell className="text-right">{player.assists}</TableCell>
            <TableCell className="text-right font-medium">{player.contributions}</TableCell>
            <TableCell className="text-right">{player.average}</TableCell>
            <TableCell className="text-right">
              {player.wins}-{player.draws}-{player.losses}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function EditorialHistory({ matches }: { matches: MatchResult[] }) {
  if (matches.length === 0) return <EmptyResults subject="historial" />;

  return (
    <div className="grid gap-px bg-border md:grid-cols-3">
      {matches.slice(0, 3).map((match) => (
        <article key={match.id} className="flex flex-col gap-5 bg-card p-5">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs text-muted-foreground">{match.shortDate}</span>
            <Badge variant="outline">{match.venueName}</Badge>
          </div>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <span className="font-serif text-xl">{match.teamA}</span>
            <strong className="font-serif text-3xl">
              {match.scoreA}–{match.scoreB}
            </strong>
            <span className="text-right font-serif text-xl">{match.teamB}</span>
          </div>
        </article>
      ))}
    </div>
  );
}

function VariantA({
  filters,
  onFiltersChange,
  players,
  history,
}: {
  filters: PrototypeFilters;
  onFiltersChange: (next: PrototypeFilters) => void;
  players: PlayerStat[];
  history: MatchResult[];
}) {
  return (
    <main
      className="hf-variant-a min-h-full overflow-auto bg-background pb-32 text-foreground"
      data-testid="variant-a"
    >
      <header className="border-b">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 md:px-8">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center bg-primary text-primary-foreground">
              <GoalIcon aria-hidden="true" />
            </div>
            <div>
              <p className="font-serif text-2xl leading-none">Hay Fulbo</p>
              <p className="mt-1 text-xs text-muted-foreground">Los Pibes del Viernes</p>
            </div>
          </div>
          <PrivacyMark />
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 md:px-8 md:py-12">
        <section className="grid gap-px bg-border lg:grid-cols-[1.65fr_0.85fr]">
          <Card className="min-h-[390px]">
            <CardHeader>
              <Badge variant="secondary">Próxima fecha</Badge>
              <CardAction>
                <span className="font-serif text-6xl leading-none text-muted-foreground/40">
                  31
                </span>
              </CardAction>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col justify-between gap-10">
              <div>
                <p className="font-serif text-5xl leading-[0.92] tracking-tight md:text-7xl">
                  Viernes de
                  <br />
                  pelota.
                </p>
                <p className="mt-5 max-w-lg text-sm text-muted-foreground">
                  {upcomingMatch.date} · {upcomingMatch.time} · {upcomingMatch.expectedPlayers}{" "}
                  confirmados
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex gap-3">
                  <MapPinIcon className="mt-0.5 size-4 shrink-0" />
                  <div>
                    <p className="font-medium">{upcomingMatch.venue}</p>
                    <p className="text-xs text-muted-foreground">{upcomingMatch.address}</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  nativeButton={false}
                  render={<a href={upcomingMatch.mapsUrl} target="_blank" rel="noreferrer" />}
                >
                  <NavigationIcon data-icon="inline-start" />
                  Abrir en Maps
                </Button>
              </div>
            </CardContent>
            <CardFooter className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-xs text-muted-foreground">Capitanes</p>
                <p className="mt-1 font-medium">{upcomingMatch.captains.join(" · ")}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Por jugador</p>
                <p className="mt-1 font-serif text-2xl">
                  {formatCurrency(upcomingMatch.price / upcomingMatch.expectedPlayers)}
                </p>
              </div>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>La cuenta de la fecha</CardTitle>
              <CardDescription>La cancha queda saldada cuando paguen 10.</CardDescription>
              <CardAction>
                <HandCoinsIcon className="size-5" />
              </CardAction>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-6">
              <div>
                <p className="font-serif text-5xl">{formatCurrency(upcomingMatch.dueAmount)}</p>
                <p className="mt-1 text-xs text-muted-foreground">faltan cobrar</p>
              </div>
              <div className="flex h-2 overflow-hidden bg-muted" aria-label="7 de 10 pagaron">
                <div className="w-[70%] bg-primary" />
              </div>
              <div className="flex flex-col gap-3">
                {debts.map((debt) => (
                  <div key={debt.id} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Avatar size="sm">
                        <AvatarFallback>{debt.initials}</AvatarFallback>
                      </Avatar>
                      <span>{debt.name}</span>
                    </div>
                    <span className="font-mono text-xs">{formatCurrency(debt.amount)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter>
              <p className="text-xs text-muted-foreground">
                {upcomingMatch.paidPlayers} pagaron · {debts.length} pendientes
              </p>
            </CardFooter>
          </Card>
        </section>

        <section className="flex flex-col gap-5" aria-labelledby="editorial-results">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-muted-foreground">
                Archivo de la banda
              </p>
              <h2 id="editorial-results" className="mt-2 font-serif text-4xl">
                Últimos resultados
              </h2>
            </div>
            <FilterControls filters={filters} onChange={onFiltersChange} />
          </div>
          <EditorialHistory matches={history} />
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.75fr_1.5fr]">
          <div className="flex flex-col justify-between bg-primary p-6 text-primary-foreground">
            <div>
              <MedalIcon className="size-8" />
              <p className="mt-10 font-serif text-4xl">La tabla no miente.</p>
            </div>
            <p className="mt-12 max-w-xs text-xs text-primary-foreground/70">
              Solo cuentan partidos cerrados por el organizador. Los filtros se aplican al ranking y
              al historial.
            </p>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Ranking de contribuciones</CardTitle>
              <CardDescription>
                {periodLabels[filters.period]} · goles, asistencias y rendimiento
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EditorialLeaderboard players={players} />
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}

function TechnicalPlayerRow({ player, index }: { player: PlayerStat; index: number }) {
  const maxContribution = 17;
  const width = Math.max(12, Math.round((player.contributions / maxContribution) * 100));

  return (
    <div className="grid grid-cols-[2rem_minmax(6rem,1fr)_3rem_3rem] items-center gap-2 py-2">
      <span className="font-mono text-xs text-muted-foreground">
        {String(index + 1).padStart(2, "0")}
      </span>
      <div className="min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate font-medium">{player.name}</span>
          <span className="font-mono text-xs">{player.contributions}</span>
        </div>
        <div className="mt-1 h-1 bg-muted">
          <div className="h-full bg-primary" style={{ width: `${width}%` }} />
        </div>
      </div>
      <span className="text-right font-mono text-xs">{player.goals}G</span>
      <span className="text-right font-mono text-xs">{player.assists}A</span>
    </div>
  );
}

function VariantB({
  filters,
  onFiltersChange,
  players,
  history,
  matchCount,
}: {
  filters: PrototypeFilters;
  onFiltersChange: (next: PrototypeFilters) => void;
  players: PlayerStat[];
  history: MatchResult[];
  matchCount: number;
}) {
  const leader = players[0];

  return (
    <main
      className="hf-variant-b min-h-full overflow-auto bg-background pb-32 text-foreground"
      data-testid="variant-b"
    >
      <div className="mx-auto min-h-full max-w-[1500px] lg:grid lg:grid-cols-[250px_1fr]">
        <aside className="hidden border-r lg:flex lg:flex-col lg:justify-between lg:p-6">
          <div className="flex flex-col gap-10">
            <div>
              <p className="font-mono text-xs text-muted-foreground">HF / GRUPO 01</p>
              <p className="mt-2 text-xl font-semibold uppercase tracking-tight">
                Los Pibes
                <br />
                del Viernes
              </p>
            </div>
            <nav className="flex flex-col gap-1 text-xs" aria-label="Secciones del prototipo">
              {["Resumen", "Partidos", "Rendimiento", "Caja"].map((item, index) => (
                <div key={item} className="flex items-center justify-between border-b py-3">
                  <span className={index === 0 ? "font-semibold" : "text-muted-foreground"}>
                    {item}
                  </span>
                  <span className="font-mono text-muted-foreground">0{index + 1}</span>
                </div>
              ))}
            </nav>
          </div>
          <PrivacyMark compact />
        </aside>

        <div>
          <header className="flex flex-col gap-5 border-b px-4 py-5 md:px-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.24em] text-muted-foreground">
                  Centro de control público
                </p>
                <h1 className="mt-2 text-3xl font-semibold uppercase tracking-[-0.04em] md:text-5xl">
                  Estado del grupo
                </h1>
              </div>
              <div className="lg:hidden">
                <PrivacyMark compact />
              </div>
            </div>
            <FilterControls filters={filters} onChange={onFiltersChange} compact />
          </header>

          <div className="grid grid-cols-2 border-b md:grid-cols-4">
            {[
              { label: "Partidos cerrados", value: matchCount, icon: CalendarDaysIcon },
              {
                label: "Líder G+A",
                value: leader ? `${leader.name} · ${leader.contributions}` : "—",
                icon: TrophyIcon,
              },
              {
                label: "Caja pendiente",
                value: formatCurrency(upcomingMatch.dueAmount),
                icon: CircleDollarSignIcon,
              },
              {
                label: "Pagaron",
                value: `${upcomingMatch.paidPlayers}/${upcomingMatch.expectedPlayers}`,
                icon: ShieldCheckIcon,
              },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="border-r p-4 last:border-r-0 md:p-6">
                <Icon className="size-4 text-muted-foreground" />
                <p className="mt-5 font-mono text-xl font-semibold md:text-2xl">{value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-px bg-border xl:grid-cols-[1.25fr_0.75fr]">
            <section className="bg-card p-4 md:p-8" aria-labelledby="technical-upcoming">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-mono text-xs text-muted-foreground">PRÓXIMO / 31 JUL</p>
                  <h2 id="technical-upcoming" className="mt-2 text-2xl font-semibold uppercase">
                    {upcomingMatch.venue} · {upcomingMatch.time}
                  </h2>
                </div>
                <Badge>{upcomingMatch.expectedPlayers} citados</Badge>
              </div>

              <div className="relative mt-6 min-h-[330px] overflow-hidden border bg-muted/40 p-5 md:p-8">
                <div className="absolute inset-y-0 left-1/2 w-px bg-border" />
                <div className="absolute left-1/2 top-1/2 size-24 -translate-x-1/2 -translate-y-1/2 rounded-full border" />
                <div className="relative grid min-h-[270px] grid-cols-2 gap-8">
                  <div className="flex flex-col justify-between">
                    <div>
                      <p className="font-mono text-xs text-muted-foreground">CAPITÁN A</p>
                      <p className="mt-1 text-xl font-semibold">{upcomingMatch.captains[0]}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Plantel</p>
                      <p className="mt-1 font-mono">5 lugares</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end justify-between text-right">
                    <div>
                      <p className="font-mono text-xs text-muted-foreground">CAPITÁN B</p>
                      <p className="mt-1 text-xl font-semibold">{upcomingMatch.captains[1]}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Plantel</p>
                      <p className="mt-1 font-mono">5 lugares</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="border p-3">
                  <p className="text-xs text-muted-foreground">Dirección</p>
                  <p className="mt-1 text-xs font-medium">{upcomingMatch.address}</p>
                </div>
                <div className="border p-3">
                  <p className="text-xs text-muted-foreground">Costo total</p>
                  <p className="mt-1 font-mono text-sm">{formatCurrency(upcomingMatch.price)}</p>
                </div>
                <Button
                  className="h-full min-h-14"
                  nativeButton={false}
                  render={<a href={upcomingMatch.mapsUrl} target="_blank" rel="noreferrer" />}
                >
                  <NavigationIcon data-icon="inline-start" />
                  Navegar
                </Button>
              </div>
            </section>

            <section
              className="flex flex-col bg-card p-4 md:p-8"
              aria-labelledby="technical-ranking"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-mono text-xs text-muted-foreground">RANKING / G+A</p>
                  <h2 id="technical-ranking" className="mt-2 text-xl font-semibold uppercase">
                    Rendimiento
                  </h2>
                </div>
                <ChartNoAxesCombinedIcon className="size-5" />
              </div>
              <div className="mt-6 flex flex-1 flex-col">
                {players.length > 0 ? (
                  players
                    .slice(0, 6)
                    .map((player, index) => (
                      <TechnicalPlayerRow key={player.id} player={player} index={index} />
                    ))
                ) : (
                  <EmptyResults subject="ranking" />
                )}
              </div>
              {players.length > 0 ? (
                <div className="mt-5 grid grid-cols-4 gap-px bg-border text-center">
                  {[
                    ["PJ", "Partidos"],
                    ["G", "Goles"],
                    ["A", "Asist."],
                    ["G+A", "Total"],
                  ].map(([key, label]) => (
                    <div key={key} className="bg-muted p-2">
                      <p className="font-mono text-xs">{key}</p>
                      <p className="mt-1 text-[10px] text-muted-foreground">{label}</p>
                    </div>
                  ))}
                </div>
              ) : null}
            </section>
          </div>

          <section className="border-t" aria-labelledby="technical-history">
            <div className="flex items-center justify-between px-4 py-4 md:px-8">
              <h2 id="technical-history" className="font-mono text-xs uppercase tracking-[0.2em]">
                Historial filtrado
              </h2>
              <span className="font-mono text-xs text-muted-foreground">
                {history.length} registros
              </span>
            </div>
            {history.length > 0 ? (
              <div className="grid gap-px bg-border md:grid-cols-3">
                {history.slice(0, 3).map((match) => (
                  <article key={match.id} className="bg-card p-4">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="font-mono">{match.shortDate}</span>
                      <span>{match.venueName}</span>
                    </div>
                    <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                      <span>{match.teamA}</span>
                      <strong className="font-mono text-xl">
                        {match.scoreA}:{match.scoreB}
                      </strong>
                      <span className="text-right">{match.teamB}</span>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="bg-card px-4 md:px-8">
                <EmptyResults subject="historial" />
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

function FeedMatch({ match }: { match: MatchResult }) {
  const draw = match.scoreA === match.scoreB;

  return (
    <article className="grid grid-cols-[2.5rem_1fr] gap-3">
      <div className="flex flex-col items-center">
        <div className="flex size-9 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
          <TrophyIcon className="size-4" />
        </div>
        <div className="mt-2 w-px flex-1 bg-border" />
      </div>
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>{draw ? "Partido cerrado en empate" : "Resultado confirmado"}</CardTitle>
          <CardDescription>
            {match.shortDate} · {match.venueName}
          </CardDescription>
          <CardAction>
            <Badge variant={draw ? "secondary" : "outline"}>
              {match.scoreA} – {match.scoreB}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-3">
            <span className="font-serif text-lg">{match.teamA}</span>
            <span className="text-xs text-muted-foreground">vs.</span>
            <span className="text-right font-serif text-lg">{match.teamB}</span>
          </div>
        </CardContent>
      </Card>
    </article>
  );
}

function VariantC({
  filters,
  onFiltersChange,
  players,
  history,
}: {
  filters: PrototypeFilters;
  onFiltersChange: (next: PrototypeFilters) => void;
  players: PlayerStat[];
  history: MatchResult[];
}) {
  return (
    <main
      className="hf-variant-c min-h-full overflow-auto bg-background pb-32 text-foreground"
      data-testid="variant-c"
    >
      <div className="mx-auto max-w-3xl px-4 py-6 md:px-8 md:py-10">
        <header className="flex flex-col gap-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <SparklesIcon />
              </div>
              <div>
                <p className="font-serif text-2xl leading-none">El vestuario</p>
                <p className="mt-1 text-xs text-muted-foreground">Los Pibes del Viernes</p>
              </div>
            </div>
            <PrivacyMark compact />
          </div>
          <div>
            <h1 className="max-w-2xl font-serif text-5xl leading-[0.95] tracking-tight md:text-7xl">
              Todo el fulbo,
              <br />
              en un solo lugar.
            </h1>
            <p className="mt-4 max-w-lg text-sm text-muted-foreground">
              Próxima fecha, cuentas claras y la conversación que dejan los partidos cerrados.
            </p>
          </div>
          <FilterControls filters={filters} onChange={onFiltersChange} />
        </header>

        <section className="mt-8" aria-labelledby="feed-upcoming">
          <Card className="hf-ticket">
            <CardHeader>
              <Badge>Próximo partido</Badge>
              <CardAction>
                <span className="font-mono text-xs text-muted-foreground">VIE · 31 JUL</span>
              </CardAction>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
              <div>
                <h2 id="feed-upcoming" className="font-serif text-4xl">
                  {upcomingMatch.venue}
                </h2>
                <p className="mt-2 text-sm">
                  {upcomingMatch.time} · {upcomingMatch.address}
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Badge variant="secondary">
                    <UsersIcon data-icon="inline-start" />
                    {upcomingMatch.expectedPlayers} jugadores
                  </Badge>
                  <Badge variant="secondary">
                    <ReceiptTextIcon data-icon="inline-start" />
                    {formatCurrency(upcomingMatch.price / upcomingMatch.expectedPlayers)} c/u
                  </Badge>
                </div>
              </div>
              <Button
                nativeButton={false}
                render={<a href={upcomingMatch.mapsUrl} target="_blank" rel="noreferrer" />}
              >
                Ver mapa
                <ChevronRightIcon data-icon="inline-end" />
              </Button>
            </CardContent>
          </Card>
        </section>

        <section className="mt-8" aria-labelledby="feed-debts">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Caja de la fecha</p>
              <h2 id="feed-debts" className="mt-1 font-serif text-3xl">
                Faltan {formatCurrency(upcomingMatch.dueAmount)}
              </h2>
            </div>
            <span className="font-mono text-xs">
              {upcomingMatch.paidPlayers}/{upcomingMatch.expectedPlayers} pagaron
            </span>
          </div>
          <Alert>
            <AlertCircleIcon />
            <AlertTitle>Hay 3 aportes pendientes</AlertTitle>
            <AlertDescription>
              {debts.map((debt) => debt.name).join(", ")} deben{" "}
              {formatCurrency(upcomingMatch.price / upcomingMatch.expectedPlayers)} cada uno.
            </AlertDescription>
          </Alert>
        </section>

        <Separator className="my-9" />

        <section aria-labelledby="feed-ranking">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs text-muted-foreground">La picante</p>
              <h2 id="feed-ranking" className="mt-1 font-serif text-3xl">
                Tabla del grupo
              </h2>
            </div>
            <Badge variant="outline">{periodLabels[filters.period]}</Badge>
          </div>

          {players.length > 0 ? (
            <div className="mt-5 flex flex-col gap-2">
              {players.slice(0, 5).map((player, index) => (
                <Card key={player.id} size="sm">
                  <CardContent className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
                    <span className="font-serif text-2xl text-muted-foreground">{index + 1}</span>
                    <div className="flex min-w-0 items-center gap-2">
                      <PlayerAvatar player={player} />
                      <div className="min-w-0">
                        <p className="truncate font-medium">{player.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {player.played} PJ · {player.wins}-{player.draws}-{player.losses}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-serif text-2xl">{player.contributions}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {player.goals}G + {player.assists}A · {player.average} prom.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyResults subject="ranking" />
          )}
        </section>

        <Separator className="my-9" />

        <section aria-labelledby="feed-history">
          <div className="mb-5">
            <p className="text-xs text-muted-foreground">Lo que pasó</p>
            <h2 id="feed-history" className="mt-1 font-serif text-3xl">
              Historial del grupo
            </h2>
          </div>
          {history.length > 0 ? (
            history.slice(0, 4).map((match) => <FeedMatch key={match.id} match={match} />)
          ) : (
            <EmptyResults subject="historial" />
          )}
        </section>

        <footer className="mt-8 flex items-center gap-2 text-xs text-muted-foreground">
          <LockKeyholeIcon className="size-3.5" />
          Nadie con este enlace puede editar. Solo aparecen partidos cerrados.
        </footer>
      </div>
    </main>
  );
}

function PrototypeSwitcher({
  current,
  filters,
}: {
  current: VariantKey;
  filters: PrototypeFilters;
}) {
  const router = useRouter();
  const currentIndex = variants.findIndex((variant) => variant.key === current);

  const goTo = useCallback(
    (direction: -1 | 1) => {
      const nextIndex = (currentIndex + direction + variants.length) % variants.length;
      const next = variants[nextIndex];
      router.replace(`/prototype/shared-dashboard?variant=${next.key}`, {
        scroll: false,
      });
    },
    [currentIndex, router],
  );
  const previous = useCallback(() => goTo(-1), [goTo]);
  const next = useCallback(() => goTo(1), [goTo]);

  usePrototypeShortcuts(previous, next);

  if (process.env.NODE_ENV === "production") return null;

  const active = variants[currentIndex];

  return (
    <aside
      className="fixed inset-x-3 bottom-3 z-40 mx-auto flex max-w-xl items-center justify-between gap-2 rounded-full bg-foreground p-1.5 text-background shadow-2xl"
      aria-label="Selector de variantes del prototipo"
      data-testid="prototype-switcher"
    >
      <Button
        variant="secondary"
        size="icon"
        className="rounded-full"
        onClick={previous}
        aria-label="Variante anterior"
      >
        <ArrowLeftIcon />
      </Button>
      <div className="min-w-0 text-center">
        <p className="truncate text-xs font-medium">
          {active.key.toUpperCase()} — {active.name}
        </p>
        <p className="truncate text-[10px] text-background/60">
          {periodLabels[filters.period]} ·{" "}
          {venueOptions.find((option) => option.value === filters.venue)?.label} ·{" "}
          {historyOptions.find((option) => option.value === filters.history)?.label}
        </p>
      </div>
      <Button
        variant="secondary"
        size="icon"
        className="rounded-full"
        onClick={next}
        aria-label="Variante siguiente"
      >
        <ArrowRightIcon />
      </Button>
    </aside>
  );
}

export default function SharedDashboardPrototype({ initialVariant }: { initialVariant?: string }) {
  const variant = isVariant(initialVariant) ? initialVariant : "a";
  const [filters, setFilters] = useState<PrototypeFilters>({
    period: "30d",
    venue: "all",
    history: "all",
  });
  const data = useMemo(() => getPrototypeData(filters), [filters]);

  return (
    <>
      {variant === "a" ? (
        <VariantA
          filters={filters}
          onFiltersChange={setFilters}
          players={data.players}
          history={data.history}
        />
      ) : null}
      {variant === "b" ? (
        <VariantB
          filters={filters}
          onFiltersChange={setFilters}
          players={data.players}
          history={data.history}
          matchCount={data.periodMatches.length}
        />
      ) : null}
      {variant === "c" ? (
        <VariantC
          filters={filters}
          onFiltersChange={setFilters}
          players={data.players}
          history={data.history}
        />
      ) : null}
      <PrototypeSwitcher current={variant} filters={filters} />
    </>
  );
}

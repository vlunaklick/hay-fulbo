"use client";

import { Alert, AlertDescription, AlertTitle } from "@hay-fulbo/ui/components/alert";
import { Badge } from "@hay-fulbo/ui/components/badge";
import { Button } from "@hay-fulbo/ui/components/button";
import { Card } from "@hay-fulbo/ui/components/card";
import { Field, FieldError, FieldLabel } from "@hay-fulbo/ui/components/field";
import { Input } from "@hay-fulbo/ui/components/input";
import { Skeleton } from "@hay-fulbo/ui/components/skeleton";
import { Spinner } from "@hay-fulbo/ui/components/spinner";
import { ToggleGroup, ToggleGroupItem } from "@hay-fulbo/ui/components/toggle-group";
import { cn } from "@hay-fulbo/ui/lib/utils";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ArrowRightIcon,
  CalendarPlusIcon,
  ChevronRightIcon,
  CircleAlertIcon,
  MapPinIcon,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { useAppContext } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import {
  formatDayTitle,
  formatMoney,
  formatShortDate,
  formatShortWeekday,
  formatTime,
} from "@/lib/format";
import {
  groupHabit,
  relativeDay,
  splitMatches,
  suggestedDates,
  toLocalInput,
} from "@/lib/match-schedule";
import { queryClient, trpc } from "@/utils/trpc";

const HISTORY_PREVIEW = 8;

type ListMatch = {
  id: string;
  scheduledAt: Date;
  status: "open" | "closed" | "cancelled";
  courtId: string | null;
  courtName: string | null;
  courtCostMinor: string | null;
  home: { name: string; goals: number };
  away: { name: string; goals: number };
};

function matchHref(id: string) {
  return `/dashboard/partidos/${id}` as Route;
}

export default function MatchesPage() {
  const { role } = useAppContext();
  const canManage = role !== "member";
  const matches = useQuery(trpc.matches.list.queryOptions({ limit: 50 }));
  const directory = useQuery(trpc.matches.directory.queryOptions());

  if (matches.isPending) {
    return (
      <div className="flex flex-col gap-8">
        <PageHeader title="Partidos" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (matches.isError) {
    return (
      <div className="flex flex-col gap-8">
        <PageHeader title="Partidos" />
        <Alert variant="destructive">
          <CircleAlertIcon aria-hidden="true" />
          <AlertTitle>No pudimos cargar los partidos</AlertTitle>
          <AlertDescription>{matches.error.message}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const courtNames = new Map(
    (directory.data?.courts ?? []).map((court) => [court.id, court.name] as const),
  );
  const items: ListMatch[] = matches.data.map((match) => ({
    id: match.id,
    scheduledAt: new Date(match.scheduledAt),
    status: match.status,
    courtId: match.courtId,
    courtName: match.courtId ? (courtNames.get(match.courtId) ?? null) : null,
    courtCostMinor: match.courtCostMinor,
    home: { name: match.teams[0]?.displayName ?? "Equipo 1", goals: match.teams[0]?.goals ?? 0 },
    away: { name: match.teams[1]?.displayName ?? "Equipo 2", goals: match.teams[1]?.goals ?? 0 },
  }));

  const activeCourtIds = new Set(
    (directory.data?.courts ?? []).filter((court) => !court.archivedAt).map((court) => court.id),
  );

  return (
    <MatchesOverview
      matches={items}
      activeCourtIds={activeCourtIds}
      canManage={canManage}
      now={new Date()}
    />
  );
}

function MatchesOverview({
  matches,
  activeCourtIds,
  canManage,
  now,
}: {
  matches: ListMatch[];
  activeCourtIds: ReadonlySet<string>;
  canManage: boolean;
  now: Date;
}) {
  const { upcoming, unclosed, played } = splitMatches(matches, now);
  const [next, ...later] = upcoming;
  const [showAll, setShowAll] = useState(false);
  const history = showAll ? played : played.slice(0, HISTORY_PREVIEW);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Partidos" />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:items-start">
        <div className="flex flex-col gap-6 lg:sticky lg:top-8">
          {unclosed.length > 0 ? <UnclosedNotice matches={unclosed} now={now} /> : null}

          <section className="flex flex-col gap-3" aria-labelledby="next-match-title">
            <h2 id="next-match-title" className="text-base font-semibold">
              Próximo partido
            </h2>
            {next ? (
              <NextMatchCard match={next} now={now} />
            ) : (
              <Card className="gap-4 border border-dashed p-4 ring-0">
                <p className="text-lg font-bold">
                  {matches.length === 0 ? "Todavía no hay partidos" : "No hay fecha armada"}
                </p>
                {canManage ? (
                  <QuickCreate
                    matches={matches}
                    activeCourtIds={activeCourtIds}
                    now={now}
                    primary
                  />
                ) : null}
              </Card>
            )}
          </section>

          {later.length > 0 ? (
            <section className="flex flex-col gap-3" aria-labelledby="later-title">
              <h2 id="later-title" className="text-sm font-medium text-muted-foreground">
                Después
              </h2>
              <Card className="gap-0 divide-y py-0">
                {later.map((match) => (
                  <Link
                    key={match.id}
                    href={matchHref(match.id)}
                    className="flex min-h-14 items-center justify-between gap-3 px-4 py-3 outline-none transition-colors first:rounded-t-lg last:rounded-b-lg hover:bg-muted/50 focus-visible:bg-muted/50"
                  >
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <p className="truncate text-sm font-medium">
                        {formatDayTitle(match.scheduledAt)} ·{" "}
                        <span className="tabular-nums">{formatTime(match.scheduledAt)}</span>
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {match.courtName ?? "Cancha a definir"}
                      </p>
                    </div>
                    <ChevronRightIcon
                      className="size-4 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                  </Link>
                ))}
              </Card>
            </section>
          ) : null}

          {next && canManage ? (
            <section className="flex flex-col gap-3" aria-labelledby="schedule-title">
              <h2 id="schedule-title" className="text-sm font-medium text-muted-foreground">
                Armar otra fecha
              </h2>
              <QuickCreate matches={matches} activeCourtIds={activeCourtIds} now={now} />
            </section>
          ) : null}
        </div>

        <section className="flex flex-col gap-3" aria-labelledby="played-title">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="played-title" className="text-base font-semibold">
              Jugados
            </h2>
            {played.length > 0 ? (
              <span className="text-xs text-muted-foreground tabular-nums">
                {played.length} {played.length === 1 ? "partido" : "partidos"}
              </span>
            ) : null}
          </div>
          {played.length === 0 ? (
            <p className="text-sm text-muted-foreground">Todavía no se cerró ningún partido.</p>
          ) : (
            <Card className="gap-0 divide-y py-0">
              {history.map((match) => (
                <ResultRow key={match.id} match={match} />
              ))}
              {played.length > HISTORY_PREVIEW ? (
                <Button
                  variant="ghost"
                  className="h-12 w-full rounded-t-none text-muted-foreground"
                  onClick={() => setShowAll((value) => !value)}
                >
                  {showAll ? "Ver menos" : `Ver los ${played.length - HISTORY_PREVIEW} anteriores`}
                </Button>
              ) : null}
            </Card>
          )}
        </section>
      </div>
    </div>
  );
}

function NextMatchCard({ match, now }: { match: ListMatch; now: Date }) {
  return (
    <Card className="gap-5 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-2xl font-bold tracking-tight">{formatDayTitle(match.scheduledAt)}</p>
          <p className="text-lg font-semibold tabular-nums text-muted-foreground">
            {formatTime(match.scheduledAt)} h
          </p>
        </div>
        <Badge variant="secondary" className="mt-1.5 shrink-0">
          {relativeDay(match.scheduledAt, now)}
        </Badge>
      </div>

      <dl className="grid grid-cols-2 gap-4 text-sm">
        <div className="col-span-2 flex min-w-0 flex-col gap-0.5">
          <dt className="text-xs font-medium text-muted-foreground">Cancha</dt>
          <dd className="flex min-w-0 items-center gap-1.5 font-medium">
            <MapPinIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            {match.courtName ? (
              <span className="truncate">{match.courtName}</span>
            ) : (
              <span className="text-muted-foreground">A definir</span>
            )}
          </dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-xs font-medium text-muted-foreground">Costo total</dt>
          <dd className="font-medium tabular-nums">
            {match.courtCostMinor ? (
              formatMoney(match.courtCostMinor)
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </dd>
        </div>
        <div className="flex min-w-0 flex-col gap-0.5">
          <dt className="text-xs font-medium text-muted-foreground">Equipos</dt>
          <dd className="truncate font-medium">
            {match.home.name} <span className="font-normal text-muted-foreground">vs.</span>{" "}
            {match.away.name}
          </dd>
        </div>
      </dl>

      <Button render={<Link href={matchHref(match.id)} />} nativeButton={false} className="w-full">
        Abrir partido
        <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
      </Button>
    </Card>
  );
}

function UnclosedNotice({ matches, now }: { matches: ListMatch[]; now: Date }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg bg-destructive/10 p-3">
      <p className="flex items-center gap-2 text-sm font-medium text-destructive">
        <CircleAlertIcon className="size-4 shrink-0" aria-hidden="true" />
        {matches.length === 1
          ? "Falta cerrar un partido"
          : `Faltan cerrar ${matches.length} partidos`}
      </p>
      {matches.map((match) => (
        <Link
          key={match.id}
          href={matchHref(match.id)}
          className="flex min-h-11 items-center justify-between gap-3 rounded-md px-1 text-sm outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <span className="min-w-0 truncate">
            {formatDayTitle(match.scheduledAt)} · {relativeDay(match.scheduledAt, now)}
          </span>
          <span className="flex shrink-0 items-center gap-1 font-semibold tabular-nums">
            {match.home.goals} – {match.away.goals}
            <ChevronRightIcon className="size-4" aria-hidden="true" />
          </span>
        </Link>
      ))}
    </div>
  );
}

function ResultRow({ match }: { match: ListMatch }) {
  const cancelled = match.status === "cancelled";
  const homeWon = match.home.goals > match.away.goals;
  const awayWon = match.away.goals > match.home.goals;
  const draw = !homeWon && !awayWon;
  const date = formatShortDate(match.scheduledAt).replace(".", "");
  const label = cancelled
    ? `Cancelado, ${date}`
    : `${match.home.name} ${match.home.goals}, ${match.away.name} ${match.away.goals}, ${date}`;
  return (
    <Link
      href={matchHref(match.id)}
      aria-label={label}
      className="grid min-h-16 grid-cols-[3.5rem_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 outline-none transition-colors first:rounded-t-lg last:rounded-b-lg hover:bg-muted/50 focus-visible:bg-muted/50"
    >
      <div className="flex flex-col text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{date}</span>
        <span>{formatShortWeekday(match.scheduledAt)}</span>
      </div>
      {cancelled ? (
        <>
          <p className="truncate text-sm text-muted-foreground">
            {match.home.name} vs. {match.away.name}
          </p>
          <Badge variant="ghost">Cancelado</Badge>
        </>
      ) : (
        <>
          <div className="flex min-w-0 flex-col gap-1 text-sm">
            <span className={cn("truncate", resultTone(homeWon, draw, "name"))}>
              {match.home.name}
            </span>
            <span className={cn("truncate", resultTone(awayWon, draw, "name"))}>
              {match.away.name}
            </span>
          </div>
          <div className="flex flex-col items-end gap-1 text-sm tabular-nums">
            <span className={resultTone(homeWon, draw, "score")}>{match.home.goals}</span>
            <span className={resultTone(awayWon, draw, "score")}>{match.away.goals}</span>
          </div>
        </>
      )}
    </Link>
  );
}

function resultTone(won: boolean, draw: boolean, part: "name" | "score") {
  if (won) return part === "score" ? "font-bold" : "font-semibold";
  if (draw) return part === "score" ? "font-semibold" : "font-medium";
  return "text-muted-foreground";
}

/**
 * Inline creation: the group's next usual dates as one-tap choices, with the
 * court and cost of its latest match. Everything else is edited in the match.
 */
function QuickCreate({
  matches,
  activeCourtIds,
  now,
  primary = false,
}: {
  matches: ListMatch[];
  activeCourtIds: ReadonlySet<string>;
  now: Date;
  primary?: boolean;
}) {
  const router = useRouter();
  const habit = groupHabit(matches);
  // An archived court can't host new matches; fall back to "a definir".
  const courtId = habit.courtId && activeCourtIds.has(habit.courtId) ? habit.courtId : null;
  const courtCostMinor = courtId ? habit.courtCostMinor : null;
  const courtName = matches.find((match) => match.courtId === courtId)?.courtName ?? null;
  const suggestions = suggestedDates(matches, now, 3);
  const [choice, setChoice] = useState(suggestions[0]?.toISOString() ?? "other");
  const [custom, setCustom] = useState(() =>
    toLocalInput(suggestions[0] ?? new Date(now.getTime() + 24 * 60 * 60 * 1000)),
  );
  const [error, setError] = useState<string | null>(null);
  const when = choice === "other" ? (custom ? new Date(custom) : null) : new Date(choice);

  const create = useMutation(
    trpc.matches.execute.mutationOptions({
      onSuccess: (result) => {
        if (!("matchId" in result)) return;
        toast.success("Partido creado");
        queryClient.invalidateQueries({ queryKey: trpc.matches.list.queryKey() });
        queryClient.invalidateQueries({ queryKey: trpc.stats.dashboard.queryKey() });
        router.push(matchHref(result.matchId));
      },
      onError: (cause) => setError(cause.message),
    }),
  );

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (!when) return setError("Elegí fecha y hora.");
        setError(null);
        create.mutate({
          type: "createMatch",
          scheduledAt: when,
          ...(courtId ? { courtId } : {}),
          ...(courtCostMinor ? { courtCostMinor } : {}),
        });
      }}
    >
      <ToggleGroup
        variant="outline"
        aria-label="Cuándo"
        value={[choice]}
        onValueChange={(values) => {
          if (values[0]) setChoice(values[0]);
        }}
        className="flex w-full"
      >
        {suggestions.map((date) => (
          <ToggleGroupItem
            key={date.toISOString()}
            value={date.toISOString()}
            className="h-14 min-w-0 flex-1 flex-col gap-0 px-2"
          >
            <span className="font-semibold">
              {formatShortWeekday(date)} {date.getDate()}
            </span>
            <span className="text-xs tabular-nums text-muted-foreground">{formatTime(date)}</span>
          </ToggleGroupItem>
        ))}
        <ToggleGroupItem value="other" className="h-14 min-w-0 flex-1 flex-col gap-0 px-2">
          Otra fecha
        </ToggleGroupItem>
      </ToggleGroup>

      {choice === "other" ? (
        <Field>
          <FieldLabel htmlFor="new-match-date">Fecha y hora</FieldLabel>
          <Input
            id="new-match-date"
            type="datetime-local"
            value={custom}
            onChange={(event) => setCustom(event.target.value)}
          />
        </Field>
      ) : null}

      {courtName ? (
        <p className="text-xs text-muted-foreground">
          En {courtName}
          {courtCostMinor ? ` · ${formatMoney(courtCostMinor)}` : ""}, como la última.
        </p>
      ) : null}

      <FieldError>{error}</FieldError>

      <Button
        type="submit"
        variant={primary ? "default" : "secondary"}
        disabled={!when || create.isPending}
        className="w-full"
      >
        {create.isPending ? (
          <Spinner data-icon="inline-start" />
        ) : (
          <CalendarPlusIcon data-icon="inline-start" aria-hidden="true" />
        )}
        {create.isPending
          ? "Creando…"
          : when
            ? `Crear ${formatDayTitle(when).toLowerCase()}`
            : "Crear partido"}
      </Button>
    </form>
  );
}

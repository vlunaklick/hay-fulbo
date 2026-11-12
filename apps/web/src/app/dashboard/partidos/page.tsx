"use client";

import { Alert, AlertDescription, AlertTitle } from "@hay-fulbo/ui/components/alert";
import { Badge } from "@hay-fulbo/ui/components/badge";
import { Button } from "@hay-fulbo/ui/components/button";
import { Skeleton } from "@hay-fulbo/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { CircleAlertIcon } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";

import { useAppContext } from "@/components/app-shell";
import { MatchSummary } from "@/components/match-summary";
import { QuickCreateForm } from "@/components/new-match-dialog";
import { DrillList, DrillRow, NextStep, StatusHeader } from "@/components/next-step";
import { DrillDetail, NextStepLayout, useIsDesktop } from "@/components/next-step-layout";
import { formatDayTitle, formatMoney, formatTime } from "@/lib/format";
import { relativeDay, splitMatches } from "@/lib/match-schedule";
import { isLive } from "@/lib/next-step";
import { trpc } from "@/utils/trpc";

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

type Court = { id: string; name: string; archivedAt: Date | string | null };

function matchHref(id: string) {
  return `/dashboard/partidos/${id}` as Route;
}

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

export default function MatchesPage() {
  const { role } = useAppContext();
  const canManage = role !== "member";
  const matches = useQuery(trpc.matches.list.queryOptions({ limit: 50 }));
  const directory = useQuery(trpc.matches.directory.queryOptions());

  if (matches.isPending) {
    return (
      <NextStepLayout>
        <StatusHeader title="Historial" />
        <Skeleton className="h-36 w-full" />
        <Skeleton className="h-60 w-full" />
      </NextStepLayout>
    );
  }
  if (matches.isError) {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
        <StatusHeader title="Historial" />
        <Alert variant="destructive">
          <CircleAlertIcon aria-hidden="true" />
          <AlertTitle>No pudimos cargar los partidos</AlertTitle>
          <AlertDescription>{matches.error.message}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const courts = directory.data?.courts ?? [];
  const courtNames = new Map(courts.map((court) => [court.id, court.name] as const));
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

  return <MatchesOverview matches={items} courts={courts} canManage={canManage} now={new Date()} />;
}

/**
 * "¿Cuándo jugamos?": the match in play, left open or coming next is the one
 * step; upcoming dates and every result, grouped by month, are rows.
 * See docs/prototypes/proximo-paso.md and match-list.md.
 */
function MatchesOverview({
  matches,
  courts,
  canManage,
  now,
}: {
  matches: ListMatch[];
  courts: readonly Court[];
  canManage: boolean;
  now: Date;
}) {
  const { upcoming, unclosed, played } = splitMatches(matches, now);
  const [next, ...later] = upcoming;
  const [showAll, setShowAll] = useState(false);
  const desktop = useIsDesktop();
  // `undefined` until the viewer picks something: desktop then shows the focus match.
  const [picked, setPicked] = useState<{ kind: "match"; id: string } | { kind: "create" } | null>();
  const history = showAll ? played : played.slice(0, HISTORY_PREVIEW);
  const live = next && isLive(next, now) ? next : null;
  // A manager's first job is closing what was left open; the next date waits.
  const toClose = !live && canManage ? unclosed[0] : undefined;
  const months = groupByMonth(history);
  const focus = live ?? toClose ?? next ?? played[0];
  const detail =
    picked === undefined
      ? desktop && focus
        ? { kind: "match" as const, id: focus.id }
        : null
      : picked;
  const selectedId = detail?.kind === "match" ? detail.id : null;
  const selected = selectedId ? matches.find((match) => match.id === selectedId) : undefined;
  const select = (id: string) => setPicked({ kind: "match", id });
  const metaParts = [
    `${played.length} ${played.length === 1 ? "jugado" : "jugados"}`,
    upcoming.length ? `${upcoming.length} por jugar` : null,
  ].filter(Boolean);

  return (
    <NextStepLayout emptyDetail="Cuando haya partidos, acá vas a ver el elegido.">
      <StatusHeader
        title="Historial"
        meta={metaParts.join(" · ")}
        status={live ? <Badge>En juego</Badge> : null}
      />

      {live ? (
        <NextStep
          kicker={`Empezó a las ${formatTime(live.scheduledAt)}`}
          title={`Hay partido en juego · ${live.home.goals} – ${live.away.goals}`}
          action={<OpenMatch id={live.id}>Ir al partido</OpenMatch>}
        />
      ) : toClose ? (
        <NextStep
          kicker="Falta cerrar"
          title={`Cerrá el partido del ${formatDayTitle(toClose.scheduledAt).toLowerCase()}`}
          action={<OpenMatch id={toClose.id}>Ir al partido</OpenMatch>}
        />
      ) : next ? (
        <NextStep
          kicker={capitalize(relativeDay(next.scheduledAt, now))}
          title={`${formatDayTitle(next.scheduledAt)} · ${formatTime(next.scheduledAt)}`}
          action={<OpenMatch id={next.id}>Abrir partido</OpenMatch>}
        >
          {next.courtName ?? "Cancha a definir"}
          {next.courtCostMinor ? ` · ${formatMoney(next.courtCostMinor)}` : ""}
        </NextStep>
      ) : canManage ? (
        <NextStep
          kicker={matches.length === 0 ? "Todavía no hay partidos" : "No hay fecha armada"}
          title="Armá el próximo partido"
          action={<QuickCreateForm courts={courts} matches={matches} now={now} primary />}
        />
      ) : (
        <p className="text-sm text-muted-foreground">
          {matches.length === 0 ? "Todavía no hay partidos." : "No hay fecha armada."}
        </p>
      )}

      {unclosed.length > 0 ? (
        <DrillList title="Falta cerrar">
          {unclosed.map((match) => (
            <MatchRow
              key={match.id}
              match={match}
              selected={match.id === selectedId}
              onSelect={desktop ? select : undefined}
              value={`${match.home.goals} – ${match.away.goals} · ${relativeDay(match.scheduledAt, now)}`}
            />
          ))}
        </DrillList>
      ) : null}

      {(live || toClose ? upcoming : later).length > 0 || (next && canManage) ? (
        <DrillList title="Próximos">
          {(live || toClose ? upcoming : later).map((match) => (
            <MatchRow
              key={match.id}
              match={match}
              selected={match.id === selectedId}
              onSelect={desktop ? select : undefined}
              value={`${formatTime(match.scheduledAt)} · ${match.courtName ?? "cancha a definir"}`}
            />
          ))}
          {next && canManage ? (
            <DrillRow
              label="Armar otra fecha"
              selected={detail?.kind === "create"}
              onClick={() => setPicked({ kind: "create" })}
            />
          ) : null}
        </DrillList>
      ) : null}

      {played.length === 0 ? (
        matches.length > 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no se cerró ningún partido.</p>
        ) : null
      ) : (
        <div className="flex flex-col gap-6">
          {months.map(([month, entries]) => (
            <DrillList key={month} title={month}>
              {entries.map((match) => (
                <MatchRow
                  key={match.id}
                  match={match}
                  selected={match.id === selectedId}
                  onSelect={desktop ? select : undefined}
                  value={
                    match.status === "cancelled"
                      ? "Cancelado"
                      : `${match.home.goals} – ${match.away.goals}`
                  }
                />
              ))}
            </DrillList>
          ))}
          {played.length > HISTORY_PREVIEW ? (
            <Button
              variant="ghost"
              className="h-12 w-full text-muted-foreground"
              onClick={() => setShowAll((value) => !value)}
            >
              {showAll ? "Ver menos" : `Ver los ${played.length - HISTORY_PREVIEW} anteriores`}
            </Button>
          ) : null}
        </div>
      )}

      {selected ? (
        <DrillDetail
          open
          onOpenChange={(open) => setPicked(open ? { kind: "match", id: selected.id } : null)}
          title={`${formatDayTitle(selected.scheduledAt)} · ${formatTime(selected.scheduledAt)}`}
          description={`${statusLabel(selected, now)} · ${selected.courtName ?? "Cancha a definir"}`}
        >
          <MatchSummary matchId={selected.id} />
        </DrillDetail>
      ) : null}

      {canManage && next ? (
        <DrillDetail
          open={detail?.kind === "create"}
          onOpenChange={(open) => setPicked(open ? { kind: "create" } : null)}
          title="Armar otra fecha"
          description="Cancha y equipos se completan después."
        >
          <QuickCreateForm courts={courts} matches={matches} now={now} primary />
        </DrillDetail>
      ) : null}
    </NextStepLayout>
  );
}

function OpenMatch({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <Button render={<Link href={matchHref(id)} />} nativeButton={false}>
      {children}
    </Button>
  );
}

function statusLabel(match: ListMatch, now: Date) {
  if (match.status === "cancelled") return "Cancelado";
  if (match.status === "closed") return "Jugado";
  if (isLive(match, now)) return "En juego";
  return match.scheduledAt < now ? "Falta cerrar" : capitalize(relativeDay(match.scheduledAt, now));
}

/**
 * "Jueves 19 nov · 3 – 2", with the teams spelled out for screen readers. Always a
 * link to the match; on desktop a plain click shows it in the right column instead
 * (`onSelect`), and the summary there has "Abrir partido".
 */
function MatchRow({
  match,
  onSelect,
  selected,
  value,
}: {
  match: ListMatch;
  onSelect?: (id: string) => void;
  selected: boolean;
  value: string;
}) {
  const date = formatDayTitle(match.scheduledAt);
  const label =
    match.status === "cancelled"
      ? `Cancelado, ${date}`
      : match.status === "closed"
        ? `${match.home.name} ${match.home.goals}, ${match.away.name} ${match.away.goals}, ${date}`
        : `${date}, ${value}`;
  return (
    <DrillRow
      label={date}
      value={value}
      selected={selected}
      className={match.status === "cancelled" ? "text-muted-foreground" : undefined}
      render={({ className, children }) => (
        <Link
          aria-current={selected ? "true" : undefined}
          aria-label={label}
          className={className}
          href={matchHref(match.id)}
          onClick={(event) => {
            if (!onSelect) return;
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            if (event.button !== 0) return;
            event.preventDefault();
            onSelect(match.id);
          }}
        >
          {children}
        </Link>
      )}
    />
  );
}

/** Newest-first matches as `[["Noviembre 2026", [...]], ...]`. */
function groupByMonth(matches: readonly ListMatch[]) {
  const groups = new Map<string, ListMatch[]>();
  const format = new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric" });
  for (const match of matches) {
    const key = capitalize(format.format(match.scheduledAt));
    groups.set(key, [...(groups.get(key) ?? []), match]);
  }
  return [...groups.entries()];
}

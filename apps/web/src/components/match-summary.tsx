"use client";

import { Button } from "@hay-fulbo/ui/components/button";
import { Skeleton } from "@hay-fulbo/ui/components/skeleton";
import { cn } from "@hay-fulbo/ui/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { ArrowRightIcon } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { DrillList, DrillRow } from "@/components/next-step";
import { formatMoney } from "@/lib/format";
import { trpc } from "@/utils/trpc";

/**
 * A match at a glance for a `DrillDetail`: score once it started, who plays on
 * each team, how the money is going, and the way into the full match page.
 */
export function MatchSummary({ matchId }: { matchId: string }) {
  const detail = useQuery(trpc.matches.detail.queryOptions({ matchId }));
  const href = `/dashboard/partidos/${matchId}` as Route;
  const open = (
    <Button className="w-full" render={<Link href={href} />} nativeButton={false}>
      Abrir partido
      <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
    </Button>
  );

  if (detail.isPending) {
    return (
      <div className="flex flex-col gap-4" aria-label="Cargando partido">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-9 w-full" />
      </div>
    );
  }
  if (detail.isError) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">No pudimos cargar el partido.</p>
        {open}
      </div>
    );
  }

  const match = detail.data;
  const started = match.status !== "open" || new Date(match.scheduledAt).getTime() <= Date.now();
  const goals = new Map(match.score.map((entry) => [entry.teamId, entry.goals]));
  const people = [
    ...match.teams.flatMap((team) => team.appearances),
    ...match.absences.filter((absence) => absence.owesContribution),
  ];
  const paid = people.filter((person) => BigInt(person.debtMinor) <= 0n).length;
  const owed = people.reduce((total, person) => total + BigInt(person.debtMinor), 0n);

  return (
    <div className="flex flex-col gap-5">
      {match.status === "cancelled" ? (
        <p className="text-sm text-muted-foreground">Este partido se canceló.</p>
      ) : null}

      <ul className="flex flex-col gap-3">
        {match.teams.map((team) => (
          <li key={team.id} className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className={cn(
                  "size-2 shrink-0 rounded-full",
                  team.slot === 1 ? "bg-team-blue" : "bg-team-amber",
                )}
              />
              <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                {team.displayName}
              </span>
              {started && match.status !== "cancelled" ? (
                <span className="text-2xl font-bold tabular-nums">{goals.get(team.id) ?? 0}</span>
              ) : (
                <span className="text-xs text-muted-foreground tabular-nums">
                  {team.appearances.length}{" "}
                  {team.appearances.length === 1 ? "jugador" : "jugadores"}
                </span>
              )}
            </div>
            <p className="pl-4 text-xs text-muted-foreground">
              {team.appearances.length
                ? team.appearances.map((appearance) => appearance.playerDisplayName).join(", ")
                : "Sin jugadores todavía"}
            </p>
          </li>
        ))}
      </ul>

      {match.courtCostMinor !== null && match.status !== "cancelled" ? (
        <DrillList>
          <DrillRow static label="Cancha" value={formatMoney(match.courtCostMinor)} />
          {people.length ? (
            <DrillRow
              static
              label="Pagaron"
              value={
                owed > 0n
                  ? `${paid} de ${people.length} · falta ${formatMoney(owed.toString())}`
                  : `${paid} de ${people.length}`
              }
            />
          ) : null}
        </DrillList>
      ) : null}

      {open}
    </div>
  );
}

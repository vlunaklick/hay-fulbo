"use client";

import { Button } from "@hay-fulbo/ui/components/button";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@hay-fulbo/ui/components/sheet";
import { cn } from "@hay-fulbo/ui/lib/utils";
import { MinusIcon, PlusIcon } from "lucide-react";
import { useState } from "react";

import type { PitchMatch, Team } from "./pitch-data";
import { PitchHeader, TeamDot, UndoBar } from "./parts";

// Variant 3 — "Planilla": no Gol button. Both rosters are always on screen and
// tapping a player IS the goal. One tap, with the undo bar as the safety net.

export function VariantPlanilla({ match }: { match: PitchMatch }) {
  const [fixing, setFixing] = useState(false);
  const [ownFor, setOwnFor] = useState<string | null>(null);
  const [t1, t2] = match.teams as [Team, Team];
  const delta = fixing ? -1 : 1;
  const ownTeam = match.teams.find((t) => t.id === ownFor);
  const ownRival = match.teams.find((t) => t.id !== ownFor);

  return (
    <div className="dark fixed inset-0 z-50 flex touch-manipulation flex-col bg-background text-foreground">
      <PitchHeader
        hint={fixing ? "Tocá un gol para restarlo" : "Tocá al que la hizo"}
        action={
          <Button
            size="sm"
            variant={fixing ? "secondary" : "ghost"}
            aria-pressed={fixing}
            onClick={() => setFixing((f) => !f)}
          >
            {fixing ? "Listo" : "Corregir"}
          </Button>
        }
      />

      <section
        aria-label="Marcador"
        className="mx-auto grid w-full max-w-4xl shrink-0 grid-cols-2 divide-x border-b"
      >
        {[t1, t2].map((team) => (
          <div
            key={team.id}
            className="flex min-w-0 items-center justify-between gap-2 px-4 py-3 even:flex-row-reverse"
          >
            <h2 className="flex min-w-0 items-center gap-2 text-sm font-semibold">
              <TeamDot team={team} />
              <span className="truncate">{team.displayName}</span>
            </h2>
            <output
              aria-label={`Marcador de ${team.displayName}`}
              className="text-5xl leading-none font-black tabular-nums"
            >
              {match.score(team.id)}
            </output>
          </div>
        ))}
      </section>

      {fixing ? (
        <p className="shrink-0 bg-destructive/10 px-4 py-2 text-center text-sm font-medium text-destructive">
          Modo corrección: cada toque resta un gol
        </p>
      ) : null}

      <main className="mx-auto grid min-h-0 w-full max-w-4xl flex-1 grid-cols-2 gap-x-2 overflow-y-auto px-2 py-3">
        {[t1, t2].map((team) => (
          <ul
            key={team.id}
            aria-label={`Jugadores de ${team.displayName}`}
            className="flex flex-col gap-2"
          >
            {team.appearances.map((r) => (
              <li key={r.playerId}>
                <Button
                  variant="outline"
                  disabled={fixing && r.goals === 0}
                  aria-label={`${fixing ? "Restar gol a" : "Gol de"} ${r.playerDisplayName}`}
                  onClick={() => match.adjust({ field: "goals", delta, playerId: r.playerId })}
                  className={cn(
                    "h-auto min-h-14 w-full justify-between gap-2 border-l-4 py-2 pr-2 pl-3 text-left whitespace-normal",
                    team.slot === 1 ? "border-l-team-blue" : "border-l-team-amber",
                  )}
                >
                  <span className="line-clamp-2 min-w-0 text-sm font-semibold">
                    {r.playerDisplayName}
                  </span>
                  <Count value={r.goals} fixing={fixing} />
                </Button>
              </li>
            ))}
            <li className="grid grid-cols-2 gap-2 pt-1">
              <Button
                variant="ghost"
                disabled={fixing && team.unattributedGoals === 0}
                className="h-auto min-h-12 flex-col gap-0 border border-dashed border-border px-2 py-1.5 text-xs"
                onClick={() => match.adjust({ field: "unattributedGoals", delta, teamId: team.id })}
              >
                Sin autor
                <span className="text-muted-foreground tabular-nums">
                  {fixing ? "−" : "+"}
                  {fixing ? team.unattributedGoals : ""}
                </span>
              </Button>
              <Button
                variant="ghost"
                className="h-auto min-h-12 flex-col gap-0 border border-dashed border-border px-2 py-1.5 text-xs"
                onClick={() => setOwnFor(team.id)}
              >
                Autogol rival
                <span className="text-muted-foreground">elegir…</span>
              </Button>
            </li>
          </ul>
        ))}
      </main>

      <UndoBar
        last={match.last}
        onUndo={match.undo}
        className="pb-[max(0.5rem,env(safe-area-inset-bottom))]"
      />

      <Sheet open={ownFor !== null} onOpenChange={(open) => !open && setOwnFor(null)}>
        <SheetContent side="bottom" className="dark max-h-[85dvh]">
          <SheetHeader>
            <SheetTitle>
              {fixing ? "Restar autogol" : "Autogol"} a favor de {ownTeam?.displayName}
            </SheetTitle>
            <SheetDescription>
              ¿Qué jugador de {ownRival?.displayName} la metió en contra?
            </SheetDescription>
          </SheetHeader>
          <SheetBody className="grid grid-cols-2 gap-2">
            {ownRival?.appearances.map((r) => (
              <Button
                key={r.playerId}
                variant="outline"
                disabled={fixing && r.ownGoals === 0}
                className="h-auto min-h-14 justify-between gap-2 px-3 py-2 text-left whitespace-normal"
                onClick={() => {
                  match.adjust({ field: "ownGoals", delta, playerId: r.playerId });
                  setOwnFor(null);
                }}
              >
                <span className="line-clamp-2 min-w-0">{r.playerDisplayName}</span>
                {r.ownGoals > 0 ? (
                  <span className="text-sm text-muted-foreground tabular-nums">{r.ownGoals}</span>
                ) : null}
              </Button>
            ))}
          </SheetBody>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Count({ value, fixing }: { value: number; fixing: boolean }) {
  if (fixing) {
    return (
      <span className="flex shrink-0 items-center gap-0.5 text-sm text-destructive tabular-nums">
        <MinusIcon aria-hidden="true" />
        {value}
      </span>
    );
  }
  if (value === 0) {
    return <PlusIcon aria-hidden="true" className="shrink-0 text-muted-foreground" />;
  }
  return (
    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-secondary text-base font-bold tabular-nums">
      {value}
    </span>
  );
}

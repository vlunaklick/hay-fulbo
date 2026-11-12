"use client";

import { Button } from "@hay-fulbo/ui/components/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@hay-fulbo/ui/components/collapsible";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@hay-fulbo/ui/components/sheet";
import { cn } from "@hay-fulbo/ui/lib/utils";
import { ChevronDownIcon, MinusIcon, PlusIcon } from "lucide-react";
import { useState } from "react";

import type { PitchMatch, Team } from "./pitch-data";
import { PitchHeader, TeamDot, UndoBar } from "./parts";

// Variant 4 — "Al toque": each half of the screen is one button. A tap counts
// the goal immediately (as unattributed); who scored is settled in a pause.

export function VariantDespues({ match }: { match: PitchMatch }) {
  const [assignFor, setAssignFor] = useState<string | null>(null);
  const [t1, t2] = match.teams as [Team, Team];
  const team = match.teams.find((t) => t.id === assignFor);
  const rival = match.teams.find((t) => t.id !== assignFor);
  const [fixing, setFixing] = useState(false);
  const fixRows = [t1, t2].flatMap((t) => {
    const other = t.id === t1.id ? t2 : t1;
    return [
      ...t.appearances
        .filter((r) => r.goals > 0)
        .map((r) => ({
          key: r.playerId,
          team: t,
          label: r.playerDisplayName,
          count: r.goals,
          action: { field: "goals" as const, playerId: r.playerId },
        })),
      ...other.appearances
        .filter((r) => r.ownGoals > 0)
        .map((r) => ({
          key: `own-${r.playerId}`,
          team: t,
          label: `Autogol de ${r.playerDisplayName}`,
          count: r.ownGoals,
          action: { field: "ownGoals" as const, playerId: r.playerId },
        })),
    ];
  });

  return (
    <div className="dark fixed inset-0 z-50 flex touch-manipulation flex-col bg-background text-foreground">
      <PitchHeader
        hint="Tocá el equipo que hizo el gol"
        action={
          <Button size="sm" variant="ghost" onClick={() => setFixing(true)}>
            Corregir
          </Button>
        }
      />

      <main className="mx-auto grid min-h-0 w-full max-w-4xl flex-1 grid-cols-2 gap-2 p-2">
        {[t1, t2].map((t) => (
          <Button
            key={t.id}
            variant="outline"
            aria-label={`Gol de ${t.displayName}`}
            onClick={() => match.adjust({ field: "unattributedGoals", delta: 1, teamId: t.id })}
            className={cn(
              "group/half h-full min-h-0 flex-col justify-between gap-4 rounded-xl px-3 pt-6 pb-3 whitespace-normal",
              t.slot === 1
                ? "border-team-blue/40 bg-team-blue/10 hover:bg-team-blue/15 dark:bg-team-blue/10 dark:hover:bg-team-blue/15"
                : "border-team-amber/40 bg-team-amber/10 hover:bg-team-amber/15 dark:bg-team-amber/10 dark:hover:bg-team-amber/15",
            )}
          >
            <span className="flex max-w-full items-center gap-2 text-base font-semibold">
              <TeamDot team={t} />
              <span className="truncate">{t.displayName}</span>
            </span>
            <output className="text-8xl leading-none font-black tabular-nums sm:text-9xl">
              {match.score(t.id)}
            </output>
            <span
              className={cn(
                "flex h-16 w-full items-center justify-center gap-2 rounded-lg text-xl font-bold transition-transform duration-150 ease-out group-active/half:scale-[0.96]",
                t.slot === 1
                  ? "bg-team-blue text-team-blue-ink"
                  : "bg-team-amber text-team-amber-ink",
              )}
            >
              <PlusIcon className="size-6" aria-hidden="true" />
              Gol
            </span>
          </Button>
        ))}
      </main>

      <section
        aria-label="Goles sin autor"
        className="mx-auto grid w-full max-w-4xl shrink-0 grid-cols-2 gap-2 px-2 pb-2"
      >
        {[t1, t2].map((t) => (
          <Button
            key={t.id}
            variant={t.unattributedGoals > 0 ? "secondary" : "ghost"}
            disabled={t.unattributedGoals === 0}
            onClick={() => setAssignFor(t.id)}
            className="h-auto min-h-14 flex-col gap-0 px-2 py-2"
          >
            <span className="text-sm">
              {t.unattributedGoals === 0 ? "Todos con autor" : `${t.unattributedGoals} sin autor`}
            </span>
            {t.unattributedGoals > 0 ? (
              <span className="text-xs font-medium text-muted-foreground">Tocá para asignar</span>
            ) : null}
          </Button>
        ))}
      </section>

      <UndoBar
        last={match.last}
        onUndo={match.undo}
        className="pb-[max(0.5rem,env(safe-area-inset-bottom))]"
      />

      <Sheet open={team !== undefined} onOpenChange={(open) => !open && setAssignFor(null)}>
        <SheetContent side="bottom" className="dark max-h-[85dvh]">
          {team && rival ? (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <TeamDot team={team} />
                  {team.unattributedGoals === 1
                    ? "¿Quién hizo el gol sin autor?"
                    : `${team.unattributedGoals} goles sin autor`}{" "}
                  · {team.displayName}
                </SheetTitle>
                <SheetDescription>
                  Cada toque le pone autor a un gol. Si nadie se acuerda, dejalo sin autor.
                </SheetDescription>
              </SheetHeader>
              <SheetBody className="flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-2">
                  {team.appearances.map((r) => (
                    <Button
                      key={r.playerId}
                      variant="outline"
                      className="h-auto min-h-14 justify-between gap-2 px-3 py-2 text-left whitespace-normal"
                      onClick={() => {
                        match.attribute(
                          { field: "unattributedGoals", delta: -1, teamId: team.id },
                          { field: "goals", delta: 1, playerId: r.playerId },
                        );
                        if (team.unattributedGoals <= 1) setAssignFor(null);
                      }}
                    >
                      <span className="line-clamp-2 min-w-0">{r.playerDisplayName}</span>
                      {r.goals > 0 ? (
                        <span className="text-sm text-muted-foreground tabular-nums">
                          {r.goals}
                        </span>
                      ) : null}
                    </Button>
                  ))}
                </div>
                <Collapsible>
                  <CollapsibleTrigger
                    render={
                      <Button
                        variant="ghost"
                        className="group/own w-full justify-between text-muted-foreground"
                      />
                    }
                  >
                    Fue autogol de {rival.displayName}
                    <ChevronDownIcon
                      aria-hidden="true"
                      className="transition-transform duration-200 group-data-panel-open/own:rotate-180"
                    />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="grid grid-cols-2 gap-2 pt-2">
                    {rival.appearances.map((r) => (
                      <Button
                        key={r.playerId}
                        variant="ghost"
                        className="h-auto min-h-14 justify-start border border-dashed border-border px-3 py-2 text-left whitespace-normal"
                        onClick={() => {
                          match.attribute(
                            { field: "unattributedGoals", delta: -1, teamId: team.id },
                            { field: "ownGoals", delta: 1, playerId: r.playerId },
                          );
                          if (team.unattributedGoals <= 1) setAssignFor(null);
                        }}
                      >
                        <span className="line-clamp-2">{r.playerDisplayName}</span>
                      </Button>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
                <Button
                  variant="destructive"
                  className="self-start"
                  onClick={() => {
                    match.adjust({ field: "unattributedGoals", delta: -1, teamId: team.id });
                    if (team.unattributedGoals <= 1) setAssignFor(null);
                  }}
                >
                  <MinusIcon data-icon="inline-start" aria-hidden="true" />
                  No fue gol: restar uno
                </Button>
              </SheetBody>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      <Sheet open={fixing} onOpenChange={setFixing}>
        <SheetContent side="bottom" className="dark max-h-[85dvh]">
          <SheetHeader>
            <SheetTitle>Corregir goles con autor</SheetTitle>
            <SheetDescription>Cada toque resta un gol del marcador.</SheetDescription>
          </SheetHeader>
          <SheetBody className="flex flex-col gap-4">
            {fixRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">Todavía no hay goles con autor.</p>
            ) : null}
            {fixRows.map((row) => (
              <Button
                key={row.key}
                variant="outline"
                className="h-auto min-h-14 justify-between gap-3 px-3 py-2 text-left whitespace-normal"
                onClick={() => match.adjust({ ...row.action, delta: -1 })}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <TeamDot team={row.team} />
                  <span className="line-clamp-2">{row.label}</span>
                </span>
                <span className="flex shrink-0 items-center gap-1 text-sm text-destructive tabular-nums">
                  <MinusIcon aria-hidden="true" />
                  {row.count}
                </span>
              </Button>
            ))}
          </SheetBody>
        </SheetContent>
      </Sheet>
    </div>
  );
}

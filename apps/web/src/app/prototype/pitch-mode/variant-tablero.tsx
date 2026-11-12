"use client";

import { Button } from "@hay-fulbo/ui/components/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@hay-fulbo/ui/components/collapsible";
import { cn } from "@hay-fulbo/ui/lib/utils";
import { ArrowLeftIcon, ChevronDownIcon, MinusIcon, PlusIcon } from "lucide-react";
import { useState } from "react";

import type { Adjust, PitchMatch, Team } from "./pitch-data";
import { PitchHeader, TeamDot, UndoBar } from "./parts";

// Variant 2 — "Tablero": two giant Gol buttons in the thumb zone; the author is a
// full-screen step (no sheet), players first, own goals folded away.

type Step = { teamId: string; delta: 1 | -1 } | null;

export function VariantTablero({ match }: { match: PitchMatch }) {
  const [step, setStep] = useState<Step>(null);
  const [fixing, setFixing] = useState(false);
  const [t1, t2] = match.teams as [Team, Team];

  if (step) {
    return (
      <Shell>
        <AuthorStep
          match={match}
          step={step}
          onDone={() => {
            setStep(null);
            setFixing(false);
          }}
        />
      </Shell>
    );
  }

  return (
    <Shell>
      <PitchHeader
        hint={fixing ? "Elegí el equipo al que le restás" : "Tocá Gol y elegí quién la hizo"}
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
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col">
        <section
          aria-label="Marcador"
          className="grid flex-1 grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 py-6"
        >
          {[t1, t2].map((team, i) => (
            <div
              key={team.id}
              className={cn("flex min-w-0 flex-col items-center gap-3", i === 1 && "col-start-3")}
            >
              <h2 className="flex max-w-full items-center gap-2 text-base font-semibold">
                <TeamDot team={team} />
                <span className="truncate">{team.displayName}</span>
              </h2>
              <output
                aria-label={`Marcador de ${team.displayName}`}
                className="text-8xl leading-none font-black tabular-nums sm:text-9xl"
              >
                {match.score(team.id)}
              </output>
            </div>
          ))}
          <span
            aria-hidden="true"
            className="col-start-2 row-start-1 pt-9 text-4xl font-black text-muted-foreground"
          >
            –
          </span>
        </section>

        <UndoBar last={match.last} onUndo={match.undo} className="border-b-0 bg-transparent" />

        <div className="grid grid-cols-2 gap-3 px-3 pt-1 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {[t1, t2].map((team) =>
            fixing ? (
              <Button
                key={team.id}
                variant="destructive"
                disabled={match.score(team.id) === 0}
                className="h-36 flex-col gap-1 rounded-xl text-xl sm:h-40"
                onClick={() => setStep({ teamId: team.id, delta: -1 })}
              >
                <MinusIcon className="size-7" aria-hidden="true" />
                Restar
                <span className="max-w-full truncate text-sm font-medium">{team.displayName}</span>
              </Button>
            ) : (
              <Button
                key={team.id}
                variant={team.slot === 1 ? "team-blue" : "team-amber"}
                className="h-36 flex-col gap-1 rounded-xl text-2xl font-bold sm:h-40"
                onClick={() => setStep({ teamId: team.id, delta: 1 })}
              >
                <PlusIcon className="size-7" aria-hidden="true" />
                Gol
                <span className="max-w-full truncate text-sm font-medium">{team.displayName}</span>
              </Button>
            ),
          )}
        </div>
      </main>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="dark fixed inset-0 z-50 flex touch-manipulation flex-col overflow-auto bg-background text-foreground">
      {children}
    </div>
  );
}

function AuthorStep({
  match,
  step,
  onDone,
}: {
  match: PitchMatch;
  step: NonNullable<Step>;
  onDone: () => void;
}) {
  const team = match.teams.find((t) => t.id === step.teamId)!;
  const rival = match.teams.find((t) => t.id !== step.teamId)!;
  const adding = step.delta === 1;
  const players = team.appearances.filter((r) => adding || r.goals > 0);
  const owns = rival.appearances.filter((r) => adding || r.ownGoals > 0);
  const pick = (action: Omit<Adjust, "delta">) => {
    match.adjust({ ...action, delta: step.delta });
    onDone();
  };

  return (
    <>
      <header className="flex shrink-0 items-center gap-3 border-b px-3 py-2 sm:px-6">
        <Button size="sm" variant="ghost" onClick={onDone}>
          <ArrowLeftIcon data-icon="inline-start" aria-hidden="true" />
          Volver
        </Button>
        <h1 className="flex min-w-0 items-center gap-2 text-base font-semibold">
          <TeamDot team={team} />
          <span className="truncate">
            {adding ? "¿Quién la hizo?" : "¿Qué gol restás?"} · {team.displayName}
          </span>
        </h1>
      </header>

      {/* Anchored to the bottom: the choices grow up from the thumb, not down from the notch. */}
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-end gap-3 px-3 pt-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {players.length > 0 ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {players.map((r) => (
              <Tile
                key={r.playerId}
                label={r.playerDisplayName}
                count={r.goals}
                minus={!adding}
                onClick={() => pick({ field: "goals", playerId: r.playerId })}
              />
            ))}
          </div>
        ) : null}

        {adding || team.unattributedGoals > 0 ? (
          <Tile
            label="Sin autor"
            count={team.unattributedGoals}
            minus={!adding}
            quiet
            onClick={() => pick({ field: "unattributedGoals", teamId: team.id })}
          />
        ) : null}

        {owns.length > 0 ? (
          <Collapsible defaultOpen={!adding}>
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
            <CollapsibleContent className="grid grid-cols-2 gap-2 pt-2 sm:grid-cols-3">
              {owns.map((r) => (
                <Tile
                  key={r.playerId}
                  label={r.playerDisplayName}
                  count={r.ownGoals}
                  minus={!adding}
                  quiet
                  onClick={() => pick({ field: "ownGoals", playerId: r.playerId })}
                />
              ))}
            </CollapsibleContent>
          </Collapsible>
        ) : null}

        {!adding && players.length === 0 && owns.length === 0 && team.unattributedGoals === 0 ? (
          <p className="text-sm text-muted-foreground">No quedan goles para restar.</p>
        ) : null}
      </main>
    </>
  );
}

function Tile({
  label,
  count,
  minus,
  quiet = false,
  onClick,
}: {
  label: string;
  count: number;
  minus: boolean;
  quiet?: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      variant={quiet ? "ghost" : "outline"}
      onClick={onClick}
      className={cn(
        "h-auto min-h-16 w-full justify-between gap-3 px-4 py-3 text-left text-base whitespace-normal",
        quiet && "border-dashed border-border",
      )}
    >
      <span className="line-clamp-2 min-w-0">{label}</span>
      {count > 0 || minus ? (
        <span className="flex shrink-0 items-center gap-1 text-sm text-muted-foreground tabular-nums">
          {minus ? <MinusIcon aria-hidden="true" /> : null}
          {count}
        </span>
      ) : null}
    </Button>
  );
}

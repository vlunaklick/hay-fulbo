"use client";

import { Button } from "@hay-fulbo/ui/components/button";
import { cn } from "@hay-fulbo/ui/lib/utils";
import { ArrowLeftIcon, Maximize2Icon, Undo2Icon } from "lucide-react";
import type { ReactNode } from "react";

import type { LastAction, Team } from "./pitch-data";

async function toggleFullscreen() {
  if (document.fullscreenElement) await document.exitFullscreen();
  else await document.documentElement.requestFullscreen();
}

export function PitchHeader({ hint, action }: { hint?: string; action?: ReactNode }) {
  return (
    <header className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-3 border-b px-3 py-1 sm:px-6">
      <Button className="justify-self-start" size="sm" variant="ghost">
        <ArrowLeftIcon data-icon="inline-start" aria-hidden="true" />
        Salir
      </Button>
      <div className="min-w-0 text-center">
        <h1 className="text-sm font-semibold">Modo cancha</h1>
        {hint ? <p className="truncate text-xs text-muted-foreground">{hint}</p> : null}
      </div>
      <div className="flex items-center gap-1 justify-self-end">
        {action}
        <Button
          aria-label="Alternar pantalla completa"
          onClick={toggleFullscreen}
          size="icon-sm"
          variant="ghost"
        >
          <Maximize2Icon aria-hidden="true" />
        </Button>
      </div>
    </header>
  );
}

export function TeamDot({ team, className }: { team: Team; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "size-2.5 shrink-0 rounded-full",
        team.slot === 1 ? "bg-team-blue" : "bg-team-amber",
        className,
      )}
    />
  );
}

/** The last change, always one tap from being undone. Persistent: no timer to race in the sun. */
export function UndoBar({
  last,
  onUndo,
  className,
}: {
  last: LastAction | null;
  onUndo: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn("flex min-h-14 items-center gap-3 border-t bg-card px-4 py-2", className)}
      aria-live="polite"
    >
      <p className="min-w-0 flex-1 truncate text-sm">
        {last ? (
          <>
            <span className="text-muted-foreground">Último: </span>
            {last.label}
          </>
        ) : (
          <span className="text-muted-foreground">Todavía no cargaste nada en esta sesión</span>
        )}
      </p>
      {last ? (
        <Button onClick={onUndo} variant="outline">
          <Undo2Icon data-icon="inline-start" aria-hidden="true" />
          Deshacer
        </Button>
      ) : null}
    </div>
  );
}

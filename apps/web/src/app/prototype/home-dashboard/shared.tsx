"use client";

// PROTOTYPE ONLY — small pieces every variant reuses so the comparison stays about layout.

import { Alert, AlertDescription, AlertTitle } from "@hay-fulbo/ui/components/alert";
import { Button } from "@hay-fulbo/ui/components/button";
import { Skeleton } from "@hay-fulbo/ui/components/skeleton";
import { cn } from "@hay-fulbo/ui/lib/utils";
import { CalendarDaysIcon, CircleAlertIcon, PlusIcon } from "lucide-react";

import { formatMoney } from "@/lib/format";

import type { DebtState } from "./use-home-data";

export function LoadingState() {
  return (
    <div className="flex flex-col gap-4" aria-label="Cargando inicio">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <Alert variant="destructive">
      <CircleAlertIcon aria-hidden="true" />
      <AlertTitle>No pudimos cargar el inicio</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

export function TeamDot({ slot, className }: { slot: number; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "size-2 shrink-0 rounded-full",
        slot === 1 ? "bg-team-blue" : "bg-team-amber",
        className,
      )}
    />
  );
}

export function NoUpcoming({ canCreate, onCreate }: { canCreate: boolean; onCreate: () => void }) {
  return (
    <section
      aria-label="Próximo partido"
      className="flex flex-col gap-4 rounded-lg border border-dashed p-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex min-w-0 items-start gap-3">
        <CalendarDaysIcon
          className="mt-0.5 size-5 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">No hay próxima fecha</h2>
          <p className="text-sm text-muted-foreground">
            {canCreate
              ? "Creala y empezá a convocar a los jugadores."
              : "Cuando el organizador la cree, va a aparecer acá."}
          </p>
        </div>
      </div>
      {canCreate ? (
        <Button onClick={onCreate} className="shrink-0 max-sm:w-full">
          <PlusIcon data-icon="inline-start" aria-hidden="true" />
          Crear próximo partido
        </Button>
      ) : null}
    </section>
  );
}

/** One-line copy for the viewer's contribution, shared so every variant says the same thing. */
export function debtCopy(state: DebtState): { text: string; tone: "owes" | "ok" | "quiet" } {
  switch (state.kind) {
    case "owes":
      return { text: `Te faltan ${formatMoney(state.debt.toString())}`, tone: "owes" };
    case "settled":
      return { text: state.overpaid ? "Pagaste de más" : "Estás al día", tone: "ok" };
    case "unlinked":
      return { text: "Tu cuenta no está vinculada a un jugador", tone: "quiet" };
    case "no-match":
      return { text: "No hay próximo partido", tone: "quiet" };
    case "no-cost":
      return { text: "Costo a definir", tone: "quiet" };
    case "loading":
      return { text: "Cargando tu aporte…", tone: "quiet" };
    case "not-in":
      return { text: "No estás anotado en esta fecha", tone: "quiet" };
    case "error":
      return { text: "No pudimos cargar tu aporte", tone: "quiet" };
  }
}

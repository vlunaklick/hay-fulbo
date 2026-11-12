"use client";

import { Button } from "@hay-fulbo/ui/components/button";
import { Field, FieldError, FieldLabel } from "@hay-fulbo/ui/components/field";
import { Input } from "@hay-fulbo/ui/components/input";
import { Skeleton } from "@hay-fulbo/ui/components/skeleton";
import { Spinner } from "@hay-fulbo/ui/components/spinner";
import { ToggleGroup, ToggleGroupItem } from "@hay-fulbo/ui/components/toggle-group";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CalendarPlusIcon } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { DrillSheet } from "@/components/drill-sheet";
import { formatDayTitle, formatMoney, formatShortWeekday, formatTime } from "@/lib/format";
import {
  groupHabit,
  type ScheduledMatch,
  suggestedDates,
  toLocalInput,
} from "@/lib/match-schedule";
import { queryClient, trpc } from "@/utils/trpc";

type Court = { id: string; name: string; archivedAt: Date | string | null };

/**
 * New match in two taps: the group's next usual dates as one-tap choices, with
 * the court and cost of its latest match. Everything else is edited in the match.
 * Creating navigates to it.
 */
export function QuickCreateForm({
  courts,
  matches,
  now,
  primary = false,
}: {
  courts: readonly Court[];
  matches: readonly ScheduledMatch[];
  now: Date;
  primary?: boolean;
}) {
  const router = useRouter();
  const habit = groupHabit(matches);
  // An archived court can't host new matches; fall back to "a definir".
  const court = courts.find((entry) => entry.id === habit.courtId && !entry.archivedAt) ?? null;
  const courtCostMinor = court ? habit.courtCostMinor : null;
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
        router.push(`/dashboard/partidos/${result.matchId}` as Route);
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
          ...(court ? { courtId: court.id } : {}),
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

      {court ? (
        <p className="text-xs text-muted-foreground">
          En {court.name}
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

/** {@link QuickCreateForm} in a sheet, for screens that don't load the match list. */
export function NewMatchSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const matches = useQuery({ ...trpc.matches.list.queryOptions({ limit: 50 }), enabled: open });
  const directory = useQuery({ ...trpc.matches.directory.queryOptions(), enabled: open });

  return (
    <DrillSheet
      description="Cancha y equipos se completan después."
      onOpenChange={onOpenChange}
      open={open}
      title="Nuevo partido"
    >
      {matches.data && directory.data ? (
        <QuickCreateForm
          courts={directory.data.courts}
          matches={matches.data.map((match) => ({
            ...match,
            scheduledAt: new Date(match.scheduledAt),
          }))}
          now={new Date()}
          primary
        />
      ) : matches.isError || directory.isError ? (
        <p className="text-sm text-destructive">
          {matches.error?.message ?? directory.error?.message}
        </p>
      ) : (
        <Skeleton aria-label="Cargando fechas" className="h-32 w-full" />
      )}
    </DrillSheet>
  );
}

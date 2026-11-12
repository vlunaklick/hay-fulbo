"use client";

import type { StatsFilters } from "@hay-fulbo/db/stats";
import { Button } from "@hay-fulbo/ui/components/button";
import { cn } from "@hay-fulbo/ui/lib/utils";
import { CheckIcon } from "lucide-react";
import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import { DrillRow } from "@/components/next-step";
import { DrillDetail } from "@/components/next-step-layout";

export const STATS_BASE = "/dashboard/estadisticas";

const PERIODS = [
  { value: "all", label: "Siempre" },
  { value: "year", label: "Este año" },
  { value: "30d", label: "Últimos 30 días" },
];

const RESULTS = [
  { value: "all", label: "Cualquier resultado" },
  { value: "decided", label: "Con ganador" },
  { value: "draws", label: "Empates" },
];

type FilterKey = "period" | "court" | "result";

/** Filters live in the URL so every stats subpage reads the same period. */
export function useStatsFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const period = searchParams.get("period") ?? "all";
  const court = searchParams.get("court") ?? "all";
  const result = searchParams.get("result") ?? "all";
  const api = useMemo<StatsFilters>(
    () => ({
      ...periodDates(period),
      courtId: court === "all" ? undefined : court,
      result: result === "draws" || result === "decided" ? result : "all",
    }),
    [court, period, result],
  );
  const query = filterQuery(searchParams);

  function replace(params: URLSearchParams) {
    const next = params.toString();
    router.replace((next ? `${pathname}?${next}` : pathname) as Route, { scroll: false });
  }

  return {
    active: period !== "all" || court !== "all" || result !== "all",
    api,
    court,
    period,
    periodLabel: PERIODS.find((item) => item.value === period)?.label ?? "Siempre",
    query,
    result,
    /** Builds a stats link that keeps the current filters. */
    href: (path: string) => `${path}${query ? `?${query}` : ""}` as Route,
    reset: () => replace(new URLSearchParams()),
    set(key: FilterKey, value: string) {
      const next = new URLSearchParams(query);
      if (value === "all") next.delete(key);
      else next.set(key, value);
      replace(next);
    },
  };
}

export type StatsFilterState = ReturnType<typeof useStatsFilters>;

/**
 * "Período: Siempre ›": the filters are a row, not a toolbar. The row opens one
 * DrillDetail (bottom sheet on mobile, right column on desktop) with period,
 * court and result.
 */
export function StatsFilterRow({
  courts,
  filters,
  onOpenChange,
  open: controlledOpen,
}: {
  courts: readonly { id: string; name: string }[];
  filters: StatsFilterState;
  /** Controlled by pages that keep one detail open at a time. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [localOpen, setLocalOpen] = useState(false);
  const open = controlledOpen ?? localOpen;
  const setOpen = onOpenChange ?? setLocalOpen;
  const extra = (filters.court !== "all" ? 1 : 0) + (filters.result !== "all" ? 1 : 0);
  const value = extra
    ? `${filters.periodLabel} · +${extra} ${extra === 1 ? "filtro" : "filtros"}`
    : filters.periodLabel;

  return (
    <>
      <DrillRow label="Período" onClick={() => setOpen(true)} selected={open} value={value} />
      <DrillDetail
        description="Solo cuentan partidos cerrados."
        onOpenChange={setOpen}
        open={open}
        title="Filtrar estadísticas"
      >
        <div className="flex flex-col gap-6">
          <ChoiceList
            label="Período"
            onChange={(next) => filters.set("period", next)}
            options={PERIODS}
            value={filters.period}
          />
          <ChoiceList
            label="Cancha"
            onChange={(next) => filters.set("court", next)}
            options={[
              { value: "all", label: "Todas las canchas" },
              ...courts.map((court) => ({ value: court.id, label: court.name })),
            ]}
            value={filters.court}
          />
          <ChoiceList
            label="Resultado"
            onChange={(next) => filters.set("result", next)}
            options={RESULTS}
            value={filters.result}
          />
          <div className="flex gap-2">
            <Button className="flex-1" onClick={() => setOpen(false)}>
              Ver resultados
            </Button>
            {filters.active ? (
              <Button onClick={filters.reset} variant="ghost">
                Limpiar
              </Button>
            ) : null}
          </div>
        </div>
      </DrillDetail>
    </>
  );
}

function ChoiceList({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  value: string;
}) {
  return (
    <fieldset className="flex flex-col">
      <legend className="mb-2 text-xs font-medium text-muted-foreground">{label}</legend>
      <div className="flex flex-col divide-y rounded-lg border">
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <button
              key={option.value}
              aria-pressed={selected}
              className="flex min-h-11 items-center justify-between gap-3 px-3 py-2 text-left text-sm transition-colors duration-150 ease-out first:rounded-t-lg last:rounded-b-lg hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50"
              onClick={() => onChange(option.value)}
              type="button"
            >
              <span className={cn("min-w-0", selected && "font-semibold")}>{option.label}</span>
              {selected ? (
                <CheckIcon aria-hidden="true" className="size-4 shrink-0 text-primary-text" />
              ) : null}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Only the filter params travel between stats pages (drops legacy `tab`). */
function filterQuery(searchParams: URLSearchParams | { get(key: string): string | null }) {
  const params = new URLSearchParams();
  for (const key of ["period", "court", "result"] as const) {
    const value = searchParams.get(key);
    if (value && value !== "all") params.set(key, value);
  }
  return params.toString();
}

function periodDates(period: string): Pick<StatsFilters, "from" | "to"> {
  const today = new Date();
  if (period === "30d") {
    const from = new Date(today);
    from.setDate(from.getDate() - 29);
    return { from: isoLocalDate(from), to: isoLocalDate(today) };
  }
  if (period === "year") {
    return { from: `${today.getFullYear()}-01-01`, to: isoLocalDate(today) };
  }
  return {};
}

function isoLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

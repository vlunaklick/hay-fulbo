"use client";

import { Badge } from "@hay-fulbo/ui/components/badge";
import { Button } from "@hay-fulbo/ui/components/button";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@hay-fulbo/ui/components/sheet";
import { Tabs, TabsList, TabsTrigger } from "@hay-fulbo/ui/components/tabs";
import { useIsMobile } from "@hay-fulbo/ui/hooks/use-mobile";
import { cn } from "@hay-fulbo/ui/lib/utils";
import { CheckIcon, SlidersHorizontalIcon } from "lucide-react";
import { useState } from "react";

export type StatsFilterValues = {
  period: string;
  court: string;
  result: string;
  active: boolean;
  set: (key: "period" | "court" | "result", value: string) => void;
  reset: () => void;
};

const PERIODS = [
  { value: "all", label: "Siempre" },
  { value: "year", label: "Este año" },
  { value: "30d", label: "30 días" },
];

const RESULTS = [
  { value: "all", label: "Cualquier resultado" },
  { value: "decided", label: "Con ganador" },
  { value: "draws", label: "Empates" },
];

/**
 * Period is the filter people change, so it stays one tap away. Court and result
 * are changed rarely and live behind one button with a count.
 */
export function StatsFilters({
  courts,
  filters,
}: {
  courts: readonly { id: string; name: string }[];
  filters: StatsFilterValues;
}) {
  const [open, setOpen] = useState(false);
  const mobile = useIsMobile();
  const count = (filters.court !== "all" ? 1 : 0) + (filters.result !== "all" ? 1 : 0);

  return (
    <section aria-label="Filtros de estadísticas" className="flex items-center gap-2">
      <Tabs value={filters.period} onValueChange={(value) => filters.set("period", String(value))}>
        <TabsList aria-label="Período">
          {PERIODS.map((period) => (
            <TabsTrigger key={period.value} value={period.value} className="h-9 px-3">
              {period.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <Button
        aria-label={count ? `Más filtros (${count} activos)` : "Más filtros"}
        onClick={() => setOpen(true)}
        size="icon"
        variant="outline"
        className="relative"
      >
        <SlidersHorizontalIcon aria-hidden="true" />
        {count ? (
          <Badge className="absolute -right-1.5 -top-1.5 tabular-nums" variant="secondary">
            {count}
          </Badge>
        ) : null}
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side={mobile ? "bottom" : "right"} className="max-h-[85dvh] sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Filtrar estadísticas</SheetTitle>
            <SheetDescription>Solo cuentan partidos cerrados.</SheetDescription>
          </SheetHeader>
          <SheetBody className="flex flex-col gap-6">
            <ChoiceList
              label="Cancha"
              onChange={(value) => filters.set("court", value)}
              options={[
                { value: "all", label: "Todas las canchas" },
                ...courts.map((court) => ({ value: court.id, label: court.name })),
              ]}
              value={filters.court}
            />
            <ChoiceList
              label="Resultado"
              onChange={(value) => filters.set("result", value)}
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
          </SheetBody>
        </SheetContent>
      </Sheet>
    </section>
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

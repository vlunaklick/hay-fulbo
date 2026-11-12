"use client";

// Al toque — the page exists to get you to the court. Directions and the
// address are one tap away on every row; details and editing live in a sheet.
import { Button } from "@hay-fulbo/ui/components/button";
import { Card } from "@hay-fulbo/ui/components/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@hay-fulbo/ui/components/collapsible";
import { FieldGroup } from "@hay-fulbo/ui/components/field";
import { Separator } from "@hay-fulbo/ui/components/separator";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@hay-fulbo/ui/components/sheet";
import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  CalendarClockIcon,
  ChevronDownIcon,
  MapPinIcon,
  NavigationIcon,
  PencilIcon,
  PlusIcon,
} from "lucide-react";
import { Fragment, useState } from "react";

import { PageHeader } from "@/components/page-header";
import { formatDate, formatMoney, formatShortDate } from "@/lib/format";

import type { CourtSummary } from "./data";
import {
  CopyAddressButton,
  CourtFields,
  EMPTY_VALUES,
  isValid,
  relativeDays,
  type CourtValues,
  useIsDesktop,
  type VariantProps,
} from "./shared";

function byUse(a: CourtSummary, b: CourtSummary) {
  return b.played - a.played || a.name.localeCompare(b.name, "es-AR");
}

export function VariantAlToque({ courts, canManage, save, toggleArchive }: VariantProps) {
  const [sheet, setSheet] = useState<{ mode: "view" | "edit" | "new"; id: string | null } | null>(
    null,
  );
  const active = courts.filter((court) => !court.archivedAt).sort(byUse);
  const archived = courts.filter((court) => court.archivedAt).sort(byUse);
  const next = active
    .filter((court) => court.next)
    .sort((a, b) => a.next!.at.localeCompare(b.next!.at))[0];
  const selected = courts.find((court) => court.id === sheet?.id) ?? null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Canchas"
        description="Tocá el pin para ir. Las que más usan, arriba."
        actions={
          canManage ? (
            <Button variant="outline" onClick={() => setSheet({ mode: "new", id: null })}>
              <PlusIcon data-icon="inline-start" aria-hidden="true" />
              Nueva cancha
            </Button>
          ) : null
        }
      />

      {courts.length === 0 ? (
        <EmptyRow canManage={canManage} onCreate={() => setSheet({ mode: "new", id: null })} />
      ) : (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
          {next ? (
            <section
              aria-labelledby="toque-next"
              className="lg:sticky lg:top-8 lg:col-start-2 lg:row-start-1"
            >
              <Card className="gap-4 p-4">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <CalendarClockIcon className="size-4" aria-hidden="true" />
                  <h2 id="toque-next">
                    Próximo partido · <span className="tabular-nums">{formatDate(next.next!.at)}</span>
                  </h2>
                </div>
                <div className="flex min-w-0 flex-col gap-1">
                  <p className="text-lg font-bold text-balance">{next.name}</p>
                  <p className="text-sm text-muted-foreground">{next.address}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    nativeButton={false}
                    render={<a href={next.mapsUrl} target="_blank" rel="noreferrer" />}
                  >
                    <NavigationIcon data-icon="inline-start" aria-hidden="true" />
                    Cómo llegar
                  </Button>
                  <CopyAddressButton address={next.address} name={next.name} variant="outline" />
                </div>
              </Card>
            </section>
          ) : null}

          <div className="flex min-w-0 flex-col gap-6 lg:col-start-1 lg:row-start-1">
            {active.length ? (
              <section aria-labelledby="toque-all" className="flex flex-col gap-3">
                <h2 id="toque-all" className="text-base font-semibold">
                  Activas <span className="text-muted-foreground tabular-nums">{active.length}</span>
                </h2>
                <CourtList
                  courts={active}
                  onOpen={(id) => setSheet({ mode: "view", id })}
                />
              </section>
            ) : null}

            {archived.length ? (
              <Collapsible className="flex flex-col gap-3">
                <CollapsibleTrigger
                  render={
                    <Button variant="ghost" className="group/archived -mx-3 w-fit text-muted-foreground" />
                  }
                >
                  Archivadas <span className="tabular-nums">{archived.length}</span>
                  <ChevronDownIcon
                    data-icon="inline-end"
                    aria-hidden="true"
                    className="transition-transform duration-150 ease-out group-aria-expanded/archived:rotate-180 motion-reduce:transition-none"
                  />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CourtList
                    courts={archived}
                    onOpen={(id) => setSheet({ mode: "view", id })}
                  />
                </CollapsibleContent>
              </Collapsible>
            ) : null}
          </div>
        </div>
      )}

      <CourtSheet
        key={`${sheet?.mode}-${sheet?.id}`}
        canManage={canManage}
        court={selected}
        mode={sheet?.mode ?? "view"}
        open={Boolean(sheet)}
        onClose={() => setSheet(null)}
        onEdit={() => setSheet((current) => (current ? { ...current, mode: "edit" } : current))}
        onSave={(values) => {
          save(sheet?.mode === "new" ? null : (selected?.id ?? null), values);
          setSheet(null);
        }}
        onArchive={() => {
          if (selected) toggleArchive(selected.id);
          setSheet(null);
        }}
      />
    </div>
  );
}

function CourtList({ courts, onOpen }: { courts: CourtSummary[]; onOpen: (id: string) => void }) {
  return (
    <Card className="gap-0 py-0">
      {courts.map((court, index) => (
        <Fragment key={court.id}>
          {index > 0 ? <Separator /> : null}
          <div className="flex items-center gap-1 pr-2">
            <Button
              aria-label={`Ver ${court.name}`}
              className="h-auto min-h-16 min-w-0 flex-1 justify-start rounded-none py-3 pl-4 text-left font-normal whitespace-normal"
              onClick={() => onOpen(court.id)}
              variant="ghost"
            >
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate text-sm font-semibold">{court.name}</span>
                <span className="truncate text-xs text-muted-foreground">{court.address}</span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {court.next ? (
                    <span className="font-medium text-foreground">
                      Próximo {formatShortDate(court.next.at)} ·{" "}
                    </span>
                  ) : null}
                  {court.played
                    ? `${court.played} ${court.played === 1 ? "partido" : "partidos"} · último ${relativeDays(court.lastPlayed!.at)}`
                    : "Todavía sin partidos"}
                </span>
              </span>
            </Button>
            <CopyAddressButton address={court.address} name={court.name} />
            <Button
              aria-label={`Cómo llegar a ${court.name}`}
              nativeButton={false}
              render={<a href={court.mapsUrl} target="_blank" rel="noreferrer" />}
              size="icon"
              variant="ghost"
              className="text-primary-text"
            >
              <NavigationIcon aria-hidden="true" />
            </Button>
          </div>
        </Fragment>
      ))}
    </Card>
  );
}

function CourtSheet({
  court,
  canManage,
  mode,
  open,
  onClose,
  onEdit,
  onSave,
  onArchive,
}: {
  court: CourtSummary | null;
  canManage: boolean;
  mode: "view" | "edit" | "new";
  open: boolean;
  onClose: () => void;
  onEdit: () => void;
  onSave: (values: CourtValues) => void;
  onArchive: () => void;
}) {
  const isDesktop = useIsDesktop();
  const [values, setValues] = useState<CourtValues>(
    court && mode !== "new"
      ? { name: court.name, address: court.address, mapsUrl: court.mapsUrl }
      : EMPTY_VALUES,
  );
  const editing = mode === "edit" || mode === "new";

  return (
    <Sheet open={open} onOpenChange={(next) => (next ? null : onClose())}>
      <SheetContent
        side={isDesktop ? "right" : "bottom"}
        className="max-h-[92dvh] md:max-h-none md:max-w-md"
      >
        <SheetHeader>
          <SheetTitle className="text-balance">
            {mode === "new" ? "Nueva cancha" : (court?.name ?? "")}
          </SheetTitle>
          <SheetDescription>
            {mode === "new"
              ? "La vas a poder elegir al crear un partido."
              : court?.archivedAt
                ? "Archivada · no aparece al crear partidos."
                : court?.address}
          </SheetDescription>
        </SheetHeader>

        {editing ? (
          <form
            className="contents"
            onSubmit={(event) => {
              event.preventDefault();
              if (isValid(values)) onSave(values);
            }}
          >
            <SheetBody>
              <FieldGroup>
                <CourtFields
                  values={values}
                  onChange={setValues}
                  prefix="toque"
                  autoFocus={mode === "new"}
                />
              </FieldGroup>
            </SheetBody>
            <SheetFooter className="pb-[max(1rem,env(safe-area-inset-bottom))]">
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" className="sm:ml-auto" disabled={!isValid(values)}>
                {mode === "new" ? "Guardar cancha" : "Guardar cambios"}
              </Button>
            </SheetFooter>
          </form>
        ) : court ? (
          <>
            <SheetBody className="flex flex-col gap-6">
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  nativeButton={false}
                  render={<a href={court.mapsUrl} target="_blank" rel="noreferrer" />}
                >
                  <NavigationIcon data-icon="inline-start" aria-hidden="true" />
                  Cómo llegar
                </Button>
                <CopyAddressButton address={court.address} name={court.name} variant="outline" />
              </div>
              {court.archivedAt ? (
                <p className="text-sm text-muted-foreground">{court.address}</p>
              ) : null}
              <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
                <Fact label="Partidos jugados" value={court.played || "—"} />
                <Fact
                  label="Último costo"
                  value={court.lastCostMinor ? formatMoney(court.lastCostMinor) : "—"}
                />
                <Fact
                  label="Último partido"
                  value={court.lastPlayed ? formatShortDate(court.lastPlayed.at) : "—"}
                />
                <Fact
                  label="Próximo"
                  value={court.next ? formatShortDate(court.next.at) : "—"}
                />
              </dl>
            </SheetBody>
            {canManage ? (
              <SheetFooter className="pb-[max(1rem,env(safe-area-inset-bottom))]">
                <Button variant="outline" onClick={onEdit}>
                  <PencilIcon data-icon="inline-start" aria-hidden="true" />
                  Editar datos
                </Button>
                <Button variant="ghost" className="sm:ml-auto" onClick={onArchive}>
                  {court.archivedAt ? (
                    <ArchiveRestoreIcon data-icon="inline-start" aria-hidden="true" />
                  ) : (
                    <ArchiveIcon data-icon="inline-start" aria-hidden="true" />
                  )}
                  {court.archivedAt ? "Reactivar" : "Archivar"}
                </Button>
              </SheetFooter>
            ) : null}
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  const empty = value === "—";
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd
        className={
          empty
            ? "text-lg font-semibold text-muted-foreground"
            : "text-lg font-semibold tabular-nums"
        }
      >
        {value}
      </dd>
    </div>
  );
}

function EmptyRow({ canManage, onCreate }: { canManage: boolean; onCreate: () => void }) {
  return (
    <div className="flex flex-col items-start gap-4 rounded-lg border border-dashed p-4 sm:flex-row sm:items-center">
      <MapPinIcon className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="text-sm font-medium">Todavía no hay canchas</p>
        <p className="text-sm text-muted-foreground">
          {canManage
            ? "Guardá dónde juegan para que todos lleguen con un toque."
            : "Cuando el organizador cargue una, vas a ver cómo llegar desde acá."}
        </p>
      </div>
      {canManage ? (
        <Button onClick={onCreate}>
          <PlusIcon data-icon="inline-start" aria-hidden="true" />
          Nueva cancha
        </Button>
      ) : null}
    </div>
  );
}

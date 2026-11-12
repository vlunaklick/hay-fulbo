"use client";

// Libreta — each court is a record with history: how often you play there,
// when you last went and what it cost. Master-detail on desktop.
import { Badge } from "@hay-fulbo/ui/components/badge";
import { Button } from "@hay-fulbo/ui/components/button";
import { Card } from "@hay-fulbo/ui/components/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@hay-fulbo/ui/components/dialog";
import { FieldGroup } from "@hay-fulbo/ui/components/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@hay-fulbo/ui/components/input-group";
import { Separator } from "@hay-fulbo/ui/components/separator";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@hay-fulbo/ui/components/sheet";
import { ToggleGroup, ToggleGroupItem } from "@hay-fulbo/ui/components/toggle-group";
import { cn } from "@hay-fulbo/ui/lib/utils";
import {
  ExternalLinkIcon,
  MapPinIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  SearchXIcon,
  XIcon,
} from "lucide-react";
import { Fragment, useState } from "react";

import { PageHeader } from "@/components/page-header";
import { formatMoney, formatShortDate } from "@/lib/format";

import type { CourtMatch, CourtSummary } from "./data";
import {
  CopyAddressButton,
  CourtFields,
  EMPTY_VALUES,
  isValid,
  relativeDays,
  useIsDesktop,
  type CourtValues,
  type VariantProps,
} from "./shared";

type Sort = "uso" | "recientes" | "nombre";

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLocaleLowerCase("es-AR");
}

function sorter(sort: Sort) {
  return (a: CourtSummary, b: CourtSummary) => {
    if (sort === "uso") return b.played - a.played || a.name.localeCompare(b.name, "es-AR");
    if (sort === "recientes")
      return (b.lastPlayed?.at ?? "").localeCompare(a.lastPlayed?.at ?? "");
    return a.name.localeCompare(b.name, "es-AR");
  };
}

export function VariantLibreta({ courts, canManage, save, toggleArchive }: VariantProps) {
  const isDesktop = useIsDesktop("(min-width: 1024px)");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<Sort>("uso");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<{ id: string | null } | null>(null);

  const query = normalize(search);
  const matches = (court: CourtSummary) =>
    !query || normalize(`${court.name} ${court.address}`).includes(query);
  const active = courts.filter((court) => !court.archivedAt && matches(court)).sort(sorter(sort));
  const archived = courts.filter((court) => court.archivedAt && matches(court)).sort(sorter(sort));
  const visible = [...active, ...archived];
  const selected =
    courts.find((court) => court.id === selectedId) ?? (isDesktop ? visible[0] : undefined);

  const activeAll = courts.filter((court) => !court.archivedAt);
  const totalPlayed = courts.reduce((sum, court) => sum + court.played, 0);
  const mostUsed = [...activeAll].sort(sorter("uso"))[0];
  const editingCourt = courts.find((court) => court.id === editing?.id) ?? null;

  function open(id: string) {
    setSelectedId(id);
    if (!isDesktop) setSheetOpen(true);
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Canchas"
        description="Dónde juegan, cada cuánto y cuánto sale."
        actions={
          canManage ? (
            <Button onClick={() => setEditing({ id: null })}>
              <PlusIcon data-icon="inline-start" aria-hidden="true" />
              Nueva cancha
            </Button>
          ) : null
        }
      />

      {courts.length === 0 ? (
        <div className="flex items-center gap-4 rounded-lg border border-dashed p-4">
          <MapPinIcon className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <div className="flex min-w-0 flex-col gap-0.5">
            <p className="text-sm font-medium">Todavía no hay canchas</p>
            <p className="text-sm text-muted-foreground">
              {canManage
                ? "Cargá la primera y acá se va armando su historial de partidos."
                : "El organizador todavía no cargó canchas."}
            </p>
          </div>
        </div>
      ) : (
        <>
          <Card className="grid grid-cols-3 gap-0 divide-x py-0">
            <Metric label="Activas" value={activeAll.length} />
            <Metric label="Partidos" value={totalPlayed} />
            <Metric label="La más usada" value={mostUsed?.played ? mostUsed.name : "—"} text />
          </Card>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:items-start">
            <section aria-label="Listado de canchas" className="flex min-w-0 flex-col gap-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <InputGroup className="sm:max-w-xs">
                  <InputGroupAddon>
                    <SearchIcon aria-hidden="true" />
                  </InputGroupAddon>
                  <InputGroupInput
                    aria-label="Buscar canchas"
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Nombre o barrio"
                    type="search"
                    value={search}
                  />
                  {search ? (
                    <InputGroupAddon align="inline-end">
                      <InputGroupButton
                        aria-label="Limpiar búsqueda"
                        onClick={() => setSearch("")}
                        size="icon-xs"
                      >
                        <XIcon aria-hidden="true" />
                      </InputGroupButton>
                    </InputGroupAddon>
                  ) : null}
                </InputGroup>
                <ToggleGroup
                  aria-label="Ordenar canchas"
                  spacing={0}
                  variant="outline"
                  value={[sort]}
                  onValueChange={(value) => {
                    if (value[0]) setSort(value[0] as Sort);
                  }}
                >
                  <ToggleGroupItem value="uso">Más usadas</ToggleGroupItem>
                  <ToggleGroupItem value="recientes">Recientes</ToggleGroupItem>
                  <ToggleGroupItem value="nombre">A–Z</ToggleGroupItem>
                </ToggleGroup>
              </div>

              {visible.length === 0 ? (
                <div className="flex flex-col items-start gap-4 rounded-lg border border-dashed p-4 sm:flex-row sm:items-center">
                  <SearchXIcon className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <p className="min-w-0 flex-1 text-sm text-muted-foreground">
                    Ninguna cancha coincide con “{search.trim()}”.
                  </p>
                  <Button variant="outline" onClick={() => setSearch("")}>
                    Limpiar búsqueda
                  </Button>
                </div>
              ) : (
                <Card className="gap-0 py-0">
                  <div
                    className="flex items-center gap-3 border-b px-4 py-2 text-xs font-medium text-muted-foreground"
                    aria-hidden="true"
                  >
                    <span className="flex-1">Cancha</span>
                    <span className="hidden w-20 text-right sm:block">Costo</span>
                    <span className="w-8 text-right">PJ</span>
                    <span className="w-16 text-right">Último</span>
                  </div>
                  {active.map((court, index) => (
                    <Fragment key={court.id}>
                      {index > 0 ? <Separator /> : null}
                      <Row
                        court={court}
                        selected={isDesktop && selected?.id === court.id}
                        onOpen={() => open(court.id)}
                      />
                    </Fragment>
                  ))}
                  {archived.length ? (
                    <>
                      <div className="border-y bg-muted/40 px-4 py-2 text-xs font-medium text-muted-foreground">
                        Archivadas · no aparecen al crear partidos
                      </div>
                      {archived.map((court, index) => (
                        <Fragment key={court.id}>
                          {index > 0 ? <Separator /> : null}
                          <Row
                            court={court}
                            selected={isDesktop && selected?.id === court.id}
                            onOpen={() => open(court.id)}
                          />
                        </Fragment>
                      ))}
                    </>
                  ) : null}
                </Card>
              )}
            </section>

            {isDesktop && selected ? (
              <Card className="sticky top-8 gap-0 p-0">
                <Detail
                  court={selected}
                  canManage={canManage}
                  onEdit={() => setEditing({ id: selected.id })}
                  headingLevel="h2"
                />
              </Card>
            ) : null}
          </div>
        </>
      )}

      {!isDesktop ? (
        <Sheet open={sheetOpen && Boolean(selected)} onOpenChange={setSheetOpen}>
          <SheetContent side="right">
            {selected ? (
              <>
                <SheetHeader>
                  <SheetTitle className="text-balance">{selected.name}</SheetTitle>
                </SheetHeader>
                <SheetBody className="p-0">
                  <Detail
                    court={selected}
                    canManage={canManage}
                    onEdit={() => setEditing({ id: selected.id })}
                    hideTitle
                  />
                </SheetBody>
              </>
            ) : null}
          </SheetContent>
        </Sheet>
      ) : null}

      {editing ? (
        <EditDialog
          key={editing.id ?? "new"}
          court={editingCourt}
          onClose={() => setEditing(null)}
          onSave={(values) => {
            save(editing.id, values);
            setEditing(null);
          }}
          onArchive={() => {
            if (editingCourt) toggleArchive(editingCourt.id);
            setEditing(null);
          }}
        />
      ) : null}
    </div>
  );
}

function Metric({ label, value, text }: { label: string; value: React.ReactNode; text?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 px-4 py-3">
      <span className="truncate text-xs font-medium text-muted-foreground">{label}</span>
      <span
        className={cn(
          "truncate font-semibold",
          text ? "text-sm leading-7" : "text-lg tabular-nums",
          value === "—" && "text-muted-foreground",
        )}
        title={typeof value === "string" ? value : undefined}
      >
        {value}
      </span>
    </div>
  );
}

function Row({
  court,
  selected,
  onOpen,
}: {
  court: CourtSummary;
  selected: boolean;
  onOpen: () => void;
}) {
  return (
    <Button
      aria-current={selected ? "true" : undefined}
      aria-label={`${court.name}: ${court.played} partidos jugados`}
      className={cn(
        "h-auto min-h-14 w-full justify-start gap-3 rounded-none px-4 py-2.5 text-left font-normal whitespace-normal",
        selected && "bg-muted",
        court.archivedAt && "text-muted-foreground",
      )}
      onClick={onOpen}
      variant="ghost"
    >
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-medium">{court.name}</span>
          {court.next ? (
            <Badge variant="outline" className="hidden sm:inline-flex">
              Próximo
            </Badge>
          ) : null}
        </span>
        <span className="truncate text-xs text-muted-foreground">
          {court.next ? (
            <span className="font-medium text-foreground sm:hidden">
              Próximo {formatShortDate(court.next.at)} ·{" "}
            </span>
          ) : null}
          {court.address}
        </span>
      </span>
      <span className="hidden w-20 text-right text-xs text-muted-foreground tabular-nums sm:block">
        {court.lastCostMinor ? formatMoney(court.lastCostMinor) : "—"}
      </span>
      <span
        className={cn(
          "w-8 text-right text-sm font-semibold tabular-nums",
          !court.played && "text-muted-foreground",
        )}
      >
        {court.played || "—"}
      </span>
      <span className="w-16 text-right text-xs text-muted-foreground tabular-nums">
        {court.lastPlayed ? formatShortDate(court.lastPlayed.at) : "—"}
      </span>
    </Button>
  );
}

function Detail({
  court,
  canManage,
  onEdit,
  hideTitle,
  headingLevel: Heading = "h2",
}: {
  court: CourtSummary;
  canManage: boolean;
  onEdit: () => void;
  hideTitle?: boolean;
  headingLevel?: "h2";
}) {
  const history = [...court.matches].sort((a, b) => b.at.localeCompare(a.at));
  const charged = court.matches.filter((match) => match.status === "closed");
  const average = charged.length
    ? Math.round(charged.reduce((sum, match) => sum + match.costMinor, 0) / charged.length)
    : null;

  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-4 p-4">
        {!hideTitle ? (
          <div className="flex flex-col gap-1">
            <Heading className="text-lg font-bold text-balance">{court.name}</Heading>
            {court.archivedAt ? (
              <span className="text-xs text-muted-foreground">
                Archivada {relativeDays(court.archivedAt)}
              </span>
            ) : null}
          </div>
        ) : null}
        <div className="flex items-start gap-2">
          <MapPinIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <p className="min-w-0 flex-1 text-sm">{court.address}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            nativeButton={false}
            render={<a href={court.mapsUrl} target="_blank" rel="noreferrer" />}
            variant="outline"
          >
            <ExternalLinkIcon data-icon="inline-start" aria-hidden="true" />
            Abrir en Maps
          </Button>
          <CopyAddressButton address={court.address} name={court.name} variant="outline" />
          {canManage ? (
            <Button variant="ghost" onClick={onEdit} className="ml-auto">
              <PencilIcon data-icon="inline-start" aria-hidden="true" />
              Editar
            </Button>
          ) : null}
        </div>
      </div>

      <dl className="grid grid-cols-3 divide-x border-y">
        <DetailMetric label="Jugados" value={court.played || "—"} />
        <DetailMetric
          label="Último costo"
          value={court.lastCostMinor ? formatMoney(court.lastCostMinor) : "—"}
        />
        <DetailMetric label="Promedio" value={average ? formatMoney(average) : "—"} />
      </dl>

      <div className="flex flex-col gap-2 p-4">
        <h3 className="text-sm font-semibold">Historial</h3>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no jugaron acá.</p>
        ) : (
          <ol className="flex flex-col">
            {history.map((match, index) => (
              <li key={match.id} className={cn("flex min-h-11 items-center gap-3", index > 0 && "border-t")}>
                <span className="w-14 text-sm tabular-nums">{formatShortDate(match.at)}</span>
                <span className="flex-1">
                  <MatchStatusLabel match={match} />
                </span>
                <span
                  className={cn(
                    "text-right text-xs tabular-nums text-muted-foreground",
                    match.status === "cancelled" && "line-through",
                  )}
                >
                  {formatMoney(match.costMinor)}
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

function MatchStatusLabel({ match }: { match: CourtMatch }) {
  if (match.status === "open") return <Badge variant="outline">Próximo</Badge>;
  if (match.status === "cancelled") return <Badge variant="ghost">Cancelado</Badge>;
  return (
    <span className="text-sm font-semibold tabular-nums">
      {match.score?.[0]} – {match.score?.[1]}
    </span>
  );
}

function DetailMetric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 px-4 py-3">
      <dt className="truncate text-xs font-medium text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "truncate text-base font-semibold tabular-nums",
          value === "—" && "text-muted-foreground",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function EditDialog({
  court,
  onClose,
  onSave,
  onArchive,
}: {
  court: CourtSummary | null;
  onClose: () => void;
  onSave: (values: CourtValues) => void;
  onArchive: () => void;
}) {
  const [values, setValues] = useState<CourtValues>(
    court ? { name: court.name, address: court.address, mapsUrl: court.mapsUrl } : EMPTY_VALUES,
  );
  return (
    <Dialog open onOpenChange={(open) => (open ? null : onClose())}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{court ? "Editar cancha" : "Nueva cancha"}</DialogTitle>
          <DialogDescription>
            {court
              ? "Los partidos anteriores conservan esta cancha."
              : "La vas a poder elegir al crear un partido."}
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (isValid(values)) onSave(values);
          }}
        >
          <FieldGroup>
            <CourtFields values={values} onChange={setValues} prefix="libreta" autoFocus={!court} />
            <DialogFooter className="sm:justify-between">
              {court ? (
                <Button type="button" variant="ghost" onClick={onArchive}>
                  {court.archivedAt ? "Reactivar cancha" : "Archivar cancha"}
                </Button>
              ) : (
                <span />
              )}
              <Button type="submit" disabled={!isValid(values)}>
                {court ? "Guardar cambios" : "Guardar cancha"}
              </Button>
            </DialogFooter>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}

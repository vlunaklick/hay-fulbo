"use client";

// En el lugar — no dialogs, no sheets. A court opens in place: how to get
// there, its history in one line, and (for organizers) its fields, editable
// right where you read them. Adding a court is a row in the same list.
import { Button } from "@hay-fulbo/ui/components/button";
import { Card } from "@hay-fulbo/ui/components/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@hay-fulbo/ui/components/collapsible";
import { FieldGroup } from "@hay-fulbo/ui/components/field";
import { Separator } from "@hay-fulbo/ui/components/separator";
import { Tabs, TabsList, TabsTrigger } from "@hay-fulbo/ui/components/tabs";
import { cn } from "@hay-fulbo/ui/lib/utils";
import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  ChevronDownIcon,
  MapPinIcon,
  NavigationIcon,
  PencilIcon,
  PlusIcon,
} from "lucide-react";
import { Fragment, useState } from "react";

import { PageHeader } from "@/components/page-header";
import { formatDate } from "@/lib/format";

import type { CourtSummary } from "./data";
import {
  byName,
  CopyAddressButton,
  CourtFields,
  EMPTY_VALUES,
  isValid,
  relativeDays,
  type CourtValues,
  type VariantProps,
} from "./shared";

const PANEL =
  "h-(--collapsible-panel-height) overflow-hidden transition-[height] duration-200 ease-out data-ending-style:h-0 data-starting-style:h-0 motion-reduce:transition-none";

export function VariantEnElLugar({ courts, canManage, save, toggleArchive }: VariantProps) {
  const [tab, setTab] = useState<"active" | "archived">("active");
  const [openId, setOpenId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const active = courts.filter((court) => !court.archivedAt).sort(byName);
  const archived = courts.filter((court) => court.archivedAt).sort(byName);
  const list = tab === "active" ? active : archived;
  const adding = openId === "new";

  function toggle(id: string) {
    setEditingId(null);
    setOpenId((current) => (current === id ? null : id));
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Canchas"
        description={
          canManage
            ? "Abrí una cancha para ver cómo llegar o corregir sus datos."
            : "Abrí una cancha para ver cómo llegar."
        }
      />

      {archived.length ? (
        <Tabs
          value={tab}
          onValueChange={(value) => {
            setTab(value as "active" | "archived");
            setOpenId(null);
            setEditingId(null);
          }}
        >
          <TabsList>
            <TabsTrigger value="active">
              Activas <span className="tabular-nums text-muted-foreground">{active.length}</span>
            </TabsTrigger>
            <TabsTrigger value="archived">
              Archivadas{" "}
              <span className="tabular-nums text-muted-foreground">{archived.length}</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      ) : null}

      <Card className="max-w-3xl gap-0 py-0">
        {canManage && tab === "active" ? (
          <Collapsible open={adding} onOpenChange={() => toggle("new")}>
            <CollapsibleTrigger
              render={
                <Button
                  variant="ghost"
                  className={cn(
                    "h-14 w-full justify-start gap-3 rounded-none px-4 text-primary-text",
                    adding && "text-foreground",
                  )}
                />
              }
            >
              <PlusIcon aria-hidden="true" />
              Agregar cancha
            </CollapsibleTrigger>
            <CollapsibleContent className={PANEL}>
              <InlineForm
                key={adding ? "open" : "closed"}
                initial={EMPTY_VALUES}
                prefix="lugar-new"
                submitLabel="Guardar cancha"
                onCancel={() => setOpenId(null)}
                onSave={(values) => {
                  save(null, values);
                  setOpenId(null);
                }}
              />
            </CollapsibleContent>
            {list.length ? <Separator /> : null}
          </Collapsible>
        ) : null}

        {list.length === 0 && !(canManage && tab === "active") ? (
          <div className="flex items-center gap-3 p-4">
            <MapPinIcon className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">
              El organizador todavía no cargó canchas.
            </p>
          </div>
        ) : null}

        {list.map((court, index) => {
          const isOpen = openId === court.id;
          const isEditing = editingId === court.id;
          return (
            <Fragment key={court.id}>
              {index > 0 ? <Separator /> : null}
              <Collapsible open={isOpen} onOpenChange={() => toggle(court.id)}>
                <CollapsibleTrigger
                  render={
                    <Button
                      variant="ghost"
                      className={cn(
                        "group/row h-auto min-h-16 w-full justify-between gap-3 rounded-none px-4 py-3 text-left font-normal whitespace-normal",
                        isOpen && "bg-muted/50",
                      )}
                    />
                  }
                >
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className={cn("text-sm font-semibold", !isOpen && "truncate")}>
                      {court.name}
                    </span>
                    {!isOpen ? (
                      <span className="truncate text-xs text-muted-foreground">
                        {court.address}
                      </span>
                    ) : null}
                  </span>
                  <ChevronDownIcon
                    aria-hidden="true"
                    className="text-muted-foreground transition-transform duration-150 ease-out group-aria-expanded/row:rotate-180 motion-reduce:transition-none"
                  />
                </CollapsibleTrigger>
                <CollapsibleContent className={PANEL}>
                  {isEditing ? (
                    <InlineForm
                      initial={{ name: court.name, address: court.address, mapsUrl: court.mapsUrl }}
                      prefix={`lugar-${court.id}`}
                      submitLabel="Guardar cambios"
                      onCancel={() => setEditingId(null)}
                      onSave={(values) => {
                        save(court.id, values);
                        setEditingId(null);
                      }}
                      archive={{
                        archived: Boolean(court.archivedAt),
                        onToggle: () => {
                          toggleArchive(court.id);
                          setEditingId(null);
                          setOpenId(null);
                        },
                      }}
                    />
                  ) : (
                    <CourtPanel
                      court={court}
                      canManage={canManage}
                      onEdit={() => setEditingId(court.id)}
                    />
                  )}
                </CollapsibleContent>
              </Collapsible>
            </Fragment>
          );
        })}
      </Card>
    </div>
  );
}

function CourtPanel({
  court,
  canManage,
  onEdit,
}: {
  court: CourtSummary;
  canManage: boolean;
  onEdit: () => void;
}) {
  const facts = [
    court.played
      ? `${court.played} ${court.played === 1 ? "partido" : "partidos"} · último ${relativeDays(court.lastPlayed!.at)}`
      : "Todavía sin partidos",
    court.next ? `Próximo: ${formatDate(court.next.at)}` : null,
    court.archivedAt ? `Archivada ${relativeDays(court.archivedAt)}` : null,
  ].filter(Boolean);

  return (
    <div className="flex flex-col gap-4 bg-muted/50 px-4 pb-4">
      <div className="flex flex-col gap-1">
        <p className="text-sm">{court.address}</p>
        {facts.map((fact) => (
          <p key={fact} className="text-xs text-muted-foreground tabular-nums">
            {fact}
          </p>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          className="flex-1 sm:flex-none"
          nativeButton={false}
          render={<a href={court.mapsUrl} target="_blank" rel="noreferrer" />}
        >
          <NavigationIcon data-icon="inline-start" aria-hidden="true" />
          Cómo llegar
        </Button>
        <CopyAddressButton address={court.address} name={court.name} variant="outline" />
        {canManage ? (
          <Button variant="outline" onClick={onEdit}>
            <PencilIcon data-icon="inline-start" aria-hidden="true" />
            Editar
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function InlineForm({
  initial,
  prefix,
  submitLabel,
  onCancel,
  onSave,
  archive,
}: {
  initial: CourtValues;
  prefix: string;
  submitLabel: string;
  onCancel: () => void;
  onSave: (values: CourtValues) => void;
  archive?: { archived: boolean; onToggle: () => void };
}) {
  const [values, setValues] = useState(initial);
  return (
    <form
      className="flex flex-col gap-4 bg-muted/50 px-4 pt-1 pb-4"
      onKeyDown={(event) => {
        if (event.key === "Escape") onCancel();
      }}
      onSubmit={(event) => {
        event.preventDefault();
        if (isValid(values)) onSave(values);
      }}
    >
      <FieldGroup className="md:grid md:grid-cols-2 md:[&>*:last-child]:col-span-2">
        <CourtFields values={values} onChange={setValues} prefix={prefix} autoFocus />
      </FieldGroup>
      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" className="flex-1 sm:flex-none" disabled={!isValid(values)}>
          {submitLabel}
        </Button>
      </div>
      {archive ? (
        <div className="flex items-center gap-3 border-t pt-3">
          <p className="min-w-0 flex-1 text-xs text-muted-foreground">
            {archive.archived
              ? "Reactivala para volver a elegirla en partidos nuevos."
              : "Archivada deja de aparecer en partidos nuevos; el historial no cambia."}
          </p>
          <Button type="button" variant="outline" onClick={archive.onToggle}>
            {archive.archived ? (
              <ArchiveRestoreIcon data-icon="inline-start" aria-hidden="true" />
            ) : (
              <ArchiveIcon data-icon="inline-start" aria-hidden="true" />
            )}
            {archive.archived ? "Reactivar" : "Archivar"}
          </Button>
        </div>
      ) : null}
    </form>
  );
}

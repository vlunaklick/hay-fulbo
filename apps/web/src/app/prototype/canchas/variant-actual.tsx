"use client";

// Baseline: the production /dashboard/canchas markup, unchanged, over mock data.
import { Alert, AlertDescription, AlertTitle } from "@hay-fulbo/ui/components/alert";
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
  DialogTrigger,
} from "@hay-fulbo/ui/components/dialog";
import { FieldGroup } from "@hay-fulbo/ui/components/field";
import { Separator } from "@hay-fulbo/ui/components/separator";
import { CircleAlertIcon, ExternalLinkIcon, MapPinIcon, PlusIcon } from "lucide-react";
import { Fragment, useState } from "react";

import { PageHeader } from "@/components/page-header";

import type { CourtSummary } from "./data";
import { CourtFields, EMPTY_VALUES, isValid, type VariantProps } from "./shared";

export function VariantActual({ courts, canManage, save, toggleArchive }: VariantProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = courts.find((court) => court.id === selectedId) ?? null;
  const ordered = [...courts].sort(
    (a, b) => Number(Boolean(a.archivedAt)) - Number(Boolean(b.archivedAt)),
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Canchas"
        description="Entrá a una cancha para consultar o actualizar sus datos."
        actions={
          canManage ? (
            <CreateDialog
              key={createOpen ? "open" : "closed"}
              open={createOpen}
              onOpenChange={setCreateOpen}
              onSave={(values) => {
                save(null, values);
                setCreateOpen(false);
              }}
            />
          ) : null
        }
      />

      {!canManage ? (
        <Alert>
          <CircleAlertIcon aria-hidden="true" />
          <AlertTitle>Vista de consulta</AlertTitle>
          <AlertDescription>El organizador administra este directorio.</AlertDescription>
        </Alert>
      ) : null}

      {courts.length === 0 ? (
        <div className="flex items-center gap-4 rounded-lg border border-dashed p-4">
          <MapPinIcon className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <div className="flex min-w-0 flex-col gap-0.5">
            <p className="text-sm font-medium">No hay canchas guardadas</p>
            <p className="text-sm text-muted-foreground">
              {canManage
                ? "Usá el botón Agregar para cargar el primero."
                : "El organizador todavía no cargó información."}
            </p>
          </div>
        </div>
      ) : (
        <Card className="gap-0 py-0">
          {ordered.map((court, index) => (
            <Fragment key={court.id}>
              {index > 0 ? <Separator /> : null}
              <Button
                aria-label={`Ver detalle de ${court.name}`}
                className="h-auto min-h-14 w-full justify-between gap-3 rounded-none px-4 py-2 text-left whitespace-normal"
                onClick={() => setSelectedId(court.id)}
                variant="ghost"
              >
                <Row court={court} />
              </Button>
            </Fragment>
          ))}
        </Card>
      )}

      {selected ? (
        <DetailDialog
          key={selected.id}
          canManage={canManage}
          court={selected}
          onArchive={() => {
            toggleArchive(selected.id);
            setSelectedId(null);
          }}
          onClose={() => setSelectedId(null)}
          onSave={(values) => {
            save(selected.id, values);
            setSelectedId(null);
          }}
        />
      ) : null}
    </div>
  );
}

function Row({ court }: { court: CourtSummary }) {
  return (
    <span className="flex min-w-0 flex-1 items-center gap-3">
      <MapPinIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{court.name}</span>
          {court.archivedAt ? <Badge variant="secondary">Archivada</Badge> : null}
        </span>
        <span className="block truncate text-xs text-muted-foreground">{court.address}</span>
      </span>
    </span>
  );
}

function DetailDialog({
  court,
  canManage,
  onArchive,
  onClose,
  onSave,
}: {
  court: CourtSummary;
  canManage: boolean;
  onArchive: () => void;
  onClose: () => void;
  onSave: (values: typeof EMPTY_VALUES) => void;
}) {
  const [values, setValues] = useState({
    name: court.name,
    address: court.address,
    mapsUrl: court.mapsUrl,
  });
  return (
    <Dialog open onOpenChange={(open) => (open ? null : onClose())}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg">{court.name}</DialogTitle>
          <DialogDescription>
            {court.archivedAt ? "Cancha archivada" : "Cancha activa"} · Los partidos históricos
            conservan esta referencia.
          </DialogDescription>
        </DialogHeader>
        {canManage ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (isValid(values)) onSave(values);
            }}
          >
            <FieldGroup>
              <CourtFields values={values} onChange={setValues} prefix="actual-edit" />
              <Button
                nativeButton={false}
                render={<a href={court.mapsUrl} target="_blank" rel="noreferrer" />}
                variant="outline"
              >
                <ExternalLinkIcon data-icon="inline-start" aria-hidden="true" />
                Abrir en Maps
              </Button>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={onArchive}>
                  {court.archivedAt ? "Reactivar cancha" : "Archivar cancha"}
                </Button>
                <Button type="submit" disabled={!isValid(values)}>
                  Guardar cambios
                </Button>
              </DialogFooter>
            </FieldGroup>
          </form>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Dirección</span>
              <span className="text-sm">{court.address}</span>
            </div>
            <Button
              nativeButton={false}
              render={<a href={court.mapsUrl} target="_blank" rel="noreferrer" />}
            >
              <ExternalLinkIcon data-icon="inline-start" aria-hidden="true" />
              Abrir en Maps
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CreateDialog({
  open,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (values: typeof EMPTY_VALUES) => void;
}) {
  const [values, setValues] = useState(EMPTY_VALUES);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger render={<Button />}>
        <PlusIcon data-icon="inline-start" aria-hidden="true" />
        <span className="hidden sm:inline">Nueva cancha</span>
        <span className="sm:hidden">Agregar</span>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva cancha</DialogTitle>
          <DialogDescription>La vas a poder elegir al crear un partido.</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (isValid(values)) onSave(values);
          }}
        >
          <FieldGroup>
            <CourtFields values={values} onChange={setValues} prefix="actual-new" />
            <Button type="submit" disabled={!isValid(values)}>
              Guardar
            </Button>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}

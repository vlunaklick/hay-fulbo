"use client";

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
import { Field, FieldError, FieldGroup, FieldLabel } from "@hay-fulbo/ui/components/field";
import { Input } from "@hay-fulbo/ui/components/input";
import { Separator } from "@hay-fulbo/ui/components/separator";
import { Skeleton } from "@hay-fulbo/ui/components/skeleton";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CircleAlertIcon, ExternalLinkIcon, MapPinIcon, PlusIcon } from "lucide-react";
import { Fragment, useState } from "react";
import { toast } from "sonner";

import { useAppContext } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { queryClient, trpc } from "@/utils/trpc";

type CourtRow = {
  address: string;
  archivedAt: Date | string | null;
  id: string;
  mapsUrl: string;
  name: string;
};

export function CourtsDirectory() {
  const { role } = useAppContext();
  const directory = useQuery(trpc.matches.directory.queryOptions());
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canManage = role !== "member";

  const execute = useMutation(
    trpc.matches.execute.mutationOptions({
      onSuccess: async () => {
        toast.success("Cancha actualizada");
        setCreateOpen(false);
        setSelectedId(null);
        setError(null);
        await queryClient.invalidateQueries({ queryKey: trpc.matches.directory.queryKey() });
      },
      onError: (cause) => {
        setError(cause.message);
        toast.error("No pudimos guardar los cambios", { description: cause.message });
      },
    }),
  );

  const courts: CourtRow[] = directory.data?.courts ?? [];
  const selectedCourt = courts.find((court) => court.id === selectedId) ?? null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Canchas"
        description="Entrá a una cancha para consultar o actualizar sus datos."
        actions={
          canManage ? (
            <CreateCourtDialog
              key={createOpen ? "open" : "closed"}
              error={error}
              isPending={execute.isPending}
              onOpenChange={(open) => {
                setCreateOpen(open);
                setError(null);
              }}
              onSave={(input) => {
                setError(null);
                execute.mutate({ type: "upsertCourt", ...input });
              }}
              open={createOpen}
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

      {directory.isPending ? (
        <div className="flex flex-col">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton
              key={index}
              className="h-14 w-full rounded-none first:rounded-t-md last:rounded-b-md"
            />
          ))}
        </div>
      ) : directory.isError ? (
        <Alert variant="destructive">
          <CircleAlertIcon aria-hidden="true" />
          <AlertTitle>No pudimos cargar el directorio</AlertTitle>
          <AlertDescription>{directory.error.message}</AlertDescription>
        </Alert>
      ) : courts.length === 0 ? (
        <div className="flex items-center gap-4 rounded-lg border border-dashed p-4">
          <MapPinIcon className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <div className="flex min-w-0 flex-col gap-0.5">
            <p className="text-sm font-medium">No hay canchas guardadas</p>
            <p className="text-sm text-muted-foreground">
              {canManage
                ? "Usá el botón Agregar para cargar la primera."
                : "El organizador todavía no cargó información."}
            </p>
          </div>
        </div>
      ) : (
        <Card className="gap-0 py-0">
          {courts.map((court, index) => (
            <Fragment key={court.id}>
              {index > 0 ? <Separator /> : null}
              <Button
                aria-label={`Ver detalle de ${court.name}`}
                className="h-auto min-h-14 w-full justify-between gap-3 rounded-none px-4 py-2 text-left whitespace-normal"
                onClick={() => {
                  setError(null);
                  setSelectedId(court.id);
                }}
                variant="ghost"
              >
                <CourtRow court={court} />
              </Button>
            </Fragment>
          ))}
        </Card>
      )}

      {selectedCourt ? (
        <CourtDialog
          key={selectedCourt.id}
          court={selectedCourt}
          error={error}
          isPending={execute.isPending}
          onArchive={() => {
            setError(null);
            execute.mutate({
              type: "archiveCourt",
              courtId: selectedCourt.id,
              archived: !selectedCourt.archivedAt,
            });
          }}
          onOpenChange={(open) => {
            if (!open) setSelectedId(null);
            setError(null);
          }}
          onSave={({ address, mapsUrl, name }) => {
            setError(null);
            execute.mutate({
              type: "upsertCourt",
              address,
              courtId: selectedCourt.id,
              mapsUrl,
              name,
            });
          }}
          role={role}
        />
      ) : null}
    </div>
  );
}

function CourtRow({ court }: { court: CourtRow }) {
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

function CourtDialog({
  court,
  error,
  isPending,
  onArchive,
  onOpenChange,
  onSave,
  role,
}: {
  court: CourtRow;
  error: string | null;
  isPending: boolean;
  onArchive: () => void;
  onOpenChange: (open: boolean) => void;
  onSave: (input: { address: string; mapsUrl: string; name: string }) => void;
  role: "member" | "leader" | "owner";
}) {
  const [name, setName] = useState(court.name);
  const [address, setAddress] = useState(court.address);
  const [mapsUrl, setMapsUrl] = useState(court.mapsUrl);
  const valid = Boolean(name.trim() && address.trim() && isHttpUrl(mapsUrl));

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!valid) return;
    onSave({ address, mapsUrl, name });
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg">{court.name}</DialogTitle>
          <DialogDescription>
            {court.archivedAt ? "Cancha archivada" : "Cancha activa"} · Los partidos históricos
            conservan esta referencia.
          </DialogDescription>
        </DialogHeader>

        {role !== "member" ? (
          <form onSubmit={submit}>
            <FieldGroup>
              <CourtFields
                address={address}
                mapsUrl={mapsUrl}
                name={name}
                onAddressChange={setAddress}
                onMapsUrlChange={setMapsUrl}
                onNameChange={setName}
                prefix="court-edit"
              />
              <Button
                nativeButton={false}
                render={<a href={court.mapsUrl} target="_blank" rel="noreferrer" />}
                variant="outline"
              >
                <ExternalLinkIcon data-icon="inline-start" aria-hidden="true" />
                Abrir en Maps
              </Button>
              {error ? <FieldError role="alert">{error}</FieldError> : null}
              <DialogFooter>
                <Button type="button" variant="outline" disabled={isPending} onClick={onArchive}>
                  {court.archivedAt ? "Reactivar cancha" : "Archivar cancha"}
                </Button>
                <Button type="submit" disabled={isPending || !valid}>
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

function CreateCourtDialog({
  error,
  isPending,
  onOpenChange,
  onSave,
  open,
}: {
  error: string | null;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (input: { name: string; address: string; mapsUrl: string }) => void;
  open: boolean;
}) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [mapsUrl, setMapsUrl] = useState("");
  const valid = Boolean(name.trim() && address.trim() && isHttpUrl(mapsUrl));

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!valid) return;
    onSave({ name, address, mapsUrl });
  }

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
        <form onSubmit={submit}>
          <FieldGroup>
            <CourtFields
              address={address}
              mapsUrl={mapsUrl}
              name={name}
              onAddressChange={setAddress}
              onMapsUrlChange={setMapsUrl}
              onNameChange={setName}
              prefix="new-court"
            />
            {error ? <FieldError role="alert">{error}</FieldError> : null}
            <Button type="submit" disabled={isPending || !valid}>
              Guardar
            </Button>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CourtFields({
  address,
  mapsUrl,
  name,
  onAddressChange,
  onMapsUrlChange,
  onNameChange,
  prefix,
}: {
  address: string;
  mapsUrl: string;
  name: string;
  onAddressChange: (value: string) => void;
  onMapsUrlChange: (value: string) => void;
  onNameChange: (value: string) => void;
  prefix: string;
}) {
  return (
    <>
      <Field data-invalid={Boolean(name && !name.trim())}>
        <FieldLabel htmlFor={`${prefix}-name`}>Nombre</FieldLabel>
        <Input
          aria-invalid={Boolean(name && !name.trim())}
          id={`${prefix}-name`}
          aria-describedby={name && !name.trim() ? `${prefix}-name-error` : undefined}
          onChange={(event) => onNameChange(event.target.value)}
          placeholder="Nombre de la cancha"
          value={name}
        />
        {name && !name.trim() ? (
          <FieldError id={`${prefix}-name-error`} role="alert">
            Ingresá el nombre de la cancha.
          </FieldError>
        ) : null}
      </Field>
      <Field data-invalid={Boolean(address && !address.trim())}>
        <FieldLabel htmlFor={`${prefix}-address`}>Dirección</FieldLabel>
        <Input
          aria-invalid={Boolean(address && !address.trim())}
          id={`${prefix}-address`}
          aria-describedby={address && !address.trim() ? `${prefix}-address-error` : undefined}
          onChange={(event) => onAddressChange(event.target.value)}
          placeholder="Calle 123, Ciudad"
          value={address}
        />
        {address && !address.trim() ? (
          <FieldError id={`${prefix}-address-error`} role="alert">
            Ingresá la dirección.
          </FieldError>
        ) : null}
      </Field>
      <Field data-invalid={Boolean(mapsUrl && !isHttpUrl(mapsUrl))}>
        <FieldLabel htmlFor={`${prefix}-map`}>Enlace de Google Maps</FieldLabel>
        <Input
          aria-invalid={Boolean(mapsUrl && !isHttpUrl(mapsUrl))}
          id={`${prefix}-map`}
          aria-describedby={mapsUrl && !isHttpUrl(mapsUrl) ? `${prefix}-map-error` : undefined}
          onChange={(event) => onMapsUrlChange(event.target.value)}
          placeholder="https://maps.google.com/…"
          type="url"
          value={mapsUrl}
        />
        {mapsUrl && !isHttpUrl(mapsUrl) ? (
          <FieldError id={`${prefix}-map-error`} role="alert">
            Usá un enlace que empiece con https:// o http://.
          </FieldError>
        ) : null}
      </Field>
    </>
  );
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

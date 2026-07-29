"use client";

import { Alert, AlertDescription, AlertTitle } from "@hay-fulbo/ui/components/alert";
import { Badge } from "@hay-fulbo/ui/components/badge";
import { Button } from "@hay-fulbo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@hay-fulbo/ui/components/dialog";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@hay-fulbo/ui/components/empty";
import { Field, FieldError, FieldGroup, FieldLabel } from "@hay-fulbo/ui/components/field";
import { Input } from "@hay-fulbo/ui/components/input";
import { Skeleton } from "@hay-fulbo/ui/components/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@hay-fulbo/ui/components/table";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CircleAlertIcon, MapPinIcon, PlusIcon, UserRoundIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { useAppContext } from "@/components/app-shell";
import { queryClient, trpc } from "@/utils/trpc";

export function DirectoryPage({ kind }: { kind: "players" | "courts" }) {
  const { role } = useAppContext();
  const directory = useQuery(trpc.matches.directory.queryOptions());
  const [open, setOpen] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [address, setAddress] = useState("");
  const [mapsUrl, setMapsUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const execute = useMutation(
    trpc.matches.execute.mutationOptions({
      onSuccess: () => {
        toast.success(kind === "players" ? "Jugador guardado" : "Cancha guardada");
        setOpen(false);
        setDisplayName("");
        setAddress("");
        setMapsUrl("");
        queryClient.invalidateQueries({ queryKey: trpc.matches.directory.queryKey() });
      },
      onError: (cause) => setError(cause.message),
    }),
  );

  const isPlayers = kind === "players";
  const rows = directory.data?.[kind] ?? [];

  function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!displayName.trim()) return setError("Ingresá un nombre.");
    if (isPlayers) {
      execute.mutate({ type: "upsertPlayer", displayName, linkedUserId: null });
      return;
    }
    if (!address.trim() || !URL.canParse(mapsUrl)) {
      return setError("Completá la dirección y un enlace de Maps válido.");
    }
    execute.mutate({ type: "upsertCourt", name: displayName, address, mapsUrl });
  }

  function archive(row: { id: string; archivedAt: Date | string | null }) {
    execute.mutate(
      isPlayers
        ? { type: "archivePlayer", playerId: row.id, archived: !row.archivedAt }
        : { type: "archiveCourt", courtId: row.id, archived: !row.archivedAt },
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold text-primary">Directorio</p>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            {isPlayers ? "Jugadores" : "Canchas"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isPlayers
              ? "Disponibles para armar cualquier partido."
              : "Guardadas para reutilizarlas en cada fecha."}
          </p>
        </div>
        {role === "owner" ? (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button />}>
              <PlusIcon data-icon="inline-start" aria-hidden="true" />
              <span className="hidden sm:inline">
                {isPlayers ? "Nuevo jugador" : "Nueva cancha"}
              </span>
              <span className="sm:hidden">Agregar</span>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{isPlayers ? "Nuevo jugador" : "Nueva cancha"}</DialogTitle>
                <DialogDescription>
                  {isPlayers
                    ? "Quedará disponible para próximos partidos."
                    : "La vas a poder elegir al crear un partido."}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={create}>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="directory-name">Nombre</FieldLabel>
                    <Input
                      id="directory-name"
                      value={displayName}
                      onChange={(event) => setDisplayName(event.target.value)}
                      placeholder={isPlayers ? "Nombre del jugador" : "Nombre de la cancha"}
                    />
                  </Field>
                  {!isPlayers ? (
                    <>
                      <Field>
                        <FieldLabel htmlFor="court-address">Dirección</FieldLabel>
                        <Input
                          id="court-address"
                          value={address}
                          onChange={(event) => setAddress(event.target.value)}
                          placeholder="Calle 123, Ciudad"
                        />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="court-map">Enlace de Google Maps</FieldLabel>
                        <Input
                          id="court-map"
                          type="url"
                          value={mapsUrl}
                          onChange={(event) => setMapsUrl(event.target.value)}
                          placeholder="https://maps.google.com/…"
                        />
                      </Field>
                    </>
                  ) : null}
                  <FieldError>{error}</FieldError>
                  <Button type="submit" disabled={execute.isPending}>
                    Guardar
                  </Button>
                </FieldGroup>
              </form>
            </DialogContent>
          </Dialog>
        ) : null}
      </header>

      {role === "member" ? (
        <Alert>
          <CircleAlertIcon aria-hidden="true" />
          <AlertTitle>Vista de consulta</AlertTitle>
          <AlertDescription>El organizador administra este directorio.</AlertDescription>
        </Alert>
      ) : null}

      {directory.isPending ? (
        <Skeleton className="h-72 w-full" />
      ) : directory.isError ? (
        <Alert variant="destructive">
          <CircleAlertIcon aria-hidden="true" />
          <AlertTitle>No pudimos cargar el directorio</AlertTitle>
          <AlertDescription>{directory.error.message}</AlertDescription>
        </Alert>
      ) : rows.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              {isPlayers ? <UserRoundIcon aria-hidden="true" /> : <MapPinIcon aria-hidden="true" />}
            </EmptyMedia>
            <EmptyTitle>{isPlayers ? "No hay jugadores" : "No hay canchas guardadas"}</EmptyTitle>
            <EmptyDescription>
              {role === "owner"
                ? "Usá el botón Agregar para cargar el primero."
                : "El organizador todavía no cargó información."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                {!isPlayers ? <TableHead>Dirección</TableHead> : null}
                <TableHead>Estado</TableHead>
                {role === "owner" ? <TableHead className="text-right">Acción</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">
                    {"displayName" in row ? row.displayName : row.name}
                  </TableCell>
                  {!isPlayers ? (
                    <TableCell className="max-w-64 truncate">
                      {"address" in row ? row.address : ""}
                    </TableCell>
                  ) : null}
                  <TableCell>
                    <Badge variant={row.archivedAt ? "secondary" : "outline"}>
                      {row.archivedAt ? "Archivado" : "Activo"}
                    </Badge>
                  </TableCell>
                  {role === "owner" ? (
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={execute.isPending}
                        onClick={() => archive(row)}
                      >
                        {row.archivedAt ? "Restaurar" : "Archivar"}
                      </Button>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

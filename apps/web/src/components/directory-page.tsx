"use client";

import { Alert, AlertDescription, AlertTitle } from "@hay-fulbo/ui/components/alert";
import { Avatar, AvatarFallback } from "@hay-fulbo/ui/components/avatar";
import { Badge } from "@hay-fulbo/ui/components/badge";
import { Button } from "@hay-fulbo/ui/components/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@hay-fulbo/ui/components/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@hay-fulbo/ui/components/dialog";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@hay-fulbo/ui/components/empty";
import { Field, FieldError, FieldGroup, FieldLabel } from "@hay-fulbo/ui/components/field";
import { Input } from "@hay-fulbo/ui/components/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@hay-fulbo/ui/components/input-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hay-fulbo/ui/components/select";
import { Separator } from "@hay-fulbo/ui/components/separator";
import { Skeleton } from "@hay-fulbo/ui/components/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@hay-fulbo/ui/components/tabs";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  CircleAlertIcon,
  CopyIcon,
  ExternalLinkIcon,
  MailPlusIcon,
  MapPinIcon,
  PlusIcon,
  SearchIcon,
  SearchXIcon,
  UserRoundIcon,
  XIcon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { useAppContext } from "@/components/app-shell";
import { initials } from "@/lib/initials";
import {
  accountLinkOptions,
  accountPresentationLabel,
  type PlayerAccountMember,
} from "@/lib/player-account-link";
import { queryClient, trpc } from "@/utils/trpc";

type PlayerRow = {
  archivedAt: Date | string | null;
  displayName: string;
  id: string;
  linkedUserId: string | null;
};

type CourtRow = {
  address: string;
  archivedAt: Date | string | null;
  id: string;
  mapsUrl: string;
  name: string;
};

type PlayerAggregate = {
  assists: number;
  contributions: number;
  draws: number;
  goals: number;
  losses: number;
  played: number;
  winPercentage: number;
  wins: number;
};

const EMPTY_PLAYER_STATS: PlayerAggregate = {
  assists: 0,
  contributions: 0,
  draws: 0,
  goals: 0,
  losses: 0,
  played: 0,
  winPercentage: 0,
  wins: 0,
};

export function DirectoryPage({ kind }: { kind: "players" | "courts" }) {
  const { activeGroupId, role } = useAppContext();
  const directory = useQuery(trpc.matches.directory.queryOptions());
  const isPlayers = kind === "players";
  const stats = useQuery({
    ...trpc.stats.dashboard.queryOptions({}),
    enabled: isPlayers,
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [playerFilter, setPlayerFilter] = useState<"active" | "all" | "archived">("active");
  const canManage = role !== "member";

  const execute = useMutation(
    trpc.matches.execute.mutationOptions({
      onSuccess: async () => {
        toast.success(isPlayers ? "Jugador actualizado" : "Cancha actualizada");
        setCreateOpen(false);
        setSelectedId(null);
        setError(null);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: trpc.matches.directory.queryKey() }),
          queryClient.invalidateQueries({ queryKey: trpc.stats.dashboard.queryKey() }),
        ]);
      },
      onError: (cause) => {
        setError(cause.message);
        toast.error("No pudimos guardar los cambios", { description: cause.message });
      },
    }),
  );

  const players: PlayerRow[] = directory.data?.players ?? [];
  const courts: CourtRow[] = directory.data?.courts ?? [];
  const normalizedSearch = normalizeSearch(search);
  const statusPlayers = players.filter((player) => {
    if (playerFilter === "all") return true;
    return playerFilter === "archived" ? Boolean(player.archivedAt) : !player.archivedAt;
  });
  const visiblePlayers = normalizedSearch
    ? statusPlayers.filter((player) =>
        normalizeSearch(player.displayName).includes(normalizedSearch),
      )
    : statusPlayers;
  const members: PlayerAccountMember[] = directory.data?.members ?? [];
  const rankingByPlayer = new Map(
    (stats.data?.ranking ?? []).map((aggregate) => [aggregate.playerId, aggregate]),
  );
  const selectedPlayer = players.find((player) => player.id === selectedId) ?? null;
  const selectedCourt = courts.find((court) => court.id === selectedId) ?? null;

  function archivePlayer(player: PlayerRow) {
    setError(null);
    execute.mutate({
      type: "archivePlayer",
      playerId: player.id,
      archived: !player.archivedAt,
    });
  }

  function archiveCourt(court: CourtRow) {
    setError(null);
    execute.mutate({
      type: "archiveCourt",
      courtId: court.id,
      archived: !court.archivedAt,
    });
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
              ? "Entrá a una tarjeta para ver estadísticas y editar."
              : "Entrá a una tarjeta para consultar o actualizar sus datos."}
          </p>
        </div>
        {canManage ? (
          <CreateDirectoryDialog
            key={`${kind}-${createOpen ? "open" : "closed"}`}
            error={error}
            isPending={execute.isPending}
            kind={kind}
            onOpenChange={(open) => {
              setCreateOpen(open);
              setError(null);
            }}
            onSave={(input) => {
              setError(null);
              execute.mutate(input);
            }}
            open={createOpen}
          />
        ) : null}
      </header>

      {!canManage ? (
        <Alert>
          <CircleAlertIcon aria-hidden="true" />
          <AlertTitle>Vista de consulta</AlertTitle>
          <AlertDescription>El organizador administra este directorio.</AlertDescription>
        </Alert>
      ) : null}

      {isPlayers ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <InputGroup className="max-w-md">
            <InputGroupAddon>
              <SearchIcon aria-hidden="true" />
            </InputGroupAddon>
            <InputGroupInput
              aria-label="Buscar jugadores"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nombre"
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
          {!directory.isPending ? (
            <span className="text-xs text-muted-foreground">
              {visiblePlayers.length} de {players.length}
            </span>
          ) : null}
          <Tabs
            value={playerFilter}
            onValueChange={(value) => setPlayerFilter(value as "active" | "all" | "archived")}
          >
            <TabsList>
              <TabsTrigger value="active">Activos</TabsTrigger>
              <TabsTrigger value="all">Todos</TabsTrigger>
              <TabsTrigger value="archived">Archivados</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      ) : null}

      {directory.isPending || (isPlayers && stats.isPending) ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-32 w-full" />
          ))}
        </div>
      ) : directory.isError || (isPlayers && stats.isError) ? (
        <Alert variant="destructive">
          <CircleAlertIcon aria-hidden="true" />
          <AlertTitle>No pudimos cargar el directorio</AlertTitle>
          <AlertDescription>{directory.error?.message ?? stats.error?.message}</AlertDescription>
        </Alert>
      ) : (isPlayers ? players : courts).length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              {isPlayers ? <UserRoundIcon aria-hidden="true" /> : <MapPinIcon aria-hidden="true" />}
            </EmptyMedia>
            <EmptyTitle>{isPlayers ? "No hay jugadores" : "No hay canchas guardadas"}</EmptyTitle>
            <EmptyDescription>
              {canManage
                ? "Usá el botón Agregar para cargar el primero."
                : "El organizador todavía no cargó información."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : isPlayers && visiblePlayers.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SearchXIcon aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>No encontramos jugadores</EmptyTitle>
            <EmptyDescription>
              Probá con otro nombre, cambiá el filtro o limpiá la búsqueda.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button variant="outline" onClick={() => setSearch("")}>
              Limpiar búsqueda
            </Button>
          </EmptyContent>
        </Empty>
      ) : isPlayers ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visiblePlayers.map((player) => (
            <Button
              key={player.id}
              aria-label={`Ver detalle de ${player.displayName}`}
              className="h-auto w-full justify-start p-0 text-left whitespace-normal"
              onClick={() => {
                setError(null);
                setSelectedId(player.id);
              }}
              variant="ghost"
            >
              <PlayerCard
                player={player}
                stats={rankingByPlayer.get(player.id) ?? EMPTY_PLAYER_STATS}
              />
            </Button>
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {courts.map((court) => (
            <Button
              key={court.id}
              aria-label={`Ver detalle de ${court.name}`}
              className="h-auto w-full justify-start p-0 text-left whitespace-normal"
              onClick={() => {
                setError(null);
                setSelectedId(court.id);
              }}
              variant="ghost"
            >
              <CourtCard court={court} />
            </Button>
          ))}
        </div>
      )}

      {isPlayers && selectedPlayer ? (
        <PlayerDialog
          key={selectedPlayer.id}
          error={error}
          isPending={execute.isPending}
          groupId={activeGroupId}
          members={members}
          onArchive={() => archivePlayer(selectedPlayer)}
          onOpenChange={(open) => {
            if (!open) setSelectedId(null);
            setError(null);
          }}
          onSave={({ displayName, linkedUserId }) => {
            setError(null);
            execute.mutate({
              type: "upsertPlayer",
              displayName,
              linkedUserId,
              playerId: selectedPlayer.id,
            });
          }}
          player={selectedPlayer}
          role={role}
          stats={rankingByPlayer.get(selectedPlayer.id) ?? EMPTY_PLAYER_STATS}
        />
      ) : null}

      {!isPlayers && selectedCourt ? (
        <CourtDialog
          key={selectedCourt.id}
          court={selectedCourt}
          error={error}
          isPending={execute.isPending}
          onArchive={() => archiveCourt(selectedCourt)}
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

function PlayerCard({ player, stats }: { player: PlayerRow; stats: PlayerAggregate }) {
  return (
    <Card className="w-full transition-colors group-hover/button:bg-accent/50" size="sm">
      <CardHeader className="flex flex-row items-center gap-3">
        <Avatar size="lg">
          <AvatarFallback>{initials(player.displayName)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <CardTitle className="truncate text-base">{player.displayName}</CardTitle>
          <CardDescription>
            {stats.played} {stats.played === 1 ? "partido" : "partidos"}
          </CardDescription>
        </div>
        {player.archivedAt ? (
          <Badge variant={player.archivedAt ? "secondary" : "outline"}>Archivado</Badge>
        ) : null}
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
          <div className="flex items-baseline justify-between gap-2">
            <dt>Goles</dt>
            <dd className="font-semibold tabular-nums text-foreground">{stats.goals}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <dt>Asistencias</dt>
            <dd className="font-semibold tabular-nums text-foreground">{stats.assists}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}

function CourtCard({ court }: { court: CourtRow }) {
  return (
    <Card className="w-full transition-colors group-hover/button:bg-accent/50" size="sm">
      <CardHeader>
        <CardTitle className="text-base">{court.name}</CardTitle>
        <CardDescription className="line-clamp-2">{court.address}</CardDescription>
        <CardAction>
          <Badge variant={court.archivedAt ? "secondary" : "outline"}>
            {court.archivedAt ? "Archivada" : "Activa"}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="flex items-center gap-2 text-xs text-muted-foreground">
        <MapPinIcon aria-hidden="true" />
        Ver ubicación y editar datos
      </CardContent>
    </Card>
  );
}

function PlayerDialog({
  error,
  groupId,
  isPending,
  members,
  onArchive,
  onOpenChange,
  onSave,
  player,
  role,
  stats,
}: {
  error: string | null;
  groupId: string;
  isPending: boolean;
  members: readonly PlayerAccountMember[];
  onArchive: () => void;
  onOpenChange: (open: boolean) => void;
  onSave: (input: { displayName: string; linkedUserId: string | null }) => void;
  player: PlayerRow;
  role: "member" | "leader" | "owner";
  stats: PlayerAggregate;
}) {
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(player.displayName);
  const [linkedUserId, setLinkedUserId] = useState<string | null>(player.linkedUserId);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const invite = useMutation(
    trpc.group.inviteMember.mutationOptions({
      onSuccess: (result) => {
        setInviteUrl(result.inviteUrl);
        toast.success(
          result.delivery === "email" ? "Invitación enviada" : "Enlace listo para compartir",
        );
      },
      onError: (cause) =>
        toast.error("No pudimos crear la invitación", { description: cause.message }),
    }),
  );
  const options = accountLinkOptions(members, player.id);
  const accountItems = [
    { label: "Sin cuenta vinculada", value: null },
    ...options.map((member) => ({
      disabled: member.disabled,
      label: `${member.name} · ${member.email}`,
      value: member.id,
    })),
  ];

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!displayName.trim()) return;
    onSave({ displayName, linkedUserId });
  }

  function invitePlayer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = inviteEmail.trim();
    if (!email) return;
    invite.mutate({ email, groupId, playerId: player.id });
  }

  async function copyInvite() {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      toast.success("Enlace copiado");
    } catch {
      toast.error("No pudimos copiar el enlace");
    }
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg">{player.displayName}</DialogTitle>
          <DialogDescription>
            {player.archivedAt ? "Jugador archivado" : "Jugador activo"} · Estadísticas de partidos
            cerrados.
          </DialogDescription>
        </DialogHeader>

        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Partidos jugados" value={stats.played} />
          <Stat label="Goles" value={stats.goals} />
          <Stat label="Asistencias" value={stats.assists} />
          <Stat label="Goles + asistencias" value={stats.contributions} />
          <Stat label="Victorias" value={stats.wins} />
          <Stat label="Empates" value={stats.draws} />
          <Stat label="Derrotas" value={stats.losses} />
          <Stat label="% de victorias" value={`${stats.winPercentage}%`} />
        </dl>

        <Separator />

        {role !== "member" && editing ? (
          <form onSubmit={submit}>
            <FieldGroup>
              <Field data-invalid={!displayName.trim()}>
                <FieldLabel htmlFor="player-name">Nombre</FieldLabel>
                <Input
                  aria-invalid={!displayName.trim()}
                  id="player-name"
                  onChange={(event) => setDisplayName(event.target.value)}
                  value={displayName}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="player-account">Cuenta vinculada</FieldLabel>
                <Select
                  items={accountItems}
                  onValueChange={(value) =>
                    setLinkedUserId(typeof value === "string" ? value : null)
                  }
                  value={linkedUserId}
                >
                  <SelectTrigger id="player-account" className="w-full">
                    <SelectValue>{accountPresentationLabel(members, linkedUserId)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent align="start" alignItemWithTrigger={false}>
                    <SelectGroup>
                      <SelectItem value={null}>Sin cuenta vinculada</SelectItem>
                      {options.map((member) => (
                        <SelectItem key={member.id} disabled={member.disabled} value={member.id}>
                          <span className="flex min-w-0 flex-col">
                            <span className="truncate">{member.name}</span>
                            <span className="truncate text-muted-foreground">{member.email}</span>
                          </span>
                          {member.disabled ? <Badge variant="secondary">Ya vinculada</Badge> : null}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              {error ? <FieldError>{error}</FieldError> : null}
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDisplayName(player.displayName);
                    setLinkedUserId(player.linkedUserId);
                    setEditing(false);
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isPending || !displayName.trim()}>
                  Guardar cambios
                </Button>
              </DialogFooter>
            </FieldGroup>
          </form>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Cuenta vinculada</span>
              <span className="text-sm">
                {accountPresentationLabel(members, player.linkedUserId)}
              </span>
            </div>
            {error ? (
              <Alert variant="destructive">
                <CircleAlertIcon aria-hidden="true" />
                <AlertTitle>No pudimos actualizar el jugador</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
            {role !== "member" ? (
              <DialogFooter>
                <Button type="button" variant="outline" disabled={isPending} onClick={onArchive}>
                  {player.archivedAt ? "Reactivar jugador" : "Archivar jugador"}
                </Button>
                <Button type="button" onClick={() => setEditing(true)}>
                  Editar jugador
                </Button>
              </DialogFooter>
            ) : null}
          </div>
        )}

        {role !== "member" ? (
          <>
            <Separator />
            <section className="flex flex-col gap-3" aria-labelledby="invite-player-title">
              <div className="flex flex-col gap-1">
                <h3 id="invite-player-title" className="text-sm font-medium">
                  Invitar a este jugador
                </h3>
                <p className="text-xs text-muted-foreground">
                  La cuenta que acepte quedará vinculada a {player.displayName}.
                </p>
              </div>
              {player.linkedUserId ? (
                <Alert>
                  <UserRoundIcon aria-hidden="true" />
                  <AlertTitle>Cuenta ya vinculada</AlertTitle>
                  <AlertDescription>
                    Desvinculala desde Editar jugador antes de enviar otra invitación.
                  </AlertDescription>
                </Alert>
              ) : (
                <form onSubmit={invitePlayer}>
                  <FieldGroup>
                    <Field data-invalid={invite.isError}>
                      <FieldLabel htmlFor="player-invite-email">Email</FieldLabel>
                      <Input
                        aria-invalid={invite.isError}
                        id="player-invite-email"
                        onChange={(event) => {
                          setInviteEmail(event.target.value);
                          setInviteUrl(null);
                          invite.reset();
                        }}
                        placeholder="jugador@ejemplo.com"
                        required
                        type="email"
                        value={inviteEmail}
                      />
                      {invite.isError ? <FieldError>{invite.error.message}</FieldError> : null}
                    </Field>
                    <Button type="submit" disabled={invite.isPending || !inviteEmail.trim()}>
                      <MailPlusIcon data-icon="inline-start" aria-hidden="true" />
                      Crear invitación
                    </Button>
                    {inviteUrl ? (
                      <Field>
                        <FieldLabel>Invitación lista</FieldLabel>
                        <Button type="button" variant="outline" onClick={copyInvite}>
                          <CopyIcon data-icon="inline-start" aria-hidden="true" />
                          Copiar enlace para compartir
                        </Button>
                      </Field>
                    ) : null}
                  </FieldGroup>
                </form>
              )}
            </section>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
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
                render={<a href={court.mapsUrl} target="_blank" rel="noreferrer" />}
                variant="outline"
              >
                <ExternalLinkIcon data-icon="inline-start" aria-hidden="true" />
                Abrir en Maps
              </Button>
              {error ? <FieldError>{error}</FieldError> : null}
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
            <Button render={<a href={court.mapsUrl} target="_blank" rel="noreferrer" />}>
              <ExternalLinkIcon data-icon="inline-start" aria-hidden="true" />
              Abrir en Maps
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CreateDirectoryDialog({
  error,
  isPending,
  kind,
  onOpenChange,
  onSave,
  open,
}: {
  error: string | null;
  isPending: boolean;
  kind: "players" | "courts";
  onOpenChange: (open: boolean) => void;
  onSave: (
    input:
      | { type: "upsertPlayer"; displayName: string; linkedUserId: null }
      | { type: "upsertCourt"; name: string; address: string; mapsUrl: string },
  ) => void;
  open: boolean;
}) {
  const [displayName, setDisplayName] = useState("");
  const [address, setAddress] = useState("");
  const [mapsUrl, setMapsUrl] = useState("");
  const isPlayers = kind === "players";
  const valid = isPlayers
    ? Boolean(displayName.trim())
    : Boolean(displayName.trim() && address.trim() && isHttpUrl(mapsUrl));

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!valid) return;
    if (isPlayers) {
      onSave({ type: "upsertPlayer", displayName, linkedUserId: null });
      return;
    }
    onSave({ type: "upsertCourt", name: displayName, address, mapsUrl });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger render={<Button />}>
        <PlusIcon data-icon="inline-start" aria-hidden="true" />
        <span className="hidden sm:inline">{isPlayers ? "Nuevo jugador" : "Nueva cancha"}</span>
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
        <form onSubmit={submit}>
          <FieldGroup>
            {isPlayers ? (
              <Field data-invalid={Boolean(displayName && !displayName.trim())}>
                <FieldLabel htmlFor="directory-name">Nombre</FieldLabel>
                <Input
                  aria-invalid={Boolean(displayName && !displayName.trim())}
                  id="directory-name"
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="Nombre del jugador"
                  value={displayName}
                />
              </Field>
            ) : (
              <CourtFields
                address={address}
                mapsUrl={mapsUrl}
                name={displayName}
                onAddressChange={setAddress}
                onMapsUrlChange={setMapsUrl}
                onNameChange={setDisplayName}
                prefix="new-court"
              />
            )}
            {error ? <FieldError>{error}</FieldError> : null}
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
          onChange={(event) => onNameChange(event.target.value)}
          placeholder="Nombre de la cancha"
          value={name}
        />
      </Field>
      <Field data-invalid={Boolean(address && !address.trim())}>
        <FieldLabel htmlFor={`${prefix}-address`}>Dirección</FieldLabel>
        <Input
          aria-invalid={Boolean(address && !address.trim())}
          id={`${prefix}-address`}
          onChange={(event) => onAddressChange(event.target.value)}
          placeholder="Calle 123, Ciudad"
          value={address}
        />
      </Field>
      <Field data-invalid={Boolean(mapsUrl && !isHttpUrl(mapsUrl))}>
        <FieldLabel htmlFor={`${prefix}-map`}>Enlace de Google Maps</FieldLabel>
        <Input
          aria-invalid={Boolean(mapsUrl && !isHttpUrl(mapsUrl))}
          id={`${prefix}-map`}
          onChange={(event) => onMapsUrlChange(event.target.value)}
          placeholder="https://maps.google.com/…"
          type="url"
          value={mapsUrl}
        />
      </Field>
    </>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex flex-col gap-1 rounded-md border p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-xl font-semibold">{value}</dd>
    </div>
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

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("es-AR");
}

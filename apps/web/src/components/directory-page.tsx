"use client";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@hay-fulbo/ui/components/sheet";

import { Alert, AlertDescription, AlertTitle } from "@hay-fulbo/ui/components/alert";
import { Avatar, AvatarFallback } from "@hay-fulbo/ui/components/avatar";
import { Badge } from "@hay-fulbo/ui/components/badge";
import { Button } from "@hay-fulbo/ui/components/button";
import { Card } from "@hay-fulbo/ui/components/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@hay-fulbo/ui/components/dialog";
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
  MailPlusIcon,
  PlusIcon,
  SearchIcon,
  SearchXIcon,
  UserRoundIcon,
  XIcon,
} from "lucide-react";
import Link from "next/link";
import { Fragment, useState } from "react";
import { toast } from "sonner";

import { useAppContext } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
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

export function DirectoryPage() {
  const { activeGroupId, role } = useAppContext();
  const directory = useQuery(trpc.matches.directory.queryOptions());
  const stats = useQuery({
    ...trpc.stats.dashboard.queryOptions({}),
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
        toast.success("Jugador actualizado");
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

  function archivePlayer(player: PlayerRow) {
    setError(null);
    execute.mutate({
      type: "archivePlayer",
      playerId: player.id,
      archived: !player.archivedAt,
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Jugadores"
        actions={
          canManage ? (
            <>
              {role === "owner" ? (
                <Button
                  nativeButton={false}
                  render={<Link href="/dashboard/grupo#invitar" />}
                  variant="ghost"
                >
                  <MailPlusIcon data-icon="inline-start" aria-hidden="true" />
                  <span className="hidden sm:inline">Invitar amigos</span>
                  <span className="sm:hidden">Invitar</span>
                </Button>
              ) : null}
              <CreateDirectoryDialog
                key={createOpen ? "open" : "closed"}
                error={error}
                isPending={execute.isPending}
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
            </>
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

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <InputGroup className="sm:max-w-xs">
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

      {directory.isPending || stats.isPending ? (
        <div className="flex flex-col">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton
              key={index}
              className="h-14 w-full rounded-none first:rounded-t-md last:rounded-b-md"
            />
          ))}
        </div>
      ) : directory.isError || stats.isError ? (
        <Alert variant="destructive">
          <CircleAlertIcon aria-hidden="true" />
          <AlertTitle>No pudimos cargar el directorio</AlertTitle>
          <AlertDescription>{directory.error?.message ?? stats.error?.message}</AlertDescription>
        </Alert>
      ) : players.length === 0 ? (
        <div className="flex items-center gap-4 rounded-lg border border-dashed p-4">
          <UserRoundIcon className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <div className="flex min-w-0 flex-col gap-0.5">
            <p className="text-sm font-medium">No hay jugadores</p>
            <p className="text-sm text-muted-foreground">
              {canManage
                ? "Cargá el primero con Agregar."
                : "El organizador todavía no cargó ninguno."}
            </p>
          </div>
        </div>
      ) : visiblePlayers.length === 0 ? (
        <div className="flex flex-col items-start gap-4 rounded-lg border border-dashed p-4 sm:flex-row sm:items-center">
          <SearchXIcon className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <p className="min-w-0 flex-1 text-sm font-medium">No encontramos jugadores</p>
          <Button variant="outline" onClick={() => setSearch("")}>
            Limpiar búsqueda
          </Button>
        </div>
      ) : (
        <Card className="gap-0 py-0">
          <div className="flex items-center gap-3 border-b px-4 py-2 text-xs font-medium text-muted-foreground">
            <span className="flex-1 tabular-nums">
              {visiblePlayers.length} de {players.length}
            </span>
            <span className="w-9 text-right">PJ</span>
            <span className="w-9 text-right">G</span>
            <span className="w-9 text-right">A</span>
          </div>
          {visiblePlayers.map((player, index) => (
            <Fragment key={player.id}>
              {index > 0 ? <Separator /> : null}
              <Button
                aria-label={`Ver detalle de ${player.displayName}`}
                className="h-auto min-h-14 w-full justify-between gap-3 rounded-none px-4 py-2 text-left whitespace-normal"
                onClick={() => {
                  setError(null);
                  setSelectedId(player.id);
                }}
                variant="ghost"
              >
                <PlayerRow
                  player={player}
                  stats={rankingByPlayer.get(player.id) ?? EMPTY_PLAYER_STATS}
                />
              </Button>
            </Fragment>
          ))}
        </Card>
      )}

      {selectedPlayer ? (
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
    </div>
  );
}

function PlayerRow({ player, stats }: { player: PlayerRow; stats: PlayerAggregate }) {
  return (
    <span className="flex min-w-0 flex-1 items-center gap-3">
      <Avatar>
        <AvatarFallback>{initials(player.displayName)}</AvatarFallback>
      </Avatar>
      <span className="flex min-w-0 flex-1 items-center gap-2">
        <span className="truncate text-sm font-medium">{player.displayName}</span>
        {player.archivedAt ? <Badge variant="secondary">Archivado</Badge> : null}
      </span>
      <span className="w-9 text-right text-sm text-muted-foreground tabular-nums">
        {stats.played}
      </span>
      <span className="w-9 text-right text-sm font-semibold tabular-nums" aria-label="Goles">
        {stats.goals}
      </span>
      <span className="w-9 text-right text-sm font-semibold tabular-nums" aria-label="Asistencias">
        {stats.assists}
      </span>
    </span>
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
    <Sheet open onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle className="text-lg">{player.displayName}</SheetTitle>
          <SheetDescription>
            {player.archivedAt ? "Jugador archivado" : "Jugador activo"} · Estadísticas de partidos
            cerrados.
          </SheetDescription>
        </SheetHeader>
        <SheetBody className="flex flex-col gap-5">
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
                            {member.disabled ? (
                              <Badge variant="secondary">Ya vinculada</Badge>
                            ) : null}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
                {error ? <FieldError role="alert">{error}</FieldError> : null}
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
                          aria-describedby={invite.isError ? "player-invite-error" : undefined}
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
                        {invite.isError ? (
                          <FieldError id="player-invite-error" role="alert">
                            {invite.error.message}
                          </FieldError>
                        ) : null}
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
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}

function CreateDirectoryDialog({
  error,
  isPending,
  onOpenChange,
  onSave,
  open,
}: {
  error: string | null;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (input: { type: "upsertPlayer"; displayName: string; linkedUserId: null }) => void;
  open: boolean;
}) {
  const [displayName, setDisplayName] = useState("");
  const valid = Boolean(displayName.trim());

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!valid) return;
    onSave({ type: "upsertPlayer", displayName, linkedUserId: null });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger render={<Button />}>
        <PlusIcon data-icon="inline-start" aria-hidden="true" />
        <span className="hidden sm:inline">Nuevo jugador</span>
        <span className="sm:hidden">Agregar</span>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo jugador</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit}>
          <FieldGroup>
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

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-xl font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("es-AR");
}

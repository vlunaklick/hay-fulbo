"use client";
// PROTOTYPE ONLY — shared data + real management controls for /prototype/jugadores.

import { Badge } from "@hay-fulbo/ui/components/badge";
import { Button } from "@hay-fulbo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { cn } from "@hay-fulbo/ui/lib/utils";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckIcon, CopyIcon, MailPlusIcon, SearchIcon, XIcon } from "lucide-react";
import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { useAppContext } from "@/components/app-shell";
import {
  accountLinkOptions,
  accountPresentationLabel,
  type PlayerAccountMember,
} from "@/lib/player-account-link";
import { queryClient, trpc } from "@/utils/trpc";

export type Aggregate = {
  played: number;
  goals: number;
  assists: number;
  contributions: number;
  wins: number;
  draws: number;
  losses: number;
  points: number;
  winPercentage: number;
  contributionsPerMatch: number;
  goalDifference: number;
};

export const EMPTY: Aggregate = {
  played: 0,
  goals: 0,
  assists: 0,
  contributions: 0,
  wins: 0,
  draws: 0,
  losses: 0,
  points: 0,
  winPercentage: 0,
  contributionsPerMatch: 0,
  goalDifference: 0,
};

export type PlayerRowData = {
  id: string;
  displayName: string;
  archived: boolean;
  linkedUserId: string | null;
  stats: Aggregate;
};

export type StatusFilter = "active" | "all" | "archived";

export function usePlayersData() {
  const directory = useQuery(trpc.matches.directory.queryOptions());
  const stats = useQuery(trpc.stats.dashboard.queryOptions({}));
  const ranking = new Map((stats.data?.ranking ?? []).map((row) => [row.playerId, row]));
  const players: PlayerRowData[] = (directory.data?.players ?? []).map((player) => {
    const aggregate = ranking.get(player.id);
    return {
      id: player.id,
      displayName: player.displayName,
      archived: Boolean(player.archivedAt),
      linkedUserId: player.linkedUserId,
      stats: aggregate ? { ...EMPTY, ...aggregate } : EMPTY,
    };
  });
  const members: PlayerAccountMember[] = directory.data?.members ?? [];
  return {
    players,
    members,
    isPending: directory.isPending || stats.isPending,
    error: directory.error?.message ?? stats.error?.message ?? null,
  };
}

export function usePlayerDetail(playerId: string | null) {
  return useQuery({
    ...trpc.stats.player.queryOptions({ playerId: playerId ?? "", filters: {} }),
    enabled: Boolean(playerId),
  });
}

export type PlayerDetail = NonNullable<ReturnType<typeof usePlayerDetail>["data"]>;
export type PlayerMatch = PlayerDetail["matches"][number];

/** Selected player lives in `?p=` so a profile is linkable and survives reload. */
export function useSelectedPlayerId() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const selected = searchParams.get("p");
  function select(id: string | null, mode: "push" | "replace" = "push") {
    const params = new URLSearchParams(searchParams.toString());
    if (id) params.set("p", id);
    else params.delete("p");
    const href = `${pathname}?${params}` as Route;
    if (mode === "push") router.push(href, { scroll: true });
    else router.replace(href, { scroll: false });
  }
  return [selected, select] as const;
}

export function filterPlayers(players: PlayerRowData[], search: string, status: StatusFilter) {
  const needle = normalize(search);
  return players.filter((player) => {
    if (status === "active" && player.archived) return false;
    if (status === "archived" && !player.archived) return false;
    return needle ? normalize(player.displayName).includes(needle) : true;
  });
}

export function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLocaleLowerCase("es-AR");
}

export function formatRate(value: number) {
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 }).format(value);
}

export function formatPercent(value: number) {
  return `${new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(value)}%`;
}

export function formatShortDate(value: Date | string, timeZone: string) {
  return new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short", timeZone }).format(
    new Date(value),
  );
}

export function formatLongDate(value: Date | string, timeZone: string) {
  return new Intl.DateTimeFormat("es-AR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone,
  }).format(new Date(value));
}

export function relativeWeeks(value: Date | string) {
  const days = Math.round((Date.now() - new Date(value).getTime()) / 86_400_000);
  if (days < 7) return "esta semana";
  const weeks = Math.round(days / 7);
  if (weeks === 1) return "hace 1 semana";
  if (weeks < 9) return `hace ${weeks} semanas`;
  const months = Math.round(days / 30);
  return `hace ${months} meses`;
}

export function signed(value: number) {
  return value > 0 ? `+${value}` : String(value);
}

/** The player's side of a match: own team first. */
export function perspective(match: PlayerMatch) {
  const own = match.teams.find((team) => team.id === match.teamId) ?? match.teams[0]!;
  const rival = match.teams.find((team) => team.id !== own.id) ?? match.teams[1]!;
  return { own, rival };
}

export function outcomeLetter(outcome: "win" | "draw" | "loss") {
  return outcome === "win" ? "V" : outcome === "draw" ? "E" : "D";
}

export function outcomeWord(outcome: "win" | "draw" | "loss") {
  return outcome === "win" ? "Ganó" : outcome === "draw" ? "Empató" : "Perdió";
}

export function FormChip({
  outcome,
  className,
}: {
  outcome: "win" | "draw" | "loss";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex size-7 shrink-0 items-center justify-center rounded-xs text-xs font-semibold",
        outcome === "win" && "bg-success/15 text-success",
        outcome === "draw" && "bg-muted text-muted-foreground",
        outcome === "loss" && "border border-border text-foreground",
        className,
      )}
      title={outcome === "win" ? "Victoria" : outcome === "draw" ? "Empate" : "Derrota"}
    >
      {outcomeLetter(outcome)}
    </span>
  );
}

export function TeamDot({ slot, className }: { slot: number; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "size-2 shrink-0 rounded-full",
        slot === 1 ? "bg-team-blue" : "bg-team-amber",
        className,
      )}
    />
  );
}

export function SearchField({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <InputGroup className={className}>
      <InputGroupAddon>
        <SearchIcon aria-hidden="true" />
      </InputGroupAddon>
      <InputGroupInput
        aria-label="Buscar jugadores"
        onChange={(event) => onChange(event.target.value)}
        placeholder="Buscar por nombre"
        type="search"
        value={value}
      />
      {value ? (
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            aria-label="Limpiar búsqueda"
            onClick={() => onChange("")}
            size="icon-xs"
          >
            <XIcon aria-hidden="true" />
          </InputGroupButton>
        </InputGroupAddon>
      ) : null}
    </InputGroup>
  );
}

export function AccountStatus({
  player,
  members,
}: {
  player: Pick<PlayerRowData, "linkedUserId">;
  members: readonly PlayerAccountMember[];
}) {
  if (!player.linkedUserId) return <Badge variant="outline">Sin cuenta</Badge>;
  return (
    <span className="truncate text-xs text-muted-foreground">
      {accountPresentationLabel(members, player.linkedUserId)}
    </span>
  );
}

/* ---------------------------------------------------------------- mutations */

function useDirectoryMutation(onDone?: () => void) {
  return useMutation(
    trpc.matches.execute.mutationOptions({
      onSuccess: async () => {
        toast.success("Jugador actualizado");
        onDone?.();
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: trpc.matches.directory.queryKey() }),
          queryClient.invalidateQueries({ queryKey: trpc.stats.dashboard.queryKey() }),
          queryClient.invalidateQueries({ queryKey: trpc.stats.player.queryKey() }),
        ]);
      },
      onError: (cause) =>
        toast.error("No pudimos guardar los cambios", { description: cause.message }),
    }),
  );
}

export function useCanManage() {
  const { role } = useAppContext();
  return role !== "member";
}

export function useArchivePlayer() {
  const execute = useDirectoryMutation();
  return {
    isPending: execute.isPending,
    toggle: (player: { id: string; archived: boolean }) =>
      execute.mutate({ type: "archivePlayer", playerId: player.id, archived: !player.archived }),
  };
}

export function EditPlayerDialog({
  open,
  onOpenChange,
  player,
  members,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  player: Pick<PlayerRowData, "id" | "displayName" | "linkedUserId">;
  members: readonly PlayerAccountMember[];
}) {
  const [displayName, setDisplayName] = useState(player.displayName);
  const [linkedUserId, setLinkedUserId] = useState<string | null>(player.linkedUserId);
  const execute = useDirectoryMutation(() => onOpenChange(false));
  const options = accountLinkOptions(members, player.id);
  const accountItems = [
    { label: "Sin cuenta vinculada", value: null },
    ...options.map((member) => ({
      disabled: member.disabled,
      label: `${member.name} · ${member.email}`,
      value: member.id,
    })),
  ];
  const invalid = !displayName.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar jugador</DialogTitle>
          <DialogDescription>
            El historial conserva sus partidos con el nombre nuevo.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (invalid) return;
            execute.mutate({
              type: "upsertPlayer",
              displayName,
              linkedUserId,
              playerId: player.id,
            });
          }}
        >
          <FieldGroup>
            <Field data-invalid={invalid}>
              <FieldLabel htmlFor="proto-player-name">Nombre</FieldLabel>
              <Input
                aria-invalid={invalid}
                id="proto-player-name"
                onChange={(event) => setDisplayName(event.target.value)}
                value={displayName}
              />
              {invalid ? <FieldError>Ingresá un nombre.</FieldError> : null}
            </Field>
            <Field>
              <FieldLabel htmlFor="proto-player-account">Cuenta vinculada</FieldLabel>
              <Select
                items={accountItems}
                onValueChange={(value) => setLinkedUserId(typeof value === "string" ? value : null)}
                value={linkedUserId}
              >
                <SelectTrigger id="proto-player-account" className="w-full">
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
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={execute.isPending || invalid}>
                Guardar cambios
              </Button>
            </DialogFooter>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CreatePlayerDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [displayName, setDisplayName] = useState("");
  const execute = useDirectoryMutation(() => {
    setDisplayName("");
    onOpenChange(false);
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo jugador</DialogTitle>
          <DialogDescription>Quedará disponible para próximos partidos.</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!displayName.trim()) return;
            execute.mutate({ type: "upsertPlayer", displayName, linkedUserId: null });
          }}
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="proto-new-player">Nombre</FieldLabel>
              <Input
                id="proto-new-player"
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Nombre del jugador"
                value={displayName}
              />
            </Field>
            <Button type="submit" disabled={execute.isPending || !displayName.trim()}>
              Guardar
            </Button>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function InvitePlayerForm({
  player,
  compact = false,
}: {
  player: Pick<PlayerRowData, "id" | "displayName">;
  compact?: boolean;
}) {
  const { activeGroupId } = useAppContext();
  const [email, setEmail] = useState("");
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
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

  async function copy() {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("No pudimos copiar el enlace");
    }
  }

  if (inviteUrl) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">
          Mandale este enlace a {player.displayName}. Al aceptarlo, su cuenta queda vinculada.
        </p>
        <Button type="button" variant="outline" onClick={copy}>
          {copied ? (
            <CheckIcon data-icon="inline-start" aria-hidden="true" />
          ) : (
            <CopyIcon data-icon="inline-start" aria-hidden="true" />
          )}
          {copied ? "Copiado" : "Copiar enlace"}
        </Button>
      </div>
    );
  }

  return (
    <form
      className={cn("flex gap-2", compact ? "flex-row items-end" : "flex-col")}
      onSubmit={(event) => {
        event.preventDefault();
        const value = email.trim();
        if (!value) return;
        invite.mutate({ email: value, groupId: activeGroupId, playerId: player.id });
      }}
    >
      <Field data-invalid={invite.isError} className="min-w-0 flex-1">
        <FieldLabel htmlFor={`proto-invite-${player.id}`}>Email de {player.displayName}</FieldLabel>
        <Input
          aria-invalid={invite.isError}
          autoComplete="off"
          id={`proto-invite-${player.id}`}
          onChange={(event) => {
            setEmail(event.target.value);
            invite.reset();
          }}
          placeholder="nombre@mail.com"
          type="email"
          value={email}
        />
        {invite.isError ? <FieldError>{invite.error.message}</FieldError> : null}
      </Field>
      <Button type="submit" variant="secondary" disabled={invite.isPending || !email.trim()}>
        <MailPlusIcon data-icon="inline-start" aria-hidden="true" />
        Invitar
      </Button>
    </form>
  );
}

export function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}

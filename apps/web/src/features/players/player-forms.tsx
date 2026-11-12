"use client";

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
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hay-fulbo/ui/components/select";
import { useMutation } from "@tanstack/react-query";
import { CheckIcon, CopyIcon, MailPlusIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { useAppContext } from "@/components/app-shell";
import {
  accountLinkOptions,
  accountPresentationLabel,
  type PlayerAccountMember,
} from "@/lib/player-account-link";
import { queryClient, trpc } from "@/utils/trpc";

type EditablePlayer = { id: string; displayName: string; linkedUserId: string | null };

export function usePlayerMutation(onDone?: () => void) {
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

export function CreatePlayerDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [displayName, setDisplayName] = useState("");
  const execute = usePlayerMutation(() => {
    setDisplayName("");
    onOpenChange(false);
  });
  const valid = Boolean(displayName.trim());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo jugador</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!valid) return;
            execute.mutate({ type: "upsertPlayer", displayName, linkedUserId: null });
          }}
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="new-player-name">Nombre</FieldLabel>
              <Input
                id="new-player-name"
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Nombre del jugador"
                value={displayName}
              />
            </Field>
            {execute.isError ? <FieldError role="alert">{execute.error.message}</FieldError> : null}
            <Button type="submit" disabled={execute.isPending || !valid}>
              Guardar
            </Button>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function EditPlayerDialog({
  members,
  onOpenChange,
  open,
  player,
}: {
  members: readonly PlayerAccountMember[];
  onOpenChange: (open: boolean) => void;
  open: boolean;
  player: EditablePlayer;
}) {
  const [displayName, setDisplayName] = useState(player.displayName);
  const [linkedUserId, setLinkedUserId] = useState<string | null>(player.linkedUserId);
  const execute = usePlayerMutation(() => onOpenChange(false));
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
            Sus partidos anteriores pasan a mostrar el nombre nuevo.
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
              <FieldLabel htmlFor="edit-player-name">Nombre</FieldLabel>
              <Input
                aria-describedby={invalid ? "edit-player-name-error" : undefined}
                aria-invalid={invalid}
                id="edit-player-name"
                onChange={(event) => setDisplayName(event.target.value)}
                value={displayName}
              />
              {invalid ? (
                <FieldError id="edit-player-name-error">Ingresá un nombre.</FieldError>
              ) : null}
            </Field>
            <Field>
              <FieldLabel htmlFor="edit-player-account">Cuenta vinculada</FieldLabel>
              <Select
                items={accountItems}
                onValueChange={(value) => setLinkedUserId(typeof value === "string" ? value : null)}
                value={linkedUserId}
              >
                <SelectTrigger id="edit-player-account" className="w-full">
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
            {execute.isError ? <FieldError role="alert">{execute.error.message}</FieldError> : null}
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

export function InvitePlayerForm({ player }: { player: { id: string; displayName: string } }) {
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
  const inputId = `invite-player-${player.id}`;

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
      className="flex flex-col gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        const value = email.trim();
        if (!value) return;
        invite.mutate({ email: value, groupId: activeGroupId, playerId: player.id });
      }}
    >
      <Field data-invalid={invite.isError}>
        <FieldLabel htmlFor={inputId}>Email de {player.displayName}</FieldLabel>
        <Input
          aria-describedby={invite.isError ? `${inputId}-error` : undefined}
          aria-invalid={invite.isError}
          autoComplete="off"
          id={inputId}
          onChange={(event) => {
            setEmail(event.target.value);
            invite.reset();
          }}
          placeholder="nombre@mail.com"
          required
          type="email"
          value={email}
        />
        {invite.isError ? (
          <FieldError id={`${inputId}-error`} role="alert">
            {invite.error.message}
          </FieldError>
        ) : null}
      </Field>
      <Button type="submit" variant="secondary" disabled={invite.isPending || !email.trim()}>
        <MailPlusIcon data-icon="inline-start" aria-hidden="true" />
        Crear invitación
      </Button>
    </form>
  );
}

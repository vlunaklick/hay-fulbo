"use client";

import { Alert, AlertDescription, AlertTitle } from "@hay-fulbo/ui/components/alert";
import { Avatar, AvatarFallback } from "@hay-fulbo/ui/components/avatar";
import { Badge } from "@hay-fulbo/ui/components/badge";
import { Button } from "@hay-fulbo/ui/components/button";
import {
  Card,
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
} from "@hay-fulbo/ui/components/dialog";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@hay-fulbo/ui/components/input-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hay-fulbo/ui/components/select";
import { Skeleton } from "@hay-fulbo/ui/components/skeleton";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  CircleAlertIcon,
  CopyIcon,
  LinkIcon,
  RefreshCwIcon,
  ShieldCheckIcon,
  Trash2Icon,
  UnlinkIcon,
  UsersRoundIcon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { useAppContext } from "@/components/app-shell";
import { initials } from "@/lib/initials";
import { queryClient, trpc } from "@/utils/trpc";

type GroupMember = {
  email: string;
  id: string;
  linkedPlayerId: string | null;
  membershipId: string;
  name: string;
  role: "leader" | "member" | "owner";
};

const roleLabel = {
  leader: "Líder",
  member: "Miembro",
  owner: "Organizador",
} as const;

export function GroupMembersPage() {
  const { activeGroupId, role } = useAppContext();
  const directory = useQuery(trpc.matches.directory.queryOptions());
  const [removeTarget, setRemoveTarget] = useState<GroupMember | null>(null);
  const joinLink = useQuery({
    ...trpc.group.joinLink.status.queryOptions({ groupId: activeGroupId }),
    enabled: role === "owner",
  });

  const updateRole = useMutation(
    trpc.group.updateMemberRole.mutationOptions({
      onSuccess: async () => {
        toast.success("Permisos actualizados");
        await queryClient.invalidateQueries({ queryKey: trpc.matches.directory.queryKey() });
      },
      onError: (error) =>
        toast.error("No pudimos cambiar los permisos", { description: error.message }),
    }),
  );
  const removeMember = useMutation(
    trpc.group.removeMember.mutationOptions({
      onSuccess: async () => {
        toast.success("La cuenta salió del grupo");
        setRemoveTarget(null);
        await queryClient.invalidateQueries({ queryKey: trpc.matches.directory.queryKey() });
      },
      onError: (error) =>
        toast.error("No pudimos sacar a la cuenta", { description: error.message }),
    }),
  );
  const renewJoinLink = useMutation(
    trpc.group.joinLink.renew.mutationOptions({
      onSuccess: async (result) => {
        await queryClient.invalidateQueries({
          queryKey: trpc.group.joinLink.status.queryKey({ groupId: activeGroupId }),
        });
        await navigator.clipboard.writeText(result.url).catch(() => undefined);
        toast.success("Link creado y copiado");
      },
      onError: (error) => toast.error("No pudimos crear el link", { description: error.message }),
    }),
  );
  const revokeJoinLink = useMutation(
    trpc.group.joinLink.revoke.mutationOptions({
      onSuccess: async () => {
        toast.success("Link desactivado");
        await queryClient.invalidateQueries({
          queryKey: trpc.group.joinLink.status.queryKey({ groupId: activeGroupId }),
        });
      },
      onError: (error) =>
        toast.error("No pudimos desactivar el link", { description: error.message }),
    }),
  );

  async function copyJoinLink() {
    if (!joinLink.data?.active) return;
    try {
      await navigator.clipboard.writeText(joinLink.data.url);
      toast.success("Link copiado");
    } catch {
      toast.error("No pudimos copiarlo");
    }
  }

  if (role !== "owner") {
    return (
      <Alert>
        <CircleAlertIcon aria-hidden="true" />
        <AlertTitle>Solo para el organizador</AlertTitle>
        <AlertDescription>
          Los líderes pueden administrar partidos, jugadores y canchas, pero no los permisos del
          grupo.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <p className="text-sm font-semibold text-primary">Tu grupo</p>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Personas y permisos</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Designá líderes para que puedan editar partidos, jugadores y canchas.
        </p>
      </header>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <LinkIcon aria-hidden="true" />
            <CardTitle>Link para sumarse</CardTitle>
            {joinLink.data?.active ? <Badge variant="secondary">Activo</Badge> : null}
          </div>
          <CardDescription>
            Cualquiera con este link puede crear una cuenta o ingresar y sumarse como miembro.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {joinLink.isPending ? (
            <Skeleton className="h-11 w-full" />
          ) : joinLink.isError ? (
            <Alert variant="destructive">
              <CircleAlertIcon aria-hidden="true" />
              <AlertTitle>No pudimos cargar el link</AlertTitle>
              <AlertDescription>{joinLink.error.message}</AlertDescription>
            </Alert>
          ) : joinLink.data.active ? (
            <>
              <InputGroup>
                <InputGroupInput
                  aria-label="Link para sumarse al grupo"
                  readOnly
                  value={joinLink.data.url}
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupButton onClick={copyJoinLink} size="icon-sm" aria-label="Copiar link">
                    <CopyIcon aria-hidden="true" />
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={renewJoinLink.isPending || revokeJoinLink.isPending}
                  onClick={() => renewJoinLink.mutate({ groupId: activeGroupId })}
                  variant="outline"
                >
                  <RefreshCwIcon data-icon="inline-start" aria-hidden="true" />
                  {renewJoinLink.isPending ? "Renovando…" : "Renovar link"}
                </Button>
                <Button
                  disabled={renewJoinLink.isPending || revokeJoinLink.isPending}
                  onClick={() => revokeJoinLink.mutate({ groupId: activeGroupId })}
                  variant="ghost"
                >
                  <UnlinkIcon data-icon="inline-start" aria-hidden="true" />
                  {revokeJoinLink.isPending ? "Desactivando…" : "Desactivar"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Renovarlo invalida inmediatamente el link anterior.
              </p>
            </>
          ) : (
            <div className="flex flex-col items-start gap-2">
              <Button
                disabled={renewJoinLink.isPending}
                onClick={() => renewJoinLink.mutate({ groupId: activeGroupId })}
              >
                <LinkIcon data-icon="inline-start" aria-hidden="true" />
                {renewJoinLink.isPending ? "Creando…" : "Crear link"}
              </Button>
              <p className="text-xs text-muted-foreground">
                El link se copia automáticamente cuando lo creás.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {directory.isPending ? (
        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton className="h-40 w-full" key={index} />
          ))}
        </div>
      ) : directory.isError ? (
        <Alert variant="destructive">
          <CircleAlertIcon aria-hidden="true" />
          <AlertTitle>No pudimos cargar el grupo</AlertTitle>
          <AlertDescription>{directory.error.message}</AlertDescription>
        </Alert>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {(directory.data.members as GroupMember[]).map((member) => (
            <Card key={member.membershipId}>
              <CardHeader className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
                <Avatar className="size-11">
                  <AvatarFallback>{initials(member.name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <CardTitle className="truncate text-base">{member.name}</CardTitle>
                  <CardDescription className="truncate">{member.email}</CardDescription>
                </div>
                <Badge variant={member.role === "owner" ? "secondary" : "outline"}>
                  {roleLabel[member.role]}
                </Badge>
              </CardHeader>
              <CardContent className="flex items-center gap-2">
                {member.role === "owner" ? (
                  <div className="flex min-h-10 items-center gap-2 text-sm text-muted-foreground">
                    <ShieldCheckIcon className="size-4 text-primary" aria-hidden="true" />
                    El organizador conserva el control de miembros y permisos.
                  </div>
                ) : (
                  <>
                    <Select
                      disabled={updateRole.isPending || removeMember.isPending}
                      value={member.role}
                      onValueChange={(nextRole) => {
                        if (nextRole !== "leader" && nextRole !== "member") return;
                        updateRole.mutate({
                          groupId: activeGroupId,
                          membershipId: member.membershipId,
                          role: nextRole,
                        });
                      }}
                    >
                      <SelectTrigger
                        aria-label={`Permisos de ${member.name}`}
                        className="min-w-0 flex-1"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="member">Miembro · solo consulta</SelectItem>
                        <SelectItem value="leader">Líder · puede editar</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      aria-label={`Sacar a ${member.name} del grupo`}
                      disabled={updateRole.isPending || removeMember.isPending}
                      onClick={() => setRemoveTarget(member)}
                      size="icon"
                      variant="outline"
                    >
                      <Trash2Icon aria-hidden="true" />
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={Boolean(removeTarget)} onOpenChange={(open) => !open && setRemoveTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sacar a {removeTarget?.name} del grupo</DialogTitle>
            <DialogDescription>
              La cuenta perderá acceso. Si estaba vinculada a un jugador, se desvinculará, pero sus
              partidos, goles y asistencias quedarán intactos.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveTarget(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={!removeTarget || removeMember.isPending}
              onClick={() => {
                if (!removeTarget) return;
                removeMember.mutate({
                  groupId: activeGroupId,
                  membershipId: removeTarget.membershipId,
                });
              }}
            >
              <UsersRoundIcon data-icon="inline-start" aria-hidden="true" />
              Sacar del grupo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

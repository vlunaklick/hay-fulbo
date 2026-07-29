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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hay-fulbo/ui/components/select";
import { Skeleton } from "@hay-fulbo/ui/components/skeleton";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CircleAlertIcon, ShieldCheckIcon, Trash2Icon, UsersRoundIcon } from "lucide-react";
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
      <header className="space-y-1">
        <p className="text-sm font-semibold text-primary">Tu grupo</p>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Personas y permisos</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Designá líderes para que puedan editar partidos, jugadores y canchas.
        </p>
      </header>

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

"use client";

import { Alert, AlertDescription, AlertTitle } from "@hay-fulbo/ui/components/alert";
import { Avatar, AvatarFallback } from "@hay-fulbo/ui/components/avatar";
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
import { cn } from "@hay-fulbo/ui/lib/utils";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  CircleAlertIcon,
  CopyIcon,
  GlobeIcon,
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

export function GroupMembersPage() {
  const { activeGroupId, role } = useAppContext();
  const directory = useQuery(trpc.matches.directory.queryOptions());
  const [removeTarget, setRemoveTarget] = useState<GroupMember | null>(null);
  const joinLink = useQuery({
    ...trpc.group.joinLink.status.queryOptions({ groupId: activeGroupId }),
    enabled: role === "owner",
  });
  const settings = useQuery({
    ...trpc.group.settings.read.queryOptions({ groupId: activeGroupId }),
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
  const updateVisibility = useMutation(
    trpc.group.settings.updateVisibility.mutationOptions({
      onSuccess: async (result) => {
        toast.success(
          result.publicVisibility ? "El grupo es público" : "El grupo dejó de ser público",
        );
        await queryClient.invalidateQueries({
          queryKey: trpc.group.settings.read.queryKey({ groupId: activeGroupId }),
        });
      },
      onError: (error) =>
        toast.error("No pudimos cambiar la visibilidad", { description: error.message }),
    }),
  );
  const updateRatingQuorum = useMutation(
    trpc.group.settings.updateRatingQuorum.mutationOptions({
      onSuccess: async () => {
        toast.success("Regla de notas actualizada");
        await queryClient.invalidateQueries({
          queryKey: trpc.group.settings.read.queryKey({ groupId: activeGroupId }),
        });
      },
      onError: (error) =>
        toast.error("No pudimos cambiar la regla de notas", { description: error.message }),
    }),
  );

  async function copyText(value: string, label = "Link copiado") {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(label);
    } catch {
      toast.error("No pudimos copiarlo");
    }
  }

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

      <section
        id="invitar"
        className="flex scroll-mt-24 flex-col gap-3"
        aria-labelledby="join-link-title"
      >
        <div className="flex flex-col gap-1">
          <h2
            id="join-link-title"
            className="flex items-center gap-2 text-lg font-bold tracking-tight"
          >
            Link para sumarse
            {joinLink.data?.active ? <Badge variant="secondary">Activo</Badge> : null}
          </h2>
          <p className="text-sm text-muted-foreground">
            Cualquiera con este link puede crear una cuenta o ingresar y sumarse como miembro.
          </p>
        </div>
        <div className="flex flex-col gap-3">
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
              <div className="flex flex-wrap items-center gap-2">
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
                <span className="text-xs text-muted-foreground">
                  Renovarlo invalida inmediatamente el link anterior.
                </span>
              </div>
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
        </div>
      </section>

      <Separator />

      <section className="flex flex-col gap-3" aria-labelledby="public-group-title">
        <div className="flex flex-col gap-1">
          <h2
            id="public-group-title"
            className="flex items-center gap-2 text-lg font-bold tracking-tight"
          >
            Grupo público
            {settings.data?.publicVisibility ? <Badge variant="secondary">Público</Badge> : null}
          </h2>
          <p className="text-sm text-muted-foreground">
            Cualquiera con la dirección puede ver partidos, resultados y estadísticas. Sin cuentas,
            sin deudas: los pagos nunca se muestran en la vista pública.
          </p>
        </div>
        <div className="flex flex-col gap-3">
          {settings.isPending ? (
            <Skeleton className="h-11 w-full" />
          ) : settings.isError ? (
            <Alert variant="destructive">
              <CircleAlertIcon aria-hidden="true" />
              <AlertTitle>No pudimos cargar la configuración</AlertTitle>
              <AlertDescription>{settings.error.message}</AlertDescription>
            </Alert>
          ) : settings.data?.publicVisibility ? (
            <>
              <InputGroup>
                <InputGroupInput
                  aria-label="Dirección pública del grupo"
                  readOnly
                  value={`${typeof window === "undefined" ? "" : window.location.origin}/g/${settings.data.slug ?? ""}`}
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    aria-label="Copiar dirección pública"
                    onClick={() => {
                      const slug = settings.data?.slug;
                      if (slug)
                        void copyText(`${window.location.origin}/g/${slug}`, "Dirección copiada");
                    }}
                    size="icon-sm"
                  >
                    <CopyIcon aria-hidden="true" />
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={updateVisibility.isPending}
                  onClick={() =>
                    updateVisibility.mutate({ groupId: activeGroupId, publicVisibility: false })
                  }
                  variant="outline"
                >
                  <UnlinkIcon data-icon="inline-start" aria-hidden="true" />
                  {updateVisibility.isPending ? "Guardando…" : "Hacer privado"}
                </Button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-start gap-2">
              <Button
                disabled={updateVisibility.isPending}
                onClick={() =>
                  updateVisibility.mutate({ groupId: activeGroupId, publicVisibility: true })
                }
              >
                <GlobeIcon data-icon="inline-start" aria-hidden="true" />
                {updateVisibility.isPending ? "Activando…" : "Hacer público"}
              </Button>
              <p className="text-xs text-muted-foreground">
                Podés apagarlo cuando quieras y la dirección deja de funcionar al instante.
              </p>
            </div>
          )}
        </div>
      </section>

      <Separator />

      <section className="flex flex-col gap-3" aria-labelledby="rating-quorum-title">
        <div className="flex flex-col gap-1">
          <h2
            id="rating-quorum-title"
            className="flex items-center gap-2 text-lg font-bold tracking-tight"
          >
            Notas entre jugadores
          </h2>
          <p className="text-sm text-muted-foreground">
            Después de cada partido cerrado, los que jugaron pueden ponerle una nota del 1 al 10 a
            sus compañeros. Los votos son anónimos y los promedios se revelan según el quórum que
            elijas.
          </p>
        </div>
        {settings.isPending ? (
          <Skeleton className="h-11 w-full" />
        ) : settings.isError ? (
          <Alert variant="destructive">
            <CircleAlertIcon aria-hidden="true" />
            <AlertTitle>No pudimos cargar la configuración</AlertTitle>
            <AlertDescription>{settings.error.message}</AlertDescription>
          </Alert>
        ) : (
          <Select
            disabled={updateRatingQuorum.isPending}
            value={settings.data?.ratingQuorum ?? "all_voted"}
            onValueChange={(next) => {
              if (next !== "all_voted" && next !== "half_plus_one" && next !== "first_vote") {
                return;
              }
              updateRatingQuorum.mutate({ groupId: activeGroupId, ratingQuorum: next });
            }}
          >
            <SelectTrigger aria-label="Quórum para revelar notas" className="w-full sm:w-96">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all_voted">Revelar cuando voten todos</SelectItem>
                <SelectItem value="half_plus_one">Revelar con mitad más uno</SelectItem>
                <SelectItem value="first_vote">Revelar con el primer voto completo</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        )}
      </section>

      <Separator />

      {directory.isPending ? (
        <div className="flex flex-col">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton
              key={index}
              className="h-16 w-full rounded-none first:rounded-t-md last:rounded-b-md"
            />
          ))}
        </div>
      ) : directory.isError ? (
        <Alert variant="destructive">
          <CircleAlertIcon aria-hidden="true" />
          <AlertTitle>No pudimos cargar el grupo</AlertTitle>
          <AlertDescription>{directory.error.message}</AlertDescription>
        </Alert>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          {(directory.data.members as GroupMember[]).map((member, index) => (
            <div
              key={member.membershipId}
              className={cn(
                "flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5",
                index > 0 && "border-t",
              )}
            >
              <Avatar className="size-10">
                <AvatarFallback>{initials(member.name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1 basis-40">
                <p className="truncate text-sm font-medium">{member.name}</p>
                <p className="truncate text-xs text-muted-foreground">{member.email}</p>
              </div>
              {member.role === "owner" ? (
                <span className="flex min-h-10 items-center gap-2 text-sm text-muted-foreground">
                  <ShieldCheckIcon className="size-4 shrink-0 text-primary" aria-hidden="true" />
                  Organizador
                </span>
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
                      className="w-44 min-w-0"
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
                    variant="ghost"
                  >
                    <Trash2Icon aria-hidden="true" />
                  </Button>
                </>
              )}
            </div>
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

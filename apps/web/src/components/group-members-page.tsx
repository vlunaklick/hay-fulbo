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
import {
  Item,
  ItemActions,
  ItemContent,
  ItemGroup,
  ItemMedia,
} from "@hay-fulbo/ui/components/item";
import { Skeleton } from "@hay-fulbo/ui/components/skeleton";
import { Spinner } from "@hay-fulbo/ui/components/spinner";
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

import { PageHeader } from "@/components/page-header";
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
        <AlertTitle>Solo para el responsable del grupo</AlertTitle>
        <AlertDescription>
          Los líderes pueden administrar partidos, jugadores y canchas, pero no los permisos del
          grupo.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Personas y permisos"
        description="Designá líderes para que puedan editar partidos, jugadores y canchas."
      />

      <section
        id="invitar"
        className="flex scroll-mt-24 flex-col gap-3"
        aria-labelledby="join-link-title"
      >
        <div className="flex flex-col gap-1">
          <h2 id="join-link-title" className="flex items-center gap-2 text-base font-semibold">
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
                  {renewJoinLink.isPending ? (
                    <Spinner data-icon="inline-start" />
                  ) : (
                    <RefreshCwIcon data-icon="inline-start" aria-hidden="true" />
                  )}
                  {renewJoinLink.isPending ? "Renovando…" : "Renovar link"}
                </Button>
                <Button
                  disabled={renewJoinLink.isPending || revokeJoinLink.isPending}
                  onClick={() => revokeJoinLink.mutate({ groupId: activeGroupId })}
                  variant="ghost"
                >
                  {revokeJoinLink.isPending ? (
                    <Spinner data-icon="inline-start" />
                  ) : (
                    <UnlinkIcon data-icon="inline-start" aria-hidden="true" />
                  )}
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
                {renewJoinLink.isPending ? (
                  <Spinner data-icon="inline-start" />
                ) : (
                  <LinkIcon data-icon="inline-start" aria-hidden="true" />
                )}
                {renewJoinLink.isPending ? "Creando…" : "Crear link"}
              </Button>
            </div>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="public-group-title">
        <div className="flex flex-col gap-1">
          <h2 id="public-group-title" className="flex items-center gap-2 text-base font-semibold">
            Grupo público
            {settings.data?.publicVisibility ? <Badge variant="secondary">Público</Badge> : null}
          </h2>
          <p className="text-sm text-muted-foreground">
            Cualquiera con la dirección ve partidos, resultados y estadísticas. Los pagos nunca se
            muestran.
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
                  {updateVisibility.isPending ? (
                    <Spinner data-icon="inline-start" />
                  ) : (
                    <UnlinkIcon data-icon="inline-start" aria-hidden="true" />
                  )}
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
                {updateVisibility.isPending ? (
                  <Spinner data-icon="inline-start" />
                ) : (
                  <GlobeIcon data-icon="inline-start" aria-hidden="true" />
                )}
                {updateVisibility.isPending ? "Activando…" : "Hacer público"}
              </Button>
            </div>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="rating-quorum-title">
        <div className="flex flex-col gap-1">
          <h2 id="rating-quorum-title" className="flex items-center gap-2 text-base font-semibold">
            Notas entre jugadores
          </h2>
          <p className="text-sm text-muted-foreground">
            Los que jugaron se ponen notas del 1 al 10. Son anónimas y los promedios se ven al
            llegar al quórum.
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
            items={ratingQuorumItems}
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

      <section className="flex flex-col gap-3" aria-labelledby="members-title">
        <h2 id="members-title" className="text-base font-semibold">
          Integrantes
        </h2>
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
          <ItemGroup className="gap-0 divide-y overflow-hidden rounded-lg border bg-card">
            {(directory.data.members as GroupMember[]).map((member) => (
              <Item key={member.membershipId} role="listitem" className="gap-3 px-4 py-3">
                <ItemMedia>
                  <Avatar>
                    <AvatarFallback>{initials(member.name)}</AvatarFallback>
                  </Avatar>
                </ItemMedia>
                <ItemContent className="min-w-0 basis-40 gap-0">
                  <p className="truncate text-sm font-medium">{member.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{member.email}</p>
                </ItemContent>
                {member.role === "owner" ? (
                  <ItemActions className="min-h-10 text-sm text-muted-foreground">
                    <ShieldCheckIcon
                      className="size-4 shrink-0 text-primary-text"
                      aria-hidden="true"
                    />
                    Responsable del grupo
                  </ItemActions>
                ) : (
                  <ItemActions className="gap-3">
                    <Select
                      items={roleItems}
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
                  </ItemActions>
                )}
              </Item>
            ))}
          </ItemGroup>
        )}
      </section>

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

const ratingQuorumItems = [
  { value: "all_voted", label: "Revelar cuando voten todos" },
  { value: "half_plus_one", label: "Revelar con mitad más uno" },
  { value: "first_vote", label: "Revelar con el primer voto completo" },
];

const roleItems = [
  { value: "member", label: "Miembro · solo consulta" },
  { value: "leader", label: "Líder · puede editar" },
];

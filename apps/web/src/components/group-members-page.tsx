"use client";

import { Alert, AlertDescription, AlertTitle } from "@hay-fulbo/ui/components/alert";
import { Avatar, AvatarFallback } from "@hay-fulbo/ui/components/avatar";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@hay-fulbo/ui/components/dropdown-menu";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@hay-fulbo/ui/components/input-group";
import { Skeleton } from "@hay-fulbo/ui/components/skeleton";
import { Spinner } from "@hay-fulbo/ui/components/spinner";
import { ToggleGroup, ToggleGroupItem } from "@hay-fulbo/ui/components/toggle-group";
import { cn } from "@hay-fulbo/ui/lib/utils";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ArrowRightLeftIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CircleAlertIcon,
  CopyIcon,
  EllipsisIcon,
  GlobeIcon,
  LinkIcon,
  PlusIcon,
  RefreshCwIcon,
  Share2Icon,
  StarIcon,
  Trash2Icon,
  UnlinkIcon,
  UsersRoundIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { useAppContext } from "@/components/app-shell";
import { GroupCreateDialog } from "@/components/group-switcher";
import { PageHeader } from "@/components/page-header";
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

type RatingQuorum = "all_voted" | "half_plus_one" | "first_vote";

/**
 * The group's home. Phones show the hub and drill into one topic at a time
 * (`?tema=`, so the system back gesture returns to the hub); desktop shows the
 * hub beside the open topic.
 */
const topics = {
  integrantes: "Integrantes",
  invitar: "Link para sumarse",
  publico: "Vista pública",
  notas: "Notas entre jugadores",
} as const;

type Topic = keyof typeof topics;

function parseTopic(value: string | null): Topic | null {
  return value && value in topics ? (value as Topic) : null;
}

const roleLabel: Record<GroupMember["role"], string> = {
  owner: "Responsable",
  leader: "Líder",
  member: "Miembro",
};

const roleHint = {
  member: "Consulta partidos, deudas y estadísticas.",
  leader: "Puede editar partidos, jugadores y canchas.",
} as const;

const quorumOptions: { value: RatingQuorum; label: string; hint: string }[] = [
  {
    value: "all_voted",
    label: "Cuando voten todos",
    hint: "El promedio aparece recién con el último voto.",
  },
  {
    value: "half_plus_one",
    label: "Con mitad más uno",
    hint: "Alcanza con que vote la mayoría de los que jugaron.",
  },
  {
    value: "first_vote",
    label: "Con el primer voto completo",
    hint: "Se revela apenas alguien vota a todos.",
  },
];

export function GroupMembersPage() {
  const { role } = useAppContext();
  const router = useRouter();
  const opened = parseTopic(useSearchParams().get("tema"));
  const topic = opened ?? "integrantes";
  const focusDetail = useRef(false);

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

  function open(next: Topic) {
    focusDetail.current = true;
    router.push(`/dashboard/grupo?tema=${next}`);
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8 md:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] md:items-start">
      <div className={cn("flex flex-col gap-8 md:sticky md:top-8", opened && "max-md:hidden")}>
        <GroupHub topic={topic} onOpen={open} />
      </div>
      <div className={cn("flex min-w-0 flex-col gap-4", !opened && "max-md:hidden")}>
        <Button
          variant="ghost"
          nativeButton={false}
          render={<Link href="/dashboard/grupo" />}
          className="-ml-3 self-start md:hidden"
        >
          <ChevronLeftIcon data-icon="inline-start" aria-hidden="true" />
          Grupo
        </Button>
        <section aria-labelledby="group-topic" className="flex flex-col gap-4">
          <h2
            // Keyed on the URL topic so opening one from the hub remounts the heading and focuses it.
            key={opened ?? "default"}
            id="group-topic"
            tabIndex={-1}
            // Moving between topics swaps the whole view on phones: land focus on the new heading.
            ref={(node) => {
              if (node && focusDetail.current) {
                focusDetail.current = false;
                node.focus();
              }
            }}
            className="text-xl font-bold tracking-tight outline-none"
          >
            {topics[topic]}
          </h2>
          {topic === "integrantes" ? <MembersTopic /> : null}
          {topic === "invitar" ? <InviteTopic /> : null}
          {topic === "publico" ? <PublicTopic /> : null}
          {topic === "notas" ? <QuorumTopic /> : null}
        </section>
      </div>
    </div>
  );
}

function GroupHub({ topic, onOpen }: { topic: Topic; onOpen: (topic: Topic) => void }) {
  const { activeGroupId, groupName } = useAppContext();
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const directory = useQuery(trpc.matches.directory.queryOptions());
  const joinLink = useQuery(trpc.group.joinLink.status.queryOptions({ groupId: activeGroupId }));
  const settings = useQuery(trpc.group.settings.read.queryOptions({ groupId: activeGroupId }));
  const groups = useQuery(trpc.group.list.queryOptions());
  const select = useMutation(
    trpc.group.select.mutationOptions({
      onSuccess: () => {
        queryClient.clear();
        router.push("/dashboard");
        router.refresh();
      },
      onError: (error) =>
        toast.error("No pudimos cambiar de grupo", { description: error.message }),
    }),
  );

  const members = directory.data?.members as GroupMember[] | undefined;
  const leaders = members?.filter((member) => member.role === "leader").length ?? 0;
  const others = groups.data?.filter((group) => group.id !== activeGroupId) ?? [];
  const quorum = quorumOptions.find((option) => option.value === settings.data?.ratingQuorum);

  return (
    <>
      <PageHeader title={groupName} />

      <RowGroup label="Personas">
        <HubRow
          icon={<UsersRoundIcon aria-hidden="true" />}
          label={topics.integrantes}
          value={
            members ? (
              <span className="tabular-nums">
                {members.length} · {leaders} {leaders === 1 ? "líder" : "líderes"}
              </span>
            ) : null
          }
          active={topic === "integrantes"}
          onClick={() => onOpen("integrantes")}
        />
        <HubRow
          icon={<LinkIcon aria-hidden="true" />}
          label={topics.invitar}
          value={joinLink.data ? (joinLink.data.active ? "Activo" : "Desactivado") : null}
          active={topic === "invitar"}
          onClick={() => onOpen("invitar")}
        />
      </RowGroup>

      <RowGroup label="Lo que se ve afuera">
        <HubRow
          icon={<GlobeIcon aria-hidden="true" />}
          label={topics.publico}
          value={settings.data ? (settings.data.publicVisibility ? "Activa" : "Privado") : null}
          active={topic === "publico"}
          onClick={() => onOpen("publico")}
        />
        <HubRow
          icon={<StarIcon aria-hidden="true" />}
          label="Notas"
          value={settings.data ? (quorum?.label ?? quorumOptions[0]!.label) : null}
          active={topic === "notas"}
          onClick={() => onOpen("notas")}
        />
      </RowGroup>

      <RowGroup label={others.length ? "Tus otros grupos" : "Otros grupos"}>
        {others.map((group) => (
          <button
            key={group.id}
            type="button"
            disabled={select.isPending}
            onClick={() => select.mutate({ groupId: group.id })}
            aria-label={`Cambiar a ${group.name}`}
            className={rowClass}
          >
            <span
              aria-hidden="true"
              className="grid size-7 shrink-0 place-items-center rounded-md bg-secondary text-xs font-bold text-secondary-foreground"
            >
              {initials(group.name)}
            </span>
            <span className="min-w-0 flex-1 truncate font-medium">{group.name}</span>
            {select.isPending && select.variables?.groupId === group.id ? (
              <Spinner />
            ) : (
              <ArrowRightLeftIcon aria-hidden="true" />
            )}
          </button>
        ))}
        <button type="button" onClick={() => setCreateOpen(true)} className={rowClass}>
          <PlusIcon aria-hidden="true" />
          <span className="flex-1 font-medium">Crear grupo</span>
        </button>
      </RowGroup>
      <GroupCreateDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}

const rowClass =
  "flex min-h-12 w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors duration-150 ease-out outline-none hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset active:bg-muted disabled:opacity-60 [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-muted-foreground";

function RowGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="px-1 text-xs font-medium text-muted-foreground">{label}</h2>
      <div className="flex flex-col divide-y overflow-hidden rounded-lg border bg-card">
        {children}
      </div>
    </div>
  );
}

function HubRow({
  icon,
  label,
  value,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  /** null while loading. */
  value: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "true" : undefined}
      className={cn(rowClass, "md:aria-current:bg-muted")}
    >
      {icon}
      <span className="min-w-0 flex-1 truncate font-medium">{label}</span>
      {value === null ? (
        <Skeleton className="h-4 w-16" />
      ) : (
        <span className="min-w-0 shrink truncate text-muted-foreground">{value}</span>
      )}
      <ChevronRightIcon aria-hidden="true" />
    </button>
  );
}

function MembersTopic() {
  const { activeGroupId } = useAppContext();
  const directory = useQuery(trpc.matches.directory.queryOptions());
  const [removeTarget, setRemoveTarget] = useState<GroupMember | null>(null);
  const updateRole = useMutation(
    trpc.group.updateMemberRole.mutationOptions({
      onSuccess: async (_result, input) => {
        toast.success(input.role === "leader" ? "Ahora es líder" : "Ahora es miembro");
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
  const busy = updateRole.isPending || removeMember.isPending;

  return (
    <>
      {directory.isPending ? (
        <div className="flex flex-col">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton
              key={index}
              className="h-14 w-full rounded-none first:rounded-t-lg last:rounded-b-lg"
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
        <ul className="divide-y overflow-hidden rounded-lg border bg-card">
          {(directory.data.members as GroupMember[]).map((member) => (
            <li
              key={member.membershipId}
              className="flex min-h-14 items-center gap-3 py-2 pr-2 pl-4"
            >
              <Avatar>
                <AvatarFallback>{initials(member.name)}</AvatarFallback>
              </Avatar>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-medium">{member.name}</span>
                <span className="truncate text-xs text-muted-foreground">{member.email}</span>
              </span>
              <span
                className={cn(
                  "shrink-0 text-xs",
                  member.role === "member" ? "text-muted-foreground" : "font-medium",
                )}
              >
                {roleLabel[member.role]}
              </span>
              {member.role === "owner" ? (
                <span className="size-11 shrink-0" aria-hidden="true" />
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    disabled={busy}
                    render={
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Permisos de ${member.name}`}
                      />
                    }
                  >
                    {updateRole.isPending &&
                    updateRole.variables?.membershipId === member.membershipId ? (
                      <Spinner />
                    ) : (
                      <EllipsisIcon aria-hidden="true" />
                    )}
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-64">
                    <DropdownMenuGroup>
                      <DropdownMenuLabel>Permisos</DropdownMenuLabel>
                      <DropdownMenuRadioGroup
                        value={member.role}
                        onValueChange={(nextRole) => {
                          if (nextRole !== "leader" && nextRole !== "member") return;
                          if (nextRole === member.role) return;
                          updateRole.mutate({
                            groupId: activeGroupId,
                            membershipId: member.membershipId,
                            role: nextRole,
                          });
                        }}
                      >
                        <DropdownMenuRadioItem value="member" closeOnClick>
                          <span className="flex flex-col">
                            <span>Miembro</span>
                            <span className="text-xs text-muted-foreground">{roleHint.member}</span>
                          </span>
                        </DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="leader" closeOnClick>
                          <span className="flex flex-col">
                            <span>Líder</span>
                            <span className="text-xs text-muted-foreground">{roleHint.leader}</span>
                          </span>
                        </DropdownMenuRadioItem>
                      </DropdownMenuRadioGroup>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onClick={() => setRemoveTarget(member)}>
                      <Trash2Icon aria-hidden="true" />
                      Sacar del grupo
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </li>
          ))}
        </ul>
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
              {removeMember.isPending ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <UsersRoundIcon data-icon="inline-start" aria-hidden="true" />
              )}
              Sacar del grupo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function InviteTopic() {
  const { activeGroupId, groupName } = useAppContext();
  const joinLink = useQuery(trpc.group.joinLink.status.queryOptions({ groupId: activeGroupId }));
  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: trpc.group.joinLink.status.queryKey({ groupId: activeGroupId }),
    });
  const renew = useMutation(
    trpc.group.joinLink.renew.mutationOptions({
      onSuccess: async (result) => {
        await invalidate();
        await navigator.clipboard.writeText(result.url).catch(() => undefined);
        toast.success("Link creado y copiado");
      },
      onError: (error) => toast.error("No pudimos crear el link", { description: error.message }),
    }),
  );
  const revoke = useMutation(
    trpc.group.joinLink.revoke.mutationOptions({
      onSuccess: async () => {
        toast.success("Link desactivado");
        await invalidate();
      },
      onError: (error) =>
        toast.error("No pudimos desactivar el link", { description: error.message }),
    }),
  );
  const busy = renew.isPending || revoke.isPending;

  if (joinLink.isPending) return <Skeleton className="h-11 w-full" />;
  if (joinLink.isError) {
    return (
      <Alert variant="destructive">
        <CircleAlertIcon aria-hidden="true" />
        <AlertTitle>No pudimos cargar el link</AlertTitle>
        <AlertDescription>{joinLink.error.message}</AlertDescription>
      </Alert>
    );
  }
  if (!joinLink.data.active) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed p-4">
        <p className="text-sm text-muted-foreground">No hay link activo.</p>
        <Button disabled={renew.isPending} onClick={() => renew.mutate({ groupId: activeGroupId })}>
          {renew.isPending ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <LinkIcon data-icon="inline-start" aria-hidden="true" />
          )}
          {renew.isPending ? "Creando…" : "Crear link"}
        </Button>
      </div>
    );
  }

  const url = joinLink.data.url;
  return (
    <>
      <p className="text-sm text-muted-foreground">
        Cualquiera con este link crea su cuenta o entra, y queda como miembro.
      </p>
      <InputGroup>
        <InputGroupInput aria-label="Link para sumarse al grupo" readOnly value={url} />
        <InputGroupAddon align="inline-end">
          <InputGroupButton size="icon-sm" aria-label="Copiar link" onClick={() => copyText(url)}>
            <CopyIcon aria-hidden="true" />
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
      <div className="flex flex-wrap gap-2">
        <Button disabled={busy} onClick={() => shareLink(url, groupName)}>
          <Share2Icon data-icon="inline-start" aria-hidden="true" />
          Compartir
        </Button>
        <Button
          variant="outline"
          disabled={busy}
          onClick={() => renew.mutate({ groupId: activeGroupId })}
        >
          {renew.isPending ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <RefreshCwIcon data-icon="inline-start" aria-hidden="true" />
          )}
          {renew.isPending ? "Renovando…" : "Renovar"}
        </Button>
        <Button
          variant="ghost"
          disabled={busy}
          onClick={() => revoke.mutate({ groupId: activeGroupId })}
        >
          {revoke.isPending ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <UnlinkIcon data-icon="inline-start" aria-hidden="true" />
          )}
          {revoke.isPending ? "Desactivando…" : "Desactivar"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Renovar invalida el link anterior al instante.
      </p>
    </>
  );
}

function PublicTopic() {
  const { activeGroupId } = useAppContext();
  const settings = useQuery(trpc.group.settings.read.queryOptions({ groupId: activeGroupId }));
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

  if (settings.isPending) return <Skeleton className="h-11 w-full" />;
  if (settings.isError) return <SettingsError message={settings.error.message} />;
  if (!settings.data) return <SettingsError message="El grupo no tiene configuración." />;

  const isPublic = settings.data.publicVisibility;
  const publicUrl =
    typeof window === "undefined" ? "" : `${window.location.origin}/g/${settings.data.slug ?? ""}`;

  return (
    <>
      <p className="max-w-prose text-sm text-muted-foreground">
        Cualquiera con la dirección ve partidos, resultados y estadísticas. Los pagos nunca se
        muestran.
      </p>
      <ToggleGroup
        aria-label="Visibilidad del grupo"
        variant="outline"
        spacing={0}
        disabled={updateVisibility.isPending}
        className="w-full sm:w-80"
        value={[isPublic ? "public" : "private"]}
        onValueChange={(value) => {
          const next = value[0];
          if (!next || next === (isPublic ? "public" : "private")) return;
          updateVisibility.mutate({ groupId: activeGroupId, publicVisibility: next === "public" });
        }}
      >
        <ToggleGroupItem value="private" className="flex-1">
          Privado
        </ToggleGroupItem>
        <ToggleGroupItem value="public" className="flex-1">
          Público
        </ToggleGroupItem>
      </ToggleGroup>
      {isPublic ? (
        <InputGroup>
          <InputGroupInput aria-label="Dirección pública del grupo" readOnly value={publicUrl} />
          <InputGroupAddon align="inline-end">
            <InputGroupButton
              size="icon-sm"
              aria-label="Copiar dirección pública"
              onClick={() => copyText(publicUrl, "Dirección copiada")}
            >
              <CopyIcon aria-hidden="true" />
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      ) : null}
    </>
  );
}

function QuorumTopic() {
  const { activeGroupId } = useAppContext();
  const settings = useQuery(trpc.group.settings.read.queryOptions({ groupId: activeGroupId }));
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

  if (settings.isPending) return <Skeleton className="h-40 w-full max-w-md" />;
  if (settings.isError) return <SettingsError message={settings.error.message} />;
  if (!settings.data) return <SettingsError message="El grupo no tiene configuración." />;

  const current = settings.data.ratingQuorum ?? "all_voted";

  return (
    <>
      <p className="max-w-prose text-sm text-muted-foreground">
        Los que jugaron se ponen notas del 1 al 10. Son anónimas y los promedios se ven al llegar al
        quórum.
      </p>
      <ToggleGroup
        aria-label="Cuándo revelar las notas"
        orientation="vertical"
        variant="outline"
        spacing={2}
        disabled={updateRatingQuorum.isPending}
        className="w-full max-w-md"
        value={[current]}
        onValueChange={(value) => {
          const next = value[0] as RatingQuorum | undefined;
          if (!next || next === current) return;
          updateRatingQuorum.mutate({ groupId: activeGroupId, ratingQuorum: next });
        }}
      >
        {quorumOptions.map((option) => (
          <ToggleGroupItem
            key={option.value}
            value={option.value}
            className="h-auto w-full justify-between gap-3 rounded-lg px-4 py-3 text-left aria-pressed:border-primary aria-pressed:bg-primary/10"
          >
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-sm font-medium">{option.label}</span>
              <span className="text-xs font-normal whitespace-normal text-muted-foreground">
                {option.hint}
              </span>
            </span>
            {current === option.value ? (
              <CheckIcon className="text-primary-text" aria-hidden="true" />
            ) : null}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </>
  );
}

function SettingsError({ message }: { message: string }) {
  return (
    <Alert variant="destructive">
      <CircleAlertIcon aria-hidden="true" />
      <AlertTitle>No pudimos cargar la configuración</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

async function copyText(value: string, label = "Link copiado") {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(label);
  } catch {
    toast.error("No pudimos copiarlo");
  }
}

/** Native share sheet on phones (WhatsApp is one tap away); copy everywhere else. */
async function shareLink(url: string, groupName: string) {
  if ("share" in navigator) {
    try {
      await navigator.share({ title: groupName, text: `Sumate a ${groupName} en Hay Fulbo`, url });
      return;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
    }
  }
  await copyText(url);
}

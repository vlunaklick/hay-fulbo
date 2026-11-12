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
  CircleAlertIcon,
  CopyIcon,
  EllipsisIcon,
  LinkIcon,
  PlusIcon,
  RefreshCwIcon,
  Share2Icon,
  Trash2Icon,
  UnlinkIcon,
  UsersRoundIcon,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { useAppContext } from "@/components/app-shell";
import { GroupCreateDialog } from "@/components/group-switcher";
import { DrillList, DrillRow, HeroNumber, NextStep, StatusHeader } from "@/components/next-step";
import { DrillDetail, NextStepLayout, useIsDesktop } from "@/components/next-step-layout";
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
 * The group's home, "Próximo paso" style: header → people count → what is pending →
 * one row per topic. Each topic opens in a DrillDetail (bottom Sheet on mobile, right
 * column on desktop) whose open state lives in `?tema=`, so the phone's back gesture
 * closes it and other screens can deep-link to it.
 */
const topics = {
  integrantes: { title: "Integrantes", description: "Quién está en el grupo y qué puede hacer." },
  invitar: {
    title: "Link para sumarse",
    description: "Cualquiera con este link crea su cuenta o entra, y queda como miembro.",
  },
  publico: {
    title: "Vista pública",
    description:
      "Cualquiera con la dirección ve partidos, resultados y estadísticas. Los pagos nunca se muestran.",
  },
  notas: {
    title: "Notas entre jugadores",
    description:
      "Los que jugaron se ponen notas del 1 al 10. Son anónimas y los promedios se ven al llegar al quórum.",
  },
  grupos: { title: "Tus grupos", description: "Cambiá de grupo o armá uno nuevo." },
} as const;

type Topic = keyof typeof topics;

/** Topics only the owner can open. */
const ownerTopics: readonly Topic[] = ["integrantes", "invitar", "publico", "notas"];

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

const quorumOptions: { value: RatingQuorum; label: string; short: string; hint: string }[] = [
  {
    value: "all_voted",
    label: "Cuando voten todos",
    short: "Votan todos",
    hint: "El promedio aparece recién con el último voto.",
  },
  {
    value: "half_plus_one",
    label: "Con mitad más uno",
    short: "Mitad más uno",
    hint: "Alcanza con que vote la mayoría de los que jugaron.",
  },
  {
    value: "first_vote",
    label: "Con el primer voto completo",
    short: "Primer voto",
    hint: "Se revela apenas alguien vota a todos.",
  },
];

const BASE_PATH = "/dashboard/grupo";

export function GroupMembersPage() {
  const { groupName, role } = useAppContext();
  const router = useRouter();
  const isOwner = role === "owner";
  const requested = parseTopic(useSearchParams().get("tema"));
  const opened = requested && (isOwner || !ownerTopics.includes(requested)) ? requested : null;
  // On desktop the right column is never empty: fall back to the main topic.
  const desktop = useIsDesktop();
  const active = opened ?? (desktop ? (isOwner ? "integrantes" : "grupos") : null);
  // Keep the last topic rendered while the sheet animates out.
  const [shown, setShown] = useState<Topic | null>(active);
  if (active && active !== shown) setShown(active);
  const pushed = useRef(false);

  function open(next: Topic) {
    if (next === active) return;
    // Desktop switches the right column in place; no history entry per click.
    if (desktop) {
      pushed.current = false;
      router.replace(`${BASE_PATH}?tema=${next}`, { scroll: false });
      return;
    }
    pushed.current = true;
    router.push(`${BASE_PATH}?tema=${next}`, { scroll: false });
  }

  function close() {
    if (pushed.current && !desktop) {
      pushed.current = false;
      router.back();
    } else {
      router.replace(BASE_PATH, { scroll: false });
    }
  }

  return (
    <NextStepLayout>
      <StatusHeader
        title={groupName}
        meta={isOwner ? "Vos sos el responsable" : `Vos sos ${roleLabel[role].toLowerCase()}`}
      />
      {isOwner ? (
        <OwnerHub active={active} onOpen={open} />
      ) : (
        <>
          <Alert>
            <CircleAlertIcon aria-hidden="true" />
            <AlertTitle>Solo para el responsable del grupo</AlertTitle>
            <AlertDescription>
              Los líderes pueden administrar partidos, jugadores y canchas, pero no los permisos del
              grupo.
            </AlertDescription>
          </Alert>
          <DrillList>
            <GroupsRow active={active} onOpen={open} />
          </DrillList>
        </>
      )}
      <TopicDetail topic={shown} open={active !== null} onClose={close} />
    </NextStepLayout>
  );
}

function OwnerHub({ active, onOpen }: { active: Topic | null; onOpen: (topic: Topic) => void }) {
  const { activeGroupId, groupName } = useAppContext();
  const directory = useQuery(trpc.matches.directory.queryOptions());
  const joinLink = useQuery(trpc.group.joinLink.status.queryOptions({ groupId: activeGroupId }));
  const settings = useQuery(trpc.group.settings.read.queryOptions({ groupId: activeGroupId }));
  const renew = useRenewJoinLink({ onRenewed: () => onOpen("invitar") });

  const members = directory.data?.members as GroupMember[] | undefined;
  const leaders = members?.filter((member) => member.role === "leader").length ?? 0;
  const quorum = settings.data
    ? (quorumOptions.find((option) => option.value === settings.data?.ratingQuorum) ??
      quorumOptions[0]!)
    : null;
  const activeUrl = joinLink.data?.active ? joinLink.data.url : null;
  const loading = <Skeleton className="h-4 w-14" />;

  return (
    <>
      {directory.isError ? (
        <Alert variant="destructive">
          <CircleAlertIcon aria-hidden="true" />
          <AlertTitle>No pudimos cargar el grupo</AlertTitle>
          <AlertDescription>{directory.error.message}</AlertDescription>
        </Alert>
      ) : members ? (
        <HeroNumber
          caption={leaders > 0 ? `${leaders} ${leaders === 1 ? "líder" : "líderes"}` : undefined}
          className="py-2"
        >
          {members.length}
          <span className="ml-2 text-2xl font-bold">
            {members.length === 1 ? "persona" : "personas"}
          </span>
        </HeroNumber>
      ) : (
        <Skeleton className="mx-auto h-16 w-48" />
      )}

      {members && joinLink.data ? (
        members.length <= 1 ? (
          <NextStep
            kicker="Estás solo en el grupo"
            title="Invitá a los que juegan"
            action={
              activeUrl ? (
                <Button onClick={() => shareLink(activeUrl, groupName)}>
                  <Share2Icon data-icon="inline-start" aria-hidden="true" />
                  Compartir link
                </Button>
              ) : (
                <CreateLinkButton renew={renew} groupId={activeGroupId} />
              )
            }
          >
            Con el link entran solos y quedan como miembros.
          </NextStep>
        ) : !joinLink.data.active ? (
          <NextStep
            kicker="El link para sumarse está apagado"
            title="Nadie nuevo puede entrar"
            action={<CreateLinkButton renew={renew} groupId={activeGroupId} />}
          >
            Creá un link nuevo cuando quieras sumar gente.
          </NextStep>
        ) : null
      ) : null}

      <DrillList>
        <DrillRow
          label={topics.integrantes.title}
          value={members ? members.length : loading}
          selected={active === "integrantes"}
          onClick={() => onOpen("integrantes")}
        />
        <DrillRow
          label={topics.invitar.title}
          value={joinLink.data ? (joinLink.data.active ? "Activo" : "Apagado") : loading}
          selected={active === "invitar"}
          onClick={() => onOpen("invitar")}
        />
        <DrillRow
          label={topics.publico.title}
          value={settings.data ? (settings.data.publicVisibility ? "Pública" : "Privada") : loading}
          selected={active === "publico"}
          onClick={() => onOpen("publico")}
        />
        <DrillRow
          label="Notas"
          value={quorum ? quorum.short : loading}
          selected={active === "notas"}
          onClick={() => onOpen("notas")}
        />
        <GroupsRow active={active} onOpen={onOpen} />
      </DrillList>
    </>
  );
}

function GroupsRow({ active, onOpen }: { active: Topic | null; onOpen: (topic: Topic) => void }) {
  const groups = useQuery(trpc.group.list.queryOptions());
  return (
    <DrillRow
      label={topics.grupos.title}
      value={groups.data ? groups.data.length : <Skeleton className="h-4 w-6" />}
      selected={active === "grupos"}
      onClick={() => onOpen("grupos")}
    />
  );
}

function CreateLinkButton({
  groupId,
  renew,
}: {
  groupId: string;
  renew: ReturnType<typeof useRenewJoinLink>;
}) {
  return (
    <Button disabled={renew.isPending} onClick={() => renew.mutate({ groupId })}>
      {renew.isPending ? (
        <Spinner data-icon="inline-start" />
      ) : (
        <LinkIcon data-icon="inline-start" aria-hidden="true" />
      )}
      {renew.isPending ? "Creando…" : "Crear link"}
    </Button>
  );
}

function TopicDetail({
  topic,
  open,
  onClose,
}: {
  topic: Topic | null;
  open: boolean;
  onClose: () => void;
}) {
  const copy = topic ? topics[topic] : null;

  return (
    <DrillDetail
      open={open}
      onOpenChange={(next) => (next ? null : onClose())}
      title={copy?.title ?? ""}
      description={copy?.description}
    >
      <div className="flex flex-col gap-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] lg:pb-0">
        {topic === "integrantes" ? <MembersTopic /> : null}
        {topic === "invitar" ? <InviteTopic /> : null}
        {topic === "publico" ? <PublicTopic /> : null}
        {topic === "notas" ? <QuorumTopic /> : null}
        {topic === "grupos" ? <GroupsTopic /> : null}
      </div>
    </DrillDetail>
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
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-12 w-full" />
          ))}
        </div>
      ) : directory.isError ? (
        <Alert variant="destructive">
          <CircleAlertIcon aria-hidden="true" />
          <AlertTitle>No pudimos cargar el grupo</AlertTitle>
          <AlertDescription>{directory.error.message}</AlertDescription>
        </Alert>
      ) : (
        <ul aria-label="Integrantes del grupo" className="-my-2 flex flex-col divide-y">
          {(directory.data.members as GroupMember[]).map((member) => (
            <li key={member.membershipId} className="flex min-h-14 items-center gap-3 py-2">
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

function invalidateJoinLink(groupId: string) {
  return queryClient.invalidateQueries({
    queryKey: trpc.group.joinLink.status.queryKey({ groupId }),
  });
}

/** Creates (or replaces) the join link and copies it. */
function useRenewJoinLink({ onRenewed }: { onRenewed?: () => void } = {}) {
  const { activeGroupId } = useAppContext();
  return useMutation(
    trpc.group.joinLink.renew.mutationOptions({
      onSuccess: async (result) => {
        await invalidateJoinLink(activeGroupId);
        await navigator.clipboard.writeText(result.url).catch(() => undefined);
        toast.success("Link creado y copiado");
        onRenewed?.();
      },
      onError: (error) => toast.error("No pudimos crear el link", { description: error.message }),
    }),
  );
}

function InviteTopic() {
  const { activeGroupId, groupName } = useAppContext();
  const joinLink = useQuery(trpc.group.joinLink.status.queryOptions({ groupId: activeGroupId }));
  const renew = useRenewJoinLink();
  const revoke = useMutation(
    trpc.group.joinLink.revoke.mutationOptions({
      onSuccess: async () => {
        toast.success("Link desactivado");
        await invalidateJoinLink(activeGroupId);
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
        <CreateLinkButton renew={renew} groupId={activeGroupId} />
      </div>
    );
  }

  const url = joinLink.data.url;
  return (
    <>
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
      <ToggleGroup
        aria-label="Visibilidad del grupo"
        variant="outline"
        spacing={0}
        disabled={updateVisibility.isPending}
        className="w-full"
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

  if (settings.isPending) return <Skeleton className="h-40 w-full" />;
  if (settings.isError) return <SettingsError message={settings.error.message} />;
  if (!settings.data) return <SettingsError message="El grupo no tiene configuración." />;

  const current = settings.data.ratingQuorum ?? "all_voted";

  return (
    <ToggleGroup
      aria-label="Cuándo revelar las notas"
      orientation="vertical"
      variant="outline"
      spacing={2}
      disabled={updateRatingQuorum.isPending}
      className="w-full"
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
  );
}

function GroupsTopic() {
  const { activeGroupId } = useAppContext();
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
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

  return (
    <>
      {groups.isPending ? (
        <Skeleton className="h-12 w-full" />
      ) : groups.isError ? (
        <Alert variant="destructive">
          <CircleAlertIcon aria-hidden="true" />
          <AlertTitle>No pudimos cargar tus grupos</AlertTitle>
          <AlertDescription>{groups.error.message}</AlertDescription>
        </Alert>
      ) : (
        <ul aria-label="Tus grupos" className="-my-2 flex flex-col divide-y">
          {groups.data.map((group) => {
            const current = group.id === activeGroupId;
            return (
              <li key={group.id}>
                <button
                  type="button"
                  disabled={current || select.isPending}
                  onClick={() => select.mutate({ groupId: group.id })}
                  aria-label={current ? `${group.name}, grupo actual` : `Cambiar a ${group.name}`}
                  className="flex min-h-12 w-full items-center gap-3 py-2 text-left text-sm outline-none transition-colors duration-100 hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring/50 disabled:hover:bg-transparent"
                >
                  <span
                    aria-hidden="true"
                    className="grid size-7 shrink-0 place-items-center rounded-md bg-secondary text-xs font-bold text-secondary-foreground"
                  >
                    {initials(group.name)}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-medium">{group.name}</span>
                  {current ? (
                    <CheckIcon aria-hidden="true" className="size-4 shrink-0 text-primary-text" />
                  ) : select.isPending && select.variables?.groupId === group.id ? (
                    <Spinner />
                  ) : (
                    <ArrowRightLeftIcon
                      aria-hidden="true"
                      className="size-4 shrink-0 text-muted-foreground"
                    />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <Button variant="outline" className="self-start" onClick={() => setCreateOpen(true)}>
        <PlusIcon data-icon="inline-start" aria-hidden="true" />
        Crear grupo
      </Button>
      <GroupCreateDialog open={createOpen} onOpenChange={setCreateOpen} />
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

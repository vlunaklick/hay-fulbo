"use client";

// Variant 2 — "Vestuario": the page is the group's home. Identity first, then
// grouped rows that drill into one topic each. Phone: drill-down with a back
// button. Desktop: master-detail, no overlays. Group switching leaves the
// chrome and lives here as a visible list of your groups.

import { Button } from "@hay-fulbo/ui/components/button";
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
import { ToggleGroup, ToggleGroupItem } from "@hay-fulbo/ui/components/toggle-group";
import { cn } from "@hay-fulbo/ui/lib/utils";
import {
  ArrowRightLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  EllipsisIcon,
  GlobeIcon,
  LinkIcon,
  PlusIcon,
  RefreshCwIcon,
  Share2Icon,
  ShieldCheckIcon,
  StarIcon,
  Trash2Icon,
  UnlinkIcon,
  UsersRoundIcon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { quorumOptions, roleHint, roleLabel } from "./data";
import { copyText, GroupMark, MemberAvatar, shareJoinLink, useGroup } from "./shared";
import { ChoiceList } from "./variant-plantel";

type Topic = "members" | "invite" | "public" | "quorum";

const topicTitle: Record<Topic, string> = {
  members: "Integrantes",
  invite: "Link para sumarse",
  public: "Vista pública",
  quorum: "Notas entre jugadores",
};

export function HubVariant() {
  // Desktop always shows a detail pane; on phones `drilled` decides which half is visible.
  const [topic, setTopic] = useState<Topic>("members");
  const [drilled, setDrilled] = useState(false);

  function open(next: Topic) {
    setTopic(next);
    setDrilled(true);
    window.scrollTo({ top: 0 });
    // Phones swap the whole view: land keyboard and screen-reader focus on the new heading.
    requestAnimationFrame(() => document.getElementById("hub-detail")?.focus());
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8 md:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] md:items-start">
      <div className={cn("flex flex-col gap-8 md:sticky md:top-8", drilled && "max-md:hidden")}>
        <Hub topic={topic} onOpen={open} />
      </div>
      <div className={cn("min-w-0", !drilled && "max-md:hidden")}>
        <Button variant="ghost" className="-ml-3 mb-2 md:hidden" onClick={() => setDrilled(false)}>
          <ChevronLeftIcon data-icon="inline-start" aria-hidden="true" />
          Grupo
        </Button>
        <section aria-labelledby="hub-detail" className="flex flex-col gap-4">
          <h2
            id="hub-detail"
            tabIndex={-1}
            className="text-xl font-bold tracking-tight outline-none"
          >
            {topicTitle[topic]}
          </h2>
          {topic === "members" ? <MembersDetail /> : null}
          {topic === "invite" ? <InviteDetail /> : null}
          {topic === "public" ? <PublicDetail /> : null}
          {topic === "quorum" ? <QuorumDetail /> : null}
        </section>
      </div>
    </div>
  );
}

function Hub({ topic, onOpen }: { topic: Topic; onOpen: (topic: Topic) => void }) {
  const group = useGroup();
  const quorumLabel = quorumOptions.find((option) => option.value === group.quorum)!.label;
  const others = group.groups.filter((item) => item.id !== group.activeGroup.id);

  return (
    <>
      <header className="flex items-start gap-4">
        <GroupMark
          name={group.activeGroup.name}
          className="grid size-14 shrink-0 place-items-center rounded-lg bg-secondary text-lg font-bold text-secondary-foreground"
        />
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-balance">
            {group.activeGroup.name}
          </h1>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <ShieldCheckIcon className="size-4 text-primary-text" aria-hidden="true" />
            Sos responsable del grupo
          </p>
        </div>
      </header>

      <RowGroup label="Personas">
        <HubRow
          icon={<UsersRoundIcon aria-hidden="true" />}
          label="Integrantes"
          value={
            <span className="tabular-nums">
              {group.counts.total} · {group.counts.leaders} líderes
            </span>
          }
          active={topic === "members"}
          onClick={() => onOpen("members")}
        />
        <HubRow
          icon={<LinkIcon aria-hidden="true" />}
          label="Link para sumarse"
          value={group.joinLink ? "Activo" : "Desactivado"}
          active={topic === "invite"}
          onClick={() => onOpen("invite")}
        />
      </RowGroup>

      <RowGroup label="Lo que se ve afuera">
        <HubRow
          icon={<GlobeIcon aria-hidden="true" />}
          label="Vista pública"
          value={group.isPublic ? "Activa" : "Privado"}
          active={topic === "public"}
          onClick={() => onOpen("public")}
        />
        <HubRow
          icon={<StarIcon aria-hidden="true" />}
          label="Notas"
          value={quorumLabel}
          active={topic === "quorum"}
          onClick={() => onOpen("quorum")}
        />
      </RowGroup>

      <RowGroup label="Tus otros grupos">
        {others.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => group.selectGroup(item.id)}
            className={rowClass}
          >
            <GroupMark name={item.name} />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate font-medium">{item.name}</span>
              <span className="text-xs text-muted-foreground tabular-nums">
                {roleLabel[item.role]} · {item.members} personas
              </span>
            </span>
            <ArrowRightLeftIcon aria-hidden="true" />
          </button>
        ))}
        <button
          type="button"
          onClick={() => toast("Crear grupo abre el diálogo de producción")}
          className={rowClass}
        >
          <PlusIcon aria-hidden="true" />
          <span className="flex-1 font-medium">Crear grupo</span>
        </button>
      </RowGroup>
    </>
  );
}

const rowClass =
  "flex min-h-12 w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors duration-150 ease-out outline-none hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset active:bg-muted [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-muted-foreground";

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
      <span className="min-w-0 shrink truncate text-muted-foreground">{value}</span>
      <ChevronRightIcon aria-hidden="true" />
    </button>
  );
}

function MembersDetail() {
  const group = useGroup();
  return (
    <>
      <p className="text-sm text-muted-foreground">
        Los líderes editan partidos, jugadores y canchas. Los miembros consultan.
      </p>
      <ul className="divide-y overflow-hidden rounded-lg border bg-card">
        {group.members.map((member) => (
          <li key={member.membershipId} className="flex min-h-14 items-center gap-3 py-2 pr-2 pl-4">
            <MemberAvatar name={member.name} />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-medium">{member.name}</span>
              <span className="truncate text-xs text-muted-foreground">{member.email}</span>
            </span>
            <span
              className={cn(
                "shrink-0 text-xs",
                member.role === "member" ? "text-muted-foreground" : "font-medium text-foreground",
              )}
            >
              {roleLabel[member.role]}
            </span>
            {member.role === "owner" ? (
              <span className="size-11 shrink-0" aria-hidden="true" />
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button variant="ghost" size="icon" aria-label={`Opciones de ${member.name}`} />
                  }
                >
                  <EllipsisIcon aria-hidden="true" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-64">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>Permisos</DropdownMenuLabel>
                    <DropdownMenuRadioGroup
                      value={member.role}
                      onValueChange={(role) =>
                        (role === "leader" || role === "member") &&
                        role !== member.role &&
                        group.setRole(member.membershipId, role)
                      }
                    >
                      <DropdownMenuRadioItem value="member">
                        <span className="flex flex-col">
                          <span>Miembro</span>
                          <span className="text-xs text-muted-foreground">{roleHint.member}</span>
                        </span>
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="leader">
                        <span className="flex flex-col">
                          <span>Líder</span>
                          <span className="text-xs text-muted-foreground">{roleHint.leader}</span>
                        </span>
                      </DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onClick={() => group.askRemove(member)}>
                    <Trash2Icon aria-hidden="true" />
                    Sacar del grupo
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}

function InviteDetail() {
  const group = useGroup();
  if (!group.joinLink) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed p-4">
        <p className="text-sm text-muted-foreground">
          No hay link activo. Creá uno y se copia solo para que lo pegues en el grupo de WhatsApp.
        </p>
        <Button onClick={group.renewLink}>
          <LinkIcon data-icon="inline-start" aria-hidden="true" />
          Crear link
        </Button>
      </div>
    );
  }
  return (
    <>
      <p className="text-sm text-muted-foreground">
        Cualquiera con este link crea su cuenta o entra, y queda como miembro.
      </p>
      <InputGroup>
        <InputGroupInput aria-label="Link para sumarse" readOnly value={group.joinLink.url} />
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            size="icon-sm"
            aria-label="Copiar link"
            onClick={() => copyText(group.joinLink!.url)}
          >
            <CopyIcon aria-hidden="true" />
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => shareJoinLink(group.joinLink!.url, group.activeGroup.name)}>
          <Share2Icon data-icon="inline-start" aria-hidden="true" />
          Compartir
        </Button>
        <Button variant="outline" onClick={group.renewLink}>
          <RefreshCwIcon data-icon="inline-start" aria-hidden="true" />
          Renovar
        </Button>
        <Button variant="ghost" onClick={group.revokeLink}>
          <UnlinkIcon data-icon="inline-start" aria-hidden="true" />
          Desactivar
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Renovar invalida el link anterior al instante.
      </p>
    </>
  );
}

function PublicDetail() {
  const group = useGroup();
  return (
    <>
      <p className="text-sm text-muted-foreground">
        Cualquiera con la dirección ve partidos, resultados y estadísticas. Sin cuentas y sin
        deudas: los pagos nunca se muestran.
      </p>
      <ToggleGroup
        aria-label="Visibilidad del grupo"
        variant="outline"
        spacing={0}
        className="w-full sm:w-80"
        value={[group.isPublic ? "public" : "private"]}
        onValueChange={(value) => value[0] && group.setPublic(value[0] === "public")}
      >
        <ToggleGroupItem value="private" className="h-11 flex-1">
          Privado
        </ToggleGroupItem>
        <ToggleGroupItem value="public" className="h-11 flex-1">
          Público
        </ToggleGroupItem>
      </ToggleGroup>
      {group.isPublic ? (
        <InputGroup>
          <InputGroupInput aria-label="Dirección pública" readOnly value={group.publicUrl} />
          <InputGroupAddon align="inline-end">
            <InputGroupButton
              size="icon-sm"
              aria-label="Copiar dirección pública"
              onClick={() => copyText(group.publicUrl, "Dirección copiada")}
            >
              <CopyIcon aria-hidden="true" />
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      ) : null}
    </>
  );
}

function QuorumDetail() {
  const group = useGroup();
  return (
    <>
      <p className="max-w-prose text-sm text-muted-foreground">
        Después de cada partido cerrado, los que jugaron se ponen nota del 1 al 10. Los votos son
        anónimos; elegí cuándo se revela el promedio.
      </p>
      <div className="max-w-md">
        <ChoiceList
          label="Cuándo revelar las notas"
          value={group.quorum}
          options={quorumOptions}
          onChange={group.setQuorum}
        />
      </div>
    </>
  );
}

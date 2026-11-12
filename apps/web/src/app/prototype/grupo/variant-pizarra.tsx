"use client";

// Variant 3 — "Pizarra": everything on the board, nothing behind a tap. The
// page title is the group switcher; inviting is a strip with one share button;
// roles flip inline with a segmented toggle; search and filters for big groups.
// Desktop: roster left, invitation + settings in a sticky right rail.

import { Button } from "@hay-fulbo/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@hay-fulbo/ui/components/dropdown-menu";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@hay-fulbo/ui/components/input-group";
import { ToggleGroup, ToggleGroupItem } from "@hay-fulbo/ui/components/toggle-group";
import {
  CheckIcon,
  ChevronDownIcon,
  CopyIcon,
  EllipsisIcon,
  LinkIcon,
  PlusIcon,
  RefreshCwIcon,
  SearchIcon,
  Share2Icon,
  ShieldCheckIcon,
  Trash2Icon,
  UnlinkIcon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { type Member, quorumOptions, roleLabel } from "./data";
import { copyText, MemberAvatar, shareJoinLink, useGroup } from "./shared";

type Filter = "all" | "leader" | "member";

export function PizarraVariant() {
  return (
    <div className="flex flex-col gap-6">
      <TitleSwitcher />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <div className="flex flex-col gap-6">
          <InviteStrip />
          <Roster />
        </div>
        <aside className="flex flex-col gap-6 lg:sticky lg:top-8" aria-label="Ajustes del grupo">
          <PublicSetting />
          <QuorumSetting />
        </aside>
      </div>
    </div>
  );
}

function TitleSwitcher() {
  const group = useGroup();
  return (
    <header className="flex flex-col gap-1">
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={`Cambiar grupo, actual: ${group.activeGroup.name}`}
          render={
            <button
              type="button"
              className="-mx-2 flex min-h-11 items-start gap-2 self-start rounded-md px-2 py-1 text-left transition-colors duration-150 ease-out outline-none hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring/50 aria-expanded:bg-muted"
            />
          }
        >
          <h1 className="text-2xl font-bold tracking-tight text-balance">
            {group.activeGroup.name}
          </h1>
          <ChevronDownIcon
            className="mt-1.5 size-5 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[min(22rem,calc(100vw-2rem))]">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Tus grupos</DropdownMenuLabel>
            {group.groups.map((item) => (
              <DropdownMenuItem key={item.id} onClick={() => group.selectGroup(item.id)}>
                <span className="flex min-w-0 flex-col">
                  <span className="line-clamp-2">{item.name}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {roleLabel[item.role]} · {item.members} personas
                  </span>
                </span>
                {item.id === group.activeGroup.id ? (
                  <CheckIcon className="ml-auto" aria-label="Grupo actual" />
                ) : null}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => toast("Crear grupo abre el diálogo de producción")}>
            <PlusIcon aria-hidden="true" />
            Crear grupo
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <ShieldCheckIcon className="size-4 text-primary-text" aria-hidden="true" />
        Personas y permisos · sos responsable
      </p>
    </header>
  );
}

function InviteStrip() {
  const group = useGroup();
  const link = group.joinLink;

  if (!link) {
    return (
      <section
        aria-label="Link para sumarse"
        className="flex flex-col gap-3 rounded-lg border border-dashed p-4 sm:flex-row sm:items-center"
      >
        <p className="flex-1 text-sm text-muted-foreground">
          El link para sumarse está desactivado. Nadie nuevo puede entrar.
        </p>
        <Button onClick={group.renewLink}>
          <LinkIcon data-icon="inline-start" aria-hidden="true" />
          Crear link
        </Button>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="pz-invite"
      className="flex flex-col gap-3 rounded-lg bg-card p-4 ring-1 ring-foreground/10 sm:flex-row sm:items-center"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <h2 id="pz-invite" className="text-sm font-semibold">
          Link para sumarse
        </h2>
        <p className="truncate text-xs text-muted-foreground">
          Entra como miembro · {link.url.replace("https://", "")}
        </p>
      </div>
      <div className="flex items-center gap-1">
        <Button
          className="flex-1 sm:flex-none"
          onClick={() => shareJoinLink(link.url, group.activeGroup.name)}
        >
          <Share2Icon data-icon="inline-start" aria-hidden="true" />
          Compartir link
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Copiar link"
          onClick={() => copyText(link.url)}
        >
          <CopyIcon aria-hidden="true" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="ghost" size="icon" aria-label="Más opciones del link" />}
          >
            <EllipsisIcon aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-56">
            <DropdownMenuItem onClick={group.renewLink}>
              <RefreshCwIcon aria-hidden="true" />
              Renovar (invalida el actual)
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={group.revokeLink}>
              <UnlinkIcon aria-hidden="true" />
              Desactivar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </section>
  );
}

function Roster() {
  const group = useGroup();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const needle = query.trim().toLocaleLowerCase("es");
  const visible = group.members.filter(
    (member) =>
      (filter === "all" || member.role === filter) &&
      (!needle ||
        member.name.toLocaleLowerCase("es").includes(needle) ||
        member.email.toLocaleLowerCase("es").includes(needle)),
  );

  return (
    <section aria-labelledby="pz-members" className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="pz-members" className="text-base font-semibold">
          Integrantes{" "}
          <span className="font-normal text-muted-foreground tabular-nums">
            {group.counts.total}
          </span>
        </h2>
        <p className="hidden text-xs text-muted-foreground sm:block">
          Líder: edita partidos, jugadores y canchas
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <InputGroup className="sm:max-w-72">
          <InputGroupAddon>
            <SearchIcon aria-hidden="true" />
          </InputGroupAddon>
          <InputGroupInput
            aria-label="Buscar integrantes"
            placeholder="Buscar por nombre o email"
            type="search"
            className="text-base sm:text-sm"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </InputGroup>
        <ToggleGroup
          aria-label="Filtrar por permisos"
          variant="outline"
          spacing={0}
          value={[filter]}
          onValueChange={(value) => value[0] && setFilter(value[0] as Filter)}
          className="w-full sm:w-auto"
        >
          <ToggleGroupItem value="all" className="flex-1 tabular-nums">
            Todos
          </ToggleGroupItem>
          <ToggleGroupItem value="leader" className="flex-1 tabular-nums">
            Líderes {group.counts.leaders}
          </ToggleGroupItem>
          <ToggleGroupItem value="member" className="flex-1 tabular-nums">
            Miembros {group.counts.members}
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
      {visible.length === 0 ? (
        <p className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
          Nadie coincide con “{query}”.{" "}
          <button
            type="button"
            className="font-medium text-primary-text underline-offset-4 hover:underline"
            onClick={() => {
              setQuery("");
              setFilter("all");
            }}
          >
            Ver todos
          </button>
        </p>
      ) : (
        <ul className="divide-y overflow-hidden rounded-lg border bg-card">
          {visible.map((member) => (
            <li key={member.membershipId}>
              <RosterRow member={member} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function RosterRow({ member }: { member: Member }) {
  const group = useGroup();
  return (
    <div className="flex min-h-14 items-center gap-3 py-2 pr-1 pl-4">
      <MemberAvatar name={member.name} className="max-sm:hidden" />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="line-clamp-2 text-sm font-medium">{member.name}</span>
        <span className="truncate text-xs text-muted-foreground">{member.email}</span>
      </span>
      {member.role === "owner" ? (
        <span className="flex h-11 shrink-0 items-center gap-1.5 pr-3 text-xs text-muted-foreground">
          <ShieldCheckIcon className="size-4 text-primary-text" aria-hidden="true" />
          Responsable
        </span>
      ) : (
        <>
          <ToggleGroup
            aria-label={`Permisos de ${member.name}`}
            variant="outline"
            spacing={0}
            size="sm"
            value={[member.role]}
            onValueChange={(value) =>
              (value[0] === "leader" || value[0] === "member") &&
              group.setRole(member.membershipId, value[0])
            }
            className="shrink-0"
          >
            <ToggleGroupItem
              value="member"
              className="h-11 px-3 font-normal text-muted-foreground aria-pressed:bg-secondary aria-pressed:text-foreground"
            >
              Miembro
            </ToggleGroupItem>
            <ToggleGroupItem
              value="leader"
              className="h-11 px-3 font-normal text-muted-foreground aria-pressed:bg-secondary aria-pressed:text-foreground"
            >
              Líder
            </ToggleGroupItem>
          </ToggleGroup>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Sacar a ${member.name} del grupo`}
            className="shrink-0 text-muted-foreground hover:text-destructive"
            onClick={() => group.askRemove(member)}
          >
            <Trash2Icon aria-hidden="true" />
          </Button>
        </>
      )}
    </div>
  );
}

function PublicSetting() {
  const group = useGroup();
  return (
    <section aria-labelledby="pz-public" className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 id="pz-public" className="text-base font-semibold">
          Vista pública
        </h2>
        <p className="text-sm text-muted-foreground">
          Partidos y estadísticas para cualquiera con la dirección. Los pagos nunca se muestran.
        </p>
      </div>
      <ToggleGroup
        aria-label="Visibilidad del grupo"
        variant="outline"
        spacing={0}
        className="w-full"
        value={[group.isPublic ? "public" : "private"]}
        onValueChange={(value) => value[0] && group.setPublic(value[0] === "public")}
      >
        <ToggleGroupItem value="private" className="flex-1">
          Privado
        </ToggleGroupItem>
        <ToggleGroupItem value="public" className="flex-1">
          Público
        </ToggleGroupItem>
      </ToggleGroup>
      {group.isPublic ? (
        <Button
          variant="outline"
          className="justify-between"
          onClick={() => copyText(group.publicUrl, "Dirección copiada")}
        >
          <span className="truncate">{group.publicUrl.replace("https://", "")}</span>
          <CopyIcon data-icon="inline-end" aria-hidden="true" />
        </Button>
      ) : null}
    </section>
  );
}

function QuorumSetting() {
  const group = useGroup();
  return (
    <section aria-labelledby="pz-quorum" className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 id="pz-quorum" className="text-base font-semibold">
          Notas entre jugadores
        </h2>
        <p className="text-sm text-muted-foreground">
          Votos anónimos del 1 al 10 después de cada partido. ¿Cuándo se revela el promedio?
        </p>
      </div>
      <ToggleGroup
        aria-label="Cuándo revelar las notas"
        orientation="vertical"
        variant="outline"
        spacing={0}
        className="w-full"
        value={[group.quorum]}
        onValueChange={(value) => value[0] && group.setQuorum(value[0] as typeof group.quorum)}
      >
        {quorumOptions.map((option) => (
          <ToggleGroupItem
            key={option.value}
            value={option.value}
            className="justify-between px-4 font-normal"
          >
            {option.label}
            {group.quorum === option.value ? (
              <CheckIcon className="text-primary-text" aria-hidden="true" />
            ) : null}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </section>
  );
}

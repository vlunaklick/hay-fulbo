"use client";

// Variant 1 — "Plantel": the roster is the screen. One primary action (Invitar)
// opens a sheet; every row is one line and opens its own sheet for role and
// removal; group settings sink to the bottom as summary rows.

import { Badge } from "@hay-fulbo/ui/components/badge";
import { Button } from "@hay-fulbo/ui/components/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@hay-fulbo/ui/components/input-group";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@hay-fulbo/ui/components/sheet";
import { ToggleGroup, ToggleGroupItem } from "@hay-fulbo/ui/components/toggle-group";
import {
  ChevronRightIcon,
  CopyIcon,
  GlobeIcon,
  LinkIcon,
  RefreshCwIcon,
  Share2Icon,
  ShieldCheckIcon,
  StarIcon,
  Trash2Icon,
  UnlinkIcon,
  UserPlusIcon,
} from "lucide-react";
import { useState, useSyncExternalStore } from "react";

import { type Member, quorumOptions, type Role, roleHint } from "./data";
import { copyText, MemberAvatar, shareJoinLink, useGroup } from "./shared";

type Panel =
  | { kind: "invite" }
  | { kind: "public" }
  | { kind: "quorum" }
  | { kind: "member"; id: string };

const sections: { role: Role; title: string }[] = [
  { role: "owner", title: "Responsable" },
  { role: "leader", title: "Líderes" },
  { role: "member", title: "Miembros" },
];

export function PlantelVariant() {
  const group = useGroup();
  const [panel, setPanel] = useState<Panel | null>(null);
  const close = () => setPanel(null);
  const quorumLabel = quorumOptions.find((option) => option.value === group.quorum)!.label;

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-balance">Personas</h1>
          <p className="text-sm text-muted-foreground tabular-nums">
            {group.counts.total} en el grupo · {group.counts.leaders}{" "}
            {group.counts.leaders === 1 ? "líder" : "líderes"}
          </p>
        </div>
        <Button className="w-full sm:w-auto" onClick={() => setPanel({ kind: "invite" })}>
          <UserPlusIcon data-icon="inline-start" aria-hidden="true" />
          Invitar
        </Button>
      </header>

      {sections.map((section) => {
        const people = group.members.filter((member) => member.role === section.role);
        if (people.length === 0 && section.role === "owner") return null;
        return (
          <section
            key={section.role}
            className="flex flex-col gap-3"
            aria-labelledby={`s-${section.role}`}
          >
            <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
              <h2 id={`s-${section.role}`} className="text-base font-semibold">
                {section.title}{" "}
                <span className="font-normal text-muted-foreground tabular-nums">
                  {people.length}
                </span>
              </h2>
              <p className="text-xs text-muted-foreground">{roleHint[section.role]}</p>
            </div>
            {people.length === 0 ? (
              <p className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
                Nadie todavía. Tocá a un miembro para hacerlo líder.
              </p>
            ) : (
              <ul className="divide-y overflow-hidden rounded-lg border bg-card">
                {people.map((member) => (
                  <li key={member.membershipId}>
                    <MemberRow
                      member={member}
                      onOpen={() => setPanel({ kind: "member", id: member.membershipId })}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}

      <section className="flex flex-col gap-3" aria-labelledby="s-settings">
        <h2 id="s-settings" className="text-base font-semibold">
          Ajustes del grupo
        </h2>
        <ul className="divide-y overflow-hidden rounded-lg border bg-card">
          <li>
            <SettingRow
              icon={<LinkIcon aria-hidden="true" />}
              label="Link para sumarse"
              value={group.joinLink ? "Activo" : "Desactivado"}
              onOpen={() => setPanel({ kind: "invite" })}
            />
          </li>
          <li>
            <SettingRow
              icon={<GlobeIcon aria-hidden="true" />}
              label="Vista pública"
              value={group.isPublic ? "Activa" : "Privado"}
              onOpen={() => setPanel({ kind: "public" })}
            />
          </li>
          <li>
            <SettingRow
              icon={<StarIcon aria-hidden="true" />}
              label="Notas entre jugadores"
              value={quorumLabel}
              onOpen={() => setPanel({ kind: "quorum" })}
            />
          </li>
        </ul>
      </section>

      <PanelSheet open={panel?.kind === "invite"} onClose={close}>
        <InvitePanel />
      </PanelSheet>
      <PanelSheet open={panel?.kind === "public"} onClose={close}>
        <PublicPanel />
      </PanelSheet>
      <PanelSheet open={panel?.kind === "quorum"} onClose={close}>
        <QuorumPanel />
      </PanelSheet>
      <PanelSheet open={panel?.kind === "member"} onClose={close}>
        {panel?.kind === "member" ? <MemberPanel id={panel.id} onDone={close} /> : null}
      </PanelSheet>
    </div>
  );
}

function MemberRow({ member, onOpen }: { member: Member; onOpen: () => void }) {
  const content = (
    <>
      <MemberAvatar name={member.name} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium">{member.name}</span>
        <span className="truncate text-xs text-muted-foreground">
          {member.linkedPlayer ? `Juega como ${member.linkedPlayer}` : "Sin jugador vinculado"}
        </span>
      </span>
    </>
  );

  if (member.role === "owner") {
    return (
      <div className="flex min-h-14 items-center gap-3 px-4 py-2">
        {content}
        <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheckIcon className="size-4 text-primary-text" aria-hidden="true" />
          Vos
        </span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${member.name}, ${member.role === "leader" ? "líder" : "miembro"}. Cambiar permisos`}
      className="flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left transition-colors duration-150 ease-out outline-none hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset active:bg-muted"
    >
      {content}
      <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
    </button>
  );
}

function SettingRow({
  icon,
  label,
  value,
  onOpen,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex min-h-12 w-full items-center gap-3 px-4 py-2 text-left text-sm transition-colors duration-150 ease-out outline-none hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset active:bg-muted [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-muted-foreground"
    >
      {icon}
      <span className="min-w-0 flex-1 truncate font-medium">{label}</span>
      <span className="shrink-0 text-muted-foreground">{value}</span>
      <ChevronRightIcon aria-hidden="true" />
    </button>
  );
}

const desktopQuery = "(min-width: 768px)";
const subscribeDesktop = (onChange: () => void) => {
  const media = window.matchMedia(desktopQuery);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
};
const isDesktop = () => window.matchMedia(desktopQuery).matches;

/** Bottom sheet on phones (thumb reach), side panel on desktop. */
function PanelSheet({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const desktop = useSyncExternalStore(subscribeDesktop, isDesktop, () => false);
  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent
        side={desktop ? "right" : "bottom"}
        className={desktop ? "sm:w-[28rem]" : "max-h-[85svh] pb-[env(safe-area-inset-bottom)]"}
      >
        {children}
      </SheetContent>
    </Sheet>
  );
}

function InvitePanel() {
  const group = useGroup();
  return (
    <>
      <SheetHeader>
        <SheetTitle>Invitar al grupo</SheetTitle>
        <SheetDescription>
          Con este link cualquiera crea su cuenta o entra, y queda como miembro.
        </SheetDescription>
      </SheetHeader>
      <SheetBody className="flex flex-col gap-4">
        {group.joinLink ? (
          <>
            <Button
              size="lg"
              onClick={() => shareJoinLink(group.joinLink!.url, group.activeGroup.name)}
            >
              <Share2Icon data-icon="inline-start" aria-hidden="true" />
              Compartir link
            </Button>
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
          </>
        ) : (
          <Button size="lg" onClick={group.renewLink}>
            <LinkIcon data-icon="inline-start" aria-hidden="true" />
            Crear link
          </Button>
        )}
      </SheetBody>
      {group.joinLink ? (
        <SheetFooter className="flex-row flex-wrap items-center">
          <Button variant="outline" onClick={group.renewLink}>
            <RefreshCwIcon data-icon="inline-start" aria-hidden="true" />
            Renovar
          </Button>
          <Button variant="ghost" onClick={group.revokeLink}>
            <UnlinkIcon data-icon="inline-start" aria-hidden="true" />
            Desactivar
          </Button>
          <p className="basis-full text-xs text-muted-foreground">
            Renovar invalida el link anterior al instante.
          </p>
        </SheetFooter>
      ) : null}
    </>
  );
}

function PublicPanel() {
  const group = useGroup();
  return (
    <>
      <SheetHeader>
        <SheetTitle>Vista pública</SheetTitle>
        <SheetDescription>
          Partidos, resultados y estadísticas para cualquiera con la dirección. Los pagos nunca se
          muestran.
        </SheetDescription>
      </SheetHeader>
      <SheetBody className="flex flex-col gap-4">
        <ToggleGroup
          variant="outline"
          spacing={0}
          className="w-full"
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
        ) : (
          <p className="text-sm text-muted-foreground">
            Solo entran las personas del grupo. Podés abrirlo y cerrarlo cuando quieras.
          </p>
        )}
      </SheetBody>
    </>
  );
}

function QuorumPanel() {
  const group = useGroup();
  return (
    <>
      <SheetHeader>
        <SheetTitle>Notas entre jugadores</SheetTitle>
        <SheetDescription>
          Después de cada partido cerrado, los que jugaron se ponen nota del 1 al 10. Los votos son
          anónimos. ¿Cuándo se revela el promedio?
        </SheetDescription>
      </SheetHeader>
      <SheetBody>
        <ChoiceList
          label="Cuándo revelar las notas"
          value={group.quorum}
          options={quorumOptions}
          onChange={group.setQuorum}
        />
      </SheetBody>
    </>
  );
}

function MemberPanel({ id, onDone }: { id: string; onDone: () => void }) {
  const group = useGroup();
  const member = group.members.find((item) => item.membershipId === id);
  if (!member || member.role === "owner") return null;
  return (
    <>
      <SheetHeader className="flex-row items-center gap-3">
        <MemberAvatar name={member.name} className="size-10" />
        <div className="flex min-w-0 flex-col">
          <SheetTitle className="truncate">{member.name}</SheetTitle>
          <SheetDescription className="truncate">{member.email}</SheetDescription>
        </div>
      </SheetHeader>
      <SheetBody className="flex flex-col gap-3">
        <ChoiceList
          label="Permisos"
          value={member.role}
          options={[
            { value: "member", label: "Miembro", hint: roleHint.member },
            { value: "leader", label: "Líder", hint: roleHint.leader },
          ]}
          onChange={(role) => group.setRole(member.membershipId, role)}
        />
        {member.linkedPlayer ? (
          <Badge variant="outline" className="self-start">
            Juega como {member.linkedPlayer}
          </Badge>
        ) : null}
      </SheetBody>
      <SheetFooter>
        <Button
          variant="destructive"
          onClick={() => {
            onDone();
            group.askRemove(member);
          }}
        >
          <Trash2Icon data-icon="inline-start" aria-hidden="true" />
          Sacar del grupo
        </Button>
      </SheetFooter>
    </>
  );
}

/** Large radio-like choices built on ToggleGroup: label + one-line hint each. */
function ChoiceList<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string; hint: string }[];
  onChange: (next: T) => void;
}) {
  return (
    <ToggleGroup
      aria-label={label}
      orientation="vertical"
      variant="outline"
      spacing={2}
      className="w-full"
      value={[value]}
      onValueChange={(next) => next[0] && onChange(next[0] as T)}
    >
      {options.map((option) => (
        <ToggleGroupItem
          key={option.value}
          value={option.value}
          className="h-auto w-full flex-col items-start gap-0.5 rounded-lg px-4 py-3 text-left aria-pressed:border-primary aria-pressed:bg-primary/10"
        >
          <span className="text-sm font-medium">{option.label}</span>
          <span className="text-xs font-normal whitespace-normal text-muted-foreground">
            {option.hint}
          </span>
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

export { ChoiceList };

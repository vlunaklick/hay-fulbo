"use client";

// PROTOTYPE ONLY — a stand-in for AppShell (sidebar on desktop, top bar and
// bottom nav on mobile) so each variant is judged inside its real frame.

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
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@hay-fulbo/ui/components/sidebar";
import { cn } from "@hay-fulbo/ui/lib/utils";
import {
  CalendarDaysIcon,
  CheckIcon,
  ChevronsUpDownIcon,
  HouseIcon,
  MapPinIcon,
  PlusIcon,
  SettingsIcon,
  TrophyIcon,
  UsersRoundIcon,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { LogoMark } from "@/components/logo-mark";

import { me, roleLabel } from "./data";
import { GroupMark, MemberAvatar, useGroup } from "./shared";

const navigation = [
  { href: "/dashboard", label: "Inicio", icon: HouseIcon },
  { href: "/dashboard/partidos", label: "Partidos", icon: CalendarDaysIcon },
  { href: "/dashboard/jugadores", label: "Jugadores", icon: UsersRoundIcon },
  { href: "/dashboard/estadisticas", label: "Estadísticas", icon: TrophyIcon },
] as const;

const groupNavigation = [
  { href: "/dashboard/canchas", label: "Canchas", icon: MapPinIcon },
  { href: "/prototype/grupo", label: "Personas y permisos", icon: SettingsIcon },
] as const;

export function ProtoShell({
  children,
  switcherInChrome,
}: {
  children: React.ReactNode;
  /** false when the variant moves group switching into the page itself. */
  switcherInChrome: boolean;
}) {
  return (
    <SidebarProvider defaultOpen>
      <Sidebar collapsible="none" className="hidden h-svh sticky top-0 border-r md:flex">
        <SidebarHeader>
          <Brand />
        </SidebarHeader>
        {switcherInChrome ? (
          <SidebarGroup className="pb-0">
            <ChromeSwitcher />
          </SidebarGroup>
        ) : null}
        <SidebarContent>
          <nav aria-label="Principal" className="flex flex-col">
            <SidebarGroup>
              <SidebarGroupContent>
                <NavMenu items={navigation} />
              </SidebarGroupContent>
            </SidebarGroup>
            <SidebarGroup>
              <SidebarGroupLabel>Grupo</SidebarGroupLabel>
              <SidebarGroupContent>
                <NavMenu items={groupNavigation} />
              </SidebarGroupContent>
            </SidebarGroup>
          </nav>
        </SidebarContent>
        <SidebarFooter className="flex-row items-center gap-2 px-3 pb-3">
          <MemberAvatar name={me.name} />
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-medium">{me.name}</span>
            <span className="truncate text-xs text-muted-foreground">Responsable del grupo</span>
          </span>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="min-w-0">
        <header className="sticky top-0 z-10 border-b bg-background md:hidden">
          <div className="flex h-14 items-center justify-between gap-3 px-4">
            {switcherInChrome ? <ChromeSwitcher /> : <Brand />}
            <MemberAvatar name={me.name} className="shrink-0" />
          </div>
        </header>
        <div className="mx-auto w-full max-w-6xl px-4 py-5 pb-40 md:px-8 md:py-8 md:pb-28">
          {children}
        </div>
      </SidebarInset>

      <nav
        className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t bg-sidebar px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 md:hidden"
        aria-label="Principal"
      >
        {navigation.map((item) => (
          <Button
            key={item.href}
            variant="ghost"
            render={<Link href={item.href} />}
            nativeButton={false}
            className="relative h-14 flex-col gap-1 text-muted-foreground hover:bg-transparent"
          >
            <item.icon aria-hidden="true" />
            <span className="text-xs font-medium">{item.label}</span>
          </Button>
        ))}
      </nav>
    </SidebarProvider>
  );
}

function Brand() {
  return (
    <Link href="/dashboard" className="flex min-w-0 items-center gap-2">
      <LogoMark className="size-8 shrink-0" />
      <span className="truncate font-bold tracking-tight">Hay Fulbo</span>
    </Link>
  );
}

function NavMenu({
  items,
}: {
  items: ReadonlyArray<(typeof navigation)[number] | (typeof groupNavigation)[number]>;
}) {
  return (
    <SidebarMenu className="gap-1">
      {items.map((item) => {
        const active = item.href === "/prototype/grupo";
        return (
          <SidebarMenuItem key={item.href}>
            <SidebarMenuButton
              isActive={active}
              render={<Link href={item.href} aria-current={active ? "page" : undefined} />}
            >
              <item.icon aria-hidden="true" />
              <span>{item.label}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}

/** Production's GroupSwitcher, wired to the prototype store. */
export function ChromeSwitcher({ className }: { className?: string }) {
  const { activeGroup, groups, selectGroup } = useGroup();
  return (
    <div className={cn("w-full min-w-0", className)}>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={`Cambiar grupo, actual: ${activeGroup.name}`}
          render={
            <Button
              variant="ghost"
              className="w-full min-w-0 justify-start gap-2.5 overflow-hidden px-2 text-left"
            />
          }
        >
          <GroupMark name={activeGroup.name} />
          <span className="min-w-0 flex-1 truncate text-sm font-semibold">{activeGroup.name}</span>
          <ChevronsUpDownIcon className="shrink-0 text-muted-foreground" aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Tus grupos</DropdownMenuLabel>
            {groups.map((group) => (
              <DropdownMenuItem key={group.id} onClick={() => selectGroup(group.id)}>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate">{group.name}</span>
                  <span className="text-xs text-muted-foreground">{roleLabel[group.role]}</span>
                </span>
                {group.id === activeGroup.id ? (
                  <CheckIcon className="ml-auto" aria-label="Grupo actual" />
                ) : null}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => toast("Crear grupo abre el diálogo de producción")}>
              <PlusIcon aria-hidden="true" />
              Crear grupo
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

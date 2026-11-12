"use client";

import { Avatar, AvatarFallback } from "@hay-fulbo/ui/components/avatar";
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
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@hay-fulbo/ui/components/empty";
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
  SidebarTrigger,
  useSidebar,
} from "@hay-fulbo/ui/components/sidebar";
import { Skeleton } from "@hay-fulbo/ui/components/skeleton";
import { cn } from "@hay-fulbo/ui/lib/utils";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  HouseIcon,
  ArrowRightIcon,
  CalendarDaysIcon,
  ChevronUpIcon,
  CircleUserRoundIcon,
  LogOutIcon,
  MapPinIcon,
  PlusIcon,
  SettingsIcon,
  TrophyIcon,
  UsersRoundIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useState } from "react";

import { authClient } from "@/lib/auth-client";
import { initials } from "@/lib/initials";
import { queryClient, trpc } from "@/utils/trpc";

import { LogoMark } from "./logo-mark";
import { GroupCreateDialog, GroupSwitcher } from "./group-switcher";
import { ModeToggle } from "./mode-toggle";

type AppContextValue = {
  activeGroupId: string;
  groupName: string;
  role: "owner" | "leader" | "member";
  user: { id: string; name: string; email: string };
};

const AppContext = createContext<AppContextValue | null>(null);

export function useAppContext() {
  const value = useContext(AppContext);
  if (!value) throw new Error("App context is only available inside the dashboard");
  return value;
}

const navigation = [
  { href: "/dashboard", label: "Inicio", icon: HouseIcon },
  { href: "/dashboard/partidos", label: "Partidos", icon: CalendarDaysIcon },
  { href: "/dashboard/jugadores", label: "Jugadores", icon: UsersRoundIcon },
  { href: "/dashboard/estadisticas", label: "Estadísticas", icon: TrophyIcon },
] as const;

const groupNavigation = [
  { href: "/dashboard/canchas", label: "Canchas", icon: MapPinIcon },
  { href: "/dashboard/grupo", label: "Personas y permisos", icon: SettingsIcon },
] as const;

export function AppShell({
  activeGroupId,
  defaultSidebarOpen = true,
  user,
  children,
}: {
  activeGroupId: string | null;
  defaultSidebarOpen?: boolean;
  user: AppContextValue["user"];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const groups = useQuery(trpc.group.list.queryOptions());
  const membership = useQuery({
    ...trpc.group.membership.queryOptions({ groupId: activeGroupId ?? "" }),
    enabled: Boolean(activeGroupId),
  });
  const selectGroup = useMutation(
    trpc.group.select.mutationOptions({
      onSuccess: () => {
        queryClient.clear();
        router.refresh();
      },
    }),
  );

  if (groups.isPending) return <ShellSkeleton />;
  if (groups.isError) {
    return (
      <main className="grid min-h-svh place-items-center px-4">
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No pudimos cargar tus grupos</EmptyTitle>
            <EmptyDescription>{groups.error.message}</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button variant="outline" onClick={() => groups.refetch()}>
              Reintentar
            </Button>
          </EmptyContent>
        </Empty>
      </main>
    );
  }
  if (!groups.data.length) return <CreateGroupGate />;
  if (!activeGroupId || !groups.data.some((group) => group.id === activeGroupId)) {
    return (
      <GroupWelcome
        groups={groups.data}
        onSelect={(groupId) => selectGroup.mutate({ groupId })}
        pending={selectGroup.isPending}
        userName={user.name}
      />
    );
  }
  if (membership.isPending) return <ShellSkeleton />;
  if (membership.isError || !membership.data) {
    return (
      <main className="grid min-h-svh place-items-center px-4">
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No pudimos verificar tu acceso al grupo</EmptyTitle>
            <EmptyDescription>Reintentá para cargar tus permisos.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button variant="outline" onClick={() => membership.refetch()}>
              Reintentar
            </Button>
            <Button
              variant="ghost"
              onClick={() =>
                authClient.signOut({ fetchOptions: { onSuccess: () => router.push("/login") } })
              }
            >
              Salir
            </Button>
          </EmptyContent>
        </Empty>
      </main>
    );
  }

  const group = groups.data.find((item) => item.id === activeGroupId)!;
  const context: AppContextValue = {
    activeGroupId,
    groupName: group.name,
    role: membership.data.role,
    user,
  };

  const signOut = () =>
    authClient.signOut({ fetchOptions: { onSuccess: () => router.push("/login") } });

  return (
    <AppContext value={context}>
      <a
        href="#contenido"
        className="sr-only fixed left-4 top-4 z-50 rounded-md bg-background p-3 focus:not-sr-only focus:ring-2 focus:ring-ring"
      >
        Saltar al contenido
      </a>
      <SidebarProvider defaultOpen={defaultSidebarOpen}>
        <ShellSidebar
          group={group}
          groups={groups.data}
          pathname={pathname}
          role={context.role}
          user={user}
          onProfile={() => router.push("/dashboard/perfil")}
          onSignOut={signOut}
        />

        <SidebarInset id="contenido" tabIndex={-1} className="min-w-0">
          <header className="sticky top-0 z-10 border-b bg-background md:hidden">
            <div className="flex h-14 items-center justify-between gap-3 px-4">
              <GroupSwitcher activeGroup={group} groups={groups.data} role={context.role} />
              <div className="flex shrink-0 items-center gap-2">
                <ModeToggle />
                <UserMenu
                  compact
                  role={context.role}
                  side="bottom"
                  user={user}
                  onProfile={() => router.push("/dashboard/perfil")}
                  onSignOut={signOut}
                />
              </div>
            </div>
          </header>
          <div className="mx-auto w-full max-w-6xl px-4 py-5 pb-28 md:px-8 md:py-8 md:pb-10">
            {children}
          </div>
        </SidebarInset>

        <nav
          className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t bg-sidebar px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 md:hidden"
          aria-label="Principal"
        >
          {navigation.map((item) => {
            const active = isActivePath(pathname, item.href);
            return (
              <Button
                key={item.href}
                variant="ghost"
                render={<Link href={item.href} aria-current={active ? "page" : undefined} />}
                nativeButton={false}
                className={cn(
                  "relative h-14 flex-col gap-1 hover:bg-transparent",
                  active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {active ? (
                  <span
                    className="absolute top-0 h-0.5 w-6 rounded-full bg-primary"
                    aria-hidden="true"
                  />
                ) : null}
                <item.icon aria-hidden="true" />
                <span className="text-xs font-medium">{item.label}</span>
              </Button>
            );
          })}
        </nav>
      </SidebarProvider>
    </AppContext>
  );
}

type GroupSummary = { id: string; name: string; slug: string };

function ShellSidebar({
  group,
  groups,
  onProfile,
  onSignOut,
  pathname,
  role,
  user,
}: {
  group: GroupSummary;
  groups: readonly GroupSummary[];
  onProfile: () => void;
  onSignOut: () => void;
  pathname: string;
  role: AppContextValue["role"];
  user: AppContextValue["user"];
}) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const toggleLabel = collapsed ? "Expandir navegación" : "Contraer navegación";

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="flex-row items-center justify-between group-data-[collapsible=icon]:flex-col">
        <Brand collapsed={collapsed} />
        <SidebarTrigger aria-label={toggleLabel} title={toggleLabel} />
      </SidebarHeader>
      <SidebarGroup className="pb-0 group-data-[collapsible=icon]:items-center">
        <GroupSwitcher activeGroup={group} compact={collapsed} groups={groups} role={role} />
      </SidebarGroup>
      <SidebarContent>
        <nav aria-label="Principal" className="flex flex-col">
          <SidebarGroup>
            <SidebarGroupContent>
              <NavMenu items={navigation} pathname={pathname} />
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarGroup>
            <SidebarGroupLabel>Grupo</SidebarGroupLabel>
            <SidebarGroupContent>
              <NavMenu items={groupNavigation} pathname={pathname} />
            </SidebarGroupContent>
          </SidebarGroup>
        </nav>
      </SidebarContent>
      <SidebarFooter className="flex-row items-center group-data-[collapsible=icon]:flex-col">
        <ModeToggle />
        <div className="min-w-0 flex-1 group-data-[collapsible=icon]:flex-none">
          <UserMenu
            compact={collapsed}
            role={role}
            side="right"
            user={user}
            onProfile={onProfile}
            onSignOut={onSignOut}
          />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

function NavMenu({
  items,
  pathname,
}: {
  items: ReadonlyArray<(typeof navigation)[number] | (typeof groupNavigation)[number]>;
  pathname: string;
}) {
  return (
    <SidebarMenu className="gap-1 group-data-[collapsible=icon]:items-center">
      {items.map((item) => {
        const active = isActivePath(pathname, item.href);
        return (
          <SidebarMenuItem key={item.href}>
            <SidebarMenuButton
              isActive={active}
              tooltip={item.label}
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

function Brand({ collapsed }: { collapsed: boolean }) {
  return (
    <Link
      href="/dashboard"
      className="flex min-w-0 items-center gap-2"
      aria-label={collapsed ? "Hay Fulbo, inicio" : undefined}
    >
      <LogoMark className="size-8 shrink-0" />
      {collapsed ? null : <span className="truncate font-bold tracking-tight">Hay Fulbo</span>}
    </Link>
  );
}

function UserMenu({
  compact,
  onProfile,
  onSignOut,
  role,
  side,
  user,
}: {
  compact: boolean;
  onProfile: () => void;
  onSignOut: () => void;
  role: "owner" | "leader" | "member";
  side: "bottom" | "right";
  user: AppContextValue["user"];
}) {
  const roleLabel =
    role === "owner" ? "Responsable del grupo" : role === "leader" ? "Líder" : "Miembro";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Abrir menú de ${user.name}`}
        title={compact ? user.name : undefined}
        render={
          <Button
            variant="ghost"
            size={compact ? "icon" : "default"}
            className={compact ? "size-11" : "h-auto w-full justify-start px-2 py-2"}
          />
        }
      >
        <Avatar>
          <AvatarFallback>{initials(user.name)}</AvatarFallback>
        </Avatar>
        {compact ? null : (
          <>
            <span className="flex min-w-0 flex-1 flex-col items-start">
              <span className="w-full truncate text-left">{user.name}</span>
              <span className="w-full truncate text-left text-xs font-normal text-muted-foreground">
                {roleLabel}
              </span>
            </span>
            <ChevronUpIcon aria-hidden="true" />
          </>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={side === "bottom" ? "end" : "start"}
        side={side}
        sideOffset={8}
        className="min-w-60"
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex flex-col gap-0.5">
            <strong className="truncate">{user.name}</strong>
            <span className="truncate font-normal">{user.email}</span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={onProfile}>
            <CircleUserRoundIcon aria-hidden="true" />
            Mi perfil
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onSignOut}>
            <LogOutIcon aria-hidden="true" />
            Salir
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function GroupWelcome({
  groups,
  onSelect,
  pending,
  userName,
}: {
  groups: ReadonlyArray<{ id: string; name: string }>;
  onSelect: (groupId: string) => void;
  pending: boolean;
  userName: string;
}) {
  return (
    <main className="grid min-h-svh place-items-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col gap-1 text-center">
          <LogoMark className="mx-auto size-12" />
          <h1 className="mt-3 text-2xl font-bold tracking-tight">¡Hola, {userName}!</h1>
          <p className="text-sm text-muted-foreground">¿Con qué grupo jugamos hoy?</p>
        </div>
        <div className="flex flex-col gap-2">
          {groups.map((group) => (
            <Button
              key={group.id}
              disabled={pending}
              onClick={() => onSelect(group.id)}
              variant="outline"
              className="h-auto justify-between py-4 text-left"
            >
              <span className="flex min-w-0 items-center gap-3">
                <Avatar>
                  <AvatarFallback>{initials(group.name)}</AvatarFallback>
                </Avatar>
                <span className="truncate font-semibold">{group.name}</span>
              </span>
              <ArrowRightIcon aria-hidden="true" />
            </Button>
          ))}
        </div>
      </div>
    </main>
  );
}

function CreateGroupGate() {
  const [open, setOpen] = useState(false);

  return (
    <main className="grid min-h-svh place-items-center px-4">
      <Empty className="max-w-xl border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <UsersRoundIcon aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>Creá el grupo de la fecha</EmptyTitle>
        </EmptyHeader>
        <EmptyContent>
          <Button onClick={() => setOpen(true)}>
            <PlusIcon data-icon="inline-start" aria-hidden="true" />
            Crear grupo
          </Button>
          <GroupCreateDialog open={open} onOpenChange={setOpen} />
        </EmptyContent>
      </Empty>
    </main>
  );
}

function ShellSkeleton() {
  return (
    <div className="mx-auto flex min-h-svh max-w-6xl flex-col gap-6 px-4 py-8">
      <Skeleton className="h-12 w-48" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-72 w-full" />
    </div>
  );
}

function isActivePath(pathname: string, href: string) {
  return pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`));
}

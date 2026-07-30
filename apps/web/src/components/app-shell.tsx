"use client";

import { Avatar, AvatarFallback } from "@hay-fulbo/ui/components/avatar";
import { Button, buttonVariants } from "@hay-fulbo/ui/components/button";
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@hay-fulbo/ui/components/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@hay-fulbo/ui/components/empty";
import { Field, FieldGroup, FieldLabel } from "@hay-fulbo/ui/components/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hay-fulbo/ui/components/select";
import { Skeleton } from "@hay-fulbo/ui/components/skeleton";
import { cn } from "@hay-fulbo/ui/lib/utils";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  HouseIcon,
  CalendarDaysIcon,
  ChevronUpIcon,
  CircleUserRoundIcon,
  LogOutIcon,
  MapPinIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  PlusIcon,
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
  { href: "/dashboard/canchas", label: "Canchas", icon: MapPinIcon },
  { href: "/dashboard/estadisticas", label: "Estadísticas", icon: TrophyIcon },
] as const;

export function AppShell({
  activeGroupId,
  user,
  children,
}: {
  activeGroupId: string | null;
  user: AppContextValue["user"];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
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
      <main className="grid min-h-svh place-items-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Elegí el grupo</CardTitle>
            <CardDescription>La información se mantiene separada para cada grupo.</CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="group">Grupo</FieldLabel>
                <Select
                  items={groups.data.map((group) => ({
                    label: group.name,
                    value: group.id,
                  }))}
                  onValueChange={(value) => {
                    if (typeof value === "string") selectGroup.mutate({ groupId: value });
                  }}
                >
                  <SelectTrigger id="group" className="w-full">
                    <SelectValue placeholder="Seleccionar grupo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {groups.data.map((group) => (
                        <SelectItem key={group.id} value={group.id}>
                          {group.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>
      </main>
    );
  }
  if (membership.isPending) return <ShellSkeleton />;
  if (!membership.data) return null;

  const group = groups.data.find((item) => item.id === activeGroupId)!;
  const context: AppContextValue = {
    activeGroupId,
    groupName: group.name,
    role: membership.data.role,
    user,
  };

  return (
    <AppContext value={context}>
      <div
        className={cn(
          "min-h-svh md:grid",
          sidebarCollapsed ? "md:grid-cols-[4.5rem_1fr]" : "md:grid-cols-[15rem_1fr]",
        )}
      >
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-20 hidden flex-col border-r bg-sidebar md:flex",
            sidebarCollapsed ? "w-18 p-3" : "w-60 p-4",
          )}
        >
          <div
            className={cn(
              "flex items-center",
              sidebarCollapsed ? "flex-col gap-2" : "justify-between gap-2",
            )}
          >
            <Brand collapsed={sidebarCollapsed} />
            <Button
              variant="ghost"
              size="icon"
              aria-label={sidebarCollapsed ? "Expandir navegación" : "Contraer navegación"}
              title={sidebarCollapsed ? "Expandir navegación" : "Contraer navegación"}
              onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
            >
              {sidebarCollapsed ? (
                <PanelLeftOpenIcon aria-hidden="true" />
              ) : (
                <PanelLeftCloseIcon aria-hidden="true" />
              )}
            </Button>
          </div>
          <nav
            className={cn("flex flex-col gap-2", sidebarCollapsed ? "mt-5" : "mt-8")}
            aria-label="Principal"
          >
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-label={sidebarCollapsed ? item.label : undefined}
                title={sidebarCollapsed ? item.label : undefined}
                className={cn(
                  buttonVariants({
                    size: sidebarCollapsed ? "icon" : "default",
                    variant: isActivePath(pathname, item.href) ? "secondary" : "ghost",
                  }),
                  "w-full",
                  !sidebarCollapsed && "justify-start",
                )}
              >
                <item.icon
                  data-icon={sidebarCollapsed ? undefined : "inline-start"}
                  aria-hidden="true"
                />
                {sidebarCollapsed ? null : item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-auto">
            <UserMenu
              compact={sidebarCollapsed}
              role={context.role}
              side="right"
              user={user}
              onProfile={() => router.push("/dashboard/perfil")}
              onSignOut={() =>
                authClient.signOut({
                  fetchOptions: { onSuccess: () => router.push("/login") },
                })
              }
            />
          </div>
        </aside>

        <div className="md:col-start-2">
          <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
            <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-3 px-4 md:px-6 xl:px-8">
              <GroupSwitcher activeGroup={group} groups={groups.data} role={context.role} />
              <div className="flex shrink-0 items-center gap-2">
                <ModeToggle />
                <div className="md:hidden">
                  <UserMenu
                    compact
                    role={context.role}
                    side="bottom"
                    user={user}
                    onProfile={() => router.push("/dashboard/perfil")}
                    onSignOut={() =>
                      authClient.signOut({
                        fetchOptions: { onSuccess: () => router.push("/login") },
                      })
                    }
                  />
                </div>
              </div>
            </div>
          </header>
          <main className="mx-auto w-full max-w-7xl px-4 py-4 pb-28 md:px-6 md:py-6 xl:px-8">
            {children}
          </main>
        </div>

        <nav
          className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t bg-sidebar px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 md:hidden"
          aria-label="Principal"
        >
          {navigation.map((item) => (
            <Button
              key={item.href}
              variant={isActivePath(pathname, item.href) ? "secondary" : "ghost"}
              render={<Link href={item.href} />}
              nativeButton={false}
              className="h-14 flex-col gap-1"
            >
              <item.icon aria-hidden="true" />
              <span className="text-xs">{item.label}</span>
            </Button>
          ))}
        </nav>
      </div>
    </AppContext>
  );
}

function Brand({ collapsed }: { collapsed: boolean }) {
  return (
    <Link
      href="/dashboard"
      className="flex min-w-0 items-center gap-2"
      aria-label={collapsed ? "Hay Fulbo, inicio" : undefined}
    >
      <LogoMark className="size-9 shrink-0" />
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
  const roleLabel = role === "owner" ? "Organizador" : role === "leader" ? "Líder" : "Miembro";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Abrir menú de ${user.name}`}
        title={compact ? user.name : undefined}
        render={
          <Button
            variant="ghost"
            size={compact ? "icon" : "default"}
            className={cn("w-full", !compact && "h-auto justify-start px-2 py-2")}
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
          <EmptyDescription>Ahí se guardan jugadores, canchas, partidos y pagos.</EmptyDescription>
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

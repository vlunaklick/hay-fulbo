"use client";

import { Badge } from "@hay-fulbo/ui/components/badge";
import { Button } from "@hay-fulbo/ui/components/button";
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
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  HouseIcon,
  CalendarDaysIcon,
  CircleUserRoundIcon,
  LogOutIcon,
  MapPinIcon,
  PlusIcon,
  UsersRoundIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useState } from "react";

import { authClient } from "@/lib/auth-client";
import { queryClient, trpc } from "@/utils/trpc";

import { LogoMark } from "./logo-mark";
import { GroupCreateDialog, GroupSwitcher } from "./group-switcher";
import { ModeToggle } from "./mode-toggle";

type AppContextValue = {
  activeGroupId: string;
  groupName: string;
  role: "owner" | "member";
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
      <div className="min-h-svh md:grid md:grid-cols-[15rem_1fr]">
        <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col border-r bg-sidebar p-4 md:flex">
          <Brand />
          <nav className="mt-8 flex flex-col gap-2" aria-label="Principal">
            {navigation.map((item) => (
              <Button
                key={item.href}
                variant={isActivePath(pathname, item.href) ? "secondary" : "ghost"}
                render={<Link href={item.href} />}
                nativeButton={false}
                className="justify-start"
              >
                <item.icon data-icon="inline-start" aria-hidden="true" />
                {item.label}
              </Button>
            ))}
          </nav>
          <div className="mt-auto flex flex-col gap-3">
            <Button
              variant={pathname === "/dashboard/perfil" ? "secondary" : "ghost"}
              render={<Link href="/dashboard/perfil" />}
              nativeButton={false}
              className="justify-start"
            >
              <CircleUserRoundIcon data-icon="inline-start" aria-hidden="true" />
              Mi perfil
            </Button>
            <Badge variant="outline">{context.role === "owner" ? "Organizador" : "Miembro"}</Badge>
            <Button
              variant="ghost"
              className="justify-start"
              onClick={() =>
                authClient.signOut({
                  fetchOptions: { onSuccess: () => router.push("/login") },
                })
              }
            >
              <LogOutIcon data-icon="inline-start" aria-hidden="true" />
              Salir
            </Button>
          </div>
        </aside>

        <div className="md:col-start-2">
          <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
            <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 md:px-8">
              <GroupSwitcher activeGroup={group} groups={groups.data} userName={user.name} />
              <div className="flex shrink-0 items-center gap-2">
                <ModeToggle />
                <Button
                  variant="outline"
                  size="sm"
                  render={<Link href="/dashboard/perfil" />}
                  nativeButton={false}
                  aria-label="Abrir mi perfil"
                >
                  <CircleUserRoundIcon aria-hidden="true" />
                  <span className="hidden sm:inline">Mi perfil</span>
                </Button>
              </div>
            </div>
          </header>
          <main className="mx-auto w-full max-w-6xl px-4 py-6 pb-28 md:px-8 md:py-8">
            {children}
          </main>
        </div>

        <nav
          className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t bg-sidebar px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 md:hidden"
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

function Brand() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2">
      <LogoMark className="size-9 shrink-0" />
      <span className="font-bold tracking-tight">Hay Fulbo</span>
    </Link>
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

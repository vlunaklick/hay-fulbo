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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@hay-fulbo/ui/components/dialog";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@hay-fulbo/ui/components/empty";
import { Field, FieldError, FieldGroup, FieldLabel } from "@hay-fulbo/ui/components/field";
import { Input } from "@hay-fulbo/ui/components/input";
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
  CalendarDaysIcon,
  CircleUserRoundIcon,
  LogOutIcon,
  MapPinIcon,
  PlusIcon,
  ShieldCheckIcon,
  UsersRoundIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useState } from "react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";
import { queryClient, trpc } from "@/utils/trpc";

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
  { href: "/dashboard", label: "Partidos", icon: CalendarDaysIcon },
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
                variant={pathname === item.href ? "secondary" : "ghost"}
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
          <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur md:px-8">
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-semibold">{group.name}</span>
              <span className="truncate text-xs text-muted-foreground">{user.name}</span>
            </div>
            <Badge variant="outline">
              <CircleUserRoundIcon aria-hidden="true" />
              {context.role === "owner" ? "Organizador" : "Miembro"}
            </Badge>
          </header>
          <main className="mx-auto w-full max-w-6xl px-4 py-6 pb-28 md:px-8 md:py-8">
            {children}
          </main>
        </div>

        <nav
          className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-3 border-t bg-sidebar px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 md:hidden"
          aria-label="Principal"
        >
          {navigation.map((item) => (
            <Button
              key={item.href}
              variant={pathname === item.href ? "secondary" : "ghost"}
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
      <span className="grid size-9 place-items-center rounded-md bg-primary text-primary-foreground">
        <ShieldCheckIcon aria-hidden="true" />
      </span>
      <span className="font-bold tracking-tight">Hay Fulbo</span>
    </Link>
  );
}

function CreateGroupGate() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const create = useMutation(
    trpc.group.create.mutationOptions({
      onSuccess: async (group) => {
        await select.mutateAsync({ groupId: group.id });
        toast.success("Grupo creado");
        queryClient.clear();
        router.refresh();
      },
      onError: (cause) => setError(cause.message),
    }),
  );
  const select = useMutation(trpc.group.select.mutationOptions());
  const slug = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

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
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button />}>
              <PlusIcon data-icon="inline-start" aria-hidden="true" />
              Crear grupo
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nuevo grupo</DialogTitle>
                <DialogDescription>Usá un nombre que todos reconozcan.</DialogDescription>
              </DialogHeader>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!slug) return setError("Ingresá un nombre.");
                  create.mutate({ name, slug });
                }}
              >
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="group-name">Nombre</FieldLabel>
                    <Input
                      id="group-name"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="Fulbo de los jueves"
                    />
                  </Field>
                  <FieldError>{error}</FieldError>
                  <Button type="submit" disabled={create.isPending || select.isPending}>
                    Crear y entrar
                  </Button>
                </FieldGroup>
              </form>
            </DialogContent>
          </Dialog>
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

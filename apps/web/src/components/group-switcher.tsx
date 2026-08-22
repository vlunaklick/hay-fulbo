"use client";

import { Button } from "@hay-fulbo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@hay-fulbo/ui/components/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@hay-fulbo/ui/components/dropdown-menu";
import { Field, FieldError, FieldGroup, FieldLabel } from "@hay-fulbo/ui/components/field";
import { Input } from "@hay-fulbo/ui/components/input";
import {
  CheckIcon,
  ChevronsUpDownIcon,
  MapPinIcon,
  PlusIcon,
  SettingsIcon,
  UserPlusIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";

import { queryClient, trpc } from "@/utils/trpc";

type GroupSummary = {
  id: string;
  name: string;
  slug: string;
};

export function GroupSwitcher({
  activeGroup,
  compact = false,
  groups,
  role,
}: {
  activeGroup: GroupSummary;
  compact?: boolean;
  groups: readonly GroupSummary[];
  role: "leader" | "member" | "owner";
}) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const select = useMutation(
    trpc.group.select.mutationOptions({
      onSuccess: () => {
        queryClient.clear();
        router.refresh();
      },
      onError: (error) =>
        toast.error("No pudimos cambiar de grupo", {
          description: error.message,
        }),
    }),
  );

  return (
    <>
      <div className={compact ? "flex justify-center" : "w-full min-w-0"}>
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={`Cambiar grupo, actual: ${activeGroup.name}`}
            title={compact ? `Grupo: ${activeGroup.name}` : undefined}
            render={
              <Button
                variant="ghost"
                size={compact ? "icon" : "default"}
                className={
                  compact
                    ? undefined
                    : "h-auto w-full min-w-0 justify-between gap-1 overflow-hidden text-left"
                }
              />
            }
          >
            {compact ? (
              <span className="text-xs font-bold" aria-hidden="true">
                {activeGroup.name.slice(0, 2).toLocaleUpperCase("es")}
              </span>
            ) : (
              <>
                <span className="min-w-0 truncate text-sm font-semibold">{activeGroup.name}</span>
                <ChevronsUpDownIcon className="shrink-0" aria-hidden="true" />
              </>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-56">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Tus grupos</DropdownMenuLabel>
              {groups.map((group) => (
                <DropdownMenuItem
                  key={group.id}
                  disabled={select.isPending}
                  onClick={() => {
                    if (group.id !== activeGroup.id) select.mutate({ groupId: group.id });
                  }}
                >
                  <span className="truncate">{group.name}</span>
                  {group.id === activeGroup.id ? (
                    <CheckIcon className="ml-auto" aria-label="Grupo actual" />
                  ) : null}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => router.push("/dashboard/canchas")}>
                <MapPinIcon aria-hidden="true" />
                Canchas
              </DropdownMenuItem>
              {role === "owner" ? (
                <>
                  <DropdownMenuItem onClick={() => router.push("/dashboard/grupo#invitar")}>
                    <UserPlusIcon aria-hidden="true" />
                    Invitar amigos
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push("/dashboard/grupo")}>
                    <SettingsIcon aria-hidden="true" />
                    Administrar grupo
                  </DropdownMenuItem>
                </>
              ) : null}
              <DropdownMenuItem onClick={() => setCreateOpen(true)}>
                <PlusIcon aria-hidden="true" />
                Crear grupo
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <GroupCreateDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}

export function GroupCreateDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const select = useMutation(trpc.group.select.mutationOptions());
  const create = useMutation(
    trpc.group.create.mutationOptions({
      onSuccess: async (group) => {
        await select.mutateAsync({ groupId: group.id });
        toast.success("Grupo creado");
        setName("");
        setError(null);
        onOpenChange(false);
        queryClient.clear();
        router.refresh();
      },
      onError: (cause) => setError(cause.message),
    }),
  );

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      setError("Ingresá un nombre.");
      return;
    }
    const base = cleanName
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    create.mutate({
      name: cleanName,
      slug: `${base || "grupo"}-${Date.now().toString(36)}`,
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setError(null);
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo grupo</DialogTitle>
          <DialogDescription>Usá un nombre que todos reconozcan.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit}>
          <FieldGroup>
            <Field data-invalid={Boolean(error)}>
              <FieldLabel htmlFor="new-group-name">Nombre del grupo</FieldLabel>
              <Input
                id="new-group-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Fulbo de los jueves"
                aria-invalid={Boolean(error)}
              />
              <FieldError>{error}</FieldError>
            </Field>
            <Button type="submit" disabled={create.isPending || select.isPending}>
              Crear y entrar
            </Button>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}

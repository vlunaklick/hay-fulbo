"use client";

// PROTOTYPE ONLY — in-memory state and the pieces every variant shares, so a
// change made in one variant survives switching to the next.

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
import { UsersRoundIcon } from "lucide-react";
import { createContext, useContext, useState } from "react";
import { toast } from "sonner";

import { initials } from "@/lib/initials";

import {
  groups,
  initialMembers,
  joinUrl,
  type Member,
  type QuorumKey,
  publicUrl,
  sortMembers,
} from "./data";

function useGroupStore() {
  const [members, setMembers] = useState(initialMembers);
  const [linkGeneration, setLinkGeneration] = useState<number | null>(3);
  const [isPublic, setIsPublic] = useState(true);
  const [quorum, setQuorum] = useState<QuorumKey>("half_plus_one");
  const [activeGroupId, setActiveGroupId] = useState(groups[0]!.id);
  const [removeTarget, setRemoveTarget] = useState<Member | null>(null);

  const sorted = sortMembers(members);

  return {
    activeGroup: groups.find((group) => group.id === activeGroupId)!,
    groups,
    members: sorted,
    counts: {
      total: members.length,
      leaders: members.filter((member) => member.role === "leader").length,
      members: members.filter((member) => member.role === "member").length,
    },
    joinLink: linkGeneration ? { url: joinUrl(linkGeneration), generation: linkGeneration } : null,
    isPublic,
    publicUrl,
    quorum,
    removeTarget,
    selectGroup(id: string) {
      if (id === activeGroupId) return;
      setActiveGroupId(id);
      toast.success("Cambiaste de grupo", {
        description: "En el prototipo la vista sigue mostrando los mismos datos.",
      });
    },
    setRole(membershipId: string, role: "leader" | "member") {
      setMembers((current) =>
        current.map((member) =>
          member.membershipId === membershipId ? { ...member, role } : member,
        ),
      );
      toast.success(role === "leader" ? "Ahora es líder" : "Ahora es miembro");
    },
    askRemove: setRemoveTarget,
    confirmRemove() {
      if (!removeTarget) return;
      setMembers((current) =>
        current.filter((member) => member.membershipId !== removeTarget.membershipId),
      );
      toast.success(`${removeTarget.name} salió del grupo`);
      setRemoveTarget(null);
    },
    renewLink() {
      setLinkGeneration((current) => (current ?? 0) + 1);
      toast.success("Link nuevo creado y copiado", {
        description: "El anterior ya no funciona.",
      });
    },
    revokeLink() {
      setLinkGeneration(null);
      toast.success("Link desactivado");
    },
    setPublic(next: boolean) {
      setIsPublic(next);
      toast.success(next ? "El grupo es público" : "El grupo dejó de ser público");
    },
    setQuorum(next: QuorumKey) {
      setQuorum(next);
      toast.success("Regla de notas actualizada");
    },
  };
}

export type GroupStore = ReturnType<typeof useGroupStore>;

const GroupStoreContext = createContext<GroupStore | null>(null);

export function GroupStoreProvider({ children }: { children: React.ReactNode }) {
  const store = useGroupStore();
  return (
    <GroupStoreContext value={store}>
      {children}
      <RemoveMemberDialog />
    </GroupStoreContext>
  );
}

export function useGroup() {
  const store = useContext(GroupStoreContext);
  if (!store) throw new Error("useGroup needs GroupStoreProvider");
  return store;
}

function RemoveMemberDialog() {
  const { removeTarget, askRemove, confirmRemove } = useGroup();
  return (
    <Dialog open={Boolean(removeTarget)} onOpenChange={(open) => !open && askRemove(null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sacar a {removeTarget?.name} del grupo</DialogTitle>
          <DialogDescription>
            La cuenta pierde acceso. Si estaba vinculada a un jugador, se desvincula, pero sus
            partidos, goles y asistencias quedan intactos.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => askRemove(null)}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={confirmRemove}>
            <UsersRoundIcon data-icon="inline-start" aria-hidden="true" />
            Sacar del grupo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export async function copyText(value: string, label = "Link copiado") {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(label);
  } catch {
    toast.error("No pudimos copiarlo");
  }
}

/** Native share sheet on phones (WhatsApp is one tap away); copy everywhere else. */
export async function shareJoinLink(url: string, groupName: string) {
  if (typeof navigator !== "undefined" && "share" in navigator) {
    try {
      await navigator.share({ title: groupName, text: `Sumate a ${groupName} en Hay Fulbo`, url });
      return;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
    }
  }
  await copyText(url);
}

export function MemberAvatar({ name, className }: { name: string; className?: string }) {
  return (
    <Avatar className={className}>
      <AvatarFallback>{initials(name)}</AvatarFallback>
    </Avatar>
  );
}

export function GroupMark({ name, className }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={
        className ??
        "grid size-7 shrink-0 place-items-center rounded-md bg-secondary text-xs font-bold text-secondary-foreground"
      }
    >
      {initials(name)}
    </span>
  );
}

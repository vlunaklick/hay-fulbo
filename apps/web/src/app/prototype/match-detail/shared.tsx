"use client";

// PROTOTYPE ONLY — pieces shared by the three /prototype/match-detail variants.

import { Badge } from "@hay-fulbo/ui/components/badge";
import { Button } from "@hay-fulbo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@hay-fulbo/ui/components/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@hay-fulbo/ui/components/dropdown-menu";
import { Input } from "@hay-fulbo/ui/components/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hay-fulbo/ui/components/select";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@hay-fulbo/ui/components/sheet";
import { cn } from "@hay-fulbo/ui/lib/utils";
import {
  BanIcon,
  CalendarDaysIcon,
  CalendarPlusIcon,
  CopyIcon,
  HomeIcon,
  MessageCircleIcon,
  MinusIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  RotateCcwIcon,
  Share2Icon,
  TrophyIcon,
  UsersIcon,
  WalletIcon,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";

import { LogoMark } from "@/components/logo-mark";
import { formatMoney } from "@/lib/format";

import {
  cashSummary,
  expectedShare,
  payLabel,
  payStatus,
  type Dispatch,
  type MatchState,
  type Player,
  type Team,
} from "./data";

// ── Fake app shell, so each variant sits in the real chrome ────────────────────

const nav = [
  { label: "Inicio", href: "/dashboard", icon: HomeIcon },
  { label: "Partidos", href: "/dashboard/partidos", icon: CalendarDaysIcon, active: true },
  { label: "Jugadores", href: "/dashboard/jugadores", icon: UsersIcon },
  { label: "Estadísticas", href: "/dashboard/estadisticas", icon: TrophyIcon },
];

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-svh bg-background text-foreground md:grid md:grid-cols-[15rem_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-svh flex-col gap-4 border-r bg-sidebar p-3 md:flex">
        <div className="flex h-11 items-center gap-2 px-2">
          <LogoMark className="size-8 shrink-0" />
          <span className="truncate font-bold tracking-tight">Hay Fulbo</span>
        </div>
        <nav aria-label="Principal" className="flex flex-col gap-1">
          {nav.map((item) => (
            <Button
              key={item.href}
              variant="ghost"
              nativeButton={false}
              render={
                <Link href={item.href as Route} aria-current={item.active ? "page" : undefined} />
              }
              className={cn(
                "justify-start",
                item.active ? "bg-muted text-foreground" : "text-muted-foreground",
              )}
            >
              <item.icon data-icon="inline-start" aria-hidden="true" />
              {item.label}
            </Button>
          ))}
        </nav>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-20 border-b bg-background md:hidden">
          <div className="flex h-14 items-center gap-2 px-4">
            <LogoMark className="size-7 shrink-0" />
            <span className="truncate text-sm font-semibold">Los del Jueves</span>
          </div>
        </header>
        <div className="mx-auto w-full max-w-6xl px-4 py-5 pb-28 md:px-8 md:py-8 md:pb-10">
          {children}
        </div>
      </div>
      <nav
        aria-label="Principal"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t bg-sidebar px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:hidden"
      >
        {nav.map((item) => (
          <Button
            key={item.href}
            variant="ghost"
            nativeButton={false}
            render={
              <Link href={item.href as Route} aria-current={item.active ? "page" : undefined} />
            }
            className={cn(
              "relative h-14 flex-col gap-1 hover:bg-transparent",
              item.active ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {item.active ? (
              <span
                className="absolute top-0 h-0.5 w-6 rounded-full bg-primary"
                aria-hidden="true"
              />
            ) : null}
            <item.icon aria-hidden="true" />
            <span className="text-xs font-medium">{item.label}</span>
          </Button>
        ))}
      </nav>
    </div>
  );
}

// ── Small atoms ────────────────────────────────────────────────────────────────

export function TeamDot({ slot, className }: { slot: 1 | 2; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "size-2 shrink-0 rounded-full",
        slot === 1 ? "bg-team-blue" : "bg-team-amber",
        className,
      )}
    />
  );
}

export function PayBadge({ paid, expected }: { paid: number; expected: number }) {
  const status = payLabel[payStatus(paid, expected)];
  return <Badge variant={status.variant}>{status.label}</Badge>;
}

export function Stepper({
  label,
  value,
  onChange,
  readOnly,
}: {
  label: string;
  value: number;
  onChange: (delta: 1 | -1) => void;
  readOnly?: boolean;
}) {
  if (readOnly) {
    return (
      <span
        className={cn(
          "flex h-11 items-center justify-center text-sm font-semibold tabular-nums",
          value === 0 && "font-normal text-muted-foreground",
        )}
      >
        <span className="sr-only">{label}: </span>
        {value}
      </span>
    );
  }
  return (
    <span
      role="group"
      aria-label={label}
      className="flex w-full max-w-28 min-w-0 items-center justify-between rounded-md bg-muted/50"
    >
      <Button
        aria-label={`${label}: restar`}
        disabled={value === 0}
        size="icon"
        variant="ghost"
        onClick={() => onChange(-1)}
      >
        <MinusIcon aria-hidden="true" />
      </Button>
      <span
        className={cn(
          "min-w-4 text-center text-sm font-semibold tabular-nums",
          value === 0 && "font-normal text-muted-foreground",
        )}
      >
        {value}
      </span>
      <Button
        aria-label={`${label}: sumar`}
        size="icon"
        variant="ghost"
        onClick={() => onChange(1)}
      >
        <PlusIcon aria-hidden="true" />
      </Button>
    </span>
  );
}

// ── "¿Quién la hizo?" — one sheet for adding or removing a goal ────────────────

export type GoalTarget = { teamId: string; delta: 1 | -1 } | null;

export function GoalSheet({
  state,
  dispatch,
  target,
  onClose,
}: {
  state: MatchState;
  dispatch: Dispatch;
  target: GoalTarget;
  onClose: () => void;
}) {
  const team = state.teams.find((row) => row.id === target?.teamId);
  const rival = state.teams.find((row) => row.id !== target?.teamId);
  const adding = target?.delta === 1;
  const choices = team
    ? [
        ...team.players
          .filter((row) => adding || row.goals > 0)
          .map((row) => ({
            key: row.id,
            label: row.name,
            count: row.goals,
            run: () =>
              dispatch({ type: "stat", playerId: row.id, field: "goals", delta: target!.delta }),
          })),
        ...(adding || team.unattributed > 0
          ? [
              {
                key: "none",
                label: "Sin autor",
                count: team.unattributed,
                run: () =>
                  dispatch({ type: "unattributed", teamId: team.id, delta: target!.delta }),
              },
            ]
          : []),
        ...(rival?.players ?? [])
          .filter((row) => adding || row.ownGoals > 0)
          .map((row) => ({
            key: `own-${row.id}`,
            label: `Autogol de ${row.name}`,
            count: row.ownGoals,
            run: () =>
              dispatch({ type: "stat", playerId: row.id, field: "ownGoals", delta: target!.delta }),
          })),
      ]
    : [];
  return (
    <Sheet open={target !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="max-h-[85dvh]">
        <SheetHeader>
          <SheetTitle>
            {adding ? "¿Quién la hizo?" : "Restar un gol"} · {team?.name}
          </SheetTitle>
          <SheetDescription>
            {adding
              ? "Elegí al autor, un autogol rival o un gol sin autor."
              : "Elegí qué gol querés restar del marcador."}
          </SheetDescription>
        </SheetHeader>
        <SheetBody className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {choices.map((choice) => (
            <Button
              key={choice.key}
              variant="outline"
              className="h-auto min-h-11 justify-between px-4 py-3 text-left whitespace-normal"
              onClick={() => {
                choice.run();
                onClose();
                toast.success(adding ? `Gol: ${choice.label}` : `Gol restado: ${choice.label}`);
              }}
            >
              <span>{choice.label}</span>
              {!adding ? <span className="tabular-nums">{choice.count}</span> : null}
            </Button>
          ))}
          {choices.length === 0 ? (
            <p className="text-sm text-muted-foreground">No quedan goles para restar.</p>
          ) : null}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}

// ── La caja ────────────────────────────────────────────────────────────────────

export function PaymentActions({
  state,
  dispatch,
  id,
  name,
  paid,
}: {
  state: MatchState;
  dispatch: Dispatch;
  id: string;
  name: string;
  paid: number;
}) {
  const expected = expectedShare(state);
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState(String(paid / 100));
  if (editing) {
    return (
      <form
        className="flex flex-wrap items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          const value = Math.round(Number(amount.replace(",", ".")) * 100);
          if (!Number.isFinite(value) || value < 0) return;
          dispatch({ type: "paid", playerId: id, amount: value });
          setEditing(false);
        }}
      >
        <Input
          autoFocus
          aria-label={`Pagó ${name}`}
          className="w-28"
          inputMode="decimal"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
        />
        <Button size="sm" type="submit">
          Guardar
        </Button>
        <Button size="sm" type="button" variant="ghost" onClick={() => setEditing(false)}>
          Cancelar
        </Button>
      </form>
    );
  }
  return (
    <span className="flex">
      <Button
        aria-label={`Marcar pago completo de ${name}`}
        title="Marcar pago completo"
        disabled={paid === expected}
        size="icon"
        variant="ghost"
        onClick={() => {
          dispatch({ type: "paid", playerId: id, amount: expected });
          toast.success(`${name} pagó ${formatMoney(expected)}`);
        }}
      >
        <WalletIcon aria-hidden="true" />
      </Button>
      <Button
        aria-label={`Editar pago de ${name}`}
        title="Editar pago"
        size="icon"
        variant="ghost"
        onClick={() => {
          setAmount(String(paid / 100));
          setEditing(true);
        }}
      >
        <PencilIcon aria-hidden="true" />
      </Button>
    </span>
  );
}

export function CashList({ state, dispatch }: { state: MatchState; dispatch: Dispatch }) {
  const cash = cashSummary(state);
  const editable = state.role === "organizer";
  return (
    <ul className="flex flex-col divide-y">
      {cash.rows.map((row) => (
        <li
          key={row.id}
          className="flex min-h-14 flex-wrap items-center justify-between gap-x-3 gap-y-1 py-1"
        >
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-medium">{row.name}</span>
            <span className="text-xs text-muted-foreground tabular-nums">
              {formatMoney(row.paid)} de {formatMoney(cash.expected)}
              {row.absent ? " · no vino, aporta" : ""}
            </span>
          </span>
          <span className="flex items-center gap-1">
            <PayBadge paid={row.paid} expected={cash.expected} />
            {editable ? (
              <PaymentActions
                state={state}
                dispatch={dispatch}
                id={row.id}
                name={row.name}
                paid={row.paid}
              />
            ) : null}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function CashSheet({
  state,
  dispatch,
  open,
  onOpenChange,
}: {
  state: MatchState;
  dispatch: Dispatch;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const cash = cashSummary(state);
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>La caja</SheetTitle>
          <SheetDescription>
            {cash.settled} de {cash.total} pagaron · {formatMoney(cash.collected)} de{" "}
            {formatMoney(cash.cost)}
          </SheetDescription>
        </SheetHeader>
        <SheetBody>
          <CashList state={state} dispatch={dispatch} />
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}

export function CashButton({ state, dispatch }: { state: MatchState; dispatch: Dispatch }) {
  const cash = cashSummary(state);
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <WalletIcon data-icon="inline-start" aria-hidden="true" />
        La caja
        <span className="font-normal text-muted-foreground tabular-nums">
          {cash.settled}/{cash.total}
        </span>
      </Button>
      <CashSheet state={state} dispatch={dispatch} open={open} onOpenChange={setOpen} />
    </>
  );
}

// ── Sharing ────────────────────────────────────────────────────────────────────

export function InviteMenu({
  variant = "outline",
  className,
}: {
  variant?: "outline" | "secondary" | "default";
  className?: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button size="sm" variant={variant} className={className} />}>
        <Share2Icon data-icon="inline-start" aria-hidden="true" />
        Invitar
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={() => toast.success("Abriendo WhatsApp…")}>
          <MessageCircleIcon aria-hidden="true" />
          WhatsApp
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => toast.success("Link copiado")}>
          <CopyIcon aria-hidden="true" />
          Copiar link
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => toast.success("Evento de calendario descargado")}>
          <CalendarPlusIcon aria-hidden="true" />
          Calendario
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function shareResult(state: MatchState, left: number, right: number) {
  toast.success("Placa lista para compartir", {
    description: `${state.teams[0].name} ${left}–${right} ${state.teams[1].name}`,
  });
}

// ── Roster ─────────────────────────────────────────────────────────────────────

export function PlayerMenu({
  state,
  dispatch,
  player,
}: {
  state: MatchState;
  dispatch: Dispatch;
  player: Player;
}) {
  const [asking, setAsking] = useState(false);
  const other = state.teams.find((team) => !team.players.some((row) => row.id === player.id));
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              className="size-11 shrink-0"
              variant="ghost"
              aria-label={`Opciones de ${player.name}`}
            />
          }
        >
          <MoreHorizontalIcon aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={() => setAsking(true)}>No vino</DropdownMenuItem>
          <DropdownMenuItem onClick={() => dispatch({ type: "move", playerId: player.id })}>
            Mover a {other?.name ?? "el otro equipo"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => dispatch({ type: "remove", playerId: player.id })}
          >
            Sacar del partido
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={asking} onOpenChange={setAsking}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{player.name} no vino</DialogTitle>
            <DialogDescription>¿Deja su aporte para la cancha?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAsking(false)}>
              Cancelar
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                dispatch({ type: "absent", playerId: player.id, owes: false });
                setAsking(false);
              }}
            >
              No aporta
            </Button>
            <Button
              onClick={() => {
                dispatch({ type: "absent", playerId: player.id, owes: true });
                setAsking(false);
              }}
            >
              Sí, aporta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function AddPlayers({
  state,
  dispatch,
  team,
}: {
  state: MatchState;
  dispatch: Dispatch;
  team: Team;
}) {
  const [name, setName] = useState("");
  return (
    <div className="flex flex-col gap-2">
      {state.available.length > 0 ? (
        <div className="-m-1 flex max-h-32 flex-wrap content-start gap-1.5 overflow-y-auto p-1">
          {state.available.map((player) => (
            <Button
              key={player.id}
              size="xs"
              variant="secondary"
              onClick={() => dispatch({ type: "add", teamId: team.id, playerId: player.id })}
            >
              <PlusIcon data-icon="inline-start" aria-hidden="true" />
              <span className="max-w-36 truncate">{player.name}</span>
            </Button>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Todos los del grupo están anotados.</p>
      )}
      <form
        className="flex items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (!name.trim()) return;
          dispatch({ type: "create", teamId: team.id, name });
          setName("");
        }}
      >
        <Input
          aria-label={`Jugador nuevo para ${team.name}`}
          autoComplete="off"
          placeholder="O escribí un nombre nuevo…"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <Button
          aria-label="Crear y sumar jugador"
          disabled={!name.trim()}
          size="icon"
          type="submit"
          variant="outline"
        >
          <PlusIcon aria-hidden="true" />
        </Button>
      </form>
    </div>
  );
}

export function Absences({ state, dispatch }: { state: MatchState; dispatch: Dispatch }) {
  if (state.absences.length === 0) return null;
  const editable =
    state.role === "organizer" && (state.phase === "upcoming" || state.phase === "live");
  return (
    <div className="flex flex-col gap-1">
      <h3 className="text-xs font-medium text-muted-foreground">
        Dijeron que venían y no vinieron
      </h3>
      <ul className="flex flex-col divide-y">
        {state.absences.map((row) => (
          <li key={row.id} className="flex min-h-11 items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2 text-sm">
              <span className="truncate">{row.name}</span>
              {row.owes ? <Badge variant="secondary">Aporta</Badge> : null}
            </span>
            {editable ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  dispatch({ type: "unabsent", playerId: row.id, teamId: state.teams[0].id })
                }
              >
                Vino al final
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Scorekeeper picker ─────────────────────────────────────────────────────────

export function ScorekeeperSelect({ state, dispatch }: { state: MatchState; dispatch: Dispatch }) {
  const items = [
    { label: "Sin planillero", value: null as string | null },
    ...state.members.map((name) => ({ label: name, value: name })),
  ];
  return (
    <Select
      items={items}
      value={state.scorekeeper}
      onValueChange={(value) => dispatch({ type: "scorekeeper", name: value })}
    >
      <SelectTrigger aria-label="Planillero" size="sm" className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {items.map((item) => (
            <SelectItem key={item.value ?? "none"} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

// ── Ratings ────────────────────────────────────────────────────────────────────

const scoreItems = Array.from({ length: 10 }, (_, index) => ({
  label: String(index + 1),
  value: String(index + 1),
}));

export function RatingSelect({
  state,
  dispatch,
  player,
  className,
}: {
  state: MatchState;
  dispatch: Dispatch;
  player: { id: string; name: string };
  className?: string;
}) {
  if (player.id === state.viewerId) {
    return (
      <span className={cn("w-20 text-center text-xs text-muted-foreground", className)}>vos</span>
    );
  }
  const value = state.ratings.draft[player.id] ?? state.ratings.mine[player.id] ?? null;
  return (
    <Select
      items={scoreItems}
      value={value === null ? null : String(value)}
      onValueChange={(next) => dispatch({ type: "rate", playerId: player.id, score: Number(next) })}
    >
      <SelectTrigger
        aria-label={`Nota para ${player.name}`}
        size="sm"
        className={cn("w-20", className)}
      >
        <SelectValue placeholder="Nota" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {scoreItems.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

export function draftCount(state: MatchState) {
  return Object.keys(state.ratings.draft).length;
}

export function saveRatings(state: MatchState, dispatch: Dispatch) {
  const count = draftCount(state);
  dispatch({ type: "saveRatings" });
  toast.success(count === 1 ? "Nota guardada" : `${count} notas guardadas`);
}

// ── Lifecycle actions in the "…" menu ─────────────────────────────────────────

export function MatchMenu({ state, dispatch }: { state: MatchState; dispatch: Dispatch }) {
  if (state.role !== "organizer") return null;
  const open = state.phase === "upcoming" || state.phase === "live";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button aria-label="Más acciones del partido" size="icon" variant="ghost" />}
      >
        <MoreHorizontalIcon aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {open ? (
          <DropdownMenuItem onClick={() => toast("Edición de fecha, cancha y precio")}>
            <PencilIcon aria-hidden="true" />
            Editar datos
          </DropdownMenuItem>
        ) : null}
        {state.phase === "closed" ? (
          <DropdownMenuItem onClick={() => dispatch({ type: "phase", phase: "live" })}>
            <RotateCcwIcon aria-hidden="true" />
            Reabrir partido
          </DropdownMenuItem>
        ) : null}
        {state.phase === "cancelled" ? (
          <DropdownMenuItem onClick={() => dispatch({ type: "phase", phase: "upcoming" })}>
            <RotateCcwIcon aria-hidden="true" />
            Restaurar partido
          </DropdownMenuItem>
        ) : null}
        {open ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => dispatch({ type: "phase", phase: "cancelled" })}
            >
              <BanIcon aria-hidden="true" />
              Cancelar partido
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function closeMatch(dispatch: Dispatch) {
  dispatch({ type: "phase", phase: "closed" });
  toast.success("Partido cerrado", { description: "Ya cuenta para resultados y estadísticas." });
}

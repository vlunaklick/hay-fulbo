"use client";

import {
  AlertCircleIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  BanknoteIcon,
  CalendarDaysIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CircleDollarSignIcon,
  ClipboardCheckIcon,
  GoalIcon,
  MapPinIcon,
  MinusIcon,
  PlusIcon,
  RotateCcwIcon,
  ShieldIcon,
  UserPlusIcon,
  UsersIcon,
  XIcon,
} from "lucide-react";
import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@hay-fulbo/ui/components/alert";
import { Badge } from "@hay-fulbo/ui/components/badge";
import { Button } from "@hay-fulbo/ui/components/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@hay-fulbo/ui/components/card";
import { Checkbox } from "@hay-fulbo/ui/components/checkbox";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@hay-fulbo/ui/components/field";
import { Input } from "@hay-fulbo/ui/components/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@hay-fulbo/ui/components/input-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hay-fulbo/ui/components/select";
import { Separator } from "@hay-fulbo/ui/components/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@hay-fulbo/ui/components/tabs";
import { ToggleGroup, ToggleGroupItem } from "@hay-fulbo/ui/components/toggle-group";
import { cn } from "@hay-fulbo/ui/lib/utils";

import { useMountEffect } from "./use-mount-effect";

// Three variants of the mobile match-entry flow, switchable via ?variant=, on
// the throwaway /prototype/match-entry route.

type TeamId = "naranja" | "azul";
type MatchStatus = "setup" | "open" | "closed" | "cancelled";
type VariantKey = "A" | "B" | "C";
type Stat = "goals" | "assists";

type Venue = { id: string; name: string; address: string };
type Player = {
  id: string;
  name: string;
  team: TeamId | null;
  expected: number;
  paid: number;
  goals: number;
  assists: number;
  isNew?: boolean;
};
type SpecialGoal = {
  id: number;
  type: "unattributed" | "own-goal";
  creditedTeam: TeamId;
};
type MatchModel = {
  status: MatchStatus;
  date: string;
  venueId: string;
  cost: number;
  teams: Record<TeamId, { name: string; captainId: string }>;
  players: Player[];
  specialGoals: SpecialGoal[];
};
type MatchActions = {
  date: (value: string) => void;
  venue: (value: string) => void;
  cost: (value: number) => void;
  teamName: (team: TeamId, value: string) => void;
  captain: (team: TeamId, value: string) => void;
  togglePlayer: (playerId: string, team: TeamId) => void;
  addPlayer: (name: string, team: TeamId) => void;
  expected: (playerId: string, value: number) => void;
  paid: (playerId: string, value: number) => void;
  settle: (playerId: string, checked: boolean) => void;
  stat: (playerId: string, field: Stat, delta: number) => void;
  special: (type: SpecialGoal["type"], creditedTeam: TeamId) => void;
  undoSpecial: () => void;
  createOpen: () => void;
  close: () => void;
  reopen: () => void;
  cancel: () => void;
};
type SharedProps = {
  model: MatchModel;
  venues: Venue[];
  actions: MatchActions;
  validation: string[];
  editable: boolean;
};

const VENUES: Venue[] = [
  { id: "galpon", name: "El Galpón", address: "Av. Córdoba 4870, Palermo" },
  { id: "jaula", name: "La Jaula", address: "Donado 1850, Villa Urquiza" },
  { id: "gallo", name: "Open Gallo", address: "Gallo 241, Almagro" },
];
const TEAMS: TeamId[] = ["naranja", "azul"];
const INITIAL: MatchModel = {
  status: "setup",
  date: "2026-08-01T20:00",
  venueId: "galpon",
  cost: 54000,
  teams: {
    naranja: { name: "Naranja mecánica", captainId: "nico" },
    azul: { name: "Los del fondo", captainId: "tobi" },
  },
  players: [
    { id: "nico", name: "Nico", team: "naranja", expected: 9000, paid: 9000, goals: 0, assists: 0 },
    { id: "fede", name: "Fede", team: "naranja", expected: 9000, paid: 9000, goals: 1, assists: 0 },
    {
      id: "juani",
      name: "Juani",
      team: "naranja",
      expected: 9000,
      paid: 4500,
      goals: 0,
      assists: 1,
    },
    { id: "tobi", name: "Tobi", team: "azul", expected: 9000, paid: 9000, goals: 0, assists: 1 },
    { id: "rama", name: "Rama", team: "azul", expected: 9000, paid: 0, goals: 2, assists: 0 },
    { id: "agus", name: "Agus", team: "azul", expected: 9000, paid: 9000, goals: 0, assists: 0 },
    { id: "fran", name: "Fran", team: null, expected: 0, paid: 0, goals: 0, assists: 0 },
    { id: "mati", name: "Mati", team: null, expected: 0, paid: 0, goals: 0, assists: 0 },
  ],
  specialGoals: [],
};
const VARIANTS: Array<{ key: VariantKey; name: string }> = [
  { key: "A", name: "Carga guiada" },
  { key: "B", name: "Mesa de control" },
  { key: "C", name: "Pizarras gemelas" },
];
const STEPS = [
  { label: "Datos", icon: MapPinIcon },
  { label: "Equipos", icon: UsersIcon },
  { label: "Caja", icon: BanknoteIcon },
  { label: "Planilla", icon: GoalIcon },
  { label: "Cierre", icon: ClipboardCheckIcon },
];

function money(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}
function roster(model: MatchModel, team: TeamId) {
  return model.players.filter((player) => player.team === team);
}
function score(model: MatchModel, team: TeamId) {
  return (
    roster(model, team).reduce((sum, player) => sum + player.goals, 0) +
    model.specialGoals.filter((goal) => goal.creditedTeam === team).length
  );
}
function rebalance(players: Player[], cost: number) {
  const selected = players.filter((player) => player.team !== null);
  const count = selected.length;
  const baseShare = count ? Math.floor(cost / count) : 0;
  const remainder = count ? Math.round(cost - baseShare * count) : 0;
  const shareById = new Map(
    selected.map((player, index) => [player.id, baseShare + (index < remainder ? 1 : 0)]),
  );
  return players.map((player) => {
    const expected = shareById.get(player.id) ?? 0;
    return {
      ...player,
      expected,
      paid: player.team ? Math.min(player.paid, expected) : 0,
    };
  });
}
function payState(player: Player) {
  if (!player.paid) return "Pendiente";
  if (player.paid < player.expected) return "Parcial";
  if (player.paid > player.expected) return "De más";
  return "Pagado";
}
function validate(model: MatchModel) {
  const issues: string[] = [];
  const selected = model.players.filter((player) => player.team);
  const assigned = selected.reduce((sum, player) => sum + player.expected, 0);
  if (!model.venueId) issues.push("Elegí una cancha.");
  if (model.cost <= 0) issues.push("Ingresá el costo.");
  if (selected.length < 2) issues.push("Sumá al menos dos jugadores.");
  for (const team of TEAMS) {
    const players = roster(model, team);
    if (!players.length) issues.push(`${model.teams[team].name} no tiene jugadores.`);
    if (!players.some((player) => player.id === model.teams[team].captainId)) {
      issues.push(`${model.teams[team].name} necesita capitán.`);
    }
    if (players.reduce((sum, player) => sum + player.assists, 0) > score(model, team)) {
      issues.push(`${model.teams[team].name} tiene más asistencias que goles.`);
    }
  }
  if (Math.abs(assigned - model.cost) > 1) {
    issues.push(`El prorrateo difiere del costo por ${money(model.cost - assigned)}.`);
  }
  return issues;
}

function useVariantKeys(current: VariantKey, change: (key: VariantKey) => void) {
  useMountEffect(() => {
    function keydown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (
        target?.matches("input, textarea, select, [contenteditable='true']") ||
        !["ArrowLeft", "ArrowRight"].includes(event.key)
      )
        return;
      const index = VARIANTS.findIndex((item) => item.key === current);
      const delta = event.key === "ArrowRight" ? 1 : -1;
      change(VARIANTS[(index + delta + VARIANTS.length) % VARIANTS.length]!.key);
    }
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  });
}

function Switcher({ current, change }: { current: VariantKey; change: (key: VariantKey) => void }) {
  useVariantKeys(current, change);
  if (process.env.NODE_ENV === "production") return null;
  const index = VARIANTS.findIndex((item) => item.key === current);
  const prev = VARIANTS[(index - 1 + VARIANTS.length) % VARIANTS.length]!;
  const next = VARIANTS[(index + 1) % VARIANTS.length]!;
  return (
    <div className="fixed bottom-3 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 border border-border bg-foreground p-1 text-background shadow-2xl">
      <Button
        aria-label="Variante anterior"
        size="icon-sm"
        variant="secondary"
        onClick={() => change(prev.key)}
      >
        <ChevronLeftIcon />
      </Button>
      <p className="min-w-36 px-2 text-center text-xs font-medium">
        {current} — {VARIANTS[index]!.name}
      </p>
      <Button
        aria-label="Variante siguiente"
        size="icon-sm"
        variant="secondary"
        onClick={() => change(next.key)}
      >
        <ChevronRightIcon />
      </Button>
    </div>
  );
}

function Status({ status }: { status: MatchStatus }) {
  if (status === "closed") return <Badge>Cerrado</Badge>;
  if (status === "cancelled") return <Badge variant="destructive">Cancelado</Badge>;
  if (status === "open") return <Badge variant="secondary">Abierto</Badge>;
  return <Badge variant="outline">Sin crear</Badge>;
}

function Score({ model }: { model: MatchModel }) {
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 py-3">
      <p className="truncate text-right text-sm font-semibold">{model.teams.naranja.name}</p>
      <p className="font-mono text-4xl font-black tracking-tighter">
        {score(model, "naranja")}:{score(model, "azul")}
      </p>
      <p className="truncate text-sm font-semibold">{model.teams.azul.name}</p>
    </div>
  );
}

function Facts({ model }: { model: MatchModel }) {
  const venue = VENUES.find((item) => item.id === model.venueId);
  const selected = model.players.filter((player) => player.team);
  return (
    <div className="grid grid-cols-3 gap-2 text-center">
      <div className="border border-border bg-card p-2">
        <MapPinIcon className="mx-auto mb-1 size-4" />
        <p className="truncate text-xs">{venue?.name}</p>
      </div>
      <div className="border border-border bg-card p-2">
        <UsersIcon className="mx-auto mb-1 size-4" />
        <p className="text-xs">{selected.length} juegan</p>
      </div>
      <div className="border border-border bg-card p-2">
        <CircleDollarSignIcon className="mx-auto mb-1 size-4" />
        <p className="truncate text-xs">
          {money(selected.reduce((sum, player) => sum + player.paid, 0))}
        </p>
      </div>
    </div>
  );
}

function MatchData({ model, actions, editable }: SharedProps) {
  const items = VENUES.map((venue) => ({ label: venue.name, value: venue.id }));
  const selectedVenue = VENUES.find((venue) => venue.id === model.venueId);
  return (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor="date">Fecha y hora</FieldLabel>
        <Input
          id="date"
          type="datetime-local"
          value={model.date}
          disabled={!editable}
          onChange={(event) => actions.date(event.target.value)}
        />
      </Field>
      <Field>
        <FieldLabel>Cancha guardada</FieldLabel>
        <Select
          items={items}
          value={model.venueId}
          disabled={!editable}
          onValueChange={(value) => actions.venue(value ?? "")}
        >
          <SelectTrigger className="w-full">
            <SelectValue>
              {(value) => items.find((item) => item.value === value)?.label}
            </SelectValue>
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false}>
            <SelectGroup>
              {VENUES.map((venue) => (
                <SelectItem key={venue.id} value={venue.id}>
                  {venue.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <FieldDescription>{selectedVenue?.address}</FieldDescription>
      </Field>
      <Field>
        <FieldLabel htmlFor="cost">Precio total</FieldLabel>
        <InputGroup>
          <InputGroupAddon>
            <InputGroupText>$</InputGroupText>
          </InputGroupAddon>
          <InputGroupInput
            id="cost"
            type="number"
            value={model.cost}
            disabled={!editable}
            onChange={(event) => actions.cost(Number(event.target.value))}
          />
          <InputGroupAddon align="inline-end">
            <InputGroupText>ARS</InputGroupText>
          </InputGroupAddon>
        </InputGroup>
        <FieldDescription>
          Se divide automáticamente; después podés ajustar excepciones.
        </FieldDescription>
      </Field>
    </FieldGroup>
  );
}

function TeamSettings({ model, actions, editable }: SharedProps) {
  return (
    <div className="flex flex-col gap-4">
      {TEAMS.map((team) => {
        const players = roster(model, team);
        const items = players.map((player) => ({ label: player.name, value: player.id }));
        return (
          <FieldGroup key={team}>
            <Field>
              <FieldLabel htmlFor={`team-${team}`}>Nombre del equipo</FieldLabel>
              <Input
                id={`team-${team}`}
                value={model.teams[team].name}
                disabled={!editable}
                onChange={(event) => actions.teamName(team, event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel>Capitán</FieldLabel>
              <Select
                items={items}
                value={model.teams[team].captainId}
                disabled={!editable || !players.length}
                onValueChange={(value) => actions.captain(team, value ?? "")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {(value) =>
                      items.find((item) => item.value === value)?.label ?? "Elegir capitán"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false}>
                  <SelectGroup>
                    {players.map((player) => (
                      <SelectItem key={player.id} value={player.id}>
                        {player.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
          </FieldGroup>
        );
      })}
    </div>
  );
}

function Players({ model, actions, editable, dense = false }: SharedProps & { dense?: boolean }) {
  const [name, setName] = useState("");
  const [team, setTeam] = useState<TeamId>("naranja");
  function add() {
    const clean = name.trim();
    if (!clean) return;
    actions.addPlayer(clean, team);
    setName("");
  }
  return (
    <div className="flex flex-col gap-4">
      <div className={cn("grid gap-2", dense ? "grid-cols-2" : "grid-cols-1")}>
        {TEAMS.map((targetTeam) => (
          <Card key={targetTeam} size="sm">
            <CardHeader>
              <CardTitle>{model.teams[targetTeam].name}</CardTitle>
              <CardDescription>{roster(model, targetTeam).length} convocados</CardDescription>
            </CardHeader>
            <CardContent>
              <FieldSet>
                <FieldLegend variant="label">Jugadores</FieldLegend>
                <FieldGroup data-slot="checkbox-group" className="gap-3">
                  {model.players.map((player) => {
                    const here = player.team === targetTeam;
                    const elsewhere = player.team !== null && !here;
                    return (
                      <Field
                        key={`${targetTeam}-${player.id}`}
                        orientation="horizontal"
                        data-disabled={elsewhere}
                      >
                        <Checkbox
                          id={`${targetTeam}-${player.id}`}
                          checked={here}
                          disabled={!editable || elsewhere}
                          onCheckedChange={() => actions.togglePlayer(player.id, targetTeam)}
                        />
                        <FieldContent>
                          <FieldLabel htmlFor={`${targetTeam}-${player.id}`}>
                            {player.name}
                            {player.isNew ? <Badge variant="outline">Nuevo</Badge> : null}
                          </FieldLabel>
                        </FieldContent>
                      </Field>
                    );
                  })}
                </FieldGroup>
              </FieldSet>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card size="sm">
        <CardHeader>
          <CardTitle>Jugador nuevo</CardTitle>
          <CardDescription>Se crea como ficha, sin login.</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="new-player">Nombre</FieldLabel>
              <Input
                id="new-player"
                value={name}
                placeholder="Ej. Santi"
                disabled={!editable}
                onChange={(event) => setName(event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel>Equipo</FieldLabel>
              <ToggleGroup
                value={[team]}
                disabled={!editable}
                onValueChange={(values) => {
                  if (values[0]) setTeam(values[0] as TeamId);
                }}
              >
                <ToggleGroupItem value="naranja" variant="outline">
                  Naranja
                </ToggleGroupItem>
                <ToggleGroupItem value="azul" variant="outline">
                  Azul
                </ToggleGroupItem>
              </ToggleGroup>
            </Field>
          </FieldGroup>
        </CardContent>
        <CardFooter>
          <Button className="w-full" disabled={!editable || !name.trim()} onClick={add}>
            <UserPlusIcon data-icon="inline-start" />
            Crear y convocar
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

function Teams({ model, venues, actions, validation, editable }: SharedProps) {
  const props = { model, venues, actions, validation, editable };
  return (
    <div className="flex flex-col gap-4">
      <TeamSettings {...props} />
      <Separator />
      <Players {...props} />
    </div>
  );
}

function Payments({ model, actions, editable }: SharedProps) {
  const selected = model.players.filter((player) => player.team);
  return (
    <div className="flex flex-col gap-2">
      <div className="mb-2 grid grid-cols-3 gap-2 text-center">
        <Card size="sm">
          <CardHeader>
            <CardDescription>Cancha</CardDescription>
            <CardTitle>{money(model.cost)}</CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardDescription>Asignado</CardDescription>
            <CardTitle>
              {money(selected.reduce((sum, player) => sum + player.expected, 0))}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardDescription>Cobrado</CardDescription>
            <CardTitle>{money(selected.reduce((sum, player) => sum + player.paid, 0))}</CardTitle>
          </CardHeader>
        </Card>
      </div>
      {selected.map((player) => (
        <Card key={player.id} size="sm">
          <CardHeader>
            <CardTitle>{player.name}</CardTitle>
            <CardDescription>{model.teams[player.team!].name}</CardDescription>
            <CardAction>
              <Badge variant={payState(player) === "Pendiente" ? "destructive" : "outline"}>
                {payState(player)}
              </Badge>
            </CardAction>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
              <Field>
                <FieldLabel htmlFor={`expected-${player.id}`}>Debe</FieldLabel>
                <Input
                  id={`expected-${player.id}`}
                  type="number"
                  value={player.expected}
                  disabled={!editable}
                  onChange={(event) => actions.expected(player.id, Number(event.target.value))}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={`paid-${player.id}`}>Pagó</FieldLabel>
                <Input
                  id={`paid-${player.id}`}
                  type="number"
                  value={player.paid}
                  disabled={!editable}
                  onChange={(event) => actions.paid(player.id, Number(event.target.value))}
                />
              </Field>
              <Field orientation="horizontal">
                <Checkbox
                  aria-label={`Marcar a ${player.name} como pagado`}
                  checked={player.paid === player.expected}
                  disabled={!editable}
                  onCheckedChange={(checked) => actions.settle(player.id, checked)}
                />
              </Field>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function Counter({
  label,
  value,
  disabled,
  change,
}: {
  label: string;
  value: number;
  disabled: boolean;
  change: (delta: number) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <Button
        size="icon-xs"
        variant="outline"
        disabled={disabled || !value}
        onClick={() => change(-1)}
      >
        <MinusIcon />
      </Button>
      <span className="w-4 text-center font-mono">{value}</span>
      <Button size="icon-xs" variant="outline" disabled={disabled} onClick={() => change(1)}>
        <PlusIcon />
      </Button>
    </div>
  );
}

function Performance({ model, actions, editable }: SharedProps) {
  return (
    <div className="flex flex-col gap-3">
      {TEAMS.map((team) => (
        <Card key={team}>
          <CardHeader>
            <CardTitle>{model.teams[team].name}</CardTitle>
            <CardDescription>{score(model, team)} goles registrados</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              {roster(model, team).map((player) => (
                <div key={player.id} className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold">{player.name}</span>
                  <div className="flex gap-3">
                    <Counter
                      label="G"
                      value={player.goals}
                      disabled={!editable}
                      change={(delta) => actions.stat(player.id, "goals", delta)}
                    />
                    <Counter
                      label="A"
                      value={player.assists}
                      disabled={!editable}
                      change={(delta) => actions.stat(player.id, "assists", delta)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
          <CardFooter className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              disabled={!editable}
              onClick={() => actions.special("unattributed", team)}
            >
              Sin autor
            </Button>
            <Button
              variant="outline"
              disabled={!editable}
              onClick={() => actions.special("own-goal", team)}
            >
              Autogol rival
            </Button>
          </CardFooter>
        </Card>
      ))}
      {model.specialGoals.length ? (
        <Alert>
          <GoalIcon />
          <AlertTitle>Goles especiales: {model.specialGoals.length}</AlertTitle>
          <AlertDescription>
            {model.specialGoals
              .map(
                (goal) =>
                  `${goal.type === "unattributed" ? "sin autor" : "autogol"} → ${model.teams[goal.creditedTeam].name}`,
              )
              .join(" · ")}
          </AlertDescription>
          <Button size="sm" variant="ghost" disabled={!editable} onClick={actions.undoSpecial}>
            Deshacer último
          </Button>
        </Alert>
      ) : null}
    </div>
  );
}

function Lifecycle({ model, actions, validation }: SharedProps) {
  const [confirmCancel, setConfirmCancel] = useState(false);
  const debt = model.players.reduce(
    (sum, player) => sum + (player.team ? Math.max(0, player.expected - player.paid) : 0),
    0,
  );
  return (
    <div className="flex flex-col gap-3">
      {validation.length ? (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertTitle>Falta revisar</AlertTitle>
          <AlertDescription>{validation.join(" ")}</AlertDescription>
        </Alert>
      ) : (
        <Alert>
          <CheckIcon />
          <AlertTitle>Listo para cerrar</AlertTitle>
          <AlertDescription>Resultado y prorrateo consistentes.</AlertDescription>
        </Alert>
      )}
      {debt ? (
        <Alert>
          <CircleDollarSignIcon />
          <AlertTitle>Quedarán deudas por {money(debt)}</AlertTitle>
          <AlertDescription>No bloquean el cierre y siguen visibles.</AlertDescription>
        </Alert>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>Control del organizador</CardTitle>
          <CardDescription>
            Cerrar congela el partido; reabrir habilita correcciones.
          </CardDescription>
          <CardAction>
            <Status status={model.status} />
          </CardAction>
        </CardHeader>
        <CardContent>
          <Score model={model} />
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          {model.status === "setup" ? (
            <Button className="w-full" onClick={actions.createOpen}>
              <CalendarDaysIcon data-icon="inline-start" />
              Crear partido abierto
            </Button>
          ) : null}
          {model.status === "open" ? (
            <Button className="w-full" disabled={!!validation.length} onClick={actions.close}>
              <CheckIcon data-icon="inline-start" />
              Cerrar y publicar estadísticas
            </Button>
          ) : null}
          {model.status === "closed" || model.status === "cancelled" ? (
            <Button className="w-full" variant="outline" onClick={actions.reopen}>
              <RotateCcwIcon data-icon="inline-start" />
              {model.status === "closed" ? "Reabrir para corregir" : "Recuperar como abierto"}
            </Button>
          ) : null}
          {model.status === "open" && !confirmCancel ? (
            <Button className="w-full" variant="destructive" onClick={() => setConfirmCancel(true)}>
              <XIcon data-icon="inline-start" />
              Cancelar partido
            </Button>
          ) : null}
          {model.status === "open" && confirmCancel ? (
            <div className="grid w-full grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => setConfirmCancel(false)}>
                Volver
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  actions.cancel();
                  setConfirmCancel(false);
                }}
              >
                Confirmar
              </Button>
            </div>
          ) : null}
        </CardFooter>
      </Card>
    </div>
  );
}

function StateView({ model }: { model: MatchModel }) {
  return (
    <details className="border border-dashed border-border bg-muted p-3 text-xs">
      <summary className="cursor-pointer font-mono font-semibold">
        Estado completo del prototipo
      </summary>
      <pre className="mt-3 overflow-auto whitespace-pre-wrap text-[10px]">
        {JSON.stringify(
          { ...model, players: model.players.filter((player) => player.team) },
          null,
          2,
        )}
      </pre>
    </details>
  );
}

function VariantA(props: SharedProps) {
  const [step, setStep] = useState(0);
  const current = STEPS[step]!;
  const CurrentIcon = current.icon;
  return (
    <main className="prototype-route prototype-variant-a fixed inset-0 overflow-y-auto bg-background text-foreground">
      <div className="mx-auto min-h-full max-w-md px-4 pb-32 pt-5">
        <header className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="prototype-eyebrow">La planilla · Sábado 20:00</p>
            <h1 className="text-3xl font-black tracking-tight">
              Armá el partido sin olvidarte de nada.
            </h1>
          </div>
          <Status status={props.model.status} />
        </header>
        <div className="mb-5">
          <div className="mb-2 flex justify-between text-xs text-muted-foreground">
            <span>Paso {step + 1} de 5</span>
            <span>{current.label}</span>
          </div>
          <div className="h-1.5 bg-muted">
            <div className="h-full bg-primary" style={{ width: `${((step + 1) / 5) * 100}%` }} />
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CurrentIcon className="size-5" />
              {current.label}
            </CardTitle>
            <CardDescription>
              Una decisión por pantalla; el organizador siempre sabe qué falta.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === 0 ? <MatchData {...props} /> : null}
            {step === 1 ? <Teams {...props} /> : null}
            {step === 2 ? <Payments {...props} /> : null}
            {step === 3 ? <Performance {...props} /> : null}
            {step === 4 ? <Lifecycle {...props} /> : null}
          </CardContent>
        </Card>
        <div className="mt-4">
          <StateView model={props.model} />
        </div>
      </div>
      <div className="fixed inset-x-0 bottom-16 mx-auto flex max-w-md gap-2 border-t border-border bg-background p-3">
        <Button
          className="flex-1"
          variant="outline"
          disabled={!step}
          onClick={() => setStep((value) => value - 1)}
        >
          <ArrowLeftIcon data-icon="inline-start" />
          Atrás
        </Button>
        <Button
          className="flex-1"
          disabled={step === 4}
          onClick={() => setStep((value) => value + 1)}
        >
          Siguiente
          <ArrowRightIcon data-icon="inline-end" />
        </Button>
      </div>
    </main>
  );
}

function VariantB(props: SharedProps) {
  return (
    <main className="prototype-route prototype-variant-b fixed inset-0 overflow-y-auto bg-background text-foreground">
      <div className="mx-auto min-h-full max-w-md pb-28">
        <header className="prototype-score-hero px-4 pb-5 pt-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="prototype-eyebrow">MATCH CONTROL / 001</p>
              <p className="text-xs text-muted-foreground">Sáb 01 Ago · 20:00 · El Galpón</p>
            </div>
            <Status status={props.model.status} />
          </div>
          <Score model={props.model} />
          <Facts model={props.model} />
        </header>
        <Tabs defaultValue="juego" className="px-3 pt-3">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="ficha">Ficha</TabsTrigger>
            <TabsTrigger value="plantel">Plantel</TabsTrigger>
            <TabsTrigger value="caja">Caja</TabsTrigger>
            <TabsTrigger value="juego">Juego</TabsTrigger>
          </TabsList>
          <TabsContent value="ficha" className="pt-3">
            <Card>
              <CardHeader>
                <CardTitle>Ficha del partido</CardTitle>
              </CardHeader>
              <CardContent>
                <MatchData {...props} />
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="plantel" className="pt-3">
            <Teams {...props} />
          </TabsContent>
          <TabsContent value="caja" className="pt-3">
            <Payments {...props} />
          </TabsContent>
          <TabsContent value="juego" className="flex flex-col gap-4 pt-3">
            <Performance {...props} />
            <Lifecycle {...props} />
          </TabsContent>
        </Tabs>
        <div className="px-3 pt-4">
          <StateView model={props.model} />
        </div>
      </div>
    </main>
  );
}

function TeamBoard({ team, model, actions, editable }: SharedProps & { team: TeamId }) {
  const players = roster(model, team);
  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle className="truncate">{model.teams[team].name}</CardTitle>
        <CardDescription>{score(model, team)} goles</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          {players.map((player) => (
            <div
              key={player.id}
              className="flex flex-col gap-2 border-b border-border pb-3 last:border-0"
            >
              <div className="flex items-center justify-between">
                <span className="truncate text-sm font-semibold">{player.name}</span>
                {model.teams[team].captainId === player.id ? (
                  <ShieldIcon className="size-4" />
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <Counter
                  label="G"
                  value={player.goals}
                  disabled={!editable}
                  change={(delta) => actions.stat(player.id, "goals", delta)}
                />
                <Counter
                  label="A"
                  value={player.assists}
                  disabled={!editable}
                  change={(delta) => actions.stat(player.id, "assists", delta)}
                />
              </div>
              <Field>
                <FieldLabel htmlFor={`board-paid-${player.id}`}>
                  Pagó · {payState(player)}
                </FieldLabel>
                <Input
                  id={`board-paid-${player.id}`}
                  type="number"
                  value={player.paid}
                  disabled={!editable}
                  onChange={(event) => actions.paid(player.id, Number(event.target.value))}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={`board-expected-${player.id}`}>Debe</FieldLabel>
                <Input
                  id={`board-expected-${player.id}`}
                  type="number"
                  value={player.expected}
                  disabled={!editable}
                  onChange={(event) => actions.expected(player.id, Number(event.target.value))}
                />
              </Field>
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter className="grid grid-cols-2 gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={!editable}
          onClick={() => actions.special("unattributed", team)}
        >
          Sin autor
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={!editable}
          onClick={() => actions.special("own-goal", team)}
        >
          Autogol
        </Button>
      </CardFooter>
    </Card>
  );
}

function VariantC(props: SharedProps) {
  return (
    <main className="prototype-route prototype-variant-c fixed inset-0 overflow-y-auto bg-background text-foreground">
      <div className="mx-auto min-h-full max-w-lg px-3 pb-28 pt-4">
        <header className="mb-4 border-b-4 border-primary pb-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="prototype-eyebrow">Pizarra del organizador</p>
              <h1 className="text-2xl font-black uppercase">Sábado de fulbo</h1>
            </div>
            <Status status={props.model.status} />
          </div>
          <Score model={props.model} />
        </header>
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Cabecera</CardTitle>
            <CardDescription>Datos comunes antes de cada camiseta.</CardDescription>
          </CardHeader>
          <CardContent>
            <MatchData {...props} />
          </CardContent>
        </Card>
        <section className="mb-4">
          <div className="mb-2 flex items-end justify-between">
            <div>
              <p className="prototype-eyebrow">Dos equipos / una planilla</p>
              <h2 className="text-xl font-black">Todo por camiseta</h2>
            </div>
            <Badge variant="secondary">
              {props.model.players.filter((player) => player.team).length} juegan
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {TEAMS.map((team) => (
              <TeamBoard key={team} team={team} {...props} />
            ))}
          </div>
        </section>
        <Tabs defaultValue="convocados">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="convocados">Convocados</TabsTrigger>
            <TabsTrigger value="capitanes">Capitanes</TabsTrigger>
            <TabsTrigger value="cierre">Cierre</TabsTrigger>
          </TabsList>
          <TabsContent value="convocados" className="pt-3">
            <Players {...props} dense />
          </TabsContent>
          <TabsContent value="capitanes" className="pt-3">
            <Card>
              <CardHeader>
                <CardTitle>Equipos temporales</CardTitle>
              </CardHeader>
              <CardContent>
                <TeamSettings {...props} />
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="cierre" className="pt-3">
            <Lifecycle {...props} />
          </TabsContent>
        </Tabs>
        <div className="mt-4">
          <StateView model={props.model} />
        </div>
      </div>
    </main>
  );
}

export default function MatchEntryPrototype() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const requested = searchParams.get("variant")?.toUpperCase();
  const variant: VariantKey = requested === "B" || requested === "C" ? requested : "A";
  const [model, setModel] = useState(INITIAL);

  function edit(update: (current: MatchModel) => MatchModel) {
    setModel((current) =>
      current.status === "closed" || current.status === "cancelled" ? current : update(current),
    );
  }

  const actions: MatchActions = {
    date: (value) => edit((current) => ({ ...current, date: value })),
    venue: (value) => edit((current) => ({ ...current, venueId: value })),
    cost: (value) =>
      edit((current) => ({ ...current, cost: value, players: rebalance(current.players, value) })),
    teamName: (team, value) =>
      edit((current) => ({
        ...current,
        teams: { ...current.teams, [team]: { ...current.teams[team], name: value } },
      })),
    captain: (team, value) =>
      edit((current) => ({
        ...current,
        teams: { ...current.teams, [team]: { ...current.teams[team], captainId: value } },
      })),
    togglePlayer: (id, team) =>
      edit((current) => {
        const target = current.players.find((player) => player.id === id);
        const nextTeam = target?.team === team ? null : team;
        const players = rebalance(
          current.players.map((player) =>
            player.id === id
              ? {
                  ...player,
                  team: nextTeam,
                  goals: nextTeam ? player.goals : 0,
                  assists: nextTeam ? player.assists : 0,
                }
              : player,
          ),
          current.cost,
        );
        const teams = { ...current.teams };
        for (const teamId of TEAMS) {
          if (
            !players.some(
              (player) => player.id === teams[teamId].captainId && player.team === teamId,
            )
          ) {
            teams[teamId] = {
              ...teams[teamId],
              captainId: players.find((player) => player.team === teamId)?.id ?? "",
            };
          }
        }
        return { ...current, players, teams };
      }),
    addPlayer: (name, team) => {
      edit((current) => ({
        ...current,
        players: rebalance(
          [
            ...current.players,
            {
              id: `${name.toLowerCase().replaceAll(/\s+/g, "-")}-${current.players.length}`,
              name,
              team,
              expected: 0,
              paid: 0,
              goals: 0,
              assists: 0,
              isNew: true,
            },
          ],
          current.cost,
        ),
      }));
      toast.success(`${name} quedó convocado.`);
    },
    expected: (id, value) =>
      edit((current) => ({
        ...current,
        players: current.players.map((player) =>
          player.id === id ? { ...player, expected: Math.max(0, value) } : player,
        ),
      })),
    paid: (id, value) =>
      edit((current) => ({
        ...current,
        players: current.players.map((player) =>
          player.id === id ? { ...player, paid: Math.max(0, value) } : player,
        ),
      })),
    settle: (id, checked) =>
      edit((current) => ({
        ...current,
        players: current.players.map((player) =>
          player.id === id ? { ...player, paid: checked ? player.expected : 0 } : player,
        ),
      })),
    stat: (id, field, delta) =>
      edit((current) => ({
        ...current,
        players: current.players.map((player) =>
          player.id === id ? { ...player, [field]: Math.max(0, player[field] + delta) } : player,
        ),
      })),
    special: (type, creditedTeam) =>
      edit((current) => ({
        ...current,
        specialGoals: [...current.specialGoals, { id: Date.now(), type, creditedTeam }],
      })),
    undoSpecial: () =>
      edit((current) => ({ ...current, specialGoals: current.specialGoals.slice(0, -1) })),
    createOpen: () => {
      setModel((current) => ({ ...current, status: "open" }));
      toast.success("Partido creado y abierto.");
    },
    close: () => {
      if (validate(model).length) return toast.error("Todavía hay datos por revisar.");
      setModel((current) => ({ ...current, status: "closed" }));
      toast.success("Partido cerrado. Las estadísticas ya cuentan.");
    },
    reopen: () => {
      setModel((current) => ({ ...current, status: "open" }));
      toast("Partido reabierto.");
    },
    cancel: () => {
      setModel((current) => ({ ...current, status: "cancelled" }));
      toast("Partido cancelado.");
    },
  };

  const props: SharedProps = {
    model,
    venues: VENUES,
    actions,
    validation: validate(model),
    editable: model.status === "setup" || model.status === "open",
  };
  function change(next: VariantKey) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("variant", next);
    router.replace(`${pathname}?${params}` as Route, { scroll: false });
  }

  return (
    <>
      {variant === "A" ? <VariantA {...props} /> : null}
      {variant === "B" ? <VariantB {...props} /> : null}
      {variant === "C" ? <VariantC {...props} /> : null}
      <Switcher current={variant} change={change} />
    </>
  );
}

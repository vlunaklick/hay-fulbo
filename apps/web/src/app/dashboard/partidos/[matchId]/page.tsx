"use client";

import type { AppRouter } from "@hay-fulbo/api/routers/index";
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
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@hay-fulbo/ui/components/empty";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@hay-fulbo/ui/components/field";
import { Input } from "@hay-fulbo/ui/components/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hay-fulbo/ui/components/select";
import { Separator } from "@hay-fulbo/ui/components/separator";
import { Skeleton } from "@hay-fulbo/ui/components/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@hay-fulbo/ui/components/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@hay-fulbo/ui/components/tabs";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import {
  ArrowLeftIcon,
  CheckCircle2Icon,
  CircleAlertIcon,
  CircleIcon,
  LockKeyholeIcon,
  Maximize2Icon,
  PlusIcon,
  ShieldCheckIcon,
  TrophyIcon,
  UsersRoundIcon,
  WalletCardsIcon,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useId, useState } from "react";
import { toast } from "sonner";

import { useAppContext } from "@/components/app-shell";
import { MatchAttendancePanel } from "@/components/match-attendance-panel";
import { MatchParityCard } from "@/components/match-parity-card";
import { MatchResultCard } from "@/components/match-result-card";
import { formatDate, formatMoney, toMinor } from "@/lib/format";
import { queryClient, trpc } from "@/utils/trpc";

type Outputs = inferRouterOutputs<AppRouter>;
type Inputs = inferRouterInputs<AppRouter>;
type Detail = Outputs["matches"]["detail"];
type Directory = Outputs["matches"]["directory"];
type ExecuteInput = Inputs["matches"]["execute"];

const closureText = {
  match_not_started: "La hora del partido todavía no pasó.",
  court_required: "Falta elegir una cancha.",
  court_cost_required: "Falta el precio total de la cancha.",
  invalid_team_slots: "Los dos equipos no están completos.",
  team_without_players: "Cada equipo necesita al menos un jugador.",
  negative_sporting_total: "Goles y asistencias deben ser positivos.",
  assists_exceed_attributed_goals: "Hay más asistencias que goles atribuidos.",
  expected_total_mismatch: "El reparto no coincide con el total de la cancha.",
} as const;

export default function MatchPage() {
  const { matchId } = useParams<{ matchId: string }>();
  const detail = useQuery(trpc.matches.detail.queryOptions({ matchId }));
  const directory = useQuery(trpc.matches.directory.queryOptions());

  if (detail.isPending || directory.isPending) {
    return (
      <div className="flex flex-col gap-5">
        <Skeleton className="h-11 w-28" />
        <Skeleton className="h-52 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }
  if (detail.isError || directory.isError) {
    return (
      <Alert variant="destructive">
        <CircleAlertIcon aria-hidden="true" />
        <AlertTitle>No pudimos abrir el partido</AlertTitle>
        <AlertDescription>{detail.error?.message ?? directory.error?.message}</AlertDescription>
      </Alert>
    );
  }

  return (
    <MatchControl key={detail.data.lockVersion} detail={detail.data} directory={directory.data} />
  );
}

function MatchControl({ detail, directory }: { detail: Detail; directory: Directory }) {
  const { groupName, role, user } = useAppContext();
  const isOrganizer = detail.organizerUserId === user.id || role !== "member";
  const isOpen = detail.status === "open";
  const issues = closureIssues(detail);
  const execute = useMutation(
    trpc.matches.execute.mutationOptions({
      onSuccess: () => {
        toast.success("Partido actualizado");
        queryClient.invalidateQueries({
          queryKey: trpc.matches.detail.queryKey({ matchId: detail.id }),
        });
        queryClient.invalidateQueries({ queryKey: trpc.matches.list.queryKey() });
        queryClient.invalidateQueries({ queryKey: trpc.matches.directory.queryKey() });
      },
      onError: (cause) => toast.error(cause.message),
    }),
  );
  const run = (command: ExecuteInput) => execute.mutate(command);
  const court = directory.courts.find((item) => item.id === detail.courtId);

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center justify-between gap-4">
        <Button
          variant="ghost"
          size="sm"
          render={<Link href="/dashboard/partidos" />}
          nativeButton={false}
        >
          <ArrowLeftIcon data-icon="inline-start" aria-hidden="true" />
          Partidos
        </Button>
        <div className="flex items-center gap-2">
          {isOpen ? (
            <Button
              render={<Link href={`/dashboard/partidos/${detail.id}/cancha` as Route} />}
              nativeButton={false}
              size="sm"
              variant="outline"
            >
              <Maximize2Icon data-icon="inline-start" aria-hidden="true" />
              Modo cancha
            </Button>
          ) : null}
          <Badge
            variant={
              detail.status === "cancelled"
                ? "destructive"
                : detail.status === "closed"
                  ? "secondary"
                  : "outline"
            }
          >
            {detail.status === "open"
              ? "Abierto"
              : detail.status === "closed"
                ? "Cerrado"
                : "Cancelado"}
          </Badge>
        </div>
      </header>

      <Card size="sm">
        <CardHeader className="items-center">
          <CardTitle>{formatDate(detail.scheduledAt)}</CardTitle>
          <CardDescription className="flex flex-wrap items-center gap-2">
            <span>{court?.name ?? "Cancha a definir"}</span>
            <span aria-hidden="true">·</span>
            <span>{formatMoney(detail.courtCostMinor)}</span>
          </CardDescription>
          <CardAction className="flex items-center gap-3 self-center">
            <div className="flex min-w-0 items-center gap-2">
              <span className="hidden max-w-24 truncate text-xs font-medium sm:block">
                {detail.teams[0]?.displayName}
              </span>
              <strong className="text-3xl font-bold tabular-nums">
                {scoreFor(detail, detail.teams[0]?.id)}
              </strong>
            </div>
            <span className="text-muted-foreground">—</span>
            <div className="flex min-w-0 items-center gap-2">
              <strong className="text-3xl font-bold tabular-nums">
                {scoreFor(detail, detail.teams[1]?.id)}
              </strong>
              <span className="hidden max-w-24 truncate text-xs font-medium sm:block">
                {detail.teams[1]?.displayName}
              </span>
            </div>
          </CardAction>
        </CardHeader>
        <div className="sr-only">
          {detail.teams[0]?.displayName} <span>{scoreFor(detail, detail.teams[0]?.id)}</span> a{" "}
          <span>{scoreFor(detail, detail.teams[1]?.id)}</span> {detail.teams[1]?.displayName}
        </div>
      </Card>

      <MatchAttendancePanel
        key={`attendance-${detail.lockVersion}`}
        canEdit={isOrganizer && isOpen}
        court={court ? { address: court.address, mapsUrl: court.mapsUrl, name: court.name } : null}
        currency="ARS"
        detail={detail}
        groupName={groupName}
        onCapacityChange={(capacity) =>
          run({
            capacity,
            expectedLockVersion: detail.lockVersion,
            matchId: detail.id,
            type: "updateMatch",
          })
        }
        pending={execute.isPending}
        timeZone="America/Argentina/Buenos_Aires"
      />

      {detail.status === "closed" && detail.teams.length >= 2 ? (
        <MatchResultCard
          dateLabel={formatDate(detail.scheduledAt)}
          groupName={groupName}
          left={{
            goals: scoreFor(detail, detail.teams[0]?.id),
            name: detail.teams[0]?.displayName ?? "Equipo 1",
          }}
          matchId={detail.id}
          right={{
            goals: scoreFor(detail, detail.teams[1]?.id),
            name: detail.teams[1]?.displayName ?? "Equipo 2",
          }}
        />
      ) : null}

      {detail.status === "open" && detail.teams.length >= 2 ? (
        <MatchParityCard matchId={detail.id} />
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1fr_17rem]">
        <Tabs defaultValue="sheet">
          <TabsList className="grid h-10 w-full grid-cols-5 lg:grid-cols-4">
            <TabsTrigger value="sheet">Ficha</TabsTrigger>
            <TabsTrigger value="squad">Plantel</TabsTrigger>
            <TabsTrigger value="payments">Caja</TabsTrigger>
            <TabsTrigger value="game">Juego</TabsTrigger>
            <TabsTrigger value="closure" className="lg:hidden">
              Cierre
            </TabsTrigger>
          </TabsList>
          <TabsContent value="sheet">
            <MatchSheet
              detail={detail}
              directory={directory}
              editable={isOrganizer && isOpen}
              pending={execute.isPending}
              run={run}
            />
          </TabsContent>
          <TabsContent value="squad">
            <Squads
              detail={detail}
              directory={directory}
              manager={isOrganizer}
              userId={user.id}
              pending={execute.isPending}
              run={run}
            />
          </TabsContent>
          <TabsContent value="payments">
            <Payments
              detail={detail}
              manager={isOrganizer}
              userId={user.id}
              pending={execute.isPending}
              run={run}
            />
          </TabsContent>
          <TabsContent value="game">
            <Game
              detail={detail}
              manager={isOrganizer}
              userId={user.id}
              pending={execute.isPending}
              run={run}
            />
          </TabsContent>
          <TabsContent value="closure" className="lg:hidden">
            <ClosurePanel
              detail={detail}
              issues={issues}
              isOrganizer={isOrganizer}
              pending={execute.isPending}
              run={run}
            />
          </TabsContent>
        </Tabs>

        <aside className="hidden flex-col gap-4 lg:flex">
          <ClosurePanel
            detail={detail}
            issues={issues}
            isOrganizer={isOrganizer}
            pending={execute.isPending}
            run={run}
          />
        </aside>
      </div>
    </div>
  );
}

function ClosurePanel({
  detail,
  issues,
  isOrganizer,
  pending,
  run,
}: {
  detail: Detail;
  issues: (keyof typeof closureText)[];
  isOrganizer: boolean;
  pending: boolean;
  run: (command: ExecuteInput) => void;
}) {
  const ready = issues.length === 0;
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{ready ? "Listo para cerrar" : "Antes de cerrar"}</CardTitle>
        <CardDescription>
          {ready ? "La ficha está completa." : "Falta completar estos puntos."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {ready ? (
          <div className="flex items-start gap-2 text-sm">
            <CheckCircle2Icon className="text-primary" aria-hidden="true" />
            Resultado, plantel y caja consistentes.
          </div>
        ) : (
          issues.map((issue) => (
            <div key={issue} className="flex items-start gap-2 text-xs text-muted-foreground">
              <CircleIcon aria-hidden="true" />
              {closureText[issue]}
            </div>
          ))
        )}
        {isOrganizer && detail.status === "open" ? (
          <Button
            disabled={!ready || pending}
            onClick={() =>
              run({
                type: "closeMatch",
                matchId: detail.id,
                expectedLockVersion: detail.lockVersion,
              })
            }
          >
            <LockKeyholeIcon data-icon="inline-start" aria-hidden="true" />
            Cerrar partido
          </Button>
        ) : null}
        {isOrganizer && detail.status === "closed" ? (
          <ReasonAction
            label="Reabrir partido"
            description="Indicá por qué vuelve a edición."
            pending={pending}
            onConfirm={(reason) =>
              run({
                type: "reopenMatch",
                matchId: detail.id,
                expectedLockVersion: detail.lockVersion,
                reason,
              })
            }
          />
        ) : null}
        {isOrganizer && detail.status === "open" ? (
          <ReasonAction
            label="Cancelar partido"
            description="La información queda visible, sin poder editarse."
            pending={pending}
            destructive
            onConfirm={(reason) =>
              run({
                type: "cancelMatch",
                matchId: detail.id,
                expectedLockVersion: detail.lockVersion,
                reason,
              })
            }
          />
        ) : null}
      </CardContent>
    </Card>
  );
}

function MatchSheet({
  detail,
  directory,
  editable,
  pending,
  run,
}: {
  detail: Detail;
  directory: Directory;
  editable: boolean;
  pending: boolean;
  run: (command: ExecuteInput) => void;
}) {
  const localDate = new Date(
    new Date(detail.scheduledAt).getTime() -
      new Date(detail.scheduledAt).getTimezoneOffset() * 60_000,
  )
    .toISOString()
    .slice(0, 16);
  const [scheduledAt, setScheduledAt] = useState(localDate);
  const [courtId, setCourtId] = useState<string | null>(detail.courtId);
  const [cost, setCost] = useState(
    detail.courtCostMinor === null ? "" : String(Number(detail.courtCostMinor) / 100),
  );
  const [teamOne, setTeamOne] = useState(detail.teams[0]?.displayName ?? "");
  const [teamTwo, setTeamTwo] = useState(detail.teams[1]?.displayName ?? "");
  const [error, setError] = useState<string | null>(null);
  const courtItems = [
    { label: "A definir", value: null },
    ...directory.courts
      .filter((court) => !court.archivedAt || court.id === detail.courtId)
      .map((court) => ({ label: court.name, value: court.id })),
  ];

  function save() {
    const courtCostMinor = cost.trim() ? toMinor(cost) : null;
    if (cost.trim() && courtCostMinor === null) return setError("Ingresá un precio válido.");
    run({
      type: "updateMatch",
      matchId: detail.id,
      expectedLockVersion: detail.lockVersion,
      scheduledAt: new Date(scheduledAt),
      courtId,
      courtCostMinor,
    });
  }

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Ficha del partido</CardTitle>
        <CardDescription>Fecha, cancha, precio y nombres temporales.</CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup className="gap-4">
          <FieldGroup className="grid gap-4 md:grid-cols-3">
            <Field>
              <FieldLabel htmlFor="match-date">Fecha y hora</FieldLabel>
              <Input
                id="match-date"
                type="datetime-local"
                value={scheduledAt}
                disabled={!editable}
                onChange={(event) => setScheduledAt(event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="match-court">Cancha</FieldLabel>
              <Select
                items={courtItems}
                value={courtId}
                disabled={!editable}
                onValueChange={setCourtId}
              >
                <SelectTrigger id="match-court" className="w-full">
                  <SelectValue>
                    {courtItems.find((item) => item.value === courtId)?.label ?? "A definir"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {courtItems.map((item) => (
                      <SelectItem key={item.value ?? "no-court"} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="match-cost">Precio total</FieldLabel>
              <Input
                id="match-cost"
                inputMode="decimal"
                value={cost}
                disabled={!editable}
                onChange={(event) => setCost(event.target.value)}
              />
            </Field>
          </FieldGroup>
          <FieldGroup className="grid gap-4 sm:grid-cols-2">
            <TeamName
              id="team-one-name"
              team={detail.teams[0]}
              value={teamOne}
              setValue={setTeamOne}
              editable={editable}
              pending={pending}
              detail={detail}
              run={run}
            />
            <TeamName
              id="team-two-name"
              team={detail.teams[1]}
              value={teamTwo}
              setValue={setTeamTwo}
              editable={editable}
              pending={pending}
              detail={detail}
              run={run}
            />
          </FieldGroup>
          <FieldError>{error}</FieldError>
          {!editable ? (
            <FieldDescription>La ficha está disponible en modo consulta.</FieldDescription>
          ) : null}
        </FieldGroup>
      </CardContent>
      {editable ? (
        <CardFooter className="justify-end">
          <Button variant="outline" disabled={pending} onClick={save}>
            Guardar ficha
          </Button>
        </CardFooter>
      ) : null}
    </Card>
  );
}

function TeamName({
  id,
  team,
  value,
  setValue,
  editable,
  pending,
  detail,
  run,
}: {
  id: string;
  team: Detail["teams"][number] | undefined;
  value: string;
  setValue: (value: string) => void;
  editable: boolean;
  pending: boolean;
  detail: Detail;
  run: (command: ExecuteInput) => void;
}) {
  if (!team) return null;
  return (
    <Field>
      <FieldLabel htmlFor={id}>Nombre del equipo</FieldLabel>
      <Input
        id={id}
        value={value}
        disabled={!editable}
        onChange={(event) => setValue(event.target.value)}
      />
      {editable && value !== team.displayName ? (
        <Button
          variant="ghost"
          size="sm"
          disabled={pending || !value.trim()}
          onClick={() =>
            run({
              type: "updateTeam",
              matchId: detail.id,
              expectedLockVersion: detail.lockVersion,
              teamId: team.id,
              displayName: value,
            })
          }
        >
          Aplicar nombre
        </Button>
      ) : null}
    </Field>
  );
}

function Squads({
  detail,
  directory,
  manager,
  userId,
  pending,
  run,
}: {
  detail: Detail;
  directory: Directory;
  manager: boolean;
  userId: string;
  pending: boolean;
  run: (command: ExecuteInput) => void;
}) {
  const assigned = new Set(
    detail.teams.flatMap((team) => team.appearances.map((row) => row.playerId)),
  );
  const available = directory.players.filter(
    (player) => !player.archivedAt && !assigned.has(player.id),
  );
  const isOrganizer = manager || detail.organizerUserId === userId;

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {detail.teams.map((team) => {
        const canEdit = detail.status === "open" && (isOrganizer || team.captainUserId === userId);
        return (
          <TeamSquad
            key={team.id}
            team={team}
            detail={detail}
            directory={directory}
            available={available}
            isOrganizer={isOrganizer}
            canEdit={canEdit}
            pending={pending}
            run={run}
          />
        );
      })}
    </div>
  );
}

function TeamSquad({
  team,
  detail,
  directory,
  available,
  isOrganizer,
  canEdit,
  pending,
  run,
}: {
  team: Detail["teams"][number];
  detail: Detail;
  directory: Directory;
  available: Directory["players"];
  isOrganizer: boolean;
  canEdit: boolean;
  pending: boolean;
  run: (command: ExecuteInput) => void;
}) {
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const captainItems = [
    { label: "Sin capitán", value: null },
    ...directory.members.map((member) => ({ label: member.name, value: member.id })),
  ];
  const playerItems = available.map((player) => ({
    label: player.displayName,
    value: player.id,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{team.displayName}</CardTitle>
        <CardDescription>
          {team.appearances.length} {team.appearances.length === 1 ? "jugador" : "jugadores"}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {isOrganizer ? (
          <Field>
            <FieldLabel htmlFor={`captain-${team.id}`}>Capitán</FieldLabel>
            <Select
              items={captainItems}
              value={team.captainUserId}
              disabled={detail.status !== "open" || pending}
              onValueChange={(captainUserId) =>
                run({
                  type: "setCaptain",
                  matchId: detail.id,
                  expectedLockVersion: detail.lockVersion,
                  teamId: team.id,
                  captainUserId,
                })
              }
            >
              <SelectTrigger id={`captain-${team.id}`} className="w-full">
                <SelectValue>
                  {captainItems.find((item) => item.value === team.captainUserId)?.label ??
                    "Sin capitán"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {captainItems.map((item) => (
                    <SelectItem key={item.value ?? "no-captain"} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
        ) : team.captainUserId ? (
          <Badge variant="outline">
            <ShieldCheckIcon aria-hidden="true" />
            Capitán asignado
          </Badge>
        ) : null}

        {team.appearances.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <UsersRoundIcon aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>Equipo vacío</EmptyTitle>
              <EmptyDescription>Sumá al menos un jugador para poder cerrar.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="flex flex-col gap-2">
            {team.appearances.map((appearance) => (
              <div
                key={appearance.playerId}
                className="flex min-h-11 items-center justify-between gap-3 rounded-md border px-3"
              >
                <span className="truncate text-sm font-medium">{appearance.playerDisplayName}</span>
                {canEdit ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={pending}
                    onClick={() =>
                      run({
                        type: "removeParticipant",
                        matchId: detail.id,
                        expectedLockVersion: detail.lockVersion,
                        playerId: appearance.playerId,
                      })
                    }
                  >
                    Sacar
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
        )}

        {canEdit ? (
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={`existing-${team.id}`}>Jugador existente</FieldLabel>
              <Select items={playerItems} value={playerId} onValueChange={setPlayerId}>
                <SelectTrigger id={`existing-${team.id}`} className="w-full">
                  <SelectValue placeholder="Elegir jugador">
                    {playerItems.find((item) => item.value === playerId)?.label}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {playerItems.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                disabled={!playerId || pending}
                onClick={() => {
                  if (!playerId) return;
                  run({
                    type: "addParticipant",
                    matchId: detail.id,
                    expectedLockVersion: detail.lockVersion,
                    teamId: team.id,
                    playerId,
                  });
                }}
              >
                Sumar al equipo
              </Button>
            </Field>
            <Field>
              <FieldLabel htmlFor={`new-${team.id}`}>Jugador nuevo</FieldLabel>
              <Input
                id={`new-${team.id}`}
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                placeholder="Nombre"
              />
              <Button
                variant="outline"
                disabled={!newName.trim() || pending}
                onClick={() =>
                  run({
                    type: "createAndAddParticipant",
                    matchId: detail.id,
                    expectedLockVersion: detail.lockVersion,
                    teamId: team.id,
                    displayName: newName,
                  })
                }
              >
                <PlusIcon data-icon="inline-start" aria-hidden="true" />
                Crear y sumar
              </Button>
            </Field>
          </FieldGroup>
        ) : null}
      </CardContent>
    </Card>
  );
}

function Payments({
  detail,
  manager,
  userId,
  pending,
  run,
}: {
  detail: Detail;
  manager: boolean;
  userId: string;
  pending: boolean;
  run: (command: ExecuteInput) => void;
}) {
  const rows = detail.teams.flatMap((team) =>
    team.appearances.map((appearance) => ({
      ...appearance,
      teamName: team.displayName,
      editable:
        detail.status !== "cancelled" &&
        (manager || detail.organizerUserId === userId || team.captainUserId === userId),
    })),
  );
  if (!rows.length) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <WalletCardsIcon aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>La caja todavía está vacía</EmptyTitle>
          <EmptyDescription>Primero sumá jugadores al plantel.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Pagos de cancha</CardTitle>
        <CardDescription>
          El reparto automático se recalcula cuando cambia el plantel o el precio.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Jugador</TableHead>
              <TableHead>Debe</TableHead>
              <TableHead>Pagó</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <PaymentRow
                key={row.playerId}
                detail={detail}
                row={row}
                pending={pending}
                run={run}
              />
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function PaymentRow({
  detail,
  row,
  pending,
  run,
}: {
  detail: Detail;
  row: Detail["teams"][number]["appearances"][number] & {
    teamName: string;
    editable: boolean;
  };
  pending: boolean;
  run: (command: ExecuteInput) => void;
}) {
  const [paid, setPaid] = useState(String(Number(row.paidMinor) / 100));
  const paidMinor = toMinor(paid);
  return (
    <TableRow>
      <TableCell>
        <div className="flex flex-col">
          <span className="font-medium">{row.playerDisplayName}</span>
          <span className="text-xs text-muted-foreground">{row.teamName}</span>
        </div>
      </TableCell>
      <TableCell>{formatMoney(row.expectedMinor)}</TableCell>
      <TableCell>
        {row.editable ? (
          <Input
            aria-label={`Pago de ${row.playerDisplayName}`}
            inputMode="decimal"
            value={paid}
            onChange={(event) => setPaid(event.target.value)}
            className="min-w-28"
          />
        ) : (
          formatMoney(row.paidMinor)
        )}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Badge
            variant={
              row.contributionStatus === "paid" || row.contributionStatus === "overpaid"
                ? "secondary"
                : "outline"
            }
          >
            {paymentLabel(row.contributionStatus)}
          </Badge>
          {row.editable ? (
            <Button
              variant="ghost"
              size="sm"
              disabled={paidMinor === null || pending}
              onClick={() =>
                paidMinor !== null &&
                run({
                  type: "updatePaid",
                  matchId: detail.id,
                  expectedLockVersion: detail.lockVersion,
                  playerId: row.playerId,
                  paidMinor,
                })
              }
            >
              Guardar
            </Button>
          ) : null}
        </div>
      </TableCell>
    </TableRow>
  );
}

function Game({
  detail,
  manager,
  userId,
  pending,
  run,
}: {
  detail: Detail;
  manager: boolean;
  userId: string;
  pending: boolean;
  run: (command: ExecuteInput) => void;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {detail.teams.map((team) => (
        <TeamGame
          key={team.id}
          detail={detail}
          team={team}
          editable={
            detail.status === "open" &&
            (manager || detail.organizerUserId === userId || team.captainUserId === userId)
          }
          pending={pending}
          run={run}
        />
      ))}
    </div>
  );
}

function TeamGame({
  detail,
  team,
  editable,
  pending,
  run,
}: {
  detail: Detail;
  team: Detail["teams"][number];
  editable: boolean;
  pending: boolean;
  run: (command: ExecuteInput) => void;
}) {
  const [unattributed, setUnattributed] = useState(String(team.unattributedGoals));

  if (!editable) {
    return <CompactTeamGame detail={detail} team={team} />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-3">
          <span>{team.displayName}</span>
          <Badge variant="secondary">{scoreFor(detail, team.id)} goles</Badge>
        </CardTitle>
        <CardDescription>Goles, asistencias y goles en contra.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {team.appearances.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <TrophyIcon aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>Sin jugadores</EmptyTitle>
              <EmptyDescription>Sumalos desde Plantel.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          team.appearances.map((appearance) => (
            <AppearanceRow
              key={appearance.playerId}
              detail={detail}
              appearance={appearance}
              editable={editable}
              pending={pending}
              run={run}
            />
          ))
        )}
        <Field>
          <FieldLabel htmlFor={`unattributed-${team.id}`}>Goles sin atribuir</FieldLabel>
          <Input
            id={`unattributed-${team.id}`}
            type="number"
            min={0}
            value={unattributed}
            disabled={!editable}
            onChange={(event) => setUnattributed(event.target.value)}
          />
          {editable ? (
            <Button
              variant="outline"
              disabled={pending}
              onClick={() =>
                run({
                  type: "setUnattributedGoals",
                  matchId: detail.id,
                  expectedLockVersion: detail.lockVersion,
                  teamId: team.id,
                  goals: safeTotal(unattributed),
                })
              }
            >
              Guardar sin atribuir
            </Button>
          ) : null}
        </Field>
      </CardContent>
    </Card>
  );
}

function CompactTeamGame({ detail, team }: { detail: Detail; team: Detail["teams"][number] }) {
  return (
    <Card role="region" aria-label={`Resultados de ${team.displayName}`}>
      <CardHeader className="flex-row items-center justify-between gap-3">
        <CardTitle>{team.displayName}</CardTitle>
        <Badge variant="secondary">{scoreFor(detail, team.id)} goles</Badge>
      </CardHeader>
      <CardContent>
        {team.appearances.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <TrophyIcon aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>Sin jugadores</EmptyTitle>
              <EmptyDescription>Este equipo no tuvo actuaciones cargadas.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ul className="flex flex-col divide-y">
            {team.appearances.map((appearance) => (
              <li
                key={appearance.playerId}
                className="grid min-h-10 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-2"
              >
                <span className="truncate text-sm font-medium">{appearance.playerDisplayName}</span>
                <dl
                  className="grid grid-cols-3 gap-3 text-right"
                  aria-label={`Estadísticas de ${appearance.playerDisplayName}`}
                >
                  <div className="flex items-baseline gap-1">
                    <dt className="text-xs text-muted-foreground">G</dt>
                    <dd className="font-semibold tabular-nums">{appearance.goals}</dd>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <dt className="text-xs text-muted-foreground">A</dt>
                    <dd className="font-semibold tabular-nums">{appearance.assists}</dd>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <dt className="text-xs text-muted-foreground">AG</dt>
                    <dd className="font-semibold tabular-nums">{appearance.ownGoals}</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        )}
        {team.unattributedGoals > 0 ? (
          <>
            <Separator />
            <div className="flex min-h-10 items-center justify-between gap-3 py-2 text-sm">
              <span className="text-muted-foreground">Goles sin autor</span>
              <Badge variant="outline">{team.unattributedGoals}</Badge>
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}

function AppearanceRow({
  detail,
  appearance,
  editable,
  pending,
  run,
}: {
  detail: Detail;
  appearance: Detail["teams"][number]["appearances"][number];
  editable: boolean;
  pending: boolean;
  run: (command: ExecuteInput) => void;
}) {
  const [goals, setGoals] = useState(String(appearance.goals));
  const [assists, setAssists] = useState(String(appearance.assists));
  const [ownGoals, setOwnGoals] = useState(String(appearance.ownGoals));
  return (
    <div className="flex flex-col gap-3 rounded-md border p-3">
      <strong className="text-sm">{appearance.playerDisplayName}</strong>
      <div className="grid grid-cols-3 gap-2">
        <StatField label="Goles" value={goals} setValue={setGoals} disabled={!editable} />
        <StatField label="Asist." value={assists} setValue={setAssists} disabled={!editable} />
        <StatField label="En contra" value={ownGoals} setValue={setOwnGoals} disabled={!editable} />
      </div>
      {editable ? (
        <Button
          variant="outline"
          disabled={pending}
          onClick={() =>
            run({
              type: "updateAppearance",
              matchId: detail.id,
              expectedLockVersion: detail.lockVersion,
              playerId: appearance.playerId,
              goals: safeTotal(goals),
              assists: safeTotal(assists),
              ownGoals: safeTotal(ownGoals),
            })
          }
        >
          Guardar números
        </Button>
      ) : null}
    </div>
  );
}

function StatField({
  label,
  value,
  setValue,
  disabled,
}: {
  label: string;
  value: string;
  setValue: (value: string) => void;
  disabled: boolean;
}) {
  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <Input
        type="number"
        min={0}
        value={value}
        disabled={disabled}
        onChange={(event) => setValue(event.target.value)}
      />
    </Field>
  );
}

function ReasonAction({
  label,
  description,
  pending,
  destructive = false,
  onConfirm,
}: {
  label: string;
  description: string;
  pending: boolean;
  destructive?: boolean;
  onConfirm: (reason: string) => void;
}) {
  const reasonId = useId();
  const [reason, setReason] = useState("");
  return (
    <Dialog>
      <DialogTrigger render={<Button variant={destructive ? "destructive" : "outline"} />}>
        {label}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor={reasonId}>Motivo</FieldLabel>
            <Input
              id={reasonId}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Contale al grupo qué cambió"
            />
          </Field>
          <Button
            variant={destructive ? "destructive" : "outline"}
            disabled={!reason.trim() || pending}
            onClick={() => onConfirm(reason)}
          >
            Confirmar
          </Button>
        </FieldGroup>
      </DialogContent>
    </Dialog>
  );
}

function scoreFor(detail: Detail, teamId?: string) {
  return detail.score.find((item) => item.teamId === teamId)?.goals ?? 0;
}

function safeTotal(value: string) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
}

function paymentLabel(
  status: Detail["teams"][number]["appearances"][number]["contributionStatus"],
) {
  return {
    exempt: "Exento",
    pending: "Pendiente",
    partial: "Parcial",
    paid: "Pagado",
    overpaid: "De más",
  }[status];
}

function closureIssues(detail: Detail): (keyof typeof closureText)[] {
  const issues: (keyof typeof closureText)[] = [];
  if (new Date(detail.scheduledAt).getTime() > Date.now()) issues.push("match_not_started");
  if (!detail.courtId) issues.push("court_required");
  if (detail.courtCostMinor === null) issues.push("court_cost_required");
  if (detail.teams.length !== 2) issues.push("invalid_team_slots");
  if (detail.teams.some((team) => team.appearances.length === 0)) {
    issues.push("team_without_players");
  }
  if (
    detail.teams.some(
      (team) =>
        team.appearances.reduce((sum, row) => sum + row.assists, 0) >
        team.unattributedGoals + team.appearances.reduce((sum, row) => sum + row.goals, 0),
    )
  ) {
    issues.push("assists_exceed_attributed_goals");
  }
  if (
    detail.courtCostMinor !== null &&
    detail.teams
      .flatMap((team) => team.appearances)
      .reduce((sum, row) => sum + BigInt(row.expectedMinor), 0n) !== BigInt(detail.courtCostMinor)
  ) {
    issues.push("expected_total_mismatch");
  }
  return issues;
}

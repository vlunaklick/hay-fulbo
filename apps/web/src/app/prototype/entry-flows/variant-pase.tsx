"use client";

// PROTOTYPE ONLY — "Pase": the destination leads as a pass-like block, the
// action lives in a bar pinned to the thumb on mobile. Desktop splits into
// context (left) and action (right).

import { Alert, AlertDescription } from "@hay-fulbo/ui/components/alert";
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
} from "@hay-fulbo/ui/components/avatar";
import { Badge } from "@hay-fulbo/ui/components/badge";
import { Button } from "@hay-fulbo/ui/components/button";
import { Card, CardContent } from "@hay-fulbo/ui/components/card";
import { Field, FieldLabel } from "@hay-fulbo/ui/components/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hay-fulbo/ui/components/select";
import { Separator } from "@hay-fulbo/ui/components/separator";
import { Spinner } from "@hay-fulbo/ui/components/spinner";
import {
  ArrowRightIcon,
  CalendarPlusIcon,
  CheckIcon,
  LinkIcon,
  MapPinIcon,
  MessageCircleIcon,
  XIcon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { LoginForm } from "./login-form";
import {
  addToCalendar,
  Brand,
  capitalize,
  formatDayMonth,
  formatTime,
  formatWeekday,
  group,
  match,
  openWhatsApp,
  perPlayer,
  unavailableCopy,
  useFakeAccept,
  useFakeLogin,
  useFakeRsvp,
  user,
  type VariantProps,
} from "./shared";

export function PaseVariant({ screen, state }: VariantProps) {
  if (screen === "login") return <PaseLogin context={state === "con-contexto"} />;
  if (state === "no-disponible") return <PaseUnavailable screen={screen} />;
  if (screen === "jugar") return <PaseMatch status={state} />;
  return <PaseGroup kind={screen} fails={state === "falla"} />;
}

function Frame({
  context,
  action,
  bar,
}: {
  context: React.ReactNode;
  action?: React.ReactNode;
  bar?: React.ReactNode;
}) {
  return (
    <main className="min-h-svh px-4 pt-6 pb-48 sm:pt-10 lg:px-8 lg:pb-16">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6 lg:max-w-5xl lg:gap-12">
        <Brand />
        <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-start lg:gap-12">
          <div className="flex flex-col gap-4">{context}</div>
          {action || bar ? (
            <div className="flex flex-col gap-6 lg:sticky lg:top-10">
              {action}
              {bar ? (
                <div className="fixed inset-x-0 bottom-0 z-10 border-t bg-background px-4 pt-3 pb-[max(env(safe-area-inset-bottom),1rem)] lg:static lg:border-0 lg:bg-transparent lg:p-0">
                  <div className="mx-auto flex max-w-md flex-col gap-2 lg:max-w-none">{bar}</div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}

function GroupMark({ size = "lg" }: { size?: "lg" | "xl" }) {
  return (
    <Avatar className={size === "xl" ? "size-14" : "size-10"}>
      <AvatarFallback className="bg-secondary text-base font-bold text-foreground">
        {group.initials}
      </AvatarFallback>
    </Avatar>
  );
}

// ---------- /jugar ----------

function PaseMatch({ status }: { status: string }) {
  const rsvp = useFakeRsvp();
  const [playerId, setPlayerId] = useState<string | null>(null);
  const selected = rsvp.players.find((player) => player.id === playerId) ?? null;
  const isJoined = selected?.joinedOrder != null;
  const open = status === "abierta";
  const options = rsvp.players.map((player) => ({ label: player.displayName, value: player.id }));
  const shown = rsvp.joined.slice(0, 5);

  const context = (
    <>
      <Card className="rounded-xl">
        <CardContent className="flex flex-col gap-5">
          <div className="flex items-start justify-between gap-3">
            <p className="line-clamp-2 text-sm text-muted-foreground">{group.name}</p>
            <Badge
              variant={open ? "outline" : status === "cancelada" ? "destructive" : "secondary"}
            >
              {open ? "Convocatoria abierta" : status === "cancelada" ? "Cancelado" : "Cerrado"}
            </Badge>
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-xl font-bold text-balance">
              {capitalize(formatWeekday(match.scheduledAt))} {formatDayMonth(match.scheduledAt)}
            </p>
            <p className="text-6xl leading-none font-black tracking-tight tabular-nums">
              {formatTime(match.scheduledAt)}
            </p>
          </div>
          <div className="flex items-start gap-3">
            <MapPinIcon className="mt-0.5 size-4 text-muted-foreground" aria-hidden="true" />
            <div className="min-w-0 text-sm">
              <a
                className="font-semibold underline-offset-4 hover:underline"
                href={match.court.mapsUrl}
                target="_blank"
                rel="noreferrer"
              >
                {match.court.name}
              </a>
              <p className="text-muted-foreground">{match.court.address}</p>
            </div>
          </div>
          <Separator />
          <dl className="grid grid-cols-2 divide-x">
            <div className="flex flex-col gap-1 pr-4">
              <dt className="text-xs font-medium text-muted-foreground">Anotados</dt>
              <dd className="flex items-center gap-2">
                <span className="text-lg font-semibold tabular-nums">{rsvp.joined.length}</span>
                <AvatarGroup>
                  {shown.map((player) => (
                    <Avatar key={player.id} size="sm">
                      <AvatarFallback>{player.displayName.charAt(0)}</AvatarFallback>
                    </Avatar>
                  ))}
                  {rsvp.joined.length > shown.length ? (
                    <AvatarGroupCount className="text-xs">
                      +{rsvp.joined.length - shown.length}
                    </AvatarGroupCount>
                  ) : null}
                </AvatarGroup>
              </dd>
            </div>
            <div className="flex flex-col gap-1 pl-4">
              <dt className="text-xs font-medium text-muted-foreground">Estimado por jugador</dt>
              <dd className="text-lg font-semibold tabular-nums">
                {status === "cancelada" ? "Sin aportes" : perPlayer(rsvp.joined.length)}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
      <div className="flex flex-wrap gap-x-2 gap-y-1">
        <Button size="sm" variant="ghost" onClick={() => openWhatsApp(rsvp.joined)}>
          <MessageCircleIcon data-icon="inline-start" aria-hidden="true" />
          Compartir
        </Button>
        <Button size="sm" variant="ghost" disabled={!open} onClick={addToCalendar}>
          <CalendarPlusIcon data-icon="inline-start" aria-hidden="true" />
          Agregar al calendario
        </Button>
      </div>
    </>
  );

  if (!open) {
    return (
      <Frame
        context={context}
        action={
          <Alert variant={status === "cancelada" ? "destructive" : "default"}>
            <AlertDescription>
              {status === "cancelada"
                ? "Este partido no se va a jugar. Ya no se pueden sumar jugadores."
                : "El organizador cerró el partido. La convocatoria ya terminó."}
            </AlertDescription>
          </Alert>
        }
      />
    );
  }

  return (
    <Frame
      context={context}
      action={
        <div className="hidden flex-col gap-1 lg:flex">
          <h2 className="text-lg font-semibold">¿Jugás?</h2>
          <p className="text-sm text-muted-foreground">
            Elegí tu nombre y anotate. No necesitás una cuenta.
          </p>
        </div>
      }
      bar={
        <>
          <Field>
            <FieldLabel htmlFor="pase-player" className="sr-only lg:not-sr-only">
              Tu nombre
            </FieldLabel>
            <Select items={options} value={playerId} onValueChange={setPlayerId}>
              <SelectTrigger id="pase-player" className="w-full text-base md:text-sm">
                <SelectValue placeholder="¿Quién sos? Elegí tu nombre">
                  {selected?.displayName}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {rsvp.players.map((player) => (
                    <SelectItem key={player.id} value={player.id}>
                      {player.displayName}
                      {player.joinedOrder != null ? " · Anotado" : ""}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          {isJoined ? (
            <div className="grid grid-cols-[1fr_auto] items-center gap-2">
              <p className="flex items-center gap-2 text-sm font-medium">
                <CheckIcon className="size-4 text-success" aria-hidden="true" />
                Estás anotado
              </p>
              <Button
                variant="ghost"
                disabled={rsvp.pending !== null}
                onClick={() => selected && rsvp.answer(selected.id, false)}
              >
                {rsvp.pending === "leave" ? (
                  <Spinner data-icon="inline-start" />
                ) : (
                  <XIcon data-icon="inline-start" aria-hidden="true" />
                )}
                Bajarme
              </Button>
            </div>
          ) : (
            <Button
              disabled={!selected || rsvp.pending !== null}
              onClick={() => selected && rsvp.answer(selected.id, true)}
            >
              {rsvp.pending === "join" ? <Spinner data-icon="inline-start" /> : null}
              {rsvp.pending === "join" ? "Anotándote…" : "Me sumo"}
            </Button>
          )}
        </>
      }
    />
  );
}

// ---------- /invitaciones and /sumarse ----------

function PaseGroup({ kind, fails }: { kind: "invitacion" | "sumarse"; fails: boolean }) {
  const isInvite = kind === "invitacion";
  const accept = useFakeAccept({ fails, success: `Ya sos parte de ${group.name}` });

  const context = (
    <>
      <p className="text-sm font-medium text-muted-foreground">
        {isInvite ? `${group.organizer} te invitó a` : "Te pasaron el link de"}
      </p>
      <Card className="rounded-xl">
        <CardContent className="flex flex-col gap-5">
          <div className="flex items-center gap-4">
            <GroupMark size="xl" />
            <div className="flex min-w-0 flex-col gap-1">
              <h1 className="text-2xl font-bold tracking-tight text-balance">{group.name}</h1>
              <p className="text-sm text-muted-foreground">
                Organiza {group.organizer} · {group.members} jugadores · {group.matches} partidos
              </p>
            </div>
          </div>
          <Separator />
          <ul className="flex flex-col gap-3 text-sm">
            <li className="flex gap-3">
              <CheckIcon className="mt-0.5 size-4 shrink-0 text-primary-text" aria-hidden="true" />
              <span>
                {isInvite ? (
                  <>
                    Tu cuenta queda vinculada a tu jugador{" "}
                    <strong className="font-semibold">{user.playerName}</strong>.
                  </>
                ) : (
                  "Entrás como miembro del grupo."
                )}
              </span>
            </li>
            <li className="flex gap-3">
              <CheckIcon className="mt-0.5 size-4 shrink-0 text-primary-text" aria-hidden="true" />
              <span>Ves los partidos, las cuentas y las estadísticas del grupo.</span>
            </li>
            {!isInvite ? (
              <li className="flex gap-3">
                <CheckIcon
                  className="mt-0.5 size-4 shrink-0 text-primary-text"
                  aria-hidden="true"
                />
                <span>Después el organizador te vincula con tu jugador.</span>
              </li>
            ) : null}
          </ul>
        </CardContent>
      </Card>
    </>
  );

  return (
    <Frame
      context={context}
      action={
        accept.error ? (
          <Alert id="pase-accept-error" variant="destructive">
            <AlertDescription>{accept.error}</AlertDescription>
          </Alert>
        ) : null
      }
      bar={
        <>
          {accept.done ? (
            <Button onClick={() => toast("Acá iríamos al grupo")}>
              Ir al grupo
              <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
            </Button>
          ) : (
            <Button
              aria-describedby={accept.error ? "pase-accept-error" : undefined}
              disabled={accept.pending}
              onClick={accept.accept}
            >
              {accept.pending ? <Spinner data-icon="inline-start" /> : null}
              {accept.pending
                ? isInvite
                  ? "Aceptando…"
                  : "Sumándote…"
                : isInvite
                  ? "Aceptar invitación"
                  : "Sumarme al grupo"}
              {accept.pending ? null : <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />}
            </Button>
          )}
          <p className="truncate text-center text-xs text-muted-foreground lg:text-left">
            Como {user.email} ·{" "}
            <button
              type="button"
              className="font-medium text-foreground underline underline-offset-4"
              onClick={() => toast("Acá cerraríamos sesión y volveríamos a /login")}
            >
              Cambiar
            </button>
          </p>
        </>
      }
    />
  );
}

// ---------- /login ----------

function PaseLogin({ context }: { context: boolean }) {
  const login = useFakeLogin(context);
  return (
    <Frame
      context={
        context ? (
          <>
            <p className="text-sm font-medium text-muted-foreground">Para sumarte a</p>
            <Card className="rounded-xl">
              <CardContent className="flex items-center gap-4">
                <GroupMark size="xl" />
                <div className="flex min-w-0 flex-col gap-1">
                  <p className="text-lg font-bold text-balance">{group.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {group.members} jugadores · organiza {group.organizer}
                  </p>
                </div>
              </CardContent>
            </Card>
            <p className="text-sm text-muted-foreground">
              Entrá o creá tu cuenta. Después volvés directo a este grupo.
            </p>
          </>
        ) : (
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-balance sm:text-3xl lg:text-5xl">
              El partido, bajo control.
            </h1>
            <p className="max-w-[45ch] text-sm leading-relaxed text-muted-foreground text-pretty sm:text-base">
              Armá equipos, cerrá el resultado y dejá las cuentas claras desde cualquier pantalla.
            </p>
          </div>
        )
      }
      action={
        <Card className="lg:rounded-xl">
          <CardContent>
            <LoginForm login={login} idPrefix="pase" />
          </CardContent>
        </Card>
      }
    />
  );
}

// ---------- unavailable ----------

function PaseUnavailable({ screen }: { screen: "jugar" | "sumarse" | "invitacion" }) {
  const copy = unavailableCopy[screen];
  return (
    <main className="min-h-svh px-4 pt-6 pb-16 sm:pt-10">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <Brand />
        <Card className="rounded-xl border border-dashed bg-transparent ring-0">
          <CardContent className="flex flex-col gap-4">
            <LinkIcon className="size-5 text-muted-foreground" aria-hidden="true" />
            <div className="flex flex-col gap-2">
              <h1 className="text-xl font-bold text-balance">{copy.title}</h1>
              <p className="text-sm text-muted-foreground text-pretty">{copy.body}</p>
            </div>
            <Button variant="secondary" onClick={() => toast("Acá iríamos al inicio")}>
              Ir al inicio
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

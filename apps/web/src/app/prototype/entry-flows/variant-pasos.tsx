"use client";

// PROTOTYPE ONLY — "Paso a paso": one question per screen. The match RSVP is
// "who are you?" → "are you playing?" → "done", with the roster as big tappable
// rows instead of a select. Login asks the method first, then the form.

import { Alert, AlertDescription } from "@hay-fulbo/ui/components/alert";
import { Avatar, AvatarFallback } from "@hay-fulbo/ui/components/avatar";
import { Badge } from "@hay-fulbo/ui/components/badge";
import { Button } from "@hay-fulbo/ui/components/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@hay-fulbo/ui/components/collapsible";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@hay-fulbo/ui/components/field";
import { Input } from "@hay-fulbo/ui/components/input";
import { Spinner } from "@hay-fulbo/ui/components/spinner";
import { cn } from "@hay-fulbo/ui/lib/utils";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CalendarPlusIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  LinkIcon,
  MailIcon,
  MessageCircleIcon,
  NavigationIcon,
  SearchIcon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  addToCalendar,
  Brand,
  capitalize,
  firstName,
  formatDay,
  formatShortDate,
  formatTime,
  formatWeekday,
  GoogleIcon,
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

const enter =
  "animate-in fade-in slide-in-from-bottom-2 duration-200 ease-out motion-reduce:animate-none";

export function PasosVariant({ screen, state }: VariantProps) {
  if (screen === "login") return <PasosLogin context={state === "con-contexto"} />;
  if (state === "no-disponible") return <PasosUnavailable screen={screen} />;
  if (screen === "jugar") return <PasosMatch status={state} />;
  return <PasosGroup kind={screen} fails={state === "falla"} />;
}

function Frame({ children, top }: { children: React.ReactNode; top?: React.ReactNode }) {
  return (
    <main className="min-h-svh px-4 pt-6 pb-16 sm:pt-12">
      <div className="mx-auto flex w-full max-w-md flex-col gap-8">
        <div className="flex items-center justify-between gap-3">
          <Brand />
        </div>
        {top}
        {children}
      </div>
    </main>
  );
}

function Question({ title, hint }: { title: React.ReactNode; hint?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-3xl font-bold tracking-tight text-balance">{title}</h1>
      {hint ? <p className="text-base text-muted-foreground text-pretty">{hint}</p> : null}
    </div>
  );
}

function Back({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <Button variant="ghost" size="sm" className="-ml-3 self-start" onClick={onClick}>
      <ArrowLeftIcon data-icon="inline-start" aria-hidden="true" />
      {children}
    </Button>
  );
}

function Done({
  title,
  hint,
  children,
}: {
  title: React.ReactNode;
  hint?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <section className={cn("flex flex-col gap-8", enter)}>
      <div className="flex flex-col gap-5">
        <span className="flex size-14 items-center justify-center rounded-full bg-success/10 text-success">
          <CheckIcon className="size-7" aria-hidden="true" />
        </span>
        <Question title={title} hint={hint} />
      </div>
      {children ? <div className="flex flex-col gap-2">{children}</div> : null}
    </section>
  );
}

// ---------- /jugar ----------

function MatchSummary({ playing, status }: { playing: number; status: string }) {
  return (
    <Collapsible className="flex flex-col gap-3 border-b pb-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="truncate text-sm text-muted-foreground">{group.name}</p>
          <p className="text-base font-semibold">
            {capitalize(formatShortDate(match.scheduledAt))} · {formatTime(match.scheduledAt)} ·{" "}
            {match.court.name}
          </p>
        </div>
        <CollapsibleTrigger
          render={<Button variant="ghost" size="sm" className="-mr-3 shrink-0" />}
        >
          Detalles
          <ChevronDownIcon data-icon="inline-end" aria-hidden="true" />
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-muted-foreground">Dirección</dt>
          <dd>
            <a
              className="font-medium underline underline-offset-4"
              href={match.court.mapsUrl}
              target="_blank"
              rel="noreferrer"
            >
              {match.court.address}
            </a>
          </dd>
          <dt className="text-muted-foreground">Anotados</dt>
          <dd className="tabular-nums">{playing}</dd>
          <dt className="text-muted-foreground">Por jugador</dt>
          <dd className="tabular-nums">
            {status === "cancelada" ? "Sin aportes" : `${perPlayer(playing)} estimado`}
          </dd>
        </dl>
      </CollapsibleContent>
    </Collapsible>
  );
}

function PasosMatch({ status }: { status: string }) {
  const rsvp = useFakeRsvp();
  const [step, setStep] = useState<"who" | "answer" | "done">("who");
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [lastAnswer, setLastAnswer] = useState<"in" | "out" | "stay" | "no">("in");
  const [query, setQuery] = useState("");
  const selected = rsvp.players.find((player) => player.id === playerId) ?? null;
  const joinedIndex = selected ? rsvp.joined.findIndex((p) => p.id === selected.id) : -1;
  const day = `${formatWeekday(match.scheduledAt)} ${formatDay(match.scheduledAt)}`;
  const top = <MatchSummary playing={rsvp.joined.length} status={status} />;

  if (status !== "abierta") {
    const cancelled = status === "cancelada";
    return (
      <Frame top={top}>
        <Question
          title={cancelled ? "Este partido se suspendió" : "La convocatoria ya terminó"}
          hint={
            cancelled
              ? "No se va a jugar y no genera aportes. Esperá la próxima convocatoria."
              : `El organizador cerró el partido con ${rsvp.joined.length} jugadores.`
          }
        />
        <Button variant="secondary" onClick={() => openWhatsApp(rsvp.joined)}>
          <MessageCircleIcon data-icon="inline-start" aria-hidden="true" />
          Avisar en el grupo
        </Button>
      </Frame>
    );
  }

  async function answer(join: boolean) {
    if (!selected) return;
    const wasJoined = selected.joinedOrder != null;
    if (join === wasJoined) {
      setLastAnswer(join ? "stay" : "no");
      setStep("done");
      return;
    }
    await rsvp.answer(selected.id, join);
    setLastAnswer(join ? "in" : "out");
    setStep("done");
  }

  if (step === "done" && selected) {
    const name = firstName(selected.displayName);
    return (
      <Frame top={top}>
        <Done
          title={
            lastAnswer === "in" || lastAnswer === "stay"
              ? `Listo, ${name}. Estás anotado.`
              : lastAnswer === "out"
                ? `Listo, ${name}. Te bajaste.`
                : `Ok, ${name}. No te anotamos.`
          }
          hint={
            lastAnswer === "in" || lastAnswer === "stay"
              ? `Sos el ${joinedIndex + 1}° de ${rsvp.joined.length}. El ${day} a las ${formatTime(match.scheduledAt)} en ${match.court.name}.`
              : "Si cambia algo, volvé a este link y anotate."
          }
        >
          {lastAnswer === "in" || lastAnswer === "stay" ? (
            <>
              <Button onClick={addToCalendar}>
                <CalendarPlusIcon data-icon="inline-start" aria-hidden="true" />
                Agregar al calendario
              </Button>
              <Button
                variant="secondary"
                render={<a href={match.court.mapsUrl} target="_blank" rel="noreferrer" />}
                nativeButton={false}
              >
                <NavigationIcon data-icon="inline-start" aria-hidden="true" />
                Cómo llegar
              </Button>
            </>
          ) : null}
          <Button variant="ghost" onClick={() => openWhatsApp(rsvp.joined)}>
            <MessageCircleIcon data-icon="inline-start" aria-hidden="true" />
            Compartir la lista
          </Button>
          <Button variant="link" className="self-start px-0" onClick={() => setStep("answer")}>
            Cambiar mi respuesta
          </Button>
        </Done>
      </Frame>
    );
  }

  if (step === "answer" && selected) {
    const isJoined = selected.joinedOrder != null;
    const name = firstName(selected.displayName);
    return (
      <Frame top={top}>
        <section className={cn("flex flex-col gap-8", enter)} key={selected.id}>
          <div className="flex flex-col gap-4">
            <Back onClick={() => setStep("who")}>No soy {name}</Back>
            <Question
              title={isJoined ? `${name}, ya estás anotado.` : `${name}, ¿jugás el ${day}?`}
              hint={
                isJoined
                  ? `Sos el ${joinedIndex + 1}° de la lista. ¿Seguís jugando?`
                  : `Ya son ${rsvp.joined.length}. Con vos, el estimado baja a ${perPlayer(rsvp.joined.length + 1)} por cabeza.`
              }
            />
          </div>
          <div className="flex flex-col gap-2">
            <Button size="lg" disabled={rsvp.pending !== null} onClick={() => answer(true)}>
              {rsvp.pending === "join" ? <Spinner data-icon="inline-start" /> : null}
              {isJoined ? "Sigo jugando" : rsvp.pending === "join" ? "Anotándote…" : "Sí, me sumo"}
            </Button>
            <Button
              size="lg"
              variant={isJoined ? "destructive" : "outline"}
              disabled={rsvp.pending !== null}
              onClick={() => answer(false)}
            >
              {rsvp.pending === "leave" ? <Spinner data-icon="inline-start" /> : null}
              {isJoined ? (rsvp.pending === "leave" ? "Bajándote…" : "Me bajo") : "No puedo"}
            </Button>
          </div>
        </section>
      </Frame>
    );
  }

  const normalized = query.trim().toLowerCase();
  const filtered = rsvp.players.filter((player) =>
    player.displayName.toLowerCase().includes(normalized),
  );

  return (
    <Frame top={top}>
      <section className={cn("flex flex-col gap-6", enter)}>
        <Question title="¿Quién sos?" hint="Tocá tu nombre. No necesitás una cuenta." />
        <div className="flex flex-col gap-3">
          <div className="relative">
            <label htmlFor="pasos-search" className="sr-only">
              Buscar tu nombre
            </label>
            <SearchIcon
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="pasos-search"
              type="search"
              autoComplete="off"
              className="pl-9 text-base md:text-sm"
              placeholder="Buscar"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          {filtered.length === 0 ? (
            <p className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
              No hay nadie con “{query}”. Si no estás en la lista, pedile al organizador que te
              agregue.
            </p>
          ) : (
            <ul className="flex flex-col divide-y overflow-hidden rounded-lg ring-1 ring-foreground/10">
              {filtered.map((player) => (
                <li key={player.id}>
                  <button
                    type="button"
                    className="flex min-h-14 w-full items-center gap-3 bg-card px-4 text-left transition-colors duration-150 ease-out outline-none hover:bg-muted focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset active:bg-muted"
                    onClick={() => {
                      setPlayerId(player.id);
                      setStep("answer");
                    }}
                  >
                    <Avatar size="sm">
                      <AvatarFallback>{player.displayName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="min-w-0 flex-1 text-base font-medium">
                      {player.displayName}
                    </span>
                    {player.joinedOrder != null ? <Badge variant="secondary">Anotado</Badge> : null}
                    <ChevronRightIcon
                      className="size-4 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </Frame>
  );
}

// ---------- /invitaciones and /sumarse ----------

function PasosGroup({ kind, fails }: { kind: "invitacion" | "sumarse"; fails: boolean }) {
  const isInvite = kind === "invitacion";
  const accept = useFakeAccept({ fails, success: `Ya sos parte de ${group.name}` });

  if (accept.done) {
    return (
      <Frame>
        <Done
          title={`Ya sos parte de ${group.name}.`}
          hint={
            isInvite
              ? `Tu cuenta quedó vinculada a ${user.playerName}.`
              : "Cuando el organizador te vincule con tu jugador, vas a ver tus estadísticas."
          }
        >
          <Button onClick={() => toast("Acá iríamos al grupo")}>
            Ir al grupo
            <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
          </Button>
        </Done>
      </Frame>
    );
  }

  return (
    <Frame>
      <section className={cn("flex flex-col gap-8", enter)}>
        <Question
          title={
            isInvite ? `${group.organizer} te invitó a ${group.name}` : `Sumate a ${group.name}`
          }
          hint={
            isInvite
              ? `Vas a quedar vinculado a tu jugador, ${user.playerName}, y ver partidos, cuentas y estadísticas del grupo.`
              : "Entrás como miembro. Después el organizador te vincula con tu jugador."
          }
        />
        <div className="flex flex-col gap-3">
          {accept.error ? (
            <Alert id="pasos-accept-error" variant="destructive">
              <AlertDescription>{accept.error}</AlertDescription>
            </Alert>
          ) : null}
          <Button
            size="lg"
            aria-describedby={accept.error ? "pasos-accept-error" : undefined}
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
                : "Sumarme"}
          </Button>
          <p className="text-sm text-muted-foreground">
            <span className="block truncate">Entrás como {user.email}.</span>
            <button
              type="button"
              className="font-medium text-foreground underline underline-offset-4"
              onClick={() => toast("Acá cerraríamos sesión y volveríamos a /login")}
            >
              No soy yo
            </button>
          </p>
        </div>
      </section>
    </Frame>
  );
}

// ---------- /login ----------

function PasosLogin({ context }: { context: boolean }) {
  const login = useFakeLogin(context);
  const [step, setStep] = useState<"method" | "email">("method");
  const signup = login.mode === "signup";

  if (step === "email") {
    return (
      <Frame>
        <section className={cn("flex flex-col gap-6", enter)}>
          <div className="flex flex-col gap-4">
            <Back onClick={() => setStep("method")}>Otras formas de entrar</Back>
            <Question title={signup ? "Creá tu cuenta" : "Entrá con tu email"} />
          </div>
          <form onSubmit={login.submit} noValidate>
            <FieldGroup>
              {signup ? (
                <Field>
                  <FieldLabel htmlFor="pasos-name">Nombre</FieldLabel>
                  <Input
                    id="pasos-name"
                    autoComplete="name"
                    className="text-base md:text-sm"
                    aria-invalid={Boolean(login.message) && login.name.trim().length < 2}
                    aria-describedby={login.message ? "pasos-login-error" : undefined}
                    value={login.name}
                    onChange={(event) => login.setName(event.target.value)}
                  />
                </Field>
              ) : null}
              <Field>
                <FieldLabel htmlFor="pasos-email">Email</FieldLabel>
                <Input
                  id="pasos-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  className="text-base md:text-sm"
                  aria-invalid={Boolean(login.message) && !login.email.includes("@")}
                  aria-describedby={login.message ? "pasos-login-error" : undefined}
                  placeholder="vos@ejemplo.com"
                  value={login.email}
                  onChange={(event) => login.setEmail(event.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="pasos-password">Contraseña</FieldLabel>
                <Input
                  id="pasos-password"
                  type="password"
                  className="text-base md:text-sm"
                  autoComplete={signup ? "new-password" : "current-password"}
                  aria-invalid={Boolean(login.message) && login.password.length < 8}
                  aria-describedby={login.message ? "pasos-login-error" : "pasos-password-help"}
                  value={login.password}
                  onChange={(event) => login.setPassword(event.target.value)}
                />
                <FieldDescription id="pasos-password-help">Mínimo 8 caracteres.</FieldDescription>
              </Field>
              <FieldError id="pasos-login-error" role="alert">
                {login.message}
              </FieldError>
              <Button type="submit" size="lg" disabled={login.submitting}>
                {login.submitting ? <Spinner data-icon="inline-start" /> : null}
                {login.submitting ? "Entrando…" : signup ? "Crear cuenta" : "Entrar"}
              </Button>
            </FieldGroup>
          </form>
          <p className="text-sm text-muted-foreground">
            {signup ? "¿Ya tenés cuenta? " : "¿Primera vez? "}
            <button
              type="button"
              className="font-medium text-foreground underline underline-offset-4"
              onClick={() => login.switchMode(signup ? "signin" : "signup")}
            >
              {signup ? "Entrá" : "Creá tu cuenta"}
            </button>
          </p>
        </section>
      </Frame>
    );
  }

  return (
    <Frame>
      <section className={cn("flex flex-col gap-8", enter)}>
        <Question
          title={context ? `Entrá para sumarte a ${group.name}` : "Entrá a Hay Fulbo"}
          hint={
            context
              ? "Después de entrar volvés directo al grupo."
              : "Armá equipos, cerrá el resultado y dejá las cuentas claras."
          }
        />
        <div className="flex flex-col gap-2">
          <Button size="lg" variant="outline" onClick={login.startGoogle} disabled={login.google}>
            {login.google ? <Spinner data-icon="inline-start" /> : <GoogleIcon />}
            {login.google ? "Abriendo Google…" : "Continuar con Google"}
          </Button>
          <Button size="lg" variant="outline" onClick={() => setStep("email")}>
            <MailIcon data-icon="inline-start" aria-hidden="true" />
            Seguir con mi email
          </Button>
        </div>
      </section>
    </Frame>
  );
}

// ---------- unavailable ----------

function PasosUnavailable({ screen }: { screen: "jugar" | "sumarse" | "invitacion" }) {
  const copy = unavailableCopy[screen];
  return (
    <Frame>
      <section className={cn("flex flex-col gap-8", enter)}>
        <div className="flex flex-col gap-5">
          <span className="flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <LinkIcon className="size-6" aria-hidden="true" />
          </span>
          <Question title={copy.title} hint={copy.body} />
        </div>
        <Button variant="secondary" size="lg" onClick={() => toast("Acá iríamos al inicio")}>
          Ir al inicio
        </Button>
      </section>
    </Frame>
  );
}

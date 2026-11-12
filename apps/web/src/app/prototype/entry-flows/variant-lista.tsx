"use client";

// PROTOTYPE ONLY — "La lista": the numbered WhatsApp list is the interface.
// On /jugar you tap your own name in the list and confirm in a pinned bar; on
// group invites you see the roster you're about to join and where you fit.

import { Alert, AlertDescription } from "@hay-fulbo/ui/components/alert";
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
} from "@hay-fulbo/ui/components/avatar";
import { Badge } from "@hay-fulbo/ui/components/badge";
import { Button } from "@hay-fulbo/ui/components/button";
import { Spinner } from "@hay-fulbo/ui/components/spinner";
import { cn } from "@hay-fulbo/ui/lib/utils";
import {
  CalendarPlusIcon,
  CheckIcon,
  CopyIcon,
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
  firstName,
  formatShortDate,
  formatTime,
  group,
  initialPlayers,
  match,
  openWhatsApp,
  perPlayer,
  type Player,
  shareText,
  unavailableCopy,
  useFakeAccept,
  useFakeLogin,
  useFakeRsvp,
  user,
  type VariantProps,
} from "./shared";

export function ListaVariant({ screen, state }: VariantProps) {
  if (screen === "login") return <ListaLogin context={state === "con-contexto"} />;
  if (state === "no-disponible") return <ListaUnavailable screen={screen} />;
  if (screen === "jugar") return <ListaMatch status={state} />;
  return <ListaGroup kind={screen} fails={state === "falla"} />;
}

function Bar({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-10 border-t bg-background px-4 pt-3 pb-[max(env(safe-area-inset-bottom),1rem)] lg:static lg:border-0 lg:bg-transparent lg:p-0">
      <div className="mx-auto flex max-w-md flex-col gap-2 lg:max-w-none">{children}</div>
    </div>
  );
}

function Row({
  index,
  name,
  selected,
  onClick,
  trailing,
  muted,
}: {
  index?: number;
  name: string;
  selected?: boolean;
  onClick?: () => void;
  trailing?: React.ReactNode;
  muted?: boolean;
}) {
  const content = (
    <>
      <span
        className={cn(
          "w-6 shrink-0 text-right text-sm tabular-nums",
          selected ? "text-primary-text" : "text-muted-foreground",
        )}
      >
        {index != null ? `${index}.` : "·"}
      </span>
      <span
        className={cn(
          "min-w-0 flex-1 text-base",
          selected ? "font-semibold" : "font-medium",
          muted && "text-muted-foreground",
        )}
      >
        {name}
      </span>
      {trailing}
      {selected ? <CheckIcon className="size-4 text-primary-text" aria-hidden="true" /> : null}
    </>
  );
  const className = cn(
    "flex min-h-12 w-full items-center gap-3 px-3 text-left",
    selected && "bg-accent shadow-[inset_3px_0_0_var(--primary)]",
  );
  if (!onClick) return <div className={className}>{content}</div>;
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        className,
        "transition-colors duration-150 ease-out outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset",
      )}
    >
      {content}
    </button>
  );
}

function CopyListButton({ joined }: { joined: Player[] }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      size="sm"
      variant="ghost"
      className="-mr-3"
      onClick={async () => {
        await navigator.clipboard?.writeText(shareText(joined)).catch(() => undefined);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? (
        <CheckIcon data-icon="inline-start" aria-hidden="true" />
      ) : (
        <CopyIcon data-icon="inline-start" aria-hidden="true" />
      )}
      {copied ? "Copiada" : "Copiar lista"}
    </Button>
  );
}

// ---------- /jugar ----------

function ListaMatch({ status }: { status: string }) {
  const rsvp = useFakeRsvp();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const open = status === "abierta";
  const selected = rsvp.players.find((player) => player.id === selectedId) ?? null;
  const selectedJoined = selected?.joinedOrder != null;

  function toggle(id: string) {
    setSelectedId((current) => (current === id ? null : id));
  }

  async function confirm() {
    if (!selected) return;
    await rsvp.answer(selected.id, !selectedJoined);
    setSelectedId(null);
  }

  const header = (
    <header className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="min-w-0 text-sm text-muted-foreground">{group.name}</p>
        {open ? null : (
          <Badge variant={status === "cancelada" ? "destructive" : "secondary"}>
            {status === "cancelada" ? "Cancelado" : "Cerrado"}
          </Badge>
        )}
      </div>
      <h1 className="text-3xl font-bold tracking-tight tabular-nums">
        {capitalize(formatShortDate(match.scheduledAt))} · {formatTime(match.scheduledAt)}
      </h1>
      <div className="flex flex-col gap-1 text-sm">
        <a
          className="flex items-center gap-2 font-medium underline-offset-4 hover:underline"
          href={match.court.mapsUrl}
          target="_blank"
          rel="noreferrer"
        >
          <MapPinIcon className="size-4 text-muted-foreground" aria-hidden="true" />
          {match.court.name}
          <span className="truncate font-normal text-muted-foreground">{match.court.address}</span>
        </a>
        <p className="text-muted-foreground">
          {status === "cancelada" ? (
            "Sin aportes"
          ) : (
            <>
              <span className="font-medium text-foreground tabular-nums">
                {perPlayer(rsvp.joined.length)}
              </span>{" "}
              estimado por jugador
            </>
          )}
        </p>
      </div>
      <div className="flex flex-wrap gap-x-1 lg:flex-col lg:items-start">
        <Button
          size="sm"
          variant="ghost"
          className="-ml-3"
          onClick={() => openWhatsApp(rsvp.joined)}
        >
          <MessageCircleIcon data-icon="inline-start" aria-hidden="true" />
          Compartir
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="-ml-3 lg:ml-[-0.75rem]"
          disabled={!open}
          onClick={addToCalendar}
        >
          <CalendarPlusIcon data-icon="inline-start" aria-hidden="true" />
          Calendario
        </Button>
      </div>
    </header>
  );

  const action = !open ? (
    <Alert variant={status === "cancelada" ? "destructive" : "default"}>
      <AlertDescription>
        {status === "cancelada"
          ? "Este partido no se va a jugar. La lista quedó como estaba."
          : "El organizador cerró el partido. Esta es la lista final."}
      </AlertDescription>
    </Alert>
  ) : (
    <Bar>
      {selected ? (
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <Button
            variant={selectedJoined ? "destructive" : "default"}
            disabled={rsvp.pending !== null}
            onClick={confirm}
            className="min-w-0"
          >
            {rsvp.pending ? <Spinner data-icon="inline-start" /> : null}
            <span className="truncate">
              {selectedJoined
                ? `Bajar a ${firstName(selected.displayName)} de la lista`
                : `Anotar a ${firstName(selected.displayName)}`}
            </span>
          </Button>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Deshacer selección"
            onClick={() => setSelectedId(null)}
          >
            <XIcon aria-hidden="true" />
          </Button>
        </div>
      ) : (
        <p className="flex min-h-11 items-center justify-center text-sm text-muted-foreground lg:justify-start">
          Tocá tu nombre para anotarte o bajarte.
        </p>
      )}
    </Bar>
  );

  return (
    <main className="min-h-svh px-4 pt-6 pb-40 sm:pt-10 lg:px-8 lg:pb-16">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6 lg:max-w-5xl lg:gap-10">
        <Brand />
        <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:items-start lg:gap-12">
          <div className="flex flex-col gap-6 lg:sticky lg:top-10">
            {header}
            <div className="hidden lg:flex lg:flex-col">{action}</div>
          </div>
          <div className="flex flex-col gap-8 lg:grid lg:grid-cols-2 lg:items-start lg:gap-6">
            <section className="flex flex-col gap-2" aria-labelledby="lista-joined">
              <div className="flex items-center justify-between gap-2">
                <h2 id="lista-joined" className="text-base font-semibold">
                  La lista{" "}
                  <span className="font-normal text-muted-foreground tabular-nums">
                    · {rsvp.joined.length}
                  </span>
                </h2>
                <CopyListButton joined={rsvp.joined} />
              </div>
              <ol className="flex flex-col divide-y overflow-hidden rounded-lg bg-card ring-1 ring-foreground/10">
                {rsvp.joined.map((player, index) => (
                  <li key={player.id}>
                    <Row
                      index={index + 1}
                      name={player.displayName}
                      selected={selectedId === player.id}
                      onClick={open ? () => toggle(player.id) : undefined}
                    />
                  </li>
                ))}
                {open ? (
                  <li aria-hidden="true">
                    <Row index={rsvp.joined.length + 1} name="¿Vos?" muted />
                  </li>
                ) : null}
              </ol>
            </section>
            {rsvp.notJoined.length > 0 ? (
              <section className="flex flex-col gap-2" aria-labelledby="lista-missing">
                <div className="flex min-h-11 items-center">
                  <h2 id="lista-missing" className="text-base font-semibold">
                    Todavía no{" "}
                    <span className="font-normal text-muted-foreground tabular-nums">
                      · {rsvp.notJoined.length}
                    </span>
                  </h2>
                </div>
                <ul className="flex flex-col divide-y overflow-hidden rounded-lg ring-1 ring-foreground/10">
                  {rsvp.notJoined.map((player) => (
                    <li key={player.id}>
                      <Row
                        name={player.displayName}
                        selected={selectedId === player.id}
                        muted={selectedId !== player.id}
                        onClick={open ? () => toggle(player.id) : undefined}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        </div>
        <div className="lg:hidden">{action}</div>
      </div>
    </main>
  );
}

// ---------- /invitaciones and /sumarse ----------

function ListaGroup({ kind, fails }: { kind: "invitacion" | "sumarse"; fails: boolean }) {
  const isInvite = kind === "invitacion";
  const accept = useFakeAccept({ fails, success: `Ya sos parte de ${group.name}` });
  const [expanded, setExpanded] = useState(false);
  const roster = isInvite
    ? initialPlayers
    : initialPlayers.filter((player) => player.displayName !== user.playerName);
  const me = roster.find((player) => player.displayName === user.playerName);
  const others = roster.filter((player) => player !== me);
  const visible = expanded ? others : others.slice(0, 5);

  return (
    <main className="min-h-svh px-4 pt-6 pb-40 sm:pt-10 lg:pb-16">
      <div className="mx-auto flex w-full max-w-md flex-col gap-8">
        <Brand />
        <header className="flex flex-col gap-2">
          <p className="text-sm font-medium text-muted-foreground">
            {isInvite ? `${group.organizer} te invitó a` : "Te pasaron el link de"}
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-balance">{group.name}</h1>
          <p className="text-sm text-muted-foreground">
            {group.members} jugadores · {group.matches} partidos jugados
          </p>
        </header>
        <section className="flex flex-col gap-2" aria-labelledby="lista-roster">
          <h2 id="lista-roster" className="text-base font-semibold">
            {isInvite ? "Vos en el grupo" : "Quiénes están"}
          </h2>
          <ul className="flex flex-col divide-y overflow-hidden rounded-lg bg-card ring-1 ring-foreground/10">
            {me ? (
              <li>
                <Row
                  name={me.displayName}
                  selected
                  trailing={<Badge variant="default">Vos</Badge>}
                />
              </li>
            ) : (
              <li>
                <Row name="Vos" selected trailing={<Badge variant="outline">Nuevo</Badge>} />
              </li>
            )}
            {visible.map((player) => (
              <li key={player.id}>
                <Row name={player.displayName} muted />
              </li>
            ))}
          </ul>
          {others.length > visible.length ? (
            <Button
              size="sm"
              variant="ghost"
              className="self-start"
              onClick={() => setExpanded(true)}
            >
              Ver los {others.length - visible.length} restantes
            </Button>
          ) : null}
          <p className="text-sm text-muted-foreground text-pretty">
            {isInvite
              ? "Al aceptar, tus goles, partidos y cuentas quedan a tu nombre."
              : "Entrás como miembro. El organizador te vincula con tu jugador después."}
          </p>
        </section>
        {accept.error ? (
          <Alert id="lista-accept-error" variant="destructive">
            <AlertDescription>{accept.error}</AlertDescription>
          </Alert>
        ) : null}
        <Bar>
          {accept.done ? (
            <Button onClick={() => toast("Acá iríamos al grupo")}>Ir al grupo</Button>
          ) : (
            <Button
              aria-describedby={accept.error ? "lista-accept-error" : undefined}
              disabled={accept.pending}
              onClick={accept.accept}
            >
              {accept.pending ? <Spinner data-icon="inline-start" /> : null}
              {accept.pending ? "Un segundo…" : isInvite ? "Sí, ese soy yo" : "Sumarme al grupo"}
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
        </Bar>
      </div>
    </main>
  );
}

// ---------- /login ----------

function ListaLogin({ context }: { context: boolean }) {
  const login = useFakeLogin(context);
  const faces = initialPlayers.slice(0, 4);
  return (
    <main className="min-h-svh px-4 pt-6 pb-16 sm:pt-10">
      <div className="mx-auto flex w-full max-w-sm flex-col gap-8">
        <Brand />
        {context ? (
          <header className="flex flex-col gap-3">
            <AvatarGroup>
              {faces.map((player) => (
                <Avatar key={player.id}>
                  <AvatarFallback>{player.displayName.charAt(0)}</AvatarFallback>
                </Avatar>
              ))}
              <AvatarGroupCount>+{group.members - faces.length}</AvatarGroupCount>
            </AvatarGroup>
            <h1 className="text-2xl font-bold tracking-tight text-balance">
              Te esperan en {group.name}
            </h1>
            <p className="text-sm text-muted-foreground text-pretty">
              {faces.map((player) => firstName(player.displayName)).join(", ")} y{" "}
              {group.members - faces.length} más ya están. Entrá o creá tu cuenta para sumarte.
            </p>
          </header>
        ) : (
          <header className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-balance">
              El partido, bajo control.
            </h1>
            <p className="text-sm text-muted-foreground text-pretty">
              Armá equipos, cerrá el resultado y dejá las cuentas claras desde cualquier pantalla.
            </p>
          </header>
        )}
        <LoginForm login={login} idPrefix="lista" />
      </div>
    </main>
  );
}

// ---------- unavailable ----------

function ListaUnavailable({ screen }: { screen: "jugar" | "sumarse" | "invitacion" }) {
  const copy = unavailableCopy[screen];
  return (
    <main className="min-h-svh px-4 pt-6 pb-16 sm:pt-10">
      <div className="mx-auto flex w-full max-w-md flex-col gap-8">
        <Brand />
        <header className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-balance">{copy.title}</h1>
          <p className="text-sm text-muted-foreground text-pretty">{copy.body}</p>
        </header>
        <ol className="flex flex-col divide-y overflow-hidden rounded-lg border border-dashed">
          {[1, 2, 3].map((index) => (
            <li key={index} aria-hidden="true">
              <Row index={index} name="—" muted />
            </li>
          ))}
        </ol>
        <Button variant="secondary" onClick={() => toast("Acá iríamos al inicio")}>
          Ir al inicio
        </Button>
      </div>
    </main>
  );
}

"use client";

// PROTOTYPE ONLY — mock data and fake mutations shared by the three entry-flow
// variants. Nothing here talks to the API.

import { useState } from "react";
import { toast } from "sonner";

import { LogoMark } from "@/components/logo-mark";
import { buildCalendarIcs, buildWhatsAppUrl, downloadCalendar } from "@/lib/match-sharing";

export type Screen = "login" | "invitacion" | "sumarse" | "jugar";

export const screens: { key: Screen; label: string; states: { key: string; label: string }[] }[] = [
  {
    key: "jugar",
    label: "/jugar",
    states: [
      { key: "abierta", label: "Abierta" },
      { key: "cerrada", label: "Cerrada" },
      { key: "cancelada", label: "Cancelada" },
      { key: "no-disponible", label: "Link roto" },
    ],
  },
  {
    key: "sumarse",
    label: "/sumarse",
    states: [
      { key: "valido", label: "Válido" },
      { key: "falla", label: "Falla al sumarse" },
      { key: "no-disponible", label: "Link vencido" },
    ],
  },
  {
    key: "invitacion",
    label: "/invitaciones",
    states: [
      { key: "valida", label: "Válida" },
      { key: "falla", label: "Falla al aceptar" },
      { key: "no-disponible", label: "No disponible" },
    ],
  },
  {
    key: "login",
    label: "/login",
    states: [
      { key: "con-contexto", label: "Viene de /sumarse" },
      { key: "directo", label: "Directo" },
    ],
  },
];

export type VariantProps = { screen: Screen; state: string };

export const group = {
  name: "Los Pibes del Jueves en Parque Chacabuco",
  initials: "LP",
  organizer: "Valen",
  members: 14,
  matches: 37,
  currency: "ARS",
  timeZone: "America/Argentina/Buenos_Aires",
};

export const user = {
  email: "juanignacio.fernandez.albarracin@gmail.com",
  playerName: "Juan Ignacio Fernández Albarracín",
};

export const match = {
  id: "proto-match",
  scheduledAt: new Date("2026-11-19T22:00:00-03:00"),
  court: {
    name: "La Jaula",
    address: "Av. Eva Perón 1820, Parque Chacabuco",
    mapsUrl: "https://maps.google.com/?q=Av.+Eva+Per%C3%B3n+1820",
  },
  courtCostMinor: 9_000_000,
};

export type Player = { id: string; displayName: string; joinedOrder: number | null };

const seedPlayers: [string, number | null][] = [
  ["Agus", 1],
  ["Colo Martínez", 2],
  ["El Ruso", 3],
  ["Facu Rossi", 4],
  ["Fede", 5],
  ["Gonza Villalba", 6],
  ["Juan Ignacio Fernández Albarracín", null],
  ["Lucho", 7],
  ["Mati González", 8],
  ["Nacho Pérez", 9],
  ["Pato", null],
  ["Rodri Benítez", null],
  ["Santi Medina", null],
  ["Tomi", null],
];

export const initialPlayers: Player[] = seedPlayers.map(([displayName, joinedOrder], index) => ({
  id: `p${index}`,
  displayName,
  joinedOrder,
}));

export function initialsOf(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function firstName(name: string) {
  return name.split(" ")[0] ?? name;
}

// ---------- formatting ----------

export function formatWeekday(value: Date) {
  return new Intl.DateTimeFormat("es-AR", { weekday: "long", timeZone: group.timeZone }).format(
    value,
  );
}

export function formatDayMonth(value: Date) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "long",
    timeZone: group.timeZone,
  }).format(value);
}

export function formatDay(value: Date) {
  return new Intl.DateTimeFormat("es-AR", { day: "numeric", timeZone: group.timeZone }).format(
    value,
  );
}

export function formatMonth(value: Date) {
  return new Intl.DateTimeFormat("es-AR", { month: "long", timeZone: group.timeZone }).format(
    value,
  );
}

export function formatShortDate(value: Date) {
  return new Intl.DateTimeFormat("es-AR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: group.timeZone,
  })
    .format(value)
    .replaceAll(".", "");
}

export function formatTime(value: Date) {
  return new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: group.timeZone,
  }).format(value);
}

export function formatMoney(minor: number) {
  return new Intl.NumberFormat("es-AR", {
    currency: group.currency,
    maximumFractionDigits: 0,
    style: "currency",
  }).format(minor / 100);
}

export function perPlayer(playing: number) {
  return formatMoney(Math.ceil(match.courtCostMinor / Math.max(playing, 1)));
}

export function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

// ---------- fake mutations ----------

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function useFakeAccept({ fails, success }: { fails: boolean; success: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function accept() {
    setPending(true);
    setError(null);
    await wait(900);
    setPending(false);
    if (fails) {
      setError("La invitación es para otra cuenta. Entrá con el email al que te llegó.");
      return;
    }
    setDone(true);
    toast.success(success);
  }

  return { accept, done, error, pending };
}

export function useFakeLogin(context: boolean) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [google, setGoogle] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const error =
      mode === "signup" && name.trim().length < 2
        ? "Ingresá tu nombre."
        : !email.includes("@")
          ? "Tu email tiene que incluir una @."
          : password.length < 8
            ? "La contraseña debe tener al menos 8 caracteres."
            : null;
    setMessage(error);
    if (error) return;
    setSubmitting(true);
    await wait(900);
    setSubmitting(false);
    toast.success(mode === "signin" ? "Sesión iniciada" : "Cuenta creada", {
      description: context ? `Volvés a ${group.name}` : "Vas al inicio",
    });
  }

  async function startGoogle() {
    setGoogle(true);
    await wait(1200);
    setGoogle(false);
    toast("Acá se abriría Google");
  }

  function switchMode(next: "signin" | "signup") {
    setMode(next);
    setMessage(null);
  }

  return {
    email,
    google,
    message,
    mode,
    name,
    password,
    setEmail,
    setName,
    setPassword,
    startGoogle,
    submit,
    submitting,
    switchMode,
  };
}

export type LoginState = ReturnType<typeof useFakeLogin>;

export function useFakeRsvp() {
  const [players, setPlayers] = useState(initialPlayers);
  const [pending, setPending] = useState<"join" | "leave" | null>(null);
  const joined = players
    .filter((player) => player.joinedOrder !== null)
    .sort((a, b) => (a.joinedOrder ?? 0) - (b.joinedOrder ?? 0));
  const notJoined = players.filter((player) => player.joinedOrder === null);

  async function answer(playerId: string, join: boolean) {
    setPending(join ? "join" : "leave");
    await wait(700);
    setPlayers((current) => {
      const next = Math.max(0, ...current.map((player) => player.joinedOrder ?? 0)) + 1;
      return current.map((player) =>
        player.id === playerId ? { ...player, joinedOrder: join ? next : null } : player,
      );
    });
    setPending(null);
    toast.success(join ? "Estás anotado" : "Te bajaste del partido");
  }

  return { answer, joined, notJoined, pending, players };
}

export type RsvpState = ReturnType<typeof useFakeRsvp>;

export function shareText(joined: Player[]) {
  return [
    `⚽ ${group.name}`,
    `${capitalize(formatWeekday(match.scheduledAt))} ${formatDayMonth(match.scheduledAt)} · ${formatTime(match.scheduledAt)} · ${match.court.name}`,
    "",
    ...joined.map((player, index) => `${index + 1}. ${player.displayName}`),
    "",
    "Sumate: https://hayfulbo.app/jugar/…",
  ].join("\n");
}

export function openWhatsApp(joined: Player[]) {
  window.open(buildWhatsAppUrl(shareText(joined)), "_blank", "noopener");
}

export function addToCalendar() {
  downloadCalendar(
    "hay-fulbo-prototipo.ics",
    buildCalendarIcs({
      description: "Prototipo",
      location: `${match.court.name}, ${match.court.address}`,
      start: match.scheduledAt,
      title: `Hay Fulbo · ${group.name}`,
      uid: `${match.id}@hay-fulbo`,
    }),
  );
}

// ---------- small shared pieces ----------

export function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark className="size-8" />
      <span className="text-base font-semibold tracking-tight">Hay Fulbo</span>
    </div>
  );
}

export function GoogleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.98.66-2.23 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A10.96 10.96 0 0 0 12 1 11 11 0 0 0 2.18 7.05l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z"
      />
    </svg>
  );
}

export const unavailableCopy: Record<Exclude<Screen, "login">, { title: string; body: string }> = {
  jugar: {
    title: "Este partido no está disponible",
    body: "El link puede estar mal copiado o el grupo ya no está activo. Pedile el link al organizador.",
  },
  sumarse: {
    title: "Este link ya no está disponible",
    body: "El organizador pudo haberlo renovado o desactivado. Pedile el link nuevo.",
  },
  invitacion: {
    title: "Esta invitación no está disponible",
    body: "Puede haber vencido, ya fue usada o pertenece a otra cuenta.",
  },
};

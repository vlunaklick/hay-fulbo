"use client";

import { ToggleGroup, ToggleGroupItem } from "@hay-fulbo/ui/components/toggle-group";
import { cn } from "@hay-fulbo/ui/lib/utils";
import { useState } from "react";

import { LogoMark } from "@/components/logo-mark";
import { formatMoney } from "@/lib/format";

import { Brand, PrimaryCta, SignInLink } from "./cta";
import { match } from "./data";

// El chat — problem first, copy-led. The page opens on the group chat everyone
// already knows; one toggle drops the noise and answers every question.

type Message = { from: string; time: string; text: string; answer?: React.ReactNode };

const messages: Message[] = [
  {
    from: "Gonza",
    time: "18:02",
    text: "¿Somos 10 o 12 el jueves?",
    answer: (
      <>
        <strong className="font-semibold">{match.players} confirmados.</strong> Azul 6, Naranja 6.
      </>
    ),
  },
  { from: "Leo", time: "18:05", text: "jajaja quién trae pelota" },
  {
    from: "Fran",
    time: "18:40",
    text: "¿Cuánto salió la cancha al final?",
    answer: (
      <>
        <span className="tabular-nums">
          {formatMoney(match.costMinor)} ÷ {match.players} ={" "}
        </span>
        <strong className="font-semibold tabular-nums">{formatMoney(match.shareMinor)} c/u.</strong>
      </>
    ),
  },
  { from: "Mati", time: "19:10", text: "alguien tiene las pecheras??" },
  {
    from: "Tomi",
    time: "23:15",
    text: "¿Quién no pagó lo del jueves?",
    answer: (
      <>
        <strong className="font-semibold">Faltan 3:</strong> Leo Saravia, Fran Ocampo y Nico “el
        Ruso” Kowalczyk (pagó la mitad).
      </>
    ),
  },
  { from: "Nico", time: "23:16", text: "yo te pasé, fijate bien" },
  {
    from: "Juan Ignacio",
    time: "23:30",
    text: "Hice 4 eh, que quede claro",
    answer: (
      <>
        <strong className="font-semibold">Juan Ignacio hizo 3.</strong> Quedó{" "}
        <span className="tabular-nums">
          {match.blue.score} – {match.amber.score}
        </span>{" "}
        para Azul.
      </>
    ),
  },
  {
    from: "Pablo",
    time: "23:41",
    text: "¿Cómo viene la tabla de goleadores?",
    answer: (
      <>
        <strong className="font-semibold">Facu Rinaldi lidera</strong> con 14 goles en 11 partidos.
      </>
    ),
  },
];

type Mode = "hoy" | "fulbo";

function Bubble({ message, muted }: { message: Message; muted: boolean }) {
  return (
    <div
      className={cn(
        "flex w-fit max-w-[85%] flex-col gap-0.5 rounded-lg rounded-tl-xs bg-secondary px-3 py-2",
        muted && "bg-transparent px-0 py-0",
      )}
    >
      <span className="text-xs font-semibold text-muted-foreground">
        {message.from} <span className="font-normal tabular-nums">· {message.time}</span>
      </span>
      <span className={cn("text-base", muted && "text-sm text-muted-foreground")}>
        {message.text}
      </span>
    </div>
  );
}

function Answer({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-lg bg-card px-3 py-3 ring-1 ring-foreground/10">
      <LogoMark className="mt-0.5 size-5 shrink-0" />
      <p className="text-base leading-snug text-pretty">{children}</p>
    </div>
  );
}

export function ChatVariant() {
  const [mode, setMode] = useState<Mode>("hoy");
  const fulbo = mode === "fulbo";
  const visible = fulbo ? messages.filter((m) => m.answer) : messages;

  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6">
        <Brand />
        <SignInLink />
      </header>

      <main className="mx-auto grid w-full max-w-5xl gap-10 px-4 pt-8 pb-32 sm:px-6 md:grid-cols-[1fr_minmax(0,28rem)] md:gap-16 md:pt-16">
        <div className="flex flex-col gap-6 md:sticky md:top-16 md:self-start">
          <h1 className="text-5xl font-bold tracking-tight text-balance sm:text-6xl">
            Menos audios. Más fulbo.
          </h1>
          <p className="max-w-md text-base leading-relaxed text-muted-foreground text-pretty">
            Las preguntas que llenan el grupo de WhatsApp cada semana, respondidas en un solo lugar
            que todos pueden mirar.
          </p>
          <PrimaryCta className="w-full sm:w-fit" />
          <p className="text-sm text-muted-foreground">
            Los demás no necesitan cuenta: miran todo con el enlace del grupo.
          </p>
        </div>

        <section aria-label="El grupo, antes y después" className="flex flex-col gap-4">
          <ToggleGroup
            value={[mode]}
            onValueChange={(value: string[]) => {
              if (value[0]) setMode(value[0] as Mode);
            }}
            variant="outline"
            className="w-full *:flex-1"
            aria-label="Ver el grupo"
          >
            <ToggleGroupItem value="hoy">Así es hoy</ToggleGroupItem>
            <ToggleGroupItem value="fulbo">Con Hay Fulbo</ToggleGroupItem>
          </ToggleGroup>

          <p className="text-xs font-medium text-muted-foreground">
            {fulbo
              ? "Cada pregunta, con su respuesta."
              : `Los del Jueves · ${messages.length} mensajes sin leer`}
          </p>

          <ol className="flex flex-col gap-3" aria-live="polite">
            {visible.map((m) => (
              <li key={m.time} className="flex flex-col gap-2">
                <Bubble message={m} muted={fulbo} />
                {fulbo && m.answer ? <Answer>{m.answer}</Answer> : null}
              </li>
            ))}
          </ol>
        </section>
      </main>
    </div>
  );
}

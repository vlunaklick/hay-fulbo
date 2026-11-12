"use client";

import { formatMoney } from "@/lib/format";

import { Brand, PrimaryCta, SignInLink } from "./cta";
import { match } from "./data";

// Mínima — words only. A headline, a button, and the product as three verbs
// with one number each. Nothing to read twice.

const rows = [
  { verb: "Armá", value: `${match.players} confirmados` },
  { verb: "Jugá", value: `${match.blue.score} – ${match.amber.score}` },
  { verb: "Cerrá", value: `${formatMoney(match.shareMinor)} c/u` },
];

export function MinimaVariant() {
  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6">
        <Brand />
        <SignInLink />
      </header>

      <main className="mx-auto grid w-full max-w-5xl flex-1 content-center items-center gap-12 px-4 pb-28 sm:px-6 md:grid-cols-2 md:gap-16">
        <div className="flex flex-col gap-8">
          <h1 className="text-5xl font-bold tracking-tight text-balance sm:text-6xl">
            Cada fecha, anotada y pagada.
          </h1>
          <PrimaryCta className="w-full sm:w-fit" />
        </div>

        <ol className="flex flex-col">
          {rows.map((row) => (
            <li
              key={row.verb}
              className="flex items-baseline justify-between gap-4 border-t py-4 last:border-b"
            >
              <span className="text-2xl font-bold">{row.verb}</span>
              <span className="text-base text-muted-foreground tabular-nums">{row.value}</span>
            </li>
          ))}
        </ol>
      </main>
    </div>
  );
}

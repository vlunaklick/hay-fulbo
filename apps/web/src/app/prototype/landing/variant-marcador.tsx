"use client";

import { Brand, PrimaryCta, SignInLink } from "./cta";
import { ScoreCard } from "./snippets";

// Marcador — show, don't tell. One headline, one real result card that
// explains the product by itself, one button.

export function MarcadorVariant() {
  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6">
        <Brand />
        <SignInLink />
      </header>

      <main className="mx-auto grid w-full max-w-5xl flex-1 content-center items-center gap-8 px-4 pb-28 sm:px-6 md:grid-cols-[1fr_minmax(0,24rem)] md:gap-x-16 md:gap-y-8">
        <h1 className="text-5xl font-bold tracking-tight text-balance sm:text-6xl md:col-start-1 md:row-start-1 md:self-end">
          El partido, en orden.
        </h1>
        <div className="md:col-start-2 md:row-span-2 md:row-start-1">
          <ScoreCard />
        </div>
        <PrimaryCta className="w-full sm:w-fit md:col-start-1 md:row-start-2 md:self-start" />
      </main>
    </div>
  );
}

"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@hay-fulbo/ui/components/tabs";

import { Brand, PrimaryCta, SignInLink } from "./cta";
import { LineupSnippet, LiveScore, MoneySnippet } from "./snippets";

// Pasos — learn by touching. The three verbs are tabs; each one swaps in the
// real piece of UI it stands for. No paragraphs.

const steps = [
  { value: "arma", label: "Armá", Panel: LineupSnippet },
  { value: "juga", label: "Jugá", Panel: LiveScore },
  { value: "cerra", label: "Cerrá", Panel: MoneySnippet },
];

export function PasosVariant() {
  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6">
        <Brand />
        <SignInLink />
      </header>

      <main className="mx-auto grid w-full max-w-5xl flex-1 content-start gap-8 px-4 pt-10 pb-28 sm:px-6 md:grid-cols-[1fr_minmax(0,24rem)] md:content-center md:items-center md:gap-16 md:pt-0">
        <div className="flex flex-col gap-8">
          <h1 className="text-5xl font-bold tracking-tight text-balance sm:text-6xl">
            Armá. Jugá. Cerrá.
          </h1>
          <PrimaryCta className="hidden w-fit md:inline-flex" />
        </div>

        <Tabs defaultValue="arma" className="gap-3">
          <TabsList className="grid w-full grid-cols-3">
            {steps.map((s) => (
              <TabsTrigger key={s.value} value={s.value}>
                {s.label}
              </TabsTrigger>
            ))}
          </TabsList>
          <div className="min-h-64">
            {steps.map(({ value, Panel }) => (
              <TabsContent key={value} value={value}>
                <Panel />
              </TabsContent>
            ))}
          </div>
        </Tabs>

        <PrimaryCta className="w-full md:hidden" />
      </main>
    </div>
  );
}

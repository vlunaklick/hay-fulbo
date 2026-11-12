"use client";

import { Avatar, AvatarFallback } from "@hay-fulbo/ui/components/avatar";
import { Badge } from "@hay-fulbo/ui/components/badge";
import { Button } from "@hay-fulbo/ui/components/button";
import { Card } from "@hay-fulbo/ui/components/card";
import { Progress } from "@hay-fulbo/ui/components/progress";
import { CheckIcon, CopyIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { formatMoney } from "@/lib/format";

import { Brand, PrimaryCta, SignInLink } from "./cta";
import { contributions, match, paidCount, scorers } from "./data";
import { Footer, MatchCard, initials } from "./snippets";

// Ficha — depth from composition. Real pieces of the product float around the
// result like a product shot; below, the shared link actually copies.

const shareUrl = "hayfulbo.app/g/los-del-jueves";

function TopScorer() {
  const top = scorers[0];
  return (
    <Card size="sm" className="flex-row items-center gap-3 px-3 shadow-lg">
      <Avatar>
        <AvatarFallback>{initials(top.name)}</AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-col">
        <span className="text-xs text-muted-foreground">Figura</span>
        <span className="truncate text-sm font-semibold">{top.name}</span>
      </div>
      <span className="ml-auto text-2xl font-black tabular-nums">{top.goals}</span>
    </Card>
  );
}

function Debts() {
  const owing = contributions.filter((c) => c.state !== "pagado");
  return (
    <Card size="sm" className="gap-2 px-3 shadow-lg">
      <div className="flex items-baseline justify-between gap-3 text-xs">
        <span className="text-muted-foreground">Pagaron</span>
        <span className="font-semibold tabular-nums">
          {paidCount}/{match.players}
        </span>
      </div>
      <Progress value={(paidCount / match.players) * 100} aria-label="Aportes pagados" />
      <ul className="flex flex-col gap-1">
        {owing.map((c) => (
          <li key={c.name} className="flex items-center justify-between gap-2 text-sm">
            <span className="min-w-0 truncate">{c.name.split(" ")[0]}</span>
            <Badge variant={c.state === "parcial" ? "secondary" : "destructive"}>
              {c.state === "parcial" ? "Parcial" : "Debe"}
            </Badge>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function ShareStrip() {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(`https://${shareUrl}`);
    } catch {
      // Clipboard can be blocked; the toast still explains the idea.
    }
    setCopied(true);
    toast.success("Enlace copiado");
    setTimeout(() => setCopied(false), 1600);
  }
  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-16 sm:px-6 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold tracking-tight">Lo ven todos.</h2>
        <p className="text-base text-muted-foreground">Sin cuenta, con un enlace.</p>
      </div>
      <div className="flex w-full items-center gap-2 rounded-lg bg-card p-1.5 pl-4 ring-1 ring-foreground/10 md:w-auto">
        <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">{shareUrl}</span>
        <Button variant="secondary" onClick={copy}>
          {copied ? <CheckIcon data-icon="inline-start" /> : <CopyIcon data-icon="inline-start" />}
          {copied ? "Copiado" : "Copiar"}
        </Button>
      </div>
    </section>
  );
}

export function FichaVariant() {
  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6">
        <Brand />
        <SignInLink />
      </header>

      <main className="mx-auto grid w-full max-w-5xl items-center gap-10 px-4 pt-10 sm:px-6 md:min-h-[calc(100svh-5rem)] md:grid-cols-[1fr_minmax(0,26rem)] md:gap-16 md:pt-0">
        <div className="flex flex-col gap-6">
          <h1 className="text-5xl font-bold tracking-tight text-balance sm:text-6xl">
            El partido, en orden.
          </h1>
          <p className="text-base text-muted-foreground">Equipos, resultado y plata del grupo.</p>
          <PrimaryCta className="w-full sm:w-fit" />
        </div>

        {/* Mobile: stacked. Desktop: the small cards overlap the result's corners. */}
        <div className="relative grid gap-3 md:block">
          <MatchCard
            className="md:mt-12 md:mr-16 md:mb-28"
            status="Cerrado"
            blue={match.blue.score}
            amber={match.amber.score}
            footer={
              <>
                <span>
                  <span className="font-semibold tabular-nums">
                    {formatMoney(match.shareMinor)}
                  </span>{" "}
                  <span className="text-muted-foreground">c/u</span>
                </span>
              </>
            }
          />
          <div className="md:absolute md:right-0 md:bottom-0 md:w-56">
            <Debts />
          </div>
          <div className="md:absolute md:top-0 md:-left-10 md:w-64">
            <TopScorer />
          </div>
        </div>
      </main>

      <ShareStrip />
      <Footer />
    </div>
  );
}

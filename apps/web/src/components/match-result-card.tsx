"use client";

import { Button } from "@hay-fulbo/ui/components/button";
import { NumberTicker } from "@hay-fulbo/ui/components/number-ticker";
import { DownloadIcon, Share2Icon } from "lucide-react";
import { toast } from "sonner";

import { buildResultCardSvg, downloadTextFile } from "@/lib/match-sharing";

type ResultTeam = { goals: number; name: string };

export function MatchResultCard({
  dateLabel,
  groupName,
  left,
  matchId,
  right,
}: {
  dateLabel: string;
  groupName: string;
  left: ResultTeam;
  matchId: string;
  right: ResultTeam;
}) {
  const svg = () => buildResultCardSvg({ dateLabel, groupName, left, right });
  const filename = `resultado-hay-fulbo-${matchId}.svg`;

  function download() {
    downloadTextFile(filename, svg(), "image/svg+xml;charset=utf-8");
  }

  async function share() {
    const file = new File([svg()], filename, { type: "image/svg+xml" });
    if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
      try {
        await navigator.share({
          files: [file],
          text: `${left.name} ${left.goals}–${right.goals} ${right.name}`,
          title: `Resultado · ${groupName}`,
        });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    download();
    toast.success("Placa descargada", {
      description: "Ya podés compartirla por WhatsApp o donde quieras.",
    });
  }

  return (
    <section
      aria-labelledby="share-result-title"
      className="grid gap-3 border-y border-emerald-500/25 py-4 md:grid-cols-[minmax(0,1fr)_11rem] md:items-center"
    >
      <header className="flex items-center justify-between gap-3 md:col-span-2">
        <h2 id="share-result-title" className="text-sm font-medium">
          Resultado para compartir
        </h2>
        <span className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-600 dark:text-emerald-400">
          Final
        </span>
      </header>
      <div className="glare-hover relative overflow-hidden rounded-lg border border-emerald-400/30 bg-zinc-950 px-4 py-5 text-zinc-50 shadow-inner">
        <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_49.8%,rgba(255,255,255,.06)_50%,transparent_50.2%)]" />
        <p className="relative truncate text-center text-[0.625rem] font-bold uppercase tracking-[0.22em] text-emerald-400">
          Hay Fulbo · {dateLabel}
        </p>
        <div className="relative mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-center">
          <div className="min-w-0">
            <p className="truncate text-xs font-bold uppercase sm:text-sm">{left.name}</p>
            <strong className="font-mono text-5xl font-black tabular-nums sm:text-6xl">
              <NumberTicker value={left.goals} />
            </strong>
          </div>
          <span className="text-2xl font-black text-emerald-400">—</span>
          <div className="min-w-0">
            <p className="truncate text-xs font-bold uppercase sm:text-sm">{right.name}</p>
            <strong className="font-mono text-5xl font-black tabular-nums sm:text-6xl">
              <NumberTicker value={right.goals} delay={0.2} />
            </strong>
          </div>
        </div>
        <p className="relative mt-2 truncate text-center text-xs text-zinc-500">{groupName}</p>
      </div>
      <div className="grid grid-cols-2 gap-2 md:flex md:flex-col">
        <Button onClick={share}>
          <Share2Icon data-icon="inline-start" aria-hidden="true" />
          Compartir
        </Button>
        <Button onClick={download} variant="outline">
          <DownloadIcon data-icon="inline-start" aria-hidden="true" />
          Descargar SVG
        </Button>
      </div>
    </section>
  );
}

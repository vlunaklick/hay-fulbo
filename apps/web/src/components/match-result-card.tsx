"use client";

import { Button } from "@hay-fulbo/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@hay-fulbo/ui/components/card";
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
    <Card className="overflow-hidden border-emerald-500/25">
      <CardHeader className="flex-row items-center justify-between gap-3">
        <CardTitle>Resultado para compartir</CardTitle>
        <span className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-600 dark:text-emerald-400">
          Final
        </span>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
        <div className="relative overflow-hidden rounded-xl border border-emerald-400/30 bg-zinc-950 px-5 py-7 text-zinc-50 shadow-inner">
          <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_49.8%,rgba(255,255,255,.06)_50%,transparent_50.2%)]" />
          <p className="relative text-center text-[0.65rem] font-bold uppercase tracking-[0.25em] text-emerald-400">
            Hay Fulbo · {dateLabel}
          </p>
          <div className="relative mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-center">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold uppercase">{left.name}</p>
              <strong className="font-mono text-7xl font-black tabular-nums">{left.goals}</strong>
            </div>
            <span className="text-3xl font-black text-emerald-400">—</span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold uppercase">{right.name}</p>
              <strong className="font-mono text-7xl font-black tabular-nums">{right.goals}</strong>
            </div>
          </div>
          <p className="relative mt-4 text-center text-xs text-zinc-500">{groupName}</p>
        </div>
        <div className="flex flex-col gap-2 md:w-48">
          <Button onClick={share}>
            <Share2Icon data-icon="inline-start" aria-hidden="true" />
            Compartir
          </Button>
          <Button onClick={download} variant="outline">
            <DownloadIcon data-icon="inline-start" aria-hidden="true" />
            Descargar SVG
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

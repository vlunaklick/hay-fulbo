"use client";

import { Button } from "@hay-fulbo/ui/components/button";
import { Card } from "@hay-fulbo/ui/components/card";
import { Separator } from "@hay-fulbo/ui/components/separator";
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
      className="grid gap-3 py-3 md:grid-cols-[minmax(0,1fr)_11rem] md:items-center"
    >
      <Separator className="md:col-span-2" />
      <header className="flex items-center justify-between gap-3 md:col-span-2">
        <h2 id="share-result-title" className="text-sm font-medium">
          Resultado para compartir
        </h2>
        <span className="eyebrow text-muted-foreground">Final</span>
      </header>
      <Card className="relative gap-0 px-4 py-5">
        <p className="relative truncate text-center eyebrow text-muted-foreground">
          Hay Fulbo · {dateLabel}
        </p>
        <div className="relative mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-center">
          <div className="min-w-0">
            <p className="truncate text-xs font-bold uppercase sm:text-sm">{left.name}</p>
            <strong className="text-5xl font-black tabular-nums sm:text-6xl">{left.goals}</strong>
          </div>
          <span className="text-2xl font-black text-muted-foreground">—</span>
          <div className="min-w-0">
            <p className="truncate text-xs font-bold uppercase sm:text-sm">{right.name}</p>
            <strong className="text-5xl font-black tabular-nums sm:text-6xl">{right.goals}</strong>
          </div>
        </div>
        <p className="relative mt-2 truncate text-center text-xs text-muted-foreground">
          {groupName}
        </p>
      </Card>
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
      <Separator className="md:col-span-2" />
    </section>
  );
}

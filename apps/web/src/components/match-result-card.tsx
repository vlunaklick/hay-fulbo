"use client";

import { Button } from "@hay-fulbo/ui/components/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@hay-fulbo/ui/components/card";
import { cn } from "@hay-fulbo/ui/lib/utils";
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
    <section aria-labelledby="share-result-title">
      <Card>
        <CardHeader>
          <CardTitle>
            <h2 id="share-result-title">Resultado final</h2>
          </CardTitle>
          <CardAction className="flex gap-1">
            <Button onClick={share} size="sm" variant="secondary">
              <Share2Icon data-icon="inline-start" aria-hidden="true" />
              Compartir
            </Button>
            <Button aria-label="Descargar SVG" onClick={download} size="icon" variant="ghost">
              <DownloadIcon aria-hidden="true" />
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-3 py-2 sm:gap-8">
            <ResultSide team={left} slot={1} />
            <span
              className="pb-3 text-3xl leading-none font-semibold text-muted-foreground sm:pb-4"
              aria-hidden="true"
            >
              –
            </span>
            <ResultSide team={right} slot={2} />
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

function ResultSide({ slot, team }: { slot: 1 | 2; team: ResultTeam }) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-2",
        slot === 1 ? "items-end text-right" : "items-start text-left",
      )}
    >
      <p
        className={cn(
          "flex max-w-full items-center gap-2 text-sm font-semibold",
          slot === 1 && "flex-row-reverse",
        )}
      >
        <span
          className={cn(
            "size-2 shrink-0 rounded-full",
            slot === 1 ? "bg-team-blue" : "bg-team-amber",
          )}
          aria-hidden="true"
        />
        <span className="truncate">{team.name}</span>
      </p>
      <strong className="text-5xl font-black leading-none tabular-nums sm:text-6xl">
        {team.goals}
      </strong>
    </div>
  );
}

import { toast } from "sonner";

import { buildResultCardSvg, downloadTextFile } from "@/lib/match-sharing";

type ResultTeam = { goals: number; name: string };
export type ResultCardInput = {
  dateLabel: string;
  groupName: string;
  left: ResultTeam;
  matchId: string;
  right: ResultTeam;
};

/** The shareable result plate (SVG). */
function resultCard({ dateLabel, groupName, left, matchId, right }: ResultCardInput) {
  return {
    filename: `resultado-hay-fulbo-${matchId}.svg`,
    svg: buildResultCardSvg({ dateLabel, groupName, left, right }),
  };
}

export function downloadResultCard(input: ResultCardInput) {
  const { filename, svg } = resultCard(input);
  downloadTextFile(filename, svg, "image/svg+xml;charset=utf-8");
}

/** Native share sheet when the device can share files; otherwise downloads the plate. */
export async function shareResultCard(input: ResultCardInput) {
  const { filename, svg } = resultCard(input);
  const { groupName, left, right } = input;
  const file = new File([svg], filename, { type: "image/svg+xml" });
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
  downloadResultCard(input);
  toast.success("Placa descargada", {
    description: "Ya podés compartirla por WhatsApp o donde quieras.",
  });
}

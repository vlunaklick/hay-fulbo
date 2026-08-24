"use client";

import { cn } from "@hay-fulbo/ui/lib/utils";
import confetti from "canvas-confetti";
import * as React from "react";

const colors = ["#B7F34A", "#75D69C", "#67A8FF", "#FFB85C", "#F2F5EF"];

export function fireGoalConfetti(originY = 0.6) {
  void confetti({
    particleCount: 90,
    spread: 75,
    startVelocity: 38,
    origin: { y: originY },
    colors,
    disableForReducedMotion: true,
  });
}

export function Confetti({
  className,
  numberOfPieces = 200,
  ...props
}: {
  className?: string;
  numberOfPieces?: number;
} & Omit<Parameters<typeof confetti>[0], "particleCount">) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const instanceRef = React.useRef<confetti.CreateTypes | null>(null);

  const handleConfetti = React.useCallback(() => {
    if (instanceRef.current || !canvasRef.current) return;
    instanceRef.current = confetti.create(canvasRef.current, {
      resize: true,
      useWorker: true,
    });
    instanceRef.current({
      particleCount: numberOfPieces,
      colors,
      disableForReducedMotion: true,
      ...props,
    });
    setTimeout(() => {
      instanceRef.current?.reset();
      instanceRef.current = null;
    }, 4000);
  }, [numberOfPieces, props]);

  React.useEffect(() => {
    handleConfetti();
    return () => {
      instanceRef.current?.reset();
      instanceRef.current = null;
    };
  }, [handleConfetti]);

  return (
    <canvas ref={canvasRef} className={cn("pointer-events-none fixed inset-0 z-50", className)} />
  );
}

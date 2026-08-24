"use client";

import { cn } from "@hay-fulbo/ui/lib/utils";

export function ProgressiveBlur({
  direction = "bottom",
  blurLayers = 8,
  className,
  blurIntensity = 0.25,
}: {
  direction?: "top" | "bottom" | "left" | "right";
  blurLayers?: number;
  className?: string;
  blurIntensity?: number;
}) {
  const gradientDirection =
    direction === "top"
      ? "to bottom"
      : direction === "bottom"
        ? "to top"
        : direction === "left"
          ? "to right"
          : "to left";

  return (
    <div className={cn("pointer-events-none relative", className)}>
      {Array.from({ length: blurLayers }).map((_, index) => {
        const edge = index / blurLayers;
        return (
          <div
            key={index}
            aria-hidden="true"
            className="absolute inset-0 backdrop-blur-md"
            style={{
              WebkitMaskImage: `linear-gradient(${gradientDirection}, transparent ${edge * 100}%, black ${(edge + 1 / blurLayers) * 100}%)`,
              maskImage: `linear-gradient(${gradientDirection}, transparent ${edge * 100}%, black ${(edge + 1 / blurLayers) * 100}%)`,
              backdropFilter: `blur(${blurIntensity * (blurLayers - index - 1)}px)`,
            }}
          />
        );
      })}
    </div>
  );
}

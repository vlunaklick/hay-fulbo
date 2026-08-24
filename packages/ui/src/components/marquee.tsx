"use client";

import { cn } from "@hay-fulbo/ui/lib/utils";
import * as React from "react";

export function Marquee({
  className,
  reverse = false,
  pause = false,
  vertical = false,
  repeat = 4,
  duration,
  gap = "2rem",
  children,
}: {
  className?: string;
  reverse?: boolean;
  pause?: boolean;
  vertical?: boolean;
  repeat?: number;
  duration?: string;
  gap?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn("group flex overflow-hidden", vertical ? "flex-col" : "flex-row", className)}
      style={
        { "--gap": gap, ...(duration ? { "--duration": duration } : {}) } as React.CSSProperties
      }
    >
      {Array.from({ length: Math.max(1, repeat) }).map((_, index) => (
        <div
          key={index}
          aria-hidden={index > 0}
          className={cn(
            "flex shrink-0 justify-around [gap:var(--gap)]",
            vertical ? "flex-col animate-marquee-y" : "flex-row animate-marquee-x",
            reverse && "[animation-direction:reverse]",
            pause && "group-hover:[animation-play-state:paused]",
          )}
        >
          {children}
        </div>
      ))}
    </div>
  );
}

export function MarqueeItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "shrink-0 select-none rounded-lg border bg-card px-3 py-2 text-sm transition-colors duration-200 hover:bg-accent",
        className,
      )}
    >
      {children}
    </div>
  );
}

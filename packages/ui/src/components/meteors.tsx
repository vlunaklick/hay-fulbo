"use client";

import { cn } from "@hay-fulbo/ui/lib/utils";
import * as React from "react";

export function Meteors({ number = 20, className }: { number?: number; className?: string }) {
  const meteors = React.useMemo(() => {
    return Array.from({ length: number }, (_, index) => ({
      id: index,
      top: -8,
      left: Math.floor(Math.random() * (400 - 100 + 1)) + 100,
      animationDelay: `${(Math.random() * 8).toFixed(2)}s`,
      animationDuration: `${Math.floor(Math.random() * 6 + 4)}s`,
    }));
  }, [number]);

  return (
    <>
      {meteors.map((meteor) => (
        <span
          key={meteor.id}
          aria-hidden="true"
          className={cn(
            "animate-meteor pointer-events-none absolute size-0.5 rotate-[215deg] rounded-full bg-primary/70 shadow-[0_0_0_1px_#ffffff10]",
            "before:absolute before:top-1/2 before:h-px before:w-[60px] before:-translate-y-1/2 before:bg-gradient-to-r before:from-primary before:to-transparent before:content-['']",
            className,
          )}
          style={{
            top: `${meteor.top}%`,
            left: `${meteor.left}%`,
            animationDelay: meteor.animationDelay,
            animationDuration: meteor.animationDuration,
          }}
        />
      ))}
    </>
  );
}

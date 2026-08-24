"use client";

import { cn } from "@hay-fulbo/ui/lib/utils";
import { motion } from "motion/react";
import * as React from "react";

export function BorderBeam({
  className,
  size = 60,
  duration = 6,
  delay = 0,
  colorFrom = "oklch(0.86 0.2 126)",
  colorTo = "oklch(0.72 0.12 190)",
  reverse = false,
}: {
  className?: string;
  size?: number;
  duration?: number;
  delay?: number;
  colorFrom?: string;
  colorTo?: string;
  reverse?: boolean;
}) {
  return (
    <div className="pointer-events-none absolute inset-0 rounded-[inherit] border border-transparent [mask-clip:padding-box,border-box] [mask-composite:intersect] [mask-image:linear-gradient(transparent,transparent),linear-gradient(#000,#000)]">
      <motion.div
        className={cn(
          "absolute aspect-square bg-gradient-to-l from-transparent via-(color:--color-from) to-(color:--color-to)",
          className,
        )}
        style={
          {
            width: size,
            offsetPath: reverse
              ? `rect(0 auto auto 0 round ${size}px)`
              : `rect(auto auto 0 0 round ${size}px)`,
            "--color-from": colorFrom,
            "--color-to": colorTo,
          } as React.CSSProperties
        }
        initial={{ offsetDistance: reverse ? "100%" : "0%" }}
        animate={{ offsetDistance: reverse ? ["100%", "0%"] : ["0%", "100%"] }}
        transition={{
          repeat: Infinity,
          ease: "linear",
          duration,
          delay: -delay,
        }}
      />
    </div>
  );
}

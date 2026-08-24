"use client";

import { cn } from "@hay-fulbo/ui/lib/utils";
import { useInView, useMotionValue, useSpring } from "motion/react";
import * as React from "react";

export function NumberTicker({
  value,
  delay = 0,
  className,
  decimalPlaces = 0,
}: {
  value: number;
  delay?: number;
  className?: string;
  decimalPlaces?: number;
}) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, { damping: 60, stiffness: 200 });
  const isInView = useInView(ref, { once: true, margin: "0px" });

  React.useEffect(() => {
    if (isInView) {
      const timeout = setTimeout(() => {
        motionValue.set(value);
      }, delay * 1000);
      return () => clearTimeout(timeout);
    }
  }, [motionValue, isInView, delay, value]);

  React.useEffect(() => {
    return springValue.on("change", (latest: number) => {
      if (ref.current) {
        ref.current.textContent = new Intl.NumberFormat("es-AR", {
          minimumFractionDigits: decimalPlaces,
          maximumFractionDigits: decimalPlaces,
        }).format(Number(latest.toFixed(decimalPlaces)));
      }
    });
  }, [springValue, decimalPlaces]);

  return (
    <span ref={ref} className={cn("inline-block tabular-nums", className)}>
      0
    </span>
  );
}

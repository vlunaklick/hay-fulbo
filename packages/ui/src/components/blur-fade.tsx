"use client";

import { cn } from "@hay-fulbo/ui/lib/utils";
import { motion, useInView } from "motion/react";
import * as React from "react";

type Direction = "up" | "down" | "left" | "right";

const axis: Record<Direction, "x" | "y"> = {
  up: "y",
  down: "y",
  left: "x",
  right: "x",
};

function offsetFor(direction: Direction, offset: number): number {
  if (direction === "up" || direction === "right") return -offset;
  return offset;
}

export function BlurFade({
  children,
  className,
  duration = 0.4,
  delay = 0,
  offset = 8,
  direction = "up",
  inView = false,
  blur = "6px",
}: {
  children: React.ReactNode;
  className?: string;
  duration?: number;
  delay?: number;
  offset?: number;
  direction?: Direction;
  inView?: boolean;
  blur?: string;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const inViewResult = useInView(ref, { once: true, margin: "-40px" });
  const isVisible = !inView || inViewResult;
  const axisKey = axis[direction];
  const startOffset = offsetFor(direction, offset);

  return (
    <motion.div
      ref={ref}
      initial={{
        opacity: 0,
        filter: `blur(${blur})`,
        [axisKey]: startOffset,
      }}
      animate={
        isVisible
          ? { opacity: 1, filter: "blur(0px)", [axisKey]: 0 }
          : { opacity: 0, filter: `blur(${blur})`, [axisKey]: startOffset }
      }
      transition={{ delay: 0.04 * delay, duration, ease: [0.21, 0.47, 0.32, 0.98] }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  );
}

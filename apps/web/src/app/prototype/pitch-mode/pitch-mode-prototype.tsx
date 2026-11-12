"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Route } from "next";
import { useRef, useState } from "react";

import { useMountEffect } from "@/hooks/use-mount-effect";

import { usePitchMatch } from "./pitch-data";
import { VariantActual } from "./variant-actual";
import { VariantDespues } from "./variant-despues";
import { VariantPlanilla } from "./variant-planilla";
import { VariantTablero } from "./variant-tablero";

// Throwaway harness for /prototype/pitch-mode: one variant at a time, full size,
// switched with the picker, 1–4 or ←/→. Nothing in production imports this.

const VARIANTS = [
  { name: "Actual", Component: VariantActual },
  { name: "Tablero", Component: VariantTablero },
  { name: "Planilla", Component: VariantPlanilla },
  { name: "Al\u00a0toque", Component: VariantDespues },
];

export default function PitchModePrototype() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const initial = Number(params.get("v")) - 1;
  const [current, setCurrent] = useState(initial >= 0 && initial < VARIANTS.length ? initial : 0);
  // One match shared by every variant, so flipping compares the same score.
  const match = usePitchMatch();
  const nav = useRef<HTMLElement>(null);
  const highlight = useRef<HTMLSpanElement>(null);
  const [ready, setReady] = useState(false);

  function moveHighlight() {
    const el = nav.current?.querySelector<HTMLElement>(".proto-picker-item[data-active]");
    if (!el || !highlight.current) return;
    highlight.current.style.width = `${el.offsetWidth}px`;
    highlight.current.style.transform = `translateX(${el.offsetLeft}px)`;
  }

  function select(i: number) {
    if (i < 0 || i >= VARIANTS.length) return;
    setCurrent(i);
    router.replace(`${pathname}?v=${i + 1}` as Route, { scroll: false });
  }

  const latest = useRef({ current, select });
  latest.current = { current, select };

  useMountEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const { current: i, select: go } = latest.current;
      const num = Number.parseInt(e.key, 10);
      if (num >= 1 && num <= VARIANTS.length) go(num - 1);
      else if (e.key === "ArrowRight") go((i + 1) % VARIANTS.length);
      else if (e.key === "ArrowLeft") go((i - 1 + VARIANTS.length) % VARIANTS.length);
    }
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", moveHighlight);
    const frame = requestAnimationFrame(() => requestAnimationFrame(() => setReady(true)));
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", moveHighlight);
      cancelAnimationFrame(frame);
    };
  });

  const { Component } = VARIANTS[current]!;

  return (
    <>
      <div className="proto-stage">
        <Component key={current} match={match} />
      </div>
      <nav
        ref={nav}
        className="proto-picker"
        aria-label="Prototype variants"
        data-position="top"
        data-ready={ready ? "" : undefined}
      >
        <span ref={highlight} className="proto-picker-highlight" aria-hidden="true" />
        {VARIANTS.map((v, i) => (
          <button
            key={v.name}
            type="button"
            className="proto-picker-item"
            data-active={i === current ? "" : undefined}
            aria-current={i === current ? "true" : undefined}
            // Re-attaches whenever the active item changes, so the highlight follows it.
            ref={i === current ? () => moveHighlight() : undefined}
            onClick={() => select(i)}
          >
            {v.name}
          </button>
        ))}
      </nav>
    </>
  );
}

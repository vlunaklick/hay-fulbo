"use client";

// PROTOTYPE ONLY — harness for /prototype/match-detail: variant picker + scenario switch.

import { cn } from "@hay-fulbo/ui/lib/utils";
import { useRef, useState } from "react";

import { useMountEffect } from "@/hooks/use-mount-effect";

import { phaseLabel, useMatch, type Phase, type Role } from "./data";
import { Shell } from "./shared";
import { VariantFases } from "./variant-fases";
import { VariantPlanilla } from "./variant-planilla";
import { VariantTablero } from "./variant-tablero";

const variants = [
  { name: "Tablero", Component: VariantTablero },
  { name: "Planilla", Component: VariantPlanilla },
  { name: "Fases", Component: VariantFases },
];
const phases: Phase[] = ["upcoming", "live", "closed", "cancelled"];
const roles: { id: Role; label: string }[] = [
  { id: "organizer", label: "Organizador" },
  { id: "player", label: "Jugador" },
];

function setParam(key: string, value: string) {
  const url = new URL(window.location.href);
  url.searchParams.set(key, value);
  window.history.replaceState(null, "", url);
}

export default function MatchDetailPrototype({
  initialVariant,
  initialPhase,
  initialRole,
  chrome,
}: {
  initialVariant: number;
  initialPhase: Phase;
  initialRole: Role;
  chrome: boolean;
}) {
  const [current, setCurrent] = useState(initialVariant);
  const [phase, setPhase] = useState<Phase>(initialPhase);
  const [role, setRole] = useState<Role>(initialRole);
  const items = useRef<(HTMLButtonElement | null)[]>([]);
  const [rects, setRects] = useState<{ left: number; width: number }[]>([]);
  const [ready, setReady] = useState(false);

  function select(index: number) {
    const next = (index + variants.length) % variants.length;
    setCurrent(next);
    setParam("v", String(next + 1));
  }

  useMountEffect(() => {
    const measure = () =>
      setRects(
        items.current.map((el) => ({ left: el?.offsetLeft ?? 0, width: el?.offsetWidth ?? 0 })),
      );
    measure();
    window.addEventListener("resize", measure);
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const num = Number.parseInt(event.key, 10);
      if (num >= 1 && num <= variants.length) {
        setCurrent(num - 1);
        setParam("v", String(num));
      } else if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
        const step = event.key === "ArrowRight" ? 1 : -1;
        setCurrent((value) => {
          const next = (value + step + variants.length) % variants.length;
          setParam("v", String(next + 1));
          return next;
        });
      }
    };
    window.addEventListener("keydown", onKey);
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => setReady(true));
    });
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("keydown", onKey);
      cancelAnimationFrame(frame);
    };
  });

  const rect = rects[current];

  return (
    <div className={cn(!chrome && "proto-chrome-hidden")}>
      <Stage key={`${phase}-${role}`} phase={phase} role={role} variant={current} />

      <nav
        className="proto-picker"
        data-position="top"
        data-ready={ready ? "" : undefined}
        aria-label="Prototype variants"
      >
        <span
          className="proto-picker-highlight"
          aria-hidden="true"
          style={rect ? { width: rect.width, transform: `translateX(${rect.left}px)` } : undefined}
        />
        {variants.map((variant, index) => (
          <button
            key={variant.name}
            ref={(el) => {
              items.current[index] = el;
            }}
            type="button"
            className="proto-picker-item"
            data-active={index === current ? "" : undefined}
            aria-current={index === current ? "true" : undefined}
            onClick={() => select(index)}
          >
            {variant.name}
          </button>
        ))}
      </nav>

      <nav className="proto-picker proto-scenario" aria-label="Escenario del prototipo">
        {phases.map((item) => (
          <button
            key={item}
            type="button"
            className="proto-picker-item"
            data-active={item === phase ? "" : undefined}
            aria-current={item === phase ? "true" : undefined}
            onClick={() => {
              setPhase(item);
              setParam("estado", item);
            }}
          >
            {phaseLabel[item]}
          </button>
        ))}
        <span className="proto-picker-divider" aria-hidden="true" />
        {roles.map((item) => (
          <button
            key={item.id}
            type="button"
            className="proto-picker-item"
            data-active={item.id === role ? "" : undefined}
            aria-current={item.id === role ? "true" : undefined}
            onClick={() => {
              setRole(item.id);
              setParam("rol", item.id);
            }}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  );
}

// The match lives here so flipping variants keeps the same data on screen.
function Stage({ phase, role, variant }: { phase: Phase; role: Role; variant: number }) {
  const { state, dispatch } = useMatch(phase, role);
  const { Component } = variants[variant]!;
  return (
    <Shell>
      <Component key={variant} state={state} dispatch={dispatch} />
    </Shell>
  );
}

"use client";

import { useRef, useState } from "react";

import { useMountEffect } from "@/hooks/use-mount-effect";

import "./picker.css";
import { CanchaVariant } from "./variant-cancha";
import { FichaVariant } from "./variant-ficha";
import { MarcadorVariant } from "./variant-marcador";
import { NocheVariant } from "./variant-noche";

// Throwaway harness for /prototype/landing. One variant at a time, full size,
// switched with the picker, 1–4 or ←/→. Selection persists in ?v=.

const variants = [
  { name: "Marcador", Component: MarcadorVariant },
  { name: "Cancha", Component: CanchaVariant },
  { name: "Ficha", Component: FichaVariant },
  { name: "La noche", Component: NocheVariant },
];

export default function LandingPrototype({ initial }: { initial: number }) {
  const [current, setCurrent] = useState(initial);
  const currentRef = useRef(current);
  const navRef = useRef<HTMLElement>(null);
  const highlightRef = useRef<HTMLSpanElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  function moveHighlight(index: number) {
    const item = itemRefs.current[index];
    const highlight = highlightRef.current;
    if (!item || !highlight) return;
    highlight.style.width = `${item.offsetWidth}px`;
    highlight.style.transform = `translateX(${item.offsetLeft}px)`;
  }

  function select(index: number) {
    if (index < 0 || index >= variants.length) return;
    currentRef.current = index;
    setCurrent(index);
    moveHighlight(index);
    const url = new URL(window.location.href);
    url.searchParams.set("v", String(index + 1));
    window.history.replaceState(null, "", url);
    window.scrollTo({ top: 0 });
  }

  useMountEffect(() => {
    moveHighlight(currentRef.current);
    const frame = requestAnimationFrame(() =>
      requestAnimationFrame(() => navRef.current?.setAttribute("data-ready", "")),
    );
    const onResize = () => moveHighlight(currentRef.current);
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const n = Number.parseInt(event.key, 10);
      const i = currentRef.current;
      if (n >= 1 && n <= variants.length) select(n - 1);
      else if (event.key === "ArrowRight") select((i + 1) % variants.length);
      else if (event.key === "ArrowLeft") select((i - 1 + variants.length) % variants.length);
    };
    window.addEventListener("resize", onResize);
    document.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("keydown", onKey);
    };
  });

  const { Component } = variants[current]!;

  return (
    <>
      <Component key={current} />
      <nav ref={navRef} className="proto-picker" aria-label="Prototype variants">
        <span ref={highlightRef} className="proto-picker-highlight" aria-hidden="true" />
        {variants.map((variant, index) => (
          <button
            key={variant.name}
            ref={(el) => {
              itemRefs.current[index] = el;
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
    </>
  );
}

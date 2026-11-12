"use client";

// PROTOTYPE ONLY — three directions for /dashboard/grupo behind a live picker.
// Keys: 1–3 or ←/→. Selection persists in ?v=.

import { useRef, useState } from "react";

import { useMountEffect } from "@/hooks/use-mount-effect";

import "./picker.css";
import { GroupStoreProvider } from "./shared";
import { ProtoShell } from "./shell";
import { HubVariant } from "./variant-hub";
import { PizarraVariant } from "./variant-pizarra";
import { PlantelVariant } from "./variant-plantel";

const variants = [
  { name: "Plantel", switcherInChrome: true, render: () => <PlantelVariant /> },
  { name: "Vestuario", switcherInChrome: false, render: () => <HubVariant /> },
  { name: "Pizarra", switcherInChrome: false, render: () => <PizarraVariant /> },
] as const;

export default function GrupoPrototype({ initial }: { initial: number }) {
  const [current, setCurrent] = useState(
    Number.isInteger(initial) && initial >= 0 && initial < variants.length ? initial : 0,
  );
  const variant = variants[current]!;

  function select(index: number) {
    if (index < 0 || index >= variants.length) return;
    setCurrent(index);
    const url = new URL(window.location.href);
    url.searchParams.set("v", String(index + 1));
    window.history.replaceState(null, "", url);
  }

  return (
    <GroupStoreProvider>
      <ProtoShell key={current} switcherInChrome={variant.switcherInChrome}>
        {variant.render()}
      </ProtoShell>
      <Picker current={current} onSelect={select} />
    </GroupStoreProvider>
  );
}

function Picker({ current, onSelect }: { current: number; onSelect: (index: number) => void }) {
  const navRef = useRef<HTMLElement>(null);
  const highlightRef = useRef<HTMLSpanElement>(null);
  const currentRef = useRef(current);
  currentRef.current = current;
  const [ready, setReady] = useState(false);

  function moveHighlight() {
    const nav = navRef.current;
    const highlight = highlightRef.current;
    const active = nav?.querySelector<HTMLElement>(".proto-picker-item[data-active]");
    if (!highlight || !active) return;
    highlight.style.width = `${active.offsetWidth}px`;
    highlight.style.transform = `translateX(${active.offsetLeft}px)`;
  }

  useMountEffect(() => {
    moveHighlight();
    const frame = requestAnimationFrame(() => requestAnimationFrame(() => setReady(true)));
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable))
        return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const number = Number.parseInt(event.key, 10);
      const now = currentRef.current;
      if (number >= 1 && number <= variants.length) onSelect(number - 1);
      else if (event.key === "ArrowRight") onSelect((now + 1) % variants.length);
      else if (event.key === "ArrowLeft") onSelect((now - 1 + variants.length) % variants.length);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", moveHighlight);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", moveHighlight);
    };
  });

  return (
    <nav
      ref={navRef}
      className="proto-picker"
      aria-label="Prototype variants"
      // The bottom edge belongs to the mobile nav and the bottom sheets.
      data-position="top"
      data-ready={ready ? "" : undefined}
    >
      <span ref={highlightRef} className="proto-picker-highlight" aria-hidden="true" />
      {variants.map((item, index) => (
        <button
          key={item.name}
          type="button"
          className="proto-picker-item"
          data-active={index === current ? "" : undefined}
          aria-current={index === current ? "true" : undefined}
          // Re-measure whenever the active item changes (ref callback re-runs on swap).
          ref={index === current ? () => moveHighlight() : undefined}
          onClick={() => onSelect(index)}
        >
          {item.name}
        </button>
      ))}
    </nav>
  );
}

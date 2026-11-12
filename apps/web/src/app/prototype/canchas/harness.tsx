"use client";

import { useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { COURTS, summarize, type Court } from "./data";
import "./picker.css";
import type { CourtValues, VariantProps } from "./shared";
import { VariantActual } from "./variant-actual";
import { VariantAlToque } from "./variant-al-toque";
import { VariantEnElLugar } from "./variant-en-el-lugar";
import { VariantLibreta } from "./variant-libreta";

const VARIANTS = [
  { name: "Actual", Component: VariantActual },
  { name: "Al toque", Component: VariantAlToque },
  { name: "Libreta", Component: VariantLibreta },
  { name: "En el lugar", Component: VariantEnElLugar },
] as const;

/**
 * URL params: ?v=1..4 picks the variant, ?rol=miembro shows the read-only view,
 * ?vacio=1 starts with no courts.
 */
export function CourtsPrototype() {
  const params = useSearchParams();
  const initial = Math.min(Math.max(Number(params.get("v")) || 1, 1), VARIANTS.length) - 1;
  const [current, setCurrent] = useState(initial);
  const [courts, setCourts] = useState<Court[]>(params.get("vacio") ? [] : COURTS);
  const canManage = params.get("rol") !== "miembro";

  function save(id: string | null, values: CourtValues) {
    const clean = {
      name: values.name.trim(),
      address: values.address.trim(),
      mapsUrl: values.mapsUrl.trim(),
    };
    if (id) {
      setCourts((list) => list.map((court) => (court.id === id ? { ...court, ...clean } : court)));
      toast.success("Cancha actualizada");
    } else {
      setCourts((list) => [
        ...list,
        { id: `new-${Date.now()}`, archivedAt: null, matches: [], ...clean },
      ]);
      toast.success("Cancha guardada", { description: "Ya la podés elegir al crear un partido." });
    }
  }

  function toggleArchive(id: string) {
    const target = courts.find((court) => court.id === id);
    if (!target) return;
    setCourts((list) =>
      list.map((court) =>
        court.id === id
          ? { ...court, archivedAt: court.archivedAt ? null : new Date().toISOString() }
          : court,
      ),
    );
    toast.success(target.archivedAt ? "Cancha reactivada" : "Cancha archivada", {
      description: target.archivedAt
        ? "Vuelve a aparecer al crear partidos."
        : "Los partidos anteriores la conservan.",
    });
  }

  const props: VariantProps = {
    courts: courts.map(summarize),
    canManage,
    save,
    toggleArchive,
  };
  const { Component } = VARIANTS[current]!;

  return (
    <>
      <Component key={current} {...props} />
      <Picker current={current} onChange={setCurrent} />
    </>
  );
}

function Picker({ current, onChange }: { current: number; onChange: (index: number) => void }) {
  const items = useRef<(HTMLButtonElement | null)[]>([]);
  const highlight = useRef<HTMLSpanElement | null>(null);
  const currentRef = useRef(current);

  function moveHighlight(index: number) {
    const item = items.current[index];
    if (!item || !highlight.current) return;
    highlight.current.style.width = `${item.offsetWidth}px`;
    highlight.current.style.transform = `translateX(${item.offsetLeft}px)`;
  }

  function select(index: number) {
    if (index < 0 || index >= VARIANTS.length) return;
    currentRef.current = index;
    moveHighlight(index);
    const url = new URL(window.location.href);
    url.searchParams.set("v", String(index + 1));
    window.history.replaceState(null, "", url);
    onChange(index);
  }

  // Ref callback: wires keyboard + resize once the picker mounts, cleans up on unmount.
  function attach(nav: HTMLElement | null) {
    if (!nav) return;
    moveHighlight(currentRef.current);
    const frame = requestAnimationFrame(() =>
      requestAnimationFrame(() => nav.setAttribute("data-ready", "")),
    );
    const onResize = () => moveHighlight(currentRef.current);
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (document.querySelector("[role=dialog]")) return;
      const count = VARIANTS.length;
      const number = Number.parseInt(event.key, 10);
      if (number >= 1 && number <= count) select(number - 1);
      else if (event.key === "ArrowRight") select((currentRef.current + 1) % count);
      else if (event.key === "ArrowLeft") select((currentRef.current - 1 + count) % count);
    };
    window.addEventListener("resize", onResize);
    document.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("keydown", onKey);
    };
  }

  return (
    <nav ref={attach} className="proto-picker" data-position="top" aria-label="Prototype variants">
      <span ref={highlight} className="proto-picker-highlight" aria-hidden="true" />
      {VARIANTS.map((variant, index) => (
        <button
          key={variant.name}
          ref={(element) => {
            items.current[index] = element;
          }}
          className="proto-picker-item"
          data-active={index === current ? "" : undefined}
          aria-current={index === current ? "true" : undefined}
          onClick={() => select(index)}
          type="button"
        >
          {variant.name}
        </button>
      ))}
    </nav>
  );
}

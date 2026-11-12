"use client";
// PROTOTYPE ONLY — harness: one variant at a time, switched by the picker.

import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useLayoutEffect, useRef, useState } from "react";

import { DirectoryPage } from "@/components/directory-page";

import "./picker.css";
import { VariantPlantel } from "./variant-plantel";
import { VariantTabla } from "./variant-tabla";
import { VariantVestuario } from "./variant-vestuario";

const VARIANTS = [
  { name: "Actual", render: () => <DirectoryPage kind="players" /> },
  { name: "Plantel", render: () => <VariantPlantel /> },
  { name: "Tabla", render: () => <VariantTabla /> },
  { name: "Vestuario", render: () => <VariantVestuario /> },
] as const;

export default function PlayersPrototype() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const fromUrl = Number.parseInt(searchParams.get("v") ?? "1", 10) - 1;
  const current = fromUrl >= 0 && fromUrl < VARIANTS.length ? fromUrl : 0;

  function setActive(index: number) {
    if (index < 0 || index >= VARIANTS.length) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("v", String(index + 1));
    params.delete("p");
    router.replace(`${pathname}?${params}` as Route, { scroll: false });
  }

  return (
    <>
      <div key={current}>{VARIANTS[current]!.render()}</div>
      <Picker current={current} onSelect={setActive} />
    </>
  );
}

function Picker({ current, onSelect }: { current: number; onSelect: (index: number) => void }) {
  const navRef = useRef<HTMLElement>(null);
  const highlightRef = useRef<HTMLSpanElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [ready, setReady] = useState(false);
  const currentRef = useRef(current);
  currentRef.current = current;
  const selectRef = useRef(onSelect);
  selectRef.current = onSelect;

  useLayoutEffect(() => {
    const move = () => {
      const el = itemRefs.current[currentRef.current];
      const highlight = highlightRef.current;
      if (!el || !highlight) return;
      highlight.style.width = `${el.offsetWidth}px`;
      highlight.style.transform = `translateX(${el.offsetLeft}px)`;
    };
    move();
    window.addEventListener("resize", move);
    return () => window.removeEventListener("resize", move);
  }, [current]);

  useLayoutEffect(() => {
    const frame = requestAnimationFrame(() => requestAnimationFrame(() => setReady(true)));
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const num = Number.parseInt(event.key, 10);
      const total = VARIANTS.length;
      if (num >= 1 && num <= total) selectRef.current(num - 1);
      else if (event.key === "ArrowRight") selectRef.current((currentRef.current + 1) % total);
      else if (event.key === "ArrowLeft")
        selectRef.current((currentRef.current - 1 + total) % total);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <nav
      ref={navRef}
      className="proto-picker"
      aria-label="Prototype variants"
      data-position="top"
      data-ready={ready ? "" : undefined}
    >
      <span ref={highlightRef} className="proto-picker-highlight" aria-hidden="true" />
      {VARIANTS.map((variant, index) => (
        <button
          key={variant.name}
          ref={(el) => {
            itemRefs.current[index] = el;
          }}
          type="button"
          className="proto-picker-item"
          data-active={index === current ? "" : undefined}
          aria-current={index === current ? "true" : undefined}
          onClick={() => onSelect(index)}
        >
          {variant.name}
        </button>
      ))}
    </nav>
  );
}

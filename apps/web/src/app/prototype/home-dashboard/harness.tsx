"use client";

// PROTOTYPE ONLY — live picker for /prototype/home-dashboard. Keys: 1–4, ←/→. ?v=N persists.

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useRef } from "react";

import { HomeDashboard } from "@/components/home-dashboard";
import { useMountEffect } from "@/hooks/use-mount-effect";

import "./picker.css";
import { VariantLaFecha } from "./variant-la-fecha";
import { VariantElMuro } from "./variant-el-muro";
import { VariantTuFicha } from "./variant-tu-ficha";

const variants = [
  { name: "Actual", Component: HomeDashboard },
  { name: "La fecha", Component: VariantLaFecha },
  { name: "Tu ficha", Component: VariantTuFicha },
  { name: "El muro", Component: VariantElMuro },
] as const;

export function Harness() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const parsed = Number.parseInt(params.get("v") ?? "1", 10);
  const current = parsed >= 1 && parsed <= variants.length ? parsed - 1 : 0;

  const navRef = useRef<HTMLElement>(null);
  const highlightRef = useRef<HTMLSpanElement>(null);
  const currentRef = useRef(current);
  currentRef.current = current;

  function moveHighlight() {
    const nav = navRef.current;
    const highlight = highlightRef.current;
    if (!nav || !highlight) return;
    const item = nav.querySelectorAll<HTMLButtonElement>(".proto-picker-item")[currentRef.current];
    if (!item) return;
    highlight.style.width = `${item.offsetWidth}px`;
    highlight.style.transform = `translateX(${item.offsetLeft}px)`;
  }

  function setActive(index: number) {
    if (index < 0 || index >= variants.length) return;
    currentRef.current = index;
    moveHighlight();
    const next = new URLSearchParams(params.toString());
    next.set("v", String(index + 1));
    router.replace(`${pathname}?${next.toString()}` as never, { scroll: false });
  }

  useMountEffect(() => {
    moveHighlight();
    const frame = requestAnimationFrame(() =>
      requestAnimationFrame(() => navRef.current?.setAttribute("data-ready", "")),
    );
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const number = Number.parseInt(event.key, 10);
      const at = currentRef.current;
      if (number >= 1 && number <= variants.length) setActiveRef.current(number - 1);
      else if (event.key === "ArrowRight") setActiveRef.current((at + 1) % variants.length);
      else if (event.key === "ArrowLeft")
        setActiveRef.current((at - 1 + variants.length) % variants.length);
    };
    window.addEventListener("resize", moveHighlight);
    document.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", moveHighlight);
      document.removeEventListener("keydown", onKey);
    };
  });
  const setActiveRef = useRef(setActive);
  setActiveRef.current = setActive;

  const { Component } = variants[current];

  return (
    <>
      <Component key={current} />
      <nav
        ref={navRef}
        className="proto-picker"
        data-position="top"
        aria-label="Prototype variants"
      >
        <span ref={highlightRef} className="proto-picker-highlight" aria-hidden="true" />
        {variants.map((variant, index) => (
          <button
            key={variant.name}
            type="button"
            className="proto-picker-item"
            data-active={index === current ? "" : undefined}
            aria-current={index === current ? "true" : undefined}
            onClick={() => setActive(index)}
          >
            {variant.name}
          </button>
        ))}
      </nav>
    </>
  );
}

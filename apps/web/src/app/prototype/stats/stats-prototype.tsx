"use client";

// PROTOTYPE ONLY — harness: picker + fake shell + filter state, one variant mounted at a time.
import { useCallback, useState } from "react";
import type * as React from "react";

import {
  DEFAULT_FILTERS,
  EMPTY_DASHBOARD,
  protoDashboard,
  type ProtoFilters,
} from "./prototype-data";
import { PlayerPeekProvider, ProtoShell, type Screen, type VariantProps } from "./shared";
import { PlanillaVariant } from "./variant-planilla";
import { PortadaVariant } from "./variant-portada";
import { TablaVariant } from "./variant-tabla";

const VARIANTS: { name: string; Component: (props: VariantProps) => React.ReactNode }[] = [
  { name: "Tabla viva", Component: TablaVariant },
  { name: "Portada", Component: PortadaVariant },
  { name: "Planilla", Component: PlanillaVariant },
];

export default function StatsPrototype({
  empty,
  initialScreen,
  initialVariant,
}: {
  empty: boolean;
  initialScreen: Screen;
  initialVariant: number;
}) {
  const [current, setCurrent] = useState(Math.min(initialVariant, VARIANTS.length - 1));
  const [screen, setScreenState] = useState<Screen>(initialScreen);
  const [filters, setFilters] = useState<ProtoFilters>(DEFAULT_FILTERS);
  const dashboard = empty ? EMPTY_DASHBOARD : protoDashboard(filters);

  const syncUrl = (variant: number, nextScreen: Screen) => {
    const url = new URL(window.location.href);
    url.searchParams.set("v", String(variant + 1));
    if (nextScreen === "sociedades") url.searchParams.set("screen", "sociedades");
    else url.searchParams.delete("screen");
    window.history.replaceState(null, "", url);
  };

  const select = (index: number) => {
    if (index < 0 || index >= VARIANTS.length) return;
    setCurrent(index);
    syncUrl(index, screen);
  };

  const setScreen = (next: Screen) => {
    setScreenState(next);
    syncUrl(current, next);
    window.scrollTo({ top: 0 });
  };

  const variant = VARIANTS[current]!;
  const Component = variant.Component;

  return (
    <>
      <ProtoShell groupName={dashboard.group.name}>
        <PlayerPeekProvider dashboard={dashboard}>
          <Component
            key={current}
            dashboard={dashboard}
            filters={filters}
            resetFilters={() => setFilters(DEFAULT_FILTERS)}
            screen={screen}
            setFilter={(key, value) => setFilters((previous) => ({ ...previous, [key]: value }))}
            setScreen={setScreen}
          />
        </PlayerPeekProvider>
      </ProtoShell>
      <Picker current={current} names={VARIANTS.map((item) => item.name)} onSelect={select} />
    </>
  );
}

function Picker({
  current,
  names,
  onSelect,
}: {
  current: number;
  names: string[];
  onSelect: (index: number) => void;
}) {
  // Keyboard wiring and "ready" flag attach with the nav element; no effects needed.
  const navRef = useCallback(
    (nav: HTMLElement | null) => {
      if (!nav) return;
      const onKey = (event: KeyboardEvent) => {
        const target = event.target as HTMLElement;
        if (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable) return;
        if (event.metaKey || event.ctrlKey || event.altKey) return;
        const number = Number.parseInt(event.key, 10);
        if (number >= 1 && number <= names.length) onSelect(number - 1);
        else if (event.key === "ArrowRight") onSelect((current + 1) % names.length);
        else if (event.key === "ArrowLeft") onSelect((current - 1 + names.length) % names.length);
      };
      document.addEventListener("keydown", onKey);
      requestAnimationFrame(() => requestAnimationFrame(() => nav.setAttribute("data-ready", "")));
      return () => document.removeEventListener("keydown", onKey);
    },
    [current, names.length, onSelect],
  );

  const activeRef = useCallback((button: HTMLButtonElement | null) => {
    if (!button) return;
    const move = () => {
      const highlight = button.parentElement?.querySelector<HTMLElement>(".proto-picker-highlight");
      if (!highlight) return;
      highlight.style.width = `${button.offsetWidth}px`;
      highlight.style.transform = `translateX(${button.offsetLeft}px)`;
    };
    move();
    window.addEventListener("resize", move);
    return () => window.removeEventListener("resize", move);
  }, []);

  return (
    <nav ref={navRef} className="proto-picker" aria-label="Prototype variants" data-position="top">
      <span className="proto-picker-highlight" aria-hidden="true" />
      {names.map((name, index) => (
        <button
          key={name}
          ref={index === current ? activeRef : undefined}
          aria-current={index === current ? "true" : undefined}
          className="proto-picker-item"
          data-active={index === current ? "" : undefined}
          onClick={() => onSelect(index)}
          type="button"
        >
          {name}
        </button>
      ))}
    </nav>
  );
}

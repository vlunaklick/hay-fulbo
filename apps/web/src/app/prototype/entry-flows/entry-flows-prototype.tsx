"use client";

// PROTOTYPE ONLY — harness for /prototype/entry-flows. Picker: 1–3 or ←/→ switch
// variants, R replays, S cycles the screen, H hides the chrome.

import { useRef, useState } from "react";

import { type Screen, screens } from "./shared";
import { ListaVariant } from "./variant-lista";
import { PaseVariant } from "./variant-pase";
import { PasosVariant } from "./variant-pasos";

const variants = [
  { name: "Pase", Component: PaseVariant },
  { name: "Paso a paso", Component: PasosVariant },
  { name: "La lista", Component: ListaVariant },
];

function isScreen(value: string | undefined): value is Screen {
  return screens.some((screen) => screen.key === value);
}

function statesOf(screen: Screen) {
  return screens.find((item) => item.key === screen)?.states ?? [];
}

export default function EntryFlowsPrototype(props: {
  v?: string;
  screen?: string;
  state?: string;
  chrome?: string;
}) {
  const initialVariant = Math.min(Math.max((Number(props.v) || 1) - 1, 0), variants.length - 1);
  const initialScreen: Screen = isScreen(props.screen) ? props.screen : "jugar";
  const initialState = statesOf(initialScreen).some((state) => state.key === props.state)
    ? (props.state as string)
    : (statesOf(initialScreen)[0]?.key ?? "");

  const [current, setCurrent] = useState(initialVariant);
  const [screen, setScreen] = useState<Screen>(initialScreen);
  const [state, setState] = useState(initialState);
  const [mount, setMount] = useState(0);
  const [chrome, setChrome] = useState(props.chrome !== "0");
  const highlight = useRef<HTMLSpanElement>(null);
  const latest = useRef({ current, screen, state });
  latest.current = { current, screen, state };

  function sync(next: { current: number; screen: Screen; state: string }) {
    const url = new URL(window.location.href);
    url.searchParams.set("v", String(next.current + 1));
    url.searchParams.set("screen", next.screen);
    url.searchParams.set("state", next.state);
    window.history.replaceState(null, "", url);
  }

  function selectVariant(index: number) {
    if (index < 0 || index >= variants.length) return;
    setCurrent(index);
    setMount((value) => value + 1);
    sync({ ...latest.current, current: index });
  }

  function selectScreen(next: Screen) {
    const nextState = statesOf(next)[0]?.key ?? "";
    setScreen(next);
    setState(nextState);
    setMount((value) => value + 1);
    sync({ ...latest.current, screen: next, state: nextState });
  }

  function selectState(next: string) {
    setState(next);
    setMount((value) => value + 1);
    sync({ ...latest.current, state: next });
  }

  // Keyboard wiring lives in a ref callback (attached once to the picker) instead of an effect.
  const handlers = useRef({ selectVariant, selectScreen });
  handlers.current = { selectVariant, selectScreen };
  function attachPicker(node: HTMLElement | null) {
    if (!node) return;
    requestAnimationFrame(() => requestAnimationFrame(() => node.setAttribute("data-ready", "")));
    function keydown(event: KeyboardEvent) {
      const target = event.target as HTMLElement;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const { current: index, screen: activeScreen } = latest.current;
      const num = Number.parseInt(event.key, 10);
      if (num >= 1 && num <= variants.length) handlers.current.selectVariant(num - 1);
      else if (event.key === "ArrowRight")
        handlers.current.selectVariant((index + 1) % variants.length);
      else if (event.key === "ArrowLeft")
        handlers.current.selectVariant((index - 1 + variants.length) % variants.length);
      else if (event.key === "r" || event.key === "R") setMount((value) => value + 1);
      else if (event.key === "h" || event.key === "H") setChrome((value) => !value);
      else if (event.key === "s" || event.key === "S") {
        const position = screens.findIndex((item) => item.key === activeScreen);
        const next = screens[(position + 1) % screens.length];
        if (next) handlers.current.selectScreen(next.key);
      }
    }
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }

  function measure(node: HTMLButtonElement | null) {
    if (!node || !highlight.current) return;
    highlight.current.style.width = `${node.offsetWidth}px`;
    highlight.current.style.transform = `translateX(${node.offsetLeft}px)`;
  }

  const Variant = variants[current]?.Component ?? PaseVariant;

  return (
    <>
      <Variant key={`${current}-${screen}-${state}-${mount}`} screen={screen} state={state} />

      <nav
        ref={attachPicker}
        className="proto-picker"
        data-position="top"
        aria-label="Prototype variants"
        style={chrome ? undefined : { display: "none" }}
      >
        <span ref={highlight} className="proto-picker-highlight" aria-hidden="true" />
        {variants.map((variant, index) => (
          <button
            key={variant.name}
            ref={index === current ? (node) => measure(node) : undefined}
            type="button"
            className="proto-picker-item"
            data-active={index === current ? "" : undefined}
            aria-current={index === current ? "true" : undefined}
            onClick={() => selectVariant(index)}
          >
            {variant.name}
          </button>
        ))}
        <span className="proto-picker-divider" aria-hidden="true" />
        <button
          type="button"
          className="proto-picker-item proto-picker-replay"
          aria-label="Replay animation (R)"
          onClick={() => setMount((value) => value + 1)}
        >
          ↻
        </button>
      </nav>

      <div className="proto-picker proto-scenario" style={chrome ? undefined : { display: "none" }}>
        <label className="sr-only" htmlFor="proto-screen">
          Pantalla
        </label>
        <select
          id="proto-screen"
          value={screen}
          onChange={(event) => selectScreen(event.target.value as Screen)}
        >
          {screens.map((item) => (
            <option key={item.key} value={item.key}>
              {item.label}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor="proto-state">
          Estado
        </label>
        <select
          id="proto-state"
          value={state}
          onChange={(event) => selectState(event.target.value)}
        >
          {statesOf(screen).map((item) => (
            <option key={item.key} value={item.key}>
              {item.label}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}

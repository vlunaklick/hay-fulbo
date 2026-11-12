"use client";

// PROTOTYPE ONLY — harness for /prototype/public-share.
// Variant 1 is production, untouched. The rest read the same real public API.
// URL: ?v=1..4 picks the variant, ?modo=publico hides money (like /g/[slug]),
// ?slug= picks the group. Detail screens live in ?ver=partido|jugador&id=.

import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";

import { PublicStatsDashboard } from "@/features/stats/stats-dashboard";

import "./picker.css";
import { type Detail, Proto } from "./shared";
import { PreviaVariant } from "./variant-previa";
import { TablaVariant } from "./variant-tabla";
import { VestuarioVariant } from "./variant-vestuario";

function Baseline() {
  const slug = useSearchParams().get("slug") ?? DEFAULT_SLUG;
  return (
    <main className="mx-auto min-h-svh w-full max-w-7xl bg-background px-4 pb-28 pt-8 text-foreground sm:px-6 lg:px-8 lg:pt-12">
      <PublicStatsDashboard slug={slug} />
    </main>
  );
}

const DEFAULT_SLUG = "miercoles-chacabuco";

const variants = [
  { name: "Actual", Component: Baseline, position: "bottom" },
  { name: "La previa", Component: PreviaVariant, position: "bottom" },
  { name: "La tabla", Component: TablaVariant, position: "bottom" },
  // Bottom tab bar lives where the picker would sit, so the picker moves up.
  { name: "El vestuario", Component: VestuarioVariant, position: "top" },
] as const;

const DETAIL_KEYS = ["ver", "id"];
const VARIANT_SCOPED_KEYS = ["ver", "id", "tab", "orden"];

let pushedDetails = 0;

export function PublicSharePrototype() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [replay, setReplay] = useState(0);

  const requested = Number.parseInt(searchParams.get("v") ?? "1", 10);
  const index = requested >= 1 && requested <= variants.length ? requested - 1 : 0;
  const variant = variants[index]!;
  const kind = searchParams.get("ver");
  const id = searchParams.get("id");
  const detail: Detail = (kind === "partido" || kind === "jugador") && id ? { kind, id } : null;

  function href(mutate: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    const query = params.toString();
    return (query ? `${pathname}?${query}` : pathname) as Route;
  }

  function setVariant(next: number) {
    if (next < 0 || next >= variants.length) return;
    pushedDetails = 0;
    router.replace(
      href((params) => {
        for (const key of VARIANT_SCOPED_KEYS) params.delete(key);
        params.set("v", String(next + 1));
      }),
      { scroll: false },
    );
  }

  const context = {
    slug: searchParams.get("slug") ?? DEFAULT_SLUG,
    privateLink: searchParams.get("modo") !== "publico",
    detail,
    param: (key: string) => searchParams.get(key),
    setParam(key: string, value: string | null) {
      router.replace(
        href((params) => (value === null ? params.delete(key) : params.set(key, value))),
        { scroll: false },
      );
    },
    open(nextKind: "partido" | "jugador", nextId: string) {
      pushedDetails += 1;
      router.push(
        href((params) => {
          params.set("ver", nextKind);
          params.set("id", nextId);
        }),
        { scroll: variant.position !== "top" },
      );
    },
    close() {
      if (pushedDetails > 0) {
        pushedDetails -= 1;
        router.back();
        return;
      }
      router.replace(
        href((params) => DETAIL_KEYS.forEach((key) => params.delete(key))),
        {
          scroll: false,
        },
      );
    },
  };

  const latest = useRef({ index, setVariant, replay: () => setReplay((value) => value + 1) });
  latest.current = { index, setVariant, replay: () => setReplay((value) => value + 1) };

  return (
    <Proto value={context}>
      <div className="min-h-dvh bg-background text-foreground" key={`${index}-${replay}`}>
        <variant.Component />
      </div>
      <Picker
        active={index}
        latest={latest}
        names={variants.map((item) => item.name)}
        onSelect={setVariant}
        position={variant.position}
      />
    </Proto>
  );
}

function Picker({
  active,
  latest,
  names,
  onSelect,
  position,
}: {
  active: number;
  latest: React.RefObject<{ index: number; setVariant: (i: number) => void; replay: () => void }>;
  names: string[];
  onSelect: (index: number) => void;
  position: "top" | "bottom";
}) {
  const highlight = useRef<HTMLSpanElement>(null);
  const activeItem = useRef<HTMLButtonElement | null>(null);

  function moveHighlight() {
    const el = activeItem.current;
    if (!el || !highlight.current) return;
    highlight.current.style.width = `${el.offsetWidth}px`;
    highlight.current.style.transform = `translateX(${el.offsetLeft}px)`;
  }

  // Ref callback: wire keyboard + resize once, enable the slide after first paint.
  function attach(nav: HTMLElement | null) {
    if (!nav) return;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable))
        return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const { index, setVariant, replay } = latest.current;
      const count = names.length;
      const number = Number.parseInt(event.key, 10);
      if (number >= 1 && number <= count) setVariant(number - 1);
      else if (event.key === "ArrowRight") setVariant((index + 1) % count);
      else if (event.key === "ArrowLeft") setVariant((index - 1 + count) % count);
      else if (event.key === "r" || event.key === "R") replay();
    };
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", moveHighlight);
    const frame = requestAnimationFrame(() =>
      requestAnimationFrame(() => nav.setAttribute("data-ready", "")),
    );
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", moveHighlight);
    };
  }

  return (
    <nav
      aria-label="Prototype variants"
      className="proto-picker"
      data-position={position}
      ref={attach}
    >
      <span aria-hidden="true" className="proto-picker-highlight" ref={highlight} />
      {names.map((name, index) => (
        <button
          aria-current={index === active ? "true" : undefined}
          className="proto-picker-item"
          data-active={index === active ? "" : undefined}
          key={name}
          onClick={() => onSelect(index)}
          ref={
            index === active
              ? (el) => {
                  activeItem.current = el;
                  moveHighlight();
                }
              : undefined
          }
          type="button"
        >
          {name}
        </button>
      ))}
    </nav>
  );
}

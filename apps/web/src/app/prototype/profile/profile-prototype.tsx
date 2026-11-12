"use client";

// PROTOTYPE ONLY — /prototype/profile. Picker: 1–4 or ←/→ switch variants, D cycles
// the data source (real → mock → vacío). Real = trpc stats.global for the signed-in
// user; without a session it falls back to mock. State lives in the URL
// (?v=2&datos=mock). Nothing imports this.
import { useQuery } from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Route } from "next";
import { useRef, useState } from "react";

import { useMountEffect } from "@/hooks/use-mount-effect";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";

import { EMPTY, FULL, type ProfileData } from "./data";
import { VariantActual } from "./variant-actual";
import { VariantFicha } from "./variant-ficha";
import { VariantGrupos } from "./variant-grupos";
import { VariantRelato } from "./variant-relato";
import "./picker.css";

const SOURCES = ["real", "mock", "vacio"] as const;
type Source = (typeof SOURCES)[number];

const VARIANTS: { name: string; render: (data: ProfileData) => React.ReactNode }[] = [
  { name: "Actual", render: (data) => <VariantActual data={data} /> },
  { name: "Ficha", render: (data) => <VariantFicha data={data} /> },
  { name: "Grupos", render: (data) => <VariantGrupos data={data} /> },
  { name: "Relato", render: (data) => <VariantRelato data={data} /> },
];

export default function ProfilePrototype() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const requested = Number.parseInt(searchParams.get("v") ?? "1", 10) - 1;
  const current = requested >= 0 && requested < VARIANTS.length ? requested : 0;
  const source = (SOURCES as readonly string[]).includes(searchParams.get("datos") ?? "")
    ? (searchParams.get("datos") as Source)
    : "real";

  const session = authClient.useSession();
  const signedIn = Boolean(session.data?.user);
  const real = useQuery({ ...trpc.stats.global.queryOptions(), enabled: signedIn });
  const realData: ProfileData | null =
    signedIn && real.data ? { userName: session.data!.user.name, stats: real.data } : null;
  const data = source === "vacio" ? EMPTY : source === "mock" ? FULL : (realData ?? FULL);
  const waiting = source === "real" && (session.isPending || (signedIn && real.isPending));

  const update = (next: { v?: number; source?: Source }) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("v", String((next.v ?? current) + 1));
    params.set("datos", next.source ?? source);
    router.replace(`${pathname}?${params.toString()}` as Route, { scroll: false });
  };

  // Keep the latest values reachable from the mount-time key listener.
  const latest = useRef({ current, source, update });
  latest.current = { current, source, update };

  useMountEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const { current: index, source: from, update: go } = latest.current;
      const num = Number.parseInt(event.key, 10);
      if (num >= 1 && num <= VARIANTS.length) go({ v: num - 1 });
      else if (event.key === "ArrowRight") go({ v: (index + 1) % VARIANTS.length });
      else if (event.key === "ArrowLeft")
        go({ v: (index - 1 + VARIANTS.length) % VARIANTS.length });
      else if (event.key === "d" || event.key === "D")
        go({ source: SOURCES[(SOURCES.indexOf(from) + 1) % SOURCES.length] });
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  return (
    <div className="min-h-svh bg-background text-foreground">
      {/* Same content container as AppShell's SidebarInset. */}
      <div className="mx-auto w-full max-w-6xl px-4 py-5 pb-28 md:px-8 md:py-8 md:pb-28">
        {waiting ? null : <div key={`${current}-${source}`}>{VARIANTS[current]!.render(data)}</div>}
      </div>
      <Picker current={current} onPick={(index) => update({ v: index })} />
    </div>
  );
}

function Picker({ current, onPick }: { current: number; onPick: (index: number) => void }) {
  const nav = useRef<HTMLElement>(null);
  const [boxes, setBoxes] = useState<{ left: number; width: number }[]>([]);
  const [ready, setReady] = useState(false);

  useMountEffect(() => {
    const measure = () => {
      const items = nav.current?.querySelectorAll<HTMLElement>(".proto-picker-item");
      if (!items) return;
      setBoxes([...items].map((el) => ({ left: el.offsetLeft, width: el.offsetWidth })));
    };
    measure();
    const frame = requestAnimationFrame(() => requestAnimationFrame(() => setReady(true)));
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", measure);
    };
  });

  const box = boxes[current];
  return (
    <nav
      ref={nav}
      className="proto-picker"
      aria-label="Prototype variants"
      data-ready={ready ? "" : undefined}
    >
      <span
        className="proto-picker-highlight"
        aria-hidden="true"
        style={box ? { width: box.width, transform: `translateX(${box.left}px)` } : undefined}
      />
      {VARIANTS.map((variant, index) => (
        <button
          key={variant.name}
          type="button"
          className="proto-picker-item"
          data-active={index === current ? "" : undefined}
          aria-current={index === current ? "true" : undefined}
          onClick={() => onPick(index)}
        >
          {variant.name}
        </button>
      ))}
    </nav>
  );
}

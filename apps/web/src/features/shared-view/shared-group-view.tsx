"use client";

import { Skeleton } from "@hay-fulbo/ui/components/skeleton";
import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useRef } from "react";

import { StatsError } from "@/features/stats/stats-error";

import { ViewContext, type ViewDetail, type ViewSection } from "./context";
import { useViewDashboard, type ViewSource } from "./data";
import { DetailSheet } from "./detail-sheet";
import { GroupHome } from "./group-home";
import { useSharedCapability } from "./shared-capability";

const sections: readonly ViewSection[] = ["resultados", "tabla", "caja"];

/** `/g/[slug]`: a group its owner made public. Never shows money. */
export function PublicGroupView({ slug }: { slug: string }) {
  return <GroupView ready source={{ kind: "public", slug }} />;
}

/** `/compartido`: the private read-only link. Exchanges the `#token` fragment first. */
export function SharedLinkView() {
  const capability = useSharedCapability();
  if (capability.error) {
    return (
      <StatsError
        exitHref={null}
        message="No pudimos abrir el enlace privado. Revisá tu conexión o pedile al organizador el enlace más reciente."
        onRetry={capability.retry}
      />
    );
  }
  return <GroupView ready={capability.ready} source={{ kind: "shared" }} />;
}

/**
 * The read-only group screen. It lives in the route layout so `/partidos/[id]` and
 * `/jugadores/[id]` open as a sheet over the same screen instead of a new page.
 * Sections (`?seccion=resultados|tabla|caja`) open in the same sheet.
 */
function GroupView({ ready, source }: { ready: boolean; source: ViewSource }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const pushed = useRef(0);
  const query = useViewDashboard(source, ready);

  const base = source.kind === "shared" ? "/compartido" : `/g/${source.slug}`;
  const detail = parseDetail(pathname.slice(base.length));
  // `?tab=` is the old name; links shared before the redesign still open the right section.
  const requested = searchParams.get("seccion") ?? searchParams.get("tab");
  const section = sections.find((item) => item === requested) ?? null;
  const showMoney = source.kind === "shared";

  function withParams(path: string, mutate?: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    mutate?.(params);
    const search = params.toString();
    return (search ? `${path}?${search}` : path) as Route;
  }

  const context = {
    source,
    showMoney,
    detail,
    section: section === "caja" && !showMoney ? null : section,
    param: (key: string) => searchParams.get(key),
    setParam(key: string, value: string | null) {
      router.replace(
        withParams(pathname, (params) =>
          value === null ? params.delete(key) : params.set(key, value),
        ),
        { scroll: false },
      );
    },
    open(kind: "partido" | "jugador", id: string) {
      pushed.current += 1;
      const segment = kind === "partido" ? "partidos" : "jugadores";
      router.push(withParams(`${base}/${segment}/${encodeURIComponent(id)}`), { scroll: false });
    },
    openSection(next: ViewSection) {
      pushed.current += 1;
      router.push(
        withParams(base, (params) => {
          params.delete("tab");
          params.set("seccion", next);
        }),
        { scroll: false },
      );
    },
    close() {
      if (pushed.current > 0) {
        pushed.current -= 1;
        router.back();
        return;
      }
      // Arrived by a deep link: step back to the section under the detail, or to the screen.
      router.replace(
        withParams(base, (params) => {
          if (detail) return;
          params.delete("seccion");
          params.delete("tab");
          params.delete("orden");
        }),
        { scroll: false },
      );
    },
  };

  if (query.error) {
    return (
      <StatsError
        exitHref={null}
        message={
          source.kind === "shared"
            ? "Este enlace privado no está activo. Pedile al organizador el enlace más reciente."
            : "Este grupo no está disponible públicamente."
        }
        onRetry={() => void query.refetch()}
      />
    );
  }

  return (
    <ViewContext value={context}>
      <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-6 bg-background px-4 pt-6 pb-12 text-foreground sm:pt-10">
        {query.data ? <GroupHome dashboard={query.data} /> : <ViewLoading />}
      </main>
      {query.data ? <DetailSheet dashboard={query.data} /> : null}
    </ViewContext>
  );
}

function parseDetail(rest: string): ViewDetail {
  const match = /^\/(partidos|jugadores)\/([^/]+)\/?$/.exec(rest);
  if (!match) return null;
  return {
    kind: match[1] === "partidos" ? "partido" : "jugador",
    id: decodeURIComponent(match[2]!),
  };
}

function ViewLoading() {
  return (
    <div aria-busy="true" aria-label="Cargando el grupo" className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-6 w-48 max-w-full" />
        <Skeleton className="h-3 w-32" />
      </div>
      <Skeleton className="mx-auto h-16 w-40" />
      <Skeleton className="h-32 w-full rounded-xl" />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}

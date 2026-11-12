"use client";

import { Skeleton } from "@hay-fulbo/ui/components/skeleton";
import { cn } from "@hay-fulbo/ui/lib/utils";
import {
  CalendarDaysIcon,
  GlobeIcon,
  ListIcon,
  LockKeyholeIcon,
  TrophyIcon,
  type LucideIcon,
} from "lucide-react";
import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useRef } from "react";

import { StatsError } from "@/features/stats/stats-error";

import { ViewContext, type ViewDetail } from "./context";
import { useViewDashboard, type ViewSource } from "./data";
import { DetailSheet } from "./detail-sheet";
import { NextTab } from "./next-tab";
import { ResultsTab } from "./results-tab";
import { useSharedCapability } from "./shared-capability";
import { TableTab } from "./table-tab";

const tabs: { key: TabKey; label: string; icon: LucideIcon }[] = [
  { key: "proxima", label: "Próxima", icon: CalendarDaysIcon },
  { key: "resultados", label: "Resultados", icon: ListIcon },
  { key: "tabla", label: "Tabla", icon: TrophyIcon },
];
type TabKey = "proxima" | "resultados" | "tabla";

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
 * The read-only group app. It lives in the route layout so `/partidos/[id]` and
 * `/jugadores/[id]` open as a sheet over the same screen instead of a new page.
 */
function GroupView({ ready, source }: { ready: boolean; source: ViewSource }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const pushedDetails = useRef(0);
  const query = useViewDashboard(source, ready);

  const base = source.kind === "shared" ? "/compartido" : `/g/${source.slug}`;
  const detail = parseDetail(pathname.slice(base.length));
  const requestedTab = tabs.find((item) => item.key === searchParams.get("tab"))?.key;
  // Deep links to a detail land on the tab that lists it.
  const tab: TabKey =
    requestedTab ??
    (detail?.kind === "partido" ? "resultados" : detail?.kind === "jugador" ? "tabla" : "proxima");

  function withParams(path: string, mutate?: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    mutate?.(params);
    const search = params.toString();
    return (search ? `${path}?${search}` : path) as Route;
  }

  const context = {
    source,
    showMoney: source.kind === "shared",
    detail,
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
      pushedDetails.current += 1;
      const segment = kind === "partido" ? "partidos" : "jugadores";
      // Pin the current tab so the screen under the sheet does not change.
      router.push(
        withParams(`${base}/${segment}/${encodeURIComponent(id)}`, (params) =>
          params.set("tab", tab),
        ),
        { scroll: false },
      );
    },
    close() {
      if (pushedDetails.current > 0) {
        pushedDetails.current -= 1;
        router.back();
        return;
      }
      // Keep the tab that was under the sheet, even when it came from a deep link.
      router.replace(
        withParams(base, (params) =>
          tab === "proxima" ? params.delete("tab") : params.set("tab", tab),
        ),
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

  const dashboard = query.data;
  const selectTab = (key: TabKey) => context.setParam("tab", key === "proxima" ? null : key);

  return (
    <ViewContext value={context}>
      <div className="flex min-h-dvh flex-col bg-background text-foreground">
        <header className="sticky top-0 z-10 border-b bg-background/95 supports-[backdrop-filter]:bg-background/80 supports-[backdrop-filter]:backdrop-blur">
          <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-2 px-4 sm:px-6 lg:px-8">
            {source.kind === "shared" ? (
              <LockKeyholeIcon
                aria-hidden="true"
                className="size-4 shrink-0 text-muted-foreground"
              />
            ) : (
              <GlobeIcon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
            )}
            {dashboard ? (
              <h1 className="min-w-0 flex-1 truncate text-sm font-semibold">
                {dashboard.group.name}
              </h1>
            ) : (
              <div className="min-w-0 flex-1">
                <Skeleton className="h-4 w-48 max-w-full" />
              </div>
            )}
            <span className="shrink-0 text-xs text-muted-foreground">
              {source.kind === "shared" ? "Enlace privado" : "Grupo público"}
              <span className="hidden sm:inline"> · solo lectura</span>
            </span>
          </div>
          <nav
            aria-label="Secciones"
            className="mx-auto hidden w-full max-w-5xl gap-1 px-4 sm:px-6 md:flex lg:px-8"
          >
            {tabs.map((item) => (
              <button
                aria-current={tab === item.key ? "page" : undefined}
                className={cn(
                  "relative flex h-11 items-center gap-2 px-3 text-sm font-medium text-muted-foreground transition-colors duration-150 ease-out hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                  tab === item.key &&
                    "text-foreground after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-primary",
                )}
                key={item.key}
                onClick={() => selectTab(item.key)}
                type="button"
              >
                <item.icon aria-hidden="true" className="size-4" />
                {item.label}
              </button>
            ))}
          </nav>
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-28 pt-5 sm:px-6 md:pb-12 lg:px-8 lg:pt-8">
          {!dashboard ? (
            <ViewLoading />
          ) : tab === "proxima" ? (
            <NextTab dashboard={dashboard} />
          ) : tab === "resultados" ? (
            <ResultsTab dashboard={dashboard} />
          ) : (
            <TableTab dashboard={dashboard} />
          )}
        </main>

        <nav
          aria-label="Secciones"
          className="fixed inset-x-0 bottom-0 z-10 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] supports-[backdrop-filter]:bg-background/80 supports-[backdrop-filter]:backdrop-blur md:hidden"
        >
          <ul className="grid grid-cols-3">
            {tabs.map((item) => (
              <li key={item.key}>
                <button
                  aria-current={tab === item.key ? "page" : undefined}
                  className={cn(
                    "flex h-16 w-full touch-manipulation flex-col items-center justify-center gap-1 text-xs font-medium text-muted-foreground transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50",
                    tab === item.key && "text-foreground",
                  )}
                  onClick={() => selectTab(item.key)}
                  type="button"
                >
                  <item.icon
                    aria-hidden="true"
                    className={cn("size-5", tab === item.key && "text-primary-text")}
                  />
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <DetailSheet />
      </div>
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
    <div aria-busy="true" aria-label="Cargando el grupo" className="flex flex-col gap-5">
      <Skeleton className="h-44 w-full rounded-lg" />
      <Skeleton className="h-5 w-24" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-56 rounded-lg" />
        <Skeleton className="h-56 rounded-lg" />
      </div>
    </div>
  );
}

import { Skeleton } from "@hay-fulbo/ui/components/skeleton";

export function StatsLoading() {
  return (
    <div
      aria-busy="true"
      aria-label="Cargando estadísticas"
      className="mx-auto flex w-full max-w-7xl flex-col gap-5"
    >
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-48 max-w-full" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-11 w-64" />
        <Skeleton className="size-11" />
      </div>
      <Skeleton className="h-9 w-56" />
      <Skeleton className="h-96 w-full" />
    </div>
  );
}

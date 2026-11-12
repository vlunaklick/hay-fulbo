import { Skeleton } from "@hay-fulbo/ui/components/skeleton";

export function StatsLoading() {
  return (
    <div
      aria-busy="true"
      aria-label="Cargando estadísticas"
      className="mx-auto flex w-full max-w-7xl flex-col gap-6"
    >
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-48 max-w-full" />
        <Skeleton className="h-4 w-64 max-w-full" />
      </div>
      <div className="grid grid-cols-2 gap-2 sm:flex">
        <Skeleton className="h-11 sm:w-44" />
        <Skeleton className="h-11 sm:w-44" />
        <Skeleton className="h-11 sm:w-44" />
      </div>
      <Skeleton className="h-20 w-full" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-72 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    </div>
  );
}

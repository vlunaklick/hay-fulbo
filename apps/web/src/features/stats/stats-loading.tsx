import { Skeleton } from "@hay-fulbo/ui/components/skeleton";

export function StatsLoading() {
  return (
    <div
      aria-busy="true"
      aria-label="Cargando estadísticas"
      className="mx-auto flex w-full max-w-xl flex-col gap-6"
    >
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-40 max-w-full" />
        <Skeleton className="h-4 w-56 max-w-full" />
      </div>
      <div className="flex flex-col items-center gap-2 py-4">
        <Skeleton className="h-12 w-20" />
        <Skeleton className="h-4 w-40" />
      </div>
      <Skeleton className="h-32 w-full rounded-xl" />
      <div className="flex flex-col gap-2">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton className="h-10 w-full" key={index} />
        ))}
      </div>
    </div>
  );
}

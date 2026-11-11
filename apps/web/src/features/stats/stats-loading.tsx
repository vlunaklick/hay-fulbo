import { Card, CardContent, CardHeader } from "@hay-fulbo/ui/components/card";
import { Skeleton } from "@hay-fulbo/ui/components/skeleton";

export function StatsLoading() {
  return (
    <div
      aria-busy="true"
      aria-label="Cargando estadísticas"
      className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8"
    >
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-10 w-64 max-w-full" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {[0, 1].map((item) => (
          <Card key={item}>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-8 w-40" />
        {[0, 1, 2, 3].map((item) => (
          <Skeleton key={item} className="h-14 w-full" />
        ))}
      </div>
    </div>
  );
}

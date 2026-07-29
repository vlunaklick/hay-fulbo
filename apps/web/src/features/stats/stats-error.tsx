import { Alert, AlertDescription, AlertTitle } from "@hay-fulbo/ui/components/alert";
import { Button } from "@hay-fulbo/ui/components/button";
import { AlertCircleIcon, RotateCcwIcon } from "lucide-react";

export function StatsError({
  message = "No pudimos cargar las estadísticas.",
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-[60svh] w-full max-w-3xl items-center px-4 py-8 sm:px-6">
      <Alert variant="destructive">
        <AlertCircleIcon />
        <AlertTitle>Algo no salió bien</AlertTitle>
        <AlertDescription>
          <p>{message}</p>
          {onRetry ? (
            <Button className="mt-4 min-h-11" onClick={onRetry} variant="outline">
              <RotateCcwIcon data-icon="inline-start" />
              Reintentar
            </Button>
          ) : null}
        </AlertDescription>
      </Alert>
    </main>
  );
}

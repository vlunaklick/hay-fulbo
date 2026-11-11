"use client";
import Link from "next/link";
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
    <div className="mx-auto flex min-h-[60svh] w-full max-w-3xl items-center px-4 py-8 sm:px-6">
      <Alert variant="destructive">
        <AlertCircleIcon />
        <AlertTitle>Algo no salió bien</AlertTitle>
        <AlertDescription>
          <p>{message}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              className="min-h-11"
              onClick={onRetry ?? (() => window.location.reload())}
              variant="outline"
            >
              <RotateCcwIcon data-icon="inline-start" />
              Reintentar
            </Button>
            <Button variant="ghost" render={<Link href="/dashboard" />} nativeButton={false}>
              Ir al inicio
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}

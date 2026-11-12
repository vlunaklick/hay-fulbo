"use client";

import { Toaster } from "@hay-fulbo/ui/components/sonner";
import { defaultTheme } from "@hay-fulbo/ui/tokens";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

import { queryClient } from "@/utils/trpc";

import { ThemeProvider } from "./theme-provider";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme={defaultTheme}
      enableSystem
      storageKey="hay-fulbo-theme"
      disableTransitionOnChange
    >
      <QueryClientProvider client={queryClient}>
        {children}
        {process.env.NODE_ENV === "development" ? <ReactQueryDevtools /> : null}
      </QueryClientProvider>
      <Toaster position="top-center" />
    </ThemeProvider>
  );
}

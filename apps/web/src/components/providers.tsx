"use client";

import { Toaster } from "@hay-fulbo/ui/components/sonner";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

import { queryClient } from "@/utils/trpc";

import { ThemeProvider } from "./theme-provider";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      forcedTheme="dark"
      disableTransitionOnChange
    >
      <QueryClientProvider client={queryClient}>
        {children}
        {process.env.NODE_ENV === "development" ? <ReactQueryDevtools /> : null}
      </QueryClientProvider>
      <Toaster richColors position="top-center" />
    </ThemeProvider>
  );
}

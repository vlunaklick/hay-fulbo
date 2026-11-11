import "@/global.css";
import { PortalHost } from "@rn-primitives/portal";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack, ThemeProvider } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { Toaster } from "sonner-native";

import { AppThemeProvider, useAppTheme } from "@/contexts/app-theme-context";
import { NAV_THEME } from "@/lib/theme";
import { queryClient } from "@/utils/trpc";

export const unstable_settings = {
  initialRouteName: "(drawer)",
};

function StackLayout() {
  const { currentTheme } = useAppTheme();

  return (
    <ThemeProvider value={NAV_THEME[currentTheme]}>
      <StatusBar style={currentTheme === "dark" ? "light" : "dark"} />
      <Stack screenOptions={{}}>
        <Stack.Screen name="(drawer)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ title: "Modal", presentation: "modal" }} />
      </Stack>
      <Toaster theme={currentTheme} position="bottom-center" />
      <PortalHost />
    </ThemeProvider>
  );
}

export default function Layout() {
  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <KeyboardProvider>
          <AppThemeProvider>
            <StackLayout />
          </AppThemeProvider>
        </KeyboardProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}

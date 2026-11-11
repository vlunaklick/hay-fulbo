import { DarkTheme, DefaultTheme, type Theme } from "expo-router";

// Hex mirrors of the CSS variables in global.css, for places that need a raw
// color value (React Navigation headers, drawer and tab bars, native toasts).
export const THEME = {
  light: {
    background: "#f8fbf8",
    foreground: "#111811",
    card: "#ffffff",
    cardForeground: "#111811",
    popover: "#ffffff",
    popoverForeground: "#111811",
    primary: "#8bbf00",
    primaryForeground: "#081008",
    secondary: "#eaf1ea",
    secondaryForeground: "#1a221a",
    muted: "#eaf0ea",
    mutedForeground: "#586057",
    accent: "#dbebcf",
    accentForeground: "#131e13",
    destructive: "#df202e",
    border: "#cbd4cb",
    input: "#bdc7bd",
    ring: "#7bab00",
    radius: "12px",
  },
  dark: {
    background: "#090f09",
    foreground: "#eff0e4",
    card: "#111811",
    cardForeground: "#eff0e4",
    popover: "#151d15",
    popoverForeground: "#eff0e4",
    primary: "#b0e739",
    primaryForeground: "#090f09",
    secondary: "#1c241c",
    secondaryForeground: "#e1e2d8",
    muted: "#1b211b",
    mutedForeground: "#9ea092",
    accent: "#242f20",
    accentForeground: "#eff0e4",
    destructive: "#ff645f",
    border: "#2f382f",
    input: "#343e34",
    ring: "#b0e739",
    radius: "12px",
  },
} as const;

export const NAV_THEME: Record<"light" | "dark", Theme> = {
  light: {
    ...DefaultTheme,
    colors: {
      background: THEME.light.background,
      border: THEME.light.border,
      card: THEME.light.card,
      notification: THEME.light.destructive,
      primary: THEME.light.primary,
      text: THEME.light.foreground,
    },
  },
  dark: {
    ...DarkTheme,
    colors: {
      background: THEME.dark.background,
      border: THEME.dark.border,
      card: THEME.dark.card,
      notification: THEME.dark.destructive,
      primary: THEME.dark.primary,
      text: THEME.dark.foreground,
    },
  },
};

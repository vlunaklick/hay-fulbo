/**
 * Single source of truth for Hay Fulbo's color tokens.
 *
 * Every theme surface is generated from this file:
 *   - packages/ui/src/styles/globals.css   (web, CSS variables + Tailwind theme)
 *   - apps/native/global.css               (native, Uniwind theme)
 *   - apps/native/lib/theme-tokens.ts      (native, hex values for React Navigation)
 *
 * Edit values here, then run `bun run tokens:sync`. `bun test` fails when a
 * generated file drifts from this source.
 */

export type ThemeName = "light" | "dark";

export type ColorToken = { light: string; dark: string };

const same = (value: string): ColorToken => ({ light: value, dark: value });

export const colorTokens = {
  background: { light: "oklch(0.985 0.006 145)", dark: "oklch(0.16 0.015 145)" },
  foreground: { light: "oklch(0.2 0.018 145)", dark: "oklch(0.95 0.015 110)" },
  card: { light: "oklch(1 0 0)", dark: "oklch(0.2 0.017 145)" },
  "card-foreground": { light: "oklch(0.2 0.018 145)", dark: "oklch(0.95 0.015 110)" },
  popover: { light: "oklch(1 0 0)", dark: "oklch(0.22 0.018 145)" },
  "popover-foreground": { light: "oklch(0.2 0.018 145)", dark: "oklch(0.95 0.015 110)" },
  primary: { light: "oklch(0.74 0.2 126)", dark: "oklch(0.86 0.2 126)" },
  "primary-foreground": { light: "oklch(0.16 0.02 145)", dark: "oklch(0.16 0.015 145)" },
  // Verde Cancha as text or icon on a neutral surface. The light-theme fill is too
  // bright to read as text, so text uses a deeper step of the same hue.
  "primary-text": { light: "oklch(0.5 0.13 130)", dark: "oklch(0.86 0.2 126)" },
  secondary: { light: "oklch(0.95 0.012 145)", dark: "oklch(0.25 0.018 145)" },
  "secondary-foreground": { light: "oklch(0.24 0.018 145)", dark: "oklch(0.91 0.014 110)" },
  muted: { light: "oklch(0.95 0.01 145)", dark: "oklch(0.24 0.016 145)" },
  "muted-foreground": { light: "oklch(0.48 0.018 145)", dark: "oklch(0.7 0.02 115)" },
  accent: { light: "oklch(0.92 0.04 132)", dark: "oklch(0.29 0.03 138)" },
  "accent-foreground": { light: "oklch(0.22 0.025 145)", dark: "oklch(0.95 0.015 110)" },
  destructive: { light: "oklch(0.54 0.2 25)", dark: "oklch(0.7 0.19 25)" },
  success: { light: "oklch(0.5 0.12 155)", dark: "oklch(0.8 0.14 155)" },
  border: { light: "oklch(0.86 0.015 145)", dark: "oklch(0.33 0.02 145)" },
  input: { light: "oklch(0.82 0.018 145)", dark: "oklch(0.35 0.022 145)" },
  ring: { light: "oklch(0.68 0.19 126)", dark: "oklch(0.86 0.2 126)" },
  "chart-1": { light: "oklch(0.68 0.19 126)", dark: "oklch(0.86 0.2 126)" },
  "chart-2": { light: "oklch(0.57 0.13 190)", dark: "oklch(0.72 0.12 190)" },
  "chart-3": { light: "oklch(0.64 0.16 72)", dark: "oklch(0.76 0.15 72)" },
  "chart-4": { light: "oklch(0.58 0.17 310)", dark: "oklch(0.67 0.16 310)" },
  "chart-5": { light: "oklch(0.6 0.19 25)", dark: "oklch(0.69 0.18 25)" },
  sidebar: { light: "oklch(0.97 0.008 145)", dark: "oklch(0.18 0.016 145)" },
  "sidebar-foreground": { light: "oklch(0.2 0.018 145)", dark: "oklch(0.95 0.015 110)" },
  "sidebar-primary": { light: "oklch(0.68 0.19 126)", dark: "oklch(0.86 0.2 126)" },
  "sidebar-primary-foreground": {
    light: "oklch(0.16 0.02 145)",
    dark: "oklch(0.16 0.015 145)",
  },
  "sidebar-accent": { light: "oklch(0.92 0.025 138)", dark: "oklch(0.25 0.018 145)" },
  "sidebar-accent-foreground": {
    light: "oklch(0.22 0.025 145)",
    dark: "oklch(0.95 0.015 110)",
  },
  "sidebar-border": { light: "oklch(0.86 0.015 145)", dark: "oklch(0.33 0.02 145)" },
  "sidebar-ring": { light: "oklch(0.68 0.19 126)", dark: "oklch(0.86 0.2 126)" },
  // Team colors identify the two sides of a match. They are not decoration.
  "team-blue": same("oklch(0.72 0.13 250)"),
  "team-blue-ink": same("oklch(0.22 0.06 250)"),
  "team-amber": same("oklch(0.83 0.12 75)"),
  "team-amber-ink": same("oklch(0.26 0.07 70)"),
} satisfies Record<string, ColorToken>;

export type ColorTokenName = keyof typeof colorTokens;

/** Base corner radius. The Tailwind `rounded-*` scale derives from it. */
export const radiusRem = 0.75;

/** The theme a first-time visitor sees. Dark is the primary experience. */
export const defaultTheme: ThemeName = "dark";

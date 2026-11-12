import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

import { contrastOnTint, contrastRatio, oklchToHex } from "../src/tokens/color";
import { colorTokens, type ThemeName } from "../src/tokens/tokens";
import { targets } from "./sync-tokens";

const themes: ThemeName[] = ["light", "dark"];

describe("design tokens", () => {
  test.each(targets.map((target) => [target.path.split("/").slice(-3).join("/"), target] as const))(
    "%s is in sync with tokens.ts (run `bun run tokens:sync`)",
    (_, target) => {
      const current = readFileSync(target.path, "utf8");
      expect(target.render(current)).toBe(current);
    },
  );

  test("converts OKLCH to sRGB hex", () => {
    expect(oklchToHex("oklch(1 0 0)")).toBe("#ffffff");
    expect(oklchToHex("oklch(0 0 0)")).toBe("#000000");
    expect(oklchToHex("oklch(0.6279 0.2577 29.23)")).toBe("#ff0000");
  });

  // Text pairs must stay legible in both themes (WCAG AA: 4.5 body, 3 large/UI).
  const textPairs: [keyof typeof colorTokens, keyof typeof colorTokens, number][] = [
    ["foreground", "background", 4.5],
    ["card-foreground", "card", 4.5],
    ["popover-foreground", "popover", 4.5],
    ["muted-foreground", "background", 4.5],
    ["muted-foreground", "card", 4.5],
    ["primary-foreground", "primary", 4.5],
    ["primary-text", "background", 4.5],
    ["primary-text", "card", 4.5],
    ["secondary-foreground", "secondary", 4.5],
    ["accent-foreground", "accent", 4.5],
    ["team-blue-ink", "team-blue", 4.5],
    ["team-amber-ink", "team-amber", 4.5],
    ["destructive", "background", 4.5],
    ["destructive", "card", 4.5],
    ["success", "background", 4.5],
    ["success", "card", 4.5],
  ];

  for (const theme of themes) {
    test.each(textPairs)(`${theme}: %s on %s meets %p:1`, (text, surface, minimum) => {
      const ratio = contrastRatio(colorTokens[text][theme], colorTokens[surface][theme]);
      expect(ratio).toBeGreaterThanOrEqual(minimum);
    });
  }

  // Tinted status controls (`bg-destructive/10 text-destructive`, hover one step
  // stronger) must stay AA up to their strongest tint: 15% light, 20% dark.
  const maxTint: Record<ThemeName, number> = { light: 0.15, dark: 0.2 };
  for (const theme of themes) {
    test.each(
      (["destructive", "success"] as const).flatMap((text) =>
        (["background", "card", "popover"] as const).map((surface) => [text, surface] as const),
      ),
    )(`${theme}: %s on a tinted %s meets 4.5:1`, (text, surface) => {
      const tinted = contrastOnTint(
        colorTokens[text][theme],
        colorTokens[surface][theme],
        maxTint[theme],
      );
      expect(tinted).toBeGreaterThanOrEqual(4.5);
    });
  }
});

import { oklchToHex } from "./color";
import { colorTokens, type ColorTokenName, type ThemeName } from "./tokens";

export { colorTokens, defaultTheme, radiusRem } from "./tokens";
export type { ColorTokenName, ThemeName } from "./tokens";

/** Hex value of a token, for metadata that cannot read CSS (theme-color, manifest, share cards). */
export function tokenHex(name: ColorTokenName, theme: ThemeName) {
  return oklchToHex(colorTokens[name][theme]);
}

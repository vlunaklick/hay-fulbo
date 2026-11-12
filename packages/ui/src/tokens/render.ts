import { oklchToHex } from "./color";
import { colorTokens, radiusRem, type ThemeName } from "./tokens";

export const MARKER_START = "/* tokens:start */";
export const MARKER_END = "/* tokens:end */";

const NOTICE =
  "/* Generated from packages/ui/src/tokens/tokens.ts by `bun run tokens:sync`. Do not edit by hand. */";

const entries = Object.entries(colorTokens);

function block(selector: string, lines: string[], indent = "") {
  return [
    `${indent}${selector} {`,
    ...lines.map((line) => (line ? `${indent}  ${line}` : line)),
    `${indent}}`,
  ];
}

function region(lines: string[]) {
  return [MARKER_START, NOTICE, ...lines, MARKER_END].join("\n");
}

/** `:root`, `.dark` and `@theme inline` blocks for packages/ui/src/styles/globals.css. */
export function renderWebCss() {
  const vars = (theme: ThemeName) => entries.map(([name, token]) => `--${name}: ${token[theme]};`);
  return region([
    ...block(":root", ["color-scheme: light;", `--radius: ${radiusRem}rem;`, ...vars("light")]),
    "",
    ...block(".dark", ["color-scheme: dark;", ...vars("dark")]),
    "",
    ...block(
      "@theme inline",
      entries.map(([name]) => `--color-${name}: var(--${name});`),
    ),
  ]);
}

/** Uniwind `@layer theme` block for apps/native/global.css. */
export function renderNativeCss() {
  const vars = (theme: ThemeName) =>
    entries.map(([name, token]) => `--color-${name}: ${token[theme]};`);
  return region(
    block(
      "@layer theme",
      block(
        ":root",
        [...block("@variant light", vars("light")), "", ...block("@variant dark", vars("dark"))],
        "",
      ),
    ),
  );
}

const camelCase = (name: string) =>
  name.replace(/-([a-z0-9])/g, (_, char: string) => char.toUpperCase());

/** apps/native/lib/theme-tokens.ts: hex mirrors for APIs that need a raw color. */
export function renderNativeTs() {
  const theme = (name: ThemeName) => [
    `  ${name}: {`,
    ...entries.map(([token, value]) => `    ${camelCase(token)}: "${oklchToHex(value[name])}",`),
    `    radius: "${radiusRem * 16}px",`,
    "  },",
  ];
  return [
    "// Generated from packages/ui/src/tokens/tokens.ts by `bun run tokens:sync`. Do not edit by hand.",
    "// Hex mirrors of the theme tokens, for places that need a raw color value",
    "// (React Navigation headers, drawer and tab bars, native toasts).",
    "",
    "export const THEME = {",
    ...theme("light"),
    ...theme("dark"),
    "} as const;",
    "",
  ].join("\n");
}

/** Replace the generated region between the markers, keeping the rest of the file. */
export function replaceRegion(source: string, generated: string) {
  const start = source.indexOf(MARKER_START);
  const end = source.indexOf(MARKER_END);
  if (start === -1 || end === -1 || end < start) {
    throw new Error("Generated token markers not found");
  }
  return source.slice(0, start) + generated + source.slice(end + MARKER_END.length);
}

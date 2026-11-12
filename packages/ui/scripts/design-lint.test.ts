import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { relative, resolve } from "node:path";

import { Glob } from "bun";

/**
 * Guards the design system: product code styles through theme tokens
 * (bg-primary, text-muted-foreground, bg-team-blue, ...), never raw palette
 * colors, hex literals or one-off font sizes. See DESIGN.md.
 */

const root = resolve(import.meta.dir, "../../..");

const roots = ["apps/web/src", "apps/native/app", "apps/native/components", "packages/ui/src"];

const ignored = [
  // Throwaway visual explorations, outside the design system on purpose.
  "apps/web/src/app/prototype/",
  // Generated or source-of-truth token files.
  "packages/ui/src/tokens/",
  "apps/native/lib/theme-tokens.ts",
  // Google's brand mark must keep Google's colors.
  "apps/web/src/app/login/google-sign-in.tsx",
];

const files = roots.flatMap((dir) =>
  [...new Glob("**/*.{ts,tsx}").scanSync({ cwd: resolve(root, dir) })]
    .map((file) => `${dir}/${file}`)
    .filter((file) => !file.endsWith(".test.ts") && !ignored.some((path) => file.startsWith(path))),
);

const palette =
  "slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose";

const rules: { name: string; pattern: RegExp }[] = [
  {
    name: "raw Tailwind palette color (use a theme token)",
    pattern: new RegExp(
      `\\b(?:bg|text|border|ring|outline|fill|stroke|from|via|to|decoration|divide|shadow)-(?:${palette})-\\d{2,3}\\b`,
      "g",
    ),
  },
  {
    name: "white/black text or fill (use a *-foreground token)",
    pattern: /\b(?:text|fill|stroke|border)-(?:white|black)\b/g,
  },
  {
    name: "text-primary (the fill is unreadable as light-theme text; use text-primary-text)",
    pattern: /(?<![\w-])text-primary(?![\w-])/g,
  },
  { name: "hex color literal (use a token or tokenHex())", pattern: /["'`(\s]#[0-9a-fA-F]{6}\b/g },
  {
    name: "arbitrary font size (use the type scale or the eyebrow utility)",
    pattern: /\btext-\[\d+(?:\.\d+)?(?:px|rem|em)\]/g,
  },
];

describe("design lint", () => {
  test("scans product code", () => {
    expect(files.length).toBeGreaterThan(50);
  });

  for (const rule of rules) {
    test(`no ${rule.name}`, () => {
      const offenders = files.flatMap((file) => {
        const source = readFileSync(resolve(root, file), "utf8");
        return [...source.matchAll(rule.pattern)].map((match) => {
          const line = source.slice(0, match.index).split("\n").length;
          return `${relative(root, resolve(root, file))}:${line} ${match[0].trim()}`;
        });
      });
      expect(offenders).toEqual([]);
    });
  }
});

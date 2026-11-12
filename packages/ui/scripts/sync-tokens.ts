import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { renderNativeCss, renderNativeTs, renderWebCss, replaceRegion } from "../src/tokens/render";

const root = resolve(import.meta.dir, "../../..");

export const targets = [
  {
    path: resolve(root, "packages/ui/src/styles/globals.css"),
    render: (current: string) => replaceRegion(current, renderWebCss()),
  },
  {
    path: resolve(root, "apps/native/global.css"),
    render: (current: string) => replaceRegion(current, renderNativeCss()),
  },
  {
    path: resolve(root, "apps/native/lib/theme-tokens.ts"),
    render: () => renderNativeTs(),
  },
];

if (import.meta.main) {
  for (const target of targets) {
    let current = "";
    try {
      current = readFileSync(target.path, "utf8");
    } catch {}
    const next = target.render(current);
    if (next !== current) {
      writeFileSync(target.path, next);
      console.log(`updated ${target.path.slice(root.length + 1)}`);
    }
  }
}

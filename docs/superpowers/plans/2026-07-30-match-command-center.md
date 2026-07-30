# Match Command Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the tall, card-heavy match and home dashboards with a compact command-center layout whose secondary workflows open in accessible side sheets.

**Architecture:** Keep match state, score, closure readiness, and the primary action visible in the page. Move editing and drill-down workflows into a shared Sheet primitive so only one focused task is exposed at a time. Remove the empty desktop shell header by relocating group and theme controls into the sidebar, while preserving a compact mobile header.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, shadcn/ui Base UI components, TanStack Query, Bun.

---

### Task 1: Add the shared Sheet primitive

**Files:**
- Create: `packages/ui/src/components/sheet.tsx`
- Verify: `packages/ui/src/components/dialog.tsx`

- [ ] **Step 1: Preview the registry component**

Run: `bunx --bun shadcn@latest add sheet -c apps/web --dry-run`

Expected: the CLI reports `packages/ui/src/components/sheet.tsx` without unrelated overwrites.

- [ ] **Step 2: Install and inspect the component**

Run: `bunx --bun shadcn@latest add sheet -c apps/web`

Expected: a Base UI Sheet exporting root, trigger, content, header, title, description, footer, and close.

- [ ] **Step 3: Align it with Hay Fulbo**

Keep semantic theme tokens, a right-side desktop panel, a full-width mobile panel, a visible close affordance, and an internally scrollable content region. Every usage must render `SheetTitle` and `SheetDescription`. Sheet and overlay transitions must use transform/opacity only and become instant under `prefers-reduced-motion`.

- [ ] **Step 4: Verify types and formatting**

Run: `bun run check`

Expected: PASS.

### Task 2: Turn the match page into a command center

**Files:**
- Modify: `apps/web/src/app/dashboard/partidos/[matchId]/page.tsx`
- Modify: `apps/web/src/components/match-attendance-panel.tsx`
- Modify: `apps/web/src/components/match-parity-card.tsx`
- Test: `apps/web/src/components/match-attendance-panel.test.ts`
- Test: `e2e/hay-fulbo.e2e.ts`

- [ ] **Step 1: Record the visible interaction contract**

The page must expose the back action, match status, date, court, score, pitch mode, attendance count, closure readiness, and the relevant actions without scrolling on a typical desktop viewport.

Use this state and role matrix:

| Match state | Always visible | Available panels | Persistent organizer action |
| --- | --- | --- | --- |
| Open | Status, schedule, court, score, attendance, readiness | Convocatoria, Ficha, Plantel, Caja, Juego, Análisis, Cierre | `Cerrar partido` when ready; otherwise `Revisar cierre` |
| Closed | Final status, schedule, court, final score | Resultado, Ficha, Plantel, Caja, Juego, Cierre | `Reabrir partido` opens the reason flow in Cierre |
| Cancelled | Cancelled status, schedule, court, last score | Ficha, Plantel, Caja, Juego, Cierre | `Restaurar partido` opens the reason flow in Cierre |

Members can open read-only panels but never see organizer mutation actions. The existing `MatchResultCard` moves into the Resultado Sheet instead of remaining as a tall page block.

- [ ] **Step 2: Replace the detached header and score card**

Compose one match overview surface: breadcrumb and status first, date/court/cost second, score and pitch-mode action last. Keep the reading order identical on mobile and desktop.

- [ ] **Step 3: Replace tabs and stacked panels with action buttons**

Use one controlled `activePanel` state and event handlers. Each action opens an accessible right-side Sheet containing the existing workflow. The Cierre summary opens the Cierre Sheet when incomplete. Do not add `useEffect`; derive counts and readiness from `detail`.

- [ ] **Step 4: Move attendance and parity detail into sheets**

Keep attendance count and parity availability visible as compact action summaries. Render attendance detail inside its panel. Redesign parity as a plain comparison of team likelihoods, confidence, and sample size; remove the stake, projected payout, betting vocabulary, and range simulator because the product must not resemble betting.

- [ ] **Step 5: Keep closure state persistent**

Show readiness and the organizer’s close/reopen/restore action in the command bar. Put cancellation and the full issue checklist inside the closure Sheet.

- [ ] **Step 6: Verify all states**

Run: `bun test apps/web/src/components/match-attendance-panel.test.ts`

Expected: open matches expose attendance; closed matches do not.

- [ ] **Step 7: Add interaction coverage**

Extend `e2e/hay-fulbo.e2e.ts` to cover every visible Sheet trigger for the created open match, keyboard opening, initial focus, Escape/close, focus return, persistent closure action, and absence of mutation controls for non-applicable states. Add seeded or API-assisted closed and cancelled cases if the existing scenario cannot reach them efficiently.

### Task 3: Remove the empty desktop shell header

**Files:**
- Modify: `apps/web/src/components/app-shell.tsx`
- Modify: `apps/web/src/components/group-switcher.tsx`

- [ ] **Step 1: Relocate desktop controls**

Place the group switcher below the brand inside the desktop sidebar. Place theme and profile controls in the sidebar footer. Preserve a compact mobile header with group, theme, and profile controls.

When expanded, render the group name as a full-width labeled control. When collapsed, render a 44 px icon button with the group initial, accessible label, and tooltip. Theme and profile remain separate 44 px icon buttons in collapsed mode; the expanded footer may show their text labels.

- [ ] **Step 2: Remove sticky desktop chrome**

Do not render the empty top header at desktop breakpoints. Let page headers own the top of the content area. Keep mobile navigation fixed and account for its safe area.

- [ ] **Step 3: Verify keyboard and collapsed-sidebar behavior**

Tab through group selection, navigation, theme, profile, and collapse controls at both sidebar widths.

### Task 4: Compact the home dashboard into one desktop viewport

**Files:**
- Modify: `apps/web/src/components/home-dashboard.tsx`

- [ ] **Step 1: Fold metrics into the page header**

Keep one page title and one primary `Nuevo partido` action. Render the three summary metrics as a compact inline definition list instead of a separate hero card.

- [ ] **Step 2: Establish clear priority**

Use `Próximo partido` as the primary operational block, `Goleadores` and `Últimos partidos` as supporting sections, and combine `Caja` plus `Sociedades` into compact secondary rows.

- [ ] **Step 3: Remove unnecessary vertical expansion**

Reduce repeated headings, descriptions, empty padding, and separate card shells. Do not create nested or internal page scroll containers; mobile keeps natural document scrolling.

- [ ] **Step 4: Verify representative desktop and mobile viewports**

At 1440×900 assert `document.documentElement.scrollHeight <= window.innerHeight` and `scrollWidth <= innerWidth` on the dashboard. At the same viewport assert no horizontal overflow and no document-level vertical overflow on the match command center’s default state. On mobile assert `scrollWidth <= innerWidth`, natural document scrolling remains available when content exceeds the viewport, the page itself owns that scroll, and all touch targets are at least 44 px.

### Task 5: Validate, publish, and confirm production

**Files:**
- Modify only files changed by formatting or verified fixes.

- [ ] **Step 1: Run static checks and tests**

Run: `bun run check && bun test && bun run build && bun run test:e2e`

Expected: static checks, unit tests, production build, desktop Chromium E2E, and mobile Chromium E2E all PASS; database-backed tests may be skipped only when their environment variable is absent.

- [ ] **Step 2: Inspect in the shared browser**

Verify the home dashboard and open/closed match detail at desktop and mobile sizes. Open every Sheet, inspect focus/close behavior, and confirm the page has no unexpected horizontal or nested scrolling.

- [ ] **Step 3: Commit**

Run:

```bash
git add packages/ui/src/components/sheet.tsx \
  'apps/web/src/app/dashboard/partidos/[matchId]/page.tsx' \
  apps/web/src/components/app-shell.tsx \
  apps/web/src/components/group-switcher.tsx \
  apps/web/src/components/home-dashboard.tsx \
  apps/web/src/components/match-attendance-panel.tsx \
  apps/web/src/components/match-parity-card.tsx \
  e2e/hay-fulbo.e2e.ts \
  docs/superpowers/plans/2026-07-30-match-command-center.md
git commit -m "feat: turn matches into command center"
```

- [ ] **Step 4: Push and monitor**

Run: `git push origin main`, then monitor the exact commit’s GitHub Actions workflow through production smoke verification.

Expected: CI succeeds and Coolify reports the pushed SHA in production.
